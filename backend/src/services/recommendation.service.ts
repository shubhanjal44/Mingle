/**
 * Recommendation Engine Service
 * Provides AI-powered recommendations for skills, users, and content
 */

import prisma from '../config/database';
import { redis } from '../config/redis';
import { CacheTTL, CachePrefix } from './cache.service';
import { logger } from '../utils/logger';

interface RecommendationScore {
  id: string;
  score: number;
  reasons: string[];
}

interface SkillRecommendation {
  categoryId: string;
  categoryName: string;
  score: number;
  matchingUsers: number;
  avgRating: number;
  demandLevel: 'high' | 'medium' | 'low';
  reasons: string[];
}

interface UserRecommendation {
  userId: string;
  userName: string;
  avatar?: string;
  matchScore: number;
  commonSkills: string[];
  complementarySkills: string[];
  distance?: number;
  rating: number;
  reasons: string[];
}

/**
 * Recommendation Engine Service Class
 */
class RecommendationService {
  /**
   * Get personalized skill recommendations for a user
   */
  async getSkillRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<SkillRecommendation[]> {
    const cacheKey = `${CachePrefix.ANALYTICS}skill-recommendations:${userId}`;

    // Try cache first
    const cached = await redis.getJSON<SkillRecommendation[]>(cacheKey);
    if (cached) return cached.slice(0, limit);

    // Get user's current skills
    const user = await prisma.user.findUnique({
      where: { userId },
      include: {
        skills: {
          include: {
            skill: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const userTeachingIds = user.skills
      .filter((s) => s.skillType === 'TEACH')
      .map((s) => s.skill.categoryId);
    const userLearningIds = user.skills
      .filter((s) => s.skillType === 'LEARN')
      .map((s) => s.skill.categoryId);
    const allUserSkillIds = [...userTeachingIds, ...userLearningIds];

    // Get all skill categories user doesn't have
    const allSkills = await prisma.skillCategory.findMany({
      where: {
        categoryId: { notIn: allUserSkillIds },
        isActive: true,
      },
      include: {
        skills: {
          include: {
            userSkills: {
              where: {
                skillType: 'TEACH',
              },
              include: {
                user: {
                  select: {
                    userId: true,
                    city: true,
                    state: true,
                    rating: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Score each skill
    const recommendations: SkillRecommendation[] = [];

    for (const skillCategory of allSkills) {
      // Get all teachers for this category
      const teachers = skillCategory.skills.flatMap((skill) =>
        skill.userSkills.map((us) => us.user)
      );

      // Count learners
      const learnerCount = await prisma.userSkill.count({
        where: {
          skill: {
            categoryId: skillCategory.categoryId,
          },
          skillType: 'LEARN',
        },
      });

      const score = await this.calculateSkillScore(
        user,
        { ...skillCategory, teachers, learnerCount },
        {
          userTeachingIds,
          userLearningIds,
        }
      );

      if (score.score > 0) {
        const teacherCount = teachers.length;
        const avgRating =
          teacherCount > 0
            ? teachers.reduce((sum, u) => sum + (u.rating || 0), 0) / teacherCount
            : 0;

        // Determine demand level
        let demandLevel: 'high' | 'medium' | 'low' = 'low';
        if (learnerCount > teacherCount * 2) demandLevel = 'high';
        else if (learnerCount > teacherCount) demandLevel = 'medium';

        recommendations.push({
          categoryId: skillCategory.categoryId,
          categoryName: skillCategory.name,
          score: score.score,
          matchingUsers: teacherCount,
          avgRating,
          demandLevel,
          reasons: score.reasons,
        });
      }
    }

    // Sort by score and return top recommendations
    const sorted = recommendations.sort((a, b) => b.score - a.score);

    // Cache for 1 hour
    await redis.setJSON(cacheKey, sorted, CacheTTL.LONG);

    return sorted.slice(0, limit);
  }

  /**
   * Get recommended users to connect with
   */
  async getUserRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<UserRecommendation[]> {
    const cacheKey = `${CachePrefix.ANALYTICS}user-recommendations:${userId}`;

    // Try cache first
    const cached = await redis.getJSON<UserRecommendation[]>(cacheKey);
    if (cached) return cached.slice(0, limit);

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { userId },
      include: {
        skills: {
          include: {
            skill: {
              include: {
                category: true,
              },
            },
          },
        },
        connections: true,
      },
    });

    if (!currentUser) {
      throw new Error('User not found');
    }

    // Get users already connected with
    const connectedUserIds = [
      ...currentUser.connections.map((c) => c.connectedUserId),
      userId, // Exclude self
    ];

    // Find potential matches
    const potentialMatches = await prisma.user.findMany({
      where: {
        userId: { notIn: connectedUserIds },
        status: 'ACTIVE',
        emailVerified: true,
      },
      include: {
        skills: {
          include: {
            skill: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      take: 100, // Pre-filter to reduce computation
    });

    // Calculate match scores
    const recommendations: UserRecommendation[] = [];

    for (const match of potentialMatches) {
      const matchScore = this.calculateUserMatchScore(currentUser, match);

      if (matchScore.score > 0) {
        // Find common and complementary skills
        const currentTeaching = currentUser.skills
          .filter((s) => s.skillType === 'TEACH')
          .map((s) => s.skill.categoryId);
        const currentLearning = currentUser.skills
          .filter((s) => s.skillType === 'LEARN')
          .map((s) => s.skill.categoryId);
        const matchTeaching = match.skills
          .filter((s) => s.skillType === 'TEACH')
          .map((s) => s.skill.categoryId);
        const matchLearning = match.skills
          .filter((s) => s.skillType === 'LEARN')
          .map((s) => s.skill.categoryId);

        const commonTeaching = currentTeaching.filter((s) => matchTeaching.includes(s));
        const complementarySkills = currentLearning.filter((s) =>
          matchTeaching.includes(s)
        );

        // Get skill names
        const commonSkillNames = await this.getSkillCategoryNames(commonTeaching);
        const complementarySkillNames = await this.getSkillCategoryNames(
          complementarySkills
        );

        recommendations.push({
          userId: match.userId,
          userName: match.name,
          avatar: match.avatar || undefined,
          matchScore: matchScore.score,
          commonSkills: commonSkillNames,
          complementarySkills: complementarySkillNames,
          rating: match.rating || 0,
          reasons: matchScore.reasons,
        });
      }
    }

    // Sort by match score
    const sorted = recommendations.sort((a, b) => b.matchScore - a.matchScore);

    // Cache for 30 minutes
    await redis.setJSON(cacheKey, sorted, CacheTTL.MEDIUM);

    return sorted.slice(0, limit);
  }

  /**
   * Get content recommendations (events, resources)
   */
  async getEventRecommendations(userId: string, limit: number = 10) {
    const user = await prisma.user.findUnique({
      where: { userId },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const userSkillIds = user.skills.map((s) => s.skillId);

    // Find events related to user's skills
    const events = await prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        startTime: {
          gte: new Date(),
        },
        OR: [
          { skillId: { in: userSkillIds } },
          { city: user.city },
        ],
      },
      include: {
        organizer: {
          select: {
            name: true,
            avatar: true,
            rating: true,
          },
        },
        _count: {
          select: {
            attendees: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
      take: limit,
    });

    return events.map((event) => ({
      eventId: event.eventId,
      title: event.title,
      description: event.description,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      skillId: event.skillId,
      organizer: event.organizer,
      attendees: event._count.attendees,
      maxAttendees: event.maxAttendees,
      relevanceScore: this.calculateEventRelevance(event, user),
    }));
  }

  /**
   * Get "Users Like You" recommendations
   */
  async getSimilarUsers(userId: string, limit: number = 10) {
    const user = await prisma.user.findUnique({
      where: { userId },
      include: {
        skills: {
          include: {
            skill: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const userSkillIds = user.skills.map((s) => s.skillId);

    // Find users with similar skills
    const similarUsers = await prisma.user.findMany({
      where: {
        userId: { not: userId },
        status: 'ACTIVE',
        OR: [
          {
            skills: {
              some: {
                skillId: { in: userSkillIds },
              },
            },
          },
          { city: user.city },
          { state: user.state },
        ],
      },
      include: {
        skills: {
          include: {
            skill: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      take: limit,
    });

    return similarUsers.map((simUser) => ({
      userId: simUser.userId,
      name: simUser.name,
      avatar: simUser.avatar,
      city: simUser.city,
      state: simUser.state,
      rating: simUser.rating,
      level: simUser.level,
      teachingSkills: simUser.skills
        .filter((s) => s.skillType === 'TEACH')
        .map((s) => s.skill.category.name),
      learningSkills: simUser.skills
        .filter((s) => s.skillType === 'LEARN')
        .map((s) => s.skill.category.name),
    }));
  }

  /**
   * Get trending skills
   */
  async getTrendingSkills(limit: number = 10) {
    const cacheKey = `${CachePrefix.ANALYTICS}trending-skills`;

    // Try cache first
    const cached = await redis.getJSON(cacheKey);
    if (cached) return cached;

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const recentSwaps = await prisma.swap.groupBy({
      by: ['initiatorSkillId', 'receiverSkillId'],
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      _count: true,
    });

    // Count skill mentions
    const skillCounts: Record<string, number> = {};

    recentSwaps.forEach((swap) => {
      if (swap.initiatorSkillId) {
        skillCounts[swap.initiatorSkillId] =
          (skillCounts[swap.initiatorSkillId] || 0) + swap._count;
      }
      if (swap.receiverSkillId) {
        skillCounts[swap.receiverSkillId] =
          (skillCounts[swap.receiverSkillId] || 0) + swap._count;
      }
    });

    // Get skill details
    const skillIds = Object.keys(skillCounts);
    const skills = await prisma.skill.findMany({
      where: {
        skillId: { in: skillIds },
      },
      include: {
        category: true,
      },
    });

    const trending = skills
      .map((skill) => ({
        skillId: skill.skillId,
        categoryName: skill.category.name,
        count: skillCounts[skill.skillId] || 0,
        growth: 0, // Would calculate growth rate
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    // Cache for 1 hour
    await redis.setJSON(cacheKey, trending, CacheTTL.LONG);

    return trending;
  }

  // ==================== Helper Methods ====================

  private async calculateSkillScore(
    user: any,
    skillCategory: any,
    context: { userTeachingIds: string[]; userLearningIds: string[] }
  ): Promise<RecommendationScore> {
    let score = 0;
    const reasons: string[] = [];

    // Factor 1: Location match (nearby teachers)
    const localTeachers = skillCategory.teachers?.filter(
      (t: any) => t.city === user.city || t.state === user.state
    ) || [];
    if (localTeachers.length > 0) {
      score += 30;
      reasons.push(`${localTeachers.length} teachers in your area`);
    }

    // Factor 2: Popular skill (high demand)
    const learnerCount = skillCategory.learnerCount || 0;
    if (learnerCount > 10) {
      score += 20;
      reasons.push(`${learnerCount} people want to learn this`);
    }

    // Factor 3: High-rated teachers
    const teachers = skillCategory.teachers || [];
    const avgRating =
      teachers.length > 0
        ? teachers.reduce((sum: number, u: any) => sum + (u.rating || 0), 0) /
          teachers.length
        : 0;
    if (avgRating >= 4.5) {
      score += 25;
      reasons.push(`Highly rated teachers (${avgRating.toFixed(1)} stars)`);
    }

    // Factor 4: Complementary to existing skills
    if (context.userTeachingIds.length > 0) {
      score += 15;
      reasons.push('Complements your existing skills');
    }

    // Factor 5: Skill availability (teachers vs learners ratio)
    const teacherCount = teachers.length;
    if (teacherCount > learnerCount) {
      score += 10;
      reasons.push('Many teachers available');
    }

    return {
      id: skillCategory.categoryId,
      score,
      reasons,
    };
  }

  private calculateUserMatchScore(currentUser: any, matchUser: any): RecommendationScore {
    let score = 0;
    const reasons: string[] = [];

    const currentTeaching = currentUser.skills
      .filter((s: any) => s.skillType === 'TEACH')
      .map((s: any) => s.skill.categoryId);
    const currentLearning = currentUser.skills
      .filter((s: any) => s.skillType === 'LEARN')
      .map((s: any) => s.skill.categoryId);
    const matchTeaching = matchUser.skills
      .filter((s: any) => s.skillType === 'TEACH')
      .map((s: any) => s.skill.categoryId);
    const matchLearning = matchUser.skills
      .filter((s: any) => s.skillType === 'LEARN')
      .map((s: any) => s.skill.categoryId);

    // Factor 1: Skill exchange potential
   const canTeachToMatch = currentTeaching.filter((s: string) => matchLearning.includes(s)).length;
const canLearnFromMatch = currentLearning.filter((s: string) => matchTeaching.includes(s)).length;

    if (canTeachToMatch > 0 && canLearnFromMatch > 0) {
      score += 50;
      reasons.push('Perfect skill exchange match');
    } else if (canTeachToMatch > 0 || canLearnFromMatch > 0) {
      score += 25;
      reasons.push('Complementary skills');
    }

    // Factor 2: Location proximity
    if (currentUser.city === matchUser.city) {
      score += 20;
      reasons.push('Same city');
    } else if (currentUser.state === matchUser.state) {
      score += 10;
      reasons.push('Same state');
    }

    // Factor 3: User rating
    if (matchUser.rating && matchUser.rating >= 4.5) {
      score += 15;
      reasons.push(`Highly rated (${matchUser.rating.toFixed(1)} stars)`);
    }

    // Factor 4: Similar level
    if (Math.abs(currentUser.level - matchUser.level) <= 2) {
      score += 10;
      reasons.push('Similar experience level');
    }

    // Factor 5: Active user
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (matchUser.lastActive && new Date(matchUser.lastActive) > sevenDaysAgo) {
      score += 5;
      reasons.push('Recently active');
    }

    return {
      id: matchUser.userId,
      score,
      reasons,
    };
  }

  private calculateEventRelevance(event: any, user: any): number {
    let score = 0;

    // Event skill matches user's skills
    const userSkillIds = user.skills.map((s: any) => s.skillId);

    if (event.skillId && userSkillIds.includes(event.skillId)) {
      score += 50;
    }

    // Event in user's location
    if (event.city === user.city) {
      score += 30;
    } else if (event.state === user.state) {
      score += 15;
    }

    // Event popularity (participation rate)
    const participationRate =
      event.maxAttendees > 0
        ? (event._count.attendees / event.maxAttendees) * 100
        : 0;
    if (participationRate > 50) {
      score += 20;
    }

    return score;
  }

  private async getSkillCategoryNames(categoryIds: string[]): Promise<string[]> {
    if (categoryIds.length === 0) return [];

    const categories = await prisma.skillCategory.findMany({
      where: {
        categoryId: { in: categoryIds },
      },
      select: {
        name: true,
      },
    });

    return categories.map((c) => c.name);
  }
}

export const recommendationService = new RecommendationService();
