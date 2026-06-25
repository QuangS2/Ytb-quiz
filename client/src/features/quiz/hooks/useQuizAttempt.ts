import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../auth/context/AuthContext';

export interface QuestionMetrics {
  upvotes: number;
  downvotes: number;
  timesAnswered?: number;
  timesCorrect?: number;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  metrics?: QuestionMetrics;
}

export interface QuizData {
  id: string;
  title: string;
  description?: string;
  youtubeId: string;
  questions: QuizQuestion[];
}

export interface UseQuizAttemptProps {
  quiz: QuizData;
  mode: 'full-test' | 'instant-feedback';
  onSuccessSubmit?: (attemptData: any) => void;
  onQuizUpdate?: (newQuiz: QuizData) => void;
}

export const useQuizAttempt = ({ quiz, mode, onSuccessSubmit, onQuizUpdate }: UseQuizAttemptProps) => {
  const { user } = useAuth();
  
  // Storage keys for persistence (draft status)
  const DRAFT_ANSWERS_KEY = `ytb_quiz_draft_${quiz.id}_${mode}_answers`;
  const DRAFT_INDEX_KEY = `ytb_quiz_draft_${quiz.id}_${mode}_index`;

  // State initialization with localStorage restore
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(() => {
    try {
      const savedIndex = localStorage.getItem(DRAFT_INDEX_KEY);
      if (savedIndex !== null) {
        const parsed = parseInt(savedIndex, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < quiz.questions.length) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse draft question index:', e);
    }
    return 0;
  });

  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>(() => {
    try {
      const savedAnswers = localStorage.getItem(DRAFT_ANSWERS_KEY);
      if (savedAnswers) {
        return JSON.parse(savedAnswers);
      }
    } catch (e) {
      console.error('Failed to parse draft selected options:', e);
    }
    return {};
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, 'up' | 'down'>>({});

  // Sync state to localStorage for persistence on F5
  useEffect(() => {
    if (!isSubmitted) {
      if (currentQuestionIndex === 0 && Object.keys(selectedOptions).length === 0) {
        localStorage.removeItem(DRAFT_INDEX_KEY);
      } else {
        localStorage.setItem(DRAFT_INDEX_KEY, currentQuestionIndex.toString());
      }
    }
  }, [currentQuestionIndex, selectedOptions, DRAFT_INDEX_KEY, isSubmitted]);

  useEffect(() => {
    if (!isSubmitted) {
      if (Object.keys(selectedOptions).length === 0) {
        localStorage.removeItem(DRAFT_ANSWERS_KEY);
      } else {
        localStorage.setItem(DRAFT_ANSWERS_KEY, JSON.stringify(selectedOptions));
      }
    }
  }, [selectedOptions, DRAFT_ANSWERS_KEY, isSubmitted]);

  // Derived state
  const questions = quiz.questions;
  const currentQuestion = questions[currentQuestionIndex];
  
  // Local score calculation
  const score = questions.reduce((acc, q) => {
    const selected = selectedOptions[q.id];
    if (selected !== undefined && selected === q.correctOptionIndex) {
      return acc + 1;
    }
    return acc;
  }, 0);

  const isCompleted = questions.every(q => selectedOptions[q.id] !== undefined);

  // Helper to check if a question is answered
  const isQuestionAnswered = (questionId: string) => {
    return selectedOptions[questionId] !== undefined;
  };

  // Actions
  const selectOption = (questionId: string, optionIndex: number) => {
    // If quiz is already submitted or if it's instant-feedback and question is already answered, block selection
    if (isSubmitted) return;
    if (mode === 'instant-feedback' && isQuestionAnswered(questionId)) return;

    setSelectedOptions(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  // Submit attempt payload to API
  const submitAttempt = async (timeTakenSeconds: number) => {
    setIsLoading(true);
    setError(null);

    // Format the payload matching backend-info.md
    const payload = {
      answers: Object.entries(selectedOptions).map(([questionId, selectedOptionIndex]) => ({
        questionId,
        selectedOptionIndex
      })),
      timeTaken: timeTakenSeconds,
      mode,
      userId: user?.id || undefined // Will fallback to JWT token resolution or mock context in backend
    };

    try {
      const response = await api.post(`/api/quizzes/${quiz.id}/attempts`, payload);
      setIsSubmitted(true);
      
      // Clear persistence drafts upon successful submission
      localStorage.removeItem(DRAFT_ANSWERS_KEY);
      localStorage.removeItem(DRAFT_INDEX_KEY);

      if (onSuccessSubmit) {
        onSuccessSubmit(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to submit quiz attempt:', err);
      const errMsg = err.response?.data?.message || 'Đã xảy ra lỗi khi nộp bài. Vui lòng thử lại.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Vote on a specific question (triggers Self-Healing on backend if threshold breached)
  const voteQuestion = async (questionId: string, type: 'up' | 'down') => {
    try {
      const response = await api.post(`/api/quizzes/${quiz.id}/questions/${questionId}/vote`, {
        type,
        userId: user?.id || undefined
      });
      
      setUserVotes(prev => ({
        ...prev,
        [questionId]: type
      }));

      if (onQuizUpdate && response.data.data) {
        onQuizUpdate(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to vote question:', err);
    }
  };

  // Reset or restart the quiz attempt
  const resetAttempt = () => {
    setSelectedOptions({});
    setCurrentQuestionIndex(0);
    setIsSubmitted(false);
    setError(null);
    localStorage.removeItem(DRAFT_ANSWERS_KEY);
    localStorage.removeItem(DRAFT_INDEX_KEY);
  };

  return {
    questions,
    currentQuestionIndex,
    currentQuestion,
    selectedOptions,
    isSubmitted,
    isLoading,
    error,
    score,
    isCompleted,
    isQuestionAnswered,
    selectOption,
    nextQuestion,
    prevQuestion,
    goToQuestion,
    submitAttempt,
    resetAttempt,
    userVotes,
    voteQuestion
  };
};
