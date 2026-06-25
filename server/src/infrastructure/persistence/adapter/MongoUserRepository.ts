import { UserRepositoryPort } from '../../../application/port/output/UserRepositoryPort';
import { User } from '../../../domain/model/User';
import { UserModel } from '../schema/UserSchema';
import { UserMapper } from '../mapper/UserMapper';

export class MongoUserRepository implements UserRepositoryPort {
  public async save(user: User): Promise<User> {
    const persistenceData = UserMapper.toPersistence(user);
    const updatedDoc = await UserModel.findByIdAndUpdate(
      user.id,
      persistenceData,
      { upsert: true, new: true, runValidators: true }
    );
    return UserMapper.toDomain(updatedDoc);
  }

  public async findById(id: string): Promise<User | null> {
    const doc = await UserModel.findById(id);
    if (!doc) {
      return null;
    }
    return UserMapper.toDomain(doc);
  }

  public async findByGoogleId(googleId: string): Promise<User | null> {
    const doc = await UserModel.findOne({ googleId });
    if (!doc) {
      return null;
    }
    return UserMapper.toDomain(doc);
  }

  public async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email });
    if (!doc) {
      return null;
    }
    return UserMapper.toDomain(doc);
  }
}
