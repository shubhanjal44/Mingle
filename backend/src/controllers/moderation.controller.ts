/**
 * Moderation Controller
 * Handles content moderation and user reports
 */

import { Request, Response } from 'express';
import { moderationService } from '../services/moderation.service';

/**
 * Create a report
 * POST /api/v1/moderation/reports
 */
export async function createReport(req: Request, res: Response) {
  try {
    const reporterId = (req as any).user.userId;
    const reportData = req.body;

    const report = await moderationService.createReport({
      reporterId,
      ...reportData,
    });

    return res.status(201).json({
      success: true,
      data: report,
      message: 'Report submitted successfully',
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to create report',
    });
  }
}

/**
 * Get all reports
 * GET /api/v1/moderation/reports
 */
export async function getReports(req: Request, res: Response) {
  try {
    const { status, type, limit, offset } = req.query;

    const result = await moderationService.getReports({
      status: status as any,
      type: type as any,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to get reports',
    });
  }
}

/**
 * Get single report
 * GET /api/v1/moderation/reports/:id
 */
export async function getReport(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const report = await moderationService.getReport(id);

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to get report',
    });
  }
}

/**
 * Update report status
 * PUT /api/v1/moderation/reports/:id/status
 */
export async function updateReportStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body;
    const moderatorId = (req as any).user.userId;

    const report = await moderationService.updateReportStatus(
      id,
      status,
      moderatorId,
      resolution
    );

    return res.status(200).json({
      success: true,
      data: report,
      message: 'Report status updated successfully',
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to update report status',
    });
  }
}

/**
 * Execute moderator action
 * POST /api/v1/moderation/actions
 */
export async function executeAction(req: Request, res: Response) {
  try {
    const moderatorId = (req as any).user.userId;
    const actionData = req.body;

    const action = await moderationService.executeModeratorAction({
      moderatorId,
      ...actionData,
    });

    return res.status(201).json({
      success: true,
      data: action,
      message: 'Moderator action executed successfully',
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to execute action',
    });
  }
}

/**
 * Get moderation statistics
 * GET /api/v1/moderation/stats
 */
export async function getModerationStats(req: Request, res: Response) {
  try {
    const stats = await moderationService.getModerationStats();

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to get moderation stats',
    });
  }
}

/**
 * Get moderator activity
 * GET /api/v1/moderation/moderators/:id/activity
 */
export async function getModeratorActivity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { limit } = req.query;

    const activity = await moderationService.getModeratorActivity(
      id,
      limit ? parseInt(limit as string) : undefined
    );

    return res.status(200).json({
      success: true,
      data: activity,
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to get moderator activity',
    });
  }
}
