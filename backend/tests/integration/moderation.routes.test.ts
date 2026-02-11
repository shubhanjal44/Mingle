/**
 * Moderation Routes Integration Tests
 */

import request from 'supertest';
import app from '../../src/server';
import prisma from '../../src/config/database';
import jwt from 'jsonwebtoken';

describe('Moderation Routes', () => {
  let adminToken: string;
  let moderatorToken: string;
  let userToken: string;

  beforeAll(() => {
    adminToken = jwt.sign(
      { userId: 'admin-1', role: 'ADMIN' },
      process.env.JWT_SECRET!
    );
    moderatorToken = jwt.sign(
      { userId: 'moderator-1', role: 'MODERATOR' },
      process.env.JWT_SECRET!
    );
    userToken = jwt.sign(
      { userId: 'user-1', role: 'USER' },
      process.env.JWT_SECRET!
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/moderation/reports', () => {
    it('should create user report', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'user-1',
        role: 'USER',
        status: 'ACTIVE',
      });

      const mockReport = {
        reportId: 'report-1',
        reporterId: 'user-1',
        reportedUserId: 'user-2',
        type: 'USER',
        status: 'PENDING',
        reason: 'Spam',
        description: 'User is spamming',
      };

      (prisma.report.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.report.create as jest.Mock).mockResolvedValueOnce(mockReport);

      const response = await request(app)
        .post('/api/v1/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reportedUserId: 'user-2',
          type: 'USER',
          reason: 'Spam',
          description: 'User is spamming',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reportId).toBe('report-1');
    });

    it('should prevent duplicate reports', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'user-1',
        role: 'USER',
        status: 'ACTIVE',
      });

      (prisma.report.findFirst as jest.Mock).mockResolvedValueOnce({
        reportId: 'existing-report',
      });

      await request(app)
        .post('/api/v1/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reportedUserId: 'user-2',
          type: 'USER',
          reason: 'Spam',
        })
        .expect(400);
    });

    it('should validate report data', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'user-1',
        role: 'USER',
        status: 'ACTIVE',
      });

      await request(app)
        .post('/api/v1/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'INVALID_TYPE',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/moderation/reports', () => {
    it('should return all reports for moderators', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'moderator-1',
        role: 'MODERATOR',
        status: 'ACTIVE',
      });

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

      const response = await request(app)
        .get('/api/v1/moderation/reports')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reports).toEqual(mockReports);
    });

    it('should filter reports by status', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'moderator-1',
        role: 'MODERATOR',
        status: 'ACTIVE',
      });

      (prisma.report.count as jest.Mock).mockResolvedValueOnce(5);
      (prisma.report.findMany as jest.Mock).mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/v1/moderation/reports')
        .query({ status: 'PENDING' })
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(200);

      expect(prisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
          }),
        })
      );
    });

    it('should deny access for regular users', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'user-1',
        role: 'USER',
        status: 'ACTIVE',
      });

      await request(app)
        .get('/api/v1/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/moderation/reports/:reportId', () => {
    it('should return report details', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'moderator-1',
        role: 'MODERATOR',
        status: 'ACTIVE',
      });

      const mockReport = {
        reportId: 'report-1',
        reporter: {
          userId: 'reporter-1',
          name: 'Reporter',
        },
        reportedUser: {
          userId: 'reported-1',
          name: 'Reported User',
        },
        type: 'USER',
        status: 'PENDING',
      };

      (prisma.report.findUnique as jest.Mock).mockResolvedValueOnce(mockReport);

      const response = await request(app)
        .get('/api/v1/moderation/reports/report-1')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reportId).toBe('report-1');
    });

    it('should return 404 for non-existent report', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'moderator-1',
        role: 'MODERATOR',
        status: 'ACTIVE',
      });

      (prisma.report.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await request(app)
        .get('/api/v1/moderation/reports/non-existent')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/v1/moderation/reports/:reportId/status', () => {
    it('should update report status to resolved', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'moderator-1',
        role: 'MODERATOR',
        status: 'ACTIVE',
      });

      const updatedReport = {
        reportId: 'report-1',
        status: 'RESOLVED',
        resolution: 'Action taken',
        resolvedAt: new Date(),
      };

      (prisma.report.update as jest.Mock).mockResolvedValueOnce(updatedReport);

      const response = await request(app)
        .put('/api/v1/moderation/reports/report-1/status')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          status: 'RESOLVED',
          resolution: 'Action taken',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('RESOLVED');
    });

    it('should validate status value', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'moderator-1',
        role: 'MODERATOR',
        status: 'ACTIVE',
      });

      await request(app)
        .put('/api/v1/moderation/reports/report-1/status')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          status: 'INVALID_STATUS',
        })
        .expect(400);
    });
  });

  describe('POST /api/v1/moderation/actions', () => {
    it('should ban user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'moderator-1',
        role: 'MODERATOR',
        status: 'ACTIVE',
      });

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

      const response = await request(app)
        .post('/api/v1/moderation/actions')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          actionType: 'BAN_USER',
          targetUserId: 'user-1',
          reason: 'Repeated violations',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.actionType).toBe('BAN_USER');
    });

    it('should suspend user with duration', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'moderator-1',
        role: 'MODERATOR',
        status: 'ACTIVE',
      });

      (prisma.user.update as jest.Mock).mockResolvedValueOnce({
        status: 'SUSPENDED',
      });
      (prisma.moderatorAction.create as jest.Mock).mockResolvedValueOnce({
        actionType: 'SUSPEND_USER',
      });
      (prisma.auditLog.create as jest.Mock).mockResolvedValueOnce({});

      const response = await request(app)
        .post('/api/v1/moderation/actions')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          actionType: 'SUSPEND_USER',
          targetUserId: 'user-1',
          reason: 'Violation',
          duration: 7,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should warn user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'moderator-1',
        role: 'MODERATOR',
        status: 'ACTIVE',
      });

      (prisma.moderatorAction.create as jest.Mock).mockResolvedValueOnce({
        actionType: 'WARN_USER',
      });
      (prisma.auditLog.create as jest.Mock).mockResolvedValueOnce({});

      const response = await request(app)
        .post('/api/v1/moderation/actions')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          actionType: 'WARN_USER',
          targetUserId: 'user-1',
          reason: 'Minor violation',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should delete content', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'moderator-1',
        role: 'MODERATOR',
        status: 'ACTIVE',
      });

      (prisma.review.update as jest.Mock).mockResolvedValueOnce({
        isDeleted: true,
      });
      (prisma.moderatorAction.create as jest.Mock).mockResolvedValueOnce({
        actionType: 'DELETE_CONTENT',
      });
      (prisma.auditLog.create as jest.Mock).mockResolvedValueOnce({});

      const response = await request(app)
        .post('/api/v1/moderation/actions')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          actionType: 'DELETE_CONTENT',
          targetContentId: 'review-1',
          targetContentType: 'REVIEW',
          reason: 'Spam',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require action reason', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'moderator-1',
        role: 'MODERATOR',
        status: 'ACTIVE',
      });

      await request(app)
        .post('/api/v1/moderation/actions')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          actionType: 'BAN_USER',
          targetUserId: 'user-1',
        })
        .expect(400);
    });

    it('should deny access for regular users', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'user-1',
        role: 'USER',
        status: 'ACTIVE',
      });

      await request(app)
        .post('/api/v1/moderation/actions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          actionType: 'BAN_USER',
          targetUserId: 'user-2',
          reason: 'Test',
        })
        .expect(403);
    });
  });

  describe('GET /api/v1/moderation/stats', () => {
    it('should return moderation statistics', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'moderator-1',
        role: 'MODERATOR',
        status: 'ACTIVE',
      });

      (prisma.report.count as jest.Mock)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(10);

      (prisma.moderatorAction.count as jest.Mock)
        .mockResolvedValueOnce(75)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(25);

      (prisma.user.count as jest.Mock)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(30);

      const response = await request(app)
        .get('/api/v1/moderation/stats')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reports).toBeDefined();
      expect(response.body.data.actions).toBeDefined();
      expect(response.body.data.users).toBeDefined();
    });
  });

  describe('GET /api/v1/moderation/activity', () => {
    it('should return moderator activity', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'moderator-1',
        role: 'MODERATOR',
        status: 'ACTIVE',
      });

      const mockActions = [
        {
          actionId: '1',
          moderatorId: 'moderator-1',
          actionType: 'BAN_USER',
          targetUserId: 'user-1',
          reason: 'Spam',
          createdAt: new Date(),
        },
      ];

      (prisma.moderatorAction.count as jest.Mock).mockResolvedValueOnce(1);
      (prisma.moderatorAction.findMany as jest.Mock).mockResolvedValueOnce(
        mockActions
      );

      const response = await request(app)
        .get('/api/v1/moderation/activity')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.actions).toEqual(mockActions);
    });

    it('should filter by moderator', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'admin-1',
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      (prisma.moderatorAction.count as jest.Mock).mockResolvedValueOnce(5);
      (prisma.moderatorAction.findMany as jest.Mock).mockResolvedValueOnce([]);

      await request(app)
        .get('/api/v1/moderation/activity')
        .query({ moderatorId: 'moderator-1' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(prisma.moderatorAction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            moderatorId: 'moderator-1',
          }),
        })
      );
    });
  });

  describe('GET /api/v1/moderation/users/:userId/reports', () => {
    it('should return reports about a user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'moderator-1',
        role: 'MODERATOR',
        status: 'ACTIVE',
      });

      const mockReports = [
        {
          reportId: '1',
          reportedUserId: 'user-1',
          type: 'USER',
          status: 'PENDING',
        },
      ];

      (prisma.report.findMany as jest.Mock).mockResolvedValueOnce(mockReports);

      const response = await request(app)
        .get('/api/v1/moderation/users/user-1/reports')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockReports);
    });
  });

  describe('GET /api/v1/moderation/users/:userId/actions', () => {
    it('should return actions taken against a user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'moderator-1',
        role: 'MODERATOR',
        status: 'ACTIVE',
      });

      const mockActions = [
        {
          actionId: '1',
          actionType: 'WARN_USER',
          targetUserId: 'user-1',
          reason: 'Minor violation',
        },
      ];

      (prisma.moderatorAction.findMany as jest.Mock).mockResolvedValueOnce(
        mockActions
      );

      const response = await request(app)
        .get('/api/v1/moderation/users/user-1/actions')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockActions);
    });
  });
});
