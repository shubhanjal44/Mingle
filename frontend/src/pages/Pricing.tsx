/**
 * Pricing Page
 * Display subscription tiers and allow users to upgrade
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Check,
  X,
  Crown,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Calendar,
  BarChart3,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import {
  getSubscriptionTiers,
  getMySubscription,
  createSubscriptionOrder,
  verifyPayment,
  openRazorpayCheckout,
  SubscriptionTierConfig,
  UserSubscription,
  formatCurrency,
  getYearlySavings,
  getTierGradient,
} from '../services/subscription.service';
import { useAuthStore } from '../stores/authStore';

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [tiers, setTiers] = useState<SubscriptionTierConfig[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [isLoading, setIsLoading] = useState(true);
  const [processingTier, setProcessingTier] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const tiersData = await getSubscriptionTiers();
      setTiers(tiersData);

      if (user) {
        try {
          const { subscription } = await getMySubscription();
          setCurrentSubscription(subscription);
        } catch (error) {
          // User might not have a subscription yet
        }
      }
    } catch (error) {
      console.error('Failed to load pricing data:', error);
      toast.error('Failed to load pricing information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (tier: SubscriptionTierConfig) => {
    if (!user) {
      toast.error('Please login to upgrade');
      navigate('/login');
      return;
    }

    if (tier.tier === 'FREE') {
      return; // Can't upgrade to free
    }

    try {
      setProcessingTier(tier.tier);

      // Create payment order
      const orderData = await createSubscriptionOrder(tier.tier, billingCycle);

      // Open Razorpay checkout
      openRazorpayCheckout(
        orderData,
        async (response) => {
          try {
            // Verify payment
            await verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );

            toast.success('Subscription activated successfully!');
            navigate('/subscription');
          } catch (error: any) {
            console.error('Payment verification failed:', error);
            toast.error(error.response?.data?.message || 'Payment verification failed');
          } finally {
            setProcessingTier(null);
          }
        },
        (error) => {
          console.error('Payment failed:', error);
          toast.error(error.message || 'Payment failed');
          setProcessingTier(null);
        }
      );
    } catch (error: any) {
      console.error('Failed to create order:', error);
      toast.error(error.response?.data?.message || 'Failed to create payment order');
      setProcessingTier(null);
    }
  };

  const getPrice = (tier: SubscriptionTierConfig) => {
    return billingCycle === 'MONTHLY' ? tier.price : tier.priceYearly;
  };

  const getPricePerMonth = (tier: SubscriptionTierConfig) => {
    if (billingCycle === 'MONTHLY') return tier.price;
    return Math.round(tier.priceYearly / 12);
  };

  const TierCard = ({ tier, isPopular = false }: { tier: SubscriptionTierConfig; isPopular?: boolean }) => {
    const isCurrentTier = currentSubscription?.tier === tier.tier;
    const price = getPrice(tier);
    const pricePerMonth = getPricePerMonth(tier);
    const savings = billingCycle === 'YEARLY' ? getYearlySavings(tier.price, tier.priceYearly) : 0;

    const features = [
      {
        label: tier.features.maxActiveSwaps === -1 ? 'Unlimited Active Swaps' : `${tier.features.maxActiveSwaps} Active Swaps`,
        included: true,
      },
      {
        label: tier.features.maxSkillsToTeach === -1 ? 'Unlimited Skills to Teach' : `${tier.features.maxSkillsToTeach} Skills to Teach`,
        included: true,
      },
      {
        label: tier.features.maxSkillsToLearn === -1 ? 'Unlimited Skills to Learn' : `${tier.features.maxSkillsToLearn} Skills to Learn`,
        included: true,
      },
      {
        label: tier.features.maxConnections === -1 ? 'Unlimited Connections' : `${tier.features.maxConnections} Connections`,
        included: true,
      },
      {
        label: 'Create & Join Events',
        included: tier.features.canCreateEvents,
      },
      {
        label: 'Priority Matching',
        included: tier.features.priorityMatching,
      },
      {
        label: 'Verified Badge',
        included: tier.features.verifiedBadge,
      },
      {
        label: 'Custom Profile',
        included: tier.features.customProfile,
      },
      {
        label: 'Analytics Dashboard',
        included: tier.features.analytics,
      },
      {
        label: 'Ad-Free Experience',
        included: tier.features.adFree,
      },
      {
        label: `${tier.features.supportPriority} Support`,
        included: true,
      },
    ];

    if (tier.features.monetization) {
      features.push({ label: 'Monetization Features', included: true });
    }

    if (tier.features.corporateFeatures) {
      features.push({ label: 'Corporate Features', included: true });
    }

    return (
      <div
        className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all ${
          isPopular ? 'ring-4 ring-blue-500 scale-105' : 'hover:shadow-xl'
        }`}
      >
        {isPopular && (
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-center py-2 font-semibold text-sm">
            MOST POPULAR
          </div>
        )}

        <div className={`p-8 ${isPopular ? 'pt-16' : ''}`}>
          {/* Tier Name & Icon */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-gray-900">{tier.name}</h3>
            {tier.tier === 'PRO' && <Crown className="w-8 h-8 text-purple-500" />}
            {tier.tier === 'BASIC' && <Zap className="w-8 h-8 text-blue-500" />}
            {tier.tier === 'FREE' && <Shield className="w-8 h-8 text-gray-500" />}
          </div>

          {/* Price */}
          <div className="mb-6">
            {tier.tier === 'FREE' ? (
              <div className="text-4xl font-bold text-gray-900">Free</div>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatCurrency(pricePerMonth)}
                  </span>
                  <span className="text-gray-600">/month</span>
                </div>
                {billingCycle === 'YEARLY' && (
                  <div className="mt-2">
                    <div className="text-sm text-gray-600">
                      {formatCurrency(price)} billed yearly
                    </div>
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium mt-1">
                      <TrendingUp className="w-3 h-3" />
                      Save {savings}%
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* CTA Button */}
          {isCurrentTier ? (
            <button
              disabled
              className="w-full py-3 px-6 bg-gray-100 text-gray-600 rounded-lg font-semibold mb-6 cursor-not-allowed"
            >
              Current Plan
            </button>
          ) : tier.tier === 'FREE' ? (
            <button
              disabled
              className="w-full py-3 px-6 bg-gray-100 text-gray-600 rounded-lg font-semibold mb-6 cursor-not-allowed"
            >
              Free Forever
            </button>
          ) : (
            <button
              onClick={() => handleUpgrade(tier)}
              disabled={processingTier !== null}
              className={`w-full py-3 px-6 bg-gradient-to-r ${getTierGradient(
                tier.tier
              )} text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 mb-6`}
            >
              {processingTier === tier.tier ? 'Processing...' : 'Upgrade Now'}
            </button>
          )}

          {/* Features List */}
          <div className="space-y-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                {feature.included ? (
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <X className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
                )}
                <span
                  className={`text-sm ${
                    feature.included ? 'text-gray-700' : 'text-gray-400'
                  }`}
                >
                  {feature.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-blue-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading pricing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Unlock premium features and accelerate your skill-swapping journey
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span
            className={`text-sm font-medium ${
              billingCycle === 'MONTHLY' ? 'text-gray-900' : 'text-gray-500'
            }`}
          >
            Monthly
          </span>
          <button
            onClick={() =>
              setBillingCycle(billingCycle === 'MONTHLY' ? 'YEARLY' : 'MONTHLY')
            }
            className="relative inline-flex h-8 w-14 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                billingCycle === 'YEARLY' ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium ${
              billingCycle === 'YEARLY' ? 'text-gray-900' : 'text-gray-500'
            }`}
          >
            Yearly
          </span>
          {billingCycle === 'YEARLY' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              <TrendingUp className="w-3 h-3" />
              Save up to 17%
            </span>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {tiers.map((tier) => (
            <TierCard
              key={tier.tier}
              tier={tier}
              isPopular={tier.tier === 'BASIC'}
            />
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-500" />
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600">
                Yes! You can cancel your subscription at any time. Your access will continue
                until the end of your current billing period.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-500" />
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit/debit cards, UPI, net banking, and digital wallets
                through our secure Razorpay payment gateway.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-500" />
                Can I upgrade or downgrade my plan?
              </h3>
              <p className="text-gray-600">
                Yes, you can upgrade to a higher tier at any time. Downgrades will take
                effect at the end of your current billing period.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-500" />
                Is there a refund policy?
              </h3>
              <p className="text-gray-600">
                We offer a 7-day money-back guarantee for all paid subscriptions. Contact
                support if you're not satisfied within the first 7 days.
              </p>
            </div>
          </div>
        </div>

        {/* Features Comparison */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Feature Comparison
          </h2>

          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Feature
                    </th>
                    {tiers.map((tier) => (
                      <th
                        key={tier.tier}
                        className="px-6 py-4 text-center text-sm font-semibold text-gray-900"
                      >
                        {tier.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 text-sm text-gray-700">Active Swaps</td>
                    {tiers.map((tier) => (
                      <td key={tier.tier} className="px-6 py-4 text-sm text-center">
                        {tier.features.maxActiveSwaps === -1
                          ? '∞'
                          : tier.features.maxActiveSwaps}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm text-gray-700">Skills to Teach</td>
                    {tiers.map((tier) => (
                      <td key={tier.tier} className="px-6 py-4 text-sm text-center">
                        {tier.features.maxSkillsToTeach === -1
                          ? '∞'
                          : tier.features.maxSkillsToTeach}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm text-gray-700">Connections</td>
                    {tiers.map((tier) => (
                      <td key={tier.tier} className="px-6 py-4 text-sm text-center">
                        {tier.features.maxConnections === -1
                          ? '∞'
                          : tier.features.maxConnections}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm text-gray-700">Create Events</td>
                    {tiers.map((tier) => (
                      <td key={tier.tier} className="px-6 py-4 text-center">
                        {tier.features.canCreateEvents ? (
                          <Check className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm text-gray-700">Verified Badge</td>
                    {tiers.map((tier) => (
                      <td key={tier.tier} className="px-6 py-4 text-center">
                        {tier.features.verifiedBadge ? (
                          <Check className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm text-gray-700">Analytics</td>
                    {tiers.map((tier) => (
                      <td key={tier.tier} className="px-6 py-4 text-center">
                        {tier.features.analytics ? (
                          <Check className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm text-gray-700">Ad-Free</td>
                    {tiers.map((tier) => (
                      <td key={tier.tier} className="px-6 py-4 text-center">
                        {tier.features.adFree ? (
                          <Check className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
