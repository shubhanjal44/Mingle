/**
 * Analytics Service
 * Platform metrics and statistics for admin dashboard
 */

import prisma from '../config/database';
import { Prisma } from '@prisma/client';

export interface DashboardMetrics {
  users: UserMetrics;
  subscriptions: SubscriptionMetrics;
  swaps: SwapMetrics;
  revenue: RevenueMetrics;
  platform: PlatformMetrics;
}

export interface UserMetrics {
  total: number;
  active: number;
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
  verified: number;
  suspended: number;
  banned: number;
  growthRate: number; // percentage
  retentionRate: number; // percentage
}

export interface SubscriptionMetrics {
  total: number;
  free: number;
  basic: number;
  pro: number;
  active: number;
  cancelled: number;
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  churnRate: number; // percentage
  conversionRate: number; // free to paid conversion
}

export interface SwapMetrics {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  completionRate: number; // percentage
  averageRating: number;
  totalHoursExchanged: number;
}

export interface RevenueMetrics {
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueByTier: {
    basic: number;
    pro: number;
  };
  averageRevenuePerUser: number;
  refunds: number;
}

export interface PlatformMetrics {
  activeSwaps: number;
  messagesSent: number;
  eventsCreated: number;
  reviewsGiven: number;
  skillsOffered: number;
  categoriesActive: number;
}

export interface UserGrowthData {
  date: string;
  count: number;
}

export interface RevenueGrowthData {
  date: string;
  revenue: number;
}

class AnalyticsService {
  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [users, subscriptions, swaps, revenue, platform] = await Promise.all([
      this.getUserMetrics(),
      this.getSubscriptionMetrics(),
      this.getSwapMetrics(),
      this.getRevenueMetrics(),
      this.getPlatformMetrics(),
    ]);

