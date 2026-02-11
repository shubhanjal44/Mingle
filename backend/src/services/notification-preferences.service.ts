/**
 * Notification Preferences Service
 * Manages user notification preferences
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';
import { NotificationType, DigestFrequency } from '@prisma/client';

interface UpdatePreferencesData {
  // Email Notifications
  emailEnabled?: boolean;
  emailSwapRequest?: boolean;
  emailSwapAccepted?: boolean;
  emailSwapRejected?: boolean;
  emailSwapCompleted?: boolean;
  emailMessage?: boolean;
  emailBadgeEarned?: boolean;
  emailEventReminder?: boolean;
  emailSystem?: boolean;

  // In-App Notifications
  inAppEnabled?: boolean;
  inAppSwapRequest?: boolean;
  inAppSwapAccepted?: boolean;
  inAppSwapRejected?: boolean;
  inAppSwapCompleted?: boolean;
  inAppMessage?: boolean;
  inAppBadgeEarned?: boolean;
  inAppEventReminder?: boolean;
  inAppSystem?: boolean;

  // Email Digest
  digestEnabled?: boolean;
  digestFrequency?: DigestFrequency;
  digestDay?: number;
  digestHour?: number;
}

class NotificationPreferencesService {
  /**
   * Get or create user's notification preferences
   */
  async getPreferences(userId: string) {
    let preferences = await prisma.notificationPreferences.findUnique({
      where: { userId },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId);
    }

    return preferences;
  }

  /**
   * Create default preferences for a new user
   */
  async createDefaultPreferences(userId: string) {
    try {
      return await prisma.notificationPreferences.create({
        data: {
          userId,
          // All defaults are set in the schema
        },
      });
    } catch (error) {
      logger.error('Failed to create default preferences:', error);
      throw error;
    }
  }

  /**
   * Update user's notification preferences
   */
  async updatePreferences(userId: string, data: UpdatePreferencesData) {
    try {
      // Validate digestDay if provided
      if (data.digestDay !== undefined) {
        if (data.digestDay < 0 || data.digestDay > 6) {
          throw new Error('digestDay must be between 0 (Sunday) and 6 (Saturday)');
        }
      }

      // Validate digestHour if provided
      if (data.digestHour !== undefined) {
        if (data.digestHour < 0 || data.digestHour > 23) {
          throw new Error('digestHour must be between 0 and 23');
        }
      }

      // Get or create preferences
      await this.getPreferences(userId);

      // Update preferences
      const preferences = await prisma.notificationPreferences.update({
        where: { userId },
        data,
      });

      logger.info(`Updated notification preferences for user ${userId}`);
      return preferences;
    } catch (error) {
      logger.error('Failed to update preferences:', error);
      throw error;
    }
  }

  /**
   * Check if user wants email notifications for a specific type
   */
  async shouldSendEmail(userId: string, type: NotificationType): Promise<boolean> {
    try {
      const preferences = await this.getPreferences(userId);

      // Check if email notifications are globally enabled
      if (!preferences.emailEnabled) {
        return false;
      }

      // Check type-specific preference
      switch (type) {
        case 'SWAP_REQUEST':
          return preferences.emailSwapRequest;
        case 'SWAP_ACCEPTED':
          return preferences.emailSwapAccepted;
        case 'SWAP_REJECTED':
          return preferences.emailSwapRejected;
        case 'SWAP_COMPLETED':
          return preferences.emailSwapCompleted;
        case 'MESSAGE':
          return preferences.emailMessage;
        case 'BADGE_EARNED':
          return preferences.emailBadgeEarned;
        case 'EVENT_REMINDER':
          return preferences.emailEventReminder;
        case 'SYSTEM':
          return preferences.emailSystem;
        default:
          return false;
      }
    } catch (error) {
      logger.error('Failed to check email preference:', error);
      return false;
    }
  }

  /**
   * Check if user wants in-app notifications for a specific type
   */
  async shouldSendInApp(userId: string, type: NotificationType): Promise<boolean> {
    try {
      const preferences = await this.getPreferences(userId);

      // Check if in-app notifications are globally enabled
      if (!preferences.inAppEnabled) {
        return false;
      }

      // Check type-specific preference
      switch (type) {
        case 'SWAP_REQUEST':
          return preferences.inAppSwapRequest;
        case 'SWAP_ACCEPTED':
          return preferences.inAppSwapAccepted;
        case 'SWAP_REJECTED':
          return preferences.inAppSwapRejected;
        case 'SWAP_COMPLETED':
          return preferences.inAppSwapCompleted;
        case 'MESSAGE':
          return preferences.inAppMessage;
        case 'BADGE_EARNED':
          return preferences.inAppBadgeEarned;
        case 'EVENT_REMINDER':
          return preferences.inAppEventReminder;
        case 'SYSTEM':
          return preferences.inAppSystem;
        default:
          return true; // Default to true for new types
      }
    } catch (error) {
      logger.error('Failed to check in-app preference:', error);
      return true; // Default to true on error
    }
  }

  /**
   * Get all users who should receive daily digest
   */
  async getUsersForDailyDigest(hour: number) {
    return await prisma.notificationPreferences.findMany({
      where: {
        digestEnabled: true,
        digestFrequency: 'DAILY',
        digestHour: hour,
      },
      include: {
        user: {
          select: {
            userId: true,
            email: true,
            name: true,
            emailVerified: true,
          },
        },
      },
    });
  }

  /**
   * Get all users who should receive weekly digest
   */
  async getUsersForWeeklyDigest(dayOfWeek: number, hour: number) {
    return await prisma.notificationPreferences.findMany({
      where: {
        digestEnabled: true,
        digestFrequency: 'WEEKLY',
        digestDay: dayOfWeek,
        digestHour: hour,
      },
      include: {
        user: {
          select: {
            userId: true,
            email: true,
            name: true,
            emailVerified: true,
          },
        },
      },
    });
  }

  /**
   * Get all users who should receive monthly digest
   */
  async getUsersForMonthlyDigest(dayOfMonth: number, hour: number) {
    // Monthly digest is sent on a specific day of the month
    // We'll use digestDay to store the day (1-28 to be safe)
    return await prisma.notificationPreferences.findMany({
      where: {
        digestEnabled: true,
        digestFrequency: 'MONTHLY',
        digestDay: dayOfMonth,
        digestHour: hour,
      },
      include: {
        user: {
          select: {
            userId: true,
            email: true,
            name: true,
            emailVerified: true,
          },
        },
      },
    });
  }

  /**
   * Update last digest sent timestamp
   */
  async updateLastDigestSent(userId: string) {
    try {
      await prisma.notificationPreferences.update({
        where: { userId },
        data: {
          lastDigestSent: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to update last digest sent:', error);
    }
  }

  /**
   * Enable all notifications (useful for onboarding)
   */
  async enableAllNotifications(userId: string) {
    return await this.updatePreferences(userId, {
      emailEnabled: true,
      emailSwapRequest: true,
      emailSwapAccepted: true,
      emailSwapRejected: true,
      emailSwapCompleted: true,
      emailMessage: true,
      emailBadgeEarned: true,
      emailEventReminder: true,
      emailSystem: true,
      inAppEnabled: true,
      inAppSwapRequest: true,
      inAppSwapAccepted: true,
      inAppSwapRejected: true,
      inAppSwapCompleted: true,
      inAppMessage: true,
      inAppBadgeEarned: true,
      inAppEventReminder: true,
      inAppSystem: true,
    });
  }

  /**
   * Disable all notifications (useful for user requests)
   */
  async disableAllNotifications(userId: string) {
    return await this.updatePreferences(userId, {
      emailEnabled: false,
      inAppEnabled: false,
      digestEnabled: false,
    });
  }

  /**
   * Get notification statistics for user
   */
  async getNotificationStats(userId: string) {
    const preferences = await this.getPreferences(userId);

    const emailTypesEnabled = [
      preferences.emailSwapRequest,
      preferences.emailSwapAccepted,
      preferences.emailSwapRejected,
      preferences.emailSwapCompleted,
      preferences.emailMessage,
      preferences.emailBadgeEarned,
      preferences.emailEventReminder,
      preferences.emailSystem,
    ].filter(Boolean).length;

    const inAppTypesEnabled = [
      preferences.inAppSwapRequest,
      preferences.inAppSwapAccepted,
      preferences.inAppSwapRejected,
      preferences.inAppSwapCompleted,
      preferences.inAppMessage,
      preferences.inAppBadgeEarned,
      preferences.inAppEventReminder,
      preferences.inAppSystem,
    ].filter(Boolean).length;

    return {
      emailEnabled: preferences.emailEnabled,
      emailTypesEnabled,
      inAppEnabled: preferences.inAppEnabled,
      inAppTypesEnabled,
      digestEnabled: preferences.digestEnabled,
      digestFrequency: preferences.digestFrequency,
      lastDigestSent: preferences.lastDigestSent,
    };
  }
}

export const notificationPreferencesService = new NotificationPreferencesService();
export type { UpdatePreferencesData };
