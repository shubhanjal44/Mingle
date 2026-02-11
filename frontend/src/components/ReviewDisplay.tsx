/**
 * ReviewDisplay Component
 * Displays a list of reviews with ratings and statistics
 */

import { useState, useEffect } from 'react';
import { Star, ThumbsUp, Calendar, Edit2, Trash2 } from 'lucide-react';
import reviewsService, { Review, RatingStats } from '../services/reviews.service';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';

interface ReviewDisplayProps {
  userId: string;
  showWriteReviewButton?: boolean;
  onWriteReview?: () => void;
}

export default function ReviewDisplay({
  userId,
  showWriteReviewButton = false,
  onWriteReview,
}: ReviewDisplayProps) {
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [commonTags, setCommonTags] = useState<Array<{ tag: string; count: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetchReviews();
  }, [userId, filterRating]);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const data = await reviewsService.getUserReviews(userId, {
        limit: 20,
        offset: 0,
        minRating: filterRating,
      });
      setReviews(data.reviews);
      setStats(data.stats);
      setCommonTags(data.commonTags);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (reviewId: string, isHelpful: boolean) => {
    try {
      await reviewsService.voteOnReview(reviewId, isHelpful);
      toast.success('Vote recorded!');
      fetchReviews(); // Refresh to update helpful count
    } catch (error: any) {
      console.error('Vote error:', error);
      toast.error(error.response?.data?.error || 'Failed to record vote');
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      await reviewsService.deleteReview(reviewId);
      toast.success('Review deleted successfully');
      fetchReviews();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.error || 'Failed to delete review');
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Statistics */}
      {stats && stats.totalReviews > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overall Rating */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Overall Rating
              </h3>
              <div className="flex items-center gap-4">
                <div className="text-5xl font-bold text-gray-900">
                  {stats.overall.toFixed(1)}
                </div>
                <div>
                  {renderStars(Math.round(stats.overall), 'lg')}
                  <p className="text-sm text-gray-600 mt-1">
                    Based on {stats.totalReviews} reviews
                  </p>
                </div>
              </div>

              {/* Star Distribution */}
              <div className="mt-6 space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = stats.starDistribution[rating as keyof typeof stats.starDistribution];
                  const percentage =
                    stats.totalReviews > 0
                      ? (count / stats.totalReviews) * 100
                      : 0;
                  return (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 w-8">
                        {rating}★
                      </span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-10 text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed Ratings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Detailed Ratings
              </h3>
              <div className="space-y-4">
                {stats.teachingQuality > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Teaching Quality</span>
                      <span className="font-semibold">{stats.teachingQuality.toFixed(1)}/5</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${(stats.teachingQuality / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                {stats.communication > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Communication</span>
                      <span className="font-semibold">{stats.communication.toFixed(1)}/5</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${(stats.communication / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                {stats.punctuality > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Punctuality</span>
                      <span className="font-semibold">{stats.punctuality.toFixed(1)}/5</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500"
                        style={{ width: `${(stats.punctuality / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Common Tags */}
              {commonTags.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Most Common Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {commonTags.map(({ tag, count }) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                      >
                        {tag} ({count})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Reviews ({reviews.length})
        </h3>
        <select
          value={filterRating || ''}
          onChange={(e) =>
            setFilterRating(e.target.value ? parseInt(e.target.value) : undefined)
          }
          className="px-3 py-1 border border-gray-300 rounded-md text-sm"
        >
          <option value="">All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4+ Stars</option>
          <option value="3">3+ Stars</option>
        </select>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600">No reviews yet</p>
            {showWriteReviewButton && onWriteReview && (
              <button
                onClick={onWriteReview}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Write the first review
              </button>
            )}
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.reviewId} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                    {review.student?.name?.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">
                        {review.student?.name}
                      </span>
                      {review.student?.level && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                          Level {review.student.level}
                        </span>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-2">
                      {renderStars(review.rating)}
                      <span className="text-sm text-gray-600">
                        {review.rating}.0
                      </span>
                      {review.isEdited && (
                        <span className="text-xs text-gray-500">(edited)</span>
                      )}
                    </div>

                    {/* Comment */}
                    {review.comment && (
                      <p className="text-gray-700 mb-3">{review.comment}</p>
                    )}

                    {/* Tags */}
                    {review.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {review.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(review.createdAt)}
                      </div>
                      <button
                        onClick={() => handleVote(review.reviewId, true)}
                        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        Helpful ({review.helpfulCount})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {user && review.studentId === user.userId && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {/* TODO: Implement edit */}}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit review"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(review.reviewId)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete review"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
