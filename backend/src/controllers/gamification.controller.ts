/**
 * Gamification Controller
 * Handles XP, levels, coins, badges, and leaderboards
 */

import { Request, Response } from 'express';
import { gamificationService } from '../services/gamification.service';
import { logger } from '../utils/logger';

/**
 * Get user's gamification stats
 * GET /api/v1/gamification/stats/:userId?
 */
export async function getUserStats(req: Request, res: Response) {
  try {
    // Use userId from params or from authenticated user
    const userId = req.params.userId || (req as any).user?.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const stats = await gamificationService.getUserStats(userId);

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Get user stats error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch user stats',
    });
  }
}

/**
 * Award XP to a user (Admin/System only)
 * POST /api/v1/gamification/xp
 * Body: { userId, amount, reason }
 */
export async function awardXPToUser(req: Request, res: Response) {
  try {
    const { userId, amount, reason } = req.body;

    if (!userId || !amount || !reason) {
      return res.status(400).json({
        error: 'userId, amount, and reason are required',
      });
    }

    if (amount <= 0 || amount > 1000) {
      return res.status(400).json({
        error: 'Amount must be between 1 and 1000',
      });
    }

    const result = await gamificationService.awardXP(userId, amount, reason);

    // Check for new badges after XP award
    if (result.leveledUp) {
      await gamificationService.checkAndAwardBadges(userId);
    }

    return res.status(200).json({
      success: true,
      data: result,
      message: result.leveledUp
        ? `User leveled up to level ${result.newLevel}!`
        : `Awarded ${amount} XP`,
    });
  } catch (error: any) {
    logger.error('Award XP error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to award XP',
    });
  }
}

/**
 * Award coins to a user
 * POST /api/v1/gamification/coins/award
 * Body: { userId, amount, reason }
 */
export async function awardCoinsToUser(req: Request, res: Response) {
  try {
    const { userId, amount, reason } = req.body;

    if (!userId || !amount || !reason) {
      return res.status(400).json({
        error: 'userId, amount, and reason are required',
      });
    }

    if (amount <= 0 || amount > 10000) {
      return res.status(400).json({
        error: 'Amount must be between 1 and 10000',
      });
    }

    const result = await gamificationService.awardCoins(userId, amount, reason);

    // Check for coin-based badges
    await gamificationService.checkAndAwardBadges(userId);

    return res.status(200).json({
      success: true,
      data: result,
      message: `Awarded ${amount} coins`,
    });
  } catch (error: any) {
    logger.error('Award coins error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to award coins',
    });
  }
}

/**
 * Deduct coins from a user
 * POST /api/v1/gamification/coins/deduct
 * Body: { userId, amount, reason }
 */
export async function deductCoinsFromUser(req: Request, res: Response) {
  try {
    const { userId, amount, reason } = req.body;

    if (!userId || !amount || !reason) {
      return res.status(400).json({
        error: 'userId, amount, and reason are required',
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: 'Amount must be greater than 0',
      });
    }

    const result = await gamificationService.deductCoins(userId, amount, reason);

    return res.status(200).json({
      success: true,
      data: result,
      message: `Deducted ${amount} coins`,
    });
  } catch (error: any) {
    logger.error('Deduct coins error:', error);

    if (error.message === 'Insufficient coins') {
      return res.status(400).json({ error: 'Insufficient coins' });
    }

    return res.status(500).json({
      error: error.message || 'Failed to deduct coins',
    });
  }
}

/**
 * Check and award badges for a user
 * POST /api/v1/gamification/badges/check
 * Body: { userId }
 */
export async function checkUserBadges(req: Request, res: Response) {
  try {
    const userId = req.body.userId || (req as any).user?.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const newlyEarnedBadges = await gamificationService.checkAndAwardBadges(userId);

    return res.status(200).json({
      success: true,
      data: {
        newBadgesCount: newlyEarnedBadges.length,
        badges: newlyEarnedBadges,
      },
      message:
        newlyEarnedBadges.length > 0
          ? `Earned ${newlyEarnedBadges.length} new badge(s)!`
          : 'No new badges earned',
    });
  } catch (error: any) {
    logger.error('Check badges error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to check badges',
    });
  }
}

