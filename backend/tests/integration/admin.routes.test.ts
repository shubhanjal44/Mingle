/**
 * Admin Routes Integration Tests
 */

import request from 'supertest';
import app from '../../src/server';
import prisma from '../../src/config/database';
import jwt from 'jsonwebtoken';

describe('Admin Routes', () => {
  let adminToken: string;
  let moderatorToken: string;
  let userToken: string;

  beforeAll(() => {
    // Generate test tokens
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

  describe('GET /api/v1/admin/dashboard', () => {
    it('should return dashboard metrics for admin', async () => {
      // Mock user role check
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'admin-1',
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      // Mock analytics service responses
      (prisma.user.count as jest.Mock).mockResolvedValue(1000);
      (prisma.userSubscription.count as jest.Mock).mockResolvedValue(500);
      (prisma.swap.count as jest.Mock).mockResolvedValue(250);
      (prisma.payment.aggregate as jest.Mock).mockResolvedValue({
        _sum: { amount: 50000 },
      });

      const response = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metrics).toBeDefined();
      expect(response.body.data.metrics.users).toBeDefined();
      expect(response.body.data.quickActions).toBeDefined();
    });

    it('should deny access for non-admin users', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'user-1',
        role: 'USER',
        status: 'ACTIVE',
      });

      await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should deny access without authentication', async () => {
      await request(app).get('/api/v1/admin/dashboard').expect(401);
    });
  });

  describe('GET /api/v1/admin/users', () => {
    it('should search users with filters', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'admin-1',
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      const mockUsers = [
        {
          userId: '1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'USER',
          status: 'ACTIVE',
        },
      ];

      (prisma.user.count as jest.Mock).mockResolvedValueOnce(1);
      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce(mockUsers);

      const response = await request(app)
        .get('/api/v1/admin/users')
        .query({ query: 'john', role: 'USER', limit: 20 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toEqual(mockUsers);
      expect(response.body.data.total).toBe(1);
    });

    it('should handle pagination', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'admin-1',
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      (prisma.user.count as jest.Mock).mockResolvedValueOnce(100);
      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/v1/admin/users')
        .query({ limit: 20, offset: 40 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.limit).toBe(20);
      expect(response.body.data.offset).toBe(40);
    });
  });

  describe('GET /api/v1/admin/users/:userId', () => {
    it('should return user details', async () => {
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          userId: 'admin-1',
          role: 'ADMIN',
          status: 'ACTIVE',
        })
        .mockResolvedValueOnce({
          userId: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'USER',
          status: 'ACTIVE',
        });

      const response = await request(app)
        .get('/api/v1/admin/users/user-123')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe('user-123');
    });

    it('should return 404 for non-existent user', async () => {
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          userId: 'admin-1',
          role: 'ADMIN',
          status: 'ACTIVE',
        })
        .mockResolvedValueOnce(null);

      await request(app)
        .get('/api/v1/admin/users/non-existent')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/v1/admin/users/:userId', () => {
    it('should update user successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'admin-1',
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      const updatedUser = {
        userId: 'user-123',
        name: 'Updated Name',
        email: 'updated@example.com',
        status: 'ACTIVE',
      };

      (prisma.user.update as jest.Mock).mockResolvedValueOnce(updatedUser);
      (prisma.auditLog.create as jest.Mock).mockResolvedValueOnce({});

      const response = await request(app)
        .put('/api/v1/admin/users/user-123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name',
          email: 'updated@example.com',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
    });

    it('should validate update data', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'admin-1',
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      await request(app)
        .put('/api/v1/admin/users/user-123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'invalid-email',
        })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/admin/users/:userId', () => {
    it('should delete user with reason', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'admin-1',
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      (prisma.user.update as jest.Mock).mockResolvedValueOnce({
        userId: 'user-123',
        status: 'BANNED',
        deletedAt: new Date(),
      });
      (prisma.auditLog.create as jest.Mock).mockResolvedValueOnce({});

      const response = await request(app)
        .delete('/api/v1/admin/users/user-123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Violation of terms',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });

    it('should require deletion reason', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'admin-1',
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      await request(app)
        .delete('/api/v1/admin/users/user-123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/v1/admin/staff', () => {
    it('should create admin user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'admin-1',
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      const newStaff = {
        userId: 'staff-1',
        email: 'newadmin@tej-india.com',
        name: 'New Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
      };

      (prisma.user.create as jest.Mock).mockResolvedValueOnce(newStaff);
      (prisma.auditLog.create as jest.Mock).mockResolvedValueOnce({});

      const response = await request(app)
        .post('/api/v1/admin/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newadmin@tej-india.com',
          password: 'SecurePass123!',
          name: 'New Admin',
          role: 'ADMIN',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe('ADMIN');
    });

    it('should validate staff user data', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'admin-1',
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      await request(app)
        .post('/api/v1/admin/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'invalid-email',
          password: '123', // weak password
        })
        .expect(400);
    });
  });

  describe('PUT /api/v1/admin/users/:userId/subscription', () => {
    it('should manage user subscription', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'admin-1',
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      const updatedSubscription = {
        subscriptionId: 'sub-1',
        userId: 'user-123',
        tier: 'PRO',
        status: 'ACTIVE',
      };

      (prisma.userSubscription.update as jest.Mock).mockResolvedValueOnce(
        updatedSubscription
      );
      (prisma.auditLog.create as jest.Mock).mockResolvedValueOnce({});

      const response = await request(app)
        .put('/api/v1/admin/users/user-123/subscription')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tier: 'PRO',
          status: 'ACTIVE',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tier).toBe('PRO');
    });
  });

  describe('GET /api/v1/admin/settings', () => {
    it('should return all settings', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'admin-1',
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      const mockSettings = [
        { key: 'MAINTENANCE_MODE', value: 'false', category: 'SYSTEM' },
        { key: 'BASIC_PRICE', value: '299', category: 'PRICING' },
      ];

      (prisma.adminSettings.findMany as jest.Mock).mockResolvedValueOnce(
        mockSettings
      );

      const response = await request(app)
        .get('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSettings);
    });
  });

  describe('PUT /api/v1/admin/settings/:key', () => {
    it('should update setting', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'admin-1',
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      const updatedSetting = {
        settingId: '1',
        key: 'MAINTENANCE_MODE',
        value: 'true',
      };

      (prisma.adminSettings.upsert as jest.Mock).mockResolvedValueOnce(
        updatedSetting
      );
      (prisma.auditLog.create as jest.Mock).mockResolvedValueOnce({});

      const response = await request(app)
        .put('/api/v1/admin/settings/MAINTENANCE_MODE')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          value: 'true',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.value).toBe('true');
    });
  });

  describe('GET /api/v1/admin/audit-logs', () => {
    it('should return audit logs', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'admin-1',
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      const mockLogs = [
        {
          logId: '1',
          userId: 'admin-1',
          action: 'UPDATE_USER',
          entity: 'USER',
          entityId: 'user-123',
          createdAt: new Date(),
        },
      ];

      (prisma.auditLog.count as jest.Mock).mockResolvedValueOnce(1);
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValueOnce(mockLogs);

      const response = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toEqual(mockLogs);
    });
  });

  describe('Moderator Access', () => {
    it('should allow moderator to search users', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'moderator-1',
        role: 'MODERATOR',
        status: 'ACTIVE',
      });

      (prisma.user.count as jest.Mock).mockResolvedValueOnce(0);
      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([]);

      await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(200);
    });

    it('should deny moderator access to create staff', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'moderator-1',
        role: 'MODERATOR',
        status: 'ACTIVE',
      });

      await request(app)
        .post('/api/v1/admin/staff')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          email: 'test@example.com',
          password: 'Pass123!',
          name: 'Test',
          role: 'ADMIN',
        })
        .expect(403);
    });
  });
});
