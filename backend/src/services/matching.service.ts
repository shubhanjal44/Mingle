import prisma from '../config/database';
import { SkillLevel } from '@prisma/client';

interface MatchCriteria {
  userId: string;
  skillId?: string;
  city?: string;
  state?: string;
  minRating?: number;
  maxDistance?: number;
  proficiencyLevel?: SkillLevel;
  remoteOnly?: boolean;
}

interface MatchScore {
  userId: string;
  score: number;
  matchReasons: string[];
  user: any;
  matchedSkills: any[];
}

class MatchingService {
  /**
   * Find potential skill swap matches for a user
   * Algorithm considers:
   * - Complementary skills (user wants to learn what other teaches, vice versa)
   * - Location proximity (same city > same state > remote)
   * - Skill level compatibility
   * - User ratings
   * - Active status
   */
  async findMatches(criteria: MatchCriteria, limit: number = 20): Promise<MatchScore[]> {
    const { userId, skillId, city, state, minRating = 0, remoteOnly = false } = criteria;

    // Get user's skills
    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: {
        skill: {
          include: {
            category: true,
          },
        },
      },
    });

    const teachingSkills = userSkills.filter((us) => us.skillType === 'TEACH');
    const learningSkills = userSkills.filter((us) => us.skillType === 'LEARN');

    if (teachingSkills.length === 0 || learningSkills.length === 0) {
      return []; // User needs both teaching and learning skills
    }

    // Get user's location for proximity matching
    const currentUser = await prisma.user.findUnique({
      where: { userId },
      select: { city: true, state: true, latitude: true, longitude: true },
    });

    // Find potential matches
    // Looking for users who:
    // 1. Teach what current user wants to learn
    // 2. Want to learn what current user teaches
    const teachingSkillIds = teachingSkills.map((s) => s.skillId);
    const learningSkillIds = learningSkills.map((s) => s.skillId);

    // Find users who teach what current user wants to learn
    const potentialMatches = await prisma.user.findMany({
      where: {
        userId: { not: userId },
        status: 'ACTIVE',
        emailVerified: true,
        rating: { gte: minRating },
        AND: [
          {
            skills: {
              some: {
                skillId: { in: learningSkillIds },
                skillType: 'TEACH',
              },
            },
          },
          {
            skills: {
              some: {
                skillId: { in: teachingSkillIds },
                skillType: 'LEARN',
              },
            },
          },
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
      take: limit * 3, // Get more to filter and score
    });

    // Score each potential match
    const scoredMatches: MatchScore[] = [];

    for (const match of potentialMatches) {
      const score = this.calculateMatchScore({
        currentUser: {
          userId,
          teachingSkills,
          learningSkills,
          location: currentUser,
        },
        potentialMatch: match,
        remoteOnly,
      });

      if (score.score > 0) {
        scoredMatches.push(score);
      }
    }

    // Sort by score (highest first) and return top matches
    return scoredMatches.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Calculate match score between current user and potential match
   * Scoring factors:
   * - Skill compatibility (40 points)
   * - Location proximity (25 points)
   * - Rating (15 points)
   * - Skill level compatibility (10 points)
   * - Experience match (10 points)
   */
  private calculateMatchScore(params: {
    currentUser: any;
    potentialMatch: any;
    remoteOnly: boolean;
  }): MatchScore {
    const { currentUser, potentialMatch, remoteOnly } = params;
    let totalScore = 0;
    const matchReasons: string[] = [];
    const matchedSkills: any[] = [];

    // 1. Skill Compatibility (40 points max)
    const matchTeachingSkills = potentialMatch.skills.filter(
      (s: any) => s.skillType === 'TEACH' && currentUser.learningSkills.some((ls: any) => ls.skillId === s.skillId)
    );

    const matchLearningSkills = potentialMatch.skills.filter(
      (s: any) => s.skillType === 'LEARN' && currentUser.teachingSkills.some((ts: any) => ts.skillId === s.skillId)
    );

    const skillMatchCount = Math.min(matchTeachingSkills.length, matchLearningSkills.length);
    const skillScore = Math.min(skillMatchCount * 20, 40); // Up to 40 points
    totalScore += skillScore;

    if (skillMatchCount > 0) {
      matchReasons.push(`${skillMatchCount} complementary skill match${skillMatchCount > 1 ? 'es' : ''}`);
      matchedSkills.push(...matchTeachingSkills.map((s: any) => s.skill));
    }

    // 2. Location Proximity (25 points max)
    if (!remoteOnly) {
      const locationScore = this.calculateLocationScore(currentUser.location, {
        city: potentialMatch.city,
        state: potentialMatch.state,
        latitude: potentialMatch.latitude,
        longitude: potentialMatch.longitude,
      });
      totalScore += locationScore;

      if (locationScore === 25) {
        matchReasons.push('Same city');
      } else if (locationScore === 15) {
        matchReasons.push('Same state');
      } else if (locationScore === 5) {
        matchReasons.push('Remote-friendly');
      }
    }

    // 3. Rating Score (15 points max)
    const ratingScore = Math.min((potentialMatch.rating / 5) * 15, 15);
    totalScore += ratingScore;

    if (potentialMatch.rating >= 4.5) {
      matchReasons.push('Highly rated teacher');
    }

    // 4. Skill Level Compatibility (10 points max)
    const levelScore = this.calculateLevelCompatibility(currentUser.learningSkills, matchTeachingSkills);
    totalScore += levelScore;

    // 5. Experience Match (10 points max)
    const experienceScore = this.calculateExperienceScore(potentialMatch);
    totalScore += experienceScore;

    if (potentialMatch.completedSwaps >= 10) {
      matchReasons.push('Experienced swapper');
    }

    // Remove sensitive data
    const { password, ...userWithoutPassword } = potentialMatch;

    return {
      userId: potentialMatch.userId,
      score: Math.round(totalScore),
      matchReasons,
      user: {
        ...userWithoutPassword,
        skills: undefined, // Remove to reduce payload size
      },
      matchedSkills,
    };
  }

  /**
   * Calculate location proximity score
   */
  private calculateLocationScore(
    userLocation: any,
    matchLocation: any
  ): number {
    if (!userLocation || !matchLocation) return 5; // Default for remote

    // Same city = 25 points
    if (
      userLocation.city &&
      matchLocation.city &&
      userLocation.city.toLowerCase() === matchLocation.city.toLowerCase()
    ) {
      return 25;
    }

    // Same state = 15 points
    if (
      userLocation.state &&
      matchLocation.state &&
      userLocation.state.toLowerCase() === matchLocation.state.toLowerCase()
    ) {
      return 15;
    }

    // Different state but has location = 5 points
    return 5;
  }

  /**
   * Calculate skill level compatibility
   * Better match if teacher's level >= student's desired level
   */
  private calculateLevelCompatibility(
    learningSkills: any[],
    teachingSkills: any[]
  ): number {
    if (learningSkills.length === 0 || teachingSkills.length === 0) return 0;

    const levelValues = {
      BEGINNER: 1,
      INTERMEDIATE: 2,
      ADVANCED: 3,
      EXPERT: 4,
    };

    let compatibilityScore = 0;

    for (const learningSkill of learningSkills) {
      const matchingTeachSkill = teachingSkills.find(
        (ts: any) => ts.skillId === learningSkill.skillId
      );

      if (matchingTeachSkill) {
        const learnerLevel = levelValues[learningSkill.proficiencyLevel as keyof typeof levelValues];
        const teacherLevel = levelValues[matchingTeachSkill.proficiencyLevel as keyof typeof levelValues];

        // Teacher should be at least same level or higher
        if (teacherLevel >= learnerLevel) {
          compatibilityScore += 5;
        } else {
          compatibilityScore += 2; // Still some compatibility
        }
      }
    }

    return Math.min(compatibilityScore, 10);
  }

  /**
   * Calculate experience score based on completed swaps and time taught
   */
  private calculateExperienceScore(user: any): number {
    let score = 0;

    // Points for completed swaps
    if (user.completedSwaps >= 50) score += 5;
    else if (user.completedSwaps >= 20) score += 4;
    else if (user.completedSwaps >= 10) score += 3;
    else if (user.completedSwaps >= 5) score += 2;
    else if (user.completedSwaps >= 1) score += 1;

    // Points for hours taught
    if (user.totalHoursTaught >= 100) score += 5;
    else if (user.totalHoursTaught >= 50) score += 4;
    else if (user.totalHoursTaught >= 20) score += 3;
    else if (user.totalHoursTaught >= 10) score += 2;
    else if (user.totalHoursTaught >= 1) score += 1;

    return Math.min(score, 10);
  }

  /**
   * Get recommended users based on a specific skill
   */
  async getRecommendationsForSkill(
    userId: string,
    skillId: string,
    limit: number = 10
  ): Promise<any[]> {
    // Find users who teach this skill
    const teachers = await prisma.user.findMany({
      where: {
        userId: { not: userId },
        status: 'ACTIVE',
        emailVerified: true,
        skills: {
          some: {
            skillId,
            skillType: 'TEACH',
          },
        },
      },
      include: {
        skills: {
          where: {
            skillId,
            skillType: 'TEACH',
          },
          include: {
            skill: true,
          },
        },
      },
      take: limit * 2,
    });

    // Score and sort by rating and experience
    const scoredTeachers = teachers.map((teacher) => {
      let score = teacher.rating * 20; // Rating contributes 0-100 points
      score += Math.min(teacher.completedSwaps * 2, 30); // Swaps contribute 0-30 points
      score += Math.min(teacher.totalHoursTaught, 20); // Hours contribute 0-20 points

      return {
        ...teacher,
        score,
      };
    });

    return scoredTeachers
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score, password, ...teacher }) => teacher);
  }

  /**
   * Get match statistics for a user
   */
  async getMatchStats(userId: string): Promise<any> {
    const matches = await this.findMatches({ userId }, 100);

    return {
      totalMatches: matches.length,
      perfectMatches: matches.filter((m) => m.score >= 80).length,
      goodMatches: matches.filter((m) => m.score >= 60 && m.score < 80).length,
      averageMatchScore: matches.length > 0
        ? Math.round(matches.reduce((sum, m) => sum + m.score, 0) / matches.length)
        : 0,
      topMatchScore: matches.length > 0 ? matches[0].score : 0,
    };
  }
}

export const matchingService = new MatchingService();
