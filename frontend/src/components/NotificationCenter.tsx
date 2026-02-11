/**
 * Enhanced Notification Center Component
 * Displays notifications with filtering, grouping, and actions
 */

import { useState, useEffect } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Filter,
  Trash2,
  Settings,
  X,
  Users,
  MessageSquare,
  Award,
  Calendar,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import notificationService from '../services/notifications.service';

interface Notification {
  notificationId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({
  isOpen,
  onClose,
}: NotificationCenterProps) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await notificationService.getNotifications();
      if (response.success) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      // Don't show error toast on load failure - just show empty state
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);

      setNotifications((prev) =>
        prev.map((n) =>
          n.notificationId === notificationId
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();

      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);

      setNotifications((prev) =>
        prev.filter((n) => n.notificationId !== notificationId)
      );
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SWAP_REQUEST':
      case 'SWAP_ACCEPTED':
      case 'SWAP_REJECTED':
      case 'SWAP_COMPLETED':
        return <Users className="w-5 h-5" />;
      case 'MESSAGE':
        return <MessageSquare className="w-5 h-5" />;
      case 'BADGE_EARNED':
        return <Award className="w-5 h-5" />;
      case 'EVENT_REMINDER':
        return <Calendar className="w-5 h-5" />;
      case 'SYSTEM':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'SWAP_REQUEST':
        return 'text-blue-600 bg-blue-100';
      case 'SWAP_ACCEPTED':
        return 'text-green-600 bg-green-100';
      case 'SWAP_REJECTED':
        return 'text-red-600 bg-red-100';
      case 'SWAP_COMPLETED':
        return 'text-purple-600 bg-purple-100';
      case 'MESSAGE':
        return 'text-indigo-600 bg-indigo-100';
      case 'BADGE_EARNED':
        return 'text-yellow-600 bg-yellow-100';
      case 'EVENT_REMINDER':
        return 'text-orange-600 bg-orange-100';
      case 'SYSTEM':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter((n) => {
    if (showOnlyUnread && n.isRead) return false;
    if (filterType !== 'all' && n.type !== filterType) return false;
    return true;
  });

  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const today = new Date();
    const notifDate = new Date(notification.createdAt);
    const diffDays = Math.floor((today.getTime() - notifDate.getTime()) / 86400000);

    let group = 'Older';
    if (diffDays === 0) group = 'Today';
    else if (diffDays === 1) group = 'Yesterday';
    else if (diffDays < 7) group = 'This Week';

    if (!groups[group]) groups[group] = [];
    groups[group].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Notification Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6" />
              <h2 className="text-xl font-bold">Notifications</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm">
            <span>
              {unreadCount > 0
                ? `${unreadCount} unread`
                : 'No unread notifications'}
            </span>
            <button
              onClick={() => navigate('/settings/notifications')}
              className="flex items-center gap-1 hover:underline"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowOnlyUnread(!showOnlyUnread)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                showOnlyUnread
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-600'
              }`}
            >
              Unread Only
            </button>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1 text-xs rounded-full border border-gray-300 bg-white text-gray-700 hover:border-blue-600"
            >
              <option value="all">All Types</option>
              <option value="SWAP_REQUEST">Swap Requests</option>
              <option value="SWAP_ACCEPTED">Accepted</option>
              <option value="MESSAGE">Messages</option>
              <option value="BADGE_EARNED">Badges</option>
              <option value="EVENT_REMINDER">Events</option>
              <option value="SYSTEM">System</option>
            </select>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-white border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark All as Read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Bell className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-600 font-medium mb-2">
                No notifications
              </p>
              <p className="text-sm text-gray-500">
                {showOnlyUnread
                  ? "You're all caught up!"
                  : 'New notifications will appear here'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {Object.entries(groupedNotifications).map(([group, notifs]) => (
                <div key={group}>
                  <div className="px-4 py-2 bg-gray-100 sticky top-0">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      {group}
                    </p>
                  </div>
                  {notifs.map((notification) => (
                    <div
                      key={notification.notificationId}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        !notification.isRead ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div
                          className={`flex-shrink-0 p-2 rounded-lg ${getNotificationColor(
                            notification.type
                          )}`}
                        >
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-semibold text-gray-900 text-sm">
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {formatTime(notification.createdAt)}
                            </span>
                            <div className="flex items-center gap-2">
                              {!notification.isRead && (
                                <button
                                  onClick={() => markAsRead(notification.notificationId)}
                                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  Mark read
                                </button>
                              )}
                              <button
                                onClick={() => deleteNotification(notification.notificationId)}
                                className="text-xs text-red-600 hover:underline flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
