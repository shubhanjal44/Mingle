/**
 * Event List Component
 * Displays events with filtering, search, and different view options
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Grid3x3,
  List,
  Filter,
  Search,
  Globe,
  Video,
  RefreshCw,
  Plus,
} from 'lucide-react';
import {
  getEvents,
  getUpcomingEvents,
  Event,
  EventType,
  getEventTypeLabel,
  getEventTypeIcon,
  getEventStatusColor,
  formatEventDateRange,
  isFull,
  getAvailableSpots,
} from '../services/event.service';

interface EventListProps {
  showFilters?: boolean;
  viewMode?: 'list' | 'grid';
  upcomingOnly?: boolean;
}

export default function EventList({
  showFilters = true,
  viewMode: initialViewMode = 'grid',
  upcomingOnly = false,
}: EventListProps) {
  const navigate = useNavigate();

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(initialViewMode);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<EventType | ''>('');
  const [selectedLocation, setSelectedLocation] = useState<'all' | 'online' | 'offline'>(
    'all'
  );
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [selectedEventType, selectedLocation, upcomingOnly]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);

      if (upcomingOnly) {
        const upcomingEvents = await getUpcomingEvents(50);
        setEvents(upcomingEvents);
      } else {
        const filters: any = {};

        if (selectedEventType) {
          filters.eventType = selectedEventType;
        }

        if (selectedLocation === 'online') {
          filters.isOnline = true;
        } else if (selectedLocation === 'offline') {
          filters.isOnline = false;
        }

        const response = await getEvents(filters);
        setEvents(response.events);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
      toast.error('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter events by search query
  const filteredEvents = events.filter((event) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.organizer?.name.toLowerCase().includes(query) ||
        event.city?.toLowerCase().includes(query) ||
        event.state?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const eventTypes: EventType[] = [
    'WORKSHOP',
    'MEETUP',
    'WEBINAR',
    'SKILL_EXCHANGE',
    'STUDY_GROUP',
    'NETWORKING',
    'SEMINAR',
    'OTHER',
  ];

  const EventCard = ({ event }: { event: Event }) => {
    const full = isFull(event);
    const availableSpots = getAvailableSpots(event);

    return (
      <div
        onClick={() => navigate(`/events/${event.eventId}`)}
        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all cursor-pointer"
      >
        {/* Event Image */}
        {event.imageUrl ? (
          <div className="h-48 overflow-hidden bg-gray-200">
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-6xl">{getEventTypeIcon(event.eventType)}</span>
          </div>
        )}

        <div className="p-4">
          {/* Event Type & Status */}
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {getEventTypeLabel(event.eventType)}
            </span>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEventStatusColor(
                event.status
              )}`}
            >
              {event.status}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
            {event.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {event.description}
          </p>

          {/* Date/Time */}
          <div className="flex items-start gap-2 text-sm text-gray-600 mb-2">
            <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">
              {formatEventDateRange(event.startTime, event.endTime)}
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            {event.isOnline ? (
              <>
                <Video className="w-4 h-4" />
                <span>Online Event</span>
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4" />
                <span className="line-clamp-1">
                  {event.city && event.state
                    ? `${event.city}, ${event.state}`
                    : event.location}
                </span>
              </>
            )}
          </div>

          {/* Organizer */}
          <div className="flex items-center gap-2 mb-3">
            {event.organizer?.avatar ? (
              <img
                src={event.organizer.avatar}
                alt={event.organizer.name}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                <Users className="w-4 h-4 text-gray-600" />
              </div>
            )}
            <div className="text-sm">
              <p className="text-gray-600">Organized by</p>
              <p className="font-medium text-gray-900">{event.organizer?.name}</p>
            </div>
          </div>

          {/* Attendees */}
          {event.maxAttendees && (
            <div
              className={`flex items-center justify-between p-2 rounded-lg ${
                full ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {event._count?.attendees || 0} / {event.maxAttendees} attendees
                </span>
              </div>
              {full ? (
                <span className="text-xs font-medium">FULL</span>
              ) : (
                <span className="text-xs">
                  {availableSpots} spot{availableSpots !== 1 ? 's' : ''} left
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const EventRow = ({ event }: { event: Event }) => {
    return (
      <div
        onClick={() => navigate(`/events/${event.eventId}`)}
        className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-all cursor-pointer"
      >
        <div className="flex items-start gap-4">
          {/* Event Image */}
          {event.imageUrl ? (
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-32 h-32 object-cover rounded-lg flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-4xl">{getEventTypeIcon(event.eventType)}</span>
            </div>
          )}

          {/* Event Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-xl font-bold text-gray-900 line-clamp-1">
                {event.title}
              </h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {getEventTypeLabel(event.eventType)}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEventStatusColor(
                    event.status
                  )}`}
                >
                  {event.status}
                </span>
              </div>
            </div>

            <p className="text-gray-600 mb-3 line-clamp-2">{event.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{formatEventDateRange(event.startTime, event.endTime)}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                {event.isOnline ? (
                  <>
                    <Video className="w-4 h-4" />
                    <span>Online Event</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4" />
                    <span className="line-clamp-1">
                      {event.city && event.state
                        ? `${event.city}, ${event.state}`
                        : event.location}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-600" />
                <span className="text-gray-600">
                  by <span className="font-medium">{event.organizer?.name}</span>
                </span>
              </div>

              {event.maxAttendees && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-600" />
                  <span
                    className={`font-medium ${
                      isFull(event) ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {event._count?.attendees || 0} / {event.maxAttendees} attendees
                    {isFull(event) && ' (FULL)'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search events..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${
                  viewMode === 'grid'
                    ? 'bg-white shadow text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${
                  viewMode === 'list'
                    ? 'bg-white shadow text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>

            {/* Refresh */}
            <button
              onClick={loadEvents}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Filters Panel */}
          {showFiltersPanel && (
            <div className="pt-4 border-t space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Event Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Type
                  </label>
                  <select
                    value={selectedEventType}
                    onChange={(e) => setSelectedEventType(e.target.value as EventType | '')}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Types</option>
                    {eventTypes.map((type) => (
                      <option key={type} value={type}>
                        {getEventTypeIcon(type)} {getEventTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <select
                    value={selectedLocation}
                    onChange={(e) =>
                      setSelectedLocation(e.target.value as 'all' | 'online' | 'offline')
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Events</option>
                    <option value="online">Online Only</option>
                    <option value="offline">Offline Only</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters */}
              {(selectedEventType || selectedLocation !== 'all') && (
                <button
                  onClick={() => {
                    setSelectedEventType('');
                    setSelectedLocation('all');
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Events List/Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Be the first to create an event!'}
          </p>
          <button
            onClick={() => navigate('/events/create')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Event
          </button>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }
        >
          {filteredEvents.map((event) =>
            viewMode === 'grid' ? (
              <EventCard key={event.eventId} event={event} />
            ) : (
              <EventRow key={event.eventId} event={event} />
            )
          )}
        </div>
      )}
    </div>
  );
}
