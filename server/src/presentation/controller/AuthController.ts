import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { LoginUserUseCase } from '../../application/usecase/LoginUserUseCase';
import { MongoUserRepository } from '../../infrastructure/persistence/adapter/MongoUserRepository';
import { GoogleOAuthService } from '../../infrastructure/security/GoogleOAuthService';
import { JwtAuthTokenService } from '../../infrastructure/security/JwtAuthTokenService';

// Định nghĩa Zod Schema validate request login Google
export const LoginRequestSchema = z.object({
  body: z.object({
    code: z.string().min(1, { message: 'Mã Google OAuth authorization code là bắt buộc.' }),
    redirectUri: z.string().url({ message: 'Redirect URI phải là một URL hợp lệ.' }).optional()
  })
});

export class AuthController {
  private readonly loginUserUseCase: LoginUserUseCase;

  constructor() {
    const userRepository = new MongoUserRepository();
    const oauthService = new GoogleOAuthService();
    const authTokenService = new JwtAuthTokenService();

    this.loginUserUseCase = new LoginUserUseCase(
      userRepository,
      oauthService,
      authTokenService
    );
  }

  public loginGoogle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code, redirectUri } = req.body;
      const result = await this.loginUserUseCase.execute({ code, redirectUri });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}
