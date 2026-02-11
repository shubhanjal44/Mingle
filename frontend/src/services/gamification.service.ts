/**
 * Gamification Service
 * Handles XP, levels, coins, badges, and leaderboards
 */

import api from './api';

// Types
export interface UserStats {
  coins: number;
  level: number;
  experiencePoints: number;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  progressPercentage: number;
  rating: number;
  completedSwaps: number;
  totalHoursTaught: number;
  totalHoursLearned: number;
  badges: Badge[];
}

export interface Badge {
  badgeId: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string | null;
  level: number;
  coins: number;
  rating: number;
  completedSwaps: number;
  totalHoursTaught: number;
  totalHoursLearned: number;
  experiencePoints: number;
  city: string | null;
  state: string | null;
}

export interface RankData {
  rank: number;
  metricValue: number;
  metric: string;
}

export interface LevelInfo {
  level: number;
  xpRequired: number;
  totalXP: number;
}

export interface AwardXPResponse {
  newXP: number;
  newLevel: number;
  leveledUp: boolean;
}

export interface AwardCoinsResponse {
  amount: number;
  reason: string;
}

export interface CheckBadgesResponse {
  newBadgesCount: number;
  badges: Array<{
    badgeId: string;
    name: string;
    description: string;
    icon: string;
    criteria: string;
    threshold: number;
  }>;
}

/**
 * Get user's gamification stats
 */
export async function getUserStats(userId?: string): Promise<UserStats> {
  const url = userId ? `/gamification/stats/${userId}` : '/gamification/stats';
  const response = await api.get(url);
  return response.data.data;
}

/**
 * Get leaderboard by metric
 */
export async function getLeaderboard(
  metric: 'level' | 'coins' | 'rating' | 'swaps' | 'hoursTaught',
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  const response = await api.get(`/gamification/leaderboard/${metric}`, {
    params: { limit },
  });
  return response.data.data.leaderboard;
}

/**
 * Get user's rank in a specific leaderboard
 */
export async function getUserRank(
  metric: 'level' | 'coins' | 'rating' | 'swaps' | 'hoursTaught',
  userId?: string
): Promise<RankData> {
  const url = userId
    ? `/gamification/rank/${metric}/${userId}`
    : `/gamification/rank/${metric}`;
  const response = await api.get(url);
  return response.data.data;
}

/**
 * Check and award badges for user
 */
export async function checkAndAwardBadges(userId?: string): Promise<CheckBadgesResponse> {
  const response = await api.post('/gamification/badges/check', { userId });
  return response.data.data;
}

/**
 * Get levels information
 */
export async function getLevelsInfo(maxLevel: number = 50): Promise<LevelInfo[]> {
  const response = await api.get('/gamification/levels', {
    params: { maxLevel },
  });
  return response.data.data;
}

/**
 * Award XP to a user (Admin/System)
 */
export async function awardXP(
  userId: string,
  amount: number,
  reason: string
): Promise<AwardXPResponse> {
  const response = await api.post('/gamification/xp', {
    userId,
    amount,
    reason,
  });
  return response.data.data;
}

/**
 * Award coins to a user (Admin/System)
 */
export async function awardCoins(
  userId: string,
  amount: number,
  reason: string
): Promise<AwardCoinsResponse> {
  const response = await api.post('/gamification/coins/award', {
    userId,
    amount,
    reason,
  });
  return response.data.data;
}

/**
 * Deduct coins from a user (Admin/System)
 */
export async function deductCoins(
  userId: string,
  amount: number,
  reason: string
): Promise<AwardCoinsResponse> {
  const response = await api.post('/gamification/coins/deduct', {
    userId,
    amount,
    reason,
  });
  return response.data.data;
}

/**
 * Get coin transaction history
 */
export async function getCoinTransactions(userId?: string): Promise<any[]> {
  const url = userId
    ? `/gamification/transactions/${userId}`
    : '/gamification/transactions';
  const response = await api.get(url);
  return response.data.data.transactions;
}

/**
 * Format XP for display (e.g., 1,234 XP)
 */
export function formatXP(xp: number): string {
  return `${xp.toLocaleString()} XP`;
}

/**
 * Format coins for display (e.g., 1,234 coins)
 */
export function formatCoins(coins: number): string {
  if (coins >= 1000000) {
    return `${(coins / 1000000).toFixed(1)}M coins`;
  } else if (coins >= 1000) {
    return `${(coins / 1000).toFixed(1)}K coins`;
  }
  return `${coins.toLocaleString()} coins`;
}

/**
 * Get level color based on level number
 */
export function getLevelColor(level: number): string {
  if (level >= 50) return 'text-purple-600';
  if (level >= 30) return 'text-red-600';
  if (level >= 20) return 'text-orange-600';
  if (level >= 10) return 'text-blue-600';
  return 'text-green-600';
}

/**
 * Get level badge based on level number
 */
export function getLevelBadge(level: number): string {
  if (level >= 50) return '👑'; // King
  if (level >= 30) return '💎'; // Diamond
  if (level >= 20) return '🏆'; // Trophy
  if (level >= 10) return '⭐'; // Star
  return '🌟'; // Sparkle
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(current: number, needed: number): number {
  return Math.floor((current / needed) * 100);
}

const gamificationService = {
  getUserStats,
  getLeaderboard,
  getUserRank,
  checkAndAwardBadges,
  getLevelsInfo,
  awardXP,
  awardCoins,
  deductCoins,
  getCoinTransactions,
  formatXP,
  formatCoins,
  getLevelColor,
  getLevelBadge,
  calculateProgress,
};

export default gamificationService;
