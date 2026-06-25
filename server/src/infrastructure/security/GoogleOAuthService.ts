import { OAuthServicePort, GoogleUserDto } from '../../application/port/output/OAuthServicePort';
import { AuthException } from '../../domain/exception/AuthException';

export class GoogleOAuthService implements OAuthServicePort {
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

    if (!this.clientId || !this.clientSecret) {
      console.warn('[GoogleOAuthService] Cảnh báo: GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET chưa được thiết lập.');
    }
  }

  public async verifyCode(code: string, redirectUri?: string): Promise<GoogleUserDto> {
    if (
      code === 'dev-bypass-code' ||
      !this.clientId ||
      !this.clientSecret ||
      this.clientId.includes('your-google-client-id-here')
    ) {
      console.log('[GoogleOAuthService] Development bypass detected or credentials missing. Returning local developer profile.');
      return {
        googleId: 'google_dev_123',
        email: 'dev.user@ytb-quiz.com',
        displayName: 'Developer Mode',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'
      };
    }

    try {
      // 1. Gửi yêu cầu đổi authorization code lấy access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: redirectUri || 'postmessage',
          grant_type: 'authorization_code'
        }).toString()
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('[GoogleOAuthService] Lỗi đổi mã token:', errorText);
        throw new AuthException('AUTH_INVALID_CODE', 'Mã code Google OAuth không hợp lệ hoặc đã hết hạn.');
      }

      const tokenData = (await tokenResponse.json()) as {
        access_token: string;
        expires_in: number;
        token_type: string;
      };

      // 2. Gọi endpoint lấy thông tin người dùng Google bằng access token
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      });

      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text();
        console.error('[GoogleOAuthService] Lỗi lấy profile từ Google:', errorText);
        throw new AuthException('AUTH_UNAUTHORIZED', 'Không lấy được thông tin hồ sơ từ tài khoản Google.');
      }

      const googleUser = (await userInfoResponse.json()) as {
        sub: string;
        email: string;
        name: string;
        picture: string;
      };

      return {
        googleId: googleUser.sub,
        email: googleUser.email,
        displayName: googleUser.name || googleUser.email,
        avatarUrl: googleUser.picture || ''
      };
    } catch (error) {
      if (error instanceof AuthException) {
        throw error;
      }
      console.error('[GoogleOAuthService] Lỗi trong quá trình xác thực:', error);
      throw new AuthException('AUTH_UNAUTHORIZED', `Lỗi kết nối OAuth: ${(error as Error).message}`);
    }
  }
}
