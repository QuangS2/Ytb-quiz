import { BusinessException } from './BusinessException';

export class AuthException extends BusinessException {
  constructor(code: string, message: string) {
    super(code, message);
  }
}
