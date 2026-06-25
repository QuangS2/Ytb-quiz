import axios from 'axios';

// In-memory token storage to mitigate XSS risks
let accessToken: string | null = null;

/**
 * Update the in-memory access token.
 * This token is not persisted in localStorage to prevent XSS exfiltration.
 */
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

/**
 * Retrieve the current in-memory access token.
 */
export const getAccessToken = () => {
  return accessToken;
};

// Base URL configuration (Default is http://localhost:5000 as per backend-info.md)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Dynamically attach JWT token, Gemini API Key, and performance headers
api.interceptors.request.use(
  (config) => {
    // 1. Attach JWT Access Token if authenticated
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // 2. Attach Gemini API Key from localStorage if present
    const geminiKey = localStorage.getItem('gemini_api_key');
    if (geminiKey) {
      config.headers['x-gemini-key'] = geminiKey;
    }

    // 3. Attach adaptive performance setting ('high' or 'low')
    const devicePerformance = localStorage.getItem('device_performance') || 'low';
    config.headers['x-device-performance'] = devicePerformance;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Registered callback to notify the application of session expiration (unauthorized state)
let onUnauthorizedCallback: (() => void) | null = null;

/**
 * Register a handler to be executed when a 401 Unauthorized response is received.
 * This is useful for clearing AuthContext state and redirecting to the login screen.
 */
export const registerUnauthorizedHandler = (callback: () => void) => {
  onUnauthorizedCallback = callback;
};

// Response Interceptor: Capture global error states (specifically 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token in memory
      setAccessToken(null);
      
      // Execute registered callback (logout logic in AuthContext)
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }
    
    // Pass the formatted backend error structure down to the caller
    return Promise.reject(error);
  }
);

export default api;
