import assert from 'node:assert';
import express from 'express';
import { ValidateApiKeyUseCase } from '../../application/usecase/ValidateApiKeyUseCase';
import { InvalidGeminiApiKeyException } from '../../domain/exception/InvalidGeminiApiKeyException';
import { AIServicePort } from '../../application/port/output/AIServicePort';
import { geminiKeyRequired } from '../middleware/GeminiKeyMiddleware';
import { errorHandler } from '../middleware/ErrorHandler';
import { Readable } from 'stream';
import { Question } from '../../domain/model/Quiz';

console.log('=== BẮT ĐẦU CHẠY KIỂM THỬ UC_CONFIGKEY ===\n');

// 1. Mock AI Service Port
class MockAIService implements AIServicePort {
  constructor(private readonly shouldPass: boolean) {}

  public async validateApiKey(apiKey: string): Promise<boolean> {
    return this.shouldPass;
  }

  public async extractLectureContent(
    audioStream: Readable,
    mimeType: string,
    apiKey: string
  ): Promise<{ refinedScript: string; title: string; qualityScore: number }> {
    return { refinedScript: '', title: '', qualityScore: 0 };
  }

  public async generateQuizFromContent(
    refinedScript: string,
    apiKey: string
  ): Promise<Omit<Question, 'metrics'>[]> {
    return [];
  }

  public async mergeAndRefineScripts(
    oldScript: string,
    newScript: string,
    apiKey: string
  ): Promise<string> {
    return '';
  }

  public async generateReplacementQuestion(
    refinedScript: string,
    faultyQuestion: Omit<Question, 'metrics'>,
    apiKey: string
  ): Promise<Omit<Question, 'metrics'>> {
    return {
      id: faultyQuestion.id,
      text: '',
      options: [],
      correctOptionIndex: 0,
      explanation: ''
    };
  }
}

async function runTests() {
  try {
    // ==========================================
    // 1. UNIT TEST CHO ValidateApiKeyUseCase
    // ==========================================
    console.log('1. Đang chạy Unit Test cho ValidateApiKeyUseCase...');

    // Case A: API Key trống
    const useCaseEmpty = new ValidateApiKeyUseCase(new MockAIService(true));
    await assert.rejects(
      async () => {
        await useCaseEmpty.execute('');
      },
      (err: any) => {
        assert.ok(err instanceof InvalidGeminiApiKeyException);
        assert.strictEqual(err.code, 'INVALID_GEMINI_KEY');
        assert.match(err.message, /bắt buộc/);
        return true;
      },
      'Lẽ ra phải ném lỗi InvalidGeminiApiKeyException do API Key trống'
    );

    // Case B: API Key không hoạt động (validate thất bại)
    const useCaseFail = new ValidateApiKeyUseCase(new MockAIService(false));
    await assert.rejects(
      async () => {
        await useCaseFail.execute('invalid-key-123');
      },
      (err: any) => {
        assert.ok(err instanceof InvalidGeminiApiKeyException);
        assert.strictEqual(err.code, 'INVALID_GEMINI_KEY');
        assert.match(err.message, /không hoạt động/);
        return true;
      },
      'Lẽ ra phải ném lỗi InvalidGeminiApiKeyException do API Key không hoạt động'
    );

    // Case C: API Key hợp lệ
    const useCaseSuccess = new ValidateApiKeyUseCase(new MockAIService(true));
    const result = await useCaseSuccess.execute('valid-key-abc');
    assert.strictEqual(result, true, 'Lẽ ra phải xác thực thành công');

    console.log('✓ Unit Test ValidateApiKeyUseCase thành công!');

    // ==========================================
    // 2. INTEGRATION TEST CHO API ENDPOINT
    // ==========================================
    console.log('\n2. Đang chạy Integration Test cho API endpoint /api/config/validate-key...');

    const app = express();
    app.use(express.json());

    // Cài đặt route test sử dụng mock và middleware
    app.post(
      '/api/config/validate-key',
      geminiKeyRequired,
      async (req, res, next) => {
        try {
          const key = req.geminiKey!;
          // Giả định key bắt đầu bằng 'valid-' thì pass, ngược lại fail
          const mockService = new MockAIService(key.startsWith('valid-'));
          const uc = new ValidateApiKeyUseCase(mockService);
          await uc.execute(key);
          res.json({ success: true, message: 'Khóa API Gemini hoạt động tốt.' });
        } catch (error) {
          next(error);
        }
      }
    );

    app.use(errorHandler);

    const PORT = 6002;
    const server = app.listen(PORT, async () => {
      try {
        // Case A: Request thiếu header x-gemini-key
        const resMissing = await fetch(`http://localhost:${PORT}/api/config/validate-key`, {
          method: 'POST'
        });
        assert.strictEqual(resMissing.status, 400);
        const jsonMissing = await resMissing.json() as any;
        assert.strictEqual(jsonMissing.success, false);
        assert.strictEqual(jsonMissing.code, 'INVALID_GEMINI_KEY');
        assert.match(jsonMissing.message, /bắt buộc/);

        // Case B: Request truyền key sai
        const resInvalid = await fetch(`http://localhost:${PORT}/api/config/validate-key`, {
          method: 'POST',
          headers: { 'x-gemini-key': 'wrong-key' }
        });
        assert.strictEqual(resInvalid.status, 400);
        const jsonInvalid = await resInvalid.json() as any;
        assert.strictEqual(jsonInvalid.success, false);
        assert.strictEqual(jsonInvalid.code, 'INVALID_GEMINI_KEY');
        assert.match(jsonInvalid.message, /không hoạt động/);

        // Case C: Request truyền key đúng
        const resSuccess = await fetch(`http://localhost:${PORT}/api/config/validate-key`, {
          method: 'POST',
          headers: { 'x-gemini-key': 'valid-api-key-here' }
        });
        assert.strictEqual(resSuccess.status, 200);
        const jsonSuccess = await resSuccess.json() as any;
        assert.strictEqual(jsonSuccess.success, true);
        assert.strictEqual(jsonSuccess.message, 'Khóa API Gemini hoạt động tốt.');

        console.log('✓ Integration Test API validate-key thành công!');
        console.log('\n=== TẤT CẢ KIỂM THỬ CHO UC_CONFIGKEY ĐỀU ĐẠT (PASS) ===');

        server.close(() => {
          setTimeout(() => {
            process.exit(0);
          }, 100);
        });
      } catch (error) {
        console.error('❌ INTEGRATION TEST THẤT BẠI:');
        console.error(error);
        server.close(() => {
          setTimeout(() => {
            process.exit(1);
          }, 100);
        });
      }
    });

  } catch (error) {
    console.error('❌ UNIT TEST THẤT BẠI:');
    console.error(error);
    process.exit(1);
  }
}

runTests();
