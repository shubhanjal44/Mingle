import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Onboarding Service
 *
 * Manages user onboarding flow, tutorial progress, and feature discovery
 */

// Onboarding steps
export const ONBOARDING_STEPS = {
  WELCOME: 'welcome',
  PROFILE_SETUP: 'profile_setup',
  ADD_SKILLS: 'add_skills',
  DISCOVER_USERS: 'discover_users',
  FIRST_SWAP: 'first_swap',
  COMPLETE: 'complete',
} as const;

export type OnboardingStep = typeof ONBOARDING_STEPS[keyof typeof ONBOARDING_STEPS];

// Tutorial types
export const TUTORIAL_TYPES = {
  PROFILE: 'profile',
  SKILLS: 'skills',
  SEARCH: 'search',
  SWAP_REQUEST: 'swap_request',
  MESSAGING: 'messaging',
  REVIEWS: 'reviews',
  EVENTS: 'events',
  COMMUNITIES: 'communities',
  PREMIUM: 'premium',
} as const;

export type TutorialType = typeof TUTORIAL_TYPES[keyof typeof TUTORIAL_TYPES];

// Feature discovery items
export const FEATURES = {
  SKILL_RECOMMENDATIONS: 'skill_recommendations',
  USER_MATCHING: 'user_matching',
  EVENT_DISCOVERY: 'event_discovery',
  COMMUNITY_JOIN: 'community_join',
  PREMIUM_UPGRADE: 'premium_upgrade',
  PROFILE_BOOST: 'profile_boost',
  ADVANCED_SEARCH: 'advanced_search',
  ANALYTICS_DASHBOARD: 'analytics_dashboard',
} as const;

export type Feature = typeof FEATURES[keyof typeof FEATURES];

interface OnboardingProgress {
  userId: string;
  currentStep?: string | null;
  completedSteps: any; // JSON field
  isCompleted: boolean;
  completedAt?: Date | null;
  skippedSteps?: any; // JSON field (if exists)
}

interface TutorialProgress {
  userId: string;
  tutorialKey: string;
  isCompleted: boolean;
  completedAt?: Date | null;
  isSkipped: boolean;
}

interface FeatureDiscovery {
  userId: string;
  featureKey: string;
  isDiscovered: boolean;
  discoveredAt?: Date | null;
  isDismissed: boolean;
  dismissedAt?: Date | null;
}

class OnboardingService {
  /**
   * Initialize onboarding for new user
   */
  async initializeOnboarding(userId: string): Promise<any> {
    try {
      // Check if onboarding already exists
      const existing = await prisma.onboardingProgress.findUnique({
        where: { userId },
      });

      if (existing) {
        return existing;
      }

      // Create new onboarding progress
      const onboarding = await prisma.onboardingProgress.create({
        data: {
          userId,
          currentStep: ONBOARDING_STEPS.WELCOME,
          completedSteps: JSON.stringify([]),
          isCompleted: false,
        },
      });

      // Initialize feature discovery
      await this.initializeFeatureDiscovery(userId);

      return onboarding;
    } catch (error) {
      console.error('Error initializing onboarding:', error);
      throw error;
    }
  }

  /**
   * Get onboarding progress for user
   */
  async getProgress(userId: string): Promise<any> {
    try {
      const progress = await prisma.onboardingProgress.findUnique({
        where: { userId },
      });

      if (!progress) return null;

      // Parse JSON fields
      return {
        ...progress,
        completedSteps: typeof progress.completedSteps === 'string' 
          ? JSON.parse(progress.completedSteps as string)
          : progress.completedSteps || [],
      };
    } catch (error) {
      console.error('Error getting onboarding progress:', error);
      throw error;
    }
  }

  /**
   * Update onboarding step
   */
  async updateStep(
    userId: string,
    step: OnboardingStep,
    action: 'complete' | 'skip' = 'complete'
  ): Promise<any> {
    try {
      const progress = await this.getProgress(userId);
      if (!progress) {
        throw new Error('Onboarding not initialized');
      }

      const steps = Object.values(ONBOARDING_STEPS);
      const currentStepIndex = steps.indexOf(step);
      const nextStep = steps[currentStepIndex + 1] || ONBOARDING_STEPS.COMPLETE;

      const completedSteps = action === 'complete'
        ? [...(progress.completedSteps || []), step]
        : progress.completedSteps || [];

      const isCompleted = nextStep === ONBOARDING_STEPS.COMPLETE;

      const updated = await prisma.onboardingProgress.update({
        where: { userId },
        data: {
          currentStep: nextStep,
          completedSteps: JSON.stringify(completedSteps),
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
        },
      });

      return {
        ...updated,
        completedSteps: JSON.parse(updated.completedSteps as string),
      };
    } catch (error) {
      console.error('Error updating onboarding step:', error);
      throw error;
    }
  }

