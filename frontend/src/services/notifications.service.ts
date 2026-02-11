import api from './api';


export type NotificationType =
  | 'SWAP_REQUEST'
  | 'SWAP_ACCEPTED'
  | 'SWAP_REJECTED'
  | 'SWAP_COMPLETED'
  | 'BADGE_EARNED'
  | 'MESSAGE'
  | 'EVENT_REMINDER'
  | 'SYSTEM';


export interface Notification {
  notificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}


export const notificationsService = {
  // Get user notifications
  async getNotifications(params?: { limit?: number; offset?: number }) {
    const response = await api.get('/notifications', { params });
    return response.data;
  },


  // Get unread count
  async getUnreadCount() {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },


  // Mark notification as read
  async markAsRead(notificationId: string) {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },


  // Mark all as read
  async markAllAsRead() {
    const response = await api.put('/notifications/mark-all-read');
    return response.data;
  },


  // Delete a notification
  async deleteNotification(notificationId: string) {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },
};


export default notificationsService;
