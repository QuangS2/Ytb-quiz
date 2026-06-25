import { Quiz } from '../../../domain/model/Quiz';

export interface QuizRepositoryPort {
  save(quiz: Quiz): Promise<Quiz>;
  findById(id: string): Promise<Quiz | null>;
  findByYoutubeId(youtubeId: string): Promise<Quiz | null>;
  delete(id: string): Promise<void>;
}
