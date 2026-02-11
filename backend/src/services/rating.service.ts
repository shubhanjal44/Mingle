/**
 * Rating Calculation Service
 * Handles user rating updates based on reviews
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RatingUpdate {
  userId: string;
  newRating: number;
  reviewCount: number;
}

/**
 * Calculate user's overall rating from all reviews
 * Uses weighted average: recent reviews (last 90 days) count 70%, older reviews 30%
 */
export async function calculateUserRating(userId: string): Promise<RatingUpdate> {
  // Get all reviews where user was the teacher
  const allReviews = await prisma.review.findMany({
    where: {
      teacherId: userId,
      isPublic: true, // Only count public reviews
    },
    select: {
      rating: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (allReviews.length === 0) {
    return {
      userId,
      newRating: 0,
      reviewCount: 0,
    };
  }

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Separate recent and older reviews
  const recentReviews = allReviews.filter(
    (review) => review.createdAt >= ninetyDaysAgo
  );
  const olderReviews = allReviews.filter(
    (review) => review.createdAt < ninetyDaysAgo
  );

  // Calculate averages
  const recentAvg =
    recentReviews.length > 0
      ? recentReviews.reduce((sum, r) => sum + r.rating, 0) /
        recentReviews.length
      : 0;

  const olderAvg =
    olderReviews.length > 0
      ? olderReviews.reduce((sum, r) => sum + r.rating, 0) / olderReviews.length
      : 0;

  // Weighted calculation: 70% recent, 30% older
  let weightedRating: number;

  if (recentReviews.length > 0 && olderReviews.length > 0) {
    weightedRating = recentAvg * 0.7 + olderAvg * 0.3;
  } else if (recentReviews.length > 0) {
    weightedRating = recentAvg;
  } else {
    weightedRating = olderAvg;
  }

  // Round to 2 decimal places
  const finalRating = Math.round(weightedRating * 100) / 100;

  return {
    userId,
    newRating: finalRating,
    reviewCount: allReviews.length,
  };
}

/**
 * Update user's rating in database
 */
export async function updateUserRating(userId: string): Promise<void> {
  const ratingUpdate = await calculateUserRating(userId);

  await prisma.user.update({
    where: { userId },
    data: { rating: ratingUpdate.newRating },
  });
}

/**
 * Get rating breakdown for a user
 */
export async function getUserRatingBreakdown(userId: string) {
  const reviews = await prisma.review.findMany({
    where: {
      teacherId: userId,
      isPublic: true,
    },
    select: {
      rating: true,
      teachingQuality: true,
      communication: true,
      punctuality: true,
      createdAt: true,
    },
  });

  if (reviews.length === 0) {
    return {
      overall: 0,
      totalReviews: 0,
      starDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      teachingQuality: 0,
      communication: 0,
      punctuality: 0,
    };
  }

  // Calculate star distribution
  const starDistribution = reviews.reduce(
    (acc, review) => {
      acc[review.rating as 1 | 2 | 3 | 4 | 5]++;
      return acc;
    },
    { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<1 | 2 | 3 | 4 | 5, number>
  );

  // Calculate detailed rating averages (only from reviews that have them)
  const withTeachingQuality = reviews.filter((r) => r.teachingQuality !== null);
  const withCommunication = reviews.filter((r) => r.communication !== null);
  const withPunctuality = reviews.filter((r) => r.punctuality !== null);

  const teachingQualityAvg =
    withTeachingQuality.length > 0
      ? withTeachingQuality.reduce(
          (sum, r) => sum + (r.teachingQuality || 0),
          0
        ) / withTeachingQuality.length
      : 0;

  const communicationAvg =
    withCommunication.length > 0
      ? withCommunication.reduce((sum, r) => sum + (r.communication || 0), 0) /
        withCommunication.length
      : 0;

  const punctualityAvg =
    withPunctuality.length > 0
      ? withPunctuality.reduce((sum, r) => sum + (r.punctuality || 0), 0) /
        withPunctuality.length
      : 0;

  const ratingUpdate = await calculateUserRating(userId);

  return {
    overall: ratingUpdate.newRating,
    totalReviews: reviews.length,
    starDistribution,
    teachingQuality: Math.round(teachingQualityAvg * 10) / 10,
    communication: Math.round(communicationAvg * 10) / 10,
    punctuality: Math.round(punctualityAvg * 10) / 10,
  };
}

/**
 * Check if user can edit their review (within 24 hours of creation)
 */
export function canEditReview(reviewCreatedAt: Date): boolean {
  const now = new Date();
  const hoursSinceCreation =
    (now.getTime() - reviewCreatedAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceCreation <= 24;
}

/**
 * Get most common tags from user's reviews
 */
export async function getMostCommonTags(
  userId: string,
  limit: number = 5
): Promise<Array<{ tag: string; count: number }>> {
  const reviews = await prisma.review.findMany({
    where: {
      teacherId: userId,
      isPublic: true,
    },
    select: {
      tags: true,
    },
  });

  // Count tag occurrences
  const tagCounts = reviews.reduce((acc, review) => {
    review.tags.forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  // Convert to array and sort by count
  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export const ratingService = {
  calculateUserRating,
  updateUserRating,
  getUserRatingBreakdown,
  canEditReview,
  getMostCommonTags,
};
