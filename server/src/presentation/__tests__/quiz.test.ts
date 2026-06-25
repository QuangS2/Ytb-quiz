import assert from 'node:assert';
import express from 'express';
import { geminiKeyRequired } from '../middleware/GeminiKeyMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { errorHandler } from '../middleware/ErrorHandler';
import { GenerateQuizRequestSchema } from '../controller/QuizController';

console.log('=== BẮT ĐẦU CHẠY PRESENTATION INTEGRATION TEST CHO QUIZ API ===\n');

const app = express();
app.use(express.json());

// Thiết lập endpoint giả lập cho test
app.post(
  '/api/quizzes/generate',
  geminiKeyRequired,
  validateRequest(GenerateQuizRequestSchema),
  (req, res) => {
    res.json({
      success: true,
      data: {
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Mock Video Title',
        url: req.body.url,
        apiKey: req.geminiKey
      }
    });
  }
);

app.use(errorHandler);

const PORT = 6003;
const server = app.listen(PORT, async () => {
  try {
    // ------------------------------------------
    // Case 1: Thiếu header x-gemini-key
    // ------------------------------------------
    console.log('1. Đang test trường hợp thiếu x-gemini-key header...');
    const resNoKey = await fetch(`http://localhost:${PORT}/api/quizzes/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
    });

    assert.strictEqual(resNoKey.status, 400);
    const jsonNoKey = await resNoKey.json() as any;
    assert.strictEqual(jsonNoKey.success, false);
    assert.strictEqual(jsonNoKey.code, 'INVALID_GEMINI_KEY');
    assert.match(jsonNoKey.message, /bắt buộc/);
    console.log('✓ Test thiếu header thành công!');

    // ------------------------------------------
    // Case 2: Dữ liệu url không đúng định dạng (XSS / Injection / URL Rác)
    // ------------------------------------------
    console.log('\n2. Đang test trường hợp URL không đúng định dạng (Zod Validation)...');
    const resBadUrl = await fetch(`http://localhost:${PORT}/api/quizzes/generate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-gemini-key': 'mock-gemini-key-123'
      },
      body: JSON.stringify({ url: 'invalid-url-string' })
    });

    assert.strictEqual(resBadUrl.status, 400);
    const jsonBadUrl = await resBadUrl.json() as any;
    assert.strictEqual(jsonBadUrl.success, false);
    assert.strictEqual(jsonBadUrl.code, 'VALIDATION_ERROR');
    assert.ok(jsonBadUrl.errors.length > 0);
    assert.strictEqual(jsonBadUrl.errors[0].field, 'body.url');
    console.log('✓ Test chặn URL rác thành công!');

    // ------------------------------------------
    // Case 3: Request đúng cấu trúc
    // ------------------------------------------
    console.log('\n3. Đang test trường hợp gửi request hợp lệ...');
    const resSuccess = await fetch(`http://localhost:${PORT}/api/quizzes/generate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-gemini-key': 'mock-gemini-key-123'
      },
      body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
    });

    assert.strictEqual(resSuccess.status, 200);
    const jsonSuccess = await resSuccess.json() as any;
    assert.strictEqual(jsonSuccess.success, true);
    assert.strictEqual(jsonSuccess.data.youtubeId, 'dQw4w9WgXcQ');
    assert.strictEqual(jsonSuccess.data.apiKey, 'mock-gemini-key-123');
    console.log('✓ Test request hợp lệ thành công!');

    console.log('\n=== TẤT CẢ KIỂM THỬ TÍCH HỢP QUIZ API ĐỀU ĐẠT (PASS) ===');

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
