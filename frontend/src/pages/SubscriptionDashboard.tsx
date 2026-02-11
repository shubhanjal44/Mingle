/**
 * Subscription Dashboard
 * Manage subscription, view payment history and invoices
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Crown,
  Calendar,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  Settings,
  TrendingUp,
} from 'lucide-react';
import {
  getMySubscription,
  getPaymentHistory,
  getInvoices,
  cancelSubscription,
  reactivateSubscription,
  UserSubscription,
  SubscriptionTierConfig,
  Payment,
  Invoice,
  formatCurrency,
  formatSubscriptionPeriod,
  getDaysUntilPeriodEnd,
  isEndingSoon,
  getTierColor,
  getTierGradient,
  getPaymentStatusColor,
  getSubscriptionStatusColor,
} from '../services/subscription.service';
import { useAuthStore } from '../stores/authStore';

type TabType = 'overview' | 'payments' | 'invoices';

export default function SubscriptionDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [tierConfig, setTierConfig] = useState<SubscriptionTierConfig | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadSubscriptionData();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'payments' && payments.length === 0) {
      loadPayments();
    } else if (activeTab === 'invoices' && invoices.length === 0) {
      loadInvoices();
    }
  }, [activeTab]);

  const loadSubscriptionData = async () => {
    try {
      setIsLoading(true);
      const data = await getMySubscription();
      setSubscription(data.subscription);
      setTierConfig(data.tierConfig);
    } catch (error) {
      console.error('Failed to load subscription:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      const data = await getPaymentHistory(20);
      setPayments(data.payments);
    } catch (error) {
      console.error('Failed to load payments:', error);
      toast.error('Failed to load payment history');
    }
  };

  const loadInvoices = async () => {
    try {
      const data = await getInvoices(20);
      setInvoices(data.invoices);
    } catch (error) {
      console.error('Failed to load invoices:', error);
      toast.error('Failed to load invoices');
    }
  };

  const handleCancelSubscription = async (immediate: boolean = false) => {
    const message = immediate
      ? 'Are you sure you want to cancel your subscription immediately? You will lose access to premium features right away.'
      : 'Are you sure you want to cancel your subscription? Your access will continue until the end of the current billing period.';

    if (!window.confirm(message)) return;

    try {
      setIsCancelling(true);
      const updated = await cancelSubscription(immediate);
      setSubscription(updated);
      toast.success(
        immediate
          ? 'Subscription cancelled immediately'
          : 'Subscription will be cancelled at the end of the billing period'
      );
    } catch (error: any) {
      console.error('Failed to cancel subscription:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReactivate = async () => {
    try {
      const updated = await reactivateSubscription();
      setSubscription(updated);
      toast.success('Subscription reactivated successfully!');
    } catch (error: any) {
      console.error('Failed to reactivate subscription:', error);
      toast.error(error.response?.data?.message || 'Failed to reactivate subscription');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!subscription || !tierConfig) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-gray-600">No subscription found</p>
      </div>
    );
  }

  const daysRemaining = getDaysUntilPeriodEnd(subscription.currentPeriodEnd);
  const ending = isEndingSoon(subscription.currentPeriodEnd);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription</h1>
        <p className="text-gray-600">Manage your subscription and billing</p>
      </div>

      {/* Current Plan Card */}
      <div
        className={`bg-gradient-to-r ${getTierGradient(
          subscription.tier
        )} rounded-lg shadow-lg p-8 text-white mb-8`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="w-8 h-8" />
              <h2 className="text-2xl font-bold">{tierConfig.name} Plan</h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getSubscriptionStatusColor(
                  subscription.status
                )}`}
              >
                {subscription.status}
              </span>
            </div>

            <div className="space-y-2 text-white/90">
              <p className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatSubscriptionPeriod(
                  subscription.currentPeriodStart,
                  subscription.currentPeriodEnd
                )}
              </p>

              {subscription.tier !== 'FREE' && (
                <p className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  {formatCurrency(subscription.amount)} /{' '}
                  {subscription.billingCycle === 'MONTHLY' ? 'month' : 'year'}
                </p>
              )}

              {daysRemaining !== null && daysRemaining > 0 && (
                <p className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {daysRemaining} days remaining in current period
                </p>
              )}
            </div>

            {ending && (
              <div className="mt-4 p-3 bg-yellow-500/20 rounded-lg">
                <p className="text-sm font-medium">
                  Your subscription is ending soon! Renew now to continue enjoying premium
                  features.
                </p>
              </div>
            )}

            {subscription.cancelAt && (
              <div className="mt-4 p-3 bg-red-500/20 rounded-lg">
                <p className="text-sm font-medium">
                  Your subscription will be cancelled on{' '}
                  {new Date(subscription.cancelAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          <div className="text-right">
            {subscription.tier !== 'FREE' && !subscription.cancelAt && (
              <button
                onClick={() => handleCancelSubscription(false)}
                disabled={isCancelling}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors disabled:opacity-50 mb-2"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
              </button>
            )}

            {subscription.cancelAt && subscription.status !== 'CANCELLED' && (
              <button
                onClick={handleReactivate}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors mb-2"
              >
                Reactivate
              </button>
            )}

            {subscription.tier === 'FREE' && (
              <button
                onClick={() => navigate('/pricing')}
                className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-white/90 transition-colors"
              >
                Upgrade Plan
              </button>
            )}

            {subscription.tier === 'BASIC' && (
              <button
                onClick={() => navigate('/pricing')}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors"
              >
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Features Included */}
      {subscription.tier !== 'FREE' && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Features Included</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-gray-700">
                {tierConfig.features.maxActiveSwaps === -1
                  ? 'Unlimited'
                  : tierConfig.features.maxActiveSwaps}{' '}
                Active Swaps
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-gray-700">
                {tierConfig.features.maxConnections === -1
                  ? 'Unlimited'
                  : tierConfig.features.maxConnections}{' '}
                Connections
              </span>
            </div>
            {tierConfig.features.canCreateEvents && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">Create & Join Events</span>
              </div>
            )}
            {tierConfig.features.priorityMatching && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">Priority Matching</span>
              </div>
            )}
            {tierConfig.features.verifiedBadge && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">Verified Badge</span>
              </div>
            )}
            {tierConfig.features.analytics && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">Analytics Dashboard</span>
              </div>
            )}
            {tierConfig.features.adFree && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">Ad-Free Experience</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Settings className="w-5 h-5" />
            Overview
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
              activeTab === 'payments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            Payment History
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
              activeTab === 'invoices'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-5 h-5" />
            Invoices
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Subscription Details
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Subscription ID</p>
                  <p className="font-mono text-sm">{subscription.subscriptionId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getSubscriptionStatusColor(
                      subscription.status
                    )}`}
                  >
                    {subscription.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Billing Cycle</p>
                  <p className="font-medium">{subscription.billingCycle}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Auto-Renew</p>
                  <p className="font-medium">
                    {subscription.autoRenew ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t">
              <button
                onClick={() => navigate('/pricing')}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <TrendingUp className="w-5 h-5" />
                View All Plans
              </button>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Payment History</h3>
            {payments.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No payments yet</p>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.paymentId}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {payment.description || 'Subscription Payment'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(payment.createdAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        {formatCurrency(payment.amount, payment.currency)}
                      </p>
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(
                          payment.status
                        )}`}
                      >
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Invoices</h3>
            {invoices.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No invoices yet</p>
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.invoiceId}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        Invoice #{invoice.invoiceNumber}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(invoice.periodStart).toLocaleDateString()} -{' '}
                        {new Date(invoice.periodEnd).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          {formatCurrency(invoice.total, invoice.currency)}
                        </p>
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            invoice.isPaid
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {invoice.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>
                      <button
                        className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                        title="Download Invoice"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
