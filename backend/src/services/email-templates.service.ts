/**
 * Email Templates Service
 * Generates HTML email templates for notifications
 */

import { NotificationType } from '@prisma/client';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface SwapRequestTemplateData {
  recipientName: string;
  initiatorName: string;
  skillName: string;
  swapUrl: string;
}

interface SwapAcceptedTemplateData {
  recipientName: string;
  receiverName: string;
  skillName: string;
  swapUrl: string;
}

interface SwapRejectedTemplateData {
  recipientName: string;
  receiverName: string;
  skillName: string;
}

interface SwapCompletedTemplateData {
  recipientName: string;
  partnerName: string;
  xpEarned: number;
  coinsEarned: number;
  swapUrl: string;
}

interface MessageTemplateData {
  recipientName: string;
  senderName: string;
  messagePreview: string;
  chatUrl: string;
}

interface BadgeEarnedTemplateData {
  recipientName: string;
  badgeName: string;
  badgeIcon: string;
  badgeDescription: string;
  badgesUrl: string;
}

interface EventReminderTemplateData {
  recipientName: string;
  eventName: string;
  eventTime: string;
  eventLocation: string;
  eventUrl: string;
}

interface SystemAnnouncementTemplateData {
  recipientName: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
}

interface DigestTemplateData {
  recipientName: string;
  period: string;
  stats: {
    newSwapRequests: number;
    acceptedSwaps: number;
    completedSwaps: number;
    newMessages: number;
    badgesEarned: number;
  };
  highlights: Array<{
    type: string;
    title: string;
    message: string;
    time: string;
  }>;
  dashboardUrl: string;
}

class EmailTemplatesService {
  private readonly appName = 'tej-india India';
  private readonly appUrl = process.env.APP_URL || 'http://localhost:3000';
  private readonly primaryColor = '#6366f1'; // Indigo-600
  private readonly secondaryColor = '#8b5cf6'; // Purple-600

