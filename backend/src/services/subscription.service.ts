/**
 * Subscription Service
 * Manages user subscriptions and premium features
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';
import { razorpayService } from './razorpay.service';
import { notificationService } from './notification.service';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';

// Subscription tier configuration
export const SUBSCRIPTION_TIERS = {
  FREE: {
    tier: 'FREE' as SubscriptionTier,
    name: 'Free',
    price: 0,
    priceYearly: 0,
    features: {
      maxActiveSwaps: 3,
      maxSkillsToTeach: 5,
      maxSkillsToLearn: 5,
      canCreateEvents: false,
      canAccessPremiumEvents: false,
      priorityMatching: false,
      verifiedBadge: false,
      customProfile: false,
      analytics: false,
      adFree: false,
      supportPriority: 'standard' as const,
      maxConnections: 50,
    },
  },
  BASIC: {
    tier: 'BASIC' as SubscriptionTier,
    name: 'Basic',
    price: 299,
    priceYearly: 2990, // ~10% discount
    features: {
      maxActiveSwaps: 10,
      maxSkillsToTeach: 15,
      maxSkillsToLearn: 15,
      canCreateEvents: true,
      canAccessPremiumEvents: true,
      priorityMatching: true,
      verifiedBadge: true,
      customProfile: true,
      analytics: true,
      adFree: true,
      supportPriority: 'priority' as const,
      maxConnections: 200,
    },
  },
  PRO: {
    tier: 'PRO' as SubscriptionTier,
    name: 'Pro',
    price: 599,
    priceYearly: 5990, // ~17% discount
    features: {
      maxActiveSwaps: -1, // unlimited
      maxSkillsToTeach: -1, // unlimited
      maxSkillsToLearn: -1, // unlimited
      canCreateEvents: true,
      canAccessPremiumEvents: true,
      priorityMatching: true,
      verifiedBadge: true,
      customProfile: true,
      analytics: true,
      adFree: true,
      supportPriority: 'vip' as const,
      maxConnections: -1, // unlimited
      monetization: true,
      corporateFeatures: true,
    },
  },
};

class SubscriptionService {
  /**
   * Get subscription tier configuration
   */
  getTierConfig(tier: SubscriptionTier) {
    return SUBSCRIPTION_TIERS[tier];
  }

  /**
   * Get all subscription tiers
   */
  getAllTiers() {
    return Object.values(SUBSCRIPTION_TIERS);
  }

  /**
   * Get or create user subscription
   */
  async getUserSubscription(userId: string) {
    try {
      let subscription = await prisma.userSubscription.findUnique({
        where: { userId },
      });

      // Create free tier subscription if doesn't exist
      if (!subscription) {
        subscription = await prisma.userSubscription.create({
          data: {
            userId,
            tier: 'FREE',
            status: 'ACTIVE',
            amount: 0,
          },
        });
        logger.info(`Created free subscription for user ${userId}`);
      }

      return subscription;
    } catch (error) {
      logger.error('Failed to get user subscription:', error);
      throw error;
    }
  }

  /**
   * Create a subscription (upgrade from free or change tier)
   */
  async createSubscription(
    userId: string,
    tier: SubscriptionTier,
    billingCycle: 'MONTHLY' | 'YEARLY'
  ) {
    try {
      if (tier === 'FREE') {
        throw new Error('Cannot create paid subscription for FREE tier');
      }

      const tierConfig = SUBSCRIPTION_TIERS[tier];
      const amount = billingCycle === 'MONTHLY' ? tierConfig.price : tierConfig.priceYearly;

      // Get or create Razorpay customer
      const user = await prisma.user.findUnique({
        where: { userId },
        select: { name: true, email: true, phone: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get existing subscription
      const existingSubscription = await this.getUserSubscription(userId);

      // Calculate period dates
      const now = new Date();
      const periodEnd = new Date(now);
      if (billingCycle === 'MONTHLY') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      // Update subscription
      const subscription = await prisma.userSubscription.update({
        where: { userId },
        data: {
          tier,
          status: 'ACTIVE',
          amount,
          billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          autoRenew: true,
        },
      });

      // Send notification
      await notificationService.createNotification({
        userId,
        type: 'SYSTEM',
        title: 'Subscription Activated',
        message: `Your ${tierConfig.name} subscription is now active!`,
      });

      logger.info(`Created ${tier} subscription for user ${userId}`);
      return subscription;
    } catch (error) {
      logger.error('Failed to create subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(userId: string, immediate: boolean = false) {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (subscription.tier === 'FREE') {
        throw new Error('Cannot cancel free subscription');
      }

      const now = new Date();
      const cancelAt = immediate ? now : subscription.currentPeriodEnd || now;

      const updated = await prisma.userSubscription.update({
        where: { userId },
        data: {
          status: immediate ? 'CANCELLED' : 'ACTIVE',
          autoRenew: false,
          cancelAt,
          cancelledAt: now,
        },
      });

      // Cancel Razorpay subscription if exists
      if (subscription.razorpaySubscriptionId && razorpayService.isConfigured()) {
        try {
          await razorpayService.cancelSubscription(
            subscription.razorpaySubscriptionId,
            !immediate
          );
        } catch (error) {
          logger.error('Failed to cancel Razorpay subscription:', error);
        }
      }

      // Send notification
      await notificationService.createNotification({
        userId,
        type: 'SYSTEM',
        title: 'Subscription Cancelled',
        message: immediate
          ? 'Your subscription has been cancelled immediately'
          : 'Your subscription will be cancelled at the end of the billing period',
      });

      logger.info(`Cancelled subscription for user ${userId} (immediate: ${immediate})`);
      return updated;
    } catch (error) {
      logger.error('Failed to cancel subscription:', error);
      throw error;
    }
  }

  /**
   * Reactivate a cancelled subscription
   */
  async reactivateSubscription(userId: string) {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (subscription.status !== 'CANCELLED' && !subscription.cancelAt) {
        throw new Error('Subscription is not cancelled');
      }

      const updated = await prisma.userSubscription.update({
        where: { userId },
        data: {
          status: 'ACTIVE',
          autoRenew: true,
          cancelAt: null,
          cancelledAt: null,
        },
      });

      await notificationService.createNotification({
        userId,
        type: 'SYSTEM',
        title: 'Subscription Reactivated',
        message: 'Your subscription has been reactivated successfully',
      });

      logger.info(`Reactivated subscription for user ${userId}`);
      return updated;
    } catch (error) {
      logger.error('Failed to reactivate subscription:', error);
      throw error;
    }
  }

  /**
   * Check if user has access to a feature
   */
  async hasFeatureAccess(userId: string, feature: keyof typeof SUBSCRIPTION_TIERS.FREE.features): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      const tierConfig = SUBSCRIPTION_TIERS[subscription.tier];

      // Check if subscription is active
      if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL') {
        return false;
      }

      // Check if subscription has expired
      if (subscription.currentPeriodEnd && subscription.currentPeriodEnd < new Date()) {
        return false;
      }

      return Boolean(tierConfig.features[feature]);
    } catch (error) {
      logger.error('Failed to check feature access:', error);
      return false;
    }
  }

  /**
   * Get feature limit for user
   */
  async getFeatureLimit(userId: string, feature: keyof typeof SUBSCRIPTION_TIERS.FREE.features): Promise<number> {
    try {
      const subscription = await this.getUserSubscription(userId);
      const tierConfig = SUBSCRIPTION_TIERS[subscription.tier];

      const featureValue = tierConfig.features[feature];

      // Handle numeric limits
      if (typeof featureValue === 'number') {
        return featureValue;
      }

      return 0;
    } catch (error) {
      logger.error('Failed to get feature limit:', error);
      return 0;
    }
  }

  /**
   * Check if user can perform an action based on limits
   */
  async canPerformAction(
    userId: string,
    action: 'createSwap' | 'addSkillToTeach' | 'addSkillToLearn' | 'createEvent' | 'addConnection'
  ): Promise<{ allowed: boolean; reason?: string; limit?: number; current?: number }> {
    try {
      const subscription = await this.getUserSubscription(userId);
      const tierConfig = SUBSCRIPTION_TIERS[subscription.tier];

      switch (action) {
        case 'createSwap': {
          const limit = tierConfig.features.maxActiveSwaps;
          if (limit === -1) return { allowed: true }; // unlimited

          const currentCount = await prisma.swap.count({
            where: {
              OR: [{ initiatorId: userId }, { receiverId: userId }],
              status: { in: ['PENDING', 'ACCEPTED'] },
            },
          });

          return {
            allowed: currentCount < limit,
            reason: currentCount >= limit ? 'Active swap limit reached' : undefined,
            limit,
            current: currentCount,
          };
        }

        case 'addSkillToTeach': {
          const limit = tierConfig.features.maxSkillsToTeach;
          if (limit === -1) return { allowed: true };

          const currentCount = await prisma.userSkill.count({
            where: { userId, skillType: 'TEACH' },
          });

          return {
            allowed: currentCount < limit,
            reason: currentCount >= limit ? 'Teaching skills limit reached' : undefined,
            limit,
            current: currentCount,
          };
        }

        case 'addSkillToLearn': {
          const limit = tierConfig.features.maxSkillsToLearn;
          if (limit === -1) return { allowed: true };

          const currentCount = await prisma.userSkill.count({
            where: { userId, skillType: 'LEARN' },
          });

          return {
            allowed: currentCount < limit,
            reason: currentCount >= limit ? 'Learning skills limit reached' : undefined,
            limit,
            current: currentCount,
          };
        }

        case 'createEvent': {
          const allowed = tierConfig.features.canCreateEvents;
          return {
            allowed,
            reason: !allowed ? 'Event creation requires Basic or Pro subscription' : undefined,
          };
        }

        case 'addConnection': {
          const limit = tierConfig.features.maxConnections;
          if (limit === -1) return { allowed: true };

          const currentCount = await prisma.connection.count({
            where: { userId },
          });

          return {
            allowed: currentCount < limit,
            reason: currentCount >= limit ? 'Connection limit reached' : undefined,
            limit,
            current: currentCount,
          };
        }

        default:
          return { allowed: false, reason: 'Unknown action' };
      }
    } catch (error) {
      logger.error('Failed to check action permission:', error);
      return { allowed: false, reason: 'Error checking permissions' };
    }
  }

  /**
   * Handle expired subscriptions (run via cron job)
   */
  async handleExpiredSubscriptions() {
    try {
      const now = new Date();

      const expiredSubscriptions = await prisma.userSubscription.findMany({
        where: {
          status: 'ACTIVE',
          currentPeriodEnd: { lt: now },
          tier: { not: 'FREE' },
        },
      });

      logger.info(`Found ${expiredSubscriptions.length} expired subscriptions to process`);

      for (const subscription of expiredSubscriptions) {
        try {
          if (subscription.autoRenew) {
            // TODO: Attempt to renew subscription via Razorpay
            logger.info(`Auto-renewal needed for subscription ${subscription.subscriptionId}`);
          } else {
            // Downgrade to free tier
            await prisma.userSubscription.update({
              where: { subscriptionId: subscription.subscriptionId },
              data: {
                tier: 'FREE',
                status: 'EXPIRED',
                amount: 0,
              },
            });

            // Notify user
            await notificationService.createNotification({
              userId: subscription.userId,
              type: 'SYSTEM',
              title: 'Subscription Expired',
              message: 'Your premium subscription has expired. You have been moved to the free tier.',
            });

            logger.info(`Expired subscription ${subscription.subscriptionId} downgraded to FREE`);
          }
        } catch (error) {
          logger.error(`Failed to process expired subscription ${subscription.subscriptionId}:`, error);
        }
      }

      return expiredSubscriptions.length;
    } catch (error) {
      logger.error('Failed to handle expired subscriptions:', error);
      throw error;
    }
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats() {
    try {
      const [free, basic, pro, active, cancelled, expired] = await Promise.all([
        prisma.userSubscription.count({ where: { tier: 'FREE' } }),
        prisma.userSubscription.count({ where: { tier: 'BASIC' } }),
        prisma.userSubscription.count({ where: { tier: 'PRO' } }),
        prisma.userSubscription.count({ where: { status: 'ACTIVE' } }),
        prisma.userSubscription.count({ where: { status: 'CANCELLED' } }),
        prisma.userSubscription.count({ where: { status: 'EXPIRED' } }),
      ]);

      return {
        byTier: { free, basic, pro },
        byStatus: { active, cancelled, expired },
        totalRevenue: basic * 299 + pro * 599, // approximate monthly revenue
      };
    } catch (error) {
      logger.error('Failed to get subscription stats:', error);
      throw error;
    }
  }
}

export const subscriptionService = new SubscriptionService();
