import { QuizAttemptRepositoryPort } from '../port/output/QuizAttemptRepositoryPort';
import { QuizRepositoryPort } from '../port/output/QuizRepositoryPort';
import { UserHistoryAttemptDto } from '../dto/UserHistoryResponseDto';

export class GetUserAttemptsUseCase {
  constructor(
    private readonly quizAttemptRepository: QuizAttemptRepositoryPort,
    private readonly quizRepository: QuizRepositoryPort
  ) {}

  public async execute(userId: string): Promise<UserHistoryAttemptDto[]> {
    // 1. Lấy tất cả lượt làm bài của User từ DB
    const attempts = await this.quizAttemptRepository.findByUserId(userId);

    // 2. Sắp xếp lượt làm bài mới nhất lên trước
    attempts.sort((a, b) => b.attemptedAt.getTime() - a.attemptedAt.getTime());

    // 3. Lấy tên bài trắc nghiệm (quizTitle) cho từng lượt làm bài song song để tối ưu hiệu năng
    const result: UserHistoryAttemptDto[] = await Promise.all(
      attempts.map(async (att) => {
        const quiz = await this.quizRepository.findById(att.quizId);
        return {
          id: att.id,
          quizId: att.quizId,
          quizTitle: quiz ? quiz.title : 'Bài trắc nghiệm đã xóa',
          mode: att.mode,
          score: att.score,
          totalQuestions: att.totalQuestions,
          timeTaken: att.timeTaken,
          attemptedAt: att.attemptedAt
        };
      })
    );

    return result;
  }
}
