/**
 * Admin Service
 * User management, subscription management, and platform administration
 */

import prisma from '../config/database';
import { UserRole, UserStatus, SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notification.service';
import bcrypt from 'bcryptjs';

export interface UserSearchParams {
  query?: string;
  role?: UserRole;
  status?: UserStatus;
  tier?: SubscriptionTier;
  city?: string;
  state?: string;
  verifiedOnly?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'name' | 'rating' | 'completedSwaps';
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateUserParams {
  name?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  status?: UserStatus;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  coins?: number;
  level?: number;
}

export interface SubscriptionManagementParams {
  userId: string;
  tier?: SubscriptionTier;
  status?: SubscriptionStatus;
  autoRenew?: boolean;
  note?: string;
}

class AdminService {
  /**
   * Search and filter users with pagination
   */
  async searchUsers(params: UserSearchParams) {
    const {
      query,
      role,
      status,
      tier,
      city,
      state,
      verifiedOnly,
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const where: any = {};

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (role) where.role = role;
    if (status) where.status = status;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (state) where.state = { contains: state, mode: 'insensitive' };
    if (verifiedOnly) where.emailVerified = true;

    if (tier) {
      where.subscription = {
        tier,
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          userId: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          bio: true,
          city: true,
          state: true,
          role: true,
          status: true,
          coins: true,
          level: true,
          rating: true,
          completedSwaps: true,
          totalHoursTaught: true,
          totalHoursLearned: true,
          emailVerified: true,
          phoneVerified: true,
          lastActive: true,
          createdAt: true,
          subscription: {
            select: {
              tier: true,
              status: true,
              currentPeriodEnd: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get detailed user information
   */
  async getUserDetails(userId: string) {
    const user = await prisma.user.findUnique({
      where: { userId },
      include: {
        skills: {
          include: {
            skill: {
              include: {
                category: true,
              },
            },
          },
        },
        subscription: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        swapsInitiated: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        swapsReceived: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        reviewsReceived: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        badges: {
          include: {
            badge: true,
          },
        },
        reportsCreated: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        reportsReceived: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  /**
   * Update user information
   */
  async updateUser(userId: string, adminId: string, updates: UpdateUserParams) {
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { role: true, email: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Prevent demoting or modifying other admins
    const admin = await prisma.user.findUnique({
      where: { userId: adminId },
      select: { role: true },
    });

    if (
      user.role === 'ADMIN' &&
      admin?.role !== 'ADMIN' &&
      (updates.role || updates.status)
    ) {
      throw new AppError('Cannot modify another admin', 403);
    }

    // Check if email is being changed and if it's already taken
    if (updates.email && updates.email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: updates.email },
      });

      if (existingUser) {
        throw new AppError('Email already in use', 400);
      }
    }

    const updated = await prisma.user.update({
      where: { userId },
      data: updates,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'UPDATE_USER',
        entity: 'USER',
        entityId: userId,
        metadata: JSON.stringify({ updates }),
        ipAddress: '0.0.0.0', // Should be passed from request
      },
    });

    // Notify user of significant changes
    if (updates.status || updates.role) {
      await notificationService.createNotification({
        userId,
        type: 'SYSTEM',
        title: 'Account Updated',
        message: `Your account has been updated by an administrator.${
          updates.status ? ` Status: ${updates.status}.` : ''
        }${updates.role ? ` Role: ${updates.role}.` : ''}`,
      });
    }

    const { password, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  }

  /**
   * Delete user (soft delete - set to BANNED status)
   */
  async deleteUser(userId: string, adminId: string, reason: string) {
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { role: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.role === 'ADMIN') {
      throw new AppError('Cannot delete an admin user', 403);
    }

    const updated = await prisma.user.update({
      where: { userId },
      data: { status: 'BANNED' },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'DELETE_USER',
        entity: 'USER',
        entityId: userId,
        metadata: JSON.stringify({ reason }),
        ipAddress: '0.0.0.0',
      },
    });

    // Notify user
    await notificationService.createNotification({
      userId,
      type: 'SYSTEM',
      title: 'Account Deleted',
      message: `Your account has been deleted. Reason: ${reason}`,
    });

    return { success: true, message: 'User deleted successfully' };
  }

  /**
   * Create admin/moderator user
   */
  async createStaffUser(params: {
    email: string;
    password: string;
    name: string;
    role: 'ADMIN' | 'MODERATOR';
    createdBy: string;
  }) {
    // Check if email exists
    const existing = await prisma.user.findUnique({
      where: { email: params.email },
    });

    if (existing) {
      throw new AppError('Email already in use', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(params.password, 12);

    const user = await prisma.user.create({
      data: {
        email: params.email,
        password: hashedPassword,
        name: params.name,
        role: params.role,
        status: 'ACTIVE',
        emailVerified: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: params.createdBy,
        action: 'CREATE_STAFF_USER',
        entity: 'USER',
        entityId: user.userId,
        metadata: JSON.stringify({ role: params.role }),
        ipAddress: '0.0.0.0',
      },
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Manage user subscription
   */
  async manageSubscription(adminId: string, params: SubscriptionManagementParams) {
    const { userId, tier, status, autoRenew, note } = params;

    const subscription = await prisma.userSubscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new AppError('User has no subscription', 404);
    }

    const updates: any = {};
    if (tier) updates.tier = tier;
    if (status) updates.status = status;
    if (autoRenew !== undefined) updates.autoRenew = autoRenew;

    if (status === 'CANCELLED') {
      updates.cancelledAt = new Date();
    }

    const updated = await prisma.userSubscription.update({
      where: { userId },
      data: updates,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'MANAGE_SUBSCRIPTION',
        entity: 'SUBSCRIPTION',
        entityId: subscription.subscriptionId,
        metadata: JSON.stringify({ updates, note }),
        ipAddress: '0.0.0.0',
      },
    });

    // Notify user
    await notificationService.createNotification({
      userId,
      type: 'SYSTEM',
      title: 'Subscription Updated',
      message: `Your subscription has been updated by an administrator. ${note || ''}`,
    });

    return updated;
  }

  /**
   * Get all subscriptions with filters
   */
  async getSubscriptions(params: {
    tier?: SubscriptionTier;
    status?: SubscriptionStatus;
    limit?: number;
    offset?: number;
  }) {
    const { tier, status, limit = 50, offset = 0 } = params;

    const where: any = {};
    if (tier) where.tier = tier;
    if (status) where.status = status;

    const [subscriptions, total] = await Promise.all([
      prisma.userSubscription.findMany({
        where,
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              email: true,
              avatar: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.userSubscription.count({ where }),
    ]);

    return {
      subscriptions,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get platform settings
   */
  async getSettings(category?: string) {
    const where: any = {};
    if (category) where.category = category;

    const settings = await prisma.adminSettings.findMany({
      where,
      orderBy: { category: 'asc' },
    });

    return settings.map((s) => ({
      ...s,
      value: s.value ? JSON.parse(s.value) : null,
    }));
  }

  /**
   * Update platform setting
   */
  async updateSetting(
    key: string,
    value: any,
    adminId: string,
    description?: string
  ) {
    const existing = await prisma.adminSettings.findUnique({
      where: { key },
    });

    const setting = await prisma.adminSettings.upsert({
      where: { key },
      create: {
        key,
        value: JSON.stringify(value),
        category: this.getCategoryFromKey(key),
        description,
        updatedBy: adminId,
      },
      update: {
        value: JSON.stringify(value),
        description: description || undefined,
        updatedBy: adminId,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'UPDATE_SETTING',
        entity: 'SETTINGS',
        entityId: setting.settingId,
        metadata: JSON.stringify({ key, oldValue: existing?.value, newValue: value }),
        ipAddress: '0.0.0.0',
      },
    });

    return {
      ...setting,
      value: JSON.parse(setting.value),
    };
  }

  /**
   * Get category from setting key
   */
  private getCategoryFromKey(key: string): string {
    if (key.startsWith('payment_')) return 'payments';
    if (key.startsWith('moderation_')) return 'moderation';
    if (key.startsWith('feature_')) return 'features';
    if (key.startsWith('email_')) return 'email';
    return 'general';
  }

  /**
   * Get admin dashboard quick actions
   */
  async getQuickActions() {
    const [
      pendingReports,
      suspendedUsers,
      failedPayments,
      cancelledSubscriptions,
      flaggedContent,
    ] = await Promise.all([
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { status: 'SUSPENDED' } }),
      prisma.payment.count({ where: { status: 'FAILED' } }),
      prisma.userSubscription.count({
        where: {
          status: 'CANCELLED',
          cancelledAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
      prisma.report.count({
        where: {
          status: 'PENDING',
          type: { in: ['SPAM', 'INAPPROPRIATE_CONTENT', 'HARASSMENT'] },
        },
      }),
    ]);

    return {
      pendingReports,
      suspendedUsers,
      failedPayments,
      cancelledSubscriptions,
      flaggedContent,
    };
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(params: {
    userId?: string;
    action?: string;
    resource?: string;
    limit?: number;
    offset?: number;
  }) {
    const { userId, action, resource, limit = 100, offset = 0 } = params;

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resource) where.resource = resource;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      limit,
      offset,
    };
  }
}

export const adminService = new AdminService();
