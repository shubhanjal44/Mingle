/**
 * Advanced Analytics Service
 * Provides detailed platform analytics, insights, and reporting
 */

import prisma from '../config/database';
import { redis } from '../config/redis';
import { CacheTTL, CachePrefix } from './cache.service';
import { logger } from '../utils/logger';

interface TimeRange {
  startDate: Date;
  endDate: Date;
}

interface MetricTrend {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

interface UserSegment {
  segment: string;
  count: number;
  percentage: number;
}

/**
 * Advanced Analytics Service Class
 */
class AdvancedAnalyticsService {
  /**
   * Get comprehensive platform overview
   */
  async getPlatformOverview(timeRange: TimeRange) {
    const cacheKey = `${CachePrefix.ANALYTICS}platform-overview:${timeRange.startDate.getTime()}:${timeRange.endDate.getTime()}`;

    // Try cache first
    const cached = await redis.getJSON(cacheKey);
    if (cached) return cached;

    const [
      totalUsers,
      activeUsers,
      totalSwaps,
      completedSwaps,
      totalRevenue,
      avgSessionDuration,
      topSkills,
      userGrowth,
      engagementRate,
    ] = await Promise.all([
      this.getTotalUsers(),
      this.getActiveUsers(timeRange),
      this.getTotalSwaps(timeRange),
      this.getCompletedSwaps(timeRange),
      this.getTotalRevenue(timeRange),
      this.getAverageSessionDuration(timeRange),
      this.getTopSkills(10),
      this.getUserGrowth(timeRange),
      this.getEngagementRate(timeRange),
    ]);

    const overview = {
      totalUsers,
      activeUsers,
      totalSwaps,
      completedSwaps,
      completionRate: totalSwaps > 0 ? (completedSwaps / totalSwaps) * 100 : 0,
      totalRevenue,
      avgSessionDuration,
      topSkills,
      userGrowth,
      engagementRate,
      timestamp: new Date(),
    };

    // Cache for 5 minutes
    await redis.setJSON(cacheKey, overview, CacheTTL.SHORT);

    return overview;
  }

  /**
   * Get user behavior analytics
   */
  async getUserBehaviorAnalytics(timeRange: TimeRange) {
    const [
      sessionStats,
      deviceStats,
      locationStats,
      featureUsage,
      userJourney,
      churnAnalysis,
    ] = await Promise.all([
      this.getSessionStatistics(timeRange),
      this.getDeviceStatistics(timeRange),
      this.getLocationStatistics(timeRange),
      this.getFeatureUsageStats(timeRange),
      this.getUserJourneyAnalytics(timeRange),
      this.getChurnAnalysis(timeRange),
    ]);

    return {
      sessionStats,
      deviceStats,
      locationStats,
      featureUsage,
      userJourney,
      churnAnalysis,
    };
  }

