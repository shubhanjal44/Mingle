/**
 * Reviews Service
 * Handles all review-related API calls
 */

import api from './api';

export interface ReviewSubmission {
  swapId: string;
  teacherId: string;
  rating: number;
  comment?: string;
  teachingQuality?: number;
  communication?: number;
  punctuality?: number;
  tags?: string[];
  isPublic?: boolean;
}

export interface ReviewEdit {
  rating?: number;
  comment?: string;
  teachingQuality?: number;
  communication?: number;
  punctuality?: number;
  tags?: string[];
  isPublic?: boolean;
}

export interface Review {
  reviewId: string;
  swapId: string;
  studentId: string;
  teacherId: string;
  rating: number;
  comment?: string;
  teachingQuality?: number;
  communication?: number;
  punctuality?: number;
  tags: string[];
  isPublic: boolean;
  helpfulCount: number;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  student?: {
    userId: string;
    name: string;
    avatar?: string;
    level?: number;
  };
  teacher?: {
    userId: string;
    name: string;
    avatar?: string;
    rating?: number;
  };
  swap?: {
    swapId: string;
    completedAt?: string;
  };
  votes?: Array<{
    voteId: string;
    userId: string;
    isHelpful: boolean;
  }>;
}

export interface RatingStats {
  overall: number;
  totalReviews: number;
  starDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  teachingQuality: number;
  communication: number;
  punctuality: number;
}

export interface UserReviewsResponse {
  reviews: Review[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  stats: RatingStats;
  commonTags: Array<{
    tag: string;
    count: number;
  }>;
}

/**
 * Submit a review for a completed swap
 */
export const submitReview = async (data: ReviewSubmission) => {
  const response = await api.post('/reviews', data);
  return response.data;
};

/**
 * Get all reviews for a user (as teacher)
 */
export const getUserReviews = async (
  userId: string,
  params?: {
    limit?: number;
    offset?: number;
    minRating?: number;
  }
): Promise<UserReviewsResponse> => {
  const response = await api.get(`/reviews/user/${userId}`, { params });
  return response.data;
};

/**
 * Get reviews for a specific swap
 */
export const getSwapReviews = async (swapId: string) => {
  const response = await api.get(`/reviews/swap/${swapId}`);
  return response.data;
};

/**
 * Get a specific review by ID
 */
export const getReviewById = async (reviewId: string) => {
  const response = await api.get(`/reviews/${reviewId}`);
  return response.data;
};

/**
 * Edit a review (within 24 hours)
 */
export const editReview = async (reviewId: string, data: ReviewEdit) => {
  const response = await api.put(`/reviews/${reviewId}`, data);
  return response.data;
};

/**
 * Delete a review
 */
export const deleteReview = async (reviewId: string) => {
  const response = await api.delete(`/reviews/${reviewId}`);
  return response.data;
};

/**
 * Vote on a review (helpful/not helpful)
 */
export const voteOnReview = async (reviewId: string, isHelpful: boolean) => {
  const response = await api.post(`/reviews/${reviewId}/vote`, { isHelpful });
  return response.data;
};

/**
 * Get detailed rating statistics for a user
 */
export const getUserStats = async (userId: string) => {
  const response = await api.get(`/reviews/stats/${userId}`);
  return response.data;
};

// Export all functions as a service object
const reviewsService = {
  submitReview,
  getUserReviews,
  getSwapReviews,
  getReviewById,
  editReview,
  deleteReview,
  voteOnReview,
  getUserStats,
};

export default reviewsService;
