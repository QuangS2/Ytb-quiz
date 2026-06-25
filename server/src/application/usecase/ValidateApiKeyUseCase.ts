import { AIServicePort } from '../port/output/AIServicePort';
import { InvalidGeminiApiKeyException } from '../../domain/exception/InvalidGeminiApiKeyException';

export class ValidateApiKeyUseCase {
  constructor(private readonly aiServicePort: AIServicePort) {}

  public async execute(apiKey: string): Promise<boolean> {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
      throw new InvalidGeminiApiKeyException('Khóa API Gemini là bắt buộc và không được để trống.');
    }

    const isValid = await this.aiServicePort.validateApiKey(apiKey);
    if (!isValid) {
      throw new InvalidGeminiApiKeyException('Khóa API Gemini không hoạt động hoặc không có quyền truy cập.');
    }

    return true;
  }
}
