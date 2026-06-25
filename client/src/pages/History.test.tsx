import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { History } from './History';
import api from '../services/api';

// Mock react-router-dom useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock API Client
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock Recharts ResponsiveContainer to pass mock dimensions to its children
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original as any,
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="responsive-container" style={{ width: 500, height: 300 }}>
        {React.isValidElement(children)
          ? React.cloneElement(children, { width: 500, height: 300 } as any)
          : children}
      </div>
    ),
  };
});

describe('History Page Component', () => {
  const mockHistoryData = {
    attempts: [
      {
        id: 'att_1',
        quizId: 'quiz_1',
        quizTitle: 'React Hooks Deep Dive',
        mode: 'full-test',
        score: 4,
        totalQuestions: 5,
        timeTaken: 120,
        attemptedAt: '2026-06-23T08:00:00.000Z',
      },
      {
        id: 'att_2',
        quizId: 'quiz_2',
        quizTitle: 'CSS Grid & Flexbox Tutorial',
        mode: 'instant-feedback',
        score: 2,
        totalQuestions: 4,
        timeTaken: 45,
        attemptedAt: '2026-06-23T08:30:00.000Z',
      },
    ],
    stats: {
      totalAttempts: 2,
      totalQuizzes: 2,
      averageCorrectRate: 65,
      totalTimeTaken: 165,
    },
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should render loading spinner initially', () => {
    // Return pending promise
    const promise = new Promise(() => {});
    vi.mocked(api.get).mockImplementationOnce(() => promise);

    render(<History />);
    expect(screen.getByText('Đang tải lịch sử học tập...')).toBeInTheDocument();
  });

  it('should render error view if API call fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce({
      response: {
        status: 500,
        data: { message: 'Lỗi kết nối máy chủ.' },
      },
    });

    render(<History />);

    await act(async () => {});

    expect(screen.getByText('Tải lịch sử thất bại')).toBeInTheDocument();
    expect(screen.getByText('Lỗi kết nối máy chủ.')).toBeInTheDocument();

    const btnRetry = screen.getByRole('button', { name: /Thử lại/i });
    expect(btnRetry).toBeInTheDocument();

    // Mock successful retry
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: mockHistoryData,
      },
    });

    await act(async () => {
      fireEvent.click(btnRetry);
    });

    expect(screen.getByText('Lịch Sử Làm Bài')).toBeInTheDocument();
    expect(screen.getByText('React Hooks Deep Dive')).toBeInTheDocument();
  });

  it('should render empty view when user has no attempts', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          attempts: [],
          stats: {
            totalAttempts: 0,
            totalQuizzes: 0,
            averageCorrectRate: 0,
            totalTimeTaken: 0,
          },
        },
      },
    });

    render(<History />);

    await act(async () => {});

    expect(screen.getByText('Chưa có lịch sử làm bài')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Tìm kiếm bài quiz đã thi...')).not.toBeInTheDocument();
  });

  it('should render stats and attempts table when api succeeds', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: mockHistoryData,
      },
    });

    render(<History />);

    await act(async () => {});

    // Check stats cards values
    const statCounts = screen.getAllByText('2');
    expect(statCounts.length).toBe(2); // totalAttempts and totalQuizzes are both 2
    expect(screen.getByText('65%')).toBeInTheDocument(); // averageCorrectRate
    expect(screen.getByText('2 phút 45 giây')).toBeInTheDocument(); // totalTimeTaken (165 seconds = 2m 45s)

    // Check table content
    expect(screen.getByText('React Hooks Deep Dive')).toBeInTheDocument();
    expect(screen.getByText('CSS Grid & Flexbox Tutorial')).toBeInTheDocument();
    expect(screen.getByText('4/5 (80%)')).toBeInTheDocument();
    expect(screen.getByText('2/4 (50%)')).toBeInTheDocument();
  });

  it('should render progress ComposedChart with correct legend labels', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: mockHistoryData,
      },
    });

    render(<History />);

    await act(async () => {});

    // Verify chart container header exists
    expect(screen.getByText('Tiến trình Học tập & Hiệu suất')).toBeInTheDocument();

    // Verify responsive container mock is used
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();

    // Verify Legend text (Recharts renders the customized legend formatter texts)
    expect(screen.getByText('Tỉ lệ đúng (%)')).toBeInTheDocument();
    expect(screen.getByText('Thời gian (giây)')).toBeInTheDocument();
  });

  it('should filter attempts list locally based on search input keywords', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: mockHistoryData,
      },
    });

    render(<History />);

    await act(async () => {});

    const searchInput = screen.getByPlaceholderText('Tìm kiếm bài quiz đã thi...');
    expect(searchInput).toBeInTheDocument();

    // Type keyword matching "Hooks"
    fireEvent.change(searchInput, { target: { value: 'hooks' } });

    expect(screen.getByText('React Hooks Deep Dive')).toBeInTheDocument();
    expect(screen.queryByText('CSS Grid & Flexbox Tutorial')).not.toBeInTheDocument();

    // Type keyword with no matches
    fireEvent.change(searchInput, { target: { value: 'vuejs' } });
    expect(screen.getByText('Không tìm thấy kết quả')).toBeInTheDocument();
    expect(screen.getByText('Không có bài quiz nào khớp với từ khóa "vuejs".')).toBeInTheDocument();

    // Clear filter button
    const clearBtn = screen.getByText('Xóa bộ lọc');
    fireEvent.click(clearBtn);
    expect(screen.getByText('React Hooks Deep Dive')).toBeInTheDocument();
    expect(screen.getByText('CSS Grid & Flexbox Tutorial')).toBeInTheDocument();
  });

  it('should clear draft values and navigate on retake button clicks', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: mockHistoryData,
      },
    });

    // Populate mock draft keys in localStorage
    localStorage.setItem('ytb_quiz_draft_quiz_1_full-test_answers', '{"q_1": 1}');
    localStorage.setItem('ytb_quiz_draft_quiz_1_full-test_index', '2');

    render(<History />);

    await act(async () => {});

    const retakeButtons = screen.getAllByRole('button', { name: /Làm lại/i });
    expect(retakeButtons.length).toBe(2);

    // Retake the first quiz (React Hooks Deep Dive, quizId: 'quiz_1')
    fireEvent.click(retakeButtons[0]);

    // Check localStorage items cleared
    expect(localStorage.getItem('ytb_quiz_draft_quiz_1_full-test_answers')).toBeNull();
    expect(localStorage.getItem('ytb_quiz_draft_quiz_1_full-test_index')).toBeNull();

    // Check routing redirect
    expect(mockNavigate).toHaveBeenCalledWith('/quiz/quiz_1');
  });
});
