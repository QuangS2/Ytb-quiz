export interface LoginResponseDto {
  token: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string;
  };
}
