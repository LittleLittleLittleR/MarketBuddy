import React, { useState } from 'react';
import type { AuthMode, AuthResponse } from '../../types/Auth/types';
import { login, signup } from '../../hooks/api'

const Auth: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');

  //particulars
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>(''); // only for signup
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'signup' : 'login'));
    setError(null);
    setEmail('');
    setPassword('');
    setName('');
  };

  // 3. Consolidated submit handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Determine payload and endpoint based on current mode
    const endpoint = mode === 'login' ? login : signup;
    const payload = mode === 'login' 
      ? { email, password } 
      : { name, email, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data: AuthResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Failed to ${mode}`);
      }

      console.log(`${mode} successful!`, data);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{mode === 'login' ? 'Login to Your Account' : 'Create an Account'}</h2>
        
        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={mode === 'signup'}
              placeholder="Full Name"
            />
          )}

          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Email Address"
          />

          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />

          <button type="submit" disabled={isLoading} className="submit-btn">
            {isLoading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <p className="toggle-text">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button type="button" onClick={toggleMode} className="toggle-btn">
            {mode === 'login' ? 'Sign up here' : 'Log in here'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
