/**
 * Admin Service Unit Tests
 */

import { adminService } from '../../src/services/admin.service';
import prisma from '../../src/config/database';

describe('Admin Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchUsers', () => {
    it('should search users by query', async () => {
      const mockUsers = [
        {
          userId: '1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'USER',
          status: 'ACTIVE',
          coins: 100,
          level: 5,
          rating: 4.5,
          completedSwaps: 10,
        },
      ];

      (prisma.user.count as jest.Mock).mockResolvedValueOnce(1);
      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce(mockUsers);

      const result = await adminService.searchUsers({
        query: 'john',
        limit: 20,
        offset: 0,
      });

      expect(result.users).toEqual(mockUsers);
      expect(result.total).toBe(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });

    it('should filter users by role', async () => {
      const mockAdmins = [
        {
          userId: '1',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      ];

      (prisma.user.count as jest.Mock).mockResolvedValueOnce(1);
      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce(mockAdmins);

      const result = await adminService.searchUsers({
        role: 'ADMIN',
        limit: 20,
        offset: 0,
      });

      expect(result.users).toEqual(mockAdmins);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: 'ADMIN',
          }),
        })
      );
    });

    it('should handle pagination correctly', async () => {
      (prisma.user.count as jest.Mock).mockResolvedValueOnce(100);
      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([]);

      const result = await adminService.searchUsers({
        limit: 20,
        offset: 40,
      });

      expect(result.limit).toBe(20);
      expect(result.offset).toBe(40);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 40,
        })
      );
    });
  });

  describe('getUserDetails', () => {
    it('should return complete user details', async () => {
      const mockUser = {
        userId: '1',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashed',
        role: 'USER',
        status: 'ACTIVE',
        subscription: {
          tier: 'PRO',
          status: 'ACTIVE',
        },
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);

      const result = await adminService.getUserDetails('1');

      expect(result.userId).toBe('1');
      expect(result).not.toHaveProperty('password');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { userId: '1' },
        include: expect.any(Object),
      });
    });

    it('should throw error if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(adminService.getUserDetails('999')).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const mockUpdatedUser = {
        userId: '1',
        name: 'Updated Name',
        email: 'updated@example.com',
        password: 'hashed',
        status: 'ACTIVE',
      };

      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({ userId: '1', role: 'USER', email: 'old@example.com' })
        .mockResolvedValueOnce({ role: 'ADMIN' })
        .mockResolvedValueOnce(null);
      (prisma.user.update as jest.Mock).mockResolvedValueOnce(mockUpdatedUser);
      (prisma.auditLog.create as jest.Mock).mockResolvedValueOnce({});

      const result = await adminService.updateUser(
        '1',
        'admin-id',
        { name: 'Updated Name', email: 'updated@example.com' }
      );

      expect(result.name).toBe('Updated Name');
      expect(result).not.toHaveProperty('password');
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user', async () => {
      const mockDeletedUser = {
        userId: '1',
        status: 'BANNED',
        password: 'hashed',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ userId: '1', role: 'USER' });
      (prisma.user.update as jest.Mock).mockResolvedValueOnce(mockDeletedUser);
      (prisma.auditLog.create as jest.Mock).mockResolvedValueOnce({});

      const result = await adminService.deleteUser('1', 'admin-id', 'Violation of terms');

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { userId: '1' },
        data: expect.objectContaining({
          status: 'BANNED',
        }),
      });
    });
  });

  describe('createStaffUser', () => {
    it('should create admin user', async () => {
      const mockStaffUser = {
        userId: 'staff-1',
        email: 'admin@tej-india.com',
        name: 'Admin User',
        password: 'hashed',
        role: 'ADMIN',
        status: 'ACTIVE',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
      (prisma.user.create as jest.Mock).mockResolvedValueOnce(mockStaffUser);
      (prisma.auditLog.create as jest.Mock).mockResolvedValueOnce({});

      const result = await adminService.createStaffUser({
        email: 'admin@tej-india.com',
        password: 'SecurePass123!',
        name: 'Admin User',
        role: 'ADMIN',
        createdBy: 'creator-admin-id',
      });

      expect(result.role).toBe('ADMIN');
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('manageSubscription', () => {
    it('should upgrade subscription tier', async () => {
      const mockSubscription = {
        subscriptionId: 'sub-1',
        userId: '1',
        tier: 'PRO',
        status: 'ACTIVE',
      };

      (prisma.userSubscription.findUnique as jest.Mock).mockResolvedValueOnce({
        subscriptionId: 'sub-1',
        userId: '1',
      });
      (prisma.userSubscription.update as jest.Mock).mockResolvedValueOnce(
        mockSubscription
      );
      (prisma.auditLog.create as jest.Mock).mockResolvedValueOnce({});

      const result = await adminService.manageSubscription('admin-id', {
        userId: '1',
        tier: 'PRO',
        status: 'ACTIVE',
      });

      expect(result.tier).toBe('PRO');
    });
  });

  describe('getSettings', () => {
    it('should return all platform settings', async () => {
      const mockSettings = [
        { key: 'MAINTENANCE_MODE', value: 'false', category: 'SYSTEM' },
        { key: 'MAX_FREE_SWAPS', value: '5', category: 'LIMITS' },
      ];

      (prisma.adminSettings.findMany as jest.Mock).mockResolvedValueOnce(
        mockSettings
      );

      const result = await adminService.getSettings();

      expect(result).toEqual(mockSettings);
    });
  });

  describe('updateSetting', () => {
    it('should update setting', async () => {
      const updatedSetting = {
        settingId: '1',
        key: 'MAINTENANCE_MODE',
        value: 'true',
      };

      (prisma.adminSettings.upsert as jest.Mock).mockResolvedValueOnce(
        updatedSetting
      );
      (prisma.auditLog.create as jest.Mock).mockResolvedValueOnce({});

      const result = await adminService.updateSetting(
        'MAINTENANCE_MODE',
        'true',
        'admin-id'
      );

      expect(result.value).toBe('true');
    });
  });

  describe('getAuditLogs', () => {
    it('should return audit logs with filters', async () => {
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

      const result = await adminService.getAuditLogs({
        userId: 'admin-1',
        action: 'UPDATE_USER',
        limit: 50,
        offset: 0,
      });

      expect(result.logs).toEqual(mockLogs);
      expect(result.total).toBe(1);
    });
  });
});
