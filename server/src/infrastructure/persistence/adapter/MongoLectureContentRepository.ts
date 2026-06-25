import { LectureContentRepositoryPort } from '../../../application/port/output/LectureContentRepositoryPort';
import { LectureContent } from '../../../domain/model/LectureContent';
import { LectureContentModel } from '../schema/LectureContentSchema';
import { LectureContentMapper } from '../mapper/LectureContentMapper';

export class MongoLectureContentRepository implements LectureContentRepositoryPort {
  public async save(lectureContent: LectureContent): Promise<LectureContent> {
    const persistenceData = LectureContentMapper.toPersistence(lectureContent);
    const updatedDoc = await LectureContentModel.findByIdAndUpdate(
      lectureContent.id,
      persistenceData,
      { upsert: true, new: true, runValidators: true }
    );
    return LectureContentMapper.toDomain(updatedDoc);
  }

  public async findById(id: string): Promise<LectureContent | null> {
    const doc = await LectureContentModel.findById(id);
    if (!doc) {
      return null;
    }
    return LectureContentMapper.toDomain(doc);
  }

  public async findByYoutubeId(youtubeId: string): Promise<LectureContent | null> {
    const doc = await LectureContentModel.findOne({ youtubeId });
    if (!doc) {
      return null;
    }
    return LectureContentMapper.toDomain(doc);
  }
}
