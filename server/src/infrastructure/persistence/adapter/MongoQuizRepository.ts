import { QuizRepositoryPort } from '../../../application/port/output/QuizRepositoryPort';
import { Quiz } from '../../../domain/model/Quiz';
import { QuizModel } from '../schema/QuizSchema';
import { QuizMapper } from '../mapper/QuizMapper';

export class MongoQuizRepository implements QuizRepositoryPort {
  public async save(quiz: Quiz): Promise<Quiz> {
    const persistenceData = QuizMapper.toPersistence(quiz);
    const updatedDoc = await QuizModel.findByIdAndUpdate(
      quiz.id,
      persistenceData,
      { upsert: true, new: true, runValidators: true }
    );
    return QuizMapper.toDomain(updatedDoc);
  }

  public async findById(id: string): Promise<Quiz | null> {
    const doc = await QuizModel.findById(id);
    if (!doc) {
      return null;
    }
    return QuizMapper.toDomain(doc);
  }

  public async findByYoutubeId(youtubeId: string): Promise<Quiz | null> {
    const doc = await QuizModel.findOne({ youtubeId });
    if (!doc) {
      return null;
    }
    return QuizMapper.toDomain(doc);
  }

  public async delete(id: string): Promise<void> {
    await QuizModel.findByIdAndDelete(id);
  }
}
