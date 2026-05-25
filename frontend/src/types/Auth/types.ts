export type AuthMode = 'login' | 'signup';

export interface AuthResponse {
  success: boolean;
  token?: string;
  accessToken?: string;
  message?: string;
}