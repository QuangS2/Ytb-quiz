export interface SubmitAnswerDto {
  questionId: string;
  selectedOptionIndex: number;
}

export interface SubmitQuizRequestDto {
  quizId: string;
  userId: string;
  answers: SubmitAnswerDto[];
  timeTaken: number; // in seconds
  mode?: 'full-test' | 'instant-feedback';
  apiKey?: string;
}
