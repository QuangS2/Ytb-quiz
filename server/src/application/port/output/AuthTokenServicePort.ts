import { User } from '../../../domain/model/User';

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface AuthTokenServicePort {
  generateToken(user: User): string;
  verifyToken(token: string): TokenPayload;
}
