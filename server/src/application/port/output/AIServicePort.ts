import { Readable } from 'stream';
import { Question } from '../../../domain/model/Quiz';

export interface AIServicePort {
  validateApiKey(apiKey: string): Promise<boolean>;
  extractLectureContent(
    audioStream: Readable,
    mimeType: string,
    apiKey: string
  ): Promise<{ refinedScript: string; title: string; qualityScore: number }>;
  generateQuizFromContent(
    refinedScript: string,
    apiKey: string
  ): Promise<Omit<Question, 'metrics'>[]>;
  mergeAndRefineScripts(
    oldScript: string,
    newScript: string,
    apiKey: string
  ): Promise<string>;
  generateReplacementQuestion(
    refinedScript: string,
    faultyQuestion: Omit<Question, 'metrics'>,
    apiKey: string
  ): Promise<Omit<Question, 'metrics'>>;
}
