/**
 * Chat Service
 * Handles real-time messaging with Socket.IO and database operations
 */

import { PrismaClient, MessageType } from '@prisma/client';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface UserSocket {
  userId: string;
  socketId: string;
  lastSeen: Date;
}

// In-memory store for online users (in production, use Redis)
const onlineUsers = new Map<string, UserSocket>();

// In-memory store for typing indicators
const typingUsers = new Map<string, { userId: string; conversationId: string }>();

/**
 * Generate conversation ID from two user IDs (always in same order)
 */
export function generateConversationId(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `${sorted[0]}_${sorted[1]}`;
}

/**
 * Get conversation ID for a user pair
 */
export function getConversationId(senderId: string, receiverId: string): string {
  return generateConversationId(senderId, receiverId);
}

/**
 * Send a message
 */
export async function sendMessage(data: {
  senderId: string;
  receiverId: string;
  content: string;
  messageType?: MessageType;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyToId?: string;
}) {
  const conversationId = getConversationId(data.senderId, data.receiverId);

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: data.senderId,
      receiverId: data.receiverId,
      content: data.content,
      messageType: data.messageType || 'TEXT',
      imageUrl: data.imageUrl,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
      replyToId: data.replyToId,
    },
    include: {
      sender: {
        select: {
          userId: true,
          name: true,
          avatar: true,
        },
      },
      replyTo: {
        select: {
          messageId: true,
          content: true,
          senderId: true,
        },
      },
    },
  });

  logger.info(`Message sent from ${data.senderId} to ${data.receiverId}`);
  return message;
}

/**
 * Get conversation messages
 */
export async function getConversationMessages(
  userId: string,
  otherUserId: string,
  limit: number = 50,
  offset: number = 0
) {
  const conversationId = getConversationId(userId, otherUserId);

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      isDeleted: false,
    },
    include: {
      sender: {
        select: {
          userId: true,
          name: true,
          avatar: true,
        },
      },
      replyTo: {
        select: {
          messageId: true,
          content: true,
          senderId: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  });

  return messages.reverse(); // Return in chronological order
}

/**
 * Get user's conversations
 */
export async function getUserConversations(userId: string) {
  // Get all messages where user is sender or receiver
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
      isDeleted: false,
    },
    distinct: ['conversationId'],
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      sender: {
        select: {
          userId: true,
          name: true,
          avatar: true,
        },
      },
    },
  });

  // Get the latest message for each conversation
  const conversationIds = [...new Set(messages.map((m) => m.conversationId))];

  const conversations = await Promise.all(
    conversationIds.map(async (conversationId) => {
      // Get the other user in the conversation
      const [userId1, userId2] = conversationId.split('_');
      const otherUserId = userId1 === userId ? userId2 : userId1;

      // Get other user details
      const otherUser = await prisma.user.findUnique({
        where: { userId: otherUserId },
        select: {
          userId: true,
          name: true,
          avatar: true,
          lastActive: true,
        },
      });

      // Get latest message
      const latestMessage = await prisma.message.findFirst({
        where: {
          conversationId,
          isDeleted: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Get unread count
      const unreadCount = await prisma.message.count({
        where: {
          conversationId,
          receiverId: userId,
          isRead: false,
          isDeleted: false,
        },
      });

      return {
        conversationId,
        otherUser,
        latestMessage,
        unreadCount,
        isOnline: onlineUsers.has(otherUserId),
      };
    })
  );

  // Sort by latest message time
  return conversations.sort((a, b) => {
    if (!a.latestMessage) return 1;
    if (!b.latestMessage) return -1;
    return (
      new Date(b.latestMessage.createdAt).getTime() -
      new Date(a.latestMessage.createdAt).getTime()
    );
  });
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(userId: string, otherUserId: string) {
  const conversationId = getConversationId(userId, otherUserId);

  const result = await prisma.message.updateMany({
    where: {
      conversationId,
      receiverId: userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return result.count;
}

/**
 * Mark message as delivered
 */
export async function markMessageAsDelivered(messageId: string) {
  await prisma.message.update({
    where: { messageId },
    data: {
      isDelivered: true,
      deliveredAt: new Date(),
    },
  });
}

/**
 * Delete message (soft delete)
 */
export async function deleteMessage(messageId: string, userId: string) {
  const message = await prisma.message.findUnique({
    where: { messageId },
  });

  if (!message) {
    throw new Error('Message not found');
  }

  if (message.senderId !== userId) {
    throw new Error('Only sender can delete their messages');
  }

  await prisma.message.update({
    where: { messageId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });
}

/**
 * Search messages in a conversation
 */
export async function searchMessages(
  userId: string,
  otherUserId: string,
  query: string,
  limit: number = 20
) {
  const conversationId = getConversationId(userId, otherUserId);

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      isDeleted: false,
      content: {
        contains: query,
        mode: 'insensitive',
      },
    },
    include: {
      sender: {
        select: {
          userId: true,
          name: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });

  return messages;
}

/**
 * Get unread message count for a user
 */
export async function getUnreadMessageCount(userId: string): Promise<number> {
  return await prisma.message.count({
    where: {
      receiverId: userId,
      isRead: false,
      isDeleted: false,
    },
  });
}

// ==================== Socket.IO Event Handlers ====================

/**
 * Handle user connection
 */
export function handleUserConnect(socket: Socket, userId: string) {
  onlineUsers.set(userId, {
    userId,
    socketId: socket.id,
    lastSeen: new Date(),
  });

  // Join user's personal room
  socket.join(`user:${userId}`);

  // Notify all conversations that user is online
  socket.broadcast.emit('user:online', { userId });

  logger.info(`User ${userId} connected with socket ${socket.id}`);
}

/**
 * Handle user disconnection
 */
export function handleUserDisconnect(socket: Socket, userId?: string) {
  if (userId) {
    onlineUsers.delete(userId);
    socket.broadcast.emit('user:offline', { userId, lastSeen: new Date() });
    logger.info(`User ${userId} disconnected`);
  }
}

/**
 * Handle typing indicator
 */
export function handleTyping(
  socket: Socket,
  userId: string,
  receiverId: string,
  isTyping: boolean
) {
  const conversationId = getConversationId(userId, receiverId);

  if (isTyping) {
    typingUsers.set(socket.id, { userId, conversationId });
  } else {
    typingUsers.delete(socket.id);
  }

  // Notify the receiver
  socket.to(`user:${receiverId}`).emit('user:typing', {
    userId,
    conversationId,
    isTyping,
  });
}

/**
 * Check if user is online
 */
export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

/**
 * Get online users list
 */
export function getOnlineUsers(): UserSocket[] {
  return Array.from(onlineUsers.values());
}

/**
 * Emit message to specific user
 */
export function emitToUser(
  io: SocketIOServer,
  userId: string,
  event: string,
  data: any
) {
  io.to(`user:${userId}`).emit(event, data);
}

export const chatService = {
  sendMessage,
  getConversationMessages,
  getUserConversations,
  markMessagesAsRead,
  markMessageAsDelivered,
  deleteMessage,
  searchMessages,
  getUnreadMessageCount,
  handleUserConnect,
  handleUserDisconnect,
  handleTyping,
  isUserOnline,
  getOnlineUsers,
  emitToUser,
  getConversationId,
  generateConversationId,
};
