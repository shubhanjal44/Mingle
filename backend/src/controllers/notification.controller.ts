import { Router } from 'express';
import { query, param } from 'express-validator';
import { notificationService } from '../services/notification.service';
import { authenticate } from '../middleware/auth';
import * as notificationPreferencesController from './notification-preferences.controller';
import { Request, Response, NextFunction } from 'express';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/notifications
 * Get user's notifications
 */
router.get(
  '/',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { limit = 20, offset = 0 } = req.query;

      const notifications = await notificationService.getUserNotifications(
        userId,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      const unreadCount = await notificationService.getUnreadCount(userId);

      res.json({
        success: true,
        data: {
          notifications,
          unreadCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const count = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const success = await notificationService.markAsRead(id, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/notifications/mark-all-read
 * Mark all notifications as read
 */
router.put('/mark-all-read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const count = await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: `${count} notifications marked as read`,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Notification Preferences Routes
 */

// GET /api/v1/notifications/preferences
router.get('/preferences', notificationPreferencesController.getPreferences);

// PUT /api/v1/notifications/preferences
router.put('/preferences', notificationPreferencesController.updatePreferences);

// POST /api/v1/notifications/preferences/enable-all
router.post(
  '/preferences/enable-all',
  notificationPreferencesController.enableAllNotifications
);

// POST /api/v1/notifications/preferences/disable-all
router.post(
  '/preferences/disable-all',
  notificationPreferencesController.disableAllNotifications
);

// POST /api/v1/notifications/preferences/reset
router.post('/preferences/reset', notificationPreferencesController.resetToDefaults);

// GET /api/v1/notifications/preferences/stats
router.get('/preferences/stats', notificationPreferencesController.getNotificationStats);

export default router;
