/**
 * Chat Controller
 * Handles all chat-related REST API operations
 */

import { Request, Response, NextFunction } from 'express';
import { chatService } from '../services/chat.service';
import { MessageType } from '@prisma/client';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * POST /api/v1/chat/messages
 * Send a message
 */
export async function sendMessage(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    const {
      receiverId,
      content,
      messageType,
      imageUrl,
      fileUrl,
      fileName,
      fileSize,
      replyToId,
    } = req.body;

    // Validation
    if (!receiverId || !content) {
      return res.status(400).json({
        error: 'receiverId and content are required',
      });
    }

    if (receiverId === userId) {
      return res.status(400).json({
        error: 'Cannot send message to yourself',
      });
    }

    // Send message
    const message = await chatService.sendMessage({
      senderId: userId!,
      receiverId,
      content,
      messageType: messageType as MessageType,
      imageUrl,
      fileUrl,
      fileName,
      fileSize,
      replyToId,
    });

    // Get Socket.IO instance from app
    const io = req.app.get('io');

    // Emit real-time event to receiver
    chatService.emitToUser(io, receiverId, 'message:new', {
      message,
    });

    // Also emit delivery confirmation to sender
    chatService.emitToUser(io, userId!, 'message:sent', {
      tempId: req.body.tempId, // For client-side optimistic updates
      message,
    });

    res.status(201).json({
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
}

/**
 * GET /api/v1/chat/conversations
 * Get user's conversations list
 */
export async function getConversations(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;

    const conversations = await chatService.getUserConversations(userId!);

    res.json({
      conversations,
      totalUnread: conversations.reduce((sum, conv) => sum + conv.unreadCount, 0),
    });
  } catch (error: any) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
}

/**
 * GET /api/v1/chat/conversations/:userId
 * Get conversation messages with a specific user
 */
export async function getConversationMessages(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    const { userId: otherUserId } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    const messages = await chatService.getConversationMessages(
      userId!,
      otherUserId,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json({
      messages,
      conversationId: chatService.getConversationId(userId!, otherUserId),
    });
  } catch (error: any) {
    console.error('Get conversation messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
}

/**
 * PUT /api/v1/chat/conversations/:userId/read
 * Mark all messages in conversation as read
 */
export async function markConversationAsRead(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    const { userId: otherUserId } = req.params;

    const count = await chatService.markMessagesAsRead(userId!, otherUserId);

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Notify sender that messages were read
    chatService.emitToUser(io, otherUserId, 'messages:read', {
      conversationId: chatService.getConversationId(userId!, otherUserId),
      readBy: userId,
      readAt: new Date(),
      count,
    });

    res.json({
      message: `${count} messages marked as read`,
      count,
    });
  } catch (error: any) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
}

/**
 * DELETE /api/v1/chat/messages/:messageId
 * Delete a message (soft delete)
 */
export async function deleteMessage(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    const { messageId } = req.params;

    await chatService.deleteMessage(messageId, userId!);

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Emit deletion event to both users
    io.emit('message:deleted', { messageId });

    res.json({ message: 'Message deleted successfully' });
  } catch (error: any) {
    console.error('Delete message error:', error);
    res.status(400).json({ error: error.message || 'Failed to delete message' });
  }
}

/**
 * GET /api/v1/chat/search
 * Search messages in a conversation
 */
export async function searchMessages(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    const { otherUserId, query, limit = '20' } = req.query;

    if (!otherUserId || !query) {
      return res.status(400).json({
        error: 'otherUserId and query are required',
      });
    }

    const messages = await chatService.searchMessages(
      userId!,
      otherUserId as string,
      query as string,
      parseInt(limit as string)
    );

    res.json({
      messages,
      total: messages.length,
    });
  } catch (error: any) {
    console.error('Search messages error:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
}

/**
 * GET /api/v1/chat/unread-count
 * Get total unread message count
 */
export async function getUnreadCount(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;

    const count = await chatService.getUnreadMessageCount(userId!);

    res.json({ unreadCount: count });
  } catch (error: any) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
}

/**
 * GET /api/v1/chat/online-users
 * Get list of online users (for testing/admin)
 */
export async function getOnlineUsers(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const onlineUsers = chatService.getOnlineUsers();

    res.json({
      onlineUsers: onlineUsers.map((u) => ({
        userId: u.userId,
        lastSeen: u.lastSeen,
      })),
      total: onlineUsers.length,
    });
  } catch (error: any) {
    console.error('Get online users error:', error);
    res.status(500).json({ error: 'Failed to get online users' });
  }
}

/**
 * POST /api/v1/chat/messages/:messageId/delivered
 * Mark message as delivered
 */
export async function markMessageDelivered(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { messageId } = req.params;

    await chatService.markMessageAsDelivered(messageId);

    res.json({ message: 'Message marked as delivered' });
  } catch (error: any) {
    console.error('Mark delivered error:', error);
    res.status(500).json({ error: 'Failed to mark message as delivered' });
  }
}
