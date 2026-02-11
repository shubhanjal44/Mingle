/**
 * Content Moderation Service
 * Automated content moderation using rules and pattern matching
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';

interface ModerationResult {
  isClean: boolean;
  score: number;
  flags: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'allow' | 'review' | 'block';
  reasons: string[];
}

interface SpamDetectionResult {
  isSpam: boolean;
  confidence: number;
  indicators: string[];
}

/**
 * Content Moderation Service Class
 */
class ContentModerationService {
  // Blacklisted words and patterns
  private readonly PROFANITY_WORDS = [
    // Add actual profanity words here (keeping it clean for this example)
    'inappropriate',
    'offensive',
    'badword',
  ];

  private readonly SPAM_PATTERNS = [
    /click\s+here/gi,
    /buy\s+now/gi,
    /limited\s+time/gi,
    /act\s+now/gi,
    /100%\s+free/gi,
    /make\s+money/gi,
    /work\s+from\s+home/gi,
  ];

  private readonly SUSPICIOUS_PATTERNS = [
    /\d{10,}/g, // Long numbers (potential phone numbers)
    /https?:\/\/[^\s]+/gi, // URLs
    /@[\w]+/g, // Social media handles
    /\b\w+@\w+\.\w+/gi, // Email addresses
  ];

  /**
   * Moderate text content (reviews, messages, profiles)
   */
  async moderateContent(
    content: string,
    contentType: 'review' | 'message' | 'profile' | 'event'
  ): Promise<ModerationResult> {
    const flags: string[] = [];
    const reasons: string[] = [];
    let score = 0;

    // 1. Check for profanity
    const profanityResult = this.checkProfanity(content);
    if (!profanityResult.isClean) {
      score += profanityResult.count * 20;
      flags.push('profanity');
      reasons.push(`Contains ${profanityResult.count} inappropriate word(s)`);
    }

    // 2. Check for spam patterns
    const spamResult = this.detectSpam(content);
    if (spamResult.isSpam) {
      score += 30;
      flags.push('spam');
      reasons.push(...spamResult.indicators);
    }

    // 3. Check for suspicious patterns (personal info, URLs)
    const suspiciousResult = this.detectSuspiciousPatterns(content);
    if (suspiciousResult.found) {
      score += 15 * suspiciousResult.patterns.length;
      flags.push('suspicious');
      reasons.push(...suspiciousResult.patterns);
    }

    // 4. Check for excessive caps (shouting)
    if (this.hasExcessiveCaps(content)) {
      score += 10;
      flags.push('excessive-caps');
      reasons.push('Excessive use of capital letters');
    }

    // 5. Check for repeated characters (spam indicator)
    if (this.hasRepeatedCharacters(content)) {
      score += 10;
      flags.push('repeated-chars');
      reasons.push('Excessive character repetition');
    }

    // 6. Check content length (too short might be spam)
    if (contentType === 'review' && content.length < 10) {
      score += 15;
      flags.push('too-short');
      reasons.push('Content too short to be meaningful');
    }

    // Determine severity and action
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let action: 'allow' | 'review' | 'block' = 'allow';

    if (score >= 70) {
      severity = 'critical';
      action = 'block';
    } else if (score >= 50) {
      severity = 'high';
      action = 'review';
    } else if (score >= 30) {
      severity = 'medium';
      action = 'review';
    } else if (score > 0) {
      severity = 'low';
      action = 'allow';
    }

    return {
      isClean: score === 0,
      score,
      flags,
      severity,
      action,
      reasons,
    };
  }

  /**
   * Moderate user profile
   */
  async moderateProfile(userId: string): Promise<ModerationResult> {
    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        name: true,
        bio: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const nameResult = await this.moderateContent(user.name, 'profile');
    const bioResult = user.bio
      ? await this.moderateContent(user.bio, 'profile')
      : { isClean: true, score: 0, flags: [], severity: 'low' as const, action: 'allow' as const, reasons: [] };

    // Combine results
    const combinedScore = nameResult.score + bioResult.score;
    const combinedFlags = [...new Set([...nameResult.flags, ...bioResult.flags])];
    const combinedReasons = [...nameResult.reasons, ...bioResult.reasons];

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let action: 'allow' | 'review' | 'block' = 'allow';

    if (combinedScore >= 70) {
      severity = 'critical';
      action = 'block';
    } else if (combinedScore >= 50) {
      severity = 'high';
      action = 'review';
    } else if (combinedScore >= 30) {
      severity = 'medium';
      action = 'review';
    } else if (combinedScore > 0) {
      severity = 'low';
      action = 'allow';
    }

    return {
      isClean: combinedScore === 0,
      score: combinedScore,
      flags: combinedFlags,
      severity,
      action,
      reasons: combinedReasons,
    };
  }