    return {
      users,
      subscriptions,
      swaps,
      revenue,
      platform,
    };
  }

  /**
   * Get user metrics
   */
  async getUserMetrics(): Promise<UserMetrics> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      total,
      active,
      newToday,
      newThisWeek,
      newThisMonth,
      newLastMonth,
      verified,
      suspended,
      banned,
      activeThisMonth,
      activeLastMonth,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.user.count({
        where: { createdAt: { gte: weekStart } },
      }),
      prisma.user.count({
        where: { createdAt: { gte: monthStart } },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: lastMonthStart,
            lt: monthStart,
          },
        },
      }),
      prisma.user.count({ where: { emailVerified: true } }),
      prisma.user.count({ where: { status: 'SUSPENDED' } }),
      prisma.user.count({ where: { status: 'BANNED' } }),
      prisma.user.count({
        where: {
          lastActive: { gte: monthStart },
          status: 'ACTIVE',
        },
      }),
      prisma.user.count({
        where: {
          lastActive: {
            gte: lastMonthStart,
            lt: monthStart,
          },
          status: 'ACTIVE',
        },
      }),
    ]);

    // Calculate growth rate
    const growthRate =
      newLastMonth > 0 ? ((newThisMonth - newLastMonth) / newLastMonth) * 100 : 0;

    // Calculate retention rate
    const retentionRate =
      activeLastMonth > 0 ? (activeThisMonth / activeLastMonth) * 100 : 100;

    return {
      total,
      active,
      newToday,
      newThisWeek,
      newThisMonth,
      verified,
      suspended,
      banned,
      growthRate: Math.round(growthRate * 10) / 10,
      retentionRate: Math.min(Math.round(retentionRate * 10) / 10, 100),
    };
  }

  /**
   * Get subscription metrics
   */
  async getSubscriptionMetrics(): Promise<SubscriptionMetrics> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      allSubscriptions,
      freeCount,
      basicCount,
      proCount,
      activeCount,
      cancelledCount,
      totalUsers,
      paidUsers,
      usersLastMonth,
      paidUsersLastMonth,
    ] = await Promise.all([
      prisma.userSubscription.count(),
      prisma.userSubscription.count({ where: { tier: 'FREE' } }),
      prisma.userSubscription.count({ where: { tier: 'BASIC' } }),
      prisma.userSubscription.count({ where: { tier: 'PRO' } }),
      prisma.userSubscription.count({ where: { status: 'ACTIVE' } }),
      prisma.userSubscription.count({ where: { status: 'CANCELLED' } }),
      prisma.user.count(),
      prisma.userSubscription.count({
        where: {
          tier: { in: ['BASIC', 'PRO'] },
          status: 'ACTIVE',
        },
      }),
      prisma.user.count({
        where: { createdAt: { lt: lastMonthStart } },
      }),
      prisma.userSubscription.count({
        where: {
          tier: { in: ['BASIC', 'PRO'] },
          status: 'ACTIVE',
          createdAt: { lt: lastMonthStart },
        },
      }),
    ]);

    // Calculate MRR (Monthly Recurring Revenue)
    const activeSubscriptions = await prisma.userSubscription.findMany({
      where: {
        status: 'ACTIVE',
        tier: { in: ['BASIC', 'PRO'] },
      },
      select: {
        tier: true,
        amount: true,
        billingCycle: true,
      },
    });

    let mrr = 0;
    for (const sub of activeSubscriptions) {
      if (sub.billingCycle === 'MONTHLY') {
        mrr += sub.amount;
      } else {
        // Yearly subscription, divide by 12 for MRR
        mrr += sub.amount / 12;
      }
    }

    const arr = mrr * 12;

    // Calculate churn rate (users who cancelled in last month)
    const cancelledLastMonth = await prisma.userSubscription.count({
      where: {
        status: 'CANCELLED',
        cancelledAt: {
          gte: lastMonthStart,
          lt: monthStart,
        },
      },
    });

    const churnRate =
      paidUsersLastMonth > 0
        ? (cancelledLastMonth / paidUsersLastMonth) * 100
        : 0;

    // Calculate conversion rate (free to paid)
    const conversionRate = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0;

    return {
      total: allSubscriptions,
      free: freeCount,
      basic: basicCount,
      pro: proCount,
      active: activeCount,
      cancelled: cancelledCount,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      churnRate: Math.round(churnRate * 10) / 10,
      conversionRate: Math.round(conversionRate * 10) / 10,
    };
  }

  /**
   * Get swap metrics
   */
  async getSwapMetrics(): Promise<SwapMetrics> {
    const [total, active, completed, cancelled, reviews] = await Promise.all([
      prisma.swap.count(),
      prisma.swap.count({
        where: { status: { in: ['PENDING', 'ACCEPTED'] } },
      }),
      prisma.swap.count({ where: { status: 'COMPLETED' } }),
      prisma.swap.count({ where: { status: 'CANCELLED' } }),
      prisma.review.aggregate({
        _avg: { rating: true },
      }),
    ]);

    // Calculate completion rate
    const completionRate =
      total > 0 ? (completed / (completed + cancelled)) * 100 : 0;

    // Calculate total hours exchanged
    const hourStats = await prisma.user.aggregate({
      _sum: {
        totalHoursTaught: true,
      },
    });

    const totalHoursExchanged = hourStats._sum.totalHoursTaught || 0;

    return {
      total,
      active,
      completed,
      cancelled,
      completionRate: Math.round(completionRate * 10) / 10,
      averageRating: Math.round((reviews._avg.rating || 0) * 10) / 10,
      totalHoursExchanged: Math.round(totalHoursExchanged * 10) / 10,
    };
  }

  /**
   * Get revenue metrics
   */
  async getRevenueMetrics(): Promise<RevenueMetrics> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [totalPayments, thisMonthPayments, lastMonthPayments, refunds] =
      await Promise.all([
        prisma.payment.aggregate({
          where: { status: 'SUCCESS' },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: {
            status: 'SUCCESS',
            paidAt: { gte: monthStart },
          },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: {
            status: 'SUCCESS',
            paidAt: {
              gte: lastMonthStart,
              lt: monthStart,
            },
          },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: { status: 'REFUNDED' },
          _sum: { amount: true },
        }),
      ]);

    // Revenue by tier
    const [basicRevenue, proRevenue] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          status: 'SUCCESS',
          subscriptionTier: 'BASIC',
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          status: 'SUCCESS',
          subscriptionTier: 'PRO',
        },
        _sum: { amount: true },
      }),
    ]);

    const totalRevenue = totalPayments._sum.amount || 0;
    const revenueThisMonth = thisMonthPayments._sum.amount || 0;
    const revenueLastMonth = lastMonthPayments._sum.amount || 0;
    const totalRefunds = refunds._sum.amount || 0;

    // Calculate ARPU (Average Revenue Per User)
    const paidUsers = await prisma.userSubscription.count({
      where: {
        tier: { in: ['BASIC', 'PRO'] },
        status: 'ACTIVE',
      },
    });

    const averageRevenuePerUser = paidUsers > 0 ? totalRevenue / paidUsers : 0;

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
      revenueLastMonth: Math.round(revenueLastMonth * 100) / 100,
      revenueByTier: {
        basic: Math.round((basicRevenue._sum.amount || 0) * 100) / 100,
        pro: Math.round((proRevenue._sum.amount || 0) * 100) / 100,
      },
      averageRevenuePerUser: Math.round(averageRevenuePerUser * 100) / 100,
      refunds: Math.round(totalRefunds * 100) / 100,
    };
  }

  /**
   * Get platform activity metrics
   */
  async getPlatformMetrics(): Promise<PlatformMetrics> {
    const [
      activeSwaps,
      messagesSent,
      eventsCreated,
      reviewsGiven,
      skillsOffered,
      categoriesActive,
    ] = await Promise.all([
      prisma.swap.count({
        where: { status: { in: ['PENDING', 'ACCEPTED'] } },
      }),
      prisma.message.count(),
      prisma.event.count(),
      prisma.review.count(),
      prisma.userSkill.count({ where: { skillType: 'TEACH' } }),
      prisma.skillCategory.count({ where: { isActive: true } }),
    ]);

    return {
      activeSwaps,
      messagesSent,
      eventsCreated,
      reviewsGiven,
      skillsOffered,
      categoriesActive,
    };
  }

  /**
   * Get user growth data for charts
   */
  async getUserGrowthData(days: number = 30): Promise<UserGrowthData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get users grouped by day
    const users = await prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    // Create a map for easy lookup
    const userMap = new Map<string, number>();
    for (const user of users) {
      const date = user.createdAt.toISOString().split('T')[0];
      userMap.set(date, (userMap.get(date) || 0) + user._count);
    }

    // Generate data for all days
    const data: UserGrowthData[] = [];
    let cumulativeCount = await prisma.user.count({
      where: { createdAt: { lt: startDate } },
    });

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dailyCount = userMap.get(dateStr) || 0;
      cumulativeCount += dailyCount;

      data.push({
        date: dateStr,
        count: cumulativeCount,
      });
    }

    return data;
  }

  /**
   * Get revenue growth data for charts
   */
  async getRevenueGrowthData(months: number = 12): Promise<RevenueGrowthData[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);

    const data: RevenueGrowthData[] = [];

    for (let i = 0; i < months; i++) {
      const monthStart = new Date(startDate);
      monthStart.setMonth(monthStart.getMonth() + i);

      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const revenue = await prisma.payment.aggregate({
        where: {
          status: 'SUCCESS',
          paidAt: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
        _sum: { amount: true },
      });

      data.push({
        date: monthStart.toISOString().split('T')[0].slice(0, 7), // YYYY-MM
        revenue: Math.round((revenue._sum.amount || 0) * 100) / 100,
      });
    }

    return data;
  }

  /**
   * Get top performing users
   */
  async getTopUsers(limit: number = 10) {
    return await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: {
        userId: true,
        name: true,
        email: true,
        avatar: true,
        rating: true,
        completedSwaps: true,
        totalHoursTaught: true,
        totalHoursLearned: true,
        level: true,
        coins: true,
      },
      orderBy: { rating: 'desc' },
      take: limit,
    });
  }

  /**
   * Get recent activities for admin dashboard
   */
  async getRecentActivities(limit: number = 20) {
    const [recentUsers, recentSwaps, recentPayments, recentReports] =
      await Promise.all([
        prisma.user.findMany({
          select: {
            userId: true,
            name: true,
            email: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.swap.findMany({
          select: {
            swapId: true,
            initiator: {
              select: { name: true },
            },
            receiver: {
              select: { name: true },
            },
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.payment.findMany({
          select: {
            paymentId: true,
            user: {
              select: { name: true },
            },
            amount: true,
            status: true,
            subscriptionTier: true,
            paidAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.report.findMany({
          select: {
            reportId: true,
            reporter: {
              select: { name: true },
            },
            type: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

    return {
      recentUsers,
      recentSwaps,
      recentPayments,
      recentReports,
    };
  }
}

export const analyticsService = new AnalyticsService();
