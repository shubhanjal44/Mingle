/**
 * Moderation Service Unit Tests
 */

import { moderationService } from '../../src/services/moderation.service';
import prisma from '../../src/config/database';

describe('Moderation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReport', () => {
    it('should create user report', async () => {
      const mockReport = {
        reportId: 'report-1',
        reporterId: 'reporter-1',
        reportedUserId: 'reported-1',
        type: 'USER',
        status: 'PENDING',
        reason: 'Inappropriate behavior',
        description: 'User was harassing others',
      };

      (prisma.report.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.report.create as jest.Mock).mockResolvedValueOnce(mockReport);

      const result = await moderationService.createReport({
        reporterId: 'reporter-1',
        reportedUserId: 'reported-1',
        type: 'USER',
        reason: 'Inappropriate behavior',
        description: 'User was harassing others',
      });

      expect(result).toEqual(mockReport);
    });

    it('should create content report', async () => {
      const mockReport = {
        reportId: 'report-2',
        reporterId: 'reporter-1',
        type: 'REVIEW',
        status: 'PENDING',
        reason: 'Spam',
      };

      (prisma.report.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.report.create as jest.Mock).mockResolvedValueOnce(mockReport);

      const result = await moderationService.createReport({
        reporterId: 'reporter-1',
        type: 'REVIEW',
        reason: 'Spam',
        evidence: ['screenshot1.jpg', 'screenshot2.jpg'],
      });

      expect(result).toEqual(mockReport);
    });

    it('should handle duplicate reports', async () => {
      (prisma.report.findFirst as jest.Mock).mockResolvedValueOnce({
        reportId: 'existing-report',
      });

      await expect(
        moderationService.createReport({
          reporterId: 'reporter-1',
          reportedUserId: 'reported-1',
          type: 'USER',
          reason: 'Spam',
        })
      ).rejects.toThrow('already reported');
    });
  });

  describe('getReports', () => {
    it('should return all reports', async () => {
      const mockReports = [
        {
          reportId: '1',
          type: 'USER',
          status: 'PENDING',
          reason: 'Spam',
          reporter: {
            userId: 'reporter-1',
            name: 'Reporter',
            email: 'reporter@example.com',
          },
        },
      ];

      (prisma.report.count as jest.Mock).mockResolvedValueOnce(1);
      (prisma.report.findMany as jest.Mock).mockResolvedValueOnce(mockReports);

      const result = await moderationService.getReports({
        limit: 20,
        offset: 0,
      });

      expect(result.reports).toEqual(mockReports);
      expect(result.total).toBe(1);
    });

    it('should filter reports by status', async () => {
      (prisma.report.count as jest.Mock).mockResolvedValueOnce(5);
      (prisma.report.findMany as jest.Mock).mockResolvedValueOnce([]);

      await moderationService.getReports({
        status: 'PENDING',
        limit: 20,
        offset: 0,
      });

      expect(prisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
          }),
        })
      );
    });
  });

  describe('getReport', () => {
    it('should return detailed report information', async () => {
      const mockReport = {
        reportId: '1',
        reporter: {
          userId: 'reporter-1',
          name: 'Reporter',
        },
        reportedUser: {
          userId: 'reported-1',
          name: 'Reported User',
          status: 'ACTIVE',
        },
        type: 'USER',
        status: 'PENDING',
        reason: 'Spam',
        createdAt: new Date(),
      };

      (prisma.report.findUnique as jest.Mock).mockResolvedValueOnce(mockReport);

      const result = await moderationService.getReport('1');

      expect(result).toEqual(mockReport);
    });

    it('should throw error if report not found', async () => {
      (prisma.report.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(moderationService.getReport('999')).rejects.toThrow(
        'Report not found'
      );
    });
  });

  describe('updateReportStatus', () => {
    it('should update report to resolved', async () => {
      const mockReport = {
        reportId: '1',
        status: 'RESOLVED',
        resolution: 'Action taken',
        resolvedAt: new Date(),
      };

      (prisma.report.update as jest.Mock).mockResolvedValueOnce(mockReport);

      const result = await moderationService.updateReportStatus(
        '1',
        'RESOLVED',
        'moderator-1',
        'Action taken'
      );

      expect(result).toEqual(mockReport);
    });

    it('should update report to dismissed', async () => {
      (prisma.report.update as jest.Mock).mockResolvedValueOnce({
        status: 'DISMISSED',
      });

      await moderationService.updateReportStatus(
        '1',
        'DISMISSED',
        'moderator-1',
        'No violation found'
      );

      expect(prisma.report.update).toHaveBeenCalled();
    });
  });

  describe('executeModeratorAction', () => {
    it('should ban user', async () => {
      const mockAction = {
        actionId: 'action-1',
        actionType: 'BAN_USER',
        targetUserId: 'user-1',
        reason: 'Repeated violations',
      };

      (prisma.user.update as jest.Mock).mockResolvedValueOnce({
        userId: 'user-1',
        status: 'BANNED',
      });
      (prisma.moderatorAction.create as jest.Mock).mockResolvedValueOnce(
        mockAction
      );
      (prisma.auditLog.create as jest.Mock).mockResolvedValueOnce({});

      const result = await moderationService.executeModeratorAction({
        moderatorId: 'moderator-1',
        actionType: 'BAN_USER',
        targetUserId: 'user-1',
        reason: 'Repeated violations',
      });

      expect(result).toEqual(mockAction);
    });

    it('should suspend user with duration', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValueOnce({
        status: 'SUSPENDED',
      });
      (prisma.moderatorAction.create as jest.Mock).mockResolvedValueOnce({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValueOnce({});

      await moderationService.executeModeratorAction({
        moderatorId: 'moderator-1',
        actionType: 'SUSPEND_USER',
        targetUserId: 'user-1',
        reason: 'Inappropriate behavior',
        duration: 7,
      });

      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should warn user', async () => {
      (prisma.moderatorAction.create as jest.Mock).mockResolvedValueOnce({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValueOnce({});

      await moderationService.executeModeratorAction({
        moderatorId: 'moderator-1',
        actionType: 'WARN_USER',
        targetUserId: 'user-1',
        reason: 'Minor violation',
      });

      expect(prisma.moderatorAction.create).toHaveBeenCalled();
    });

    it('should delete content', async () => {
      (prisma.review.update as jest.Mock).mockResolvedValueOnce({
        isDeleted: true,
      });
      (prisma.moderatorAction.create as jest.Mock).mockResolvedValueOnce({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValueOnce({});

      await moderationService.executeModeratorAction({
        moderatorId: 'moderator-1',
        actionType: 'DELETE_CONTENT',
        targetContentId: 'review-1',
        targetContentType: 'REVIEW',
        reason: 'Spam content',
      });

      expect(prisma.review.update).toHaveBeenCalled();
    });

    it('should verify user', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValueOnce({});
      (prisma.moderatorAction.create as jest.Mock).mockResolvedValueOnce({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValueOnce({});

      await moderationService.executeModeratorAction({
        moderatorId: 'moderator-1',
        actionType: 'VERIFY_USER',
        targetUserId: 'user-1',
        reason: 'Identity verified',
      });

      expect(prisma.moderatorAction.create).toHaveBeenCalled();
    });

    it('should link action to report', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValueOnce({});
      (prisma.moderatorAction.create as jest.Mock).mockResolvedValueOnce({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValueOnce({});

      await moderationService.executeModeratorAction({
        moderatorId: 'moderator-1',
        actionType: 'BAN_USER',
        targetUserId: 'user-1',
        reason: 'From report',
        reportId: 'report-123',
      });

      expect(prisma.moderatorAction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reportId: 'report-123',
        }),
      });
    });
  });

  describe('getModerationStats', () => {
    it('should return moderation statistics', async () => {
      (prisma.report.count as jest.Mock)
        .mockResolvedValueOnce(100) // totalReports
        .mockResolvedValueOnce(25) // pending
        .mockResolvedValueOnce(50) // resolved
        .mockResolvedValueOnce(10); // dismissed

      (prisma.moderatorAction.count as jest.Mock).mockResolvedValueOnce(75); // total

      (prisma.user.count as jest.Mock)
        .mockResolvedValueOnce(20) // banned
        .mockResolvedValueOnce(30); // suspended

      (prisma.report.groupBy as jest.Mock).mockResolvedValueOnce([
        { type: 'USER', _count: 50 },
        { type: 'SPAM', _count: 30 },
      ]);

      (prisma.moderatorAction.groupBy as jest.Mock).mockResolvedValueOnce([
        { actionType: 'BAN_USER', _count: 20 },
        { actionType: 'WARN_USER', _count: 35 },
      ]);

      const stats = await moderationService.getModerationStats();

      expect(stats.totalReports).toBe(100);
      expect(stats.pendingReports).toBe(25);
      expect(stats.totalActions).toBe(75);
      expect(stats.bannedUsers).toBe(20);
      expect(stats.suspendedUsers).toBe(30);
    });
  });

  describe('getModeratorActivity', () => {
    it('should return moderator activity logs', async () => {
      const mockActions = [
        {
          actionId: '1',
          moderatorId: 'mod-1',
          actionType: 'BAN_USER',
          targetUserId: 'user-1',
          reason: 'Spam',
          createdAt: new Date(),
          moderator: {
            name: 'Moderator 1',
          },
        },
      ];

      (prisma.moderatorAction.findMany as jest.Mock).mockResolvedValueOnce(
        mockActions
      );

      const result = await moderationService.getModeratorActivity('mod-1', 20);

      expect(result).toEqual(mockActions);
    });
  });
});
