import { BusinessException } from './BusinessException';

export class QuestionNotFoundException extends BusinessException {
  constructor(questionId: string) {
    super('QUESTION_NOT_FOUND', `Không tìm thấy câu hỏi với ID: ${questionId}`);
  }
}
