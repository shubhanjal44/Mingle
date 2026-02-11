import { Router } from 'express';
import { body, param } from 'express-validator';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';
import { Request, Response, NextFunction } from 'express';

const router = Router();

/**
 * GET /api/v1/skills/categories
 * Get all skill categories
 */
router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.skillCategory.findMany({
      include: {
        _count: {
          select: { skills: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/skills
 * Get all skills with optional category filter
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, search, limit = 50, offset = 0 } = req.query;

    const where: any = {};

    if (category) {
      where.categoryId = category as string;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const skills = await prisma.skill.findMany({
      where,
      include: {
        category: true,
        _count: {
          select: {
            userSkills: true,
          },
        },
      },
      take: Number(limit),
      skip: Number(offset),
      orderBy: { name: 'asc' },
    });

    const total = await prisma.skill.count({ where });

    res.json({
      success: true,
      data: {
        skills: skills.map((skill) => ({
          skillId: skill.skillId,
          name: skill.name,
          description: skill.description,
          category: skill.category,
          icon: skill.icon,
          userSkillsCount: skill._count.userSkills,
        })),
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + skills.length < total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/skills/user
 * Get current user's skills (both teaching and learning)
 */
router.get('/user', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: {
        skill: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const teaching = userSkills.filter((us) => us.skillType === 'TEACH');
    const learning = userSkills.filter((us) => us.skillType === 'LEARN');

    res.json({
      success: true,
      data: {
        teaching,
        learning,
        stats: {
          totalTeaching: teaching.length,
          totalLearning: learning.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/skills/user
 * Add a skill to user profile (teaching or learning)
 */
router.post(
  '/user',
  authenticate,
  [
    body('skillId').isUUID().withMessage('Valid skill ID required'),
    body('skillType').isIn(['TEACH', 'LEARN']).withMessage('Skill type must be TEACH or LEARN'),
    body('proficiencyLevel')
      .isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'])
      .withMessage('Valid proficiency level required'),
    body('yearsOfExperience').optional().isInt({ min: 0, max: 50 }).withMessage('Years must be 0-50'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be under 500 chars'),
    body('isVerified').optional().isBoolean(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { skillId, skillType, proficiencyLevel, yearsOfExperience, description, isVerified } = req.body;

      // Check if skill exists
      const skill = await prisma.skill.findUnique({
        where: { skillId },
      });

      if (!skill) {
        return res.status(404).json({
          success: false,
          message: 'Skill not found',
        });
      }

      // Check if user already has this skill with same type
      const existingUserSkill = await prisma.userSkill.findFirst({
        where: {
          userId,
          skillId,
          skillType,
        },
      });

      if (existingUserSkill) {
        return res.status(400).json({
          success: false,
          message: `You already have this skill in your ${skillType.toLowerCase()} list`,
        });
      }

      // Create user skill
      const userSkill = await prisma.userSkill.create({
        data: {
          userId,
          skillId,
          skillType,
          proficiencyLevel,
          yearsOfExperience: yearsOfExperience || 0,
          description: description || null,
          isVerified: isVerified || false,
        },
        include: {
          skill: {
            include: {
              category: true,
            },
          },
        },
      });

      logger.info(`User ${userId} added skill ${skillId} as ${skillType}`);

      res.status(201).json({
        success: true,
        message: 'Skill added successfully',
        data: { userSkill },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/skills/user/:userSkillId
 * Update user's skill details
 */
router.put(
  '/user/:userSkillId',
  authenticate,
  [
    param('userSkillId').isUUID().withMessage('Valid user skill ID required'),
    body('proficiencyLevel')
      .optional()
      .isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'])
      .withMessage('Valid proficiency level required'),
    body('yearsOfExperience').optional().isInt({ min: 0, max: 50 }).withMessage('Years must be 0-50'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be under 500 chars'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { userSkillId } = req.params;
      const { proficiencyLevel, yearsOfExperience, description } = req.body;

      // Check if user skill exists and belongs to user
      const existingUserSkill = await prisma.userSkill.findUnique({
        where: { userSkillId },
      });

      if (!existingUserSkill) {
        return res.status(404).json({
          success: false,
          message: 'User skill not found',
        });
      }

      if (existingUserSkill.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own skills',
        });
      }

      // Build update data
      const updateData: any = {};
      if (proficiencyLevel !== undefined) updateData.proficiencyLevel = proficiencyLevel;
      if (yearsOfExperience !== undefined) updateData.yearsOfExperience = yearsOfExperience;
      if (description !== undefined) updateData.description = description;

      // Update user skill
      const userSkill = await prisma.userSkill.update({
        where: { userSkillId },
        data: updateData,
        include: {
          skill: {
            include: {
              category: true,
            },
          },
        },
      });

      logger.info(`User ${userId} updated skill ${userSkillId}`);

      res.json({
        success: true,
        message: 'Skill updated successfully',
        data: { userSkill },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/skills/user/:userSkillId
 * Remove a skill from user profile
 */
router.delete('/user/:userSkillId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { userSkillId } = req.params;

    // Check if user skill exists and belongs to user
    const userSkill = await prisma.userSkill.findUnique({
      where: { userSkillId },
    });

    if (!userSkill) {
      return res.status(404).json({
        success: false,
        message: 'User skill not found',
      });
    }

    if (userSkill.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own skills',
      });
    }

    // Delete user skill
    await prisma.userSkill.delete({
      where: { userSkillId },
    });

    logger.info(`User ${userId} removed skill ${userSkillId}`);

    res.json({
      success: true,
      message: 'Skill removed successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/skills/user/:userId
 * Get another user's public skills
 */
router.get('/user/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { userId: true, name: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: {
        skill: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const teaching = userSkills.filter((us) => us.skillType === 'TEACH');
    const learning = userSkills.filter((us) => us.skillType === 'LEARN');

    res.json({
      success: true,
      data: {
        user,
        teaching,
        learning,
        stats: {
          totalTeaching: teaching.length,
          totalLearning: learning.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
