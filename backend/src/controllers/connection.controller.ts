/**
 * Connection Controller
 * Handles HTTP requests for connection management
 */

import { Request, Response } from 'express';
import { connectionService } from '../services/connection.service';
import { logger } from '../utils/logger';

/**
 * Create a connection (follow a user)
 * POST /api/v1/connections/:userId
 */
export async function createConnection(req: Request, res: Response) {
  try {
    const currentUserId = (req as any).user.userId;
    const { userId: targetUserId } = req.params;

    const connection = await connectionService.createConnection(
      currentUserId,
      targetUserId
    );

    return res.status(201).json({
      success: true,
      message: 'Successfully connected',
      data: connection,
    });
  } catch (error: any) {
    logger.error('Create connection error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create connection',
    });
  }
}

/**
 * Remove a connection (unfollow a user)
 * DELETE /api/v1/connections/:userId
 */
export async function removeConnection(req: Request, res: Response) {
  try {
    const currentUserId = (req as any).user.userId;
    const { userId: targetUserId } = req.params;

    await connectionService.removeConnection(currentUserId, targetUserId);

    return res.status(200).json({
      success: true,
      message: 'Successfully disconnected',
    });
  } catch (error: any) {
    logger.error('Remove connection error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to remove connection',
    });
  }
}

/**
 * Get user's connections (users they are following)
 * GET /api/v1/connections/following/:userId?
 */
export async function getUserConnections(req: Request, res: Response) {
  try {
    const currentUserId = (req as any).user.userId;
    const { userId } = req.params;
    const targetUserId = userId || currentUserId;

    const connections = await connectionService.getUserConnections(targetUserId);

    return res.status(200).json({
      success: true,
      data: connections,
    });
  } catch (error: any) {
    logger.error('Get connections error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to get connections',
    });
  }
}

/**
 * Get user's followers (users who are following them)
 * GET /api/v1/connections/followers/:userId?
 */
export async function getUserFollowers(req: Request, res: Response) {
  try {
    const currentUserId = (req as any).user.userId;
    const { userId } = req.params;
    const targetUserId = userId || currentUserId;

    const followers = await connectionService.getUserFollowers(targetUserId);

    return res.status(200).json({
      success: true,
      data: followers,
    });
  } catch (error: any) {
    logger.error('Get followers error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to get followers',
    });
  }
}

/**
 * Check if connected to a user
 * GET /api/v1/connections/check/:userId
 */
export async function checkConnection(req: Request, res: Response) {
  try {
    const currentUserId = (req as any).user.userId;
    const { userId: targetUserId } = req.params;

    const isConnected = await connectionService.isConnected(
      currentUserId,
      targetUserId
    );

    const areMutual = await connectionService.areMutuallyConnected(
      currentUserId,
      targetUserId
    );

    return res.status(200).json({
      success: true,
      data: {
        isConnected,
        isMutual: areMutual,
      },
    });
  } catch (error: any) {
    logger.error('Check connection error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to check connection',
    });
  }
}

/**
 * Get mutual connections with a user
 * GET /api/v1/connections/mutual/:userId
 */
export async function getMutualConnections(req: Request, res: Response) {
  try {
    const currentUserId = (req as any).user.userId;
    const { userId: targetUserId } = req.params;

    const mutualConnections = await connectionService.getMutualConnections(
      currentUserId,
      targetUserId
    );

    return res.status(200).json({
      success: true,
      data: mutualConnections,
    });
  } catch (error: any) {
    logger.error('Get mutual connections error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to get mutual connections',
    });
  }
}

/**
 * Get connection statistics
 * GET /api/v1/connections/stats/:userId?
 */
export async function getConnectionStats(req: Request, res: Response) {
  try {
    const currentUserId = (req as any).user.userId;
    const { userId } = req.params;
    const targetUserId = userId || currentUserId;

    const stats = await connectionService.getConnectionStats(targetUserId);

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Get connection stats error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to get connection stats',
    });
  }
}

/**
 * Get suggested connections
 * GET /api/v1/connections/suggestions
 */
export async function getSuggestedConnections(req: Request, res: Response) {
  try {
    const currentUserId = (req as any).user.userId;
    const { limit } = req.query;

    const suggestions = await connectionService.getSuggestedConnections(
      currentUserId,
      limit ? parseInt(limit as string) : 10
    );

    return res.status(200).json({
      success: true,
      data: suggestions,
    });
  } catch (error: any) {
    logger.error('Get suggested connections error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to get suggested connections',
    });
  }
}

/**
 * Search for users to connect with
 * GET /api/v1/connections/search
 */
export async function searchUsers(req: Request, res: Response) {
  try {
    const currentUserId = (req as any).user.userId;
    const { q, city, state, skillId, limit } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters',
      });
    }

    const filters: any = {};
    if (city) filters.city = city as string;
    if (state) filters.state = state as string;
    if (skillId) filters.skillId = skillId as string;

    const users = await connectionService.searchUsers(
      currentUserId,
      q.trim(),
      filters,
      limit ? parseInt(limit as string) : 20
    );

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    logger.error('Search users error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to search users',
    });
  }
}
