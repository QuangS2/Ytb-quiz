import { Request, Response, NextFunction } from 'express';
import { JwtAuthTokenService } from '../../infrastructure/security/JwtAuthTokenService';
import { AuthException } from '../../domain/exception/AuthException';

const tokenService = new JwtAuthTokenService();

// Mở rộng interface Request của Express để chứa thuộc tính user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

// Middleware trích xuất token nhưng không bắt buộc đăng nhập (cho phép mock fallback hoặc chế độ ẩn danh)
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = tokenService.verifyToken(token);
      req.user = {
        id: payload.userId,
        email: payload.email
      };
    } catch (error) {
      // Bỏ qua lỗi token nếu là optional auth, cho phép fallback
    }
  }
  next();
};

// Middleware bắt buộc đăng nhập
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AuthException('AUTH_UNAUTHORIZED', 'Cần truyền Header Authorization dạng Bearer <token>.'));
  }

  const token = authHeader.substring(7);
  try {
    const payload = tokenService.verifyToken(token);
    req.user = {
      id: payload.userId,
      email: payload.email
    };
    next();
  } catch (error) {
    next(error);
  }
};
