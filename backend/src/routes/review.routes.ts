/**
 * Review Routes
 * All routes for review management
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  submitReview,
  getUserReviews,
  getSwapReviews,
  getReviewById,
  editReview,
  deleteReview,
  voteOnReview,
  getUserStats,
} from '../controllers/review.controller';

const router = Router();

/**
 * @route   POST /api/v1/reviews
 * @desc    Submit a review for a completed swap
 * @access  Private (authenticated users)
 */
router.post('/', authenticate, submitReview);

/**
 * @route   GET /api/v1/reviews/user/:userId
 * @desc    Get all reviews for a user (as teacher)
 * @access  Public
 * @query   limit, offset, minRating
 */
router.get('/user/:userId', getUserReviews);

/**
 * @route   GET /api/v1/reviews/swap/:swapId
 * @desc    Get reviews for a specific swap
 * @access  Public
 */
router.get('/swap/:swapId', getSwapReviews);

/**
 * @route   GET /api/v1/reviews/stats/:userId
 * @desc    Get detailed rating statistics for a user
 * @access  Public
 */
router.get('/stats/:userId', getUserStats);

/**
 * @route   GET /api/v1/reviews/:id
 * @desc    Get a specific review by ID
 * @access  Public
 */
router.get('/:id', getReviewById);

/**
 * @route   PUT /api/v1/reviews/:id
 * @desc    Edit a review (within 24 hours)
 * @access  Private (review author only)
 */
router.put('/:id', authenticate, editReview);

/**
 * @route   DELETE /api/v1/reviews/:id
 * @desc    Delete a review
 * @access  Private (review author or admin)
 */
router.delete('/:id', authenticate, deleteReview);

/**
 * @route   POST /api/v1/reviews/:id/vote
 * @desc    Vote on a review (helpful/not helpful)
 * @access  Private (authenticated users)
 */
router.post('/:id/vote', authenticate, voteOnReview);

export default router;
