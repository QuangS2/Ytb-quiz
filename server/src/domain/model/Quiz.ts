export interface QuestionMetrics {
  upvotes: number;
  downvotes: number;
  timesAnswered: number;
  timesCorrect: number;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  metrics: QuestionMetrics;
}

export class Quiz {
  constructor(
    public readonly id: string,
    public lectureContentId: string,
    public creatorId: string,
    public youtubeId: string,
    public title: string,
    public description: string,
    public questions: Question[],
    public averageRating: number = 0,
    public totalRatings: number = 0,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  public getQuestionCount(): number {
    return this.questions.length;
  }

  public voteQuestion(questionId: string, type: 'up' | 'down'): void {
    const question = this.questions.find((q) => q.id === questionId);
    if (question) {
      if (type === 'up') {
        question.metrics.upvotes += 1;
      } else {
        question.metrics.downvotes += 1;
      }
      this.updatedAt = new Date();
    }
  }

  public answerQuestion(questionId: string, isCorrect: boolean): void {
    const question = this.questions.find((q) => q.id === questionId);
    if (question) {
      question.metrics.timesAnswered += 1;
      if (isCorrect) {
        question.metrics.timesCorrect += 1;
      }
      this.updatedAt = new Date();
    }
  }

  public isQuestionFaulty(questionId: string): boolean {
    const question = this.questions.find((q) => q.id === questionId);
    if (!question) {
      return false;
    }

    const { metrics } = question;
    const totalVotes = metrics.upvotes + metrics.downvotes;
    
    // Tỷ lệ downvote > 30% (chỉ áp dụng khi có ít nhất 1 vote)
    const hasTooManyDownvotes = totalVotes > 0 && (metrics.downvotes / totalVotes) > 0.3;
    
    // Tỷ lệ đúng là 0% sau ít nhất 20 lượt làm
    const hasZeroCorrect = metrics.timesAnswered >= 20 && metrics.timesCorrect === 0;

    return hasTooManyDownvotes || hasZeroCorrect;
  }

  public replaceQuestion(questionId: string, newQuestionData: Omit<Question, 'metrics'>): void {
    const index = this.questions.findIndex((q) => q.id === questionId);
    if (index !== -1) {
      this.questions[index] = {
        ...newQuestionData,
        metrics: {
          upvotes: 0,
          downvotes: 0,
          timesAnswered: 0,
          timesCorrect: 0,
        },
      };
      this.updatedAt = new Date();
    }
  }

  public hasFaultyQuestions(): boolean {
    return this.questions.some((q) => this.isQuestionFaulty(q.id));
  }
}
