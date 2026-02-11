/**
 * Event Routes
 * API endpoints for event management
 */

import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import * as eventController from '../controllers/event.controller';

const router = express.Router();

// Rate limiter for event operations
const eventLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
});

// Apply rate limiting to all event routes
router.use(eventLimiter);

/**
 * Public routes (no authentication required, but can provide user context)
 */

// Get upcoming events (public)
router.get('/upcoming', eventController.getUpcomingEvents);

// Get events with filters (public)
// Note: This should come after /upcoming but before /:eventId to avoid route conflicts
router.get('/', eventController.getEvents);

// Get event by ID (public, but shows registration status if authenticated)
router.get('/:eventId', optionalAuthenticate, eventController.getEventById);

// Get event attendees (public)
router.get('/:eventId/attendees', eventController.getEventAttendees);

/**
 * Protected routes (authentication required)
 */

// Get user's organized events
router.get('/my-events', authenticate, eventController.getMyOrganizedEvents);

// Get user's attending events
router.get('/attending', authenticate, eventController.getAttendingEvents);

// Create a new event
router.post('/', authenticate, eventController.createEvent);

// Update an event
router.put('/:eventId', authenticate, eventController.updateEvent);

// Publish an event
router.put('/:eventId/publish', authenticate, eventController.publishEvent);

// Cancel an event
router.put('/:eventId/cancel', authenticate, eventController.cancelEvent);

// Delete an event
router.delete('/:eventId', authenticate, eventController.deleteEvent);

// Register for an event
router.post('/:eventId/register', authenticate, eventController.registerForEvent);

// Unregister from an event
router.delete('/:eventId/register', authenticate, eventController.unregisterFromEvent);

export default router;
