/**
 * Email Digest Service
 * Generates and sends periodic email digests to users
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';
import { emailTemplatesService, DigestTemplateData } from './email-templates.service';
import { emailService } from './email.service';
import { notificationPreferencesService } from './notification-preferences.service';

class EmailDigestService {
  private readonly appUrl = process.env.APP_URL || 'http://localhost:3000';

  /**
   * Send daily digests to all users who have it enabled
   */
  async sendDailyDigests() {
    const currentHour = new Date().getHours();
    logger.info(`Starting daily digest job for hour ${currentHour}`);

    try {
      const usersWithPreferences = await notificationPreferencesService.getUsersForDailyDigest(
        currentHour
      );

      logger.info(`Found ${usersWithPreferences.length} users for daily digest`);

      for (const { user, userId } of usersWithPreferences) {
        if (!user.emailVerified) {
          logger.debug(`Skipping unverified user: ${userId}`);
          continue;
        }

        try {
          await this.sendDigestToUser(userId, user.email, user.name, 'Daily');
        } catch (error) {
          logger.error(`Failed to send daily digest to user ${userId}:`, error);
        }
      }

      logger.info('Daily digest job completed');
    } catch (error) {
      logger.error('Daily digest job failed:', error);
    }
  }

  /**
   * Send weekly digests to all users who have it enabled
   */
  async sendWeeklyDigests() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentHour = now.getHours();

    logger.info(`Starting weekly digest job for day ${dayOfWeek}, hour ${currentHour}`);

    try {
      const usersWithPreferences = await notificationPreferencesService.getUsersForWeeklyDigest(
        dayOfWeek,
        currentHour
      );

      logger.info(`Found ${usersWithPreferences.length} users for weekly digest`);

      for (const { user, userId } of usersWithPreferences) {
        if (!user.emailVerified) {
          logger.debug(`Skipping unverified user: ${userId}`);
          continue;
        }

        try {
          await this.sendDigestToUser(userId, user.email, user.name, 'Weekly');
        } catch (error) {
          logger.error(`Failed to send weekly digest to user ${userId}:`, error);
        }
      }

      logger.info('Weekly digest job completed');
    } catch (error) {
      logger.error('Weekly digest job failed:', error);
    }
  }

  /**
   * Send monthly digests to all users who have it enabled
   */
  async sendMonthlyDigests() {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const currentHour = now.getHours();

    // Only send on specific days (1-28 to avoid issues with short months)
    if (dayOfMonth > 28) {
      logger.debug('Skipping monthly digest (day > 28)');
      return;
    }

    logger.info(`Starting monthly digest job for day ${dayOfMonth}, hour ${currentHour}`);

    try {
      const usersWithPreferences = await notificationPreferencesService.getUsersForMonthlyDigest(
        dayOfMonth,
        currentHour
      );

      logger.info(`Found ${usersWithPreferences.length} users for monthly digest`);

      for (const { user, userId } of usersWithPreferences) {
        if (!user.emailVerified) {
          logger.debug(`Skipping unverified user: ${userId}`);
          continue;
        }

        try {
          await this.sendDigestToUser(userId, user.email, user.name, 'Monthly');
        } catch (error) {
          logger.error(`Failed to send monthly digest to user ${userId}:`, error);
        }
      }

      logger.info('Monthly digest job completed');
    } catch (error) {
      logger.error('Monthly digest job failed:', error);
    }
  }

  /**
   * Send digest email to a specific user
   */
  private async sendDigestToUser(
    userId: string,
    email: string,
    name: string,
    period: 'Daily' | 'Weekly' | 'Monthly'
  ) {
    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'Daily':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'Weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'Monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    // Collect activity data
    const stats = await this.collectActivityStats(userId, startDate, endDate);
    const highlights = await this.collectActivityHighlights(userId, startDate, endDate);

    // Skip if no activity
    const totalActivity =
      stats.newSwapRequests +
      stats.acceptedSwaps +
      stats.completedSwaps +
      stats.newMessages +
      stats.badgesEarned;

    if (totalActivity === 0) {
      logger.debug(`No activity for user ${userId}, skipping digest`);
      return;
    }

    // Generate email
    const templateData: DigestTemplateData = {
      recipientName: name,
      period,
      stats,
      highlights,
      dashboardUrl: `${this.appUrl}/dashboard`,
    };

    const emailTemplate = emailTemplatesService.emailDigest(templateData);

    // Send email
    await emailService.sendEmail({
      to: email,
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
    });

    // Update last digest sent timestamp
    await notificationPreferencesService.updateLastDigestSent(userId);

    logger.info(`Sent ${period.toLowerCase()} digest to user ${userId}`);
  }

  /**
   * Collect activity statistics for a user in a date range
   */
  private async collectActivityStats(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    newSwapRequests: number;
    acceptedSwaps: number;
    completedSwaps: number;
    newMessages: number;
    badgesEarned: number;
  }> {
    // Swap requests received
    const newSwapRequests = await prisma.swap.count({
      where: {
        receiverId: userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Swaps accepted
    const acceptedSwaps = await prisma.swap.count({
      where: {
        initiatorId: userId,
        status: 'ACCEPTED',
        updatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Swaps completed
    const completedSwaps = await prisma.swap.count({
      where: {
        OR: [{ initiatorId: userId }, { receiverId: userId }],
        status: 'COMPLETED',
        updatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // New messages
    const newMessages = await prisma.message.count({
      where: {
        receiverId: userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Badges earned
    const badgesEarned = await prisma.userBadge.count({
      where: {
        userId,
        earnedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return {
      newSwapRequests,
      acceptedSwaps,
      completedSwaps,
      newMessages,
      badgesEarned,
    };
  }

  /**
   * Collect activity highlights for a user in a date range
   */
  private async collectActivityHighlights(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      type: string;
      title: string;
      message: string;
      time: string;
    }>
  > {
    const highlights: Array<{
      type: string;
      title: string;
      message: string;
      time: string;
    }> = [];

    // Get recent notifications
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5, // Top 5 highlights
    });

    for (const notification of notifications) {
      highlights.push({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        time: this.formatHighlightTime(notification.createdAt),
      });
    }

    return highlights;
  }

  /**
   * Format time for highlights
   */
  private formatHighlightTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return `${diffDays} days ago`;
    }
  }

  /**
   * Send test digest to a user (for testing purposes)
   */
  async sendTestDigest(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { userId },
        select: {
          email: true,
          name: true,
          emailVerified: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.emailVerified) {
        throw new Error('User email not verified');
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days

      await this.sendDigestToUser(userId, user.email, user.name, 'Weekly');

      logger.info(`Sent test digest to user ${userId}`);
    } catch (error) {
      logger.error('Failed to send test digest:', error);
      throw error;
    }
  }
}

export const emailDigestService = new EmailDigestService();
