import { Schema, model } from 'mongoose';

export interface IAttemptAnswerDocument {
  questionId: string;
  selectedOptionIndex: number;
  isCorrect: boolean;
}

export interface IQuizAttemptDocument {
  _id: string;
  userId: string;
  quizId: string;
  mode: 'full-test' | 'instant-feedback';
  score: number;
  totalQuestions: number;
  timeTaken: number;
  answers: IAttemptAnswerDocument[];
  attemptedAt: Date;
}

const AttemptAnswerSchema = new Schema<IAttemptAnswerDocument>(
  {
    questionId: { type: String, required: true },
    selectedOptionIndex: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true }
  },
  { _id: false }
);

const QuizAttemptSchema = new Schema<IQuizAttemptDocument>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, ref: 'User' },
    quizId: { type: String, required: true, ref: 'Quiz' },
    mode: { type: String, required: true, enum: ['full-test', 'instant-feedback'] },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    timeTaken: { type: Number, required: true },
    answers: { type: [AttemptAnswerSchema], required: true, default: [] },
    attemptedAt: { type: Date, default: Date.now }
  },
  {
    _id: false,
    versionKey: false
  }
);

export const QuizAttemptModel = model<IQuizAttemptDocument>('QuizAttempt', QuizAttemptSchema);
