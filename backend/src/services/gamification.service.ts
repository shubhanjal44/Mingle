/**
 * Gamification Service
 * Handles XP, levels, coins, and badges
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// XP required for each level (exponential growth)
const XP_PER_LEVEL = (level: number): number => {
  return Math.floor(100 * Math.pow(1.5, level - 1));
};

// Total XP required to reach a level
const TOTAL_XP_FOR_LEVEL = (level: number): number => {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += XP_PER_LEVEL(i);
  }
  return total;
};

/**
 * Award XP to a user and handle level ups
 */
export async function awardXP(userId: string, amount: number, reason: string) {
  const user = await prisma.user.findUnique({
    where: { userId },
    select: { experiencePoints: true, level: true, name: true },
  });

  if (!user) throw new Error('User not found');

  const newXP = user.experiencePoints + amount;
  let newLevel = user.level;

  // Calculate new level
  while (newXP >= TOTAL_XP_FOR_LEVEL(newLevel + 1)) {
    newLevel++;
  }

  const leveledUp = newLevel > user.level;

  // Update user
  await prisma.user.update({
    where: { userId },
    data: {
      experiencePoints: newXP,
      level: newLevel,
    },
  });

  logger.info(`Awarded ${amount} XP to ${user.name} for: ${reason}`);

  // If leveled up, send notification and award bonus coins
  if (leveledUp) {
    const bonusCoins = newLevel * 10; // 10 coins per level
    await awardCoins(userId, bonusCoins, `Level ${newLevel} bonus`);

    // Send level up notification
    await prisma.notification.create({
      data: {
        userId,
        type: 'SYSTEM',
        title: `Level Up! 🎉`,
        message: `Congratulations! You've reached level ${newLevel} and earned ${bonusCoins} bonus coins!`,
        data: { level: newLevel, bonusCoins },
      },
    });

    logger.info(`${user.name} leveled up to level ${newLevel}!`);
  }

  return { newXP, newLevel, leveledUp };
}

/**
 * Award coins to a user
 */
export async function awardCoins(userId: string, amount: number, reason: string) {
  await prisma.user.update({
    where: { userId },
    data: {
      coins: { increment: amount },
    },
  });

  logger.info(`Awarded ${amount} coins to user ${userId} for: ${reason}`);

  return { amount, reason };
}

/**
 * Deduct coins from a user
 */
export async function deductCoins(userId: string, amount: number, reason: string) {
  const user = await prisma.user.findUnique({
    where: { userId },
    select: { coins: true },
  });

  if (!user) throw new Error('User not found');
  if (user.coins < amount) throw new Error('Insufficient coins');

  await prisma.user.update({
    where: { userId },
    data: {
      coins: { decrement: amount },
    },
  });

  logger.info(`Deducted ${amount} coins from user ${userId} for: ${reason}`);

  return { amount, reason };
}

/**
 * Get user's gamification stats
 */
export async function getUserStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { userId },
    select: {
      coins: true,
      level: true,
      experiencePoints: true,
      rating: true,
      completedSwaps: true,
      totalHoursTaught: true,
      totalHoursLearned: true,
    },
  });

  if (!user) throw new Error('User not found');

  const currentLevelXP = TOTAL_XP_FOR_LEVEL(user.level);
  const nextLevelXP = TOTAL_XP_FOR_LEVEL(user.level + 1);
  const xpInCurrentLevel = user.experiencePoints - currentLevelXP;
  const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
  const progressPercentage = Math.floor(
    (xpInCurrentLevel / xpNeededForNextLevel) * 100
  );

  // Get earned badges
  const badges = await prisma.userBadge.findMany({
    where: { userId },
    include: {
      badge: true,
    },
    orderBy: {
      earnedAt: 'desc',
    },
  });

  return {
    coins: user.coins,
    level: user.level,
    experiencePoints: user.experiencePoints,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    progressPercentage,
    rating: user.rating,
    completedSwaps: user.completedSwaps,
    totalHoursTaught: user.totalHoursTaught,
    totalHoursLearned: user.totalHoursLearned,
    badges: badges.map((ub) => ({
      badgeId: ub.badge.badgeId,
      name: ub.badge.name,
      description: ub.badge.description,
      icon: ub.badge.icon,
      earnedAt: ub.earnedAt,
    })),
  };
}

/**
 * Check and award badges based on user activity
 */
