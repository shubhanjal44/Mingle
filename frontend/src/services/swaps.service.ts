import api from './api';

export type SwapStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

export interface Swap {
  swapId: string;
  initiatorId: string;
  receiverId: string;
  initiatorSkillId: string;
  receiverSkillId: string;
  status: SwapStatus;
  completedAt: string | null;
  duration: number | null;
  createdAt: string;
  updatedAt: string;
  initiator: {
    userId: string;
    name: string;
    avatar: string | null;
  };
  receiver: {
    userId: string;
    name: string;
    avatar: string | null;
  };
  initiatorSkill: {
    skillId: string;
    name: string;
  };
  receiverSkill: {
    skillId: string;
    name: string;
  };
}

export interface SwapSession {
  sessionId: string;
  swapId: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateSwapData {
  receiverId: string;
  initiatorSkillId: string;
  receiverSkillId: string;
}

export interface CreateSessionData {
  startTime: string;
  endTime?: string;
  notes?: string;
}

export interface UpdateSessionData {
  endTime?: string;
  notes?: string;
}

export const swapsService = {
  // Create swap request
  async createSwap(data: CreateSwapData) {
    const response = await api.post('/swaps', data);
    return response.data;
  },

  // Get all swaps
  async getSwaps(params?: {
    status?: SwapStatus;
    role?: 'INITIATOR' | 'RECEIVER';
    limit?: number;
    offset?: number;
  }) {
    const response = await api.get('/swaps', { params });
    return response.data;
  },

  // Get swap by ID
  async getSwapById(swapId: string) {
    const response = await api.get(`/swaps/${swapId}`);
    return response.data;
  },

  // Accept swap request
  async acceptSwap(swapId: string) {
    const response = await api.put(`/swaps/${swapId}/accept`);
    return response.data;
  },

  // Reject swap request
  async rejectSwap(swapId: string) {
    const response = await api.put(`/swaps/${swapId}/reject`);
    return response.data;
  },

  // Cancel swap
  async cancelSwap(swapId: string) {
    const response = await api.put(`/swaps/${swapId}/cancel`);
    return response.data;
  },

  // Complete swap
  async completeSwap(swapId: string, data: { rating: number; review?: string }) {
    const response = await api.put(`/swaps/${swapId}/complete`, data);
    return response.data;
  },

  // Create session
  async createSession(swapId: string, data: CreateSessionData) {
    const response = await api.post(`/swaps/${swapId}/sessions`, data);
    return response.data;
  },

  // Get sessions
  async getSessions(swapId: string) {
    const response = await api.get(`/swaps/${swapId}/sessions`);
    return response.data;
  },

  // Update session
  async updateSession(swapId: string, sessionId: string, data: UpdateSessionData) {
    const response = await api.put(`/swaps/${swapId}/sessions/${sessionId}`, data);
    return response.data;
  },

  // Get swap statistics
  async getSwapStats() {
    const response = await api.get('/swaps/stats');
    return response.data;
  },
};

export default swapsService;
