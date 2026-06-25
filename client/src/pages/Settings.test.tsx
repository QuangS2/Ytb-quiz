import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Settings } from './Settings';
import api from '../services/api';

// Mock the api module
vi.mock('../services/api', () => {
  return {
    default: {
      post: vi.fn(),
    },
  };
});

describe('Settings Page Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should render the API key input and load stored key from localStorage', () => {
    localStorage.setItem('gemini_api_key', 'stored-api-key-123');
    
    render(<Settings />);

    const input = screen.getByPlaceholderText(/Nhập AI Key của bạn/i) as HTMLInputElement;
    expect(input.value).toBe('stored-api-key-123');
  });

  it('should test and save API Key successfully on valid key check', async () => {
    // Mock the success response from validate-key endpoint
    const mockPost = vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Khóa API Gemini hoạt động tốt.'
      }
    });

    render(<Settings />);

    const input = screen.getByPlaceholderText(/Nhập AI Key của bạn/i);
    fireEvent.change(input, { target: { value: 'new-valid-key-999' } });

    const btnValidate = screen.getByText('Kiểm tra & Lưu');
    
    await act(async () => {
      fireEvent.click(btnValidate);
    });

    // API should be called with correct header configuration
    expect(mockPost).toHaveBeenCalledWith('/api/config/validate-key', {}, {
      headers: {
        'x-gemini-key': 'new-valid-key-999'
      }
    });

    // Verification message should print success
    expect(screen.getByText('Khóa API Gemini hoạt động tốt.')).toBeInTheDocument();
    
    // Key must be saved in localStorage
    expect(localStorage.getItem('gemini_api_key')).toBe('new-valid-key-999');
  });

  it('should show error message when key validation fails', async () => {
    // Mock validation error
    const mockPost = vi.mocked(api.post).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          success: false,
          message: 'Khóa API không hợp lệ hoặc đã hết hạn.'
        }
      }
    });

    render(<Settings />);

    const input = screen.getByPlaceholderText(/Nhập AI Key của bạn/i);
    fireEvent.change(input, { target: { value: 'invalid-key' } });

    const btnValidate = screen.getByText('Kiểm tra & Lưu');
    
    await act(async () => {
      fireEvent.click(btnValidate);
    });

    expect(mockPost).toHaveBeenCalled();
    expect(screen.getByText('Khóa API không hợp lệ hoặc đã hết hạn.')).toBeInTheDocument();
    
    // Key should not be saved automatically on validation failure
    expect(localStorage.getItem('gemini_api_key')).toBeNull();
  });
});
