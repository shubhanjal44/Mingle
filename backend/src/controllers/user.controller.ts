import { Router } from 'express';
import { body } from 'express-validator';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';
import { Request, Response, NextFunction } from 'express';

const router = Router();

// All user routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/users/profile
 * Get current user's profile
 */
router.get('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        bio: true,
        city: true,
        state: true,
        role: true,
        status: true,
        coins: true,
        level: true,
        experiencePoints: true,
        rating: true,
        completedSwaps: true,
        totalHoursTaught: true,
        totalHoursLearned: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
        lastActive: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Calculate profile completion percentage
    const profileCompletion = calculateProfileCompletion(user);

    res.json({
      success: true,
      data: {
        user,
        profileCompletion,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/users/profile
 * Update current user's profile
 */
router.put(
  '/profile',
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('phone').optional().isMobilePhone('en-IN').withMessage('Valid Indian phone number required'),
    body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio must be under 500 characters'),
    body('city').optional().trim().isLength({ max: 100 }).withMessage('City must be under 100 characters'),
    body('state').optional().trim().isLength({ max: 100 }).withMessage('State must be under 100 characters'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { name, phone, bio, city, state } = req.body;

      // Build update data object (only include provided fields)
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (bio !== undefined) updateData.bio = bio;
      if (city !== undefined) updateData.city = city;
      if (state !== undefined) updateData.state = state;

      // Update user
      const user = await prisma.user.update({
        where: { userId },
        data: updateData,
        select: {
          userId: true,
          email: true,
          name: true,
          phone: true,
          avatar: true,
          bio: true,
          city: true,
          state: true,
          role: true,
          coins: true,
          level: true,
          emailVerified: true,
          phoneVerified: true,
          updatedAt: true,
        },
      });

      logger.info(`User profile updated: ${userId}`);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/users/:id
 * Get public profile of any user
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { userId: id },
      select: {
        userId: true,
        name: true,
        avatar: true,
        bio: true,
        city: true,
        state: true,
        level: true,
        rating: true,
        completedSwaps: true,
        totalHoursTaught: true,
        totalHoursLearned: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get user's skills
    const skills = await prisma.userSkill.findMany({
      where: { userId: id },
      include: {
        skill: true,
      },
    });

    // Get user's badges
    const badges = await prisma.userBadge.findMany({
      where: { userId: id },
      include: {
        badge: true,
      },
      orderBy: { earnedAt: 'desc' },
      take: 10,
    });

    // Get recent reviews (as teacher)
    const reviews = await prisma.review.findMany({
      where: { teacherId: id },
      include: {
        student: {
          select: {
            userId: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    res.json({
      success: true,
      data: {
        user,
        skills: {
          teaching: skills.filter((s) => s.skillType === 'TEACH'),
          learning: skills.filter((s) => s.skillType === 'LEARN'),
        },
        badges: badges.map((b) => b.badge),
        reviews,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/search
 * Search users by name or location
 */
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, city, state, limit = 20, offset = 0 } = req.query;

    const where: any = {
      status: 'ACTIVE',
      emailVerified: true,
    };

    // Search by name or bio
    if (query) {
      where.OR = [
        { name: { contains: query as string, mode: 'insensitive' } },
        { bio: { contains: query as string, mode: 'insensitive' } },
      ];
    }

    // Filter by location
    if (city) {
      where.city = { contains: city as string, mode: 'insensitive' };
    }
    if (state) {
      where.state = { contains: state as string, mode: 'insensitive' };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        userId: true,
        name: true,
        avatar: true,
        bio: true,
        city: true,
        state: true,
        level: true,
        rating: true,
        completedSwaps: true,
      },
      take: Number(limit),
      skip: Number(offset),
      orderBy: {
        rating: 'desc',
      },
    });

    const total = await prisma.user.count({ where });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + users.length < total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Helper function to calculate profile completion percentage
 */
function calculateProfileCompletion(user: any): number {
  const fields = [
    user.name,
    user.email,
    user.phone,
    user.avatar,
    user.bio,
    user.city,
    user.state,
    user.emailVerified,
  ];

  const completed = fields.filter((field) => field !== null && field !== '').length;
  return Math.round((completed / fields.length) * 100);
}

export default router;
