import { BusinessException } from './BusinessException';

export class QuizNotFoundException extends BusinessException {
  constructor(quizId: string) {
    super('QUIZ_NOT_FOUND', `Không tìm thấy bài trắc nghiệm với ID: ${quizId}`);
  }
}
