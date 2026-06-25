import { LectureContent } from '../../../domain/model/LectureContent';
import { ILectureContentDocument } from '../schema/LectureContentSchema';

export class LectureContentMapper {
  public static toDomain(document: ILectureContentDocument | any): LectureContent {
    if (!document) {
      throw new Error('Không thể map tài liệu null sang thực thể LectureContent');
    }
    return new LectureContent(
      document._id || document.id,
      document.youtubeId,
      document.title,
      document.refinedScript,
      document.version,
      document.qualityScore,
      document.createdAt,
      document.updatedAt
    );
  }

  public static toPersistence(domain: LectureContent): any {
    return {
      _id: domain.id,
      youtubeId: domain.youtubeId,
      title: domain.title,
      refinedScript: domain.refinedScript,
      version: domain.version,
      qualityScore: domain.qualityScore,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt
    };
  }
}
