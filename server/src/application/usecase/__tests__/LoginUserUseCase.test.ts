import assert from 'node:assert';
import { LoginUserUseCase } from '../LoginUserUseCase';
import { UserRepositoryPort } from '../../port/output/UserRepositoryPort';
import { OAuthServicePort, GoogleUserDto } from '../../port/output/OAuthServicePort';
import { AuthTokenServicePort, TokenPayload } from '../../port/output/AuthTokenServicePort';
import { User } from '../../../domain/model/User';

console.log('=== BẮT ĐẦU CHẠY UNIT TEST CHO LOGIN USER USE CASE ===\n');

class MockUserRepository implements UserRepositoryPort {
  public users: User[] = [];

  public async save(user: User): Promise<User> {
    const index = this.users.findIndex((u) => u.id === user.id);
    if (index !== -1) {
      this.users[index] = user;
    } else {
      this.users.push(user);
    }
    return user;
  }

  public async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) || null;
  }

  public async findByGoogleId(googleId: string): Promise<User | null> {
    return this.users.find((u) => u.googleId === googleId) || null;
  }

  public async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) || null;
  }
}

class MockOAuthService implements OAuthServicePort {
  public mockUser: GoogleUserDto = {
    googleId: 'g-123',
    email: 'test@gmail.com',
    displayName: 'Test User',
    avatarUrl: 'http://avatar.url'
  };

  public async verifyCode(code: string, redirectUri?: string): Promise<GoogleUserDto> {
    if (code === 'invalid-code') {
      throw new Error('Mã code không hợp lệ');
    }
    return this.mockUser;
  }
}

class MockAuthTokenService implements AuthTokenServicePort {
  public generateToken(user: User): string {
    return `jwt-token-for-${user.id}`;
  }

  public verifyToken(token: string): TokenPayload {
    return {
      userId: 'test-id',
      email: 'test@gmail.com'
    };
  }
}

async function runTests() {
  try {
    const userRepo = new MockUserRepository();
    const oauthService = new MockOAuthService();
    const authTokenService = new MockAuthTokenService();
    const loginUseCase = new LoginUserUseCase(userRepo, oauthService, authTokenService);

    // ----------------------------------------------------
    // Case 1: Đăng nhập lần đầu (Đăng ký mới)
    // ----------------------------------------------------
    console.log('1. Đang test đăng nhập lần đầu (User mới)...');
    const resultNew = await loginUseCase.execute({
      code: 'valid-code-123',
      redirectUri: 'http://localhost:3000/callback'
    });

    assert.ok(resultNew.token.startsWith('jwt-token-for-'));
    assert.strictEqual(resultNew.user.email, 'test@gmail.com');
    assert.strictEqual(resultNew.user.displayName, 'Test User');
    assert.strictEqual(resultNew.user.avatarUrl, 'http://avatar.url');
    assert.ok(resultNew.user.id.length > 0);

    // Kiểm tra đã lưu user vào DB chưa
    const savedUser = await userRepo.findByGoogleId('g-123');
    assert.ok(savedUser);
    assert.strictEqual(savedUser.id, resultNew.user.id);
    console.log('✓ Test đăng ký mới thành công!');

    // ----------------------------------------------------
    // Case 2: Đăng nhập lại (User đã tồn tại, cập nhật avatar & name nếu đổi)
    // ----------------------------------------------------
    console.log('\n2. Đang test đăng nhập lại (User đã có sẵn & có cập nhật)...');
    
    // Đổi mock Google return mới
    oauthService.mockUser = {
      googleId: 'g-123',
      email: 'test-new@gmail.com',
      displayName: 'Updated Test User',
      avatarUrl: 'http://new-avatar.url'
    };

    const resultExisting = await loginUseCase.execute({
      code: 'valid-code-456'
    });

    assert.strictEqual(resultExisting.user.id, resultNew.user.id, 'ID user phải được giữ nguyên');
    assert.strictEqual(resultExisting.user.email, 'test-new@gmail.com');
    assert.strictEqual(resultExisting.user.displayName, 'Updated Test User');
    assert.strictEqual(resultExisting.user.avatarUrl, 'http://new-avatar.url');

    // Kiểm tra trong DB xem đã lưu bản cập nhật chưa
    const updatedUser = await userRepo.findById(resultNew.user.id);
    assert.ok(updatedUser);
    assert.strictEqual(updatedUser.displayName, 'Updated Test User');
    assert.strictEqual(updatedUser.email, 'test-new@gmail.com');
    assert.strictEqual(updatedUser.avatarUrl, 'http://new-avatar.url');
    console.log('✓ Test cập nhật thông tin user có sẵn thành công!');

    // ----------------------------------------------------
    // Case 3: Mã code OAuth không hợp lệ
    // ----------------------------------------------------
    console.log('\n3. Đang test lỗi khi mã OAuth code không hợp lệ...');
    await assert.rejects(
      async () => {
        await loginUseCase.execute({ code: 'invalid-code' });
      },
      (err: Error) => {
        return err.message === 'Mã code không hợp lệ';
      },
      'Ném lỗi không đúng khi code không hợp lệ'
    );
    console.log('✓ Test xử lý lỗi OAuth thành công!');

    console.log('\n=== TẤT CẢ UNIT TESTS CHO LOGIN USER USE CASE ĐỀU ĐẠT (PASS) ===');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ UNIT TEST THẤT BẠI:');
    console.error(error);
    process.exit(1);
  }
}

runTests();
