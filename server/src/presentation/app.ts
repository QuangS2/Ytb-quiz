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
  origin: (origin, callback) => {
    // Nếu không có origin (ví dụ gọi từ Postman, curl, hoặc server-to-server)
    if (!origin) return callback(null, true);
    
    // Danh sách các domain được phép
    const allowedOrigins = [
      process.env.FRONTEND_URL, // Domain production từ Railway/Render (vd: https://ytb-quiz.pages.dev)
      'http://localhost:5173',  // Local frontend
      'http://127.0.0.1:5173',  // Local frontend (IP)
      /\.workers\.dev$/,        // Cloudflare Workers preview
      /\.pages\.dev$/           // Cloudflare Pages preview
    ];

    // Kiểm tra xem origin gửi lên có khớp với bất kỳ domain nào trong danh sách không
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (!allowedOrigin) return false;
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      }
      return allowedOrigin.test(origin); // Dành cho regex
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('CORS Policy: Origin not allowed'), false);
    }
  },
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

app.get('/api/debug-env', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const distPath = path.join(process.cwd(), 'dist');
    const binaryPath = path.join(distPath, 'yt-dlp');
    const logPath = path.join(distPath, 'download-log.txt');
    
    let distFiles: string[] = [];
    if (fs.existsSync(distPath)) {
      distFiles = fs.readdirSync(distPath);
    }
    
    let downloadLog = 'No log found';
    if (fs.existsSync(logPath)) {
      downloadLog = fs.readFileSync(logPath, 'utf8');
    }
    
    let binaryInfo = {};
    if (fs.existsSync(binaryPath)) {
      const stats = fs.statSync(binaryPath);
      binaryInfo = {
        exists: true,
        size: stats.size,
        mode: stats.mode
      };
    } else {
      binaryInfo = { exists: false };
    }
    
    res.json({
      cwd: process.cwd(),
      platform: process.platform,
      distExists: fs.existsSync(distPath),
      distFiles,
      binaryInfo,
      downloadLog
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
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
    
    // Log chẩn đoán môi trường yt-dlp
    try {
      const fs = require('fs');
      const path = require('path');
      const distPath = path.join(process.cwd(), 'dist');
      const binaryPath = path.join(distPath, 'yt-dlp');
      console.log(`[Diagnostic] process.cwd(): ${process.cwd()}`);
      console.log(`[Diagnostic] dist folder exists: ${fs.existsSync(distPath)}`);
      if (fs.existsSync(distPath)) {
        console.log(`[Diagnostic] dist files: ${fs.readdirSync(distPath).join(', ')}`);
      }
      console.log(`[Diagnostic] binaryPath exists: ${fs.existsSync(binaryPath)}`);
      if (fs.existsSync(binaryPath)) {
        const stats = fs.statSync(binaryPath);
        console.log(`[Diagnostic] binaryPath size: ${stats.size} bytes`);
        console.log(`[Diagnostic] binaryPath mode: ${stats.mode}`);
      }
    } catch (diagErr: any) {
      console.error('[Diagnostic] Error during environment check:', diagErr.message);
    }

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

export default app;
