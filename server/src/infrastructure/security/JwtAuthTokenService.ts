import jwt from 'jsonwebtoken';
import { AuthTokenServicePort, TokenPayload } from '../../application/port/output/AuthTokenServicePort';
import { User } from '../../domain/model/User';
import { AuthException } from '../../domain/exception/AuthException';

export class JwtAuthTokenService implements AuthTokenServicePort {
  private readonly secretKey: string;

  constructor() {
    this.secretKey = process.env.JWT_SECRET || 'default-jwt-secret-key-change-me-in-production';
  }

  public generateToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email
    };
    // Hạn của token là 7 ngày
    return jwt.sign(payload, this.secretKey, { expiresIn: '7d' });
  }

  public verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.secretKey) as any;
      return {
        userId: decoded.userId,
        email: decoded.email
      };
    } catch (error) {
      throw new AuthException('AUTH_UNAUTHORIZED', 'Phiên làm việc đã hết hạn hoặc không hợp lệ.');
    }
  }
}
