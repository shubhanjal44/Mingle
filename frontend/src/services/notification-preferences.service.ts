/**
 * Notification Preferences Service
 * Frontend API integration for notification preferences
 */

import api from './api';

export interface NotificationPreferences {
  preferenceId: string;
  userId: string;

  // Email Notifications
  emailEnabled: boolean;
  emailSwapRequest: boolean;
  emailSwapAccepted: boolean;
  emailSwapRejected: boolean;
  emailSwapCompleted: boolean;
  emailMessage: boolean;
  emailBadgeEarned: boolean;
  emailEventReminder: boolean;
  emailSystem: boolean;

  // In-App Notifications
  inAppEnabled: boolean;
  inAppSwapRequest: boolean;
  inAppSwapAccepted: boolean;
  inAppSwapRejected: boolean;
  inAppSwapCompleted: boolean;
  inAppMessage: boolean;
  inAppBadgeEarned: boolean;
  inAppEventReminder: boolean;
  inAppSystem: boolean;

  // Email Digest
  digestEnabled: boolean;
  digestFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  digestDay: number | null;
  digestHour: number;
  lastDigestSent: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface NotificationStats {
  emailEnabled: boolean;
  emailTypesEnabled: number;
  inAppEnabled: boolean;
  inAppTypesEnabled: number;
  digestEnabled: boolean;
  digestFrequency: string;
  lastDigestSent: string | null;
}

export interface UpdatePreferencesData {
  // Email Notifications
  emailEnabled?: boolean;
  emailSwapRequest?: boolean;
  emailSwapAccepted?: boolean;
  emailSwapRejected?: boolean;
  emailSwapCompleted?: boolean;
  emailMessage?: boolean;
  emailBadgeEarned?: boolean;
  emailEventReminder?: boolean;
  emailSystem?: boolean;

  // In-App Notifications
  inAppEnabled?: boolean;
  inAppSwapRequest?: boolean;
  inAppSwapAccepted?: boolean;
  inAppSwapRejected?: boolean;
  inAppSwapCompleted?: boolean;
  inAppMessage?: boolean;
  inAppBadgeEarned?: boolean;
  inAppEventReminder?: boolean;
  inAppSystem?: boolean;

  // Email Digest
  digestEnabled?: boolean;
  digestFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  digestDay?: number;
  digestHour?: number;
}

/**
 * Get user's notification preferences
 */
export async function getPreferences(): Promise<{
  preferences: NotificationPreferences;
  stats: NotificationStats;
}> {
  const response = await api.get('/notifications/preferences');
  return response.data.data;
}

/**
 * Update notification preferences
 */
export async function updatePreferences(
  data: UpdatePreferencesData
): Promise<NotificationPreferences> {
  const response = await api.put('/notifications/preferences', data);
  return response.data.data;
}

/**
 * Enable all notifications
 */
export async function enableAllNotifications(): Promise<NotificationPreferences> {
  const response = await api.post('/notifications/preferences/enable-all');
  return response.data.data;
}

/**
 * Disable all notifications
 */
export async function disableAllNotifications(): Promise<NotificationPreferences> {
  const response = await api.post('/notifications/preferences/disable-all');
  return response.data.data;
}

/**
 * Reset preferences to defaults
 */
export async function resetToDefaults(): Promise<NotificationPreferences> {
  const response = await api.post('/notifications/preferences/reset');
  return response.data.data;
}

/**
 * Get notification statistics
 */
export async function getNotificationStats(): Promise<NotificationStats> {
  const response = await api.get('/notifications/preferences/stats');
  return response.data.data;
}

/**
 * Get day of week name
 */
export function getDayName(day: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day] || 'Unknown';
}

/**
 * Get digest frequency label
 */
export function getDigestFrequencyLabel(frequency: string): string {
  const labels: Record<string, string> = {
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
    MONTHLY: 'Monthly',
  };
  return labels[frequency] || frequency;
}

/**
 * Format hour for display (12-hour format)
 */
export function formatHour(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

const notificationPreferencesService = {
  getPreferences,
  updatePreferences,
  enableAllNotifications,
  disableAllNotifications,
  resetToDefaults,
  getNotificationStats,
  getDayName,
  getDigestFrequencyLabel,
  formatHour,
};

export default notificationPreferencesService;
