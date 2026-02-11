/**
 * Notification Preferences Page
 * Allows users to manage their notification settings
 */

import { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  Smartphone,
  Calendar,
  Settings,
  Check,
  X,
  RotateCcw,
  MessageSquare,
  Award,
  RefreshCw,
  Users,
  AlertCircle,
} from 'lucide-react';
import notificationPreferencesService, {
  NotificationPreferences,
  NotificationStats,
  UpdatePreferencesData,
} from '../services/notification-preferences.service';
import toast from 'react-hot-toast';

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setIsLoading(true);
      const data = await notificationPreferencesService.getPreferences();
      setPreferences(data.preferences);
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = async (updates: UpdatePreferencesData) => {
    try {
      setSaving(true);
      const updated = await notificationPreferencesService.updatePreferences(updates);
      setPreferences(updated);
      toast.success('Preferences updated successfully');
      // Reload stats
      await loadPreferences();
    } catch (error) {
      console.error('Failed to update preferences:', error);
      toast.error('Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleEnableAll = async () => {
    try {
      setSaving(true);
      const updated = await notificationPreferencesService.enableAllNotifications();
      setPreferences(updated);
      toast.success('All notifications enabled');
      await loadPreferences();
    } catch (error) {
      console.error('Failed to enable all:', error);
      toast.error('Failed to enable all notifications');
    } finally {
      setSaving(false);
    }
  };

  const handleDisableAll = async () => {
    try {
      setSaving(true);
      const updated = await notificationPreferencesService.disableAllNotifications();
      setPreferences(updated);
      toast.success('All notifications disabled');
      await loadPreferences();
    } catch (error) {
      console.error('Failed to disable all:', error);
      toast.error('Failed to disable all notifications');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all preferences to defaults? This cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      const updated = await notificationPreferencesService.resetToDefaults();
      setPreferences(updated);
      toast.success('Preferences reset to defaults');
      await loadPreferences();
    } catch (error) {
      console.error('Failed to reset:', error);
      toast.error('Failed to reset preferences');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading preferences...</p>
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load preferences</p>
          <button
            onClick={loadPreferences}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const notificationTypes = [
    {
      type: 'SwapRequest',
      label: 'Swap Requests',
      description: 'When someone wants to swap skills with you',
      icon: <Users className="w-5 h-5" />,
      emailKey: 'emailSwapRequest' as keyof NotificationPreferences,
      inAppKey: 'inAppSwapRequest' as keyof NotificationPreferences,
    },
    {
      type: 'SwapAccepted',
      label: 'Swap Accepted',
      description: 'When your swap request is accepted',
      icon: <Check className="w-5 h-5" />,
      emailKey: 'emailSwapAccepted' as keyof NotificationPreferences,
      inAppKey: 'inAppSwapAccepted' as keyof NotificationPreferences,
    },
    {
      type: 'SwapRejected',
      label: 'Swap Declined',
      description: 'When your swap request is declined',
      icon: <X className="w-5 h-5" />,
      emailKey: 'emailSwapRejected' as keyof NotificationPreferences,
      inAppKey: 'inAppSwapRejected' as keyof NotificationPreferences,
    },
    {
      type: 'SwapCompleted',
      label: 'Swap Completed',
      description: 'When a swap is marked as completed',
      icon: <Check className="w-5 h-5" />,
      emailKey: 'emailSwapCompleted' as keyof NotificationPreferences,
      inAppKey: 'inAppSwapCompleted' as keyof NotificationPreferences,
    },
    {
      type: 'Message',
      label: 'New Messages',
      description: 'When you receive a new message',
      icon: <MessageSquare className="w-5 h-5" />,
      emailKey: 'emailMessage' as keyof NotificationPreferences,
      inAppKey: 'inAppMessage' as keyof NotificationPreferences,
    },
    {
      type: 'BadgeEarned',
      label: 'Badges Earned',
      description: 'When you earn a new badge',
      icon: <Award className="w-5 h-5" />,
      emailKey: 'emailBadgeEarned' as keyof NotificationPreferences,
      inAppKey: 'inAppBadgeEarned' as keyof NotificationPreferences,
    },
    {
      type: 'EventReminder',
      label: 'Event Reminders',
      description: 'Reminders for upcoming events',
      icon: <Calendar className="w-5 h-5" />,
      emailKey: 'emailEventReminder' as keyof NotificationPreferences,
      inAppKey: 'inAppEventReminder' as keyof NotificationPreferences,
    },
    {
      type: 'System',
      label: 'System Announcements',
      description: 'Important platform updates and announcements',
      icon: <Bell className="w-5 h-5" />,
      emailKey: 'emailSystem' as keyof NotificationPreferences,
      inAppKey: 'inAppSystem' as keyof NotificationPreferences,
    },
  ];

  const ToggleSwitch = ({
    enabled,
    onChange,
    disabled,
  }: {
    enabled: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
  }) => (
    <button
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-blue-600' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg backdrop-blur-sm">
              <Settings className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Notification Preferences</h1>
              <p className="text-blue-100 mt-1">
                Manage how you receive notifications
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Card */}
        {stats && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              Current Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-medium text-gray-700">Email</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.emailEnabled ? stats.emailTypesEnabled : 0}/8
                </p>
                <p className="text-xs text-gray-600">
                  {stats.emailEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="w-4 h-4 text-purple-600" />
                  <p className="text-sm font-medium text-gray-700">In-App</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.inAppEnabled ? stats.inAppTypesEnabled : 0}/8
                </p>
                <p className="text-xs text-gray-600">
                  {stats.inAppEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-gray-700">Digest</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.digestEnabled
                    ? notificationPreferencesService.getDigestFrequencyLabel(
                        stats.digestFrequency
                      )
                    : 'Off'}
                </p>
                <p className="text-xs text-gray-600">
                  {stats.lastDigestSent
                    ? `Last sent ${new Date(stats.lastDigestSent).toLocaleDateString()}`
                    : 'Never sent'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleEnableAll}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              Enable All
            </button>
            <button
              onClick={handleDisableAll}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
              Disable All
            </button>
            <button
              onClick={handleReset}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* Global Toggles */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Global Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-600">
                    Receive notifications via email
                  </p>
                </div>
              </div>
              <ToggleSwitch
                enabled={preferences.emailEnabled}
                onChange={(value) => updatePreference({ emailEnabled: value })}
                disabled={isSaving}
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="w-6 h-6 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">In-App Notifications</p>
                  <p className="text-sm text-gray-600">
                    Receive notifications while using the app
                  </p>
                </div>
              </div>
              <ToggleSwitch
                enabled={preferences.inAppEnabled}
                onChange={(value) => updatePreference({ inAppEnabled: value })}
                disabled={isSaving}
              />
            </div>
          </div>
        </div>

        {/* Notification Types */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Notification Types</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Type
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                    <Mail className="w-4 h-4 mx-auto" />
                    <span className="sr-only">Email</span>
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                    <Smartphone className="w-4 h-4 mx-auto" />
                    <span className="sr-only">In-App</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {notificationTypes.map((type) => (
                  <tr key={type.type} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                          {type.icon}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{type.label}</p>
                          <p className="text-sm text-gray-600">{type.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <ToggleSwitch
                        enabled={preferences[type.emailKey] as boolean}
                        onChange={(value) =>
                          updatePreference({ [type.emailKey]: value })
                        }
                        disabled={isSaving || !preferences.emailEnabled}
                      />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <ToggleSwitch
                        enabled={preferences[type.inAppKey] as boolean}
                        onChange={(value) =>
                          updatePreference({ [type.inAppKey]: value })
                        }
                        disabled={isSaving || !preferences.inAppEnabled}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Email Digest */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            Email Digest
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Receive a summary of your activity instead of individual emails
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Enable Digest</p>
                <p className="text-sm text-gray-600">
                  Get periodic summaries of your activity
                </p>
              </div>
              <ToggleSwitch
                enabled={preferences.digestEnabled}
                onChange={(value) => updatePreference({ digestEnabled: value })}
                disabled={isSaving}
              />
            </div>

            {preferences.digestEnabled && (
              <>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency
                  </label>
                  <select
                    value={preferences.digestFrequency}
                    onChange={(e) =>
                      updatePreference({
                        digestFrequency: e.target.value as any,
                      })
                    }
                    disabled={isSaving}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>

                {preferences.digestFrequency === 'WEEKLY' && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Day of Week
                    </label>
                    <select
                      value={preferences.digestDay || 1}
                      onChange={(e) =>
                        updatePreference({
                          digestDay: parseInt(e.target.value),
                        })
                      }
                      disabled={isSaving}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="0">Sunday</option>
                      <option value="1">Monday</option>
                      <option value="2">Tuesday</option>
                      <option value="3">Wednesday</option>
                      <option value="4">Thursday</option>
                      <option value="5">Friday</option>
                      <option value="6">Saturday</option>
                    </select>
                  </div>
                )}

                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time of Day
                  </label>
                  <select
                    value={preferences.digestHour}
                    onChange={(e) =>
                      updatePreference({
                        digestHour: parseInt(e.target.value),
                      })
                    }
                    disabled={isSaving}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {notificationPreferencesService.formatHour(i)}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
