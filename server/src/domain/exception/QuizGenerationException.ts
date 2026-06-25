import { BusinessException } from './BusinessException';

export class QuizGenerationException extends BusinessException {
  constructor(message: string) {
    super('QUIZ_GENERATION_ERROR', `Lỗi trong quá trình sinh Quiz bằng AI: ${message}`);
  }
}
