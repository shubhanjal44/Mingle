/**
 * ConversationList Component
 * Shows list of user's conversations with unread counts
 */

import { useState, useEffect } from 'react';
import { MessageCircle, Search, Circle } from 'lucide-react';
import chatService, { Conversation } from '../services/chat.service';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';

interface ConversationListProps {
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversationId?: string;
}

export default function ConversationList({
  onSelectConversation,
  selectedConversationId,
}: ConversationListProps) {
  const { isUserOnline, onNewMessage } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Subscribe to new messages to update conversation list
  useEffect(() => {
    const unsubscribe = onNewMessage((event) => {
      // Reload conversations when new message arrives
      loadConversations();
    });

    return unsubscribe;
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const data = await chatService.getConversations();
      setConversations(data.conversations);
      setTotalUnread(data.totalUnread);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  const formatLastMessageTime = (dateString?: string) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const truncateMessage = (text: string, maxLength: number = 40) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            Messages
          </h2>
          {totalUnread > 0 && (
            <span className="bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
            <MessageCircle className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">
              {searchQuery ? 'No conversations found' : 'No messages yet'}
            </p>
            <p className="text-sm mt-1">
              {searchQuery
                ? 'Try a different search'
                : 'Start chatting with someone!'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.conversationId}
                onClick={() => onSelectConversation(conversation)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedConversationId === conversation.conversationId
                    ? 'bg-blue-50 border-l-4 border-blue-600'
                    : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar with online status */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg">
                      {conversation.otherUser?.name.charAt(0).toUpperCase()}
                    </div>
                    {isUserOnline(conversation.otherUser?.userId || '') && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  {/* Conversation Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3
                        className={`font-semibold truncate ${
                          conversation.unreadCount > 0
                            ? 'text-gray-900'
                            : 'text-gray-700'
                        }`}
                      >
                        {conversation.otherUser?.name}
                      </h3>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {formatLastMessageTime(
                          conversation.latestMessage?.createdAt
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p
                        className={`text-sm truncate ${
                          conversation.unreadCount > 0
                            ? 'text-gray-900 font-medium'
                            : 'text-gray-600'
                        }`}
                      >
                        {conversation.latestMessage
                          ? truncateMessage(conversation.latestMessage.content)
                          : 'No messages yet'}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
                          {conversation.unreadCount > 9
                            ? '9+'
                            : conversation.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Online status text */}
                    {isUserOnline(conversation.otherUser?.userId || '') && (
                      <div className="flex items-center gap-1 mt-1">
                        <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                        <span className="text-xs text-green-600">Online</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
