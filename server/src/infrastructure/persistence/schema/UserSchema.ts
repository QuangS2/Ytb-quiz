import { Schema, model } from 'mongoose';

export interface IUserDocument {
  _id: string; // Sử dụng string thay vì ObjectId
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  passwordHash?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    _id: { type: String, required: true },
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    avatarUrl: { type: String, required: true },
    passwordHash: { type: String },
    createdAt: { type: Date, default: Date.now }
  },
  {
    _id: false, // Tắt tự động tạo _id kiểu ObjectId của Mongoose
    versionKey: false
  }
);

export const UserModel = model<IUserDocument>('User', UserSchema);
