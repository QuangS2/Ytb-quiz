import { QuizAttempt } from '../../../domain/model/QuizAttempt';

export interface QuizAttemptRepositoryPort {
  save(attempt: QuizAttempt): Promise<QuizAttempt>;
  findById(id: string): Promise<QuizAttempt | null>;
  findByUserId(userId: string): Promise<QuizAttempt[]>;
  findByQuizId(quizId: string): Promise<QuizAttempt[]>;
}
