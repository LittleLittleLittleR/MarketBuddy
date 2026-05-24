export type AuthMode = 'login' | 'signup';

export interface AuthResponse {
  success: boolean;
  token?: string;
  message?: string;
}