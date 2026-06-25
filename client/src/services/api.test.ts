import { describe, it, expect, vi, beforeEach } from 'vitest';
import api, { setAccessToken, getAccessToken, registerUnauthorizedHandler } from './api';

describe('Axios Client API Service', () => {
  beforeEach(() => {
    // Clear storage and reset memory token before each test
    setAccessToken(null);
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should update and retrieve the access token in memory', () => {
    expect(getAccessToken()).toBeNull();
    setAccessToken('mock-jwt-token-xyz');
    expect(getAccessToken()).toBe('mock-jwt-token-xyz');
  });

  it('should append JWT Authorization and custom headers in requests', () => {
    setAccessToken('token-123');
    localStorage.setItem('gemini_api_key', 'gemini-key-456');
    localStorage.setItem('device_performance', 'high');

    // Retrieve request interceptor dynamically from Axios instance
    // @ts-ignore
    const requestInterceptor = api.interceptors.request.handlers[0].fulfilled;
    const mockConfig = { headers: {} } as any;
    
    const resolvedConfig = requestInterceptor(mockConfig) as any;

    expect(resolvedConfig.headers.Authorization).toBe('Bearer token-123');
    expect(resolvedConfig.headers['x-gemini-key']).toBe('gemini-key-456');
    expect(resolvedConfig.headers['x-device-performance']).toBe('high');
  });

  it('should fallback device performance header to low if missing', () => {
    // @ts-ignore
    const requestInterceptor = api.interceptors.request.handlers[0].fulfilled;
    const mockConfig = { headers: {} } as any;
    
    const resolvedConfig = requestInterceptor(mockConfig) as any;
    expect(resolvedConfig.headers['x-device-performance']).toBe('low');
  });

  it('should clear token and invoke registered handler on 401 status code', async () => {
    setAccessToken('stale-token');
    const onUnauthorized = vi.fn();
    registerUnauthorizedHandler(onUnauthorized);

    // Retrieve response interceptor error handler dynamically
    // @ts-ignore
    const errorInterceptor = api.interceptors.response.handlers[0].rejected as any;

    const mockError = {
      response: {
        status: 401,
      },
    };

    try {
      await errorInterceptor(mockError);
    } catch (err) {
      // Expect the interceptor to propagate the error rejection
      expect(err).toBe(mockError);
    }

    // In-memory token must be wiped out and handler must be executed
    expect(getAccessToken()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
