// src/controllers/discover.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { UnauthorizedError, BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors';
import { calculateAge } from '../utils/ageCalculator';
import { Gender, GenderPreference, DatingIntent, SwipeType, Prisma, SubscriptionTier } from '@prisma/client';

export const getDiscoverProfiles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('User not authenticated.'));
    }

    const currentUserId = req.user.id;
    const { minAge, maxAge, gender, datingIntent, city, state, page = 1, limit = 20 } = req.query;

    // Fetch current user's profile to apply preferences and exclude self
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        genderPreference: true,
        datingIntent: true,
        dateOfBirth: true,
        subscription: { select: { tier: true } },
      },
    });

    if (!currentUser) {
      return next(new NotFoundError('Current user profile not found.'));
    }

    // Determine age range for filtering based on query params
    const targetMinAge = minAge ? (minAge as number) : 18;
    const targetMaxAge = maxAge ? (maxAge as number) : 25;

    const minDob = new Date();
    minDob.setFullYear(minDob.getFullYear() - targetMaxAge - 1); // Oldest possible DOB
    const maxDob = new Date();
    maxDob.setFullYear(maxDob.getFullYear() - targetMinAge);     // Youngest possible DOB

    // Get IDs of users already interacted with (liked/disliked)
    const interactedUsers = await prisma.like.findMany({
      where: { fromUserId: currentUserId },
      select: { toUserId: true },
    });
    const interactedUserIds = interactedUsers.map(like => like.toUserId);

    // Also exclude users who have liked the current user (to avoid showing them again if they've already swiped)
    // This is a design choice. Some apps show users who liked you, some don't.
    // For now, let's exclude them from the main discover feed.
    const usersWhoLikedMe = await prisma.like.findMany({
      where: { toUserId: currentUserId, type: SwipeType.LIKE },
      select: { fromUserId: true },
    });
    const usersWhoLikedMeIds = usersWhoLikedMe.map(like => like.fromUserId);

    // Combine all excluded user IDs
    const excludedUserIds = [...new Set([currentUserId, ...interactedUserIds, ...usersWhoLikedMeIds])];

    // Fetch active boosts for ranking
    const activeBoosts = await prisma.boost.findMany({ where: { endTime: { gt: new Date() } }, select: { userId: true } });
    const boostedUserIds = activeBoosts.map(boost => boost.userId);

    const whereClause: Prisma.UserWhereInput = {
      id: { notIn: excludedUserIds },
      dateOfBirth: {
        gte: minDob, // Older than maxAge
        lte: maxDob, // Younger than minAge
      },
      // Filter by gender preference of the current user
      gender: {
        in: currentUser.genderPreference === GenderPreference.BOTH
          ? [Gender.MALE, Gender.FEMALE, Gender.OTHER]
          : [currentUser.genderPreference as Gender], // Cast as Gender, assuming preference maps directly to gender
      },
      // Filter by dating intent compatibility
      datingIntent: datingIntent ? (datingIntent as DatingIntent) : undefined,
      city: city ? (city as string) : undefined,
      state: state ? (state as string) : undefined,
      // Ensure profile is reasonably complete (e.g., has at least 2 photos and 3 prompts)
      profileScore: { gte: 50 }, // Example: only show profiles with at least 50% completion
      photos: {
        some: {
          url: { not: null } // Ensure they have at least one photo (more robust check needed for min 2)
        }
      },
      prompts: {
        some: {
          question: { not: null } // Ensure they have at least one prompt (more robust check needed for min 3)
        }
      }
    };

    // Ranking logic
    const orderByClause: Prisma.UserOrderByWithRelationInput[] = [
      // 1. Boosted users (if implemented, e.g., a `isBoosted` field or separate Boost table)
      // { isBoosted: 'desc' }, // Assuming `isBoosted` field on User model
      { activityScore: 'desc' },
      { profileScore: 'desc' },
      {
        id: {
          in: boostedUserIds, // Prioritize boosted users
        },
      },
      { createdAt: 'desc' }, // New users first
    ];

    const profiles = await prisma.user.findMany({
      where: whereClause,
      orderBy: orderByClause,
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
      select: {
        id: true,
        name: true,
        bio: true,
        dateOfBirth: true,
        gender: true,
        datingIntent: true,
        city: true,
        state: true,
        photos: {
          select: { url: true, order: true },
          orderBy: { order: 'asc' },
        },
        prompts: {
          select: { question: true, answer: true },
        },
        profileScore: true,
        activityScore: true,
        createdAt: true,
      },
    });

    const totalProfiles = await prisma.user.count({ where: whereClause });

    const profilesWithAge = profiles.map(profile => ({
      ...profile,
      age: calculateAge(profile.dateOfBirth),
      dateOfBirth: undefined, // Hide DOB from client
    }));

    res.status(200).json({
      status: 'success',
      results: profilesWithAge.length,
      totalPages: Math.ceil(totalProfiles / Number(limit)),
      currentPage: Number(page),
      data: profilesWithAge,
    });
  } catch (error) {
    next(error);
  }
};

export const swipe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('User not authenticated.'));
    }

    const { targetUserId, type } = req.body; // Zod validation already ensures targetUserId and type are valid
    const currentUserId = req.user.id;

    if (currentUserId === targetUserId) {
      return next(new BadRequestError('Cannot swipe on yourself.'));
    }

    // Check if user has already interacted with targetUser
    const existingInteraction = await prisma.like.findUnique({
      where: {
        fromUserId_toUserId: {
          fromUserId: currentUserId,
          toUserId: targetUserId,
        },
      },
    });

    if (existingInteraction) {
      return next(new BadRequestError('You have already interacted with this user.'));
    }

    let matchStatus = false;
    let newLike;

    await prisma.$transaction(async (tx) => {
      // 1. Create the current user's swipe (Like or Dislike)
      newLike = await tx.like.create({
        data: {
          fromUserId: currentUserId,
          toUserId: targetUserId,
          type: type,
        },
      });

      // 2. If it's a LIKE, check for a reverse LIKE
      if (type === SwipeType.LIKE) {
        const reverseLike = await tx.like.findUnique({
          where: {
            fromUserId_toUserId: {
              fromUserId: targetUserId,
              toUserId: currentUserId,
            },
          },
        });

        if (reverseLike && reverseLike.type === SwipeType.LIKE) {
          // A match occurred!
          // Ensure consistent ordering for unique constraint (e.g., always smaller ID first)
          const [userA, userB] = [currentUserId, targetUserId].sort();
          await tx.match.create({
            data: {
              userOneId: userA,
              userTwoId: userB,
            },
          });
          matchStatus = true;
        }
      }

      // Optional: Update activity score for both users
      await tx.user.update({
        where: { id: currentUserId },
        data: { activityScore: { increment: 1 } },
      });
      await tx.user.update({
        where: { id: targetUserId },
        data: { activityScore: { increment: 1 } },
      });
    });

    res.status(200).json({
      status: 'success',
      message: type === SwipeType.LIKE ? 'Liked user.' : 'Disliked user.',
      data: {
        swipe: newLike,
        match: matchStatus,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') { // Unique constraint violation
        return next(new BadRequestError('You have already interacted with this user.'));
      }
      if (error.code === 'P2025') { // Record not found (e.g., targetUserId doesn't exist)
        return next(new NotFoundError('Target user not found.'));
      }
    }
    next(error);
  }
};