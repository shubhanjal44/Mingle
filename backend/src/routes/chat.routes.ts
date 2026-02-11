/**
 * Chat Routes
 * All routes for real-time messaging
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  sendMessage,
  getConversations,
  getConversationMessages,
  markConversationAsRead,
  deleteMessage,
  searchMessages,
  getUnreadCount,
  getOnlineUsers,
  markMessageDelivered,
} from '../controllers/chat.controller';

const router = Router();

/**
 * @route   POST /api/v1/chat/messages
 * @desc    Send a message
 * @access  Private
 */
router.post('/messages', authenticate, sendMessage);

/**
 * @route   GET /api/v1/chat/conversations
 * @desc    Get user's conversations list
 * @access  Private
 */
router.get('/conversations', authenticate, getConversations);

/**
 * @route   GET /api/v1/chat/conversations/:userId
 * @desc    Get conversation messages with a specific user
 * @access  Private
 * @query   limit, offset
 */
router.get('/conversations/:userId', authenticate, getConversationMessages);

/**
 * @route   PUT /api/v1/chat/conversations/:userId/read
 * @desc    Mark all messages in conversation as read
 * @access  Private
 */
router.put('/conversations/:userId/read', authenticate, markConversationAsRead);

/**
 * @route   GET /api/v1/chat/search
 * @desc    Search messages in a conversation
 * @access  Private
 * @query   otherUserId, query, limit
 */
router.get('/search', authenticate, searchMessages);

/**
 * @route   GET /api/v1/chat/unread-count
 * @desc    Get total unread message count
 * @access  Private
 */
router.get('/unread-count', authenticate, getUnreadCount);

/**
 * @route   GET /api/v1/chat/online-users
 * @desc    Get list of online users
 * @access  Private
 */
router.get('/online-users', authenticate, getOnlineUsers);

/**
 * @route   DELETE /api/v1/chat/messages/:messageId
 * @desc    Delete a message (soft delete)
 * @access  Private
 */
router.delete('/messages/:messageId', authenticate, deleteMessage);

/**
 * @route   POST /api/v1/chat/messages/:messageId/delivered
 * @desc    Mark message as delivered
 * @access  Private
 */
router.post('/messages/:messageId/delivered', authenticate, markMessageDelivered);

export default router;
