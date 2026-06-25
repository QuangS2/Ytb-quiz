import assert from 'node:assert';
import express from 'express';
import { AttemptController, SubmitAttemptRequestSchema } from '../controller/AttemptController';
import { SubmitQuizUseCase } from '../../application/usecase/SubmitQuizUseCase';
import { QuizNotFoundException } from '../../domain/exception/QuizNotFoundException';
import { BusinessException } from '../../domain/exception/BusinessException';
import { validateRequest } from '../middleware/validateRequest';
import { errorHandler } from '../middleware/ErrorHandler';
import { QuizAttempt } from '../../domain/model/QuizAttempt';

console.log('=== BẮT ĐẦU CHẠY PRESENTATION INTEGRATION TEST CHO ATTEMPT API ===\n');

// Mock thực thể QuizAttempt trả về khi thành công
const mockSavedAttempt = new QuizAttempt(
  'attempt-uuid-123',
  'user-1',
  'quiz-123',
  'full-test',
  1,
  2,
  120,
  [
    { questionId: 'q-1', selectedOptionIndex: 1, isCorrect: true },
    { questionId: 'q-2', selectedOptionIndex: 0, isCorrect: false }
  ]
);

// Monkey-patch SubmitQuizUseCase.prototype.execute để tránh gọi Mongo và Gemini thật trong Presentation Test
SubmitQuizUseCase.prototype.execute = async (dto) => {
  if (dto.quizId === 'non-existent') {
    throw new QuizNotFoundException(dto.quizId);
  }
  if (dto.answers.some((a) => a.questionId === 'q-wrong')) {
    throw new BusinessException('QUESTION_NOT_FOUND', 'Không tìm thấy câu hỏi với ID q-wrong trong bài thi này.');
  }
  return {
    attempt: mockSavedAttempt,
    questions: [
      {
        id: 'q-1',
        text: 'Thủ đô của Việt Nam là gì?',
        options: ['Hải Phòng', 'Hà Nội', 'Đà Nẵng', 'TP HCM'],
        correctOptionIndex: 1,
        explanation: 'Hà Nội là thủ đô của Việt Nam.'
      },
      {
        id: 'q-2',
        text: 'Kiến trúc sạch (Clean Architecture) có mấy tầng chính?',
        options: ['1', '2', '3', '4'],
        correctOptionIndex: 3,
        explanation: 'Kiến trúc sạch có 4 tầng chính.'
      }
    ]
  };
};

const app = express();
app.use(express.json());

const attemptController = new AttemptController();

// Đăng ký router cho kiểm thử
app.post(
  '/api/quizzes/:id/attempts',
  validateRequest(SubmitAttemptRequestSchema),
  attemptController.submitAttempt
);

app.use(errorHandler);

const PORT = 6004;
const server = app.listen(PORT, async () => {
  try {
    // ------------------------------------------
    // Case 1: Lỗi Validation (ZodError) - answers trống / timeTaken âm
    // ------------------------------------------
    console.log('1. Đang test trường hợp Zod validation thất bại...');
    const resBadBody = await fetch(`http://localhost:${PORT}/api/quizzes/quiz-123/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: [],
        timeTaken: -10
      })
    });

    assert.strictEqual(resBadBody.status, 400);
    const jsonBadBody = await resBadBody.json() as any;
    assert.strictEqual(jsonBadBody.success, false);
    assert.strictEqual(jsonBadBody.code, 'VALIDATION_ERROR');
    assert.ok(jsonBadBody.errors.length >= 2);
    console.log('✓ Test Zod validation thành công!');

    // ------------------------------------------
    // Case 2: Quiz không tồn tại -> mong đợi HTTP 404 (QUIZ_NOT_FOUND)
    // ------------------------------------------
    console.log('\n2. Đang test trường hợp Quiz không tồn tại (404)...');
    const resNotFound = await fetch(`http://localhost:${PORT}/api/quizzes/non-existent/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: [{ questionId: 'q-1', selectedOptionIndex: 1 }],
        timeTaken: 60
      })
    });

    assert.strictEqual(resNotFound.status, 404);
    const jsonNotFound = await resNotFound.json() as any;
    assert.strictEqual(jsonNotFound.success, false);
    assert.strictEqual(jsonNotFound.code, 'QUIZ_NOT_FOUND');
    console.log('✓ Test trả về 404 khi Quiz không tồn tại thành công!');

    // ------------------------------------------
    // Case 3: Nộp bài hợp lệ -> mong đợi HTTP 201 cùng kết quả chi tiết
    // ------------------------------------------
    console.log('\n3. Đang test trường hợp gửi request nộp bài hợp lệ (201)...');
    const resSuccess = await fetch(`http://localhost:${PORT}/api/quizzes/quiz-123/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: [
          { questionId: 'q-1', selectedOptionIndex: 1 },
          { questionId: 'q-2', selectedOptionIndex: 0 }
        ],
        timeTaken: 120,
        mode: 'full-test',
        userId: 'user-abc'
      })
    });

    assert.strictEqual(resSuccess.status, 201);
    const jsonSuccess = await resSuccess.json() as any;
    assert.strictEqual(jsonSuccess.success, true);
    assert.strictEqual(jsonSuccess.data.attempt.id, 'attempt-uuid-123');
    assert.strictEqual(jsonSuccess.data.attempt.score, 1);
    assert.strictEqual(jsonSuccess.data.attempt.totalQuestions, 2);
    assert.strictEqual(jsonSuccess.data.questions.length, 2);
    assert.strictEqual(jsonSuccess.data.questions[0].correctOptionIndex, 1);
    console.log('✓ Test gửi request nộp bài hợp lệ thành công!');

    console.log('\n=== TẤT CẢ KIỂM THỬ TÍCH HỢP ATTEMPT API ĐỀU ĐẠT (PASS) ===');

    server.close(() => {
      setTimeout(() => {
        process.exit(0);
      }, 100);
    });
  } catch (error) {
    console.error('❌ KIỂM THỬ THẤT BẠI:');
    console.error(error);
    server.close(() => {
      setTimeout(() => {
        process.exit(1);
      }, 100);
    });
  }
});
