/**
 * Event Controller
 * Handles HTTP requests for event management
 */

import { Request, Response } from 'express';
import { eventService } from '../services/event.service';
import { logger } from '../utils/logger';
import { EventType, EventStatus } from '@prisma/client';

/**
 * Create a new event
 * POST /api/v1/events
 */
export async function createEvent(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;

    const {
      title,
      description,
      imageUrl,
      eventType,
      startTime,
      endTime,
      location,
      venue,
      city,
      state,
      isOnline,
      meetingLink,
      skillId,
      maxAttendees,
    } = req.body;

    // Validate required fields
    if (!title || !description || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, description, startTime, endTime',
      });
    }

    const event = await eventService.createEvent({
      organizerId: userId,
      title,
      description,
      imageUrl,
      eventType: eventType || 'OTHER',
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      location,
      venue,
      city,
      state,
      isOnline: isOnline || false,
      meetingLink,
      skillId,
      maxAttendees: maxAttendees ? parseInt(maxAttendees) : undefined,
    });

    return res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event,
    });
  } catch (error: any) {
    logger.error('Create event error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create event',
    });
  }
}

/**
 * Update an existing event
 * PUT /api/v1/events/:eventId
 */
export async function updateEvent(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const { eventId } = req.params;

    const updates: any = {};

    // Only include fields that were provided
    const allowedFields = [
      'title',
      'description',
      'imageUrl',
      'eventType',
      'status',
      'startTime',
      'endTime',
      'location',
      'venue',
      'city',
      'state',
      'isOnline',
      'meetingLink',
      'skillId',
      'maxAttendees',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'startTime' || field === 'endTime') {
          updates[field] = new Date(req.body[field]);
        } else if (field === 'maxAttendees') {
          updates[field] = parseInt(req.body[field]);
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    const event = await eventService.updateEvent(eventId, userId, updates);

    return res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: event,
    });
  } catch (error: any) {
    logger.error('Update event error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update event',
    });
  }
}

/**
 * Publish an event
 * PUT /api/v1/events/:eventId/publish
 */
export async function publishEvent(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const { eventId } = req.params;

    const event = await eventService.publishEvent(eventId, userId);

    return res.status(200).json({
      success: true,
      message: 'Event published successfully',
      data: event,
    });
  } catch (error: any) {
    logger.error('Publish event error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to publish event',
    });
  }
}

/**
 * Cancel an event
 * PUT /api/v1/events/:eventId/cancel
 */
export async function cancelEvent(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const { eventId } = req.params;

    const event = await eventService.cancelEvent(eventId, userId);

    return res.status(200).json({
      success: true,
      message: 'Event cancelled successfully',
      data: event,
    });
  } catch (error: any) {
    logger.error('Cancel event error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel event',
    });
  }
}

/**
 * Delete an event
 * DELETE /api/v1/events/:eventId
 */
export async function deleteEvent(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const { eventId } = req.params;

    await eventService.deleteEvent(eventId, userId);

    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error: any) {
    logger.error('Delete event error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete event',
    });
  }
}

/**
 * Get event by ID
 * GET /api/v1/events/:eventId
 */
export async function getEventById(req: Request, res: Response) {
  try {
    const { eventId } = req.params;

    const event = await eventService.getEventById(eventId);

    // Check if user is registered (if authenticated)
    let isRegistered = false;
    if ((req as any).user) {
      const userId = (req as any).user.userId;
      isRegistered = await eventService.isUserRegistered(eventId, userId);
    }

    return res.status(200).json({
      success: true,
      data: {
        ...event,
        isRegistered,
      },
    });
  } catch (error: any) {
    logger.error('Get event error:', error);
    return res.status(404).json({
      success: false,
      message: error.message || 'Event not found',
    });
  }
}

/**
 * Get events with filters
 * GET /api/v1/events
 */
export async function getEvents(req: Request, res: Response) {
  try {
    const {
      eventType,
      status,
      isOnline,
      city,
      state,
      skillId,
      startDate,
      endDate,
      limit,
      offset,
    } = req.query;

    const filters: any = {};

    if (eventType) filters.eventType = eventType as EventType;
    if (status) filters.status = status as EventStatus;
    if (isOnline !== undefined) filters.isOnline = isOnline === 'true';
    if (city) filters.city = city as string;
    if (state) filters.state = state as string;
    if (skillId) filters.skillId = skillId as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const result = await eventService.getEvents(
      filters,
      limit ? parseInt(limit as string) : 20,
      offset ? parseInt(offset as string) : 0
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Get events error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to get events',
    });
  }
}

/**
 * Get upcoming events
 * GET /api/v1/events/upcoming
 */
export async function getUpcomingEvents(req: Request, res: Response) {
  try {
    const { limit } = req.query;

    const events = await eventService.getUpcomingEvents(
      limit ? parseInt(limit as string) : 10
    );

    return res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error: any) {
    logger.error('Get upcoming events error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to get upcoming events',
    });
  }
}

/**
 * Get user's organized events
 * GET /api/v1/events/my-events
 */
export async function getMyOrganizedEvents(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;

    const events = await eventService.getUserOrganizedEvents(userId);

    return res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error: any) {
    logger.error('Get organized events error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to get organized events',
    });
  }
}

/**
 * Get user's attending events
 * GET /api/v1/events/attending
 */
export async function getAttendingEvents(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;

    const events = await eventService.getUserAttendingEvents(userId);

    return res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error: any) {
    logger.error('Get attending events error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to get attending events',
    });
  }
}

/**
 * Register for an event
 * POST /api/v1/events/:eventId/register
 */
export async function registerForEvent(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const { eventId } = req.params;

    const attendance = await eventService.registerForEvent(eventId, userId);

    return res.status(200).json({
      success: true,
      message: 'Successfully registered for event',
      data: attendance,
    });
  } catch (error: any) {
    logger.error('Register for event error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to register for event',
    });
  }
}

/**
 * Unregister from an event
 * DELETE /api/v1/events/:eventId/register
 */
export async function unregisterFromEvent(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const { eventId } = req.params;

    await eventService.unregisterFromEvent(eventId, userId);

    return res.status(200).json({
      success: true,
      message: 'Successfully unregistered from event',
    });
  } catch (error: any) {
    logger.error('Unregister from event error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to unregister from event',
    });
  }
}

/**
 * Get event attendees
 * GET /api/v1/events/:eventId/attendees
 */
export async function getEventAttendees(req: Request, res: Response) {
  try {
    const { eventId } = req.params;

    const attendees = await eventService.getEventAttendees(eventId);

    return res.status(200).json({
      success: true,
      data: attendees,
    });
  } catch (error: any) {
    logger.error('Get event attendees error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to get event attendees',
    });
  }
}
