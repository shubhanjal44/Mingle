/**
 * Webhook Routes
 * API endpoints for payment webhooks
 */

import express from 'express';
import * as webhookController from '../controllers/webhook.controller';

const router = express.Router();

/**
 * Razorpay webhook endpoint
 * Note: No authentication middleware as webhooks come from Razorpay servers
 * Verification is done via signature in the controller
 */
router.post('/razorpay', webhookController.handleRazorpayWebhook);

export default router;
