import { Router } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { emailService } from '../services/email.service';
import { otpService } from '../services/otp.service';
import { logger } from '../utils/logger';
import { authLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/auth';
import { Request, Response, NextFunction } from 'express';


const router = Router();


interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}


// Helper to generate tokens
const generateTokens = (userId: string, email: string, role: string) => {
  // @ts-ignore - Known typing issue with jsonwebtoken
  const accessToken = jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );


  // @ts-ignore - Known typing issue with jsonwebtoken
  const refreshToken = jwt.sign(
    { userId, email, role },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );


  return { accessToken, refreshToken };
};


/**
 * POST /api/v1/auth/register
 * Register a new user
 */
router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must be 8+ chars with uppercase, lowercase, and number'),
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('phone').optional().isMobilePhone('en-IN').withMessage('Valid phone number required'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name, phone } = req.body;


      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });


      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered',
        });
      }


      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);


      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: passwordHash,
          name,
          phone: phone || null,
          coins: 50, // Welcome bonus
        },
        select: {
          userId: true,
          email: true,
          name: true,
          coins: true,
          role: true,
          createdAt: true,
        },
      });


      // Generate OTP for email verification
      const otp = otpService.generateOTP();
      otpService.storeOTP(email, otp);


      // Send welcome email with OTP
      await emailService.sendOTPEmail(email, otp);
      await emailService.sendWelcomeEmail(email, name);


      logger.info(`New user registered: ${email}`);


      res.status(201).json({
        success: true,
        message: 'Registration successful! Please verify your email.',
        data: {
          user,
          requiresVerification: true,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);


/**
 * POST /api/v1/auth/verify-email
 * Verify email with OTP
 */
router.post(
  '/verify-email',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, otp } = req.body;


      // Verify OTP
      const isValid = otpService.verifyOTP(email, otp);


      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP',
        });
      }


      // Update user as verified
      const user = await prisma.user.update({
        where: { email },
        data: { emailVerified: true },
        select: {
          userId: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
        },
      });


      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user.userId, user.email, user.role);


      logger.info(`Email verified: ${email}`);


      res.json({
        success: true,
        message: 'Email verified successfully!',
        data: {
          user,
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);


/**
 * POST /api/v1/auth/resend-otp
 * Resend OTP for email verification
 */
router.post(
  '/resend-otp',
  authLimiter,
  [body('email').isEmail().normalizeEmail()],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;


      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { email },
        select: { email: true, name: true, emailVerified: true },
      });


      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }


      if (user.emailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email already verified',
        });
      }


      // Generate and send new OTP
      const otp = otpService.generateOTP();
      otpService.storeOTP(email, otp);
      await emailService.sendOTPEmail(email, otp);


      logger.info(`OTP resent to: ${email}`);


      res.json({
        success: true,
        message: 'OTP sent to your email',
      });
    } catch (error) {
      next(error);
    }
  }
);


/**
 * POST /api/v1/auth/login
 * Login with email and password
 */
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;


      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          userId: true,
          email: true,
          password: true,
          name: true,
          role: true,
          status: true,
          emailVerified: true,
          avatar: true,
          coins: true,
        },
      });


      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }


      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);


      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }


      // Check if account is active
      if (user.status !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          message: `Account is ${user.status.toLowerCase()}. Contact support for help.`,
        });
      }


      // EMAIL VERIFICATION IS NOW OPTIONAL - Users can login without verifying
      // No email verification check is performed during login


      // Update last active
      await prisma.user.update({
        where: { userId: user.userId },
        data: { lastActive: new Date() },
      });


      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user.userId, user.email, user.role);


      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;


      logger.info(`User logged in: ${email}`);


      res.json({
        success: true,
        message: 'Login successful!',
        data: {
          user: userWithoutPassword,
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);


/**
 * POST /api/v1/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;


    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required',
      });
    }


    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as JWTPayload;


    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { userId: decoded.userId },
      select: { userId: true, email: true, role: true, status: true },
    });


    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }


    // Generate new access token
    // @ts-ignore - Known typing issue with jsonwebtoken
    const accessToken = jwt.sign(
      { userId: user.userId, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );


    res.json({
      success: true,
      data: { accessToken },
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }
    next(error);
  }
});


/**
 * POST /api/v1/auth/forgot-password
 * Request password reset
 */
router.post(
  '/forgot-password',
  authLimiter,
  [body('email').isEmail().normalizeEmail()],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;


      const user = await prisma.user.findUnique({
        where: { email },
        select: { userId: true, email: true, name: true },
      });


      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({
          success: true,
          message: 'If the email exists, a password reset link has been sent.',
        });
      }


      // Generate reset token
      const resetToken = otpService.generateResetToken();
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour


      // Store reset token in database (you need to add these fields to User model)
      // For now, we'll use OTP service
      otpService.storeOTP(`reset_${email}`, resetToken);


      // Send reset email
      await emailService.sendPasswordResetEmail(email, resetToken);


      logger.info(`Password reset requested: ${email}`);


      res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  }
);


/**
 * POST /api/v1/auth/reset-password
 * Reset password with token
 */
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token required'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must be 8+ chars with uppercase, lowercase, and number'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password, email } = req.body;


      // Verify reset token
      const isValid = otpService.verifyOTP(`reset_${email}`, token);


      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token',
        });
      }


      // Hash new password
      const passwordHash = await bcrypt.hash(password, 12);


      // Update password
      await prisma.user.update({
        where: { email },
        data: { password: passwordHash },
      });


      logger.info(`Password reset successful: ${email}`);


      res.json({
        success: true,
        message: 'Password reset successful! You can now login with your new password.',
      });
    } catch (error) {
      next(error);
    }
  }
);


/**
 * POST /api/v1/auth/logout
 * Logout (client-side token removal, optional server-side token blacklist)
 */
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;


    // Optional: Blacklist the token (requires Redis implementation)
    // For now, we rely on client-side token removal


    logger.info(`User logged out: ${userId}`);


    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
});


/**
 * GET /api/v1/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;


    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        bio: true,
        city: true,
        state: true,
        role: true,
        status: true,
        coins: true,
        level: true,
        experiencePoints: true,
        rating: true,
        completedSwaps: true,
        totalHoursTaught: true,
        totalHoursLearned: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
      },
    });


    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }


    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});


export default router;