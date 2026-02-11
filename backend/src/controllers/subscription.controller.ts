/**
 * Subscription Controller
 * Handles HTTP requests for subscription management
 */

import { Request, Response } from 'express';
import { subscriptionService, SUBSCRIPTION_TIERS } from '../services/subscription.service';
import { razorpayService } from '../services/razorpay.service';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { SubscriptionTier } from '@prisma/client';

/**
 * Get all subscription tiers and their features
 * GET /api/v1/subscriptions/tiers
 */
export async function getSubscriptionTiers(req: Request, res: Response) {
  try {
    const tiers = subscriptionService.getAllTiers();

    return res.status(200).json({
      success: true,
      data: tiers,
    });
  } catch (error: any) {
    logger.error('Get subscription tiers error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to get subscription tiers',
    });
  }
}

/**
 * Get current user's subscription
 * GET /api/v1/subscriptions/me
 */
export async function getMySubscription(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;

    const subscription = await subscriptionService.getUserSubscription(userId);
    const tierConfig = subscriptionService.getTierConfig(subscription.tier);

    return res.status(200).json({
      success: true,
      data: {
        ...subscription,
        tierConfig,
      },
    });
  } catch (error: any) {
    logger.error('Get my subscription error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to get subscription',
    });
  }
}

/**
 * Create a payment order for subscription
 * POST /api/v1/subscriptions/create-order
 */
export async function createSubscriptionOrder(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const { tier, billingCycle } = req.body;

    // Validate tier
    if (!['BASIC', 'PRO'].includes(tier)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription tier',
      });
    }

    // Validate billing cycle
    if (!['MONTHLY', 'YEARLY'].includes(billingCycle)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid billing cycle. Must be MONTHLY or YEARLY',
      });
    }

    // Check if Razorpay is configured
    if (!razorpayService.isConfigured()) {
      return res.status(500).json({
        success: false,
        message: 'Payment service not configured',
      });
    }

    // Get tier pricing
    const tierConfig = SUBSCRIPTION_TIERS[tier as SubscriptionTier];
    const amount = billingCycle === 'MONTHLY' ? tierConfig.price : tierConfig.priceYearly;
    const amountInPaise = razorpayService.convertToPaise(amount);

    // Create Razorpay order
    const order = await razorpayService.createOrder({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `sub_${userId}_${Date.now()}`,
      notes: {
        userId,
        tier,
        billingCycle,
      },
    });

    // Create pending payment record
    await prisma.payment.create({
      data: {
        userId,
        amount,
        currency: 'INR',
        status: 'PENDING',
        razorpayOrderId: order.id,
        description: `${tierConfig.name} subscription (${billingCycle})`,
        subscriptionTier: tier as SubscriptionTier,
        metadata: { billingCycle },
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error: any) {
    logger.error('Create subscription order error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create payment order',
    });
  }
}

/**
 * Verify payment and activate subscription
 * POST /api/v1/subscriptions/verify-payment
 */
export async function verifyPayment(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // Validate required fields
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification parameters',
      });
    }

    // Verify signature
    const isValid = razorpayService.verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
      });
    }

    // Find payment record
    const payment = await prisma.payment.findFirst({
      where: {
        razorpayOrderId,
        userId,
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { paymentId: payment.paymentId },
      data: {
        status: 'SUCCESS',
        razorpayPaymentId,
        razorpaySignature,
        paidAt: new Date(),
      },
    });

    // Get billing cycle from metadata
    const billingCycle = (payment.metadata as any)?.billingCycle || 'MONTHLY';

    // Activate subscription
    const subscription = await subscriptionService.createSubscription(
      userId,
      payment.subscriptionTier!,
      billingCycle
    );

    // Create invoice
    const tierConfig = SUBSCRIPTION_TIERS[payment.subscriptionTier!];
    const invoiceNumber = `INV-${Date.now()}-${userId.substring(0, 8)}`;

    await prisma.invoice.create({
      data: {
        userId,
        paymentId: payment.paymentId,
        invoiceNumber,
        amount: payment.amount,
        tax: 0,
        discount: 0,
        total: payment.amount,
        currency: payment.currency,
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd!,
        subscriptionTier: payment.subscriptionTier!,
        isPaid: true,
        paidAt: new Date(),
        dueDate: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Subscription activated successfully',
      data: {
        subscription,
        payment: updatedPayment,
      },
    });
  } catch (error: any) {
    logger.error('Verify payment error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to verify payment',
    });
  }
}

/**
 * Cancel subscription
 * POST /api/v1/subscriptions/cancel
 */
export async function cancelSubscription(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const { immediate } = req.body;

    const subscription = await subscriptionService.cancelSubscription(
      userId,
      immediate || false
    );

    return res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: subscription,
    });
  } catch (error: any) {
    logger.error('Cancel subscription error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel subscription',
    });
  }
}

/**
 * Reactivate subscription
 * POST /api/v1/subscriptions/reactivate
 */
export async function reactivateSubscription(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;

    const subscription = await subscriptionService.reactivateSubscription(userId);

    return res.status(200).json({
      success: true,
      message: 'Subscription reactivated successfully',
      data: subscription,
    });
  } catch (error: any) {
    logger.error('Reactivate subscription error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to reactivate subscription',
    });
  }
}

/**
 * Get payment history
 * GET /api/v1/subscriptions/payments
 */
export async function getPaymentHistory(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const { limit, offset } = req.query;

    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit as string) : 20,
      skip: offset ? parseInt(offset as string) : 0,
    });

    const total = await prisma.payment.count({ where: { userId } });

    return res.status(200).json({
      success: true,
      data: {
        payments,
        total,
      },
    });
  } catch (error: any) {
    logger.error('Get payment history error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to get payment history',
    });
  }
}

/**
 * Get invoices
 * GET /api/v1/subscriptions/invoices
 */
export async function getInvoices(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const { limit, offset } = req.query;

    const invoices = await prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit as string) : 20,
      skip: offset ? parseInt(offset as string) : 0,
      include: {
        payment: {
          select: {
            status: true,
            paidAt: true,
            razorpayPaymentId: true,
          },
        },
      },
    });

    const total = await prisma.invoice.count({ where: { userId } });

    return res.status(200).json({
      success: true,
      data: {
        invoices,
        total,
      },
    });
  } catch (error: any) {
    logger.error('Get invoices error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to get invoices',
    });
  }
}

/**
 * Check feature access
 * GET /api/v1/subscriptions/features/:feature
 */
export async function checkFeatureAccess(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const { feature } = req.params;

    const hasAccess = await subscriptionService.hasFeatureAccess(userId, feature as any);

    return res.status(200).json({
      success: true,
      data: {
        feature,
        hasAccess,
      },
    });
  } catch (error: any) {
    logger.error('Check feature access error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to check feature access',
    });
  }
}

/**
 * Check if user can perform an action
 * POST /api/v1/subscriptions/can-perform
 */
export async function canPerformAction(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const { action } = req.body;

    const result = await subscriptionService.canPerformAction(userId, action);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Can perform action error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to check action permission',
    });
  }
}

/**
 * Get subscription statistics (admin only)
 * GET /api/v1/subscriptions/stats
 */
export async function getSubscriptionStats(req: Request, res: Response) {
  try {
    // TODO: Add admin role check
    const stats = await subscriptionService.getSubscriptionStats();

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Get subscription stats error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to get subscription stats',
    });
  }
}
