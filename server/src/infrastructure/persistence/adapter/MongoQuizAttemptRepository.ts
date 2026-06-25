import { QuizAttemptRepositoryPort } from '../../../application/port/output/QuizAttemptRepositoryPort';
import { QuizAttempt } from '../../../domain/model/QuizAttempt';
import { QuizAttemptModel } from '../schema/QuizAttemptSchema';
import { QuizAttemptMapper } from '../mapper/QuizAttemptMapper';

export class MongoQuizAttemptRepository implements QuizAttemptRepositoryPort {
  public async save(attempt: QuizAttempt): Promise<QuizAttempt> {
    const persistenceData = QuizAttemptMapper.toPersistence(attempt);
    const updatedDoc = await QuizAttemptModel.findByIdAndUpdate(
      attempt.id,
      persistenceData,
      { upsert: true, new: true, runValidators: true }
    );
    return QuizAttemptMapper.toDomain(updatedDoc);
  }

  public async findById(id: string): Promise<QuizAttempt | null> {
    const doc = await QuizAttemptModel.findById(id);
    if (!doc) {
      return null;
    }
    return QuizAttemptMapper.toDomain(doc);
  }

  public async findByUserId(userId: string): Promise<QuizAttempt[]> {
    const docs = await QuizAttemptModel.find({ userId });
    return docs.map((doc) => QuizAttemptMapper.toDomain(doc));
  }

  public async findByQuizId(quizId: string): Promise<QuizAttempt[]> {
    const docs = await QuizAttemptModel.find({ quizId });
    return docs.map((doc) => QuizAttemptMapper.toDomain(doc));
  }
}
