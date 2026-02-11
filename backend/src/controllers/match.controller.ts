import { Router } from 'express';
import { query } from 'express-validator';
import { matchingService } from '../services/matching.service';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';
import { Request, Response, NextFunction } from 'express';

const router = Router();

// All match routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/matches
 * Find potential skill swap matches for the current user
 */
router.get(
  '/',
  [
    query('skillId').optional().isUUID().withMessage('Valid skill ID required'),
    query('city').optional().trim().isLength({ max: 100 }),
    query('state').optional().trim().isLength({ max: 100 }),
    query('minRating').optional().isFloat({ min: 0, max: 5 }).withMessage('Rating must be 0-5'),
    query('remoteOnly').optional().isBoolean(),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const {
        skillId,
        city,
        state,
        minRating,
        remoteOnly = false,
        limit = 20,
      } = req.query;

      const matches = await matchingService.findMatches(
        {
          userId,
          skillId: skillId as string | undefined,
          city: city as string | undefined,
          state: state as string | undefined,
          minRating: minRating ? parseFloat(minRating as string) : undefined,
         remoteOnly: remoteOnly === 'true' || remoteOnly === '1',
        },
        parseInt(limit as string)
      );

      logger.info(`Found ${matches.length} matches for user ${userId}`);

      res.json({
        success: true,
        data: {
          matches,
          count: matches.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/matches/recommendations/:skillId
 * Get recommended teachers for a specific skill
 */
router.get(
  '/recommendations/:skillId',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { skillId } = req.params;
      const { limit = 10 } = req.query;

      const recommendations = await matchingService.getRecommendationsForSkill(
        userId,
        skillId,
        parseInt(limit as string)
      );

      logger.info(`Found ${recommendations.length} recommendations for skill ${skillId}`);

      res.json({
        success: true,
        data: {
          recommendations,
          count: recommendations.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/matches/stats
 * Get match statistics for the current user
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const stats = await matchingService.getMatchStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/matches/compatible-skills
 * Get list of skills where user can find matches
 * (Skills user teaches that others want to learn, and vice versa)
 */
router.get('/compatible-skills', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    // This is a simplified version - in production, you'd cache this
    const matches = await matchingService.findMatches({ userId }, 100);

    // Extract unique skills from matched users
    const compatibleSkills = new Map();

    matches.forEach((match) => {
      match.matchedSkills.forEach((skill: any) => {
        if (!compatibleSkills.has(skill.skillId)) {
          compatibleSkills.set(skill.skillId, {
            ...skill,
            matchCount: 1,
          });
        } else {
          const existing = compatibleSkills.get(skill.skillId);
          existing.matchCount += 1;
        }
      });
    });

    const skills = Array.from(compatibleSkills.values())
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 20);

    res.json({
      success: true,
      data: {
        skills,
        totalSkills: skills.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
