import { Schema, model } from 'mongoose';

export interface IQuestionDocument {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  metrics: {
    upvotes: number;
    downvotes: number;
    timesAnswered: number;
    timesCorrect: number;
  };
}

export interface IQuizDocument {
  _id: string;
  lectureContentId: string;
  creatorId: string;
  youtubeId: string;
  title: string;
  description: string;
  questions: IQuestionDocument[];
  averageRating: number;
  totalRatings: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestionDocument>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    options: { type: [String], required: true },
    correctOptionIndex: { type: Number, required: true },
    explanation: { type: String, required: true },
    metrics: {
      upvotes: { type: Number, required: true, default: 0 },
      downvotes: { type: Number, required: true, default: 0 },
      timesAnswered: { type: Number, required: true, default: 0 },
      timesCorrect: { type: Number, required: true, default: 0 }
    }
  },
  { _id: false }
);

const QuizSchema = new Schema<IQuizDocument>(
  {
    _id: { type: String, required: true },
    lectureContentId: { type: String, required: true, ref: 'LectureContent' },
    creatorId: { type: String, required: true, ref: 'User' },
    youtubeId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    questions: { type: [QuestionSchema], required: true, default: [] },
    averageRating: { type: Number, required: true, default: 0 },
    totalRatings: { type: Number, required: true, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  {
    _id: false,
    versionKey: false
  }
);

export const QuizModel = model<IQuizDocument>('Quiz', QuizSchema);