export async function checkAndAwardBadges(userId: string) {
  const user = await prisma.user.findUnique({
    where: { userId },
    include: {
      badges: {
        include: {
          badge: true,
        },
      },
    },
  });

  if (!user) return [];

  // Get all available badges
  const allBadges = await prisma.badge.findMany({
    where: { isActive: true },
  });

  const earnedBadgeIds = new Set(user.badges.map((ub) => ub.badgeId));
  const newlyEarnedBadges = [];

  for (const badge of allBadges) {
    // Skip if already earned
    if (earnedBadgeIds.has(badge.badgeId)) continue;

    let shouldAward = false;

    // Check badge criteria
    switch (badge.criteria) {
      case 'SWAP_COUNT':
        shouldAward = user.completedSwaps >= badge.threshold;
        break;
      case 'RATING':
        shouldAward = user.rating >= badge.threshold;
        break;
      case 'HOURS_TAUGHT':
        shouldAward = user.totalHoursTaught >= badge.threshold;
        break;
      case 'HOURS_LEARNED':
        shouldAward = user.totalHoursLearned >= badge.threshold;
        break;
      case 'LEVEL':
        shouldAward = user.level >= badge.threshold;
        break;
      case 'COINS':
        shouldAward = user.coins >= badge.threshold;
        break;
      default:
        break;
    }

    if (shouldAward) {
      // Award badge
      await prisma.userBadge.create({
        data: {
          userId,
          badgeId: badge.badgeId,
        },
      });

      // Send notification
      await prisma.notification.create({
        data: {
          userId,
          type: 'BADGE_EARNED',
          title: 'New Badge Earned! 🏆',
          message: `You've earned the "${badge.name}" badge!`,
          data: {
            badgeId: badge.badgeId,
            badgeName: badge.name,
            badgeIcon: badge.icon,
          },
        },
      });

      newlyEarnedBadges.push(badge);
      logger.info(`User ${userId} earned badge: ${badge.name}`);
    }
  }

  return newlyEarnedBadges;
}

/**
 * Get leaderboard - Top users by various metrics
 */
export async function getLeaderboard(
  metric: 'level' | 'coins' | 'rating' | 'swaps' | 'hoursTaught',
  limit: number = 10
) {
  let orderBy: any;

  switch (metric) {
    case 'level':
      orderBy = [{ level: 'desc' }, { experiencePoints: 'desc' }];
      break;
    case 'coins':
      orderBy = { coins: 'desc' };
      break;
    case 'rating':
      orderBy = { rating: 'desc' };
      break;
    case 'swaps':
      orderBy = { completedSwaps: 'desc' };
      break;
    case 'hoursTaught':
      orderBy = { totalHoursTaught: 'desc' };
      break;
    default:
      orderBy = { level: 'desc' };
  }

  const users = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      emailVerified: true,
    },
    select: {
      userId: true,
      name: true,
      avatar: true,
      level: true,
      coins: true,
      rating: true,
      completedSwaps: true,
      totalHoursTaught: true,
      totalHoursLearned: true,
      experiencePoints: true,
      city: true,
      state: true,
    },
    orderBy,
    take: limit,
  });

  return users.map((user, index) => ({
    rank: index + 1,
    ...user,
  }));
}

/**
 * Get user's rank in a specific leaderboard
 */
export async function getUserRank(
  userId: string,
  metric: 'level' | 'coins' | 'rating' | 'swaps' | 'hoursTaught'
) {
  const user = await prisma.user.findUnique({
    where: { userId },
  });

  if (!user) throw new Error('User not found');

  let metricValue: number;
  let countField: any;

  switch (metric) {
    case 'level':
      metricValue = user.level;
      countField = [
        { level: { gt: user.level } },
        {
          AND: [{ level: user.level }, { experiencePoints: { gt: user.experiencePoints } }],
        },
      ];
      break;
    case 'coins':
      metricValue = user.coins;
      countField = { coins: { gt: user.coins } };
      break;
    case 'rating':
      metricValue = user.rating;
      countField = { rating: { gt: user.rating } };
      break;
    case 'swaps':
      metricValue = user.completedSwaps;
      countField = { completedSwaps: { gt: user.completedSwaps } };
      break;
    case 'hoursTaught':
      metricValue = user.totalHoursTaught;
      countField = { totalHoursTaught: { gt: user.totalHoursTaught } };
      break;
    default:
      metricValue = user.level;
      countField = { level: { gt: user.level } };
  }

  const rank =
    (await prisma.user.count({
      where: {
        status: 'ACTIVE',
        emailVerified: true,
        OR: countField,
      },
    })) + 1;

  return {
    rank,
    metricValue,
    metric,
  };
}

export const gamificationService = {
  awardXP,
  awardCoins,
  deductCoins,
  getUserStats,
  checkAndAwardBadges,
  getLeaderboard,
  getUserRank,
  XP_PER_LEVEL,
  TOTAL_XP_FOR_LEVEL,
};
