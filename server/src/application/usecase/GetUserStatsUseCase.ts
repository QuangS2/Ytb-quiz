import { QuizAttemptRepositoryPort } from '../port/output/QuizAttemptRepositoryPort';
import { UserStatsDto } from '../dto/UserHistoryResponseDto';

export class GetUserStatsUseCase {
  constructor(
    private readonly quizAttemptRepository: QuizAttemptRepositoryPort
  ) {}

  public async execute(userId: string): Promise<UserStatsDto> {
    // 1. Lấy toàn bộ lượt làm bài từ DB
    const attempts = await this.quizAttemptRepository.findByUserId(userId);

    // 2. Trả về các chỉ số bằng 0 nếu chưa có lịch sử
    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        totalQuizzes: 0,
        averageCorrectRate: 0,
        totalTimeTaken: 0
      };
    }

    let totalTimeTaken = 0;
    let totalQuestionsAnswered = 0;
    let totalCorrectAnswers = 0;
    const uniqueQuizIds = new Set<string>();

    for (const att of attempts) {
      totalTimeTaken += att.timeTaken;
      totalQuestionsAnswered += att.totalQuestions;
      totalCorrectAnswers += att.score;
      uniqueQuizIds.add(att.quizId);
    }

    // 3. Tính tỷ lệ làm bài đúng trung bình (%)
    const averageCorrectRate = totalQuestionsAnswered > 0
      ? Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100)
      : 0;

    return {
      totalAttempts: attempts.length,
      totalQuizzes: uniqueQuizIds.size,
      averageCorrectRate,
      totalTimeTaken
    };
  }
}
