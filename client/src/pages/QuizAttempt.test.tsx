import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QuizAttempt } from './QuizAttempt';
import api from '../services/api';

// Mock react-router-dom useParams and useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'quiz_xyz_555' }),
  useNavigate: () => mockNavigate,
}));

// Mock Auth Context
vi.mock('../features/auth/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr_abc123', email: 'student@example.com' },
    isAuthenticated: true,
  }),
}));

// Mock API Client
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('QuizAttempt Page Component', () => {
  const mockQuizData = {
    id: 'quiz_xyz_555',
    title: 'CSS Glassmorphism Tutorial',
    description: 'Learn premium design principles.',
    youtubeId: 'dQw4w9WgXcQ',
    questions: [
      {
        id: 'q_1',
        text: 'What does CSS stand for?',
        options: ['Cascading Style Sheets', 'Creative Style System', 'Computer Style Sheet'],
        correctOptionIndex: 0,
        explanation: 'CSS is Cascading Style Sheets.',
      },
      {
        id: 'q_2',
        text: 'What HTML tag is used to embed video?',
        options: ['<media>', '<video>', '<iframe>'],
        correctOptionIndex: 1,
        explanation: 'Use the html5 <video> tag.',
      },
    ],
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should display a loading spinner initially and fetch quiz details', async () => {
    // Return pending promise
    const promise = new Promise(() => {});
    vi.mocked(api.get).mockImplementationOnce(() => promise);

    render(<QuizAttempt />);
    expect(screen.getByText('Đang tải nội dung câu hỏi...')).toBeInTheDocument();
  });

  it('should render error screen if fetching quiz data fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce({
      response: {
        status: 404,
        data: { message: 'Bài trắc nghiệm không tồn tại.' },
      },
    });

    render(<QuizAttempt />);

    // Resolve state transitions
    await act(async () => {});

    expect(screen.getByText('Tải bài trắc nghiệm thất bại')).toBeInTheDocument();
    expect(screen.getByText('Bài trắc nghiệm không tồn tại.')).toBeInTheDocument();

    const backBtn = screen.getByText('Quay lại Bảng điều khiển');
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should render mode selector initially if no drafts exist', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: mockQuizData },
    });

    render(<QuizAttempt />);

    await act(async () => {});

    expect(screen.getByText('CSS Glassmorphism Tutorial')).toBeInTheDocument();
    expect(screen.getByText('Chế độ Luyện tập')).toBeInTheDocument();
    expect(screen.getByText('Chế độ Thi thử')).toBeInTheDocument();
    
    const startBtn = screen.getByText('Bắt đầu làm bài').closest('button')!;
    expect(startBtn).toBeDisabled();
  });

  it('should automatically bypass mode selector and restore quiz if a draft exists', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: mockQuizData },
    });

    // Seed draft selections
    localStorage.setItem(
      'ytb_quiz_draft_quiz_xyz_555_full-test_answers',
      JSON.stringify({ q_1: 0 })
    );

    render(<QuizAttempt />);

    await act(async () => {});

    // Should bypass selection and show the question page directly
    expect(screen.getByText('CSS Stand for?', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Thi thử')).toBeInTheDocument();
    expect(screen.queryByText('Bắt đầu làm bài')).not.toBeInTheDocument();
  });

  it('should toggle selection and start quiz attempt', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: mockQuizData },
    });

    render(<QuizAttempt />);
    await act(async () => {});

    const practiceCard = screen.getByText('Chế độ Luyện tập');
    fireEvent.click(practiceCard);

    const startBtn = screen.getByText('Bắt đầu làm bài').closest('button')!;
    expect(startBtn).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(startBtn);
    });

    // Toggles view and renders elements
    expect(screen.getByText('CSS Stand for?', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Luyện tập')).toBeInTheDocument();
    expect(screen.getByTitle('CSS Glassmorphism Tutorial')).toBeInTheDocument(); // Iframe title
  });

  it('should navigate between questions and update selector indicators', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: mockQuizData },
    });

    render(<QuizAttempt />);
    await act(async () => {});

    // Select mode and start
    fireEvent.click(screen.getByText('Chế độ Thi thử'));
    await act(async () => {
      fireEvent.click(screen.getByText('Bắt đầu làm bài'));
    });

    // Check Question 1
    expect(screen.getByText('CSS Stand for?', { exact: false })).toBeInTheDocument();
    
    const nextBtn = screen.getByText('Tiếp theo').closest('button')!;
    const prevBtn = screen.getByText('Quay lại').closest('button')!;

    expect(prevBtn).toBeDisabled();

    // Click Next
    fireEvent.click(nextBtn);
    expect(screen.getByText('What HTML tag is used to embed video?')).toBeInTheDocument();
    expect(prevBtn).not.toBeDisabled();
    expect(nextBtn).toBeDisabled();

    // Jump to Question 1 via Question Navigator circle
    // navigator button 1 is index 3 (Excluding header exit, prevBtn, nextBtn, circles...)
    // Let's use getByText('1') to click circle index 1
    fireEvent.click(screen.getByText('1'));
    expect(screen.getByText('CSS Stand for?', { exact: false })).toBeInTheDocument();
  });

  it('should display checks and explanations instantly on choice in instant-feedback mode', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: mockQuizData },
    });

    render(<QuizAttempt />);
    await act(async () => {});

    // Start practice mode
    fireEvent.click(screen.getByText('Chế độ Luyện tập'));
    await act(async () => {
      fireEvent.click(screen.getByText('Bắt đầu làm bài'));
    });

    // Explanation should not be shown yet
    expect(screen.queryByText('Giải thích chi tiết:')).not.toBeInTheDocument();

    // Click correct option "Cascading Style Sheets"
    const correctOpt = screen.getByText('Cascading Style Sheets');
    fireEvent.click(correctOpt);

    expect(screen.getByText('Chính xác')).toBeInTheDocument();
    expect(screen.getByText('Giải thích chi tiết:')).toBeInTheDocument();
    expect(screen.getByText('CSS is Cascading Style Sheets.')).toBeInTheDocument();

    // Attempting to click other option should be disabled
    const incorrectOpt = screen.getByText('Creative Style System');
    expect(incorrectOpt.closest('button')).toBeDisabled();
  });

  it('should allow quiz submission and display summary card in full-test mode', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: mockQuizData },
    });

    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          attempt: { id: 'att_abc', score: 2, totalQuestions: 2 },
        },
      },
    });

    render(<QuizAttempt />);
    await act(async () => {});

    // Start exam mode
    fireEvent.click(screen.getByText('Chế độ Thi thử'));
    await act(async () => {
      fireEvent.click(screen.getByText('Bắt đầu làm bài'));
    });

    // Answer Q1 (Correct: Cascading Style Sheets)
    fireEvent.click(screen.getByText('Cascading Style Sheets'));
    
    // Go to Q2
    fireEvent.click(screen.getByText('Tiếp theo'));
    
    // Answer Q2 (Correct: <video>)
    fireEvent.click(screen.getByText('<video>'));

    const submitBtn = screen.getByText('Nộp bài');
    
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(api.post).toHaveBeenCalledWith('/api/quizzes/quiz_xyz_555/attempts', expect.any(Object));
    expect(screen.getByText('Hoàn thành bài Quiz!')).toBeInTheDocument();
    expect(screen.getByText('2/2')).toBeInTheDocument(); // Score
  });

  it('should render upvote/downvote buttons after answering and call vote endpoint', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: mockQuizData },
    });

    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          ...mockQuizData,
          questions: [
            {
              ...mockQuizData.questions[0],
              metrics: { upvotes: 1, downvotes: 0 }
            },
            mockQuizData.questions[1]
          ]
        }
      }
    });

    render(<QuizAttempt />);
    await act(async () => {});

    // Start practice mode
    fireEvent.click(screen.getByText('Chế độ Luyện tập'));
    await act(async () => {
      fireEvent.click(screen.getByText('Bắt đầu làm bài'));
    });

    // Upvote button should not exist until answered
    expect(screen.queryByTitle('Hữu ích')).not.toBeInTheDocument();

    // Select option to trigger answer reveal
    fireEvent.click(screen.getByText('Cascading Style Sheets'));

    // Upvote button is revealed
    const upBtn = screen.getByTitle('Hữu ích');
    expect(upBtn).toBeInTheDocument();

    // Click upvote
    await act(async () => {
      fireEvent.click(upBtn);
    });

    expect(api.post).toHaveBeenCalledWith(
      '/api/quizzes/quiz_xyz_555/questions/q_1/vote',
      { type: 'up', userId: 'usr_abc123' }
    );
  });
});
