import { Router } from 'express';
import { body, param, query } from 'express-validator';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';
import { SwapStatus } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

const router = Router();

// All swap routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/swaps
 * Create a new swap request
 */
router.post(
  '/',
  [
    body('receiverId').isUUID().withMessage('Valid receiver ID required'),
    body('initiatorSkillId').isUUID().withMessage('Valid initiator skill ID required'),
    body('receiverSkillId').isUUID().withMessage('Valid receiver skill ID required'),
    body('message').optional().trim().isLength({ max: 500 }).withMessage('Message must be under 500 characters'),
    body('scheduledAt').optional().isISO8601().withMessage('Valid date required'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const initiatorId = req.user!.userId;
      const { receiverId, initiatorSkillId, receiverSkillId, message, scheduledAt } = req.body;

      // Validate initiator and receiver are different
      if (initiatorId === receiverId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot create swap request with yourself',
        });
      }

      // Validate initiator owns the initiator skill
      const initiatorSkill = await prisma.userSkill.findFirst({
        where: {
          userId: initiatorId,
          skillId: initiatorSkillId,
          skillType: 'TEACH',
        },
      });

      if (!initiatorSkill) {
        return res.status(400).json({
          success: false,
          message: 'You must be teaching the skill you want to exchange',
        });
      }

      // Validate receiver owns the receiver skill
      const receiverSkill = await prisma.userSkill.findFirst({
        where: {
          userId: receiverId,
          skillId: receiverSkillId,
          skillType: 'TEACH',
        },
      });

      if (!receiverSkill) {
        return res.status(400).json({
          success: false,
          message: 'The other user must be teaching the skill you want to learn',
        });
      }

      // Check for existing pending swap between these users with same skills
      const existingSwap = await prisma.swap.findFirst({
        where: {
          initiatorId,
          receiverId,
          initiatorSkillId,
          receiverSkillId,
          status: 'PENDING',
        },
      });

      if (existingSwap) {
        return res.status(400).json({
          success: false,
          message: 'You already have a pending swap request with this user for these skills',
        });
      }

      // Create swap request
      const swap = await prisma.swap.create({
        data: {
          initiatorId,
          receiverId,
          initiatorSkillId,
          receiverSkillId,
          message: message || null,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          status: 'PENDING',
        },
        include: {
          initiator: {
            select: {
              userId: true,
              name: true,
              avatar: true,
              rating: true,
            },
          },
          receiver: {
            select: {
              userId: true,
              name: true,
              avatar: true,
              rating: true,
            },
          },
        },
      });

      // TODO: Create notification for receiver
      // TODO: Send email notification

      logger.info(`Swap request created: ${swap.swapId} from ${initiatorId} to ${receiverId}`);

      res.status(201).json({
        success: true,
        message: 'Swap request sent successfully!',
        data: { swap },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/swaps
 * Get user's swaps with filtering
 */
router.get(
  '/',
  [
    query('status').optional().isIn(['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED']),
    query('type').optional().isIn(['initiated', 'received', 'all']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { status, type = 'all', limit = 20, offset = 0 } = req.query;

      const where: any = {};

      // Filter by type (initiated, received, or both)
      if (type === 'initiated') {
        where.initiatorId = userId;
      } else if (type === 'received') {
        where.receiverId = userId;
      } else {
        where.OR = [{ initiatorId: userId }, { receiverId: userId }];
      }

      // Filter by status
      if (status) {
        where.status = status as SwapStatus;
      }

      const swaps = await prisma.swap.findMany({
        where,
        include: {
          initiator: {
            select: {
              userId: true,
              name: true,
              avatar: true,
              rating: true,
            },
          },
          receiver: {
            select: {
              userId: true,
              name: true,
              avatar: true,
              rating: true,
            },
          },
          sessions: {
            orderBy: { startTime: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      });

      const total = await prisma.swap.count({ where });

      res.json({
        success: true,
        data: {
          swaps,
          pagination: {
            total,
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            hasMore: parseInt(offset as string) + swaps.length < total,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/swaps/:id
 * Get specific swap details
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const swap = await prisma.swap.findUnique({
      where: { swapId: id },
      include: {
        initiator: {
          select: {
            userId: true,
            name: true,
            avatar: true,
            bio: true,
            rating: true,
            completedSwaps: true,
          },
        },
        receiver: {
          select: {
            userId: true,
            name: true,
            avatar: true,
            bio: true,
            rating: true,
            completedSwaps: true,
          },
        },
        sessions: {
          orderBy: { startTime: 'desc' },
        },
      },
    });

    if (!swap) {
      return res.status(404).json({
        success: false,
        message: 'Swap not found',
      });
    }

    // Ensure user is part of this swap
    if (swap.initiatorId !== userId && swap.receiverId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this swap',
      });
    }

    res.json({
      success: true,
      data: { swap },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/swaps/:id/accept
 * Accept a swap request
 */
router.put('/:id/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const swap = await prisma.swap.findUnique({
      where: { swapId: id },
    });

    if (!swap) {
      return res.status(404).json({
        success: false,
        message: 'Swap not found',
      });
    }

    // Only receiver can accept
    if (swap.receiverId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the swap receiver can accept the request',
      });
    }

    // Can only accept pending swaps
    if (swap.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cannot accept swap with status: ${swap.status}`,
      });
    }

    // Update swap status
    const updatedSwap = await prisma.swap.update({
      where: { swapId: id },
      data: { status: 'ACCEPTED' },
      include: {
        initiator: {
          select: {
            userId: true,
            name: true,
            email: true,
          },
        },
        receiver: {
          select: {
            userId: true,
            name: true,
          },
        },
      },
    });

    // TODO: Create notification for initiator
    // TODO: Send email notification

    logger.info(`Swap accepted: ${id} by user ${userId}`);

    res.json({
      success: true,
      message: 'Swap request accepted!',
      data: { swap: updatedSwap },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/swaps/:id/reject
 * Reject a swap request
 */
router.put('/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const swap = await prisma.swap.findUnique({
      where: { swapId: id },
    });

    if (!swap) {
      return res.status(404).json({
        success: false,
        message: 'Swap not found',
      });
    }

    // Only receiver can reject
    if (swap.receiverId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the swap receiver can reject the request',
      });
    }

    // Can only reject pending swaps
    if (swap.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject swap with status: ${swap.status}`,
      });
    }

    // Update swap status
    const updatedSwap = await prisma.swap.update({
      where: { swapId: id },
      data: { status: 'REJECTED' },
    });

    logger.info(`Swap rejected: ${id} by user ${userId}`);

    res.json({
      success: true,
      message: 'Swap request rejected',
      data: { swap: updatedSwap },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/swaps/:id/cancel
 * Cancel a swap
 */
router.put(
  '/:id/cancel',
  [body('reason').optional().trim().isLength({ max: 500 })],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { reason } = req.body;

      const swap = await prisma.swap.findUnique({
        where: { swapId: id },
      });

      if (!swap) {
        return res.status(404).json({
          success: false,
          message: 'Swap not found',
        });
      }

      // Both parties can cancel
      if (swap.initiatorId !== userId && swap.receiverId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this swap',
        });
      }

      // Can only cancel pending or accepted swaps
      if (!['PENDING', 'ACCEPTED'].includes(swap.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot cancel swap with status: ${swap.status}`,
        });
      }

      // Update swap status
      const updatedSwap = await prisma.swap.update({
        where: { swapId: id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: reason || null,
        },
      });

      logger.info(`Swap cancelled: ${id} by user ${userId}`);

      res.json({
        success: true,
        message: 'Swap cancelled',
        data: { swap: updatedSwap },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/swaps/:id/complete
 * Mark swap as completed (both parties must confirm)
 */
router.put('/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const swap = await prisma.swap.findUnique({
      where: { swapId: id },
      include: {
        sessions: true,
      },
    });

    if (!swap) {
      return res.status(404).json({
        success: false,
        message: 'Swap not found',
      });
    }

    // Both parties can complete
    if (swap.initiatorId !== userId && swap.receiverId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this swap',
      });
    }

    // Can only complete accepted swaps
    if (swap.status !== 'ACCEPTED') {
      return res.status(400).json({
        success: false,
        message: 'Can only complete accepted swaps',
      });
    }

    // Check if there are completed sessions
    if (swap.sessions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Complete at least one session before marking swap as complete',
      });
    }

    // Calculate total duration from sessions
    const totalDuration = swap.sessions.reduce((sum, session) => {
      return sum + (session.duration || 0);
    }, 0);

    // Update swap and user statistics
    const updatedSwap = await prisma.$transaction(async (tx) => {
      // Mark swap as completed
      const completed = await tx.swap.update({
        where: { swapId: id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          duration: totalDuration,
        },
      });

      // Update both users' statistics
      const hoursSpent = totalDuration / 60;

      await tx.user.update({
        where: { userId: swap.initiatorId },
        data: {
          completedSwaps: { increment: 1 },
          totalHoursTaught: { increment: hoursSpent },
          experiencePoints: { increment: 50 }, // XP reward
        },
      });

      await tx.user.update({
        where: { userId: swap.receiverId },
        data: {
          completedSwaps: { increment: 1 },
          totalHoursTaught: { increment: hoursSpent },
          experiencePoints: { increment: 50 }, // XP reward
        },
      });

      return completed;
    });

    // TODO: Check for badge achievements
    // TODO: Send completion notifications

    logger.info(`Swap completed: ${id}`);

    res.json({
      success: true,
      message: 'Swap marked as completed! You earned 50 XP!',
      data: { swap: updatedSwap },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/swaps/:id/sessions
 * Create a swap session
 */
router.post(
  '/:id/sessions',
  [
    body('startTime').isISO8601().withMessage('Valid start time required'),
    body('endTime').optional().isISO8601().withMessage('Valid end time required'),
    body('notes').optional().trim().isLength({ max: 1000 }),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { startTime, endTime, notes } = req.body;

      const swap = await prisma.swap.findUnique({
        where: { swapId: id },
      });

      if (!swap) {
        return res.status(404).json({
          success: false,
          message: 'Swap not found',
        });
      }

      // Both parties can create sessions
      if (swap.initiatorId !== userId && swap.receiverId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this swap',
        });
      }

      // Can only create sessions for accepted swaps
      if (swap.status !== 'ACCEPTED') {
        return res.status(400).json({
          success: false,
          message: 'Can only create sessions for accepted swaps',
        });
      }

      // Calculate duration if endTime provided
      let duration = null;
      if (endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        duration = Math.floor((end.getTime() - start.getTime()) / 1000 / 60); // minutes
      }

      const session = await prisma.swapSession.create({
        data: {
          swapId: id,
          startTime: new Date(startTime),
          endTime: endTime ? new Date(endTime) : null,
          duration,
          notes: notes || null,
        },
      });

      logger.info(`Swap session created: ${session.sessionId} for swap ${id}`);

      res.status(201).json({
        success: true,
        message: 'Session created successfully',
        data: { session },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/swaps/:id/sessions/:sessionId
 * Update a swap session (end session, add notes)
 */
router.put(
  '/:id/sessions/:sessionId',
  [
    body('endTime').optional().isISO8601(),
    body('notes').optional().trim().isLength({ max: 1000 }),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id, sessionId } = req.params;
      const { endTime, notes } = req.body;

      const swap = await prisma.swap.findUnique({
        where: { swapId: id },
      });

      if (!swap) {
        return res.status(404).json({
          success: false,
          message: 'Swap not found',
        });
      }

      if (swap.initiatorId !== userId && swap.receiverId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this swap',
        });
      }

      const session = await prisma.swapSession.findUnique({
        where: { sessionId },
      });

      if (!session || session.swapId !== id) {
        return res.status(404).json({
          success: false,
          message: 'Session not found',
        });
      }

      const updateData: any = {};
      if (notes !== undefined) updateData.notes = notes;
      if (endTime) {
        updateData.endTime = new Date(endTime);
        // Calculate duration
        const start = new Date(session.startTime);
        const end = new Date(endTime);
        updateData.duration = Math.floor((end.getTime() - start.getTime()) / 1000 / 60);
      }

      const updatedSession = await prisma.swapSession.update({
        where: { sessionId },
        data: updateData,
      });

      res.json({
        success: true,
        message: 'Session updated successfully',
        data: { session: updatedSession },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/swaps/stats
 * Get user's swap statistics
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const stats = await prisma.$transaction(async (tx) => {
      const initiated = await tx.swap.count({
        where: { initiatorId: userId },
      });

      const received = await tx.swap.count({
        where: { receiverId: userId },
      });

      const completed = await tx.swap.count({
        where: {
          OR: [{ initiatorId: userId }, { receiverId: userId }],
          status: 'COMPLETED',
        },
      });

      const pending = await tx.swap.count({
        where: {
          receiverId: userId,
          status: 'PENDING',
        },
      });

      const accepted = await tx.swap.count({
        where: {
          OR: [{ initiatorId: userId }, { receiverId: userId }],
          status: 'ACCEPTED',
        },
      });

      return {
        total: initiated + received,
        initiated,
        received,
        completed,
        pending,
        accepted,
      };
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
