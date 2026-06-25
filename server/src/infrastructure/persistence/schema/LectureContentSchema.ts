import { Schema, model } from 'mongoose';

export interface ILectureContentDocument {
  _id: string;
  youtubeId: string;
  title: string;
  refinedScript: string;
  version: number;
  qualityScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const LectureContentSchema = new Schema<ILectureContentDocument>(
  {
    _id: { type: String, required: true },
    youtubeId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    refinedScript: { type: String, required: true },
    version: { type: Number, required: true, default: 1 },
    qualityScore: { type: Number, required: true, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  {
    _id: false,
    versionKey: false
  }
);

export const LectureContentModel = model<ILectureContentDocument>('LectureContent', LectureContentSchema);
