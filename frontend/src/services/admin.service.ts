/**
 * Admin Service
 * Frontend API integration for admin dashboard and management
 */

import api from './api';

// Types
export interface DashboardMetrics {
  users: UserMetrics;
  subscriptions: SubscriptionMetrics;
  swaps: SwapMetrics;
  revenue: RevenueMetrics;
  platform: PlatformMetrics;
}

export interface UserMetrics {
  total: number;
  active: number;
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
  verified: number;
  suspended: number;
  banned: number;
  growthRate: number;
  retentionRate: number;
}

export interface SubscriptionMetrics {
  total: number;
  free: number;
  basic: number;
  pro: number;
  active: number;
  cancelled: number;
  mrr: number;
  arr: number;
  churnRate: number;
  conversionRate: number;
}

export interface SwapMetrics {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  completionRate: number;
  averageRating: number;
  totalHoursExchanged: number;
}

export interface RevenueMetrics {
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueByTier: {
    basic: number;
    pro: number;
  };
  averageRevenuePerUser: number;
  refunds: number;
}

export interface PlatformMetrics {
  activeSwaps: number;
  messagesSent: number;
  eventsCreated: number;
  reviewsGiven: number;
  skillsOffered: number;
  categoriesActive: number;
}

export interface QuickActions {
  pendingReports: number;
  suspendedUsers: number;
  failedPayments: number;
  cancelledSubscriptions: number;
  flaggedContent: number;
}

export interface UserSearchResult {
  users: User[];
  total: number;
  limit: number;
  offset: number;
}

export interface User {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  city?: string;
  state?: string;
  role: 'USER' | 'ADMIN' | 'MODERATOR';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BANNED';
  coins: number;
  level: number;
  rating: number;
  completedSwaps: number;
  totalHoursTaught: number;
  totalHoursLearned: number;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastActive?: string;
  createdAt: string;
  subscription?: {
    tier: string;
    status: string;
    currentPeriodEnd?: string;
  };
}

export interface Report {
  reportId: string;
  type: string;
  status: string;
  reason: string;
  description?: string;
  evidence?: string[];
  reporter: {
    userId: string;
    name: string;
    email: string;
    avatar?: string;
  };
  reportedUser?: {
    userId: string;
    name: string;
    email: string;
    avatar?: string;
    status: string;
  };
  createdAt: string;
}

export interface GrowthData {
  date: string;
  count: number;
}

export interface RevenueGrowthData {
  date: string;
  revenue: number;
}

/**
 * Get admin dashboard data
 */
export async function getDashboard() {
  const response = await api.get('/admin/dashboard');
  return response.data.data;
}

/**
 * Search users with filters
 */
export async function searchUsers(params: {
  query?: string;
  role?: string;
  status?: string;
  tier?: string;
  city?: string;
  state?: string;
  verifiedOnly?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<UserSearchResult> {
  const response = await api.get('/admin/users', { params });
  return response.data.data;
}

/**
 * Get user details
 */
export async function getUserDetails(userId: string) {
  const response = await api.get(`/admin/users/${userId}`);
  return response.data.data;
}

/**
 * Update user
 */
export async function updateUser(userId: string, updates: any) {
  const response = await api.put(`/admin/users/${userId}`, updates);
  return response.data.data;
}

/**
 * Delete user
 */
export async function deleteUser(userId: string, reason: string) {
  const response = await api.delete(`/admin/users/${userId}`, {
    data: { reason },
  });
  return response.data.data;
}

/**
 * Create staff user
 */
export async function createStaffUser(data: {
  email: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'MODERATOR';
}) {
  const response = await api.post('/admin/staff', data);
  return response.data.data;
}

/**
 * Get user growth data
 */
export async function getUserGrowth(days: number = 30): Promise<GrowthData[]> {
  const response = await api.get('/admin/analytics/user-growth', {
    params: { days },
  });
  return response.data.data;
}

/**
 * Get revenue growth data
 */
export async function getRevenueGrowth(months: number = 12): Promise<RevenueGrowthData[]> {
  const response = await api.get('/admin/analytics/revenue-growth', {
    params: { months },
  });
  return response.data.data;
}

/**
 * Get top users
 */
export async function getTopUsers(limit: number = 10) {
  const response = await api.get('/admin/analytics/top-users', {
    params: { limit },
  });
  return response.data.data;
}

/**
 * Get recent activities
 */
export async function getRecentActivities(limit: number = 20) {
  const response = await api.get('/admin/analytics/recent-activities', {
    params: { limit },
  });
  return response.data.data;
}

/**
 * Get all reports
 */
export async function getReports(params: {
  status?: string;
  type?: string;
  limit?: number;
  offset?: number;
}) {
  const response = await api.get('/moderation/reports', { params });
  return response.data.data;
}

/**
 * Get single report
 */
export async function getReport(reportId: string) {
  const response = await api.get(`/moderation/reports/${reportId}`);
  return response.data.data;
}

/**
 * Update report status
 */
export async function updateReportStatus(
  reportId: string,
  status: string,
  resolution?: string
) {
  const response = await api.put(`/moderation/reports/${reportId}/status`, {
    status,
    resolution,
  });
  return response.data.data;
}

/**
 * Execute moderator action
 */
export async function executeModeratorAction(data: {
  actionType: string;
  targetUserId?: string;
  targetContentId?: string;
  targetContentType?: string;
  reason: string;
  notes?: string;
  duration?: number;
  reportId?: string;
}) {
  const response = await api.post('/moderation/actions', data);
  return response.data.data;
}

/**
 * Get moderation statistics
 */
export async function getModerationStats() {
  const response = await api.get('/moderation/stats');
  return response.data.data;
}

// Utility functions

/**
 * Get role badge color
 */
export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    USER: 'bg-gray-100 text-gray-700',
    MODERATOR: 'bg-blue-100 text-blue-700',
    ADMIN: 'bg-purple-100 text-purple-700',
  };
  return colors[role] || 'bg-gray-100 text-gray-700';
}

/**
 * Get status badge color
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    INACTIVE: 'bg-gray-100 text-gray-700',
    SUSPENDED: 'bg-yellow-100 text-yellow-700',
    BANNED: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

/**
 * Format number with K/M suffix
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString()}`;
}
