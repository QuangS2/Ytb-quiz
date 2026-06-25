import { Request, Response, NextFunction } from 'express';
import { BusinessException } from '../../domain/exception/BusinessException';
import { ZodError } from 'zod';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  // 1. Xử lý lỗi nghiệp vụ (BusinessException từ Domain/Application Layer)
  if (err instanceof BusinessException) {
    let status = 400;
    if (err.code === 'QUIZ_NOT_FOUND') {
      status = 404;
    } else if (err.code === 'QUIZ_FORBIDDEN' || err.code === 'AUTH_FORBIDDEN') {
      status = 403;
    } else if (err.code === 'AUTH_UNAUTHORIZED') {
      status = 401;
    }
    return res.status(status).json({
      success: false,
      code: err.code,
      message: err.message
    });
  }

  // 2. Xử lý lỗi Zod Validation
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Dữ liệu yêu cầu không hợp lệ',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  // 3. Xử lý các lỗi hệ thống không xác định (Internal Server Error)
  console.error('[System Error]:', err);
  return res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.'
  });
};
