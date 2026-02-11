import api from './api';

export interface MatchFilters {
  skillId?: string;
  city?: string;
  state?: string;
  minRating?: number;
  remoteOnly?: boolean;
  limit?: number;
}

export interface Match {
  userId: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  rating: number;
  completedSwaps: number;
  matchScore: number;
  matchedSkills: Array<{
    skillId: string;
    skillName: string;
    yourType: 'TEACHING' | 'LEARNING';
    theirType: 'TEACHING' | 'LEARNING';
    proficiencyLevel: string;
  }>;
}

export interface Recommendation {
  userId: string;
  name: string;
  avatar: string | null;
  city: string | null;
  state: string | null;
  rating: number;
  proficiencyLevel: string;
  yearsOfExperience: number | null;
  completedSwaps: number;
}

export const matchingService = {
  // Find potential matches
  async findMatches(filters: MatchFilters = {}) {
    const response = await api.get('/matches', { params: filters });
    return response.data;
  },

  // Get recommendations for a specific skill
  async getRecommendations(skillId: string, limit: number = 10) {
    const response = await api.get(`/matches/recommendations/${skillId}`, {
      params: { limit },
    });
    return response.data;
  },

  // Get match statistics
  async getMatchStats() {
    const response = await api.get('/matches/stats');
    return response.data;
  },

  // Get compatible skills
  async getCompatibleSkills() {
    const response = await api.get('/matches/compatible-skills');
    return response.data;
  },
};

export default matchingService;
