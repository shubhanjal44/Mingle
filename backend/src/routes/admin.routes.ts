/**
 * Admin Routes
 * API endpoints for admin dashboard and user management
 */

import express from 'express';
import * as adminController from '../controllers/admin.controller';
import * as analyticsController from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// User Management
router.get('/users', adminController.searchUsers);
router.get('/users/:id', adminController.getUserDetails);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.post('/staff', adminController.createStaffUser);

// Subscription Management
router.get('/subscriptions', adminController.getSubscriptions);
router.put('/subscriptions/:userId', adminController.manageSubscription);

// Settings
router.get('/settings', adminController.getSettings);
router.put('/settings/:key', adminController.updateSetting);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

// Analytics
router.get('/analytics/dashboard', analyticsController.getDashboardMetrics);
router.get('/analytics/user-growth', analyticsController.getUserGrowth);
router.get('/analytics/revenue-growth', analyticsController.getRevenueGrowth);
router.get('/analytics/top-users', analyticsController.getTopUsers);
router.get('/analytics/recent-activities', analyticsController.getRecentActivities);

export default router;
