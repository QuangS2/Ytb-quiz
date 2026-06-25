import { BusinessException } from './BusinessException';

export class InvalidGeminiApiKeyException extends BusinessException {
  constructor(message = 'Khóa API Gemini không hợp lệ hoặc không có quyền truy cập.') {
    super('INVALID_GEMINI_KEY', message);
  }
}
