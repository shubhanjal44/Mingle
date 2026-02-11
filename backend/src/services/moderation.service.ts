/**
 * Moderation Service
 * Handles user reports, content moderation, and moderator actions
 */

import prisma from '../config/database';
import { ReportType, ReportStatus, ModeratorActionType, UserStatus } from '@prisma/client';
import { notificationService } from './notification.service';
import { AppError } from '../middleware/errorHandler';

export interface CreateReportParams {
  reporterId: string;
  type: ReportType;
  reason: string;
  description?: string;
  evidence?: string[];
  reportedUserId?: string;
  reviewId?: string;
  messageId?: string;
  eventId?: string;
}

export interface ModeratorActionParams {
  moderatorId: string;
  actionType: ModeratorActionType;
  targetUserId?: string;
  targetContentId?: string;
  targetContentType?: string;
  reason: string;
  notes?: string;
  duration?: number;
  reportId?: string;
}

class ModerationService {
  /**
   * Create a new report
   */
  async createReport(params: CreateReportParams) {
    const { reporterId, evidence, ...reportData } = params;

    // Check if user exists and is active
    const reporter = await prisma.user.findUnique({
      where: { userId: reporterId },
      select: { userId: true, status: true },
    });

    if (!reporter || reporter.status !== 'ACTIVE') {
      throw new AppError('Reporter account is not active', 403);
    }

    // Check for duplicate reports
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId,
        reportedUserId: params.reportedUserId,
        type: params.type,
        status: { in: ['PENDING', 'UNDER_REVIEW'] },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    if (existingReport) {
      throw new AppError('You have already reported this recently', 400);
    }

    // Create report
    const report = await prisma.report.create({
      data: {
        ...reportData,
        reporterId,
        evidence: evidence ? JSON.stringify(evidence) : null,
      },
      include: {
        reporter: {
          select: {
            name: true,
            email: true,
          },
        },
        reportedUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Notify moderators (users with MODERATOR or ADMIN role)
    const moderators = await prisma.user.findMany({
      where: {
        role: { in: ['MODERATOR', 'ADMIN'] },
        status: 'ACTIVE',
      },
      select: { userId: true },
    });

    for (const moderator of moderators) {
      await notificationService.createNotification({
        userId: moderator.userId,
        type: 'SYSTEM',
        title: 'New Report',
        message: `New ${params.type} report from ${report.reporter.name}`,
      });
    }

    return report;
  }

  /**
   * Get all reports with filters
   */
  async getReports(params: {
    status?: ReportStatus;
    type?: ReportType;
    limit?: number;
    offset?: number;
  }) {
    const { status, type, limit = 50, offset = 0 } = params;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reporter: {
            select: {
              userId: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          reportedUser: {
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
      prisma.report.count({ where }),
    ]);

    return {
      reports: reports.map((r) => ({
        ...r,
        evidence: r.evidence ? JSON.parse(r.evidence) : [],
      })),
      total,
      limit,
      offset,
    };
  }

  /**
   * Get single report details
   */
  async getReport(reportId: string) {
    const report = await prisma.report.findUnique({
      where: { reportId },
      include: {
        reporter: {
          select: {
            userId: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        reportedUser: {
          select: {
            userId: true,
            name: true,
            email: true,
            avatar: true,
            status: true,
            role: true,
            completedSwaps: true,
            rating: true,
          },
        },
        moderatorActions: {
          include: {
            moderator: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!report) {
      throw new AppError('Report not found', 404);
    }

    return {
      ...report,
      evidence: report.evidence ? JSON.parse(report.evidence) : [],
    };
  }

  /**
   * Update report status
   */
  async updateReportStatus(
    reportId: string,
    status: ReportStatus,
    moderatorId: string,
    resolution?: string
  ) {
    const report = await prisma.report.findUnique({
      where: { reportId },
    });

    if (!report) {
      throw new AppError('Report not found', 404);
    }

    const updated = await prisma.report.update({
      where: { reportId },
      data: {
        status,
        resolvedBy: status === 'RESOLVED' || status === 'DISMISSED' ? moderatorId : undefined,
        resolvedAt: status === 'RESOLVED' || status === 'DISMISSED' ? new Date() : undefined,
        resolution,
      },
      include: {
        reporter: true,
        reportedUser: true,
      },
    });

    // Notify reporter
    if (status === 'RESOLVED') {
      await notificationService.createNotification({
        userId: report.reporterId,
        type: 'SYSTEM',
        title: 'Report Resolved',
        message: `Your report has been resolved. ${resolution || ''}`,
      });
    }

    return updated;
  }

  /**
   * Execute moderator action
   */
  async executeModeratorAction(params: ModeratorActionParams) {
    const { moderatorId, actionType, targetUserId, reportId, duration, ...actionData } = params;

    // Verify moderator
    const moderator = await prisma.user.findUnique({
      where: { userId: moderatorId },
      select: { role: true, status: true },
    });

    if (!moderator || moderator.status !== 'ACTIVE') {
      throw new AppError('Moderator account not active', 403);
    }

    if (moderator.role !== 'ADMIN' && moderator.role !== 'MODERATOR') {
      throw new AppError('Insufficient permissions', 403);
    }

    // Execute action based on type
    switch (actionType) {
      case 'BAN_USER':
        await this.banUser(targetUserId!, params.reason);
        break;

      case 'SUSPEND_USER':
        await this.suspendUser(targetUserId!, duration || 7, params.reason);
        break;

      case 'WARN_USER':
        await this.warnUser(targetUserId!, params.reason);
        break;

      case 'DELETE_CONTENT':
        await this.deleteContent(
          params.targetContentType!,
          params.targetContentId!,
          params.reason
        );
        break;

      case 'VERIFY_USER':
        await this.verifyUser(targetUserId!);
        break;

      case 'REMOVE_SUBSCRIPTION':
        await this.removeSubscription(targetUserId!, params.reason);
        break;

      case 'DISMISS_REPORT':
        if (reportId) {
          await this.updateReportStatus(reportId, 'DISMISSED', moderatorId, params.reason);
        }
        break;
    }

    // Create moderator action record
    const action = await prisma.moderatorAction.create({
      data: {
        ...actionData,
        moderatorId,
        actionType,
        targetUserId,
        reportId,
        duration,
      },
      include: {
        moderator: {
          select: { name: true, email: true },
        },
      },
    });

    // Update associated report if exists
    if (reportId) {
      await this.updateReportStatus(reportId, 'RESOLVED', moderatorId, `Action taken: ${actionType}`);
    }

    return action;
  }

  /**
   * Ban a user permanently
   */
  private async banUser(userId: string, reason: string) {
    const user = await prisma.user.update({
      where: { userId },
      data: { status: 'BANNED' },
    });

    await notificationService.createNotification({
      userId,
      type: 'SYSTEM',
      title: 'Account Banned',
      message: `Your account has been permanently banned. Reason: ${reason}`,
    });

    return user;
  }

  /**
   * Suspend a user temporarily
   */
  private async suspendUser(userId: string, days: number, reason: string) {
    const user = await prisma.user.update({
      where: { userId },
      data: { status: 'SUSPENDED' },
    });

    await notificationService.createNotification({
      userId,
      type: 'SYSTEM',
      title: 'Account Suspended',
      message: `Your account has been suspended for ${days} days. Reason: ${reason}`,
    });

    return user;
  }

  /**
   * Warn a user
   */
  private async warnUser(userId: string, reason: string) {
    await notificationService.createNotification({
      userId,
      type: 'SYSTEM',
      title: 'Warning',
      message: `You have received a warning from our moderation team. Reason: ${reason}. Further violations may result in account suspension or ban.`,
    });
  }

  /**
   * Delete content (review, message, event, etc.)
   */
  private async deleteContent(contentType: string, contentId: string, reason: string) {
    switch (contentType) {
      case 'review':
        await prisma.review.delete({ where: { reviewId: contentId } });
        break;

      case 'message':
        await prisma.message.delete({ where: { messageId: contentId } });
        break;

      case 'event':
        await prisma.event.delete({ where: { eventId: contentId } });
        break;

      default:
        throw new AppError(`Unknown content type: ${contentType}`, 400);
    }
  }

  /**
   * Verify a user manually
   */
  private async verifyUser(userId: string) {
    return await prisma.user.update({
      where: { userId },
      data: { emailVerified: true },
    });
  }

  /**
   * Remove user subscription
   */
  private async removeSubscription(userId: string, reason: string) {
    const subscription = await prisma.userSubscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new AppError('User has no subscription', 404);
    }

    await prisma.userSubscription.update({
      where: { userId },
      data: {
        tier: 'FREE',
        status: 'CANCELLED',
        amount: 0,
        cancelledAt: new Date(),
      },
    });

    await notificationService.createNotification({
      userId,
      type: 'SYSTEM',
      title: 'Subscription Removed',
      message: `Your subscription has been removed by moderators. Reason: ${reason}`,
    });
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats() {
    const [
      totalReports,
      pendingReports,
      resolvedReports,
      dismissedReports,
      totalActions,
      bannedUsers,
      suspendedUsers,
    ] = await Promise.all([
      prisma.report.count(),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.report.count({ where: { status: 'RESOLVED' } }),
      prisma.report.count({ where: { status: 'DISMISSED' } }),
      prisma.moderatorAction.count(),
      prisma.user.count({ where: { status: 'BANNED' } }),
      prisma.user.count({ where: { status: 'SUSPENDED' } }),
    ]);

    // Get reports by type
    const reportsByType = await prisma.report.groupBy({
      by: ['type'],
      _count: true,
    });

    // Get actions by type
    const actionsByType = await prisma.moderatorAction.groupBy({
      by: ['actionType'],
      _count: true,
    });

    return {
      totalReports,
      pendingReports,
      resolvedReports,
      dismissedReports,
      totalActions,
      bannedUsers,
      suspendedUsers,
      reportsByType: reportsByType.map((r) => ({
        type: r.type,
        count: r._count,
      })),
      actionsByType: actionsByType.map((a) => ({
        type: a.actionType,
        count: a._count,
      })),
    };
  }

  /**
   * Get moderator activity
   */
  async getModeratorActivity(moderatorId: string, limit: number = 50) {
    const actions = await prisma.moderatorAction.findMany({
      where: { moderatorId },
      include: {
        report: {
          select: {
            type: true,
            reason: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const stats = await prisma.moderatorAction.groupBy({
      by: ['actionType'],
      where: { moderatorId },
      _count: true,
    });

    return {
      actions,
      stats: stats.map((s) => ({
        type: s.actionType,
        count: s._count,
      })),
    };
  }
}

export const moderationService = new ModerationService();
