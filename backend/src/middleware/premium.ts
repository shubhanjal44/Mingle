/**
 * Premium Features Middleware
 * Check if user has access to premium features
 */

import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from '../services/subscription.service';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';
import { SubscriptionTier } from '@prisma/client';

/**
 * Require specific subscription tier
 */
export const requireTier = (...tiers: SubscriptionTier[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return next(new AppError('Unauthorized', 401));
      }

      const subscription = await subscriptionService.getUserSubscription(userId);

      if (!tiers.includes(subscription.tier)) {
        return next(
          new AppError(
            `This feature requires ${tiers.join(' or ')} subscription`,
            403
          )
        );
      }

      next();
    } catch (error) {
      logger.error('Tier check error:', error);
      next(new AppError('Failed to verify subscription', 500));
    }
  };
};

/**
 * Require premium subscription (Basic or Pro)
 */
export const requirePremium = requireTier('BASIC', 'PRO');

/**
 * Require Pro subscription
 */
export const requirePro = requireTier('PRO');

/**
 * Check if user has access to a specific feature
 */
export const requireFeature = (feature: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return next(new AppError('Unauthorized', 401));
      }

      const hasAccess = await subscriptionService.hasFeatureAccess(
        userId,
        feature as any
      );

      if (!hasAccess) {
        return next(
          new AppError(
            `This feature requires a premium subscription`,
            403
          )
        );
      }

      next();
    } catch (error) {
      logger.error('Feature check error:', error);
      next(new AppError('Failed to verify feature access', 500));
    }
  };
};

/**
 * Check if user can perform an action (with limit checking)
 */
export const checkActionLimit = (
  action: 'createSwap' | 'addSkillToTeach' | 'addSkillToLearn' | 'createEvent' | 'addConnection'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return next(new AppError('Unauthorized', 401));
      }

      const result = await subscriptionService.canPerformAction(userId, action);

      if (!result.allowed) {
        return next(
          new AppError(
            result.reason || 'Action not allowed',
            403
          )
        );
      }

      // Attach limit info to request for controller use
      (req as any).limitInfo = {
        limit: result.limit,
        current: result.current,
      };

      next();
    } catch (error) {
      logger.error('Action limit check error:', error);
      next(new AppError('Failed to verify action limit', 500));
    }
  };
};