  /**
   * Skip onboarding
   */
  async skipOnboarding(userId: string): Promise<any> {
    try {
      const updated = await prisma.onboardingProgress.update({
        where: { userId },
        data: {
          currentStep: ONBOARDING_STEPS.COMPLETE,
          isCompleted: true,
          completedAt: new Date(),
        },
      });

      return updated;
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      throw error;
    }
  }

  /**
   * Reset onboarding
   */
  async resetOnboarding(userId: string): Promise<any> {
    try {
      const updated = await prisma.onboardingProgress.update({
        where: { userId },
        data: {
          currentStep: ONBOARDING_STEPS.WELCOME,
          completedSteps: JSON.stringify([]),
          isCompleted: false,
          completedAt: null,
        },
      });

      return {
        ...updated,
        completedSteps: JSON.parse(updated.completedSteps as string),
      };
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      throw error;
    }
  }

  /**
   * Start tutorial
   */
  async startTutorial(
    userId: string,
    tutorialType: TutorialType
  ): Promise<any> {
    try {
      const tutorial = await prisma.tutorialProgress.upsert({
        where: {
          userId_tutorialKey: {
            userId,
            tutorialKey: tutorialType,
          },
        },
        create: {
          userId,
          tutorialKey: tutorialType,
          isCompleted: false,
          isSkipped: false,
        },
        update: {
          isCompleted: false,
          isSkipped: false,
          completedAt: null,
        },
      });

      return tutorial;
    } catch (error) {
      console.error('Error starting tutorial:', error);
      throw error;
    }
  }

  /**
   * Get tutorial progress
   */
  async getTutorialProgress(
    userId: string,
    tutorialType: TutorialType
  ): Promise<any> {
    try {
      const tutorial = await prisma.tutorialProgress.findUnique({
        where: {
          userId_tutorialKey: {
            userId,
            tutorialKey: tutorialType,
          },
        },
      });

      return tutorial;
    } catch (error) {
      console.error('Error getting tutorial progress:', error);
      throw error;
    }
  }

  /**
   * Get all tutorials for user
   */
  async getAllTutorials(userId: string): Promise<any[]> {
    try {
      const tutorials = await prisma.tutorialProgress.findMany({
        where: { userId },
      });

      return tutorials;
    } catch (error) {
      console.error('Error getting all tutorials:', error);
      throw error;
    }
  }

  /**
   * Complete tutorial
   */
  async completeTutorial(
    userId: string,
    tutorialType: TutorialType
  ): Promise<any> {
    try {
      const tutorial = await prisma.tutorialProgress.findUnique({
        where: {
          userId_tutorialKey: {
            userId,
            tutorialKey: tutorialType,
          },
        },
      });

      if (!tutorial) {
        throw new Error('Tutorial not found');
      }

      const updated = await prisma.tutorialProgress.update({
        where: {
          userId_tutorialKey: {
            userId,
            tutorialKey: tutorialType,
          },
        },
        data: {
          isCompleted: true,
          completedAt: new Date(),
        },
      });

      return updated;
    } catch (error) {
      console.error('Error completing tutorial:', error);
      throw error;
    }
  }

  /**
   * Initialize feature discovery for user
   */
  async initializeFeatureDiscovery(userId: string): Promise<void> {
    try {
      const features = Object.values(FEATURES);

      await prisma.featureDiscovery.createMany({
        data: features.map((feature) => ({
          userId,
          featureKey: feature,
          isDiscovered: false,
          isDismissed: false,
        })),
        skipDuplicates: true,
      });
    } catch (error) {
      console.error('Error initializing feature discovery:', error);
      throw error;
    }
  }

  /**
   * Mark feature as discovered
   */
  async discoverFeature(userId: string, feature: Feature): Promise<any> {
    try {
      const discovered = await prisma.featureDiscovery.upsert({
        where: {
          userId_featureKey: {
            userId,
            featureKey: feature,
          },
        },
        create: {
          userId,
          featureKey: feature,
          isDiscovered: true,
          discoveredAt: new Date(),
          isDismissed: false,
        },
        update: {
          isDiscovered: true,
          discoveredAt: new Date(),
        },
      });

      return discovered;
    } catch (error) {
      console.error('Error discovering feature:', error);
      throw error;
    }
  }

  /**
   * Dismiss feature discovery
   */
  async dismissFeature(userId: string, feature: Feature): Promise<any> {
    try {
      const dismissed = await prisma.featureDiscovery.update({
        where: {
          userId_featureKey: {
            userId,
            featureKey: feature,
          },
        },
        data: {
          isDismissed: true,
          dismissedAt: new Date(),
        },
      });

      return dismissed;
    } catch (error) {
      console.error('Error dismissing feature:', error);
      throw error;
    }
  }

