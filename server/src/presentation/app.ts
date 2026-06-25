import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { errorHandler } from './middleware/ErrorHandler';
import { geminiKeyRequired, extractGeminiKey } from './middleware/GeminiKeyMiddleware';
import { validateRequest } from './middleware/validateRequest';
import { ConfigController } from './controller/ConfigController';
import { QuizController, GenerateQuizRequestSchema, DeleteQuizRequestSchema, VoteQuestionRequestSchema, GetQuizByIdRequestSchema } from './controller/QuizController';
import { AttemptController, SubmitAttemptRequestSchema } from './controller/AttemptController';
import { UserController } from './controller/UserController';
import { AuthController, LoginRequestSchema } from './controller/AuthController';
import { optionalAuth, requireAuth } from './middleware/AuthMiddleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-gemini-key', 'x-device-performance'],
}));
app.use(express.json());

const configController = new ConfigController();
const quizController = new QuizController();
const attemptController = new AttemptController();
const userController = new UserController();
const authController = new AuthController();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Ytb-quiz backend is running.' });
});

// Xác thực & Đăng nhập Google OAuth
app.post(
  '/api/auth/google',
  validateRequest(LoginRequestSchema),
  authController.loginGoogle
);

// Cấu hình API Key
app.post('/api/config/validate-key', geminiKeyRequired, configController.validateKey);

// Sinh Quiz từ Video YouTube (sử dụng optionalAuth để trích xuất thông tin người dùng nếu có đăng nhập)
app.post(
  '/api/quizzes/generate',
  geminiKeyRequired,
  optionalAuth,
  validateRequest(GenerateQuizRequestSchema),
  quizController.generateQuiz
);

// Lấy thông tin chi tiết bài trắc nghiệm theo ID
app.get(
  '/api/quizzes/:id',
  optionalAuth,
  validateRequest(GetQuizByIdRequestSchema),
  quizController.getQuizById
);

// Xóa bài trắc nghiệm khỏi thư viện (sử dụng optionalAuth)
app.delete(
  '/api/quizzes/:id',
  optionalAuth,
  validateRequest(DeleteQuizRequestSchema),
  quizController.deleteQuiz
);

// Biểu quyết tốt/xấu cho câu hỏi (Tự phục hồi - Self-Healing)
app.post(
  '/api/quizzes/:id/questions/:questionId/vote',
  optionalAuth,
  extractGeminiKey,
  validateRequest(VoteQuestionRequestSchema),
  quizController.voteQuestion
);

// Nộp bài trắc nghiệm (Full Test / Instant Feedback - sử dụng optionalAuth)
app.post(
  '/api/quizzes/:id/attempts',
  optionalAuth,
  validateRequest(SubmitAttemptRequestSchema),
  attemptController.submitAttempt
);

// Xem lịch sử học tập & Thống kê (sử dụng optionalAuth)
app.get('/api/users/history', optionalAuth, userController.getHistory);

// Register Global Exception Handler
app.use(errorHandler);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ytb-quiz';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully.');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

export default app;
