export interface UserHistoryAttemptDto {
  id: string;
  quizId: string;
  quizTitle: string;
  mode: 'full-test' | 'instant-feedback';
  score: number;
  totalQuestions: number;
  timeTaken: number;
  attemptedAt: Date;
}

export interface UserStatsDto {
  totalAttempts: number;
  totalQuizzes: number;
  averageCorrectRate: number; // percentage (0-100)
  totalTimeTaken: number; // in seconds
}

export interface UserHistoryResponseDto {
  attempts: UserHistoryAttemptDto[];
  stats: UserStatsDto;
}
