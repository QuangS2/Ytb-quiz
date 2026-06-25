import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import '@testing-library/jest-dom';

const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    }
  };
};

if (typeof window !== 'undefined') {
  const localStorageMock = createStorageMock();
  const sessionStorageMock = createStorageMock();

  // Safeguard window definitions
  try {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true,
      writable: true,
    });
  } catch (e) {}

  try {
    Object.defineProperty(window, 'sessionStorage', {
      value: sessionStorageMock,
      configurable: true,
      writable: true,
    });
  } catch (e) {}

  // Safeguard globalThis definitions (Node/browser context)
  try {
    delete (globalThis as any).localStorage;
    delete (globalThis as any).sessionStorage;
  } catch (e) {}

  try {
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
      writable: true,
    });
  } catch (e) {}

  try {
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: sessionStorageMock,
      configurable: true,
      writable: true,
    });
  } catch (e) {}
}

afterEach(() => {
  cleanup();
});
