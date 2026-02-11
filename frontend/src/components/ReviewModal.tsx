/**
 * ReviewModal Component
 * Modal for submitting and editing reviews
 */

import { useState, useEffect } from 'react';
import { X, Star, Loader2 } from 'lucide-react';
import reviewsService from '../services/reviews.service';
import toast from 'react-hot-toast';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  swapId: string;
  teacherId: string;
  teacherName: string;
  onReviewSubmitted?: () => void;
  existingReview?: {
    reviewId: string;
    rating: number;
    comment?: string;
    teachingQuality?: number;
    communication?: number;
    punctuality?: number;
    tags?: string[];
  };
}

const AVAILABLE_TAGS = [
  'Patient',
  'Knowledgeable',
  'Helpful',
  'Punctual',
  'Friendly',
  'Clear Communicator',
  'Well-Prepared',
  'Engaging',
  'Supportive',
  'Professional',
];

export default function ReviewModal({
  isOpen,
  onClose,
  swapId,
  teacherId,
  teacherName,
  onReviewSubmitted,
  existingReview,
}: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [teachingQuality, setTeachingQuality] = useState<number | null>(null);
  const [communication, setCommunication] = useState<number | null>(null);
  const [punctuality, setPunctuality] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load existing review data if editing
  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment || '');
      setTeachingQuality(existingReview.teachingQuality || null);
      setCommunication(existingReview.communication || null);
      setPunctuality(existingReview.punctuality || null);
      setSelectedTags(existingReview.tags || []);
    }
  }, [existingReview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (existingReview) {
        // Edit existing review
        await reviewsService.editReview(existingReview.reviewId, {
          rating,
          comment: comment.trim() || undefined,
          teachingQuality: teachingQuality || undefined,
          communication: communication || undefined,
          punctuality: punctuality || undefined,
          tags: selectedTags,
          isPublic,
        });
        toast.success('Review updated successfully!');
      } else {
        // Submit new review
        await reviewsService.submitReview({
          swapId,
          teacherId,
          rating,
          comment: comment.trim() || undefined,
          teachingQuality: teachingQuality || undefined,
          communication: communication || undefined,
          punctuality: punctuality || undefined,
          tags: selectedTags,
          isPublic,
        });
        toast.success('Review submitted successfully!');
      }

      onReviewSubmitted?.();
      onClose();
    } catch (error: any) {
      console.error('Submit review error:', error);
      toast.error(
        error.response?.data?.error || 'Failed to submit review. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const renderStars = (
    currentValue: number,
    onHover: (value: number) => void,
    onClick: (value: number) => void,
    hoverValue: number = 0
  ) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-8 h-8 cursor-pointer transition-colors ${
              star <= (hoverValue || currentValue)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
            onMouseEnter={() => onHover(star)}
            onMouseLeave={() => onHover(0)}
            onClick={() => onClick(star)}
          />
        ))}
      </div>
    );
  };

  const renderDetailedRating = (
    label: string,
    value: number | null,
    setValue: (val: number | null) => void
  ) => {
    const [hover, setHover] = useState(0);
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-6 h-6 cursor-pointer transition-colors ${
                  star <= (hover || value || 0)
                    ? 'fill-blue-400 text-blue-400'
                    : 'text-gray-300'
                }`}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setValue(star)}
              />
            ))}
          </div>
          {value !== null && (
            <button
              type="button"
              onClick={() => setValue(null)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {existingReview ? 'Edit Review' : 'Write a Review'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Share your experience with {teacherName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Overall Rating */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Overall Rating *
            </label>
            {renderStars(rating, setHoverRating, setRating, hoverRating)}
            <p className="text-sm text-gray-500">
              {rating === 5 && 'Excellent!'}
              {rating === 4 && 'Good'}
              {rating === 3 && 'Average'}
              {rating === 2 && 'Below Average'}
              {rating === 1 && 'Poor'}
            </p>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label
              htmlFor="comment"
              className="block text-sm font-medium text-gray-700"
            >
              Your Review (Optional)
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Share your experience with this teacher..."
            />
            <p className="text-xs text-gray-500">
              {comment.length} / 500 characters
            </p>
          </div>

          {/* Detailed Ratings (Optional) */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium text-gray-900">
              Detailed Ratings (Optional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderDetailedRating(
                'Teaching Quality',
                teachingQuality,
                setTeachingQuality
              )}
              {renderDetailedRating(
                'Communication',
                communication,
                setCommunication
              )}
              {renderDetailedRating('Punctuality', punctuality, setPunctuality)}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2 pt-4 border-t">
            <label className="block text-sm font-medium text-gray-700">
              Tags (Select all that apply)
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Public/Private Toggle */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isPublic" className="text-sm text-gray-700">
              Make this review public (visible on teacher's profile)
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : existingReview ? (
                'Update Review'
              ) : (
                'Submit Review'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