  /**
   * Base HTML template wrapper
   */
  private wrapHTML(content: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.appName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f3f4f6;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, ${this.primaryColor} 0%, ${this.secondaryColor} 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      padding: 30px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: ${this.primaryColor};
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      background: #f9fafb;
      padding: 20px 30px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .stats-card {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
    }
    .badge-icon {
      font-size: 48px;
      text-align: center;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">
      <p>You're receiving this email because you have notifications enabled for ${this.appName}.</p>
      <p><a href="${this.appUrl}/settings/notifications" style="color: ${this.primaryColor};">Manage notification preferences</a></p>
      <p>&copy; ${new Date().getFullYear()} ${this.appName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Swap Request Email
   */
  swapRequest(data: SwapRequestTemplateData): EmailTemplate {
    const html = this.wrapHTML(`
      <div class="header">
        <h1>🤝 New Swap Request</h1>
      </div>
      <div class="content">
        <p>Hi ${data.recipientName},</p>
        <p><strong>${data.initiatorName}</strong> wants to swap skills with you!</p>
        <p>They're interested in learning <strong>${data.skillName}</strong> from you.</p>
        <p>Review their profile and decide if this is a good match for you.</p>
        <a href="${data.swapUrl}" class="button">View Swap Request</a>
        <p>Happy skill sharing!</p>
      </div>
    `);

    const text = `
Hi ${data.recipientName},

${data.initiatorName} wants to swap skills with you!

They're interested in learning ${data.skillName} from you.

View the swap request: ${data.swapUrl}

Happy skill sharing!
    `.trim();

    return {
      subject: `New swap request from ${data.initiatorName}`,
      html,
      text,
    };
  }

  /**
   * Swap Accepted Email
   */
  swapAccepted(data: SwapAcceptedTemplateData): EmailTemplate {
    const html = this.wrapHTML(`
      <div class="header">
        <h1>🎉 Swap Request Accepted!</h1>
      </div>
      <div class="content">
        <p>Hi ${data.recipientName},</p>
        <p>Great news! <strong>${data.receiverName}</strong> has accepted your swap request!</p>
        <p>You can now start learning <strong>${data.skillName}</strong> together.</p>
        <p>Next steps:</p>
        <ul>
          <li>Set up your first session</li>
          <li>Exchange contact details</li>
          <li>Agree on learning goals</li>
        </ul>
        <a href="${data.swapUrl}" class="button">Start Your Swap</a>
        <p>Happy learning!</p>
      </div>
    `);

    const text = `
Hi ${data.recipientName},

Great news! ${data.receiverName} has accepted your swap request!

You can now start learning ${data.skillName} together.

Start your swap: ${data.swapUrl}

Happy learning!
    `.trim();

    return {
      subject: `${data.receiverName} accepted your swap request!`,
      html,
      text,
    };
  }

  /**
   * Swap Rejected Email
   */
  swapRejected(data: SwapRejectedTemplateData): EmailTemplate {
    const html = this.wrapHTML(`
      <div class="header">
        <h1>Swap Request Update</h1>
      </div>
      <div class="content">
        <p>Hi ${data.recipientName},</p>
        <p>${data.receiverName} declined your swap request for ${data.skillName}.</p>
        <p>Don't worry! There are many other skilled teachers on ${this.appName} who would love to swap with you.</p>
        <a href="${this.appUrl}/matches" class="button">Find More Matches</a>
        <p>Keep learning!</p>
      </div>
    `);

    const text = `
Hi ${data.recipientName},

${data.receiverName} declined your swap request for ${data.skillName}.

Don't worry! There are many other skilled teachers who would love to swap with you.

Find more matches: ${this.appUrl}/matches

Keep learning!
    `.trim();

    return {
      subject: `Swap request update`,
      html,
      text,
    };
  }

  /**
   * Swap Completed Email
   */
  swapCompleted(data: SwapCompletedTemplateData): EmailTemplate {
    const html = this.wrapHTML(`
      <div class="header">
        <h1>✅ Swap Completed!</h1>
      </div>
      <div class="content">
        <p>Hi ${data.recipientName},</p>
        <p>Congratulations! Your swap with <strong>${data.partnerName}</strong> has been marked as completed.</p>
        <div class="stats-card">
          <p><strong>Rewards Earned:</strong></p>
          <ul>
            <li>🌟 ${data.xpEarned} XP</li>
            <li>💰 ${data.coinsEarned} SkillCoins</li>
          </ul>
        </div>
        <p>Don't forget to leave a review to help others in the community!</p>
        <a href="${data.swapUrl}" class="button">Leave a Review</a>
        <p>Keep up the great work!</p>
      </div>
    `);

    const text = `
Hi ${data.recipientName},

Congratulations! Your swap with ${data.partnerName} has been completed.

Rewards Earned:
- ${data.xpEarned} XP
- ${data.coinsEarned} SkillCoins

Leave a review: ${data.swapUrl}

Keep up the great work!
    `.trim();

    return {
      subject: `Swap completed! You earned ${data.xpEarned} XP`,
      html,
      text,
    };
  }

  /**
   * New Message Email
   */
  newMessage(data: MessageTemplateData): EmailTemplate {
    const html = this.wrapHTML(`
      <div class="header">
        <h1>💬 New Message</h1>
      </div>
      <div class="content">
        <p>Hi ${data.recipientName},</p>
        <p>You have a new message from <strong>${data.senderName}</strong>:</p>
        <div class="stats-card">
          <p><em>"${data.messagePreview}"</em></p>
        </div>
        <a href="${data.chatUrl}" class="button">Reply to Message</a>
      </div>
    `);

    const text = `
Hi ${data.recipientName},

You have a new message from ${data.senderName}:

"${data.messagePreview}"

Reply: ${data.chatUrl}
    `.trim();

    return {
      subject: `New message from ${data.senderName}`,
      html,
      text,
    };
  }

  /**
   * Badge Earned Email
   */
  badgeEarned(data: BadgeEarnedTemplateData): EmailTemplate {
    const html = this.wrapHTML(`
      <div class="header">
        <h1>🏆 Badge Unlocked!</h1>
      </div>
      <div class="content">
        <p>Hi ${data.recipientName},</p>
        <div class="badge-icon">${data.badgeIcon}</div>
        <p style="text-align: center;"><strong style="font-size: 20px;">${data.badgeName}</strong></p>
        <p style="text-align: center;">${data.badgeDescription}</p>
        <p>Congratulations on this achievement! Keep up the great work.</p>
        <a href="${data.badgesUrl}" class="button" style="display: block; text-align: center;">View All Badges</a>
      </div>
    `);

    const text = `
Hi ${data.recipientName},

🏆 Badge Unlocked! 🏆

${data.badgeIcon} ${data.badgeName}

${data.badgeDescription}

Congratulations on this achievement! Keep up the great work.

View all badges: ${data.badgesUrl}
    `.trim();

    return {
      subject: `🏆 You earned the "${data.badgeName}" badge!`,
      html,
      text,
    };
  }

  /**
   * Event Reminder Email
   */
  eventReminder(data: EventReminderTemplateData): EmailTemplate {
    const html = this.wrapHTML(`
      <div class="header">
        <h1>📅 Event Reminder</h1>
      </div>
      <div class="content">
        <p>Hi ${data.recipientName},</p>
        <p>Reminder: <strong>${data.eventName}</strong> is coming up soon!</p>
        <div class="stats-card">
          <p><strong>When:</strong> ${data.eventTime}</p>
          <p><strong>Where:</strong> ${data.eventLocation}</p>
        </div>
        <p>We're looking forward to seeing you there!</p>
        <a href="${data.eventUrl}" class="button">View Event Details</a>
      </div>
    `);

    const text = `
Hi ${data.recipientName},

Reminder: ${data.eventName} is coming up soon!

When: ${data.eventTime}
Where: ${data.eventLocation}

View event details: ${data.eventUrl}
    `.trim();

    return {
      subject: `Reminder: ${data.eventName} is coming up`,
      html,
      text,
    };
  }

  /**
   * System Announcement Email
   */
  systemAnnouncement(data: SystemAnnouncementTemplateData): EmailTemplate {
    const actionButton = data.actionUrl
      ? `<a href="${data.actionUrl}" class="button">${data.actionText || 'Learn More'}</a>`
      : '';

    const html = this.wrapHTML(`
      <div class="header">
        <h1>${data.title}</h1>
      </div>
      <div class="content">
        <p>Hi ${data.recipientName},</p>
        <p>${data.message}</p>
        ${actionButton}
      </div>
    `);

    const text = `
Hi ${data.recipientName},

${data.title}

${data.message}

${data.actionUrl ? `${data.actionText || 'Learn More'}: ${data.actionUrl}` : ''}
    `.trim();

    return {
      subject: data.title,
      html,
      text,
    };
  }

  /**
   * Email Digest (Daily/Weekly Summary)
   */
  emailDigest(data: DigestTemplateData): EmailTemplate {
    const highlightsHTML = data.highlights
      .map(
        (h) => `
      <div class="stats-card" style="margin: 10px 0;">
        <p style="margin: 0;"><strong>${h.title}</strong></p>
        <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">${h.message}</p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #9ca3af;">${h.time}</p>
      </div>
    `
      )
      .join('');

    const html = this.wrapHTML(`
      <div class="header">
        <h1>📊 Your ${data.period} Summary</h1>
      </div>
      <div class="content">
        <p>Hi ${data.recipientName},</p>
        <p>Here's what happened on ${this.appName} this ${data.period.toLowerCase()}:</p>

        <div class="stats-card">
          <p><strong>Activity Summary:</strong></p>
          <ul>
            ${data.stats.newSwapRequests > 0 ? `<li>🤝 ${data.stats.newSwapRequests} new swap request(s)</li>` : ''}
            ${data.stats.acceptedSwaps > 0 ? `<li>✅ ${data.stats.acceptedSwaps} accepted swap(s)</li>` : ''}
            ${data.stats.completedSwaps > 0 ? `<li>🎉 ${data.stats.completedSwaps} completed swap(s)</li>` : ''}
            ${data.stats.newMessages > 0 ? `<li>💬 ${data.stats.newMessages} new message(s)</li>` : ''}
            ${data.stats.badgesEarned > 0 ? `<li>🏆 ${data.stats.badgesEarned} badge(s) earned</li>` : ''}
          </ul>
        </div>

        ${data.highlights.length > 0 ? `<p><strong>Highlights:</strong></p>${highlightsHTML}` : ''}

        <a href="${data.dashboardUrl}" class="button">View Dashboard</a>

        <p>Keep up the great work!</p>
      </div>
    `);

    const highlightsText = data.highlights
      .map((h) => `- ${h.title}\n  ${h.message}\n  ${h.time}`)
      .join('\n\n');

    const text = `
Hi ${data.recipientName},

Your ${data.period} Summary

Activity:
${data.stats.newSwapRequests > 0 ? `- ${data.stats.newSwapRequests} new swap request(s)\n` : ''}${data.stats.acceptedSwaps > 0 ? `- ${data.stats.acceptedSwaps} accepted swap(s)\n` : ''}${data.stats.completedSwaps > 0 ? `- ${data.stats.completedSwaps} completed swap(s)\n` : ''}${data.stats.newMessages > 0 ? `- ${data.stats.newMessages} new message(s)\n` : ''}${data.stats.badgesEarned > 0 ? `- ${data.stats.badgesEarned} badge(s) earned\n` : ''}

${data.highlights.length > 0 ? `Highlights:\n${highlightsText}\n\n` : ''}
View Dashboard: ${data.dashboardUrl}

Keep up the great work!
    `.trim();

    return {
      subject: `Your ${this.appName} ${data.period} Summary`,
      html,
      text,
    };
  }

  /**
   * Get template by notification type
   */
  getTemplateForType(
    type: NotificationType,
    data: any
  ): EmailTemplate | null {
    switch (type) {
      case 'SWAP_REQUEST':
        return this.swapRequest(data);
      case 'SWAP_ACCEPTED':
        return this.swapAccepted(data);
      case 'SWAP_REJECTED':
        return this.swapRejected(data);
      case 'SWAP_COMPLETED':
        return this.swapCompleted(data);
      case 'MESSAGE':
        return this.newMessage(data);
      case 'BADGE_EARNED':
        return this.badgeEarned(data);
      case 'EVENT_REMINDER':
        return this.eventReminder(data);
      case 'SYSTEM':
        return this.systemAnnouncement(data);
      default:
        return null;
    }
  }
}

export const emailTemplatesService = new EmailTemplatesService();
export type {
  EmailTemplate,
  SwapRequestTemplateData,
  SwapAcceptedTemplateData,
  SwapRejectedTemplateData,
  SwapCompletedTemplateData,
  MessageTemplateData,
  BadgeEarnedTemplateData,
  EventReminderTemplateData,
  SystemAnnouncementTemplateData,
  DigestTemplateData,
};
