/**
 * Gamification Routes
 * Routes for XP, levels, coins, badges, and leaderboards
 */

import express from 'express';
import * as gamificationController from '../controllers/gamification.controller';
import { authenticate } from '../middleware/auth';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

// Rate limiting for gamification endpoints
const gamificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
});

// Apply rate limiting to all routes
router.use(gamificationLimiter);

/**
 * Public Routes
 */

// Get levels information (XP requirements)
router.get('/levels', gamificationController.getLevelsInfo);

// Get leaderboard by metric
router.get('/leaderboard/:metric', gamificationController.getLeaderboard);

/**
 * Protected Routes (Require Authentication)
 */

// Get user's gamification stats
router.get(
  '/stats/:userId?',
  authenticate,
  gamificationController.getUserStats
);

// Get user's rank in leaderboard
router.get(
  '/rank/:metric/:userId?',
  authenticate,
  gamificationController.getUserRank
);

// Check and award badges
router.post(
  '/badges/check',
  authenticate,
  gamificationController.checkUserBadges
);

// Get coin transaction history
router.get(
  '/transactions/:userId?',
  authenticate,
  gamificationController.getCoinTransactions
);

/**
 * Admin/System Routes
 * These should be protected with admin middleware in production
 */

// Award XP to user
router.post(
  '/xp',
  authenticate,
  // TODO: Add admin middleware
  gamificationController.awardXPToUser
);

// Award coins to user
router.post(
  '/coins/award',
  authenticate,
  // TODO: Add admin middleware
  gamificationController.awardCoinsToUser
);

// Deduct coins from user
router.post(
  '/coins/deduct',
  authenticate,
  // TODO: Add admin middleware
  gamificationController.deductCoinsFromUser
);

export default router;
