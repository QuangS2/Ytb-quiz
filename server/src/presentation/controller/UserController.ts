import { Request, Response, NextFunction } from 'express';
import { GetUserAttemptsUseCase } from '../../application/usecase/GetUserAttemptsUseCase';
import { GetUserStatsUseCase } from '../../application/usecase/GetUserStatsUseCase';
import { MongoQuizAttemptRepository } from '../../infrastructure/persistence/adapter/MongoQuizAttemptRepository';
import { MongoQuizRepository } from '../../infrastructure/persistence/adapter/MongoQuizRepository';

export class UserController {
  private readonly getUserAttemptsUseCase: GetUserAttemptsUseCase;
  private readonly getUserStatsUseCase: GetUserStatsUseCase;

  constructor() {
    const attemptRepo = new MongoQuizAttemptRepository();
    const quizRepo = new MongoQuizRepository();
    this.getUserAttemptsUseCase = new GetUserAttemptsUseCase(attemptRepo, quizRepo);
    this.getUserStatsUseCase = new GetUserStatsUseCase(attemptRepo);
  }

  public getHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Đọc userId từ JWT token (nếu có) hoặc query parameter, mặc định là 'mock-user-123'
      const userId = req.user?.id || (req.query.userId as string) || 'mock-user-123';

      const attempts = await this.getUserAttemptsUseCase.execute(userId);
      const stats = await this.getUserStatsUseCase.execute(userId);

      res.status(200).json({
        success: true,
        data: {
          attempts,
          stats
        }
      });
    } catch (error) {
      next(error);
    }
  };
}
