import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SubmitQuizUseCase } from '../../application/usecase/SubmitQuizUseCase';
import { MongoQuizRepository } from '../../infrastructure/persistence/adapter/MongoQuizRepository';
import { MongoQuizAttemptRepository } from '../../infrastructure/persistence/adapter/MongoQuizAttemptRepository';

export const SubmitAttemptRequestSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'ID bài trắc nghiệm là bắt buộc' })
  }),
  body: z.object({
    answers: z.array(
      z.object({
        questionId: z.string().min(1, { message: 'ID câu hỏi là bắt buộc' }),
        selectedOptionIndex: z.number().int().nonnegative({ message: 'Lựa chọn đáp án phải là số không âm' })
      })
    ).min(1, { message: 'Danh sách đáp án không được trống' }),
    timeTaken: z.number().int().nonnegative({ message: 'Thời gian làm bài phải là số nguyên không âm' }),
    mode: z.enum(['full-test', 'instant-feedback']).optional(),
    userId: z.string().optional()
  })
});

export class AttemptController {
  private readonly submitQuizUseCase: SubmitQuizUseCase;

  constructor() {
    const quizRepo = new MongoQuizRepository();
    const attemptRepo = new MongoQuizAttemptRepository();
    this.submitQuizUseCase = new SubmitQuizUseCase(quizRepo, attemptRepo);
  }

  public submitAttempt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id: quizId } = req.params;
      const { answers, timeTaken, mode, userId } = req.body;

      const dto = {
        quizId,
        userId: req.user?.id || userId || 'mock-user-123',
        answers,
        timeTaken,
        mode: mode || 'full-test'
      };

      const result = await this.submitQuizUseCase.execute(dto);

      // Trả về DTO kết quả làm bài kèm thông tin đáp án và giải thích của từng câu hỏi
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}