  /**
   * Check user behavior for suspicious activity
   */
  async detectSuspiciousBehavior(userId: string): Promise<{
    isSuspicious: boolean;
    indicators: string[];
    riskScore: number;
  }> {
    const indicators: string[] = [];
    let riskScore = 0;

    // Get user activity
    const [user, recentMessages, recentReviews, recentSwaps] = await Promise.all([
      prisma.user.findUnique({
        where: { userId },
        include: {
          _count: {
            select: {
              reportsCreated: true,
              reportsReceived: true,
            },
          },
        },
      }),
      prisma.message.count({
        where: {
          senderId: userId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
      prisma.review.count({
        where: {
          studentId: userId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.swap.count({
        where: {
          initiatorId: userId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    if (!user) {
      throw new Error('User not found');
    }

    // 1. Excessive activity (potential spam)
    if (recentMessages > 50) {
      riskScore += 25;
      indicators.push(`Sent ${recentMessages} messages in last 24 hours`);
    }

    if (recentReviews > 10) {
      riskScore += 20;
      indicators.push(`Posted ${recentReviews} reviews in last 24 hours`);
    }

    if (recentSwaps > 10) {
      riskScore += 15;
      indicators.push(`Created ${recentSwaps} swaps in last 24 hours`);
    }

    // 2. High report ratio
    if (user._count.reportsReceived > 5) {
      riskScore += 30;
      indicators.push(`Received ${user._count.reportsReceived} reports`);
    }

    // 3. Low rating (if they have swaps)
    if (user.completedSwaps > 0 && user.rating && user.rating < 3.0) {
      riskScore += 20;
      indicators.push(`Low rating: ${user.rating.toFixed(1)}`);
    }

    // 4. Unverified email
    if (!user.emailVerified) {
      riskScore += 10;
      indicators.push('Email not verified');
    }

    // 5. Recently created account with high activity
    const accountAge = Date.now() - new Date(user.createdAt).getTime();
    const accountAgeDays = accountAge / (24 * 60 * 60 * 1000);

    if (accountAgeDays < 7 && (recentMessages > 20 || recentSwaps > 5)) {
      riskScore += 25;
      indicators.push('New account with high activity');
    }

    return {
      isSuspicious: riskScore > 30,
      indicators,
      riskScore,
    };
  }

  /**
   * Auto-moderate new content
   */
  async autoModerateReview(reviewId: string): Promise<void> {
    const review = await prisma.review.findUnique({
      where: { reviewId },
      select: {
        comment: true,
        studentId: true,
      },
    });

    if (!review || !review.comment) {
      return;
    }

    const result = await this.moderateContent(review.comment, 'review');

    if (result.action === 'block') {
      // Auto-delete flagged content - Note: isDeleted field doesn't exist in schema
      // You could use a Report instead or add this field to schema
      logger.warn('Review flagged for deletion (blocked)', {
        reviewId,
        studentId: review.studentId,
        flags: result.flags,
        score: result.score,
      });

      // Create report instead
      await prisma.report.create({
        data: {
          reporterId: 'SYSTEM', // Use a system user ID
          reportedUserId: review.studentId,
          reviewId: reviewId,
          type: 'INAPPROPRIATE_CONTENT',
          status: 'RESOLVED',
          reason: 'Auto-moderated content',
          description: result.reasons.join(', '),
        },
      });

      // Create alert for admins
      await this.createModerationAlert({
        type: 'REVIEW',
        entityId: reviewId,
        userId: review.studentId,
        action: 'auto-flagged',
        reason: result.reasons.join(', '),
        severity: result.severity,
      });
    } else if (result.action === 'review') {
      // Flag for manual review
      await this.createModerationAlert({
        type: 'REVIEW',
        entityId: reviewId,
        userId: review.studentId,
        action: 'flagged-for-review',
        reason: result.reasons.join(', '),
        severity: result.severity,
      });
    }
  }

  /**
   * Auto-moderate chat messages
   */
  async autoModerateMessage(messageId: string): Promise<boolean> {
    const message = await prisma.message.findUnique({
      where: { messageId },
      select: {
        content: true,
        senderId: true,
      },
    });

    if (!message) {
      return true; // Allow if message not found
    }

    const result = await this.moderateContent(message.content, 'message');

    if (result.action === 'block') {
      // Mark message as deleted
      await prisma.message.update({
        where: { messageId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      // Create alert
      await this.createModerationAlert({
        type: 'MESSAGE',
        entityId: messageId,
        userId: message.senderId,
        action: 'auto-deleted',
        reason: result.reasons.join(', '),
        severity: result.severity,
      });

      return false; // Blocked
    }

    return true; // Allowed
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats(timeRange: { startDate: Date; endDate: Date }) {
    // Get actual moderation data from reports
    const reports = await prisma.report.findMany({
      where: {
        createdAt: {
          gte: timeRange.startDate,
          lte: timeRange.endDate,
        },
      },
    });

    const totalModerated = reports.length;
    const autoDeleted = reports.filter(r => r.status === 'RESOLVED').length;
    const flaggedForReview = reports.filter(r => r.status === 'PENDING').length;

    return {
      totalModerated,
      autoDeleted,
      flaggedForReview,
      falsePositives: 0,
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
      byType: {
        review: reports.filter(r => r.reviewId !== null).length,
        message: reports.filter(r => r.messageId !== null).length,
        profile: reports.filter(r => r.type === 'PROFILE_CONTENT').length,
        event: reports.filter(r => r.eventId !== null).length,
      },
    };
  }

  // ==================== Helper Methods ====================

  private checkProfanity(text: string): { isClean: boolean; count: number } {
    let count = 0;
    const lowerText = text.toLowerCase();

    for (const word of this.PROFANITY_WORDS) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        count += matches.length;
      }
    }

    return {
      isClean: count === 0,
      count,
    };
  }

  private detectSpam(text: string): SpamDetectionResult {
    const indicators: string[] = [];

    for (const pattern of this.SPAM_PATTERNS) {
      if (pattern.test(text)) {
        indicators.push(`Spam pattern detected: ${pattern.source}`);
      }
    }

    // Check for excessive links
    const urlMatches = text.match(/https?:\/\/[^\s]+/gi);
    if (urlMatches && urlMatches.length > 2) {
      indicators.push(`Multiple links detected (${urlMatches.length})`);
    }

    return {
      isSpam: indicators.length > 0,
      confidence: Math.min(indicators.length * 0.33, 1),
      indicators,
    };
  }

  private detectSuspiciousPatterns(text: string): {
    found: boolean;
    patterns: string[];
  } {
    const patterns: string[] = [];

    // Check for phone numbers
    const phoneMatches = text.match(/\d{10,}/g);
    if (phoneMatches && phoneMatches.length > 0) {
      patterns.push('Contains potential phone number');
    }

    // Check for email addresses
    const emailMatches = text.match(/\b\w+@\w+\.\w+/gi);
    if (emailMatches && emailMatches.length > 0) {
      patterns.push('Contains email address');
    }

    // Check for URLs
    const urlMatches = text.match(/https?:\/\/[^\s]+/gi);
    if (urlMatches && urlMatches.length > 0) {
      patterns.push('Contains URL');
    }

    // Check for social media handles
    const handleMatches = text.match(/@[\w]+/g);
    if (handleMatches && handleMatches.length > 0) {
      patterns.push('Contains social media handle');
    }

    return {
      found: patterns.length > 0,
      patterns,
    };
  }

  private hasExcessiveCaps(text: string): boolean {
    const capsCount = (text.match(/[A-Z]/g) || []).length;
    const totalLetters = (text.match(/[a-zA-Z]/g) || []).length;

    if (totalLetters === 0) return false;

    const capsRatio = capsCount / totalLetters;
    return capsRatio > 0.5 && totalLetters > 10;
  }

  private hasRepeatedCharacters(text: string): boolean {
    // Check for 4 or more repeated characters
    return /(.)\1{3,}/g.test(text);
  }

  private async createModerationAlert(data: {
    type: string;
    entityId: string;
    userId: string;
    action: string;
    reason: string;
    severity: string;
  }): Promise<void> {
    // Log moderation alert
    logger.info('Moderation alert created', data);
    
    // Could also create a notification for admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { userId: true },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.userId,
          type: 'SYSTEM',
          title: 'Content Moderation Alert',
          message: `${data.type} flagged: ${data.reason}`,
          data: data,
        },
      });
    }
  }
}

export const contentModerationService = new ContentModerationService();
