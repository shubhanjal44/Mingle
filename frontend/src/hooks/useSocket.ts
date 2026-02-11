/**
 * useSocket Hook
 * Manages Socket.IO connection and real-time events for chat
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { Message } from '../services/chat.service';

interface TypingEvent {
  userId: string;
  conversationId: string;
  isTyping: boolean;
}

interface MessageEvent {
  message: Message;
}

interface OnlineStatusEvent {
  userId: string;
  lastSeen?: Date;
}

interface MessagesReadEvent {
  conversationId: string;
  readBy: string;
  readAt: Date;
  count: number;
}

export function useSocket() {
  const { user } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // Initialize socket connection
  useEffect(() => {
    if (!user) return;

    // Create socket connection
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: {
        token: localStorage.getItem('accessToken'),
      },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);

      // Identify user to server
      socket.emit('auth:identify', { userId: user.userId });
    });

    socket.on('auth:identified', (data: { userId: string }) => {
      console.log('User identified:', data.userId);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // Online status events
    socket.on('user:online', (data: OnlineStatusEvent) => {
      setOnlineUsers((prev) => new Set(prev).add(data.userId));
    });

    socket.on('user:offline', (data: OnlineStatusEvent) => {
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        updated.delete(data.userId);
        return updated;
      });
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Join a conversation
  const joinConversation = useCallback((otherUserId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('conversation:join', { otherUserId });
    }
  }, []);

  // Leave a conversation
  const leaveConversation = useCallback((otherUserId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('conversation:leave', { otherUserId });
    }
  }, []);

  // Start typing
  const startTyping = useCallback((receiverId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('typing:start', { receiverId });
    }
  }, []);

  // Stop typing
  const stopTyping = useCallback((receiverId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('typing:stop', { receiverId });
    }
  }, []);

  // Mark message as delivered
  const markDelivered = useCallback((messageId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('message:delivered', { messageId });
    }
  }, []);

  // Subscribe to new messages
  const onNewMessage = useCallback((callback: (event: MessageEvent) => void) => {
    if (!socketRef.current) return () => {};

    socketRef.current.on('message:new', callback);

    return () => {
      socketRef.current?.off('message:new', callback);
    };
  }, []);

  // Subscribe to message sent confirmation
  const onMessageSent = useCallback((callback: (event: MessageEvent & { tempId?: string }) => void) => {
    if (!socketRef.current) return () => {};

    socketRef.current.on('message:sent', callback);

    return () => {
      socketRef.current?.off('message:sent', callback);
    };
  }, []);

  // Subscribe to typing events
  const onTyping = useCallback((callback: (event: TypingEvent) => void) => {
    if (!socketRef.current) return () => {};

    socketRef.current.on('user:typing', callback);

    return () => {
      socketRef.current?.off('user:typing', callback);
    };
  }, []);

  // Subscribe to messages read events
  const onMessagesRead = useCallback((callback: (event: MessagesReadEvent) => void) => {
    if (!socketRef.current) return () => {};

    socketRef.current.on('messages:read', callback);

    return () => {
      socketRef.current?.off('messages:read', callback);
    };
  }, []);

  // Subscribe to message deleted events
  const onMessageDeleted = useCallback((callback: (event: { messageId: string }) => void) => {
    if (!socketRef.current) return () => {};

    socketRef.current.on('message:deleted', callback);

    return () => {
      socketRef.current?.off('message:deleted', callback);
    };
  }, []);

  // Check if user is online
  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  return {
    socket: socketRef.current,
    isConnected,
    onlineUsers: Array.from(onlineUsers),
    isUserOnline,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    markDelivered,
    onNewMessage,
    onMessageSent,
    onTyping,
    onMessagesRead,
    onMessageDeleted,
  };
}

export default useSocket;
