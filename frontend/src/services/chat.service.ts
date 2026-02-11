/**
 * Chat Service
 * Handles all chat-related API calls
 */

import api from './api';

export interface Message {
  messageId: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  isDelivered: boolean;
  deliveredAt?: string;
  isRead: boolean;
  readAt?: string;
  replyToId?: string;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  sender?: {
    userId: string;
    name: string;
    avatar?: string;
  };
  replyTo?: {
    messageId: string;
    content: string;
    senderId: string;
  };
}

export interface Conversation {
  conversationId: string;
  otherUser?: {
    userId: string;
    name: string;
    avatar?: string;
    lastActive?: string;
  };
  latestMessage?: Message;
  unreadCount: number;
  isOnline: boolean;
}

export interface SendMessageData {
  receiverId: string;
  content: string;
  messageType?: 'TEXT' | 'IMAGE' | 'FILE';
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyToId?: string;
  tempId?: string; // For optimistic updates
}

/**
 * Send a message
 */
export const sendMessage = async (data: SendMessageData) => {
  const response = await api.post('/chat/messages', data);
  return response.data;
};

/**
 * Get user's conversations list
 */
export const getConversations = async (): Promise<{
  conversations: Conversation[];
  totalUnread: number;
}> => {
  const response = await api.get('/chat/conversations');
  return response.data;
};

/**
 * Get conversation messages with a specific user
 */
export const getConversationMessages = async (
  userId: string,
  params?: {
    limit?: number;
    offset?: number;
  }
): Promise<{
  messages: Message[];
  conversationId: string;
}> => {
  const response = await api.get(`/chat/conversations/${userId}`, { params });
  return response.data;
};

/**
 * Mark all messages in conversation as read
 */
export const markConversationAsRead = async (userId: string) => {
  const response = await api.put(`/chat/conversations/${userId}/read`);
  return response.data;
};

/**
 * Delete a message (soft delete)
 */
export const deleteMessage = async (messageId: string) => {
  const response = await api.delete(`/chat/messages/${messageId}`);
  return response.data;
};

/**
 * Search messages in a conversation
 */
export const searchMessages = async (
  otherUserId: string,
  query: string,
  limit?: number
) => {
  const response = await api.get('/chat/search', {
    params: { otherUserId, query, limit },
  });
  return response.data;
};

/**
 * Get total unread message count
 */
export const getUnreadCount = async (): Promise<{ unreadCount: number }> => {
  const response = await api.get('/chat/unread-count');
  return response.data;
};

/**
 * Get list of online users
 */
export const getOnlineUsers = async () => {
  const response = await api.get('/chat/online-users');
  return response.data;
};

/**
 * Mark message as delivered
 */
export const markMessageDelivered = async (messageId: string) => {
  const response = await api.post(`/chat/messages/${messageId}/delivered`);
  return response.data;
};

// Export all functions as a service object
const chatService = {
  sendMessage,
  getConversations,
  getConversationMessages,
  markConversationAsRead,
  deleteMessage,
  searchMessages,
  getUnreadCount,
  getOnlineUsers,
  markMessageDelivered,
};

export default chatService;
