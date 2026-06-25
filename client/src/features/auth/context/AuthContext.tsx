import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { setAccessToken, registerUnauthorizedHandler } from '../../../services/api';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Auth state from LocalStorage on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('user_profile');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error('Failed to parse user profile from localStorage:', e);
      localStorage.removeItem('user_profile');
    } finally {
      setIsLoading(false);
    }

    // Register callback for 401 errors received from API Client
    registerUnauthorizedHandler(() => {
      logout();
    });
  }, []);

  /**
   * Log the user in by saving user details to state/localStorage
   * and storing the JWT token in memory via Axios config.
   */
  const login = (token: string, userDetails: User) => {
    setUser(userDetails);
    localStorage.setItem('user_profile', JSON.stringify(userDetails));
    
    // Store JWT access token in memory only (mitigates XSS)
    setAccessToken(token);
  };

  /**
   * Log the user out by clearing user state/localStorage
   * and resetting in-memory JWT access token.
   */
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user_profile');
    setAccessToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
