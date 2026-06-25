export interface AttemptAnswer {
  questionId: string;
  selectedOptionIndex: number;
  isCorrect: boolean;
}

export class QuizAttempt {
  constructor(
    public readonly id: string,
    public userId: string,
    public quizId: string,
    public mode: 'full-test' | 'instant-feedback',
    public score: number,
    public totalQuestions: number,
    public timeTaken: number, // in seconds
    public answers: AttemptAnswer[],
    public readonly attemptedAt: Date = new Date()
  ) {}

  public calculateScore(): number {
    const correctCount = this.answers.filter((ans) => ans.isCorrect).length;
    this.score = correctCount;
    return this.score;
  }
}