/**
 * Get leaderboard
 * GET /api/v1/gamification/leaderboard/:metric?limit=10
 * Metrics: level, coins, rating, swaps, hoursTaught
 */
export async function getLeaderboard(req: Request, res: Response) {
  try {
    const metric = req.params.metric as
      | 'level'
      | 'coins'
      | 'rating'
      | 'swaps'
      | 'hoursTaught';
    const limit = parseInt(req.query.limit as string) || 10;

    if (!metric) {
      return res.status(400).json({ error: 'Metric is required' });
    }

    const validMetrics = ['level', 'coins', 'rating', 'swaps', 'hoursTaught'];
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({
        error: `Invalid metric. Must be one of: ${validMetrics.join(', ')}`,
      });
    }

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        error: 'Limit must be between 1 and 100',
      });
    }

    const leaderboard = await gamificationService.getLeaderboard(metric, limit);

    return res.status(200).json({
      success: true,
      data: {
        metric,
        limit,
        leaderboard,
      },
    });
  } catch (error: any) {
    logger.error('Get leaderboard error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch leaderboard',
    });
  }
}

/**
 * Get user's rank in a specific leaderboard
 * GET /api/v1/gamification/rank/:metric/:userId?
 * Metrics: level, coins, rating, swaps, hoursTaught
 */
export async function getUserRank(req: Request, res: Response) {
  try {
    const metric = req.params.metric as
      | 'level'
      | 'coins'
      | 'rating'
      | 'swaps'
      | 'hoursTaught';
    const userId = req.params.userId || (req as any).user?.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!metric) {
      return res.status(400).json({ error: 'Metric is required' });
    }

    const validMetrics = ['level', 'coins', 'rating', 'swaps', 'hoursTaught'];
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({
        error: `Invalid metric. Must be one of: ${validMetrics.join(', ')}`,
      });
    }

    const rankData = await gamificationService.getUserRank(userId, metric);

    return res.status(200).json({
      success: true,
      data: rankData,
    });
  } catch (error: any) {
    logger.error('Get user rank error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch user rank',
    });
  }
}

/**
 * Get XP levels information
 * GET /api/v1/gamification/levels
 * Returns XP required for levels 1-50
 */
export async function getLevelsInfo(req: Request, res: Response) {
  try {
    const maxLevel = parseInt(req.query.maxLevel as string) || 50;

    if (maxLevel < 1 || maxLevel > 100) {
      return res.status(400).json({
        error: 'maxLevel must be between 1 and 100',
      });
    }

    const levels = [];
    for (let level = 1; level <= maxLevel; level++) {
      levels.push({
        level,
        xpRequired: gamificationService.XP_PER_LEVEL(level),
        totalXP: gamificationService.TOTAL_XP_FOR_LEVEL(level),
      });
    }

    return res.status(200).json({
      success: true,
      data: levels,
    });
  } catch (error: any) {
    logger.error('Get levels info error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch levels info',
    });
  }
}

/**
 * Get user's transaction history (coins awarded/deducted)
 * This would require a new CoinTransaction model to track history
 * For now, returning a placeholder
 * GET /api/v1/gamification/transactions/:userId?
 */
export async function getCoinTransactions(req: Request, res: Response) {
  try {
    const userId = req.params.userId || (req as any).user?.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // TODO: Implement coin transaction history when model is added
    // For now, return empty array
    return res.status(200).json({
      success: true,
      data: {
        transactions: [],
        message: 'Transaction history coming soon',
      },
    });
  } catch (error: any) {
    logger.error('Get coin transactions error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch transactions',
    });
  }
}
