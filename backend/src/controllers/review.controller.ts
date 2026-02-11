/**
 * Review Controller
 * Handles all review-related operations
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  updateUserRating,
  getUserRatingBreakdown,
  canEditReview,
  getMostCommonTags,
} from '../services/rating.service';
import { notificationService } from '../services/notification.service';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * POST /api/v1/reviews
 * Submit a review for a completed swap
 */
export async function submitReview(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    const {
      swapId,
      teacherId,
      rating,
      comment,
      teachingQuality,
      communication,
      punctuality,
      tags,
      isPublic,
    } = req.body;

    // Validation
    if (!swapId || !teacherId || !rating) {
      return res.status(400).json({
        error: 'swapId, teacherId, and rating are required',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5',
      });
    }

    // Validate optional detailed ratings
    if (teachingQuality && (teachingQuality < 1 || teachingQuality > 5)) {
      return res.status(400).json({
        error: 'Teaching quality rating must be between 1 and 5',
      });
    }

    if (communication && (communication < 1 || communication > 5)) {
      return res.status(400).json({
        error: 'Communication rating must be between 1 and 5',
      });
    }

    if (punctuality && (punctuality < 1 || punctuality > 5)) {
      return res.status(400).json({
        error: 'Punctuality rating must be between 1 and 5',
      });
    }

    // Verify swap exists and is completed
    const swap = await prisma.swap.findUnique({
      where: { swapId },
      include: {
        initiator: true,
        receiver: true,
      },
    });

    if (!swap) {
      return res.status(404).json({ error: 'Swap not found' });
    }

    if (swap.status !== 'COMPLETED') {
      return res.status(400).json({
        error: 'Cannot review a swap that is not completed',
      });
    }

    // Verify user is part of the swap
    if (swap.initiatorId !== userId && swap.receiverId !== userId) {
      return res.status(403).json({
        error: 'You can only review swaps you participated in',
      });
    }

    // Verify teacherId is the other party in the swap
    const otherPartyId =
      swap.initiatorId === userId ? swap.receiverId : swap.initiatorId;

    if (teacherId !== otherPartyId) {
      return res.status(400).json({
        error: 'You can only review the other party in the swap',
      });
    }

    // Check if review already exists
    const existingReview = await prisma.review.findUnique({
      where: {
        swapId_studentId: {
          swapId,
          studentId: userId!,
        },
      },
    });

    if (existingReview) {
      return res.status(400).json({
        error: 'You have already reviewed this swap',
      });
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        swapId,
        studentId: userId!,
        teacherId,
        rating,
        comment,
        teachingQuality,
        communication,
        punctuality,
        tags: tags || [],
        isPublic: isPublic !== undefined ? isPublic : true,
      },
      include: {
        student: {
          select: {
            userId: true,
            name: true,
            avatar: true,
          },
        },
        teacher: {
          select: {
            userId: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Update teacher's rating
    await updateUserRating(teacherId);

    // Send notification to teacher
    await notificationService.createNotification({
      userId: teacherId,
      type: 'SYSTEM',
      title: 'New Review Received',
      message: `${swap.initiatorId === userId ? swap.initiator.name : swap.receiver.name} left you a ${rating}-star review`,
      data: { reviewId: review.reviewId, swapId, rating },
    });

    // Award coins and XP for leaving a review (gamification)
    if (rating >= 4) {
      // Only for positive reviews
      await prisma.user.update({
        where: { userId: userId! },
        data: {
          coins: { increment: 5 }, // 5 coins for leaving a review
          experiencePoints: { increment: 10 }, // 10 XP
        },
      });
    }

    res.status(201).json({
      message: 'Review submitted successfully',
      review,
    });
  } catch (error: any) {
    console.error('Submit review error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
}

/**
 * GET /api/v1/reviews/user/:userId
 * Get all reviews for a user (as teacher)
 */
export async function getUserReviews(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req.params;
    const { limit = '20', offset = '0', minRating } = req.query;

    const where: any = {
      teacherId: userId,
      isPublic: true,
    };

    if (minRating) {
      where.rating = { gte: parseInt(minRating as string) };
    }

    const reviews = await prisma.review.findMany({
      where,
      include: {
        student: {
          select: {
            userId: true,
            name: true,
            avatar: true,
            level: true,
          },
        },
        swap: {
          select: {
            swapId: true,
            completedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.review.count({ where });

    // Get rating breakdown
    const ratingStats = await getUserRatingBreakdown(userId);

    // Get most common tags
    const commonTags = await getMostCommonTags(userId);

    res.json({
      reviews,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
      stats: ratingStats,
      commonTags,
    });
  } catch (error: any) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
}

/**
 * GET /api/v1/reviews/swap/:swapId
 * Get reviews for a specific swap
 */
export async function getSwapReviews(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { swapId } = req.params;

    const reviews = await prisma.review.findMany({
      where: { swapId },
      include: {
        student: {
          select: {
            userId: true,
            name: true,
            avatar: true,
          },
        },
        teacher: {
          select: {
            userId: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    res.json({ reviews });
  } catch (error: any) {
    console.error('Get swap reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch swap reviews' });
  }
}

/**
 * GET /api/v1/reviews/:id
 * Get a specific review by ID
 */
export async function getReviewById(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;

    const review = await prisma.review.findUnique({
      where: { reviewId: id },
      include: {
        student: {
          select: {
            userId: true,
            name: true,
            avatar: true,
            level: true,
          },
        },
        teacher: {
          select: {
            userId: true,
            name: true,
            avatar: true,
            rating: true,
          },
        },
        swap: {
          select: {
            swapId: true,
            completedAt: true,
          },
        },
        votes: {
          select: {
            voteId: true,
            userId: true,
            isHelpful: true,
          },
        },
      },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({ review });
  } catch (error: any) {
    console.error('Get review error:', error);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
}

/**
 * PUT /api/v1/reviews/:id
 * Edit a review (within 24 hours)
 */
export async function editReview(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const {
      rating,
      comment,
      teachingQuality,
      communication,
      punctuality,
      tags,
      isPublic,
    } = req.body;

    // Find existing review
    const existingReview = await prisma.review.findUnique({
      where: { reviewId: id },
    });

    if (!existingReview) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check if user is the author
    if (existingReview.studentId !== userId) {
      return res.status(403).json({
        error: 'You can only edit your own reviews',
      });
    }

    // Check if within 24-hour edit window
    if (!canEditReview(existingReview.createdAt)) {
      return res.status(403).json({
        error: 'Reviews can only be edited within 24 hours of creation',
      });
    }

    // Validate ratings if provided
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5',
      });
    }

    // Update review
    const updatedReview = await prisma.review.update({
      where: { reviewId: id },
      data: {
        ...(rating && { rating }),
        ...(comment !== undefined && { comment }),
        ...(teachingQuality && { teachingQuality }),
        ...(communication && { communication }),
        ...(punctuality && { punctuality }),
        ...(tags && { tags }),
        ...(isPublic !== undefined && { isPublic }),
        isEdited: true,
      },
      include: {
        student: {
          select: {
            userId: true,
            name: true,
            avatar: true,
          },
        },
        teacher: {
          select: {
            userId: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Recalculate teacher's rating if rating changed
    if (rating) {
      await updateUserRating(existingReview.teacherId);
    }

    res.json({
      message: 'Review updated successfully',
      review: updatedReview,
    });
  } catch (error: any) {
    console.error('Edit review error:', error);
    res.status(500).json({ error: 'Failed to edit review' });
  }
}

/**
 * DELETE /api/v1/reviews/:id
 * Delete a review (author or admin only)
 */
export async function deleteReview(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { id } = req.params;

    const review = await prisma.review.findUnique({
      where: { reviewId: id },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check if user is author or admin
    if (review.studentId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({
        error: 'You can only delete your own reviews',
      });
    }

    const teacherId = review.teacherId;

    await prisma.review.delete({
      where: { reviewId: id },
    });

    // Recalculate teacher's rating
    await updateUserRating(teacherId);

    res.json({ message: 'Review deleted successfully' });
  } catch (error: any) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
}

/**
 * POST /api/v1/reviews/:id/vote
 * Vote on a review (helpful/not helpful)
 */
export async function voteOnReview(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    const { id: reviewId } = req.params;
    const { isHelpful } = req.body;

    if (isHelpful === undefined) {
      return res.status(400).json({
        error: 'isHelpful field is required (true or false)',
      });
    }

    // Check if review exists
    const review = await prisma.review.findUnique({
      where: { reviewId },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check if user already voted
    const existingVote = await prisma.reviewVote.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId: userId!,
        },
      },
    });

    if (existingVote) {
      // Update existing vote
      const updatedVote = await prisma.reviewVote.update({
        where: {
          reviewId_userId: {
            reviewId,
            userId: userId!,
          },
        },
        data: { isHelpful },
      });

      // Recalculate helpful count
      const helpfulCount = await prisma.reviewVote.count({
        where: {
          reviewId,
          isHelpful: true,
        },
      });

      await prisma.review.update({
        where: { reviewId },
        data: { helpfulCount },
      });

      return res.json({
        message: 'Vote updated successfully',
        vote: updatedVote,
      });
    }

    // Create new vote
    const vote = await prisma.reviewVote.create({
      data: {
        reviewId,
        userId: userId!,
        isHelpful,
      },
    });

    // Update review's helpful count
    const helpfulCount = await prisma.reviewVote.count({
      where: {
        reviewId,
        isHelpful: true,
      },
    });

    await prisma.review.update({
      where: { reviewId },
      data: { helpfulCount },
    });

    res.status(201).json({
      message: 'Vote recorded successfully',
      vote,
    });
  } catch (error: any) {
    console.error('Vote on review error:', error);
    res.status(500).json({ error: 'Failed to vote on review' });
  }
}

/**
 * GET /api/v1/reviews/stats/:userId
 * Get detailed rating statistics for a user
 */
export async function getUserStats(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req.params;

    const stats = await getUserRatingBreakdown(userId);
    const commonTags = await getMostCommonTags(userId, 10);

    // Get recent reviews (last 5)
    const recentReviews = await prisma.review.findMany({
      where: {
        teacherId: userId,
        isPublic: true,
      },
      include: {
        student: {
          select: {
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    res.json({
      stats,
      commonTags,
      recentReviews,
    });
  } catch (error: any) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
}
