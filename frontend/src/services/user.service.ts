import api from './api';

export interface UpdateProfileData {
  name?: string;
  phone?: string;
  bio?: string;
  city?: string;
  state?: string;
}

export interface UserStats {
  completedSwaps: number;
  totalHoursLearned: number;
  totalHoursTaught: number;
  rating: number;
  level: number;
  experiencePoints: number;
  skillCoins: number;
}

export const userService = {
  // Get user profile
  async getProfile() {
    const response = await api.get('/users/profile');
    return response.data;
  },

  // Update user profile
  async updateProfile(data: UpdateProfileData) {
    const response = await api.put('/users/profile', data);
    return response.data;
  },

  // Get public user profile
  async getPublicProfile(userId: string) {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  // Get user statistics
  async getStats(userId: string): Promise<{ success: boolean; data: UserStats }> {
    const response = await api.get(`/users/${userId}/stats`);
    return response.data;
  },

  // Search users
  async searchUsers(params: {
    query?: string;
    city?: string;
    state?: string;
    minRating?: number;
    limit?: number;
    offset?: number;
  }) {
    const response = await api.get('/users/search', { params });
    return response.data;
  },

  // Get user reviews
  async getReviews(userId: string, params?: { limit?: number; offset?: number }) {
    const response = await api.get(`/users/${userId}/reviews`, { params });
    return response.data;
  },

  // Get user badges
  async getBadges(userId: string) {
    const response = await api.get(`/users/${userId}/badges`);
    return response.data;
  },
};

export default userService;
