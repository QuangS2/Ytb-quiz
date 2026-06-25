import { QuizRepositoryPort } from '../port/output/QuizRepositoryPort';
import { LectureContentRepositoryPort } from '../port/output/LectureContentRepositoryPort';
import { AIServicePort } from '../port/output/AIServicePort';
import { Quiz } from '../../domain/model/Quiz';
import { QuizNotFoundException } from '../../domain/exception/QuizNotFoundException';
import { QuestionNotFoundException } from '../../domain/exception/QuestionNotFoundException';

export interface EvaluateQuestionDto {
  quizId: string;
  questionId: string;
  type: 'up' | 'down';
  userId: string;
  apiKey?: string;
}

export class EvaluateQuestionUseCase {
  constructor(
    private readonly quizRepository: QuizRepositoryPort,
    private readonly lectureContentRepository: LectureContentRepositoryPort,
    private readonly aiService: AIServicePort
  ) {}

  public async execute(dto: EvaluateQuestionDto): Promise<Quiz> {
    const quiz = await this.quizRepository.findById(dto.quizId);
    if (!quiz) {
      throw new QuizNotFoundException(dto.quizId);
    }

    const question = quiz.questions.find((q) => q.id === dto.questionId);
    if (!question) {
      throw new QuestionNotFoundException(dto.questionId);
    }

    // 1. Ghi nhận lượt bình chọn (upvote/downvote)
    quiz.voteQuestion(dto.questionId, dto.type);

    // 2. Lưu trạng thái quiz vào DB trước
    const savedQuiz = await this.quizRepository.save(quiz);

    // 3. Kiểm tra xem câu hỏi có bị lỗi sau lượt vote này hay không
    if (quiz.isQuestionFaulty(dto.questionId)) {
      if (dto.apiKey) {
        // Kích hoạt tiến trình ngầm (background) tự vá lỗi câu hỏi
        this.runBackgroundSelfHealing(savedQuiz, dto.questionId, dto.apiKey).catch((err) => {
          console.error(`[Background Self-Healing Error for question ${dto.questionId}]:`, err);
        });
      } else {
        console.warn(`[Self-Healing] Phát hiện câu hỏi ${dto.questionId} bị lỗi nhưng không thể tự vá lỗi do thiếu x-gemini-key.`);
      }
    }

    return savedQuiz;
  }

  private async runBackgroundSelfHealing(
    quiz: Quiz,
    questionId: string,
    apiKey: string
  ): Promise<void> {
    const lectureContent = await this.lectureContentRepository.findById(quiz.lectureContentId);
    if (!lectureContent) {
      console.error(`[Self-Healing Error]: Không tìm thấy LectureContent với ID ${quiz.lectureContentId}`);
      return;
    }

    const faultyQuestion = quiz.questions.find((q) => q.id === questionId);
    if (!faultyQuestion) {
      return;
    }

    console.log(`[Self-Healing] Bắt đầu tự vá lỗi câu hỏi ${questionId} trong Quiz ${quiz.id}...`);

    // Sinh câu hỏi thay thế bằng AI
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

    // Thay thế và vá lỗi câu hỏi cũ, reset metrics
    quiz.replaceQuestion(questionId, newQuestionData);

    // Lưu thực thể Quiz đã cập nhật vào Database
    await this.quizRepository.save(quiz);
    console.log(`[Self-Healing] Tự vá lỗi câu hỏi ${questionId} thành công cho Quiz ${quiz.id}.`);
  }
}
