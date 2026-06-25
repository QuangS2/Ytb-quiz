import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import api from '../services/api';

// Mock useNavigate from react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => {
  return {
    useNavigate: () => mockNavigate,
  };
});

// Mock the API service
vi.mock('../services/api', () => {
  return {
    default: {
      post: vi.fn(),
    },
  };
});

describe('Dashboard Page Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should display a warning banner if Gemini API key is missing', () => {
    localStorage.clear();
    render(<Dashboard />);
    
    expect(screen.getByText(/Thiếu cấu hình Gemini API Key/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tạo Quiz/i })).toBeDisabled();
  });

  it('should enable generator button and not show warning banner if API key is present', () => {
    localStorage.setItem('gemini_api_key', 'some-valid-key');
    
    render(<Dashboard />);
    
    expect(screen.queryByText(/Thiếu cấu hình Gemini API Key/i)).not.toBeInTheDocument();
  });

  it('should perform live validation on input URL changes', () => {
    localStorage.setItem('gemini_api_key', 'some-key');
    render(<Dashboard />);
    
    const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...');
    
    // Test with invalid URL
    fireEvent.change(input, { target: { value: 'invalid-url-here' } });
    expect(screen.getByText('Liên kết video YouTube không hợp lệ hoặc sai định dạng.')).toBeInTheDocument();
    expect(screen.getByText('Tạo Quiz').closest('button')).toBeDisabled();

    // Test with valid URL
    fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } });
    expect(screen.queryByText('Liên kết video YouTube không hợp lệ hoặc sai định dạng.')).not.toBeInTheDocument();
    expect(screen.getByText('Tạo Quiz').closest('button')).not.toBeDisabled();
  });

  it('should call generate endpoint and navigate to Quiz screen on success', async () => {
    localStorage.setItem('gemini_api_key', 'valid-key');
    
    let resolvePromise: (value: any) => void = () => {};
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    // Mock the success response of generate quiz endpoint with a deferred promise
    const mockPost = vi.mocked(api.post).mockImplementationOnce(() => promise);

    vi.useFakeTimers();

    render(<Dashboard />);

    const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...');
    fireEvent.change(input, { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } });

    const submitBtn = screen.getByText('Tạo Quiz').closest('button')!;
    
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Check API payload
    expect(mockPost).toHaveBeenCalledWith('/api/quizzes/generate', {
      url: 'https://youtu.be/dQw4w9WgXcQ',
    });

    // Loading status should change
    expect(screen.getByText('Đang kết nối máy chủ YouTube...')).toBeInTheDocument();

    // Resolve the promise to trigger transition to success status
    await act(async () => {
      resolvePromise({
        data: {
          success: true,
          data: {
            id: 'quiz_abc123',
            title: 'Never Gonna Give You Up',
          },
        },
      });
    });

    // Fast-forward timers for navigate redirect delay (1000ms)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/quiz/quiz_abc123');

    vi.useRealTimers();
  });

  it('should show error banner when quiz generation API fails', async () => {
    localStorage.setItem('gemini_api_key', 'valid-key');
    
    // Mock generation rejection
    vi.mocked(api.post).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          success: false,
          message: 'Không thể kết xuất transcript từ video này.',
        },
      },
    });

    render(<Dashboard />);

    const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...');
    fireEvent.change(input, { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } });

    const submitBtn = screen.getByText('Tạo Quiz').closest('button')!;
    
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(screen.getByText('Không thể kết xuất transcript từ video này.')).toBeInTheDocument();
  });
});
