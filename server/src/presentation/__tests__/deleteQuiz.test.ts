import assert from 'node:assert';
import express from 'express';
import '../middleware/GeminiKeyMiddleware';
import { QuizController } from '../controller/QuizController';
import { DeleteQuizUseCase } from '../../application/usecase/DeleteQuizUseCase';
import { errorHandler } from '../middleware/ErrorHandler';
import { QuizNotFoundException } from '../../domain/exception/QuizNotFoundException';
import { QuizForbiddenException } from '../../domain/exception/QuizForbiddenException';
import { validateRequest } from '../middleware/validateRequest';
import { DeleteQuizRequestSchema } from '../controller/QuizController';

console.log('=== BẮT ĐẦU CHẠY PRESENTATION INTEGRATION TEST CHO DELETE QUIZ API ===\n');

let useCaseMockBehavior: 'success' | 'not-found' | 'forbidden' = 'success';
let capturedQuizId = '';
let capturedUserId = '';

// Monkey-patch DeleteQuizUseCase.execute
DeleteQuizUseCase.prototype.execute = async (dto) => {
  capturedQuizId = dto.quizId;
  capturedUserId = dto.userId;

  if (useCaseMockBehavior === 'not-found') {
    throw new QuizNotFoundException(dto.quizId);
  }
  if (useCaseMockBehavior === 'forbidden') {
    throw new QuizForbiddenException();
  }
  // success does nothing
};

const app = express();
app.use(express.json());

const quizController = new QuizController();

// Đăng ký route test
app.delete(
  '/api/quizzes/:id',
  validateRequest(DeleteQuizRequestSchema),
  quizController.deleteQuiz
);

app.use(errorHandler);

const PORT = 6007;
const server = app.listen(PORT, async () => {
  try {
    // ------------------------------------------
    // Case 1: Xóa Quiz không tồn tại (Trả về 404)
    // ------------------------------------------
    console.log('1. Đang test trả về 404 khi Quiz không tồn tại...');
    useCaseMockBehavior = 'not-found';
    capturedQuizId = '';
    capturedUserId = '';

    const resNotFound = await fetch(`http://localhost:${PORT}/api/quizzes/quiz-not-exist?userId=mock-user-123`, {
      method: 'DELETE'
    });
    assert.strictEqual(resNotFound.status, 404);
    const jsonNotFound = await resNotFound.json() as any;
    assert.strictEqual(jsonNotFound.success, false);
    assert.strictEqual(jsonNotFound.code, 'QUIZ_NOT_FOUND');
    assert.strictEqual(capturedQuizId, 'quiz-not-exist');
    assert.strictEqual(capturedUserId, 'mock-user-123');
    console.log('✓ Trả về 404 và mã lỗi QUIZ_NOT_FOUND thành công!');

    // ------------------------------------------
    // Case 2: Xóa Quiz không có quyền (Trả về 403)
    // ------------------------------------------
    console.log('\n2. Đang test trả về 403 khi không có quyền sở hữu...');
    useCaseMockBehavior = 'forbidden';
    capturedQuizId = '';
    capturedUserId = '';

    const resForbidden = await fetch(`http://localhost:${PORT}/api/quizzes/quiz-123?userId=attacker-user-id`, {
      method: 'DELETE'
    });
    assert.strictEqual(resForbidden.status, 403);
    const jsonForbidden = await resForbidden.json() as any;
    assert.strictEqual(jsonForbidden.success, false);
    assert.strictEqual(jsonForbidden.code, 'QUIZ_FORBIDDEN');
    assert.strictEqual(capturedQuizId, 'quiz-123');
    assert.strictEqual(capturedUserId, 'attacker-user-id');
    console.log('✓ Trả về 403 và mã lỗi QUIZ_FORBIDDEN thành công!');

    // ------------------------------------------
    // Case 3: Xóa Quiz thành công (Trả về 200)
    // ------------------------------------------
    console.log('\n3. Đang test trả về 200 khi xóa thành công bởi chủ sở hữu...');
    useCaseMockBehavior = 'success';
    capturedQuizId = '';
    capturedUserId = '';

    const resSuccess = await fetch(`http://localhost:${PORT}/api/quizzes/quiz-123?userId=owner-user-id`, {
      method: 'DELETE'
    });
    assert.strictEqual(resSuccess.status, 200);
    const jsonSuccess = await resSuccess.json() as any;
    assert.strictEqual(jsonSuccess.success, true);
    assert.strictEqual(jsonSuccess.message, 'Đã xóa bài trắc nghiệm thành công.');
    assert.strictEqual(capturedQuizId, 'quiz-123');
    assert.strictEqual(capturedUserId, 'owner-user-id');
    console.log('✓ Trả về 200 và xóa bài trắc nghiệm thành công!');

    // ------------------------------------------
    // Case 4: Xóa Quiz dùng mặc định mock-user-123 khi không truyền userId
    // ------------------------------------------
    console.log('\n4. Đang test dùng mặc định mock-user-123 khi không truyền userId...');
    useCaseMockBehavior = 'success';
    capturedQuizId = '';
    capturedUserId = '';

    const resDefault = await fetch(`http://localhost:${PORT}/api/quizzes/quiz-123`, {
      method: 'DELETE'
    });
    assert.strictEqual(resDefault.status, 200);
    assert.strictEqual(capturedUserId, 'mock-user-123');
    console.log('✓ Sử dụng userId mặc định thành công!');

    console.log('\n=== TẤT CẢ KIỂM THỬ TÍCH HỢP DELETE QUIZ API ĐỀU ĐẠT (PASS) ===');

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
