/**
 * Subscription Routes
 * API endpoints for subscription management
 */

import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticate } from '../middleware/auth';
import * as subscriptionController from '../controllers/subscription.controller';

const router = express.Router();

// Rate limiter for subscription operations
const subscriptionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
});

// Apply rate limiting to all routes
router.use(subscriptionLimiter);

/**
 * Public routes
 */

// Get all subscription tiers
router.get('/tiers', subscriptionController.getSubscriptionTiers);

/**
 * Protected routes (authentication required)
 */

// Get current user's subscription
router.get('/me', authenticate, subscriptionController.getMySubscription);

// Create payment order for subscription
router.post('/create-order', authenticate, subscriptionController.createSubscriptionOrder);

// Verify payment and activate subscription
router.post('/verify-payment', authenticate, subscriptionController.verifyPayment);

// Cancel subscription
router.post('/cancel', authenticate, subscriptionController.cancelSubscription);

// Reactivate subscription
router.post('/reactivate', authenticate, subscriptionController.reactivateSubscription);

// Get payment history
router.get('/payments', authenticate, subscriptionController.getPaymentHistory);

// Get invoices
router.get('/invoices', authenticate, subscriptionController.getInvoices);

// Check feature access
router.get('/features/:feature', authenticate, subscriptionController.checkFeatureAccess);

// Check if user can perform an action
router.post('/can-perform', authenticate, subscriptionController.canPerformAction);

// Get subscription statistics (admin only)
router.get('/stats', authenticate, subscriptionController.getSubscriptionStats);

export default router;
