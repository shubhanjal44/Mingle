import api from './api';


export interface SkillCategory {
  categoryId: string;
  name: string;
  description: string;
  _count?: {
    skills: number;
  };
}


export interface Skill {
  skillId: string;
  name: string;
  description: string;
  categoryId: string;
  icon?: string;
  category?: SkillCategory;
  userSkillsCount?: number;
  createdAt?: string;
}


export interface UserSkill {
  userSkillId: string;
  userId: string;
  skillId: string;
  skillType: 'TEACH' | 'LEARN'; // Match backend enum
  proficiencyLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  yearsOfExperience: number;
  description: string | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  skill: Skill;
}


export interface AddUserSkillData {
  skillId: string;
  skillType: 'TEACH' | 'LEARN'; // Match backend
  proficiencyLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  yearsOfExperience?: number;
  description?: string;
  isVerified?: boolean;
}


export interface UpdateUserSkillData {
  proficiencyLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  yearsOfExperience?: number;
  description?: string;
}


export interface GetSkillsParams {
  category?: string; // categoryId
  search?: string;
  limit?: number;
  offset?: number;
}


export interface SkillsResponse {
  success: boolean;
  data: {
    skills: Skill[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
}


export interface UserSkillsResponse {
  success: boolean;
  data: {
    teaching: UserSkill[];
    learning: UserSkill[];
    stats: {
      totalTeaching: number;
      totalLearning: number;
    };
  };
}


export interface CategoriesResponse {
  success: boolean;
  data: {
    categories: SkillCategory[];
  };
}


export const skillsService = {
  /**
   * Get all skill categories
   */
  async getAllCategories(): Promise<CategoriesResponse> {
    const response = await api.get('/skills/categories');
    return response.data;
  },


  /**
   * Get all skills with optional filters
   */
  async getAllSkills(params?: GetSkillsParams): Promise<SkillsResponse> {
    const response = await api.get('/skills', { params });
    return response.data;
  },


  /**
   * Get current user's skills (both teaching and learning)
   */
  async getUserSkills(): Promise<UserSkillsResponse> {
    const response = await api.get('/skills/user');
    return response.data;
  },


  /**
   * Get another user's public skills
   */
  async getUserSkillsById(userId: string): Promise<UserSkillsResponse & { data: { user: { userId: string; name: string } } }> {
    const response = await api.get(`/skills/user/${userId}`);
    return response.data;
  },


  /**
   * Add a skill to user profile (teaching or learning)
   */
  async addUserSkill(data: AddUserSkillData) {
    const response = await api.post('/skills/user', data);
    return response.data;
  },


  /**
   * Update user's skill details
   */
  async updateUserSkill(userSkillId: string, data: UpdateUserSkillData) {
    const response = await api.put(`/skills/user/${userSkillId}`, data);
    return response.data;
  },


  /**
   * Remove a skill from user profile
   */
  async removeUserSkill(userSkillId: string) {
    const response = await api.delete(`/skills/user/${userSkillId}`);
    return response.data;
  },


  /**
   * Helper: Get only teaching skills
   */
  async getTeachingSkills(): Promise<UserSkill[]> {
    const response = await this.getUserSkills();
    return response.data.teaching;
  },


  /**
   * Helper: Get only learning skills
   */
  async getLearningSkills(): Promise<UserSkill[]> {
    const response = await this.getUserSkills();
    return response.data.learning;
  },


  /**
   * Helper: Search skills by name
   */
  async searchSkills(searchTerm: string, limit = 20): Promise<Skill[]> {
    const response = await this.getAllSkills({ search: searchTerm, limit });
    return response.data.skills;
  },


  /**
   * Helper: Get skills by category
   */
  async getSkillsByCategory(categoryId: string): Promise<Skill[]> {
    const response = await this.getAllSkills({ category: categoryId });
    return response.data.skills;
  },
};


export default skillsService;
