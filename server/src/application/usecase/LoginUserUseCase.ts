import { randomUUID } from 'crypto';
import { UserRepositoryPort } from '../port/output/UserRepositoryPort';
import { OAuthServicePort } from '../port/output/OAuthServicePort';
import { AuthTokenServicePort } from '../port/output/AuthTokenServicePort';
import { LoginRequestDto } from '../dto/LoginRequestDto';
import { LoginResponseDto } from '../dto/LoginResponseDto';
import { User } from '../../domain/model/User';

export class LoginUserUseCase {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly oauthService: OAuthServicePort,
    private readonly authTokenService: AuthTokenServicePort
  ) {}

  public async execute(dto: LoginRequestDto): Promise<LoginResponseDto> {
    // 1. Xác thực code qua OAuth Service lấy thông tin người dùng Google
    const googleUser = await this.oauthService.verifyCode(dto.code, dto.redirectUri);

    // 2. Tìm kiếm người dùng hiện tại theo googleId
    let user = await this.userRepository.findByGoogleId(googleUser.googleId);

    if (user) {
      // Cập nhật thông tin profile nếu có thay đổi từ phía Google
      let hasChanges = false;
      if (user.displayName !== googleUser.displayName) {
        user.displayName = googleUser.displayName;
        hasChanges = true;
      }
      if (user.avatarUrl !== googleUser.avatarUrl) {
        user.avatarUrl = googleUser.avatarUrl;
        hasChanges = true;
      }
      if (user.email !== googleUser.email) {
        user.email = googleUser.email;
        hasChanges = true;
      }

      if (hasChanges) {
        user = await this.userRepository.save(user);
      }
    } else {
      // 3. Nếu chưa tồn tại, tạo mới thực thể User
      const newUserId = randomUUID();
      user = new User(
        newUserId,
        googleUser.googleId,
        googleUser.email,
        googleUser.displayName,
        googleUser.avatarUrl
      );
      user = await this.userRepository.save(user);
    }

    // 4. Tạo token JWT làm phiên đăng nhập
    const token = this.authTokenService.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl
      }
    };
  }
}
