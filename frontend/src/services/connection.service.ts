/**
 * Connection Service
 * Frontend API integration for connection management
 */

import api from './api';

// Types
export interface UserConnection {
  connectionId: string;
  connectedAt: string;
  user: ConnectionUser;
}

export interface ConnectionUser {
  userId: string;
  name: string;
  avatar?: string;
  bio?: string;
  city?: string;
  state?: string;
  rating: number;
  level?: number;
  completedSwaps: number;
  _count?: {
    skills: number;
  };
  isConnected?: boolean;
}

export interface ConnectionStats {
  following: number;
  followers: number;
  mutual: number;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isMutual: boolean;
}

/**
 * Follow a user
 */
export async function connectToUser(userId: string): Promise<UserConnection> {
  const response = await api.post(`/connections/${userId}`);
  return response.data.data;
}

/**
 * Unfollow a user
 */
export async function disconnectFromUser(userId: string): Promise<void> {
  await api.delete(`/connections/${userId}`);
}

/**
 * Get user's connections (following)
 */
export async function getUserConnections(userId?: string): Promise<UserConnection[]> {
  const url = userId ? `/connections/following/${userId}` : '/connections/following';
  const response = await api.get(url);
  return response.data.data;
}

/**
 * Get user's followers
 */
export async function getUserFollowers(userId?: string): Promise<UserConnection[]> {
  const url = userId ? `/connections/followers/${userId}` : '/connections/followers';
  const response = await api.get(url);
  return response.data.data;
}

/**
 * Check connection status with a user
 */
export async function checkConnectionStatus(userId: string): Promise<ConnectionStatus> {
  const response = await api.get(`/connections/check/${userId}`);
  return response.data.data;
}

/**
 * Get mutual connections with a user
 */
export async function getMutualConnections(userId: string): Promise<ConnectionUser[]> {
  const response = await api.get(`/connections/mutual/${userId}`);
  return response.data.data;
}

/**
 * Get connection statistics
 */
export async function getConnectionStats(userId?: string): Promise<ConnectionStats> {
  const url = userId ? `/connections/stats/${userId}` : '/connections/stats';
  const response = await api.get(url);
  return response.data.data;
}

/**
 * Get suggested connections
 */
export async function getSuggestedConnections(limit: number = 10): Promise<ConnectionUser[]> {
  const response = await api.get(`/connections/suggestions?limit=${limit}`);
  return response.data.data;
}

/**
 * Search for users to connect with
 */
export async function searchUsers(
  query: string,
  filters?: {
    city?: string;
    state?: string;
    skillId?: string;
    limit?: number;
  }
): Promise<ConnectionUser[]> {
  const params = new URLSearchParams();
  params.append('q', query);

  if (filters) {
    if (filters.city) params.append('city', filters.city);
    if (filters.state) params.append('state', filters.state);
    if (filters.skillId) params.append('skillId', filters.skillId);
    if (filters.limit) params.append('limit', String(filters.limit));
  }

  const response = await api.get(`/connections/search?${params.toString()}`);
  return response.data.data;
}

// Utility functions

/**
 * Format connection date
 */
export function formatConnectionDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Connected today';
  if (diffDays === 1) return 'Connected yesterday';
  if (diffDays < 7) return `Connected ${diffDays} days ago`;
  if (diffDays < 30) return `Connected ${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `Connected ${Math.floor(diffDays / 30)} months ago`;
  return `Connected ${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Get user location string
 */
export function getUserLocation(user: ConnectionUser): string {
  if (user.city && user.state) {
    return `${user.city}, ${user.state}`;
  }
  if (user.city) return user.city;
  if (user.state) return user.state;
  return 'Location not specified';
}

/**
 * Get user rating stars
 */
export function getRatingStars(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  let stars = '⭐'.repeat(fullStars);
  if (hasHalfStar) stars += '½';
  return stars || 'No rating';
}
