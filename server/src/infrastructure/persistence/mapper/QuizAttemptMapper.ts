import { QuizAttempt, AttemptAnswer } from '../../../domain/model/QuizAttempt';
import { IQuizAttemptDocument, IAttemptAnswerDocument } from '../schema/QuizAttemptSchema';

export class QuizAttemptMapper {
  public static toDomain(document: IQuizAttemptDocument | any): QuizAttempt {
    if (!document) {
      throw new Error('Không thể map tài liệu null sang thực thể QuizAttempt');
    }

    const domainAnswers: AttemptAnswer[] = document.answers.map((ans: any) => ({
      questionId: ans.questionId,
      selectedOptionIndex: ans.selectedOptionIndex,
      isCorrect: ans.isCorrect
    }));

    return new QuizAttempt(
      document._id || document.id,
      document.userId,
      document.quizId,
      document.mode,
      document.score,
      document.totalQuestions,
      document.timeTaken,
      domainAnswers,
      document.attemptedAt
    );
  }

  public static toPersistence(domain: QuizAttempt): any {
    const persistenceAnswers: IAttemptAnswerDocument[] = domain.answers.map((ans) => ({
      questionId: ans.questionId,
      selectedOptionIndex: ans.selectedOptionIndex,
      isCorrect: ans.isCorrect
    }));

    return {
      _id: domain.id,
      userId: domain.userId,
      quizId: domain.quizId,
      mode: domain.mode,
      score: domain.score,
      totalQuestions: domain.totalQuestions,
      timeTaken: domain.timeTaken,
      answers: persistenceAnswers,
      attemptedAt: domain.attemptedAt
    };
  }
}
