export interface GoogleUserDto {
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl: string;
}

export interface OAuthServicePort {
  verifyCode(code: string, redirectUri?: string): Promise<GoogleUserDto>;
}
