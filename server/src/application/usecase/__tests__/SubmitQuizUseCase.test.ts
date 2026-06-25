import assert from 'node:assert';
import { SubmitQuizUseCase } from '../SubmitQuizUseCase';
import { QuizRepositoryPort } from '../../port/output/QuizRepositoryPort';
import { QuizAttemptRepositoryPort } from '../../port/output/QuizAttemptRepositoryPort';
import { Quiz, Question } from '../../../domain/model/Quiz';
import { QuizAttempt } from '../../../domain/model/QuizAttempt';
import { QuizNotFoundException } from '../../../domain/exception/QuizNotFoundException';
import { BusinessException } from '../../../domain/exception/BusinessException';

console.log('=== BẮT ĐẦU CHẠY UNIT TEST CHO SubmitQuizUseCase ===\n');

class MockQuizRepository implements QuizRepositoryPort {
  public quizzes: Quiz[] = [];

  public async save(quiz: Quiz): Promise<Quiz> {
    const idx = this.quizzes.findIndex((q) => q.id === quiz.id);
    if (idx !== -1) {
      this.quizzes[idx] = quiz;
    } else {
      this.quizzes.push(quiz);
    }
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
    const idx = this.attempts.findIndex((a) => a.id === attempt.id);
    if (idx !== -1) {
      this.attempts[idx] = attempt;
    } else {
      this.attempts.push(attempt);
    }
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
    const useCase = new SubmitQuizUseCase(quizRepo, attemptRepo);

    // ------------------------------------------
    // Case 1: Quiz không tồn tại -> mong đợi ném QuizNotFoundException
    // ------------------------------------------
    console.log('1. Đang test trường hợp Quiz không tồn tại...');
    await assert.rejects(
      async () => {
        await useCase.execute({
          quizId: 'non-existent-quiz-id',
          userId: 'user-1',
          timeTaken: 60,
          answers: [{ questionId: 'q-1', selectedOptionIndex: 0 }]
        });
      },
      (err) => {
        assert.ok(err instanceof QuizNotFoundException);
        assert.strictEqual(err.code, 'QUIZ_NOT_FOUND');
        return true;
      },
      'Lẽ ra phải ném lỗi QuizNotFoundException'
    );
    console.log('✓ Test ném lỗi khi không tìm thấy Quiz thành công!');

    // Chuẩn bị dữ liệu mẫu cho Quiz
    const quizId = 'quiz-123';
    const mockQuestions: Question[] = [
      {
        id: 'q-1',
        text: 'Thủ đô của Việt Nam là gì?',
        options: ['Hải Phòng', 'Hà Nội', 'Đà Nẵng', 'TP HCM'],
        correctOptionIndex: 1, // Hà Nội
        explanation: 'Hà Nội là thủ đô của Việt Nam.',
        metrics: { upvotes: 0, downvotes: 0, timesAnswered: 0, timesCorrect: 0 }
      },
      {
        id: 'q-2',
        text: 'Kiến trúc sạch (Clean Architecture) có mấy tầng chính?',
        options: ['1', '2', '3', '4'],
        correctOptionIndex: 3, // 4 tầng
        explanation: 'Kiến trúc sạch có 4 tầng chính: Domain, Application, Infrastructure, Presentation.',
        metrics: { upvotes: 0, downvotes: 0, timesAnswered: 0, timesCorrect: 0 }
      }
    ];

    const quiz = new Quiz(
      quizId,
      'lecture-123',
      'creator-123',
      'youtube-123',
      'Bài học địa lý và kiến trúc',
      'Mô tả bài học',
      mockQuestions
    );
    await quizRepo.save(quiz);

    // ------------------------------------------
    // Case 2: Trả lời có câu hỏi không thuộc Quiz -> mong đợi ném lỗi QUESTION_NOT_FOUND
    // ------------------------------------------
    console.log('\n2. Đang test trường hợp trả lời câu hỏi không có trong Quiz...');
    await assert.rejects(
      async () => {
        await useCase.execute({
          quizId,
          userId: 'user-1',
          timeTaken: 45,
          answers: [
            { questionId: 'q-1', selectedOptionIndex: 1 },
            { questionId: 'q-wrong', selectedOptionIndex: 0 }
          ]
        });
      },
      (err: any) => {
        assert.ok(err instanceof BusinessException);
        assert.strictEqual(err.code, 'QUESTION_NOT_FOUND');
        return true;
      },
      'Lẽ ra phải ném lỗi QUESTION_NOT_FOUND'
    );
    console.log('✓ Test ném lỗi khi câu hỏi không hợp lệ thành công!');

    // ------------------------------------------
    // Case 3: Nộp bài hợp lệ -> tính điểm chính xác và cập nhật metrics của Quiz
    // ------------------------------------------
    console.log('\n3. Đang test trường hợp nộp bài thi hợp lệ...');
    
    // Reset lại metrics của quiz do bị side effect trong Case 2 (lấy object reference)
    const resetQuiz = new Quiz(
      quizId,
      'lecture-123',
      'creator-123',
      'youtube-123',
      'Bài học địa lý và kiến trúc',
      'Mô tả bài học',
      [
        {
          id: 'q-1',
          text: 'Thủ đô của Việt Nam là gì?',
          options: ['Hải Phòng', 'Hà Nội', 'Đà Nẵng', 'TP HCM'],
          correctOptionIndex: 1, // Hà Nội
          explanation: 'Hà Nội là thủ đô của Việt Nam.',
          metrics: { upvotes: 0, downvotes: 0, timesAnswered: 0, timesCorrect: 0 }
        },
        {
          id: 'q-2',
          text: 'Kiến trúc sạch (Clean Architecture) có mấy tầng chính?',
          options: ['1', '2', '3', '4'],
          correctOptionIndex: 3, // 4 tầng
          explanation: 'Kiến trúc sạch có 4 tầng chính: Domain, Application, Infrastructure, Presentation.',
          metrics: { upvotes: 0, downvotes: 0, timesAnswered: 0, timesCorrect: 0 }
        }
      ]
    );
    await quizRepo.save(resetQuiz);
    
    // User trả lời: q-1 chọn index 1 (Đúng), q-2 chọn index 0 (Sai, đúng là index 3)
    const result = await useCase.execute({
      quizId,
      userId: 'user-1',
      timeTaken: 120,
      answers: [
        { questionId: 'q-1', selectedOptionIndex: 1 },
        { questionId: 'q-2', selectedOptionIndex: 0 }
      ]
    });

    // Kiểm tra kết quả trả về
    assert.strictEqual(result.attempt.score, 1, 'Số câu trả lời đúng phải là 1');
    assert.strictEqual(result.attempt.totalQuestions, 2, 'Tổng số câu hỏi phải là 2');
    assert.strictEqual(result.attempt.timeTaken, 120, 'Thời gian làm bài phải khớp');
    assert.strictEqual(result.attempt.mode, 'full-test', 'Chế độ mặc định phải là full-test');
    assert.strictEqual(result.attempt.answers.length, 2, 'Mảng câu trả lời phải có 2 phần tử');
    
    // Kiểm tra kết quả chấm điểm từng câu
    const ans1 = result.attempt.answers.find((a) => a.questionId === 'q-1');
    assert.ok(ans1);
    assert.strictEqual(ans1.isCorrect, true);

    const ans2 = result.attempt.answers.find((a) => a.questionId === 'q-2');
    assert.ok(ans2);
    assert.strictEqual(ans2.isCorrect, false);

    // Kiểm tra thông tin bổ trợ trong kết quả (questions list)
    assert.strictEqual(result.questions.length, 2);
    const q1Info = result.questions.find((q) => q.id === 'q-1');
    assert.ok(q1Info);
    assert.strictEqual(q1Info.correctOptionIndex, 1);
    assert.strictEqual(q1Info.explanation, 'Hà Nội là thủ đô của Việt Nam.');

    // Kiểm tra metrics của các câu hỏi trong cơ sở dữ liệu đã được cập nhật
    const updatedQuiz = await quizRepo.findById(quizId);
    assert.ok(updatedQuiz);

    const updatedQ1 = updatedQuiz.questions.find((q) => q.id === 'q-1');
    assert.ok(updatedQ1);
    assert.strictEqual(updatedQ1.metrics.timesAnswered, 1, 'q-1: timesAnswered phải tăng 1');
    assert.strictEqual(updatedQ1.metrics.timesCorrect, 1, 'q-1: timesCorrect phải tăng 1');

    const updatedQ2 = updatedQuiz.questions.find((q) => q.id === 'q-2');
    assert.ok(updatedQ2);
    assert.strictEqual(updatedQ2.metrics.timesAnswered, 1, 'q-2: timesAnswered phải tăng 1');
    assert.strictEqual(updatedQ2.metrics.timesCorrect, 0, 'q-2: timesCorrect phải giữ nguyên 0');

    // Kiểm tra việc lưu lượt làm bài vào DB
    assert.strictEqual(attemptRepo.attempts.length, 1, 'Lượt làm bài phải được lưu vào database');
    assert.strictEqual(attemptRepo.attempts[0].id, result.attempt.id);

    console.log('✓ Test nộp bài thi thành công!');
    console.log('\n=== TẤT CẢ UNIT TESTS CHO SubmitQuizUseCase ĐỀU ĐẠT (PASS) ===');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ UNIT TEST THẤT BẠI:');
    console.error(error);
    process.exit(1);
  }
}

runTests();
