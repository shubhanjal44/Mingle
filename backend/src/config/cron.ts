/**
 * Cron Jobs Configuration
 * Scheduled tasks for the application
 *
 * Prerequisites:
 * npm install node-cron @types/node-cron
 */

import { logger } from '../utils/logger';
import { emailDigestService } from '../services/email-digest.service';

// Optional: node-cron dependency
let cron: any;
try {
  cron = require('node-cron');
} catch (error) {
  logger.warn('node-cron not installed. Cron jobs will not run. Install with: npm install node-cron @types/node-cron');
}

/**
 * Initialize all cron jobs
 */
export function initializeCronJobs() {
  if (!cron) {
    logger.warn('Cron jobs not initialized: node-cron package not installed');
    return;
  }

  logger.info('Initializing cron jobs...');

  // Daily digest - runs every hour to check if users need daily digest
  // This checks for users who have set their digest hour to the current hour
  cron.schedule('0 * * * *', async () => {
    logger.info('Running daily digest cron job');
    try {
      await emailDigestService.sendDailyDigests();
    } catch (error) {
      logger.error('Daily digest cron job failed:', error);
    }
  });

  // Weekly digest - runs every hour to check if users need weekly digest
  // This checks for users who have set their digest day and hour to current values
  cron.schedule('0 * * * *', async () => {
    logger.info('Running weekly digest cron job');
    try {
      await emailDigestService.sendWeeklyDigests();
    } catch (error) {
      logger.error('Weekly digest cron job failed:', error);
    }
  });

  // Monthly digest - runs every hour to check if users need monthly digest
  // This checks for users who have set their digest day and hour to current values
  cron.schedule('0 * * * *', async () => {
    logger.info('Running monthly digest cron job');
    try {
      await emailDigestService.sendMonthlyDigests();
    } catch (error) {
      logger.error('Monthly digest cron job failed:', error);
    }
  });

  // Cleanup old notifications - runs daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('Running notification cleanup cron job');
    try {
      const { notificationService } = await import('../services/notification.service');
      const deleted = await notificationService.deleteOldNotifications(30); // 30 days old
      logger.info(`Cleaned up ${deleted} old notifications`);
    } catch (error) {
      logger.error('Notification cleanup cron job failed:', error);
    }
  });

  logger.info('Cron jobs initialized successfully');
}

/**
 * Cron schedule format:
 * ┌────────────── second (optional, 0-59)
 * │ ┌──────────── minute (0-59)
 * │ │ ┌────────── hour (0-23)
 * │ │ │ ┌──────── day of month (1-31)
 * │ │ │ │ ┌────── month (1-12 or names)
 * │ │ │ │ │ ┌──── day of week (0-7 or names, 0 or 7 are Sunday)
 * │ │ │ │ │ │
 * * * * * * *
 *
 * Examples:
 * '0 * * * *'    - every hour at minute 0
 * '0 0 * * *'    - every day at midnight
 * '0 2 * * *'    - every day at 2 AM
 * '0 0 * * 0'    - every Sunday at midnight
 * '0 0 1 * *'    - first day of every month at midnight
 */
