/**
 * Webhook Controller
 * Handles payment webhooks from Razorpay
 */

import { Request, Response } from 'express';
import { razorpayService } from '../services/razorpay.service';
import { subscriptionService } from '../services/subscription.service';
import { notificationService } from '../services/notification.service';
import prisma from '../config/database';
import { logger } from '../utils/logger';

/**
 * Handle Razorpay webhooks
 * POST /api/v1/webhooks/razorpay
 */
export async function handleRazorpayWebhook(req: Request, res: Response) {
  try {
    // Get raw body and signature
    const webhookSignature = req.headers['x-razorpay-signature'] as string;
    const webhookBody = JSON.stringify(req.body);

    if (!webhookSignature) {
      logger.warn('Webhook received without signature');
      return res.status(400).json({
        success: false,
        message: 'Missing webhook signature',
      });
    }

    // Verify webhook signature
    const isValid = razorpayService.verifyWebhookSignature(webhookBody, webhookSignature);

    if (!isValid) {
      logger.warn('Invalid webhook signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature',
      });
    }

    const event = req.body;
    const eventType = event.event;

    logger.info(`Processing webhook event: ${eventType}`);

    // Handle different webhook events
    switch (eventType) {
      case 'payment.captured':
        await handlePaymentCaptured(event);
        break;

      case 'payment.failed':
        await handlePaymentFailed(event);
        break;

      case 'subscription.activated':
        await handleSubscriptionActivated(event);
        break;

      case 'subscription.charged':
        await handleSubscriptionCharged(event);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event);
        break;

      case 'subscription.paused':
        await handleSubscriptionPaused(event);
        break;

      case 'subscription.resumed':
        await handleSubscriptionResumed(event);
        break;

      case 'subscription.completed':
        await handleSubscriptionCompleted(event);
        break;

      case 'refund.processed':
        await handleRefundProcessed(event);
        break;

      default:
        logger.info(`Unhandled webhook event type: ${eventType}`);
    }

    // Acknowledge webhook
    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error: any) {
    logger.error('Webhook processing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process webhook',
    });
  }
}

/**
 * Handle payment captured event
 */
async function handlePaymentCaptured(event: any) {
  try {
    const payment = event.payload.payment.entity;
    const paymentId = payment.id;

    logger.info(`Payment captured: ${paymentId}`);

    // Update payment record
    await prisma.payment.updateMany({
      where: { razorpayPaymentId: paymentId },
      data: {
        status: 'SUCCESS',
        paidAt: new Date(payment.created_at * 1000),
      },
    });
  } catch (error) {
    logger.error('Failed to handle payment.captured:', error);
  }
}

/**
 * Handle payment failed event
 */
async function handlePaymentFailed(event: any) {
  try {
    const payment = event.payload.payment.entity;
    const paymentId = payment.id;
    const errorCode = payment.error_code;
    const errorDescription = payment.error_description;

    logger.info(`Payment failed: ${paymentId} - ${errorCode}`);

    // Update payment record
    const updatedPayment = await prisma.payment.updateMany({
      where: { razorpayPaymentId: paymentId },
      data: {
        status: 'FAILED',
        failureReason: errorDescription,
      },
    });

    // Find user from payment
    const paymentRecord = await prisma.payment.findFirst({
      where: { razorpayPaymentId: paymentId },
    });

    if (paymentRecord) {
      // Notify user
      await notificationService.createNotification({
        userId: paymentRecord.userId,
        type: 'SYSTEM',
        title: 'Payment Failed',
        message: `Your payment failed: ${errorDescription}`,
      });
    }
  } catch (error) {
    logger.error('Failed to handle payment.failed:', error);
  }
}

/**
 * Handle subscription activated event
 */
async function handleSubscriptionActivated(event: any) {
  try {
    const subscription = event.payload.subscription.entity;
    const subscriptionId = subscription.id;

    logger.info(`Subscription activated: ${subscriptionId}`);

    // Update subscription record
    await prisma.userSubscription.updateMany({
      where: { razorpaySubscriptionId: subscriptionId },
      data: {
        status: 'ACTIVE',
      },
    });
  } catch (error) {
    logger.error('Failed to handle subscription.activated:', error);
  }
}

/**
 * Handle subscription charged event (auto-renewal)
 */
