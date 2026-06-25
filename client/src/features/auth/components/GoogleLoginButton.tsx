import React from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../../../services/api';

export const GoogleLoginButton: React.FC = () => {
  const { login } = useAuth();

  const handleLoginClick = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      console.warn('VITE_GOOGLE_CLIENT_ID is missing. Requesting Developer Session from Backend.');
      try {
        const redirectUri = `${window.location.origin}/auth/callback`;
        const response = await api.post('/api/auth/google', {
          code: 'dev-bypass-code',
          redirectUri
        });
        const { token, user } = response.data.data;
        login(token, user);
      } catch (err) {
        console.error('Failed to get developer session from backend:', err);
      }
      return;
    }

    // Google OAuth 2.0 Redirect Flow
    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = 'email profile openid';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    
    window.location.href = authUrl;
  };

  return (
    <button 
      onClick={handleLoginClick}
      className="btn-glow"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        width: '100%',
        padding: '10px 16px',
        borderRadius: 'var(--border-radius-sm)',
        fontSize: '13px',
        fontWeight: 600,
        height: '38px',
        cursor: 'pointer'
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      <span>Đăng nhập Google</span>
    </button>
  );
};
