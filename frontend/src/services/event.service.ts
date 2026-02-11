/**
 * Event Service
 * Frontend API integration for event management
 */

import api from './api';

// Types
export interface Event {
  eventId: string;
  organizerId: string;
  title: string;
  description: string;
  imageUrl?: string;
  eventType: EventType;
  status: EventStatus;
  startTime: string;
  endTime: string;
  location?: string;
  venue?: string;
  city?: string;
  state?: string;
  isOnline: boolean;
  meetingLink?: string;
  skillId?: string;
  maxAttendees?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  organizer?: {
    userId: string;
    name: string;
    avatar?: string;
    email?: string;
  };
  skill?: {
    skillId: string;
    name: string;
  };
  attendees?: EventAttendee[];
  _count?: {
    attendees: number;
  };
  isRegistered?: boolean;
}

export interface EventAttendee {
  userId: string;
  name: string;
  avatar?: string;
  city?: string;
  state?: string;
  registeredAt: string;
}

export type EventType =
  | 'WORKSHOP'
  | 'MEETUP'
  | 'WEBINAR'
  | 'SKILL_EXCHANGE'
  | 'STUDY_GROUP'
  | 'NETWORKING'
  | 'SEMINAR'
  | 'OTHER';

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface CreateEventParams {
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

export interface UpdateEventParams {
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

export interface EventFilters {
  eventType?: EventType;
  status?: EventStatus;
  isOnline?: boolean;
  city?: string;
  state?: string;
  skillId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface EventsResponse {
  events: Event[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Create a new event
 */
export async function createEvent(params: CreateEventParams): Promise<Event> {
  const response = await api.post('/events', params);
  return response.data.data;
}

/**
 * Update an existing event
 */
export async function updateEvent(
  eventId: string,
  updates: UpdateEventParams
): Promise<Event> {
  const response = await api.put(`/events/${eventId}`, updates);
  return response.data.data;
}

/**
 * Publish an event (change status from DRAFT to PUBLISHED)
 */
export async function publishEvent(eventId: string): Promise<Event> {
  const response = await api.put(`/events/${eventId}/publish`);
  return response.data.data;
}

/**
 * Cancel an event
 */
export async function cancelEvent(eventId: string): Promise<Event> {
  const response = await api.put(`/events/${eventId}/cancel`);
  return response.data.data;
}

/**
 * Delete an event
 */
export async function deleteEvent(eventId: string): Promise<void> {
  await api.delete(`/events/${eventId}`);
}

/**
 * Get event by ID
 */
export async function getEventById(eventId: string): Promise<Event> {
  const response = await api.get(`/events/${eventId}`);
  return response.data.data;
}

/**
 * Get events with filters
 */
export async function getEvents(filters?: EventFilters): Promise<EventsResponse> {
  const params = new URLSearchParams();

  if (filters) {
    if (filters.eventType) params.append('eventType', filters.eventType);
    if (filters.status) params.append('status', filters.status);
    if (filters.isOnline !== undefined) params.append('isOnline', String(filters.isOnline));
    if (filters.city) params.append('city', filters.city);
    if (filters.state) params.append('state', filters.state);
    if (filters.skillId) params.append('skillId', filters.skillId);
    if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
    if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.offset) params.append('offset', String(filters.offset));
  }

  const response = await api.get(`/events?${params.toString()}`);
  return response.data.data;
}

/**
 * Get upcoming events
 */
export async function getUpcomingEvents(limit: number = 10): Promise<Event[]> {
  const response = await api.get(`/events/upcoming?limit=${limit}`);
  return response.data.data;
}

/**
 * Get user's organized events
 */
export async function getMyOrganizedEvents(): Promise<Event[]> {
  const response = await api.get('/events/my-events');
  return response.data.data;
}

/**
 * Get user's attending events
 */
export async function getAttendingEvents(): Promise<Event[]> {
  const response = await api.get('/events/attending');
  return response.data.data;
}

/**
 * Register for an event
 */
export async function registerForEvent(eventId: string): Promise<void> {
  await api.post(`/events/${eventId}/register`);
}

/**
 * Unregister from an event
 */
export async function unregisterFromEvent(eventId: string): Promise<void> {
  await api.delete(`/events/${eventId}/register`);
}

/**
 * Get event attendees
 */
export async function getEventAttendees(eventId: string): Promise<EventAttendee[]> {
  const response = await api.get(`/events/${eventId}/attendees`);
  return response.data.data;
}

// Utility functions

/**
 * Get event type label
 */
export function getEventTypeLabel(type: EventType): string {
  const labels: Record<EventType, string> = {
    WORKSHOP: 'Workshop',
    MEETUP: 'Meetup',
    WEBINAR: 'Webinar',
    SKILL_EXCHANGE: 'Skill Exchange',
    STUDY_GROUP: 'Study Group',
    NETWORKING: 'Networking',
    SEMINAR: 'Seminar',
    OTHER: 'Other',
  };
  return labels[type] || type;
}

/**
 * Get event status label
 */
export function getEventStatusLabel(status: EventStatus): string {
  const labels: Record<EventStatus, string> = {
    DRAFT: 'Draft',
    PUBLISHED: 'Published',
    ONGOING: 'Ongoing',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };
  return labels[status] || status;
}

/**
 * Get event status color
 */
export function getEventStatusColor(status: EventStatus): string {
  const colors: Record<EventStatus, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    PUBLISHED: 'bg-green-100 text-green-700',
    ONGOING: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-purple-100 text-purple-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

/**
 * Format event date range
 */
export function formatEventDateRange(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const startDate = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const startTimeStr = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const endTimeStr = end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Same day
  if (start.toDateString() === end.toDateString()) {
    return `${startDate} · ${startTimeStr} - ${endTimeStr}`;
  }

  // Different days
  const endDate = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startDate} ${startTimeStr} - ${endDate} ${endTimeStr}`;
}

/**
 * Check if event is upcoming
 */
export function isUpcoming(event: Event): boolean {
  return new Date(event.startTime) > new Date();
}

/**
 * Check if event is ongoing
 */
export function isOngoing(event: Event): boolean {
  const now = new Date();
  return new Date(event.startTime) <= now && new Date(event.endTime) >= now;
}

/**
 * Check if event is past
 */
export function isPast(event: Event): boolean {
  return new Date(event.endTime) < new Date();
}

/**
 * Check if event is full
 */
export function isFull(event: Event): boolean {
  if (!event.maxAttendees) return false;
  const attendeeCount = event._count?.attendees || event.attendees?.length || 0;
  return attendeeCount >= event.maxAttendees;
}

/**
 * Get available spots
 */
export function getAvailableSpots(event: Event): number | null {
  if (!event.maxAttendees) return null;
  const attendeeCount = event._count?.attendees || event.attendees?.length || 0;
  return Math.max(0, event.maxAttendees - attendeeCount);
}

/**
 * Get event type icon
 */
export function getEventTypeIcon(type: EventType): string {
  const icons: Record<EventType, string> = {
    WORKSHOP: '🛠️',
    MEETUP: '👥',
    WEBINAR: '💻',
    SKILL_EXCHANGE: '🔄',
    STUDY_GROUP: '📚',
    NETWORKING: '🤝',
    SEMINAR: '🎓',
    OTHER: '📅',
  };
  return icons[type] || '📅';
}
