import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuizAttempt } from './useQuizAttempt';
import type { QuizData } from './useQuizAttempt';
import api from '../../../services/api';

// Mock the Auth Context
vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr_mock_123', email: 'test@example.com' },
    isAuthenticated: true,
    isLoading: false
  })
}));

// Mock the API service
vi.mock('../../../services/api', () => ({
  default: {
    post: vi.fn()
  }
}));

describe('useQuizAttempt Hook', () => {
  const mockQuiz: QuizData = {
    id: 'quiz_test_999',
    title: 'Testing React Hooks',
    youtubeId: 'dQw4w9WgXcQ',
    questions: [
      {
        id: 'q_1',
        text: 'What is React?',
        options: ['Library', 'Framework', 'Database', 'Language'],
        correctOptionIndex: 0,
        explanation: 'React is a library for building user interfaces.'
      },
      {
        id: 'q_2',
        text: 'What is TypeScript?',
        options: ['Subset of JavaScript', 'Superset of JavaScript', 'Browser'],
        correctOptionIndex: 1,
        explanation: 'TypeScript is a typed superset of JavaScript.'
      }
    ]
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with default states', () => {
    const { result } = renderHook(() => 
      useQuizAttempt({ quiz: mockQuiz, mode: 'full-test' })
    );

    expect(result.current.currentQuestionIndex).toBe(0);
    expect(result.current.currentQuestion.id).toBe('q_1');
    expect(result.current.selectedOptions).toEqual({});
    expect(result.current.isSubmitted).toBe(false);
    expect(result.current.score).toBe(0);
    expect(result.current.isCompleted).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should load draft state from localStorage if it exists', () => {
    localStorage.setItem('ytb_quiz_draft_quiz_test_999_full-test_index', '1');
    localStorage.setItem(
      'ytb_quiz_draft_quiz_test_999_full-test_answers',
      JSON.stringify({ q_1: 0 })
    );

    const { result } = renderHook(() =>
      useQuizAttempt({ quiz: mockQuiz, mode: 'full-test' })
    );

    expect(result.current.currentQuestionIndex).toBe(1);
    expect(result.current.selectedOptions).toEqual({ q_1: 0 });
    expect(result.current.isQuestionAnswered('q_1')).toBe(true);
    expect(result.current.isQuestionAnswered('q_2')).toBe(false);
  });

  it('should save current index and answers to localStorage upon changes', () => {
    const { result } = renderHook(() =>
      useQuizAttempt({ quiz: mockQuiz, mode: 'full-test' })
    );

    act(() => {
      result.current.selectOption('q_1', 0);
    });

    expect(
      JSON.parse(localStorage.getItem('ytb_quiz_draft_quiz_test_999_full-test_answers') || '{}')
    ).toEqual({ q_1: 0 });

    act(() => {
      result.current.nextQuestion();
    });

    expect(
      localStorage.getItem('ytb_quiz_draft_quiz_test_999_full-test_index')
    ).toBe('1');
  });

  it('should handle navigation bounds correctly', () => {
    const { result } = renderHook(() =>
      useQuizAttempt({ quiz: mockQuiz, mode: 'full-test' })
    );

    // Initial is 0, prev shouldn't go under 0
    act(() => {
      result.current.prevQuestion();
    });
    expect(result.current.currentQuestionIndex).toBe(0);

    // Go to next
    act(() => {
      result.current.nextQuestion();
    });
    expect(result.current.currentQuestionIndex).toBe(1);

    // At index 1 (last question), next shouldn't go further
    act(() => {
      result.current.nextQuestion();
    });
    expect(result.current.currentQuestionIndex).toBe(1);

    // Go to specific question index
    act(() => {
      result.current.goToQuestion(0);
    });
    expect(result.current.currentQuestionIndex).toBe(0);

    // Out of bounds jump should be ignored
    act(() => {
      result.current.goToQuestion(5);
    });
    expect(result.current.currentQuestionIndex).toBe(0);
  });

  it('should calculate local score correctly', () => {
    const { result } = renderHook(() =>
      useQuizAttempt({ quiz: mockQuiz, mode: 'full-test' })
    );

    act(() => {
      result.current.selectOption('q_1', 0); // Correct (Option 0)
    });
    expect(result.current.score).toBe(1);

    act(() => {
      result.current.selectOption('q_2', 0); // Incorrect (Correct is Option 1)
    });
    expect(result.current.score).toBe(1);

    act(() => {
      result.current.selectOption('q_2', 1); // Correct now
    });
    expect(result.current.score).toBe(2);
    expect(result.current.isCompleted).toBe(true);
  });

  it('should lock option selection in instant-feedback mode after selection', () => {
    const { result } = renderHook(() =>
      useQuizAttempt({ quiz: mockQuiz, mode: 'instant-feedback' })
    );

    act(() => {
      result.current.selectOption('q_1', 0);
    });
    expect(result.current.selectedOptions['q_1']).toBe(0);

    // Try selecting another option for the same question
    act(() => {
      result.current.selectOption('q_1', 1);
    });
    // Should remain 0
    expect(result.current.selectedOptions['q_1']).toBe(0);
  });

  it('should call submission API correctly and clear draft localStorage', async () => {
    const mockAttemptResponse = {
      attempt: {
        id: 'att_xyz987',
        score: 2,
        totalQuestions: 2
      }
    };
    
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        success: true,
        data: mockAttemptResponse
      }
    });

    const successSpy = vi.fn();
    const { result } = renderHook(() =>
      useQuizAttempt({
        quiz: mockQuiz,
        mode: 'full-test',
        onSuccessSubmit: successSpy
      })
    );

    // Fill the draft values
    act(() => {
      result.current.selectOption('q_1', 0);
      result.current.selectOption('q_2', 1);
    });

    expect(localStorage.getItem('ytb_quiz_draft_quiz_test_999_full-test_answers')).toBeDefined();

    // Call submit
    await act(async () => {
      await result.current.submitAttempt(45);
    });

    expect(api.post).toHaveBeenCalledWith('/api/quizzes/quiz_test_999/attempts', {
      answers: [
        { questionId: 'q_1', selectedOptionIndex: 0 },
        { questionId: 'q_2', selectedOptionIndex: 1 }
      ],
      timeTaken: 45,
      mode: 'full-test',
      userId: 'usr_mock_123'
    });

    expect(result.current.isSubmitted).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(successSpy).toHaveBeenCalledWith(mockAttemptResponse);

    // Verify localStorage draft is cleared
    expect(localStorage.getItem('ytb_quiz_draft_quiz_test_999_full-test_answers')).toBeNull();
    expect(localStorage.getItem('ytb_quiz_draft_quiz_test_999_full-test_index')).toBeNull();
  });

  it('should handle API errors on submission correctly', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: {
        data: {
          success: false,
          message: 'Không có quyền truy cập.'
        }
      }
    });

    const { result } = renderHook(() =>
      useQuizAttempt({ quiz: mockQuiz, mode: 'full-test' })
    );

    act(() => {
      result.current.selectOption('q_1', 0);
    });

    await act(async () => {
      await result.current.submitAttempt(30);
    });

    expect(result.current.isSubmitted).toBe(false);
    expect(result.current.error).toBe('Không có quyền truy cập.');
    expect(result.current.isLoading).toBe(false);
  });

  it('should reset attempt state and clear draft values', () => {
    const { result } = renderHook(() =>
      useQuizAttempt({ quiz: mockQuiz, mode: 'full-test' })
    );

    act(() => {
      result.current.selectOption('q_1', 0);
      result.current.nextQuestion();
    });

    expect(localStorage.getItem('ytb_quiz_draft_quiz_test_999_full-test_index')).toBe('1');

    act(() => {
      result.current.resetAttempt();
    });

    expect(result.current.selectedOptions).toEqual({});
    expect(result.current.currentQuestionIndex).toBe(0);
    expect(result.current.isSubmitted).toBe(false);
    expect(localStorage.getItem('ytb_quiz_draft_quiz_test_999_full-test_index')).toBeNull();
    expect(localStorage.getItem('ytb_quiz_draft_quiz_test_999_full-test_answers')).toBeNull();
  });

  it('should upvote or downvote a question and invoke onQuizUpdate', async () => {
    const mockUpdatedQuiz = {
      ...mockQuiz,
      questions: [
        {
          ...mockQuiz.questions[0],
          metrics: { upvotes: 1, downvotes: 0 }
        },
        mockQuiz.questions[1]
      ]
    };

    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        success: true,
        data: mockUpdatedQuiz
      }
    });

    const updateSpy = vi.fn();
    const { result } = renderHook(() =>
      useQuizAttempt({
        quiz: mockQuiz,
        mode: 'full-test',
        onQuizUpdate: updateSpy
      })
    );

    await act(async () => {
      await result.current.voteQuestion('q_1', 'up');
    });

    expect(api.post).toHaveBeenCalledWith('/api/quizzes/quiz_test_999/questions/q_1/vote', {
      type: 'up',
      userId: 'usr_mock_123'
    });

    expect(result.current.userVotes['q_1']).toBe('up');
    expect(updateSpy).toHaveBeenCalledWith(mockUpdatedQuiz);
  });
});
