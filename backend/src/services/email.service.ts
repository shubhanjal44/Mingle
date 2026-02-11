import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
 private transporter!: nodemailer.Transporter;
  constructor() {
    // For development: Use ethereal email (test account)
    // For production: Use SendGrid or SMTP
    if (process.env.NODE_ENV === 'production') {
      this.transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: "tejindiateam@gmail.com",
          pass: "eglv lgxg mbiq iiuv",
        },
      });
    } else {
      // Development: Create test account (logs to console)
      this.createTestAccount();
    }
  }

private async createTestAccount() {
    try {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        // host: 'smtp.gmail.com',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
    user: "tejindiateam@gmail.com",
    pass: "eglv lgxg mbiq iiuv",
        },
      });
        logger.info(`📧 Email test account created: ${testAccount.user}, ${testAccount.pass}`);
        
    } catch (error) {
      logger.error('Failed to create email test account:', error);
    }
  }

  async sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || '"tej-india India" <noreply@tej-india.in>',
        to,
        subject,
        text: text || '',
        html,
      });

      if (process.env.NODE_ENV !== 'production') {
        logger.info(`📧 Email sent: ${nodemailer.getTestMessageUrl(info)}`);
      }

      logger.info(`Email sent to ${to}: ${subject}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; background-color: #f9fafb; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 32px; font-weight: bold; color: #0ea5e9; }
            .tagline { color: #6b7280; font-size: 18px; margin-top: 10px; }
            .content { color: #374151; line-height: 1.6; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">tej-india India 🇮🇳</div>
              <div class="tagline">सीखो और सिखाओ - Trade Skills, Not Money</div>
            </div>

            <div class="content">
              <h2>Welcome to tej-india India, ${name}! 🎉</h2>

              <p>We're thrilled to have you join our community of learners and teachers!</p>

              <p>As a welcome gift, we've credited your account with <strong>50 SkillCoins</strong>! You can use these to:</p>
              <ul>
                <li>Get priority matching with skill partners</li>
                <li>Unlock verified skill badges</li>
                <li>Boost your profile visibility</li>
              </ul>

              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Complete your profile (add avatar, bio, location)</li>
                <li>Add skills you can teach (minimum 1)</li>
                <li>Add skills you want to learn (minimum 1)</li>
                <li>Discover perfect matches and start swapping!</li>
              </ol>

              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Complete Your Profile</a>
              </div>

              <p style="margin-top: 30px;">Need help? Check out our <a href="${process.env.FRONTEND_URL}/help">Quick Start Guide</a> or reply to this email.</p>

              <p>Happy learning! 🚀</p>
              <p>– The tej-india India Team</p>
            </div>

            <div class="footer">
              <p>You received this email because you signed up for tej-india India.</p>
              <p>© 2025 tej-india India. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Welcome to tej-india India! 🎉',
      html,
      text: `Welcome to tej-india India, ${name}! We've credited your account with 50 SkillCoins. Complete your profile to start swapping skills.`,
    });
  }

  async sendOTPEmail(email: string, otp: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; background-color: #f9fafb; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 32px; font-weight: bold; color: #0ea5e9; }
            .otp-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 36px; font-weight: bold; letter-spacing: 8px; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0; }
            .content { color: #374151; line-height: 1.6; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">tej-india India 🇮🇳</div>
            </div>

            <div class="content">
              <h2>Email Verification Code</h2>

              <p>Your verification code is:</p>

              <div class="otp-box">${otp}</div>

              <p>This code will expire in <strong>10 minutes</strong>.</p>

              <div class="warning">
                <strong>⚠️ Security Note:</strong> Never share this code with anyone. tej-india India team will never ask for this code.
              </div>

              <p>If you didn't request this code, please ignore this email or contact support if you're concerned.</p>
            </div>

            <div class="footer">
              <p>© 2025 tej-india India. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `${otp} is your tej-india India verification code`,
      html,
      text: `Your tej-india India verification code is: ${otp}. This code expires in 10 minutes.`,
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; background-color: #f9fafb; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 32px; font-weight: bold; color: #0ea5e9; }
            .content { color: #374151; line-height: 1.6; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
            .warning { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">tej-india India 🇮🇳</div>
            </div>

            <div class="content">
              <h2>Reset Your Password</h2>

              <p>We received a request to reset your password. Click the button below to create a new password:</p>

              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>

              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; font-size: 14px;">${resetUrl}</p>

              <p>This link will expire in <strong>1 hour</strong>.</p>

              <div class="warning">
                <strong>⚠️ Important:</strong> If you didn't request a password reset, please ignore this email and ensure your account is secure.
              </div>
            </div>

            <div class="footer">
              <p>© 2025 tej-india India. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Reset Your tej-india India Password',
      html,
      text: `Reset your password: ${resetUrl}. This link expires in 1 hour.`,
    });
  }
}

export const emailService = new EmailService();
