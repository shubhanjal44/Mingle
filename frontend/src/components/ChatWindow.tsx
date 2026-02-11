/**
 * ChatWindow Component
 * Real-time chat interface with typing indicators and read receipts
 */

import { useState, useEffect, useRef } from 'react';
import { Send, Image, Paperclip, MoreVertical, Check, CheckCheck } from 'lucide-react';
import chatService, { Message } from '../services/chat.service';
import { useSocket } from '../hooks/useSocket';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

interface ChatWindowProps {
  otherUser: {
    userId: string;
    name: string;
    avatar?: string;
  };
  onClose?: () => void;
}

export default function ChatWindow({ otherUser, onClose }: ChatWindowProps) {
  const { user } = useAuthStore();
  const {
    isConnected,
    isUserOnline,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    onNewMessage,
    onTyping,
    onMessagesRead,
    markDelivered,
  } = useSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Load conversation messages
  useEffect(() => {
    loadMessages();
    joinConversation(otherUser.userId);

    return () => {
      leaveConversation(otherUser.userId);
    };
  }, [otherUser.userId]);

  // Subscribe to real-time events
  useEffect(() => {
    const unsubscribeNew = onNewMessage((event) => {
      if (
        event.message.senderId === otherUser.userId ||
        event.message.receiverId === otherUser.userId
      ) {
        setMessages((prev) => [...prev, event.message]);
        markDelivered(event.message.messageId);
        scrollToBottom();
      }
    });

    const unsubscribeTyping = onTyping((event) => {
      if (event.userId === otherUser.userId) {
        setIsTyping(event.isTyping);
        if (event.isTyping) {
          scrollToBottom();
        }
      }
    });

    const unsubscribeRead = onMessagesRead((event) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.senderId === user?.userId && !msg.isRead
            ? { ...msg, isRead: true, readAt: event.readAt.toString() }
            : msg
        )
      );
    });

    return () => {
      unsubscribeNew();
      unsubscribeTyping();
      unsubscribeRead();
    };
  }, [otherUser.userId, user?.userId]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark messages as read when opened
  useEffect(() => {
    if (messages.length > 0 && user) {
      chatService.markConversationAsRead(otherUser.userId).catch(console.error);
    }
  }, [otherUser.userId, messages.length]);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const data = await chatService.getConversationMessages(otherUser.userId);
      setMessages(data.messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);

    // Typing indicator
    startTyping(otherUser.userId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(otherUser.userId);
    }, 1000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputText.trim() || isSending) return;

    const messageContent = inputText.trim();
    setInputText('');
    stopTyping(otherUser.userId);

    try {
      setIsSending(true);

      await chatService.sendMessage({
        receiverId: otherUser.userId,
        content: messageContent,
        messageType: 'TEXT',
      });
    } catch (error: any) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
      setInputText(messageContent); // Restore message
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const isSender = message.senderId === user?.userId;
    const showDate =
      index === 0 ||
      formatDate(messages[index - 1].createdAt) !== formatDate(message.createdAt);

    return (
      <div key={message.messageId}>
        {showDate && (
          <div className="flex justify-center my-4">
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {formatDate(message.createdAt)}
            </span>
          </div>
        )}
        <div className={`flex mb-4 ${isSender ? 'justify-end' : 'justify-start'}`}>
          {!isSender && (
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold mr-2 flex-shrink-0">
              {otherUser.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div
            className={`max-w-[70%] rounded-lg px-4 py-2 ${
              isSender
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            <div
              className={`flex items-center gap-1 mt-1 text-xs ${
                isSender ? 'text-blue-100' : 'text-gray-500'
              }`}
            >
              <span>{formatTime(message.createdAt)}</span>
              {isSender && (
                <>
                  {message.isRead ? (
                    <CheckCheck className="w-3 h-3" />
                  ) : message.isDelivered ? (
                    <CheckCheck className="w-3 h-3 opacity-60" />
                  ) : (
                    <Check className="w-3 h-3 opacity-60" />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
              {otherUser.name.charAt(0).toUpperCase()}
            </div>
            {isConnected && isUserOnline(otherUser.userId) && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{otherUser.name}</h3>
            <p className="text-xs text-gray-500">
              {isConnected && isUserOnline(otherUser.userId) ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p>No messages yet</p>
            <p className="text-sm mt-1">Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => renderMessage(message, index))}
            {isTyping && (
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                  {otherUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t bg-gray-50">
        <div className="flex items-end gap-2">
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Attach image"
          >
            <Image className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <textarea
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder="Type a message..."
            className="flex-1 resize-none px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-h-32"
            rows={1}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
