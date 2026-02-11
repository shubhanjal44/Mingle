import api from './api';

export interface Notification {
  notificationId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data: any;
  createdAt: string;
}

export const notificationService = {
  // Get all notifications
  async getNotifications() {
    const response = await api.get('/notifications');
    return response.data;
  },

  // Get unread count
  async getUnreadCount(): Promise<number> {
    try {
      const response = await api.get('/notifications/unread/count');
      return response.data.data?.count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  },

  // Mark notification as read
  async markAsRead(notificationId: string) {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  // Mark all as read
  async markAllAsRead() {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },

  // Delete notification
  async deleteNotification(notificationId: string) {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },
};

export default notificationService;
