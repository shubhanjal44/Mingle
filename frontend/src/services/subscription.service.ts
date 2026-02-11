/**
 * Subscription Service
 * Frontend API integration for subscription and payment management
 */

import api from './api';

// Types
export type SubscriptionTier = 'FREE' | 'BASIC' | 'PRO';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAYMENT_FAILED' | 'TRIAL';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface SubscriptionTierConfig {
  tier: SubscriptionTier;
  name: string;
  price: number;
  priceYearly: number;
  features: {
    maxActiveSwaps: number;
    maxSkillsToTeach: number;
    maxSkillsToLearn: number;
    canCreateEvents: boolean;
    canAccessPremiumEvents: boolean;
    priorityMatching: boolean;
    verifiedBadge: boolean;
    customProfile: boolean;
    analytics: boolean;
    adFree: boolean;
    supportPriority: 'standard' | 'priority' | 'vip';
    maxConnections: number;
    monetization?: boolean;
    corporateFeatures?: boolean;
  };
}

export interface UserSubscription {
  subscriptionId: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  amount: number;
  currency: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  startDate: string;
  currentPeriodStart: string;
  currentPeriodEnd?: string;
  trialEnd?: string;
  cancelAt?: string;
  cancelledAt?: string;
  autoRenew: boolean;
  razorpaySubscriptionId?: string;
  razorpayCustomerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  paymentId: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  description?: string;
  subscriptionTier?: SubscriptionTier;
  paidAt?: string;
  refundedAt?: string;
  createdAt: string;
}

