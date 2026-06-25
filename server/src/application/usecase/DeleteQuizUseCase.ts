import { QuizRepositoryPort } from '../port/output/QuizRepositoryPort';
import { QuizNotFoundException } from '../../domain/exception/QuizNotFoundException';
import { QuizForbiddenException } from '../../domain/exception/QuizForbiddenException';

export interface DeleteQuizRequestDto {
  quizId: string;
  userId: string;
}

export class DeleteQuizUseCase {
  constructor(private readonly quizRepository: QuizRepositoryPort) {}

  public async execute(dto: DeleteQuizRequestDto): Promise<void> {
    const { quizId, userId } = dto;

    // 1. Tìm bài trắc nghiệm trong database
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new QuizNotFoundException(quizId);
    }

    // 2. Kiểm tra quyền sở hữu (người tạo ra quiz mới có quyền xóa)
    if (quiz.creatorId !== userId) {
      throw new QuizForbiddenException();
    }

    // 3. Thực hiện xóa
    await this.quizRepository.delete(quizId);
  }
}
