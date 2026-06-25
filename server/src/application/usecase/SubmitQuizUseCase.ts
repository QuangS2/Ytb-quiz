import { randomUUID } from 'crypto';
import { QuizRepositoryPort } from '../port/output/QuizRepositoryPort';
import { QuizAttemptRepositoryPort } from '../port/output/QuizAttemptRepositoryPort';
import { QuizAttempt, AttemptAnswer } from '../../domain/model/QuizAttempt';
import { QuizNotFoundException } from '../../domain/exception/QuizNotFoundException';
import { BusinessException } from '../../domain/exception/BusinessException';
import { SubmitQuizRequestDto } from '../dto/SubmitQuizRequestDto';
import { LectureContentRepositoryPort } from '../port/output/LectureContentRepositoryPort';
import { AIServicePort } from '../port/output/AIServicePort';
import { Quiz } from '../../domain/model/Quiz';

export interface SubmitQuizResult {
  attempt: QuizAttempt;
  questions: {
    id: string;
    text: string;
    options: string[];
    correctOptionIndex: number;
    explanation: string;
  }[];
}

export class SubmitQuizUseCase {
  constructor(
    private readonly quizRepository: QuizRepositoryPort,
    private readonly quizAttemptRepository: QuizAttemptRepositoryPort,
    private readonly lectureContentRepository?: LectureContentRepositoryPort,
    private readonly aiService?: AIServicePort
  ) {}

  public async execute(dto: SubmitQuizRequestDto): Promise<SubmitQuizResult> {
    // 1. Tìm Quiz theo id
    const quiz = await this.quizRepository.findById(dto.quizId);
    if (!quiz) {
      throw new QuizNotFoundException(dto.quizId);
    }

    // 2. Đánh giá câu trả lời của người dùng và cập nhật metrics trong Quiz
    const evaluatedAnswers: AttemptAnswer[] = [];
    
    for (const ans of dto.answers) {
      // Tìm câu hỏi tương ứng trong Quiz
      const question = quiz.questions.find((q) => q.id === ans.questionId);
      if (!question) {
        throw new BusinessException(
          'QUESTION_NOT_FOUND',
          `Không tìm thấy câu hỏi với ID ${ans.questionId} trong bài thi này.`
        );
      }

      const isCorrect = ans.selectedOptionIndex === question.correctOptionIndex;

      // Cập nhật số liệu thống kê cho câu hỏi này trong thực thể Domain
      quiz.answerQuestion(question.id, isCorrect);

      evaluatedAnswers.push({
        questionId: ans.questionId,
        selectedOptionIndex: ans.selectedOptionIndex,
        isCorrect: isCorrect
      });
    }

    // 3. Tạo thực thể QuizAttempt
    const attemptId = randomUUID();
    const attempt = new QuizAttempt(
      attemptId,
      dto.userId,
      dto.quizId,
      dto.mode || 'full-test',
      0, // Sẽ được cập nhật bằng calculateScore()
      quiz.getQuestionCount(),
      dto.timeTaken,
      evaluatedAnswers
    );

    // 4. Chấm điểm
    attempt.calculateScore();

    // 5. Lưu thông tin lượt làm bài
    const savedAttempt = await this.quizAttemptRepository.save(attempt);

    // 6. Lưu thông tin Quiz (đã được cập nhật metrics của câu hỏi)
    const savedQuiz = await this.quizRepository.save(quiz);

    // 7. Kích hoạt tự phục hồi nếu có câu hỏi bị lỗi và có API Key
    if (dto.apiKey && this.lectureContentRepository && this.aiService) {
      for (const ans of dto.answers) {
        if (quiz.isQuestionFaulty(ans.questionId)) {
          this.runBackgroundSelfHealing(savedQuiz, ans.questionId, dto.apiKey).catch((err) => {
            console.error(`[Background Self-Healing Error from submit]:`, err);
          });
        }
      }
    }

    return {
      attempt: savedAttempt,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        explanation: q.explanation
      }))
    };
  }

  private async runBackgroundSelfHealing(
    quiz: Quiz,
    questionId: string,
    apiKey: string
  ): Promise<void> {
    if (!this.lectureContentRepository || !this.aiService) return;

    const lectureContent = await this.lectureContentRepository.findById(quiz.lectureContentId);
    if (!lectureContent) {
      console.error(`[Self-Healing Error from submit]: Không tìm thấy LectureContent với ID ${quiz.lectureContentId}`);
      return;
    }

    const faultyQuestion = quiz.questions.find((q) => q.id === questionId);
    if (!faultyQuestion) {
      return;
    }

    console.log(`[Self-Healing from submit] Bắt đầu tự vá lỗi câu hỏi ${questionId} trong Quiz ${quiz.id}...`);

    const newQuestionData = await this.aiService.generateReplacementQuestion(
      lectureContent.refinedScript,
      {
        id: faultyQuestion.id,
        text: faultyQuestion.text,
        options: faultyQuestion.options,
        correctOptionIndex: faultyQuestion.correctOptionIndex,
        explanation: faultyQuestion.explanation
      },
      apiKey
    );

    quiz.replaceQuestion(questionId, newQuestionData);
    await this.quizRepository.save(quiz);
    console.log(`[Self-Healing from submit] Tự vá lỗi câu hỏi ${questionId} thành công cho Quiz ${quiz.id}.`);
  }
}