export interface Invoice {
  invoiceId: string;
  userId: string;
  paymentId: string;
  invoiceNumber: string;
  amount: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  subscriptionTier: SubscriptionTier;
  isPaid: boolean;
  paidAt?: string;
  dueDate: string;
  createdAt: string;
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface ActionPermission {
  allowed: boolean;
  reason?: string;
  limit?: number;
  current?: number;
}

/**
 * Get all subscription tiers
 */
export async function getSubscriptionTiers(): Promise<SubscriptionTierConfig[]> {
  const response = await api.get('/subscriptions/tiers');
  return response.data.data;
}

/**
 * Get current user's subscription
 */
export async function getMySubscription(): Promise<{
  subscription: UserSubscription;
  tierConfig: SubscriptionTierConfig;
}> {
  const response = await api.get('/subscriptions/me');
  return response.data.data;
}

/**
 * Create payment order for subscription
 */
export async function createSubscriptionOrder(
  tier: SubscriptionTier,
  billingCycle: 'MONTHLY' | 'YEARLY'
): Promise<CreateOrderResponse> {
  const response = await api.post('/subscriptions/create-order', {
    tier,
    billingCycle,
  });
  return response.data.data;
}

/**
 * Verify payment and activate subscription
 */
export async function verifyPayment(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<{ subscription: UserSubscription; payment: Payment }> {
  const response = await api.post('/subscriptions/verify-payment', {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });
  return response.data.data;
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(immediate: boolean = false): Promise<UserSubscription> {
  const response = await api.post('/subscriptions/cancel', { immediate });
  return response.data.data;
}

/**
 * Reactivate cancelled subscription
 */
export async function reactivateSubscription(): Promise<UserSubscription> {
  const response = await api.post('/subscriptions/reactivate');
  return response.data.data;
}

/**
 * Get payment history
 */
export async function getPaymentHistory(
  limit: number = 20,
  offset: number = 0
): Promise<{ payments: Payment[]; total: number }> {
  const response = await api.get(`/subscriptions/payments?limit=${limit}&offset=${offset}`);
  return response.data.data;
}

/**
 * Get invoices
 */
export async function getInvoices(
  limit: number = 20,
  offset: number = 0
): Promise<{ invoices: Invoice[]; total: number }> {
  const response = await api.get(`/subscriptions/invoices?limit=${limit}&offset=${offset}`);
  return response.data.data;
}

/**
 * Check if user has access to a feature
 */
export async function checkFeatureAccess(feature: string): Promise<boolean> {
  const response = await api.get(`/subscriptions/features/${feature}`);
  return response.data.data.hasAccess;
}

/**
 * Check if user can perform an action
 */
export async function canPerformAction(
  action: 'createSwap' | 'addSkillToTeach' | 'addSkillToLearn' | 'createEvent' | 'addConnection'
): Promise<ActionPermission> {
  const response = await api.post('/subscriptions/can-perform', { action });
  return response.data.data;
}

// Utility functions

/**
 * Get tier badge color
 */
export function getTierColor(tier: SubscriptionTier): string {
  const colors: Record<SubscriptionTier, string> = {
    FREE: 'bg-gray-100 text-gray-700',
    BASIC: 'bg-blue-100 text-blue-700',
    PRO: 'bg-purple-100 text-purple-700',
  };
  return colors[tier];
}

/**
 * Get tier gradient
 */
export function getTierGradient(tier: SubscriptionTier): string {
  const gradients: Record<SubscriptionTier, string> = {
    FREE: 'from-gray-500 to-gray-600',
    BASIC: 'from-blue-500 to-blue-600',
    PRO: 'from-purple-500 to-purple-600',
  };
  return gradients[tier];
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  if (currency === 'INR') {
    return `₹${amount.toLocaleString()}`;
  }
  return `${currency} ${amount.toLocaleString()}`;
}

/**
 * Format subscription period
 */
export function formatSubscriptionPeriod(
  start: string,
  end?: string
): string {
  const startDate = new Date(start);
  const startFormatted = startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (!end) return `Since ${startFormatted}`;

  const endDate = new Date(end);
  const endFormatted = endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Get days until period end
 */
export function getDaysUntilPeriodEnd(periodEnd?: string): number | null {
  if (!periodEnd) return null;

  const now = new Date();
  const end = new Date(periodEnd);
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / 86400000);

  return diffDays > 0 ? diffDays : 0;
}

/**
 * Check if subscription is ending soon (within 7 days)
 */
export function isEndingSoon(periodEnd?: string): boolean {
  const days = getDaysUntilPeriodEnd(periodEnd);
  return days !== null && days > 0 && days <= 7;
}

/**
 * Get payment status color
 */
export function getPaymentStatusColor(status: PaymentStatus): string {
  const colors: Record<PaymentStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    SUCCESS: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
    REFUNDED: 'bg-gray-100 text-gray-700',
  };
  return colors[status];
}

/**
 * Get subscription status color
 */
export function getSubscriptionStatusColor(status: SubscriptionStatus): string {
  const colors: Record<SubscriptionStatus, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
    EXPIRED: 'bg-gray-100 text-gray-700',
    PAYMENT_FAILED: 'bg-red-100 text-red-700',
    TRIAL: 'bg-blue-100 text-blue-700',
  };
  return colors[status];
}

/**
 * Calculate yearly savings percentage
 */
export function getYearlySavings(monthlyPrice: number, yearlyPrice: number): number {
  const monthlyTotal = monthlyPrice * 12;
  const savings = monthlyTotal - yearlyPrice;
  return Math.round((savings / monthlyTotal) * 100);
}

/**
 * Open Razorpay checkout
 */
export function openRazorpayCheckout(
  orderData: CreateOrderResponse,
  onSuccess: (response: any) => void,
  onFailure: (error: any) => void
) {
  // Check if Razorpay is loaded
  if (typeof (window as any).Razorpay === 'undefined') {
    onFailure(new Error('Razorpay SDK not loaded'));
    return;
  }

  const options = {
    key: orderData.keyId,
    amount: orderData.amount,
    currency: orderData.currency,
    order_id: orderData.orderId,
    name: 'Tej India',
    description: 'Premium Subscription',
    image: '/logo.png',
    handler: function (response: any) {
      onSuccess(response);
    },
    prefill: {
      name: '',
      email: '',
      contact: '',
    },
    theme: {
      color: '#3B82F6',
    },
    modal: {
      ondismiss: function () {
        onFailure(new Error('Payment cancelled by user'));
      },
    },
  };

  const razorpay = new (window as any).Razorpay(options);
  razorpay.open();
}
