/**
 * Performance Monitoring Routes
 * API endpoints for performance metrics
 */

import express from 'express';
import { performanceController } from '../controllers/performance.controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';

const router = express.Router();

/**
 * @route   GET /api/v1/performance/health
 * @desc    Get system health status (public endpoint)
 * @access  Public
 */
router.get('/health', performanceController.getHealth);

/**
 * @route   GET /api/v1/performance/stats
 * @desc    Get performance statistics
 * @access  Admin
 */
router.get('/stats', authenticate, requireAdmin, performanceController.getStats);

/**
 * @route   GET /api/v1/performance/cache
 * @desc    Get cache statistics
 * @access  Admin
 */
router.get('/cache', authenticate, requireAdmin, performanceController.getCacheStats);

/**
 * @route   GET /api/v1/performance/metrics
 * @desc    Get detailed metrics
 * @access  Admin
 */
router.get('/metrics', authenticate, requireAdmin, performanceController.getDetailedMetrics);

/**
 * @route   DELETE /api/v1/performance/metrics
 * @desc    Clear performance metrics
 * @access  Admin
 */
router.delete('/metrics', authenticate, requireAdmin, performanceController.clearMetrics);

/**
 * @route   DELETE /api/v1/performance/cache
 * @desc    Clear cache (optionally by pattern)
 * @access  Admin
 */
router.delete('/cache', authenticate, requireAdmin, performanceController.clearCache);

/**
 * @route   POST /api/v1/performance/cache/warmup
 * @desc    Warm up cache
 * @access  Admin
 */
router.post('/cache/warmup', authenticate, requireAdmin, performanceController.warmupCache);

export default router;
