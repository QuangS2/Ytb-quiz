import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import type { User } from './AuthContext';
import { getAccessToken } from '../../../services/api';

// Helper component that consumes AuthContext inside the provider
const AuthTestConsumer: React.FC = () => {
  const { user, isAuthenticated, login, logout } = useAuth();

  const triggerLogin = () => {
    const mockUser: User = {
      id: 'usr_test_123',
      email: 'tester@youtube-quiz.com',
      displayName: 'Super Tester',
      avatarUrl: 'https://images.com/avatar.png',
    };
    login('secret-jwt-token-value', mockUser);
  };

  return (
    <div>
      <span data-testid="auth-state">{isAuthenticated ? 'authenticated' : 'guest'}</span>
      <span data-testid="user-name">{user ? user.displayName : 'anonymous'}</span>
      <span data-testid="user-email">{user ? user.email : ''}</span>
      <button data-testid="btn-login" onClick={triggerLogin}>Log In</button>
      <button data-testid="btn-logout" onClick={logout}>Log Out</button>
    </div>
  );
};

// Component designed to be rendered outside AuthProvider to trigger boundary check
const ErrorTestConsumer: React.FC = () => {
  useAuth();
  return null;
};

describe('AuthContext and AuthProvider Lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should mount as guest when localStorage session is empty', () => {
    render(
      <AuthProvider>
        <AuthTestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-state').textContent).toBe('guest');
    expect(screen.getByTestId('user-name').textContent).toBe('anonymous');
  });

  it('should recover user session if user_profile exists in localStorage', () => {
    const savedUser: User = {
      id: 'usr_saved',
      email: 'saved@example.com',
      displayName: 'Saved User',
      avatarUrl: '',
    };
    localStorage.setItem('user_profile', JSON.stringify(savedUser));

    render(
      <AuthProvider>
        <AuthTestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-state').textContent).toBe('authenticated');
    expect(screen.getByTestId('user-name').textContent).toBe('Saved User');
    expect(screen.getByTestId('user-email').textContent).toBe('saved@example.com');
  });

  it('should successfully log in a user and set their in-memory token', async () => {
    render(
      <AuthProvider>
        <AuthTestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-state').textContent).toBe('guest');

    await act(async () => {
      screen.getByTestId('btn-login').click();
    });

    expect(screen.getByTestId('auth-state').textContent).toBe('authenticated');
    expect(screen.getByTestId('user-name').textContent).toBe('Super Tester');
    
    // LocalStorage must have saved data
    const savedProfile = localStorage.getItem('user_profile');
    expect(savedProfile).not.toBeNull();
    expect(JSON.parse(savedProfile!).displayName).toBe('Super Tester');

    // In-memory token in Axios client must match
    expect(getAccessToken()).toBe('secret-jwt-token-value');
  });

  it('should clean up user state, localStorage, and token on logout', async () => {
    const mockUser: User = {
      id: 'usr_active',
      email: 'active@example.com',
      displayName: 'Active User',
      avatarUrl: '',
    };
    localStorage.setItem('user_profile', JSON.stringify(mockUser));

    render(
      <AuthProvider>
        <AuthTestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-state').textContent).toBe('authenticated');

    await act(async () => {
      screen.getByTestId('btn-logout').click();
    });

    expect(screen.getByTestId('auth-state').textContent).toBe('guest');
    expect(localStorage.getItem('user_profile')).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('should throw an explicit error when useAuth is consumed outside AuthProvider', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error');
    consoleErrorSpy.mockImplementation(() => {}); // Suppress react testing warnings

    expect(() => render(<ErrorTestConsumer />)).toThrow(
      'useAuth must be used within an AuthProvider'
    );

    consoleErrorSpy.mockRestore();
  });
});
