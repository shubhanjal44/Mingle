/**
 * Razorpay Payment Service
 * Integration with Razorpay for payment processing
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { logger } from '../utils/logger';

interface RazorpayConfig {
  keyId: string;
  keySecret: string;
}

interface CreateOrderParams {
  amount: number; // in paise (1 INR = 100 paise)
  currency?: string;
  receipt?: string;
  notes?: Record<string, any>;
}

interface CreateSubscriptionParams {
  planId: string;
  customerId: string;
  totalCount?: number;
  quantity?: number;
  notes?: Record<string, any>;
}

interface VerifyPaymentParams {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

class RazorpayService {
  private razorpay: Razorpay | null = null;
  private keyId: string;
  private keySecret: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';

    this.initialize();
  }

  /**
   * Initialize Razorpay instance
   */
  private initialize() {
    if (!this.keyId || !this.keySecret) {
      logger.warn('Razorpay credentials not configured. Payment features will be disabled.');
      return;
    }

    try {
      this.razorpay = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret,
      });
      logger.info('Razorpay initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Razorpay:', error);
    }
  }

  /**
   * Check if Razorpay is configured
   */
  isConfigured(): boolean {
    return this.razorpay !== null;
  }

  /**
   * Create a Razorpay order for one-time payment
   */
  async createOrder(params: CreateOrderParams) {
    if (!this.razorpay) {
      throw new Error('Razorpay not configured');
    }

    try {
      const order = await this.razorpay.orders.create({
        amount: params.amount,
        currency: params.currency || 'INR',
        receipt: params.receipt,
        notes: params.notes,
      });

      logger.info(`Razorpay order created: ${order.id}`);
      return order;
    } catch (error: any) {
      logger.error('Failed to create Razorpay order:', error);
      throw new Error(error.error?.description || 'Failed to create payment order');
    }
  }

  /**
   * Create a Razorpay customer
   */
  async createCustomer(params: {
    name: string;
    email: string;
    contact?: string;
    notes?: Record<string, any>;
  }) {
    if (!this.razorpay) {
      throw new Error('Razorpay not configured');
    }

    try {
      const customer = await this.razorpay.customers.create({
        name: params.name,
        email: params.email,
        contact: params.contact,
        notes: params.notes,
      });

      logger.info(`Razorpay customer created: ${customer.id}`);
      return customer;
    } catch (error: any) {
      logger.error('Failed to create Razorpay customer:', error);
      throw new Error(error.error?.description || 'Failed to create customer');
    }
  }

  /**
   * Create a Razorpay subscription
   */
  async createSubscription(params: CreateSubscriptionParams) {
    if (!this.razorpay) {
      throw new Error('Razorpay not configured');
    }

    try {
      const subscriptionData: any = {
        plan_id: params.planId,
        total_count: params.totalCount,
        quantity: params.quantity || 1,
        customer_notify: 1,
      };

      if (params.customerId) {
        subscriptionData.customer_id = params.customerId;
      }

      if (params.notes) {
        subscriptionData.notes = params.notes;
      }

      const subscription: any = await this.razorpay.subscriptions.create(subscriptionData);

      logger.info(`Razorpay subscription created: ${subscription.id}`);
      return subscription;
    } catch (error: any) {
      logger.error('Failed to create Razorpay subscription:', error);
      throw new Error(error.error?.description || 'Failed to create subscription');
    }
  }

  /**
   * Cancel a Razorpay subscription
   */
  async cancelSubscription(subscriptionId: string, cancelAtCycleEnd: boolean = true) {
    if (!this.razorpay) {
      throw new Error('Razorpay not configured');
    }

    try {
      const subscription = await this.razorpay.subscriptions.cancel(
        subscriptionId,
        cancelAtCycleEnd
      );

      logger.info(`Razorpay subscription cancelled: ${subscriptionId}`);
      return subscription;
    } catch (error: any) {
      logger.error('Failed to cancel Razorpay subscription:', error);
      throw new Error(error.error?.description || 'Failed to cancel subscription');
    }
  }

  /**
   * Fetch a payment by ID
   */
  async fetchPayment(paymentId: string) {
    if (!this.razorpay) {
      throw new Error('Razorpay not configured');
    }

    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error: any) {
      logger.error('Failed to fetch Razorpay payment:', error);
      throw new Error(error.error?.description || 'Failed to fetch payment');
    }
  }

  /**
   * Fetch a subscription by ID
   */
  async fetchSubscription(subscriptionId: string) {
    if (!this.razorpay) {
      throw new Error('Razorpay not configured');
    }

    try {
      const subscription = await this.razorpay.subscriptions.fetch(subscriptionId);
      return subscription;
    } catch (error: any) {
      logger.error('Failed to fetch Razorpay subscription:', error);
      throw new Error(error.error?.description || 'Failed to fetch subscription');
    }
  }

  /**
   * Verify payment signature for order
   */
  verifyPaymentSignature(params: VerifyPaymentParams): boolean {
    try {
      const body = params.razorpayOrderId + '|' + params.razorpayPaymentId;

      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(body)
        .digest('hex');

      const isValid = expectedSignature === params.razorpaySignature;

      if (isValid) {
        logger.info(`Payment signature verified for payment: ${params.razorpayPaymentId}`);
      } else {
        logger.warn(`Payment signature verification failed for payment: ${params.razorpayPaymentId}`);
      }

      return isValid;
    } catch (error) {
      logger.error('Error verifying payment signature:', error);
      return false;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

      if (!webhookSecret) {
        logger.warn('Razorpay webhook secret not configured');
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      const isValid = expectedSignature === signature;

      if (isValid) {
        logger.info('Webhook signature verified successfully');
      } else {
        logger.warn('Webhook signature verification failed');
      }

      return isValid;
    } catch (error) {
      logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Initiate a refund
   */
  async createRefund(paymentId: string, amount?: number) {
    if (!this.razorpay) {
      throw new Error('Razorpay not configured');
    }

    try {
      const refundParams: any = { payment_id: paymentId };
      if (amount) {
        refundParams.amount = amount;
      }

      const refund = await this.razorpay.payments.refund(paymentId, refundParams);

      logger.info(`Refund created for payment ${paymentId}: ${refund.id}`);
      return refund;
    } catch (error: any) {
      logger.error('Failed to create refund:', error);
      throw new Error(error.error?.description || 'Failed to create refund');
    }
  }

  /**
   * Get subscription plans (Note: Razorpay plans must be created via dashboard or API)
   */
  async fetchPlan(planId: string) {
    if (!this.razorpay) {
      throw new Error('Razorpay not configured');
    }

    try {
      const plan = await this.razorpay.plans.fetch(planId);
      return plan;
    } catch (error: any) {
      logger.error('Failed to fetch Razorpay plan:', error);
      throw new Error(error.error?.description || 'Failed to fetch plan');
    }
  }

  /**
   * Convert rupees to paise
   */
  convertToPaise(rupees: number): number {
    return Math.round(rupees * 100);
  }

  /**
   * Convert paise to rupees
   */
  convertToRupees(paise: number): number {
    return paise / 100;
  }
}

export const razorpayService = new RazorpayService();
