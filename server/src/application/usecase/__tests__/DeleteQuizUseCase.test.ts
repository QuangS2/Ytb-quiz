import assert from 'node:assert';
import { DeleteQuizUseCase } from '../DeleteQuizUseCase';
import { QuizRepositoryPort } from '../../port/output/QuizRepositoryPort';
import { Quiz } from '../../../domain/model/Quiz';
import { QuizNotFoundException } from '../../../domain/exception/QuizNotFoundException';
import { QuizForbiddenException } from '../../../domain/exception/QuizForbiddenException';

console.log('=== BẮT ĐẦU CHẠY UNIT TEST CHO DeleteQuizUseCase ===\n');

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

async function runTests() {
  try {
    const quizRepo = new MockQuizRepository();
    const useCase = new DeleteQuizUseCase(quizRepo);

    // Chuẩn bị dữ liệu mẫu
    const quiz = new Quiz(
      'quiz-id-123',
      'lecture-id-123',
      'owner-user-id',
      'yt-id-123',
      'Quiz Test Delete',
      'Quiz Description',
      []
    );
    await quizRepo.save(quiz);

    // Case 1: Xóa Quiz không tồn tại
    console.log('1. Đang test trường hợp Quiz không tồn tại...');
    try {
      await useCase.execute({ quizId: 'non-existent-quiz', userId: 'owner-user-id' });
      assert.fail('Đáng lẽ phải ném lỗi QuizNotFoundException');
    } catch (error) {
      assert.ok(error instanceof QuizNotFoundException);
      console.log('✓ Nhận đúng ngoại lệ QuizNotFoundException!');
    }

    // Case 2: Xóa Quiz nhưng không phải người tạo
    console.log('\n2. Đang test trường hợp người xóa không phải người tạo...');
    try {
      await useCase.execute({ quizId: 'quiz-id-123', userId: 'attacker-user-id' });
      assert.fail('Đáng lẽ phải ném lỗi QuizForbiddenException');
    } catch (error) {
      assert.ok(error instanceof QuizForbiddenException);
      console.log('✓ Nhận đúng ngoại lệ QuizForbiddenException!');
    }

    // Case 3: Xóa Quiz thành công bởi người tạo
    console.log('\n3. Đang test trường hợp xóa thành công bởi người tạo...');
    await useCase.execute({ quizId: 'quiz-id-123', userId: 'owner-user-id' });
    const deletedQuiz = await quizRepo.findById('quiz-id-123');
    assert.strictEqual(deletedQuiz, null);
    console.log('✓ Xóa thành công và không tìm thấy Quiz trong DB!');

    console.log('\n=== TẤT CẢ UNIT TESTS CHO DeleteQuizUseCase ĐỀU ĐẠT (PASS) ===');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ UNIT TEST THẤT BẠI:');
    console.error(error);
    process.exit(1);
  }
}

runTests();
