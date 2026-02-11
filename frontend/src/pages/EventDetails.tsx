/**
 * Event Details Page
 * Displays full event information with registration and management options
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Globe,
  Building,
  Edit,
  Trash2,
  Check,
  X,
  ChevronLeft,
  Share2,
  BookmarkPlus,
  RefreshCw,
  Tag,
} from 'lucide-react';
import {
  getEventById,
  registerForEvent,
  unregisterFromEvent,
  publishEvent,
  cancelEvent,
  deleteEvent,
  getEventAttendees,
  Event,
  EventAttendee,
  getEventTypeLabel,
  getEventTypeIcon,
  getEventStatusColor,
  formatEventDateRange,
  isFull,
  getAvailableSpots,
  isPast,
} from '../services/event.service';
import { useAuthStore } from '../stores/authStore';

export default function EventDetails() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [event, setEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showAttendees, setShowAttendees] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setIsLoading(true);
      if (!eventId) return;

      const data = await getEventById(eventId);
      setEvent(data);
    } catch (error: any) {
      console.error('Failed to load event:', error);
      toast.error('Failed to load event');
      navigate('/events');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAttendees = async () => {
    try {
      setIsLoadingAttendees(true);
      if (!eventId) return;

      const data = await getEventAttendees(eventId);
      setAttendees(data);
      setShowAttendees(true);
    } catch (error) {
      console.error('Failed to load attendees:', error);
      toast.error('Failed to load attendees');
    } finally {
      setIsLoadingAttendees(false);
    }
  };

  const handleRegister = async () => {
    if (!user) {
      toast.error('Please login to register for events');
      navigate('/login');
      return;
    }

    if (!eventId) return;

    try {
      setIsRegistering(true);
      await registerForEvent(eventId);
      toast.success('Successfully registered for the event!');
      await loadEvent();
    } catch (error: any) {
      console.error('Failed to register:', error);
      toast.error(error.response?.data?.message || 'Failed to register for event');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleUnregister = async () => {
    if (!eventId) return;

    const confirmed = window.confirm(
      'Are you sure you want to unregister from this event?'
    );
    if (!confirmed) return;

    try {
      setIsRegistering(true);
      await unregisterFromEvent(eventId);
      toast.success('Successfully unregistered from the event');
      await loadEvent();
    } catch (error: any) {
      console.error('Failed to unregister:', error);
      toast.error(error.response?.data?.message || 'Failed to unregister from event');
    } finally {
      setIsRegistering(false);
    }
  };

  const handlePublish = async () => {
    if (!eventId) return;

    try {
      await publishEvent(eventId);
      toast.success('Event published successfully!');
      await loadEvent();
    } catch (error: any) {
      console.error('Failed to publish event:', error);
      toast.error(error.response?.data?.message || 'Failed to publish event');
    }
  };

  const handleCancel = async () => {
    if (!eventId) return;

    const confirmed = window.confirm(
      'Are you sure you want to cancel this event? All attendees will be notified.'
    );
    if (!confirmed) return;

    try {
      await cancelEvent(eventId);
      toast.success('Event cancelled successfully');
      await loadEvent();
    } catch (error: any) {
      console.error('Failed to cancel event:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel event');
    }
  };

  const handleDelete = async () => {
    if (!eventId) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this event? This action cannot be undone.'
    );
    if (!confirmed) return;

    try {
      await deleteEvent(eventId);
      toast.success('Event deleted successfully');
      navigate('/events');
    } catch (error: any) {
      console.error('Failed to delete event:', error);
      toast.error(error.response?.data?.message || 'Failed to delete event');
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: event?.title,
        text: event?.description,
        url: url,
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Event link copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-gray-600">Event not found</p>
      </div>
    );
  }

  const isOrganizer = user?.userId === event.organizerId;
  const eventIsFull = isFull(event);
  const eventIsPast = isPast(event);
  const canRegister =
    !isOrganizer &&
    !event.isRegistered &&
    !eventIsFull &&
    !eventIsPast &&
    event.status === 'PUBLISHED';
  const canUnregister = event.isRegistered && !eventIsPast;

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/events')}
        className="flex items-center gap-2 text-blue-600 hover:underline mb-6"
      >
        <ChevronLeft className="w-5 h-5" />
        Back to Events
      </button>

      {/* Event Header */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
        {/* Event Image */}
        {event.imageUrl ? (
          <div className="h-64 md:h-96 overflow-hidden bg-gray-200">
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="h-64 md:h-96 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-9xl">{getEventTypeIcon(event.eventType)}</span>
          </div>
        )}

        <div className="p-6">
          {/* Status & Type */}
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
              {getEventTypeLabel(event.eventType)}
            </span>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getEventStatusColor(
                event.status
              )}`}
            >
              {event.status}
            </span>
            {eventIsFull && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                FULL
              </span>
            )}
            {eventIsPast && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                PAST EVENT
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {event.title}
          </h1>

          {/* Organizer */}
          <div className="flex items-center gap-3 mb-6">
            {event.organizer?.avatar ? (
              <img
                src={event.organizer.avatar}
                alt={event.organizer.name}
                className="w-12 h-12 rounded-full"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                <Users className="w-6 h-6 text-gray-600" />
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Organized by</p>
              <p className="font-semibold text-gray-900">{event.organizer?.name}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {isOrganizer ? (
              <>
                {event.status === 'DRAFT' && (
                  <button
                    onClick={handlePublish}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Check className="w-5 h-5" />
                    Publish Event
                  </button>
                )}
                <button
                  onClick={() => navigate(`/events/${eventId}/edit`)}
                  className="flex items-center gap-2 px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Edit className="w-5 h-5" />
                  Edit
                </button>
                {event.status !== 'CANCELLED' && (
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-6 py-3 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <X className="w-5 h-5" />
                    Cancel Event
                  </button>
                )}
                {(event.status === 'DRAFT' || event.status === 'CANCELLED') && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-6 py-3 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete
                  </button>
                )}
              </>
            ) : (
              <>
                {canRegister && (
                  <button
                    onClick={handleRegister}
                    disabled={isRegistering}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-5 h-5" />
                    {isRegistering ? 'Registering...' : 'Register for Event'}
                  </button>
                )}
                {canUnregister && (
                  <button
                    onClick={handleUnregister}
                    disabled={isRegistering}
                    className="flex items-center gap-2 px-6 py-3 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                    {isRegistering ? 'Unregistering...' : 'Unregister'}
                  </button>
                )}
              </>
            )}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Share2 className="w-5 h-5" />
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Event Details */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">About this event</h2>
            <p className="text-gray-700 whitespace-pre-line">{event.description}</p>
          </div>

          {/* Attendees */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Attendees ({event._count?.attendees || 0}
                {event.maxAttendees && ` / ${event.maxAttendees}`})
              </h2>
              <button
                onClick={loadAttendees}
                disabled={isLoadingAttendees}
                className="text-blue-600 hover:underline text-sm"
              >
                {isLoadingAttendees ? 'Loading...' : 'View all'}
              </button>
            </div>

            {showAttendees && attendees.length > 0 && (
              <div className="space-y-3">
                {attendees.map((attendee) => (
                  <div
                    key={attendee.userId}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {attendee.avatar ? (
                      <img
                        src={attendee.avatar}
                        alt={attendee.name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{attendee.name}</p>
                      {attendee.city && attendee.state && (
                        <p className="text-sm text-gray-600">
                          {attendee.city}, {attendee.state}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(attendee.registeredAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {event.maxAttendees && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Capacity</span>
                  <span
                    className={`text-sm font-medium ${
                      eventIsFull ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {getAvailableSpots(event)} spots remaining
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      eventIsFull ? 'bg-red-600' : 'bg-green-600'
                    }`}
                    style={{
                      width: `${
                        ((event._count?.attendees || 0) / event.maxAttendees) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Date & Time */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-bold text-gray-900 mb-4">Date & Time</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">When</p>
                  <p className="font-medium text-gray-900">
                    {formatEventDateRange(event.startTime, event.endTime)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-bold text-gray-900 mb-4">Location</h3>
            {event.isOnline ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Video className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Online Event</span>
                </div>
                {event.meetingLink && event.isRegistered && (
                  <a
                    href={event.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    Join Meeting
                  </a>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    {event.venue && (
                      <p className="font-medium text-gray-900">{event.venue}</p>
                    )}
                    <p className="text-gray-700">{event.location}</p>
                    {event.city && event.state && (
                      <p className="text-sm text-gray-600">
                        {event.city}, {event.state}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Related Skill */}
          {event.skill && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-bold text-gray-900 mb-4">Related Skill</h3>
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg">
                <Tag className="w-4 h-4" />
                <span className="font-medium">{event.skill.name}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
