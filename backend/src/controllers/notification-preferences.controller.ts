/**
 * Notification Preferences Controller
 * Handles user notification preference management
 */

import { Request, Response } from 'express';
import { notificationPreferencesService } from '../services/notification-preferences.service';
import { logger } from '../utils/logger';

/**
 * GET /api/v1/notifications/preferences
 * Get user's notification preferences
 */
export async function getPreferences(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;

    const preferences = await notificationPreferencesService.getPreferences(userId);
    const stats = await notificationPreferencesService.getNotificationStats(userId);

    return res.status(200).json({
      success: true,
      data: {
        preferences,
        stats,
      },
    });
  } catch (error: any) {
    logger.error('Get preferences error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to get notification preferences',
    });
  }
}

/**
 * PUT /api/v1/notifications/preferences
 * Update user's notification preferences
 */
export async function updatePreferences(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const updates = req.body;

    // Validate digest settings
    if (updates.digestDay !== undefined) {
      const day = parseInt(updates.digestDay);
      if (isNaN(day) || day < 0 || day > 6) {
        return res.status(400).json({
          error: 'digestDay must be between 0 (Sunday) and 6 (Saturday)',
        });
      }
      updates.digestDay = day;
    }

    if (updates.digestHour !== undefined) {
      const hour = parseInt(updates.digestHour);
      if (isNaN(hour) || hour < 0 || hour > 23) {
        return res.status(400).json({
          error: 'digestHour must be between 0 and 23',
        });
      }
      updates.digestHour = hour;
    }

    const preferences = await notificationPreferencesService.updatePreferences(
      userId,
      updates
    );

    return res.status(200).json({
      success: true,
      data: preferences,
      message: 'Notification preferences updated successfully',
    });
  } catch (error: any) {
    logger.error('Update preferences error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to update notification preferences',
    });
  }
}

/**
 * POST /api/v1/notifications/preferences/enable-all
 * Enable all notification types
 */
export async function enableAllNotifications(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;

    const preferences = await notificationPreferencesService.enableAllNotifications(userId);

    return res.status(200).json({
      success: true,
      data: preferences,
      message: 'All notifications enabled successfully',
    });
  } catch (error: any) {
    logger.error('Enable all notifications error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to enable all notifications',
    });
  }
}

/**
 * POST /api/v1/notifications/preferences/disable-all
 * Disable all notification types
 */
export async function disableAllNotifications(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;

    const preferences = await notificationPreferencesService.disableAllNotifications(userId);

    return res.status(200).json({
      success: true,
      data: preferences,
      message: 'All notifications disabled successfully',
    });
  } catch (error: any) {
    logger.error('Disable all notifications error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to disable all notifications',
    });
  }
}

/**
 * POST /api/v1/notifications/preferences/reset
 * Reset preferences to defaults
 */
export async function resetToDefaults(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;

    // Delete existing preferences (will be recreated with defaults on next get)
    await notificationPreferencesService.updatePreferences(userId, {
      emailEnabled: true,
      emailSwapRequest: true,
      emailSwapAccepted: true,
      emailSwapRejected: false,
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
      digestEnabled: false,
      digestFrequency: 'WEEKLY',
      digestDay: 1, // Monday
      digestHour: 9,
    });

    const preferences = await notificationPreferencesService.getPreferences(userId);

    return res.status(200).json({
      success: true,
      data: preferences,
      message: 'Preferences reset to defaults successfully',
    });
  } catch (error: any) {
    logger.error('Reset preferences error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to reset preferences',
    });
  }
}

/**
 * GET /api/v1/notifications/preferences/stats
 * Get notification statistics
 */
export async function getNotificationStats(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;

    const stats = await notificationPreferencesService.getNotificationStats(userId);

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Get notification stats error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to get notification statistics',
    });
  }
}
