/**
 * Connection Routes
 * API endpoints for connection management
 */

import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticate } from '../middleware/auth';
import * as connectionController from '../controllers/connection.controller';

const router = express.Router();

// Rate limiter for connection operations
const connectionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
});

// Apply rate limiting and authentication to all routes
router.use(connectionLimiter);
router.use(authenticate);

/**
 * Connection management routes
 */

// Create a connection (follow a user)
router.post('/:userId', connectionController.createConnection);

// Remove a connection (unfollow a user)
router.delete('/:userId', connectionController.removeConnection);

// Get user's connections (following)
router.get('/following/:userId?', connectionController.getUserConnections);

// Get user's followers
router.get('/followers/:userId?', connectionController.getUserFollowers);

// Check connection status with a user
router.get('/check/:userId', connectionController.checkConnection);

// Get mutual connections with a user
router.get('/mutual/:userId', connectionController.getMutualConnections);

// Get connection statistics
router.get('/stats/:userId?', connectionController.getConnectionStats);

// Get suggested connections
router.get('/suggestions', connectionController.getSuggestedConnections);

// Search for users to connect with
router.get('/search', connectionController.searchUsers);

export default router;