async function handleSubscriptionCharged(event: any) {
  try {
    const payment = event.payload.payment.entity;
    const subscription = event.payload.subscription.entity;
    const subscriptionId = subscription.id;

    logger.info(`Subscription charged: ${subscriptionId}`);

    // Find user subscription
    const userSubscription = await prisma.userSubscription.findFirst({
      where: { razorpaySubscriptionId: subscriptionId },
    });

    if (!userSubscription) {
      logger.warn(`User subscription not found for Razorpay subscription: ${subscriptionId}`);
      return;
    }

    // Update subscription period
    const now = new Date();
    const periodEnd = new Date(now);
    if (userSubscription.billingCycle === 'MONTHLY') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    await prisma.userSubscription.update({
      where: { subscriptionId: userSubscription.subscriptionId },
      data: {
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        status: 'ACTIVE',
      },
    });

    // Create payment record
    const amount = razorpayService.convertToRupees(payment.amount);
    const newPayment = await prisma.payment.create({
      data: {
        userId: userSubscription.userId,
        amount,
        currency: payment.currency,
        status: 'SUCCESS',
        razorpayPaymentId: payment.id,
        description: `Subscription renewal - ${userSubscription.tier}`,
        subscriptionTier: userSubscription.tier,
        paidAt: new Date(payment.created_at * 1000),
      },
    });

    // Create invoice
    const invoiceNumber = `INV-${Date.now()}-${userSubscription.userId.substring(0, 8)}`;
    await prisma.invoice.create({
      data: {
        userId: userSubscription.userId,
        paymentId: newPayment.paymentId,
        invoiceNumber,
        amount,
        tax: 0,
        discount: 0,
        total: amount,
        currency: payment.currency,
        periodStart: now,
        periodEnd,
        subscriptionTier: userSubscription.tier,
        isPaid: true,
        paidAt: new Date(),
        dueDate: now,
      },
    });

    // Notify user
    await notificationService.createNotification({
      userId: userSubscription.userId,
      type: 'SYSTEM',
      title: 'Subscription Renewed',
      message: `Your subscription has been automatically renewed for ₹${amount}`,
    });
  } catch (error) {
    logger.error('Failed to handle subscription.charged:', error);
  }
}

/**
 * Handle subscription cancelled event
 */
async function handleSubscriptionCancelled(event: any) {
  try {
    const subscription = event.payload.subscription.entity;
    const subscriptionId = subscription.id;

    logger.info(`Subscription cancelled: ${subscriptionId}`);

    // Update subscription record
    const updated = await prisma.userSubscription.updateMany({
      where: { razorpaySubscriptionId: subscriptionId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    // Find user subscription
    const userSubscription = await prisma.userSubscription.findFirst({
      where: { razorpaySubscriptionId: subscriptionId },
    });

    if (userSubscription) {
      // Notify user
      await notificationService.createNotification({
        userId: userSubscription.userId,
        type: 'SYSTEM',
        title: 'Subscription Cancelled',
        message: 'Your subscription has been cancelled',
      });
    }
  } catch (error) {
    logger.error('Failed to handle subscription.cancelled:', error);
  }
}

/**
 * Handle subscription paused event
 */
async function handleSubscriptionPaused(event: any) {
  try {
    const subscription = event.payload.subscription.entity;
    const subscriptionId = subscription.id;

    logger.info(`Subscription paused: ${subscriptionId}`);

    await prisma.userSubscription.updateMany({
      where: { razorpaySubscriptionId: subscriptionId },
      data: {
        status: 'CANCELLED', // Treat paused as cancelled
      },
    });
  } catch (error) {
    logger.error('Failed to handle subscription.paused:', error);
  }
}

/**
 * Handle subscription resumed event
 */
async function handleSubscriptionResumed(event: any) {
  try {
    const subscription = event.payload.subscription.entity;
    const subscriptionId = subscription.id;

    logger.info(`Subscription resumed: ${subscriptionId}`);

    await prisma.userSubscription.updateMany({
      where: { razorpaySubscriptionId: subscriptionId },
      data: {
        status: 'ACTIVE',
        cancelledAt: null,
      },
    });
  } catch (error) {
    logger.error('Failed to handle subscription.resumed:', error);
  }
}

/**
 * Handle subscription completed event
 */
async function handleSubscriptionCompleted(event: any) {
  try {
    const subscription = event.payload.subscription.entity;
    const subscriptionId = subscription.id;

    logger.info(`Subscription completed: ${subscriptionId}`);

    // Downgrade to free tier
    const userSubscription = await prisma.userSubscription.findFirst({
      where: { razorpaySubscriptionId: subscriptionId },
    });

    if (userSubscription) {
      await prisma.userSubscription.update({
        where: { subscriptionId: userSubscription.subscriptionId },
        data: {
          tier: 'FREE',
          status: 'EXPIRED',
          amount: 0,
        },
      });

      // Notify user
      await notificationService.createNotification({
        userId: userSubscription.userId,
        type: 'SYSTEM',
        title: 'Subscription Completed',
        message: 'Your subscription has completed. You have been moved to the free tier.',
      });
    }
  } catch (error) {
    logger.error('Failed to handle subscription.completed:', error);
  }
}

/**
 * Handle refund processed event
 */
async function handleRefundProcessed(event: any) {
  try {
    const refund = event.payload.refund.entity;
    const paymentId = refund.payment_id;
    const amount = razorpayService.convertToRupees(refund.amount);

    logger.info(`Refund processed for payment: ${paymentId}`);

    // Update payment record
    await prisma.payment.updateMany({
      where: { razorpayPaymentId: paymentId },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
      },
    });

    // Find payment and notify user
    const payment = await prisma.payment.findFirst({
      where: { razorpayPaymentId: paymentId },
    });

    if (payment) {
      await notificationService.createNotification({
        userId: payment.userId,
        type: 'SYSTEM',
        title: 'Refund Processed',
        message: `A refund of ₹${amount} has been processed to your account`,
      });
    }
  } catch (error) {
    logger.error('Failed to handle refund.processed:', error);
  }
}
