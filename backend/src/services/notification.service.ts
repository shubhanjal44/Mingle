import prisma from '../config/database';
import { logger } from '../utils/logger';
import { NotificationType } from '@prisma/client';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
}

class NotificationService {
  /**
   * Create a notification for a user
   */
  async createNotification(params: CreateNotificationParams): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          title: params.title,
          message: params.message,
          data: params.data || null,
          isRead: false,
        },
      });

      logger.info(`Notification created for user ${params.userId}: ${params.title}`);

      // TODO: Emit Socket.IO event for real-time notification
      // TODO: Send push notification if user has enabled it
    } catch (error) {
      logger.error('Failed to create notification:', error);
    }
  }

  /**
   * Swap request sent notification
   */
  async notifySwapRequest(params: {
    receiverId: string;
    initiatorName: string;
    skillName: string;
    swapId: string;
  }): Promise<void> {
    await this.createNotification({
      userId: params.receiverId,
      type: 'SWAP_REQUEST',
      title: 'New Swap Request',
      message: `${params.initiatorName} wants to swap skills with you!`,
      data: {
        swapId: params.swapId,
        initiatorName: params.initiatorName,
        skillName: params.skillName,
      },
    });
  }

  /**
   * Swap accepted notification
   */
  async notifySwapAccepted(params: {
    initiatorId: string;
    receiverName: string;
    skillName: string;
    swapId: string;
  }): Promise<void> {
    await this.createNotification({
      userId: params.initiatorId,
      type: 'SWAP_ACCEPTED',
      title: 'Swap Request Accepted!',
      message: `${params.receiverName} accepted your swap request!`,
      data: {
        swapId: params.swapId,
        receiverName: params.receiverName,
        skillName: params.skillName,
      },
    });
  }

  /**
   * Swap rejected notification
   */
  async notifySwapRejected(params: {
    initiatorId: string;
    receiverName: string;
    swapId: string;
  }): Promise<void> {
    await this.createNotification({
      userId: params.initiatorId,
      type: 'SWAP_REJECTED',
      title: 'Swap Request Declined',
      message: `${params.receiverName} declined your swap request`,
      data: {
        swapId: params.swapId,
      },
    });
  }

  /**
   * Swap completed notification
   */
  async notifySwapCompleted(params: {
    userId: string;
    partnerName: string;
    swapId: string;
    xpEarned: number;
  }): Promise<void> {
    await this.createNotification({
      userId: params.userId,
      type: 'SWAP_COMPLETED',
      title: 'Swap Completed!',
      message: `Swap with ${params.partnerName} marked as completed. You earned ${params.xpEarned} XP!`,
      data: {
        swapId: params.swapId,
        xpEarned: params.xpEarned,
      },
    });
  }

  /**
   * Badge earned notification
   */
  async notifyBadgeEarned(params: {
    userId: string;
    badgeName: string;
    badgeIcon: string;
    badgeId: string;
  }): Promise<void> {
    await this.createNotification({
      userId: params.userId,
      type: 'BADGE_EARNED',
      title: 'Badge Unlocked!',
      message: `Congratulations! You've earned the "${params.badgeName}" badge ${params.badgeIcon}`,
      data: {
        badgeId: params.badgeId,
        badgeName: params.badgeName,
      },
    });
  }

  /**
   * New message notification
   */
  async notifyNewMessage(params: {
    receiverId: string;
    senderName: string;
    messagePreview: string;
    conversationId: string;
  }): Promise<void> {
    await this.createNotification({
      userId: params.receiverId,
      type: 'MESSAGE',
      title: `New message from ${params.senderName}`,
      message: params.messagePreview,
      data: {
        conversationId: params.conversationId,
        senderName: params.senderName,
      },
    });
  }

  /**
   * Event reminder notification
   */
  async notifyEventReminder(params: {
    userId: string;
    eventName: string;
    eventTime: Date;
    eventId: string;
  }): Promise<void> {
    await this.createNotification({
      userId: params.userId,
      type: 'EVENT_REMINDER',
      title: 'Event Reminder',
      message: `"${params.eventName}" starts soon!`,
      data: {
        eventId: params.eventId,
        eventTime: params.eventTime,
      },
    });
  }

  /**
   * System announcement notification
   */
  async notifySystemAnnouncement(params: {
    userId: string;
    title: string;
    message: string;
  }): Promise<void> {
    await this.createNotification({
      userId: params.userId,
      type: 'SYSTEM',
      title: params.title,
      message: params.message,
    });
  }

  /**
   * Send notification to multiple users
   */
  async bulkNotify(userIds: string[], notification: Omit<CreateNotificationParams, 'userId'>): Promise<void> {
    try {
      const notifications = userIds.map((userId) => ({
        userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data || null,
        isRead: false,
      }));

      await prisma.notification.createMany({
        data: notifications,
      });

      logger.info(`Bulk notification sent to ${userIds.length} users`);
    } catch (error) {
      logger.error('Failed to send bulk notifications:', error);
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const notification = await prisma.notification.findUnique({
        where: { notificationId },
      });

      if (!notification || notification.userId !== userId) {
        return false;
      }

      await prisma.notification.update({
        where: { notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return true;
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to mark all notifications as read:', error);
      return 0;
    }
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(userId: string, limit: number = 20, offset: number = 0) {
    return await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Delete old notifications (cleanup job)
   */
  async deleteOldNotifications(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
          isRead: true,
        },
      });

      logger.info(`Deleted ${result.count} old notifications`);
      return result.count;
    } catch (error) {
      logger.error('Failed to delete old notifications:', error);
      return 0;
    }
  }
}

export const notificationService = new NotificationService();
