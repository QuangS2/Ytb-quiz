import { Request, Response, NextFunction } from 'express';
import { ValidateApiKeyUseCase } from '../../application/usecase/ValidateApiKeyUseCase';
import { GeminiAIService } from '../../infrastructure/ai/GeminiAIService';

export class ConfigController {
  private readonly validateApiKeyUseCase: ValidateApiKeyUseCase;

  constructor() {
    // Khởi tạo Dependency Injection trực tiếp ở Presentation (hoặc qua Container nếu có)
    const geminiService = new GeminiAIService();
    this.validateApiKeyUseCase = new ValidateApiKeyUseCase(geminiService);
  }

  public validateKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // req.geminiKey đã được gán bởi middleware geminiKeyRequired
      const key = req.geminiKey!;
      
      await this.validateApiKeyUseCase.execute(key);
      
      res.json({
        success: true,
        message: 'Khóa API Gemini hoạt động tốt.'
      });
    } catch (error) {
      next(error);
    }
  };
}
