import { Request, Response, NextFunction } from 'express';
import { InvalidGeminiApiKeyException } from '../../domain/exception/InvalidGeminiApiKeyException';

// Mở rộng interface Request của Express để chứa thuộc tính geminiKey
declare global {
  namespace Express {
    interface Request {
      geminiKey?: string;
    }
  }
}

// Middleware chỉ trích xuất key (nếu có) nhưng không chặn request
export const extractGeminiKey = (req: Request, res: Response, next: NextFunction) => {
  const key = req.headers['x-gemini-key'];
  if (key && typeof key === 'string') {
    req.geminiKey = key;
  }
  next();
};

// Middleware bắt buộc phải truyền key qua header x-gemini-key
export const geminiKeyRequired = (req: Request, res: Response, next: NextFunction) => {
  const key = req.headers['x-gemini-key'];
  
  if (!key || typeof key !== 'string' || key.trim() === '') {
    return next(new InvalidGeminiApiKeyException('Khóa API Gemini là bắt buộc qua header x-gemini-key.'));
  }
  
  req.geminiKey = key;
  next();
};
