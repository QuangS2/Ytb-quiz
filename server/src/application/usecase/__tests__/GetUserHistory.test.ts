import assert from 'node:assert';
import { GetUserAttemptsUseCase } from '../GetUserAttemptsUseCase';
import { GetUserStatsUseCase } from '../GetUserStatsUseCase';
import { QuizRepositoryPort } from '../../port/output/QuizRepositoryPort';
import { QuizAttemptRepositoryPort } from '../../port/output/QuizAttemptRepositoryPort';
import { Quiz } from '../../../domain/model/Quiz';
import { QuizAttempt } from '../../../domain/model/QuizAttempt';

console.log('=== BẮT ĐẦU CHẠY UNIT TEST CHO USER HISTORY & STATS ===\n');

class MockQuizRepository implements QuizRepositoryPort {
  public quizzes: Quiz[] = [];

  public async save(quiz: Quiz): Promise<Quiz> {
    this.quizzes.push(quiz);
    return quiz;
  }

  public async findById(id: string): Promise<Quiz | null> {
    return this.quizzes.find((q) => q.id === id) || null;
  }

  public async findByYoutubeId(youtubeId: string): Promise<Quiz | null> {
    return this.quizzes.find((q) => q.youtubeId === youtubeId) || null;
  }

  public async delete(id: string): Promise<void> {
    this.quizzes = this.quizzes.filter((q) => q.id !== id);
  }
}

class MockQuizAttemptRepository implements QuizAttemptRepositoryPort {
  public attempts: QuizAttempt[] = [];

  public async save(attempt: QuizAttempt): Promise<QuizAttempt> {
    this.attempts.push(attempt);
    return attempt;
  }

  public async findById(id: string): Promise<QuizAttempt | null> {
    return this.attempts.find((a) => a.id === id) || null;
  }

  public async findByUserId(userId: string): Promise<QuizAttempt[]> {
    return this.attempts.filter((a) => a.userId === userId);
  }

  public async findByQuizId(quizId: string): Promise<QuizAttempt[]> {
    return this.attempts.filter((a) => a.quizId === quizId);
  }
}

async function runTests() {
  try {
    const quizRepo = new MockQuizRepository();
    const attemptRepo = new MockQuizAttemptRepository();

    const getAttemptsUseCase = new GetUserAttemptsUseCase(attemptRepo, quizRepo);
    const getStatsUseCase = new GetUserStatsUseCase(attemptRepo);

    const userId = 'user-abc';

    // ------------------------------------------
    // Case 1: Người dùng chưa làm bài nào (Dữ liệu rỗng)
    // ------------------------------------------
    console.log('1. Đang test trường hợp chưa có lịch sử làm bài...');
    const emptyAttempts = await getAttemptsUseCase.execute(userId);
    assert.strictEqual(emptyAttempts.length, 0);

    const emptyStats = await getStatsUseCase.execute(userId);
    assert.strictEqual(emptyStats.totalAttempts, 0);
    assert.strictEqual(emptyStats.totalQuizzes, 0);
    assert.strictEqual(emptyStats.averageCorrectRate, 0);
    assert.strictEqual(emptyStats.totalTimeTaken, 0);
    console.log('✓ Test dữ liệu trống thành công!');

    // Chuẩn bị dữ liệu mẫu
    const quiz1 = new Quiz('quiz-1', 'lc-1', 'creator-1', 'yt-1', 'Quiz Địa Lý', 'Desc', []);
    const quiz2 = new Quiz('quiz-2', 'lc-2', 'creator-1', 'yt-2', 'Quiz Lịch Sử', 'Desc', []);
    await quizRepo.save(quiz1);
    await quizRepo.save(quiz2);

    // Lượt 1: Làm quiz 1 (Đúng 1/2, tốn 60 giây), làm lúc 10:00
    const attempt1 = new QuizAttempt(
      'att-1',
      userId,
      'quiz-1',
      'full-test',
      1,
      2,
      60,
      [{ questionId: 'q1', selectedOptionIndex: 0, isCorrect: true }],
      new Date('2026-06-23T10:00:00Z')
    );

    // Lượt 2: Làm quiz 2 (Đúng 2/3, tốn 90 giây), làm lúc 10:30 (Mới nhất)
    const attempt2 = new QuizAttempt(
      'att-2',
      userId,
      'quiz-2',
      'instant-feedback',
      2,
      3,
      90,
      [],
      new Date('2026-06-23T10:30:00Z')
    );

    await attemptRepo.save(attempt1);
    await attemptRepo.save(attempt2);

    // ------------------------------------------
    // Case 2: Kiểm thử GetUserAttemptsUseCase (Sắp xếp & map title)
    // ------------------------------------------
    console.log('\n2. Đang test GetUserAttemptsUseCase...');
    const historyList = await getAttemptsUseCase.execute(userId);
    assert.strictEqual(historyList.length, 2);
    
    // Kiểm tra sắp xếp (att-2 mới hơn phải đứng trước)
    assert.strictEqual(historyList[0].id, 'att-2');
    assert.strictEqual(historyList[0].quizTitle, 'Quiz Lịch Sử');
    
    assert.strictEqual(historyList[1].id, 'att-1');
    assert.strictEqual(historyList[1].quizTitle, 'Quiz Địa Lý');
    console.log('✓ Test lịch sử & map tiêu đề thành công!');

    // ------------------------------------------
    // Case 3: Kiểm thử GetUserStatsUseCase (Tính toán tổng hợp)
    // ------------------------------------------
    console.log('\n3. Đang test GetUserStatsUseCase...');
    const stats = await getStatsUseCase.execute(userId);
    
    // totalAttempts = 2
    assert.strictEqual(stats.totalAttempts, 2);
    // totalQuizzes = 2 (quiz-1 và quiz-2)
    assert.strictEqual(stats.totalQuizzes, 2);
    // totalTimeTaken = 60 + 90 = 150
    assert.strictEqual(stats.totalTimeTaken, 150);
    // averageCorrectRate = (1 + 2) / (2 + 3) * 100 = 3/5 * 100 = 60%
    assert.strictEqual(stats.averageCorrectRate, 60);
    console.log('✓ Test tính toán số liệu thống kê thành công!');

    console.log('\n=== TẤT CẢ UNIT TESTS CHO USER HISTORY ĐỀU ĐẠT (PASS) ===');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ UNIT TEST THẤT BẠI:');
    console.error(error);
    process.exit(1);
  }
}

runTests();
