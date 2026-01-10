'use client';

import { useState } from 'react';
import { COLORS } from '@/game/config';

interface AdminLoginProps {
  onLogin: (token: string) => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('adminToken', data.token);
        onLogin(data.token);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1a2e' }} role="main" aria-label="Admin login page">
      <div className="p-8 rounded-lg shadow-2xl" style={{ backgroundColor: COLORS.uiPaper, width: '320px' }}>
        <h1 className="text-2xl font-bold text-center mb-6" style={{ color: COLORS.uiBlue, fontFamily: 'Comic Sans MS, cursive' }}>
          Learing&trade; Admin
        </h1>

        <form onSubmit={handleLogin} className="space-y-4" aria-label="Admin login form">
          <div>
            <label htmlFor="admin-username" className="block text-sm font-bold mb-1" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#333' }}>
              Username
            </label>
            <input
              id="admin-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              className="w-full p-2 border-2 rounded disabled:opacity-50"
              style={{ borderColor: COLORS.uiBlue }}
              aria-required="true"
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-sm font-bold mb-1" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#333' }}>
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full p-2 border-2 rounded disabled:opacity-50"
              style={{ borderColor: COLORS.uiBlue }}
              aria-required="true"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-center" style={{ color: COLORS.uiRed, fontFamily: 'Comic Sans MS, cursive' }} role="alert" aria-live="polite">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 text-white font-bold rounded hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
            style={{ backgroundColor: COLORS.uiBlue, fontFamily: 'Comic Sans MS, cursive' }}
            aria-label={isLoading ? 'Logging in, please wait' : 'Log in to admin panel'}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
