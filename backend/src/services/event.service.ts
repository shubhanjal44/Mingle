/**
 * Event Service
 * Manages events, registrations, and calendar operations
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';
import { EventType, EventStatus } from '@prisma/client';
import { notificationService } from './notification.service';

interface CreateEventParams {
  organizerId: string;
  title: string;
  description: string;
  imageUrl?: string;
  eventType: EventType;
  startTime: Date;
  endTime: Date;
  location?: string;
  venue?: string;
  city?: string;
  state?: string;
  isOnline: boolean;
  meetingLink?: string;
  skillId?: string;
  maxAttendees?: number;
}

interface UpdateEventParams {
  title?: string;
  description?: string;
  imageUrl?: string;
  eventType?: EventType;
  status?: EventStatus;
  startTime?: Date;
  endTime?: Date;
  location?: string;
  venue?: string;
  city?: string;
  state?: string;
  isOnline?: boolean;
  meetingLink?: string;
  skillId?: string;
  maxAttendees?: number;
}

interface EventFilters {
  eventType?: EventType;
  status?: EventStatus;
  isOnline?: boolean;
  city?: string;
  state?: string;
  skillId?: string;
  startDate?: Date;
  endDate?: Date;
}

class EventService {
  /**
   * Create a new event
   */
  async createEvent(params: CreateEventParams) {
    try {
      // Validate dates
      if (params.startTime >= params.endTime) {
        throw new Error('End time must be after start time');
      }

      if (params.startTime < new Date()) {
        throw new Error('Start time cannot be in the past');
      }

      // Validate online event has meeting link
      if (params.isOnline && !params.meetingLink) {
        throw new Error('Online events must have a meeting link');
      }

      // Validate offline event has location
      if (!params.isOnline && !params.location) {
        throw new Error('Offline events must have a location');
      }

      const event = await prisma.event.create({
        data: {
          organizerId: params.organizerId,
          title: params.title,
          description: params.description,
          imageUrl: params.imageUrl,
          eventType: params.eventType,
          status: 'DRAFT',
          startTime: params.startTime,
          endTime: params.endTime,
          location: params.location,
          venue: params.venue,
          city: params.city,
          state: params.state,
          isOnline: params.isOnline,
          meetingLink: params.meetingLink,
          skillId: params.skillId,
          maxAttendees: params.maxAttendees,
        },
        include: {
          organizer: {
            select: {
              userId: true,
              name: true,
              avatar: true,
            },
          },
          skill: {
            select: {
              skillId: true,
              name: true,
            },
          },
        },
      });

      logger.info(`Event created: ${event.eventId} by user ${params.organizerId}`);
      return event;
    } catch (error) {
      logger.error('Failed to create event:', error);
      throw error;
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(eventId: string, organizerId: string, updates: UpdateEventParams) {
    try {
      // Verify organizer owns the event
      const event = await prisma.event.findUnique({
        where: { eventId },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      if (event.organizerId !== organizerId) {
        throw new Error('Only the organizer can update the event');
      }

      // Validate dates if updating
      if (updates.startTime || updates.endTime) {
        const newStartTime = updates.startTime || event.startTime;
        const newEndTime = updates.endTime || event.endTime;

        if (newStartTime >= newEndTime) {
          throw new Error('End time must be after start time');
        }
      }

      const updatedEvent = await prisma.event.update({
        where: { eventId },
        data: updates,
        include: {
          organizer: {
            select: {
              userId: true,
              name: true,
              avatar: true,
            },
          },
          skill: {
            select: {
              skillId: true,
              name: true,
            },
          },
        },
      });

      logger.info(`Event updated: ${eventId}`);
      return updatedEvent;
    } catch (error) {
      logger.error('Failed to update event:', error);
      throw error;
    }
  }

  /**
   * Publish an event (change status from DRAFT to PUBLISHED)
   */
  async publishEvent(eventId: string, organizerId: string) {
    try {
      const event = await prisma.event.findUnique({
        where: { eventId },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      if (event.organizerId !== organizerId) {
        throw new Error('Only the organizer can publish the event');
      }

      if (event.status !== 'DRAFT') {
        throw new Error('Only draft events can be published');
      }

      const publishedEvent = await prisma.event.update({
        where: { eventId },
        data: { status: 'PUBLISHED' },
        include: {
          organizer: {
            select: {
              userId: true,
              name: true,
            },
          },
        },
      });

      logger.info(`Event published: ${eventId}`);
      return publishedEvent;
    } catch (error) {
      logger.error('Failed to publish event:', error);
      throw error;
    }
  }

  /**
   * Cancel an event
   */
  async cancelEvent(eventId: string, organizerId: string) {
    try {
      const event = await prisma.event.findUnique({
        where: { eventId },
        include: {
          attendees: {
            include: {
              user: {
                select: {
                  userId: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      if (event.organizerId !== organizerId) {
        throw new Error('Only the organizer can cancel the event');
      }

      const cancelledEvent = await prisma.event.update({
        where: { eventId },
        data: { status: 'CANCELLED' },
      });

      // Notify all attendees about cancellation
      for (const attendance of event.attendees) {
        await notificationService.createNotification({
          userId: attendance.userId,
          type: 'EVENT_REMINDER',
          title: 'Event Cancelled',
          message: `The event "${event.title}" has been cancelled by the organizer.`,
          data: {
            eventId: event.eventId,
            eventTitle: event.title,
          },
        });
      }

      logger.info(`Event cancelled: ${eventId}, notified ${event.attendees.length} attendees`);
      return cancelledEvent;
    } catch (error) {
      logger.error('Failed to cancel event:', error);
      throw error;
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string, organizerId: string) {
    try {
      const event = await prisma.event.findUnique({
        where: { eventId },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      if (event.organizerId !== organizerId) {
        throw new Error('Only the organizer can delete the event');
      }

      // Only allow deleting draft or cancelled events
      if (!['DRAFT', 'CANCELLED'].includes(event.status)) {
        throw new Error('Only draft or cancelled events can be deleted');
      }

      await prisma.event.delete({
        where: { eventId },
      });

      logger.info(`Event deleted: ${eventId}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete event:', error);
      throw error;
    }
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId: string) {
    try {
      const event = await prisma.event.findUnique({
        where: { eventId },
        include: {
          organizer: {
            select: {
              userId: true,
              name: true,
              avatar: true,
              email: true,
            },
          },
          skill: {
            select: {
              skillId: true,
              name: true,
            },
          },
          attendees: {
            include: {
              user: {
                select: {
                  userId: true,
                  name: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      return event;
    } catch (error) {
      logger.error('Failed to get event:', error);
      throw error;
    }
  }

  /**
   * Get events with filters
   */
  async getEvents(filters: EventFilters, limit: number = 20, offset: number = 0) {
    try {
      const where: any = {
        isActive: true,
        status: 'PUBLISHED', // Only show published events by default
      };

      if (filters.eventType) {
        where.eventType = filters.eventType;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.isOnline !== undefined) {
        where.isOnline = filters.isOnline;
      }

      if (filters.city) {
        where.city = filters.city;
      }

      if (filters.state) {
        where.state = filters.state;
      }

      if (filters.skillId) {
        where.skillId = filters.skillId;
      }

      if (filters.startDate || filters.endDate) {
        where.startTime = {};
        if (filters.startDate) {
          where.startTime.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.startTime.lte = filters.endDate;
        }
      }

      const events = await prisma.event.findMany({
        where,
        include: {
          organizer: {
            select: {
              userId: true,
              name: true,
              avatar: true,
            },
          },
          skill: {
            select: {
              skillId: true,
              name: true,
            },
          },
          _count: {
            select: {
              attendees: true,
            },
          },
        },
        orderBy: {
          startTime: 'asc',
        },
        take: limit,
        skip: offset,
      });

      const total = await prisma.event.count({ where });

      return {
        events,
        total,
        limit,
        offset,
      };
    } catch (error) {
      logger.error('Failed to get events:', error);
      throw error;
    }
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(limit: number = 10) {
    try {
      const now = new Date();

      const events = await prisma.event.findMany({
        where: {
          isActive: true,
          status: 'PUBLISHED',
          startTime: {
            gte: now,
          },
        },
        include: {
          organizer: {
            select: {
              userId: true,
              name: true,
              avatar: true,
            },
          },
          skill: {
            select: {
              skillId: true,
              name: true,
            },
          },
          _count: {
            select: {
              attendees: true,
            },
          },
        },
        orderBy: {
          startTime: 'asc',
        },
        take: limit,
      });

      return events;
    } catch (error) {
      logger.error('Failed to get upcoming events:', error);
      throw error;
    }
  }

  /**
   * Get user's organized events
   */
  async getUserOrganizedEvents(userId: string) {
    try {
      const events = await prisma.event.findMany({
        where: {
          organizerId: userId,
          isActive: true,
        },
        include: {
          skill: {
            select: {
              skillId: true,
              name: true,
            },
          },
          _count: {
            select: {
              attendees: true,
            },
          },
        },
        orderBy: {
          startTime: 'desc',
        },
      });

      return events;
    } catch (error) {
      logger.error('Failed to get user organized events:', error);
      throw error;
    }
  }

  /**
   * Get user's attending events
   */
  async getUserAttendingEvents(userId: string) {
    try {
      const attendances = await prisma.eventAttendance.findMany({
        where: {
          userId,
        },
        include: {
          event: {
            include: {
              organizer: {
                select: {
                  userId: true,
                  name: true,
                  avatar: true,
                },
              },
              skill: {
                select: {
                  skillId: true,
                  name: true,
                },
              },
              _count: {
                select: {
                  attendees: true,
                },
              },
            },
          },
        },
        orderBy: {
          event: {
            startTime: 'asc',
          },
        },
      });

      return attendances.map((a) => a.event);
    } catch (error) {
      logger.error('Failed to get user attending events:', error);
      throw error;
    }
  }

  /**
   * Register for an event
   */
  async registerForEvent(eventId: string, userId: string) {
    try {
      const event = await prisma.event.findUnique({
        where: { eventId },
        include: {
          _count: {
            select: {
              attendees: true,
            },
          },
          organizer: {
            select: {
              userId: true,
              name: true,
            },
          },
        },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      if (event.status !== 'PUBLISHED') {
        throw new Error('Cannot register for unpublished events');
      }

      if (event.startTime < new Date()) {
        throw new Error('Cannot register for past events');
      }

      // Check if already registered
      const existing = await prisma.eventAttendance.findUnique({
        where: {
          eventId_userId: {
            eventId,
            userId,
          },
        },
      });

      if (existing) {
        throw new Error('Already registered for this event');
      }

      // Check if event is full
      if (event.maxAttendees && event._count.attendees >= event.maxAttendees) {
        throw new Error('Event is full');
      }

      // Cannot register for own event
      if (event.organizerId === userId) {
        throw new Error('Cannot register for your own event');
      }

      const attendance = await prisma.eventAttendance.create({
        data: {
          eventId,
          userId,
        },
        include: {
          event: {
            select: {
              title: true,
              startTime: true,
            },
          },
        },
      });

      // Notify organizer
      await notificationService.createNotification({
        userId: event.organizerId,
        type: 'EVENT_REMINDER',
        title: 'New Event Registration',
        message: `Someone registered for your event "${event.title}"`,
        data: {
          eventId: event.eventId,
          eventTitle: event.title,
        },
      });

      logger.info(`User ${userId} registered for event ${eventId}`);
      return attendance;
    } catch (error) {
      logger.error('Failed to register for event:', error);
      throw error;
    }
  }

  /**
   * Unregister from an event
   */
  async unregisterFromEvent(eventId: string, userId: string) {
    try {
      const attendance = await prisma.eventAttendance.findUnique({
        where: {
          eventId_userId: {
            eventId,
            userId,
          },
        },
      });

      if (!attendance) {
        throw new Error('Not registered for this event');
      }

      await prisma.eventAttendance.delete({
        where: {
          attendanceId: attendance.attendanceId,
        },
      });

      logger.info(`User ${userId} unregistered from event ${eventId}`);
      return true;
    } catch (error) {
      logger.error('Failed to unregister from event:', error);
      throw error;
    }
  }

  /**
   * Check if user is registered for an event
   */
  async isUserRegistered(eventId: string, userId: string): Promise<boolean> {
    try {
      const attendance = await prisma.eventAttendance.findUnique({
        where: {
          eventId_userId: {
            eventId,
            userId,
          },
        },
      });

      return !!attendance;
    } catch (error) {
      logger.error('Failed to check event registration:', error);
      return false;
    }
  }

  /**
   * Get event attendees
   */
  async getEventAttendees(eventId: string) {
    try {
      const attendances = await prisma.eventAttendance.findMany({
        where: {
          eventId,
        },
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              avatar: true,
              city: true,
              state: true,
            },
          },
        },
        orderBy: {
          registeredAt: 'asc',
        },
      });

      return attendances.map((a) => ({
        ...a.user,
        registeredAt: a.registeredAt,
      }));
    } catch (error) {
      logger.error('Failed to get event attendees:', error);
      throw error;
    }
  }
}

export const eventService = new EventService();
export type { CreateEventParams, UpdateEventParams, EventFilters };
