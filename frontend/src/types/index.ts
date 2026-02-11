// User types
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  city?: string;
  state?: string;
  role: 'USER' | 'ADMIN' | 'MODERATOR';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BANNED';
  coins: number;
  createdAt: string;
  updatedAt: string;
}

// Skill types
export interface Skill {
  id: string;
  name: string;
  slug: string;
  description?: string;
  categoryId: string;
  category?: SkillCategory;
}

export interface SkillCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface UserSkill {
  id: string;
  userId: string;
  skillId: string;
  skill?: Skill;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  canTeach: boolean;
  wantsToLearn: boolean;
  description?: string;
}

// Swap types
export interface Swap {
  id: string;
  initiatorId: string;
  receiverId: string;
  initiator?: User;
  receiver?: User;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  message?: string;
  duration?: number;
  scheduledAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
