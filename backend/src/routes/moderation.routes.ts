/**
 * Moderation Routes
 * API endpoints for content moderation and reports
 */

import express from 'express';
import * as moderationController from '../controllers/moderation.controller';
import { authenticate } from '../middleware/auth';
import { requireModerator } from '../middleware/admin';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Users can create reports (authenticated users only)
router.post('/reports', moderationController.createReport);

// Moderator-only routes
router.get('/reports', requireModerator, moderationController.getReports);
router.get('/reports/:id', requireModerator, moderationController.getReport);
router.put('/reports/:id/status', requireModerator, moderationController.updateReportStatus);
router.post('/actions', requireModerator, moderationController.executeAction);
router.get('/stats', requireModerator, moderationController.getModerationStats);
router.get('/moderators/:id/activity', requireModerator, moderationController.getModeratorActivity);

export default router;
