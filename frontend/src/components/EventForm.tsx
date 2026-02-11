/**
 * Event Form Component
 * Form for creating and editing events
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Image as ImageIcon,
  Globe,
  Building,
  Tag,
  FileText,
  Save,
  X,
} from 'lucide-react';
import {
  createEvent,
  updateEvent,
  Event,
  EventType,
  CreateEventParams,
  getEventTypeLabel,
  getEventTypeIcon,
} from '../services/event.service';
import skillsService from '../services/skills.service';

interface EventFormProps {
  event?: Event;
  onSuccess?: (event: Event) => void;
  onCancel?: () => void;
}

export default function EventForm({ event, onSuccess, onCancel }: EventFormProps) {
  const navigate = useNavigate();
  const isEditing = !!event;

  // Form state
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    imageUrl: event?.imageUrl || '',
    eventType: event?.eventType || ('WORKSHOP' as EventType),
    startTime: event?.startTime
      ? new Date(event.startTime).toISOString().slice(0, 16)
      : '',
    endTime: event?.endTime ? new Date(event.endTime).toISOString().slice(0, 16) : '',
    isOnline: event?.isOnline ?? false,
    location: event?.location || '',
    venue: event?.venue || '',
    city: event?.city || '',
    state: event?.state || '',
    meetingLink: event?.meetingLink || '',
    skillId: event?.skillId || '',
    maxAttendees: event?.maxAttendees?.toString() || '',
  });

  const [skills, setSkills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSkills, setIsLoadingSkills] = useState(true);

  // Load skills for dropdown
  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      setIsLoadingSkills(true);
      const response = await skillsService.getAllSkills();
      // ✅ CORRECT - Access skills inside data property
      setSkills(response.data.skills);

    } catch (error) {
      console.error('Failed to load skills:', error);
    } finally {
      setIsLoadingSkills(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast.error('Please enter an event title');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Please enter an event description');
      return;
    }

    if (!formData.startTime) {
      toast.error('Please select a start time');
      return;
    }

    if (!formData.endTime) {
      toast.error('Please select an end time');
      return;
    }

    if (formData.isOnline && !formData.meetingLink.trim()) {
      toast.error('Please provide a meeting link for online events');
      return;
    }

    if (!formData.isOnline && !formData.location.trim()) {
      toast.error('Please provide a location for offline events');
      return;
    }

    try {
      setIsLoading(true);

      const params: CreateEventParams = {
        title: formData.title,
        description: formData.description,
        imageUrl: formData.imageUrl || undefined,
        eventType: formData.eventType,
        startTime: new Date(formData.startTime),
        endTime: new Date(formData.endTime),
        isOnline: formData.isOnline,
        location: formData.location || undefined,
        venue: formData.venue || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        meetingLink: formData.meetingLink || undefined,
        skillId: formData.skillId || undefined,
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : undefined,
      };

      let result: Event;
      if (isEditing && event) {
        result = await updateEvent(event.eventId, params);
        toast.success('Event updated successfully!');
      } else {
        result = await createEvent(params);
        toast.success('Event created successfully!');
      }

      if (onSuccess) {
        onSuccess(result);
      } else {
        navigate(`/events/${result.eventId}`);
      }
    } catch (error: any) {
      console.error('Failed to save event:', error);
      toast.error(error.response?.data?.message || 'Failed to save event');
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Event' : 'Create New Event'}
        </h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="w-4 h-4 inline mr-2" />
            Event Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., React.js Workshop for Beginners"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="w-4 h-4 inline mr-2" />
            Description *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={5}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe your event, what attendees will learn, and any prerequisites..."
            required
          />
        </div>

        {/* Event Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Tag className="w-4 h-4 inline mr-2" />
            Event Type *
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {eventTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, eventType: type }))}
                className={`p-3 border rounded-lg text-center transition-all ${
                  formData.eventType === type
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-blue-300'
                }`}
              >
                <div className="text-2xl mb-1">{getEventTypeIcon(type)}</div>
                <div className="text-xs font-medium">{getEventTypeLabel(type)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Start Date & Time *
            </label>
            <input
              type="datetime-local"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-2" />
              End Date & Time *
            </label>
            <input
              type="datetime-local"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        {/* Online/Offline Toggle */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="isOnline"
              checked={formData.isOnline}
              onChange={handleChange}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="ml-3 text-sm font-medium text-gray-700">
              <Video className="w-4 h-4 inline mr-2" />
              This is an online event
            </span>
          </label>
        </div>

        {/* Online Event Fields */}
        {formData.isOnline ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Globe className="w-4 h-4 inline mr-2" />
              Meeting Link * (Zoom, Google Meet, etc.)
            </label>
            <input
              type="url"
              name="meetingLink"
              value={formData.meetingLink}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://zoom.us/j/..."
            />
          </div>
        ) : (
          /* Offline Event Fields */
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Location *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Full address or location description"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building className="w-4 h-4 inline mr-2" />
                  Venue
                </label>
                <input
                  type="text"
                  name="venue"
                  value={formData.venue}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Building/Room name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="State"
                />
              </div>
            </div>
          </>
        )}

        {/* Related Skill */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Related Skill (Optional)
          </label>
          <select
            name="skillId"
            value={formData.skillId}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoadingSkills}
          >
            <option value="">-- Select a skill --</option>
            {skills.map((skill) => (
              <option key={skill.skillId} value={skill.skillId}>
                {skill.name}
              </option>
            ))}
          </select>
        </div>

        {/* Max Attendees */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Users className="w-4 h-4 inline mr-2" />
            Maximum Attendees (Optional)
          </label>
          <input
            type="number"
            name="maxAttendees"
            value={formData.maxAttendees}
            onChange={handleChange}
            min="1"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Leave blank for unlimited"
          />
          <p className="mt-1 text-sm text-gray-500">
            Limit the number of people who can register
          </p>
        </div>

        {/* Image URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <ImageIcon className="w-4 h-4 inline mr-2" />
            Event Image URL (Optional)
          </label>
          <input
            type="url"
            name="imageUrl"
            value={formData.imageUrl}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://example.com/image.jpg"
          />
          {formData.imageUrl && (
            <img
              src={formData.imageUrl}
              alt="Event preview"
              className="mt-3 w-full h-48 object-cover rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            <Save className="w-5 h-5" />
            {isLoading ? 'Saving...' : isEditing ? 'Update Event' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
}
