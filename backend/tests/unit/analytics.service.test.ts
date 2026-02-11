/**
 * Analytics Service Unit Tests
 */

import { analyticsService } from '../../src/services/analytics.service';
import prisma from '../../src/config/database';

describe('Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserMetrics', () => {
    it('should return correct user metrics', async () => {
      // Mock Prisma responses
      (prisma.user.count as jest.Mock)
        .mockResolvedValueOnce(1000) // total
        .mockResolvedValueOnce(850) // active
        .mockResolvedValueOnce(25) // newToday
        .mockResolvedValueOnce(150) // newThisWeek
        .mockResolvedValueOnce(300) // newThisMonth
        .mockResolvedValueOnce(250) // newLastMonth
        .mockResolvedValueOnce(900) // verified
        .mockResolvedValueOnce(50) // suspended
        .mockResolvedValueOnce(20) // banned
        .mockResolvedValueOnce(700) // activeThisMonth
        .mockResolvedValueOnce(680); // activeLastMonth

      const metrics = await analyticsService.getUserMetrics();

      expect(metrics).toEqual({
        total: 1000,
        active: 850,
        newToday: 25,
        newThisWeek: 150,
        newThisMonth: 300,
        verified: 900,
        suspended: 50,
        banned: 20,
        growthRate: 20.0, // (300-250)/250 * 100
        retentionRate: 100, // capped at 100
      });

      expect(prisma.user.count).toHaveBeenCalledTimes(11);
    });

    it('should handle zero growth correctly', async () => {
      (prisma.user.count as jest.Mock)
        .mockResolvedValueOnce(1000) // total
        .mockResolvedValueOnce(850) // active
        .mockResolvedValueOnce(0) // newToday
        .mockResolvedValueOnce(0) // newThisWeek
        .mockResolvedValueOnce(0) // newThisMonth
        .mockResolvedValueOnce(0) // newLastMonth
        .mockResolvedValueOnce(900) // verified
        .mockResolvedValueOnce(0) // suspended
        .mockResolvedValueOnce(0) // banned
        .mockResolvedValueOnce(850) // activeThisMonth
        .mockResolvedValueOnce(850); // activeLastMonth

      const metrics = await analyticsService.getUserMetrics();

      expect(metrics.growthRate).toBe(0);
      expect(metrics.retentionRate).toBe(100.0);
    });
  });

  describe('getSubscriptionMetrics', () => {
    it('should calculate MRR and ARR correctly', async () => {
      const mockSubscriptions = [
        { tier: 'BASIC', amount: 299, billingCycle: 'MONTHLY' },
        { tier: 'PRO', amount: 599, billingCycle: 'MONTHLY' },
        { tier: 'PRO', amount: 5999, billingCycle: 'YEARLY' }, // 5999/12 = 499.92
      ];

      // Mock the count calls in order they appear in Promise.all
      const userSubCountMock = jest.fn()
        .mockResolvedValueOnce(1000) // allSubscriptions
        .mockResolvedValueOnce(700) // free
        .mockResolvedValueOnce(200) // basic
        .mockResolvedValueOnce(100) // pro
        .mockResolvedValueOnce(950) // active
        .mockResolvedValueOnce(50) // cancelled
        .mockResolvedValueOnce(300) // paidUsers
        .mockResolvedValueOnce(280) // paidUsersLastMonth
        .mockResolvedValueOnce(14); // cancelledLastMonth

      const userCountMock = jest.fn()
        .mockResolvedValueOnce(1000) // totalUsers
        .mockResolvedValueOnce(900); // usersLastMonth

      (prisma.userSubscription.count as jest.Mock) = userSubCountMock;
      (prisma.user.count as jest.Mock) = userCountMock;
      (prisma.userSubscription.findMany as jest.Mock).mockResolvedValueOnce(mockSubscriptions);

      const metrics = await analyticsService.getSubscriptionMetrics();

      expect(metrics.total).toBe(1000);
      expect(metrics.free).toBe(700);
      expect(metrics.basic).toBe(200);
      expect(metrics.pro).toBe(100);
      // MRR = 299 + 599 + (5999/12) = 1397.92
      expect(metrics.mrr).toBeCloseTo(1397.92, 1);
      // ARR = MRR * 12
      expect(metrics.arr).toBeCloseTo(16775.04, 1);
      // Churn rate = 14/280 * 100 = 5%
      expect(metrics.churnRate).toBe(5.0);
      // Conversion rate = 300/1000 * 100 = 30%
      expect(metrics.conversionRate).toBe(30.0);
    });
  });

  describe('getSwapMetrics', () => {
    it('should return swap statistics', async () => {
      (prisma.swap.count as jest.Mock)
        .mockResolvedValueOnce(500) // total
        .mockResolvedValueOnce(50) // active
        .mockResolvedValueOnce(400) // completed
        .mockResolvedValueOnce(50); // cancelled

      (prisma.review.aggregate as jest.Mock).mockResolvedValueOnce({
        _avg: { rating: 4.5 },
      });

      (prisma.user.aggregate as jest.Mock).mockResolvedValueOnce({
        _sum: { totalHoursTaught: 1234.56 },
      });

      const metrics = await analyticsService.getSwapMetrics();

      expect(metrics.total).toBe(500);
      expect(metrics.active).toBe(50);
      expect(metrics.completed).toBe(400);
      expect(metrics.cancelled).toBe(50);
      // Completion rate = 400/(400+50) * 100 = 88.89%
      expect(metrics.completionRate).toBeCloseTo(88.9, 1);
      expect(metrics.averageRating).toBe(4.5);
      expect(metrics.totalHoursExchanged).toBeCloseTo(1234.6, 1);
    });

    it('should handle zero swaps correctly', async () => {
      (prisma.swap.count as jest.Mock)
        .mockResolvedValueOnce(0) // total
        .mockResolvedValueOnce(0) // active
        .mockResolvedValueOnce(0) // completed
        .mockResolvedValueOnce(0); // cancelled

      (prisma.review.aggregate as jest.Mock).mockResolvedValueOnce({
        _avg: { rating: 0 },
      });

      (prisma.user.aggregate as jest.Mock).mockResolvedValueOnce({
        _sum: { totalHoursTaught: 0 },
      });

      const metrics = await analyticsService.getSwapMetrics();

      expect(metrics.total).toBe(0);
      expect(metrics.completionRate).toBe(0);
      expect(metrics.averageRating).toBe(0);
    });
  });

  describe('getRevenueMetrics', () => {
    it('should calculate revenue correctly', async () => {
      (prisma.payment.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { amount: 100000 } }) // totalPayments
        .mockResolvedValueOnce({ _sum: { amount: 15000 } }) // thisMonthPayments
        .mockResolvedValueOnce({ _sum: { amount: 12000 } }) // lastMonthPayments
        .mockResolvedValueOnce({ _sum: { amount: 2000 } }) // refunds
        .mockResolvedValueOnce({ _sum: { amount: 40000 } }) // basicRevenue
        .mockResolvedValueOnce({ _sum: { amount: 60000 } }); // proRevenue

      (prisma.userSubscription.count as jest.Mock).mockResolvedValueOnce(300); // paidUsers

      const metrics = await analyticsService.getRevenueMetrics();

      expect(metrics.totalRevenue).toBe(100000);
      expect(metrics.revenueThisMonth).toBe(15000);
      expect(metrics.revenueLastMonth).toBe(12000);
      expect(metrics.revenueByTier.basic).toBe(40000);
      expect(metrics.revenueByTier.pro).toBe(60000);
      expect(metrics.averageRevenuePerUser).toBeCloseTo(333.33, 1);
      expect(metrics.refunds).toBe(2000);
    });

    it('should handle zero revenue correctly', async () => {
      (prisma.payment.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { amount: null } }) // totalPayments
        .mockResolvedValueOnce({ _sum: { amount: null } }) // thisMonth
        .mockResolvedValueOnce({ _sum: { amount: null } }) // lastMonth
        .mockResolvedValueOnce({ _sum: { amount: null } }) // refunds
        .mockResolvedValueOnce({ _sum: { amount: null } }) // basic
        .mockResolvedValueOnce({ _sum: { amount: null } }); // pro

      (prisma.userSubscription.count as jest.Mock).mockResolvedValueOnce(0);

      const metrics = await analyticsService.getRevenueMetrics();

      expect(metrics.totalRevenue).toBe(0);
      expect(metrics.revenueThisMonth).toBe(0);
      expect(metrics.averageRevenuePerUser).toBe(0);
    });
  });

  describe('getPlatformMetrics', () => {
    it('should return platform activity metrics', async () => {
      (prisma.swap.count as jest.Mock).mockResolvedValueOnce(50);
      (prisma.message.count as jest.Mock).mockResolvedValueOnce(10000);
      (prisma.event.count as jest.Mock).mockResolvedValueOnce(25);
      (prisma.review.count as jest.Mock).mockResolvedValueOnce(800);
      (prisma.userSkill.count as jest.Mock).mockResolvedValueOnce(500);
      (prisma.skillCategory.count as jest.Mock).mockResolvedValueOnce(9);

      const metrics = await analyticsService.getPlatformMetrics();

      expect(metrics).toEqual({
        activeSwaps: 50,
        messagesSent: 10000,
        eventsCreated: 25,
        reviewsGiven: 800,
        skillsOffered: 500,
        categoriesActive: 9,
      });
    });
  });

  describe('getDashboardMetrics', () => {
    it('should return comprehensive dashboard metrics', async () => {
      // Mock all the sub-methods
      const mockUserMetrics = {
        total: 1000,
        active: 850,
        newToday: 25,
        newThisWeek: 150,
        newThisMonth: 300,
        verified: 900,
        suspended: 50,
        banned: 20,
        growthRate: 20.0,
        retentionRate: 95.0,
      };

      const mockSubscriptionMetrics = {
        total: 1000,
        free: 700,
        basic: 200,
        pro: 100,
        active: 950,
        cancelled: 50,
        mrr: 1500,
        arr: 18000,
        churnRate: 5.0,
        conversionRate: 30.0,
      };

      const mockSwapMetrics = {
        total: 500,
        active: 50,
        completed: 400,
        cancelled: 50,
        completionRate: 88.9,
        averageRating: 4.5,
        totalHoursExchanged: 1234.5,
      };

      const mockRevenueMetrics = {
        totalRevenue: 100000,
        revenueThisMonth: 15000,
        revenueLastMonth: 12000,
        revenueByTier: { basic: 40000, pro: 60000 },
        averageRevenuePerUser: 333.33,
        refunds: 2000,
      };

      const mockPlatformMetrics = {
        activeSwaps: 50,
        messagesSent: 10000,
        eventsCreated: 25,
        reviewsGiven: 800,
        skillsOffered: 500,
        categoriesActive: 9,
      };

      jest.spyOn(analyticsService, 'getUserMetrics').mockResolvedValueOnce(mockUserMetrics);
      jest.spyOn(analyticsService, 'getSubscriptionMetrics').mockResolvedValueOnce(mockSubscriptionMetrics);
      jest.spyOn(analyticsService, 'getSwapMetrics').mockResolvedValueOnce(mockSwapMetrics);
      jest.spyOn(analyticsService, 'getRevenueMetrics').mockResolvedValueOnce(mockRevenueMetrics);
      jest.spyOn(analyticsService, 'getPlatformMetrics').mockResolvedValueOnce(mockPlatformMetrics);

      const metrics = await analyticsService.getDashboardMetrics();

      expect(metrics).toEqual({
        users: mockUserMetrics,
        subscriptions: mockSubscriptionMetrics,
        swaps: mockSwapMetrics,
        revenue: mockRevenueMetrics,
        platform: mockPlatformMetrics,
      });
    });
  });

  describe('getTopUsers', () => {
    it('should return top users sorted by rating', async () => {
      const mockUsers = [
        { userId: '1', name: 'User 1', rating: 5.0, completedSwaps: 50 },
        { userId: '2', name: 'User 2', rating: 4.8, completedSwaps: 40 },
        { userId: '3', name: 'User 3', rating: 4.6, completedSwaps: 30 },
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce(mockUsers);

      const users = await analyticsService.getTopUsers(3);

      expect(users).toEqual(mockUsers);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        select: expect.any(Object),
        orderBy: { rating: 'desc' },
        take: 3,
      });
    });
  });
});
