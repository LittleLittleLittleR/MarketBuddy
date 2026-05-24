import type { AuthResponse } from '../types/Auth/types';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';


// AUTH
interface LoginPayload {
  email: string;
  password: string;
}
const login = async (payload: LoginPayload): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};
export { login };

interface SignupPayload {
  name: string;
  email: string;
  password: string;
}
const signup = async (payload: SignupPayload): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
};
export { signup };