  /**
   * Get undiscovered features
   */
  async getUndiscoveredFeatures(userId: string): Promise<any[]> {
    try {
      const features = await prisma.featureDiscovery.findMany({
        where: {
          userId,
          isDiscovered: false,
          isDismissed: false,
        },
      });

      return features;
    } catch (error) {
      console.error('Error getting undiscovered features:', error);
      throw error;
    }
  }

  /**
   * Get onboarding stats
   */
  async getOnboardingStats(): Promise<{
    totalUsers: number;
    completedOnboarding: number;
    inProgress: number;
    completionRate: number;
    averageCompletionTime: number;
    stepCompletionRates: Record<string, number>;
  }> {
    try {
      const [total, completed, allProgress] = await Promise.all([
        prisma.onboardingProgress.count(),
        prisma.onboardingProgress.count({
          where: { isCompleted: true },
        }),
        prisma.onboardingProgress.findMany(),
      ]);

      const inProgress = total - completed;
      const completionRate = total > 0 ? (completed / total) * 100 : 0;

      // Calculate average completion time
      const completedWithTime = allProgress.filter(
        (p) => p.isCompleted && p.completedAt && p.createdAt
      );

      const averageCompletionTime =
        completedWithTime.length > 0
          ? completedWithTime.reduce((sum, p) => {
              const time = p.completedAt!.getTime() - p.createdAt.getTime();
              return sum + time;
            }, 0) / completedWithTime.length
          : 0;

      // Calculate step completion rates
      const stepCompletionRates: Record<string, number> = {};
      const steps = Object.values(ONBOARDING_STEPS);

      for (const step of steps) {
        const completedStep = allProgress.filter((p) => {
          const completedSteps = typeof p.completedSteps === 'string'
            ? JSON.parse(p.completedSteps)
            : p.completedSteps || [];
          return completedSteps.includes(step);
        }).length;
        stepCompletionRates[step] = total > 0 ? (completedStep / total) * 100 : 0;
      }

      return {
        totalUsers: total,
        completedOnboarding: completed,
        inProgress,
        completionRate,
        averageCompletionTime: averageCompletionTime / 1000 / 60, // Convert to minutes
        stepCompletionRates,
      };
    } catch (error) {
      console.error('Error getting onboarding stats:', error);
      throw error;
    }
  }

  /**
   * Get tutorial stats
   */
  async getTutorialStats(): Promise<{
    totalTutorials: number;
    completedTutorials: number;
    completionRate: number;
    tutorialCompletionRates: Record<string, number>;
  }> {
    try {
      const [total, completed, allTutorials] = await Promise.all([
        prisma.tutorialProgress.count(),
        prisma.tutorialProgress.count({
          where: { isCompleted: true },
        }),
        prisma.tutorialProgress.findMany(),
      ]);

      const completionRate = total > 0 ? (completed / total) * 100 : 0;

      // Calculate tutorial-specific completion rates
      const tutorialCompletionRates: Record<string, number> = {};
      const types = Object.values(TUTORIAL_TYPES);

      for (const type of types) {
        const typeTotal = allTutorials.filter((t) => t.tutorialKey === type).length;
        const typeCompleted = allTutorials.filter(
          (t) => t.tutorialKey === type && t.isCompleted
        ).length;
        tutorialCompletionRates[type] =
          typeTotal > 0 ? (typeCompleted / typeTotal) * 100 : 0;
      }

      return {
        totalTutorials: total,
        completedTutorials: completed,
        completionRate,
        tutorialCompletionRates,
      };
    } catch (error) {
      console.error('Error getting tutorial stats:', error);
      throw error;
    }
  }

  /**
   * Get feature discovery stats
   */
  async getFeatureDiscoveryStats(): Promise<{
    totalFeatures: number;
    discoveredFeatures: number;
    discoveryRate: number;
    featureDiscoveryRates: Record<string, number>;
  }> {
    try {
      const [total, discovered, allFeatures] = await Promise.all([
        prisma.featureDiscovery.count(),
        prisma.featureDiscovery.count({
          where: { isDiscovered: true },
        }),
        prisma.featureDiscovery.findMany(),
      ]);

      const discoveryRate = total > 0 ? (discovered / total) * 100 : 0;

      // Calculate feature-specific discovery rates
      const featureDiscoveryRates: Record<string, number> = {};
      const features = Object.values(FEATURES);

      for (const feature of features) {
        const featureTotal = allFeatures.filter((f) => f.featureKey === feature).length;
        const featureDiscovered = allFeatures.filter(
          (f) => f.featureKey === feature && f.isDiscovered
        ).length;
        featureDiscoveryRates[feature] =
          featureTotal > 0 ? (featureDiscovered / featureTotal) * 100 : 0;
      }

      return {
        totalFeatures: total,
        discoveredFeatures: discovered,
        discoveryRate,
        featureDiscoveryRates,
      };
    } catch (error) {
      console.error('Error getting feature discovery stats:', error);
      throw error;
    }
  }
}

export default new OnboardingService();
