/**
 * Admin Controller
 * Handles admin dashboard, user management, and platform administration
 */

import { Request, Response } from 'express';
import { adminService } from '../services/admin.service';
import { analyticsService } from '../services/analytics.service';

/**
 * Get dashboard metrics
 * GET /api/v1/admin/dashboard
 */
export async function getDashboard(req: Request, res: Response) {
  try {
    const metrics = await analyticsService.getDashboardMetrics();
    const quickActions = await adminService.getQuickActions();

    return res.status(200).json({
      success: true,
      data: {
        metrics,
        quickActions,
      },
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to load dashboard',
    });
  }
}

/**
 * Search users
 * GET /api/v1/admin/users
 */
export async function searchUsers(req: Request, res: Response) {
  try {
    const {
      query,
      role,
      status,
      tier,
      city,
      state,
      verifiedOnly,
      limit,
      offset,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await adminService.searchUsers({
      query: query as string,
      role: role as any,
      status: status as any,
      tier: tier as any,
      city: city as string,
      state: state as string,
      verifiedOnly: verifiedOnly === 'true',
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to search users',
    });
  }
}

/**
 * Get user details
 * GET /api/v1/admin/users/:id
 */
export async function getUserDetails(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = await adminService.getUserDetails(id);

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to get user details',
    });
  }
}

/**
 * Update user
 * PUT /api/v1/admin/users/:id
 */
export async function updateUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const adminId = (req as any).user.userId;
    const updates = req.body;

    const user = await adminService.updateUser(id, adminId, updates);

    return res.status(200).json({
      success: true,
      data: user,
      message: 'User updated successfully',
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to update user',
    });
  }
}

/**
 * Delete user
 * DELETE /api/v1/admin/users/:id
 */
export async function deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = (req as any).user.userId;

    const result = await adminService.deleteUser(id, adminId, reason);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to delete user',
    });
  }
}

/**
 * Create staff user (Admin/Moderator)
 * POST /api/v1/admin/staff
 */
export async function createStaffUser(req: Request, res: Response) {
  try {
    const { email, password, name, role } = req.body;
    const createdBy = (req as any).user.userId;

    const user = await adminService.createStaffUser({
      email,
      password,
      name,
      role,
      createdBy,
    });

    return res.status(201).json({
      success: true,
      data: user,
      message: 'Staff user created successfully',
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to create staff user',
    });
  }
}

/**
 * Get all subscriptions
 * GET /api/v1/admin/subscriptions
 */
export async function getSubscriptions(req: Request, res: Response) {
  try {
    const { tier, status, limit, offset } = req.query;

    const result = await adminService.getSubscriptions({
      tier: tier as any,
      status: status as any,
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
      message: error.message || 'Failed to get subscriptions',
    });
  }
}

/**
 * Manage user subscription
 * PUT /api/v1/admin/subscriptions/:userId
 */
export async function manageSubscription(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { tier, status, autoRenew, note } = req.body;
    const adminId = (req as any).user.userId;

    const subscription = await adminService.manageSubscription(adminId, {
      userId,
      tier,
      status,
      autoRenew,
      note,
    });

    return res.status(200).json({
      success: true,
      data: subscription,
      message: 'Subscription updated successfully',
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to manage subscription',
    });
  }
}

/**
 * Get platform settings
 * GET /api/v1/admin/settings
 */
export async function getSettings(req: Request, res: Response) {
  try {
    const { category } = req.query;
    const settings = await adminService.getSettings(category as string);

    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to get settings',
    });
  }
}

/**
 * Update platform setting
 * PUT /api/v1/admin/settings/:key
 */
export async function updateSetting(req: Request, res: Response) {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    const adminId = (req as any).user.userId;

    const setting = await adminService.updateSetting(key, value, adminId, description);

    return res.status(200).json({
      success: true,
      data: setting,
      message: 'Setting updated successfully',
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to update setting',
    });
  }
}

/**
 * Get audit logs
 * GET /api/v1/admin/audit-logs
 */
export async function getAuditLogs(req: Request, res: Response) {
  try {
    const { userId, action, resource, limit, offset } = req.query;

    const result = await adminService.getAuditLogs({
      userId: userId as string,
      action: action as string,
      resource: resource as string,
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
      message: error.message || 'Failed to get audit logs',
    });
  }
}
