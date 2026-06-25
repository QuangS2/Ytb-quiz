import { User } from '../../../domain/model/User';
import { IUserDocument } from '../schema/UserSchema';

export class UserMapper {
  public static toDomain(document: IUserDocument | any): User {
    if (!document) {
      throw new Error('Không thể map tài liệu null sang thực thể User');
    }
    return new User(
      document._id || document.id,
      document.googleId,
      document.email,
      document.displayName,
      document.avatarUrl,
      document.passwordHash,
      document.createdAt
    );
  }

  public static toPersistence(domain: User): any {
    return {
      _id: domain.id,
      googleId: domain.googleId,
      email: domain.email,
      displayName: domain.displayName,
      avatarUrl: domain.avatarUrl,
      passwordHash: domain.passwordHash,
      createdAt: domain.createdAt
    };
  }
}
