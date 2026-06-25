import { Quiz, Question } from '../../../domain/model/Quiz';
import { IQuizDocument, IQuestionDocument } from '../schema/QuizSchema';

export class QuizMapper {
  public static toDomain(document: IQuizDocument | any): Quiz {
    if (!document) {
      throw new Error('Không thể map tài liệu null sang thực thể Quiz');
    }

    const domainQuestions: Question[] = document.questions.map((q: any) => ({
      id: q.id,
      text: q.text,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
      explanation: q.explanation,
      metrics: {
        upvotes: q.metrics?.upvotes ?? 0,
        downvotes: q.metrics?.downvotes ?? 0,
        timesAnswered: q.metrics?.timesAnswered ?? 0,
        timesCorrect: q.metrics?.timesCorrect ?? 0
      }
    }));

    return new Quiz(
      document._id || document.id,
      document.lectureContentId,
      document.creatorId,
      document.youtubeId,
      document.title,
      document.description,
      domainQuestions,
      document.averageRating,
      document.totalRatings,
      document.createdAt,
      document.updatedAt
    );
  }

  public static toPersistence(domain: Quiz): any {
    const persistenceQuestions: IQuestionDocument[] = domain.questions.map((q) => ({
      id: q.id,
      text: q.text,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
      explanation: q.explanation,
      metrics: {
        upvotes: q.metrics.upvotes,
        downvotes: q.metrics.downvotes,
        timesAnswered: q.metrics.timesAnswered,
        timesCorrect: q.metrics.timesCorrect
      }
    }));

    return {
      _id: domain.id,
      lectureContentId: domain.lectureContentId,
      creatorId: domain.creatorId,
      youtubeId: domain.youtubeId,
      title: domain.title,
      description: domain.description,
      questions: persistenceQuestions,
      averageRating: domain.averageRating,
      totalRatings: domain.totalRatings,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt
    };
  }
}