  /**
   * Get skill marketplace analytics
   */
  async getSkillMarketplaceAnalytics(timeRange: TimeRange) {
    // Most demanded skills (users learning)
    const demandedSkills = await prisma.userSkill.groupBy({
      by: ['skillId'],
      where: {
        skillType: 'LEARN',
      },
      _count: {
        skillId: true,
      },
      orderBy: {
        _count: {
          skillId: 'desc',
        },
      },
      take: 10,
    });

    // Most offered skills (users teaching)
    const offeredSkills = await prisma.userSkill.groupBy({
      by: ['skillId'],
      where: {
        skillType: 'TEACH',
      },
      _count: {
        skillId: true,
      },
      orderBy: {
        _count: {
          skillId: 'desc',
        },
      },
      take: 10,
    });

    // Get skill details
    const demandedSkillIds = demandedSkills.map((s) => s.skillId);
    const offeredSkillIds = offeredSkills.map((s) => s.skillId);
    const allSkillIds = [...new Set([...demandedSkillIds, ...offeredSkillIds])];

    const skills = await prisma.skill.findMany({
      where: {
        skillId: { in: allSkillIds },
      },
      select: {
        skillId: true,
        name: true,
      },
    });

    const skillMap = new Map(skills.map((s) => [s.skillId, s.name]));

    // Supply-demand gap analysis
    const supplyDemandGap = demandedSkills.map((demanded) => {
      const offered = offeredSkills.find((s) => s.skillId === demanded.skillId);
      const demand = demanded._count.skillId;
      const supply = offered?._count.skillId || 0;
      const gap = demand - supply;
      const gapPercentage = demand > 0 ? (gap / demand) * 100 : 0;

      return {
        skill: skillMap.get(demanded.skillId) || 'Unknown',
        demand,
        supply,
        gap,
        gapPercentage,
        status: gap > 0 ? 'undersupplied' : gap < 0 ? 'oversupplied' : 'balanced',
      };
    });

    // Average swap duration
    const avgSwapDuration = await prisma.swap.aggregate({
      where: {
        createdAt: {
          gte: timeRange.startDate,
          lte: timeRange.endDate,
        },
        status: 'COMPLETED',
      },
      _avg: {
        duration: true,
      },
    });

    return {
      demandedSkills: demandedSkills.map((s) => ({
        name: skillMap.get(s.skillId) || 'Unknown',
        demand: s._count.skillId,
      })),
      offeredSkills: offeredSkills.map((s) => ({
        name: skillMap.get(s.skillId) || 'Unknown',
        supply: s._count.skillId,
      })),
      supplyDemandGap,
      avgSwapDuration: avgSwapDuration._avg.duration || 0,
    };
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(timeRange: TimeRange) {
    const payments = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: timeRange.startDate,
          lte: timeRange.endDate,
        },
        status: 'SUCCESS',
      },
      select: {
        amount: true,
        createdAt: true,
        subscriptionTier: true,
      },
    });

    // Revenue by tier
    const revenueByTier = payments.reduce((acc, payment) => {
      const tier = payment.subscriptionTier || 'UNKNOWN';
      acc[tier] = (acc[tier] || 0) + payment.amount;
      return acc;
    }, {} as Record<string, number>);

    // Daily revenue trend
    const dailyRevenue = payments.reduce((acc, payment) => {
      const date = payment.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + payment.amount;
      return acc;
    }, {} as Record<string, number>);

    // MRR (Monthly Recurring Revenue)
    const activeSubscriptions = await prisma.userSubscription.count({
      where: {
        status: 'ACTIVE',
      },
    });

    const avgSubscriptionValue = await prisma.userSubscription.aggregate({
      where: {
        status: 'ACTIVE',
      },
      _avg: {
        amount: true,
      },
    });

    const mrr = (avgSubscriptionValue._avg.amount || 0) * activeSubscriptions;

    // ARR (Annual Recurring Revenue)
    const arr = mrr * 12;

    // Revenue growth rate
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const previousPeriodRevenue = await this.getPreviousPeriodRevenue(timeRange);
    const revenueGrowth = previousPeriodRevenue > 0
      ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100
      : 0;

    return {
      totalRevenue,
      mrr,
      arr,
      revenueGrowth,
      revenueByTier,
      dailyRevenue: Object.entries(dailyRevenue).map(([date, amount]) => ({
        date,
        amount,
      })),
      activeSubscriptions,
      avgSubscriptionValue: avgSubscriptionValue._avg.amount || 0,
    };
  }

  /**
   * Get user retention analytics
   */
  async getRetentionAnalytics(timeRange: TimeRange) {
    // Cohort analysis
    const cohorts = await this.getCohortAnalysis(timeRange);

    // Retention rate by period
    const retentionRates = await this.getRetentionRates(timeRange);

    // Churn prediction
    const churnRisk = await this.getChurnRiskUsers();

    return {
      cohorts,
      retentionRates,
      churnRisk,
    };
  }

  /**
   * Get engagement metrics
   */
  async getEngagementMetrics(timeRange: TimeRange) {
    const [
      dau,
      wau,
      mau,
      avgSessionsPerUser,
      avgTimePerSession,
      featureAdoption,
    ] = await Promise.all([
      this.getDailyActiveUsers(timeRange),
      this.getWeeklyActiveUsers(timeRange),
      this.getMonthlyActiveUsers(timeRange),
      this.getAverageSessionsPerUser(timeRange),
      this.getAverageTimePerSession(timeRange),
      this.getFeatureAdoptionRates(timeRange),
    ]);

    // Calculate DAU/MAU ratio (stickiness)
    const stickiness = mau > 0 ? (dau / mau) * 100 : 0;

    return {
      dau,
      wau,
      mau,
      stickiness,
      avgSessionsPerUser,
      avgTimePerSession,
      featureAdoption,
    };
  }

  // ==================== Helper Methods ====================

  private async getTotalUsers(): Promise<number> {
    return await prisma.user.count({
      where: {
        status: { not: 'BANNED' },
      },
    });
  }

  private async getActiveUsers(timeRange: TimeRange): Promise<number> {
    return await prisma.user.count({
      where: {
        lastActive: {
          gte: timeRange.startDate,
          lte: timeRange.endDate,
        },
        status: 'ACTIVE',
      },
    });
  }

  private async getTotalSwaps(timeRange: TimeRange): Promise<number> {
    return await prisma.swap.count({
      where: {
        createdAt: {
          gte: timeRange.startDate,
          lte: timeRange.endDate,
        },
      },
    });
  }

  private async getCompletedSwaps(timeRange: TimeRange): Promise<number> {
    return await prisma.swap.count({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: timeRange.startDate,
          lte: timeRange.endDate,
        },
      },
    });
  }

  private async getTotalRevenue(timeRange: TimeRange): Promise<number> {
    const result = await prisma.payment.aggregate({
      where: {
        status: 'SUCCESS',
        createdAt: {
          gte: timeRange.startDate,
          lte: timeRange.endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  }

  private async getAverageSessionDuration(timeRange: TimeRange): Promise<number> {
    // Placeholder - would track actual session data
    return 25; // minutes
  }

  private async getTopSkills(limit: number) {
    const topSkills = await prisma.userSkill.groupBy({
      by: ['skillId'],
      _count: {
        skillId: true,
      },
      orderBy: {
        _count: {
          skillId: 'desc',
        },
      },
      take: limit,
    });

    const skillIds = topSkills.map((s) => s.skillId);
    const skills = await prisma.skill.findMany({
      where: {
        skillId: { in: skillIds },
      },
      select: {
        skillId: true,
        name: true,
      },
    });

    const skillMap = new Map(skills.map((s) => [s.skillId, s.name]));

    return topSkills.map((s) => ({
      skillId: s.skillId,
      name: skillMap.get(s.skillId) || 'Unknown',
      count: s._count.skillId,
    }));
  }

  private async getUserGrowth(timeRange: TimeRange): Promise<MetricTrend> {
    const current = await this.getActiveUsers(timeRange);

    // Get previous period
    const periodLength = timeRange.endDate.getTime() - timeRange.startDate.getTime();
    const previousPeriodEnd = new Date(timeRange.startDate.getTime());
    const previousPeriodStart = new Date(timeRange.startDate.getTime() - periodLength);

    const previous = await this.getActiveUsers({
      startDate: previousPeriodStart,
      endDate: previousPeriodEnd,
    });

    const change = current - previous;
    const changePercent = previous > 0 ? (change / previous) * 100 : 0;

    return {
      current,
      previous,
      change,
      changePercent,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    };
  }

  private async getEngagementRate(timeRange: TimeRange): Promise<number> {
    const totalUsers = await this.getTotalUsers();
    const activeUsers = await this.getActiveUsers(timeRange);

    return totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
  }

  private async getSessionStatistics(timeRange: TimeRange) {
    // Placeholder - would track actual session data
    return {
      totalSessions: 0,
      avgDuration: 0,
      bounceRate: 0,
    };
  }

  private async getDeviceStatistics(timeRange: TimeRange) {
    // Placeholder - would track device info
    return {
      desktop: 60,
      mobile: 35,
      tablet: 5,
    };
  }

  private async getLocationStatistics(timeRange: TimeRange) {
    const usersByState = await prisma.user.groupBy({
      by: ['state'],
      where: {
        state: { not: null },
      },
      _count: true,
      orderBy: {
        _count: {
          state: 'desc',
        },
      },
      take: 10,
    });

    return usersByState.map((item) => ({
      location: item.state,
      count: item._count,
    }));
  }

  private async getFeatureUsageStats(timeRange: TimeRange) {
    const [
      swapUsers,
      chatUsers,
      eventUsers,
      subscriptionUsers,
    ] = await Promise.all([
      prisma.user.count({
        where: {
          swapsInitiated: {
            some: {
              createdAt: {
                gte: timeRange.startDate,
                lte: timeRange.endDate,
              },
            },
          },
        },
      }),
      prisma.user.count({
        where: {
          messages: {
            some: {
              createdAt: {
                gte: timeRange.startDate,
                lte: timeRange.endDate,
              },
            },
          },
        },
      }),
      prisma.user.count({
        where: {
          eventsAttending: {
            some: {
              registeredAt: {
                gte: timeRange.startDate,
                lte: timeRange.endDate,
              },
            },
          },
        },
      }),
      prisma.user.count({
        where: {
          subscription: {
            status: 'ACTIVE',
          },
        },
      }),
    ]);

    const totalUsers = await this.getTotalUsers();

    return {
      swaps: { users: swapUsers, percentage: (swapUsers / totalUsers) * 100 },
      chat: { users: chatUsers, percentage: (chatUsers / totalUsers) * 100 },
      events: { users: eventUsers, percentage: (eventUsers / totalUsers) * 100 },
      subscriptions: { users: subscriptionUsers, percentage: (subscriptionUsers / totalUsers) * 100 },
    };
  }

  private async getUserJourneyAnalytics(timeRange: TimeRange) {
    // Placeholder - would track user journey stages
    return {
      registration: 100,
      profileCompletion: 75,
      firstSkillAdded: 60,
      firstMatch: 45,
      firstSwap: 30,
    };
  }

  private async getChurnAnalysis(timeRange: TimeRange) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const inactiveUsers = await prisma.user.count({
      where: {
        lastActive: {
          lt: thirtyDaysAgo,
        },
        status: 'ACTIVE',
      },
    });

    const totalUsers = await this.getTotalUsers();
    const churnRate = totalUsers > 0 ? (inactiveUsers / totalUsers) * 100 : 0;

    return {
      inactiveUsers,
      totalUsers,
      churnRate,
    };
  }

  private async getPreviousPeriodRevenue(timeRange: TimeRange): Promise<number> {
    const periodLength = timeRange.endDate.getTime() - timeRange.startDate.getTime();
    const previousStart = new Date(timeRange.startDate.getTime() - periodLength);
    const previousEnd = new Date(timeRange.startDate.getTime());

    const result = await prisma.payment.aggregate({
      where: {
        status: 'SUCCESS',
        createdAt: {
          gte: previousStart,
          lte: previousEnd,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  }

  private async getCohortAnalysis(timeRange: TimeRange) {
    // Simplified cohort analysis
    return [];
  }

  private async getRetentionRates(timeRange: TimeRange) {
    // Placeholder
    return {
      day1: 0,
      day7: 0,
      day30: 0,
      day90: 0,
    };
  }

  private async getChurnRiskUsers() {
    const twentyOneDaysAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);

    return await prisma.user.count({
      where: {
        lastActive: {
          lt: twentyOneDaysAgo,
        },
        status: 'ACTIVE',
      },
    });
  }

  private async getDailyActiveUsers(timeRange: TimeRange): Promise<number> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return await prisma.user.count({
      where: {
        lastActive: {
          gte: oneDayAgo,
        },
        status: 'ACTIVE',
      },
    });
  }

  private async getWeeklyActiveUsers(timeRange: TimeRange): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return await prisma.user.count({
      where: {
        lastActive: {
          gte: sevenDaysAgo,
        },
        status: 'ACTIVE',
      },
    });
  }

  private async getMonthlyActiveUsers(timeRange: TimeRange): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return await prisma.user.count({
      where: {
        lastActive: {
          gte: thirtyDaysAgo,
        },
        status: 'ACTIVE',
      },
    });
  }

  private async getAverageSessionsPerUser(timeRange: TimeRange): Promise<number> {
    // Placeholder
    return 5.2;
  }

  private async getAverageTimePerSession(timeRange: TimeRange): Promise<number> {
    // Placeholder
    return 25; // minutes
  }

  private async getFeatureAdoptionRates(timeRange: TimeRange) {
    // Placeholder
    return {};
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService();
