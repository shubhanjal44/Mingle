import api from './api';
import { User } from '../stores/authStore';

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone: string;
  city?: string;
  state?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;  // Backend returns "accessToken"
    refreshToken: string;
  };
}

export interface VerifyEmailData {
  email: string;
  otp: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
}

export const authService = {
  // Register new user
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  // Verify email with OTP
  async verifyEmail(data: VerifyEmailData): Promise<AuthResponse> {
    const response = await api.post('/auth/verify-email', data);
    return response.data;
  },

  // Resend OTP
  async resendOtp(email: string) {
    const response = await api.post('/auth/resend-otp', { email });
    return response.data;
  },

  // Login user
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  // Get current user profile
  async me(): Promise<{ success: boolean; data: User }> {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Logout
  async logout() {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  // Refresh token
  async refreshToken(refreshToken: string): Promise<{ success: boolean; data: { accessToken: string } }> {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  // Forgot password
  async forgotPassword(data: ForgotPasswordData) {
    const response = await api.post('/auth/forgot-password', data);
    return response.data;
  },

  // Reset password
  async resetPassword(data: ResetPasswordData) {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  },
};

export default authService;
