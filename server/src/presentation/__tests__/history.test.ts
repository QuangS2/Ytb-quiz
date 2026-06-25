import assert from 'node:assert';
import express from 'express';
import { UserController } from '../controller/UserController';
import { GetUserAttemptsUseCase } from '../../application/usecase/GetUserAttemptsUseCase';
import { GetUserStatsUseCase } from '../../application/usecase/GetUserStatsUseCase';
import { errorHandler } from '../middleware/ErrorHandler';
import { UserHistoryAttemptDto, UserStatsDto } from '../../application/dto/UserHistoryResponseDto';

console.log('=== BẮT ĐẦU CHẠY PRESENTATION INTEGRATION TEST CHO HISTORY API ===\n');

// Mock data
const mockAttempts: UserHistoryAttemptDto[] = [
  {
    id: 'att-123',
    quizId: 'quiz-123',
    quizTitle: 'Mock Quiz Title',
    mode: 'full-test',
    score: 4,
    totalQuestions: 5,
    timeTaken: 120,
    attemptedAt: new Date('2026-06-23T10:00:00Z')
  }
];

const mockStats: UserStatsDto = {
  totalAttempts: 1,
  totalQuizzes: 1,
  averageCorrectRate: 80,
  totalTimeTaken: 120
};

let capturedUserIdForAttempts = '';
let capturedUserIdForStats = '';

// Monkey-patch Use Cases
GetUserAttemptsUseCase.prototype.execute = async (userId: string) => {
  capturedUserIdForAttempts = userId;
  return mockAttempts;
};

GetUserStatsUseCase.prototype.execute = async (userId: string) => {
  capturedUserIdForStats = userId;
  return mockStats;
};

const app = express();
app.use(express.json());

const userController = new UserController();

// Đăng ký route test
app.get('/api/users/history', userController.getHistory);

app.use(errorHandler);

const PORT = 6006;
const server = app.listen(PORT, async () => {
  try {
    // ------------------------------------------
    // Case 1: Gửi request kèm userId
    // ------------------------------------------
    console.log('1. Đang test lấy lịch sử với userId xác định...');
    capturedUserIdForAttempts = '';
    capturedUserIdForStats = '';

    const resWithUser = await fetch(`http://localhost:${PORT}/api/users/history?userId=custom-user-id`);
    assert.strictEqual(resWithUser.status, 200);
    const jsonWithUser = await resWithUser.json() as any;
    assert.strictEqual(jsonWithUser.success, true);
    assert.strictEqual(jsonWithUser.data.attempts.length, 1);
    assert.strictEqual(jsonWithUser.data.attempts[0].quizTitle, 'Mock Quiz Title');
    assert.strictEqual(jsonWithUser.data.stats.averageCorrectRate, 80);
    assert.strictEqual(capturedUserIdForAttempts, 'custom-user-id');
    assert.strictEqual(capturedUserIdForStats, 'custom-user-id');
    console.log('✓ Test lấy lịch sử với custom userId thành công!');

    // ------------------------------------------
    // Case 2: Gửi request KHÔNG kèm userId -> dùng mặc định mock-user-123
    // ------------------------------------------
    console.log('\n2. Đang test lấy lịch sử dùng mặc định mock-user-123...');
    capturedUserIdForAttempts = '';
    capturedUserIdForStats = '';

    const resDefault = await fetch(`http://localhost:${PORT}/api/users/history`);
    assert.strictEqual(resDefault.status, 200);
    const jsonDefault = await resDefault.json() as any;
    assert.strictEqual(jsonDefault.success, true);
    assert.strictEqual(capturedUserIdForAttempts, 'mock-user-123');
    assert.strictEqual(capturedUserIdForStats, 'mock-user-123');
    console.log('✓ Test lấy lịch sử dùng mặc định mock-user-123 thành công!');

    console.log('\n=== TẤT CẢ KIỂM THỬ TÍCH HỢP HISTORY API ĐỀU ĐẠT (PASS) ===');

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
