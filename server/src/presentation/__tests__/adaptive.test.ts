import assert from 'node:assert';
import express from 'express';
import { QuizController, GenerateQuizRequestSchema } from '../controller/QuizController';
import { GenerateQuizUseCase } from '../../application/usecase/GenerateQuizUseCase';
import { geminiKeyRequired } from '../middleware/GeminiKeyMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { errorHandler } from '../middleware/ErrorHandler';
import { Quiz } from '../../domain/model/Quiz';

console.log('=== BẮT ĐẦU CHẠY PRESENTATION INTEGRATION TEST CHO ADAPTIVE FLOW ===\n');

const mockQuiz = new Quiz(
  'quiz-abc-123',
  'lecture-123',
  'user-123',
  'dQw4w9WgXcQ',
  'Cached Quiz Title',
  'Cached Quiz Desc',
  []
);

let backgroundRefinementCalled = false;

// Mock GenerateQuizUseCase.prototype.execute
GenerateQuizUseCase.prototype.execute = async (dto) => {
  if (dto.devicePerformance === 'high') {
    backgroundRefinementCalled = true;
  }
  return mockQuiz;
};

const app = express();
app.use(express.json());

const quizController = new QuizController();

app.post(
  '/api/quizzes/generate',
  geminiKeyRequired,
  validateRequest(GenerateQuizRequestSchema),
  quizController.generateQuiz
);

app.use(errorHandler);

const PORT = 6005;
const server = app.listen(PORT, async () => {
  try {
    // ------------------------------------------
    // Case 1: Header x-device-performance == 'low' (hoặc trống)
    // ------------------------------------------
    console.log('1. Đang test trường hợp x-device-performance == "low"...');
    backgroundRefinementCalled = false;
    const resLow = await fetch(`http://localhost:${PORT}/api/quizzes/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-key': 'valid-api-key-123',
        'x-device-performance': 'low'
      },
      body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
    });

    assert.strictEqual(resLow.status, 200);
    const jsonLow = await resLow.json() as any;
    assert.strictEqual(jsonLow.success, true);
    assert.strictEqual(jsonLow.data.id, 'quiz-abc-123');
    assert.strictEqual(backgroundRefinementCalled, false, 'Không được gọi chạy ngầm ở chế độ low');
    console.log('✓ Test chế độ máy yếu thành công!');

    // ------------------------------------------
    // Case 2: Header x-device-performance == 'high'
    // ------------------------------------------
    console.log('\n2. Đang test trường hợp x-device-performance == "high"...');
    backgroundRefinementCalled = false;
    const resHigh = await fetch(`http://localhost:${PORT}/api/quizzes/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-key': 'valid-api-key-123',
        'x-device-performance': 'high'
      },
      body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
    });

    assert.strictEqual(resHigh.status, 200);
    const jsonHigh = await resHigh.json() as any;
    assert.strictEqual(jsonHigh.success, true);
    assert.strictEqual(jsonHigh.data.id, 'quiz-abc-123');
    assert.strictEqual(backgroundRefinementCalled, true, 'Bắt buộc phải gọi chạy ngầm ở chế độ high');
    console.log('✓ Test chế độ máy mạnh và kích hoạt chạy ngầm thành công!');

    console.log('\n=== TẤT CẢ KIỂM THỬ TÍCH HỢP ADAPTIVE FLOW ĐỀU ĐẠT (PASS) ===');

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
