import { LectureContent } from '../../../domain/model/LectureContent';

export interface LectureContentRepositoryPort {
  save(lectureContent: LectureContent): Promise<LectureContent>;
  findById(id: string): Promise<LectureContent | null>;
  findByYoutubeId(youtubeId: string): Promise<LectureContent | null>;
}
