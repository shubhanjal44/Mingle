/**
 * Analytics Controller
 * Handles platform analytics and statistics
 */

import { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';

/**
 * Get dashboard metrics
 * GET /api/v1/admin/analytics/dashboard
 */
export async function getDashboardMetrics(req: Request, res: Response) {
  try {
    const metrics = await analyticsService.getDashboardMetrics();

    return res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to get dashboard metrics',
    });
  }
}

/**
 * Get user growth data
 * GET /api/v1/admin/analytics/user-growth
 */
export async function getUserGrowth(req: Request, res: Response) {
  try {
    const { days } = req.query;
    const data = await analyticsService.getUserGrowthData(
      days ? parseInt(days as string) : undefined
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to get user growth data',
    });
  }
}

/**
 * Get revenue growth data
 * GET /api/v1/admin/analytics/revenue-growth
 */
export async function getRevenueGrowth(req: Request, res: Response) {
  try {
    const { months } = req.query;
    const data = await analyticsService.getRevenueGrowthData(
      months ? parseInt(months as string) : undefined
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to get revenue growth data',
    });
  }
}

/**
 * Get top performing users
 * GET /api/v1/admin/analytics/top-users
 */
export async function getTopUsers(req: Request, res: Response) {
  try {
    const { limit } = req.query;
    const users = await analyticsService.getTopUsers(
      limit ? parseInt(limit as string) : undefined
    );

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to get top users',
    });
  }
}

/**
 * Get recent activities
 * GET /api/v1/admin/analytics/recent-activities
 */
export async function getRecentActivities(req: Request, res: Response) {
  try {
    const { limit } = req.query;
    const activities = await analyticsService.getRecentActivities(
      limit ? parseInt(limit as string) : undefined
    );

    return res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to get recent activities',
    });
  }
}
