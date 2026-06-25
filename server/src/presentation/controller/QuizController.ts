import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { GenerateQuizUseCase } from '../../application/usecase/GenerateQuizUseCase';
import { DeleteQuizUseCase } from '../../application/usecase/DeleteQuizUseCase';
import { EvaluateQuestionUseCase } from '../../application/usecase/EvaluateQuestionUseCase';
import { MongoQuizRepository } from '../../infrastructure/persistence/adapter/MongoQuizRepository';
import { MongoLectureContentRepository } from '../../infrastructure/persistence/adapter/MongoLectureContentRepository';
import { YtdlAudioExtractor } from '../../infrastructure/audio/YtdlAudioExtractor';
import { GeminiAIService } from '../../infrastructure/ai/GeminiAIService';
import { GenerateQuizRequestDto } from '../../application/dto/GenerateQuizRequestDto';
import { QuizNotFoundException } from '../../domain/exception/QuizNotFoundException';

// Định nghĩa Schema validate request đầu vào bằng Zod
export const GetQuizByIdRequestSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'ID bài trắc nghiệm là bắt buộc' })
  })
});

export const GenerateQuizRequestSchema = z.object({
  body: z.object({
    url: z.string().url({ message: 'URL video YouTube là bắt buộc và phải đúng định dạng liên kết' }),
    creatorId: z.string().optional()
  })
});

export const DeleteQuizRequestSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'ID bài trắc nghiệm là bắt buộc' })
  }),
  query: z.object({
    userId: z.string().optional()
  })
});

export const VoteQuestionRequestSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'ID bài trắc nghiệm là bắt buộc' }),
    questionId: z.string().min(1, { message: 'ID câu hỏi là bắt buộc' })
  }),
  body: z.object({
    type: z.enum(['up', 'down'], { message: 'Kiểu vote phải là up hoặc down' }),
    userId: z.string().optional()
  })
});

export class QuizController {
  private readonly generateQuizUseCase: GenerateQuizUseCase;
  private readonly deleteQuizUseCase: DeleteQuizUseCase;
  private readonly evaluateQuestionUseCase: EvaluateQuestionUseCase;

  private readonly quizRepo: MongoQuizRepository;

  constructor() {
    // Dependency Injection trực tiếp (hoặc qua Container nếu mở rộng)
    const quizRepo = new MongoQuizRepository();
    const lectureRepo = new MongoLectureContentRepository();
    const audioExtractor = new YtdlAudioExtractor();
    const aiService = new GeminiAIService();

    this.quizRepo = quizRepo;
    this.generateQuizUseCase = new GenerateQuizUseCase(
      quizRepo,
      lectureRepo,
      audioExtractor,
      aiService
    );
    this.deleteQuizUseCase = new DeleteQuizUseCase(quizRepo);
    this.evaluateQuestionUseCase = new EvaluateQuestionUseCase(
      quizRepo,
      lectureRepo,
      aiService
    );
  }

  public getQuizById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const quiz = await this.quizRepo.findById(id);

      if (!quiz) {
        throw new QuizNotFoundException(id);
      }

      res.status(200).json({
        success: true,
        data: quiz
      });
    } catch (error) {
      next(error);
    }
  };

  public generateQuiz = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // req.geminiKey được middleware geminiKeyRequired gán vào
      const apiKey = req.geminiKey!;
      
      const performance = req.headers['x-device-performance'] === 'high' ? 'high' : 'low';

      const dto: GenerateQuizRequestDto = {
        url: req.body.url,
        creatorId: req.user?.id || req.body.creatorId || 'mock-creator-123',
        apiKey: apiKey,
        devicePerformance: performance
      };

      const quiz = await this.generateQuizUseCase.execute(dto);

      res.status(200).json({
        success: true,
        data: quiz
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteQuiz = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id: quizId } = req.params;
      const userId = req.user?.id || (req.query.userId as string) || 'mock-user-123';

      await this.deleteQuizUseCase.execute({ quizId, userId });

      res.status(200).json({
        success: true,
        message: 'Đã xóa bài trắc nghiệm thành công.'
      });
    } catch (error) {
      next(error);
    }
  };

  public voteQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id: quizId, questionId } = req.params;
      const { type, userId } = req.body;
      const apiKey = req.geminiKey; // Trích xuất từ header x-gemini-key

      const quiz = await this.evaluateQuestionUseCase.execute({
        quizId,
        questionId,
        type,
        userId: req.user?.id || userId || 'mock-user-123',
        apiKey
      });

      res.status(200).json({
        success: true,
        message: 'Đã biểu quyết câu hỏi thành công.',
        data: quiz
      });
    } catch (error) {
      next(error);
    }
  };
}
