import assert from 'node:assert';
import { EvaluateQuestionUseCase } from '../EvaluateQuestionUseCase';
import { QuizRepositoryPort } from '../../port/output/QuizRepositoryPort';
import { LectureContentRepositoryPort } from '../../port/output/LectureContentRepositoryPort';
import { AIServicePort } from '../../port/output/AIServicePort';
import { Quiz, Question } from '../../../domain/model/Quiz';
import { LectureContent } from '../../../domain/model/LectureContent';
import { QuizNotFoundException } from '../../../domain/exception/QuizNotFoundException';
import { QuestionNotFoundException } from '../../../domain/exception/QuestionNotFoundException';
import { Readable } from 'stream';

console.log('=== BẮT ĐẦU CHẠY UNIT TEST CHO EVALUATE QUESTION USE CASE (SELF-HEALING) ===\n');

class MockQuizRepository implements QuizRepositoryPort {
  public quizzes: Quiz[] = [];

  public async save(quiz: Quiz): Promise<Quiz> {
    const idx = this.quizzes.findIndex((q) => q.id === quiz.id);
    if (idx !== -1) {
      this.quizzes[idx] = quiz;
    } else {
      this.quizzes.push(quiz);
    }
    return quiz;
  }

  public async findById(id: string): Promise<Quiz | null> {
    return this.quizzes.find((q) => q.id === id) || null;
  }

  public async findByYoutubeId(youtubeId: string): Promise<Quiz | null> {
    return this.quizzes.find((q) => q.youtubeId === youtubeId) || null;
  }

  public async delete(id: string): Promise<void> {
    this.quizzes = this.quizzes.filter((q) => q.id !== id);
  }
}

class MockLectureContentRepository implements LectureContentRepositoryPort {
  public contents: LectureContent[] = [];

  public async save(content: LectureContent): Promise<LectureContent> {
    const idx = this.contents.findIndex((c) => c.id === content.id);
    if (idx !== -1) {
      this.contents[idx] = content;
    } else {
      this.contents.push(content);
    }
    return content;
  }

  public async findById(id: string): Promise<LectureContent | null> {
    return this.contents.find((c) => c.id === id) || null;
  }

  public async findByYoutubeId(youtubeId: string): Promise<LectureContent | null> {
    return this.contents.find((c) => c.youtubeId === youtubeId) || null;
  }
}

class MockAIService implements AIServicePort {
  public callCount = 0;
  public mockNewQuestion: Omit<Question, 'metrics'> = {
    id: 'q-1',
    text: 'Nội dung câu hỏi thay thế của AI?',
    options: ['X', 'Y', 'Z', 'W'],
    correctOptionIndex: 2,
    explanation: 'Giải thích câu hỏi thay thế'
  };

  public async validateApiKey(apiKey: string): Promise<boolean> {
    return true;
  }

  public async extractLectureContent(
    audioStream: Readable,
    mimeType: string,
    apiKey: string
  ): Promise<{ refinedScript: string; title: string; qualityScore: number }> {
    return { refinedScript: 'mock refined script', title: 'mock title', qualityScore: 8.5 };
  }

  public async generateQuizFromContent(
    refinedScript: string,
    apiKey: string
  ): Promise<Omit<Question, 'metrics'>[]> {
    return [];
  }

  public async mergeAndRefineScripts(
    oldScript: string,
    newScript: string,
    apiKey: string
  ): Promise<string> {
    return 'merged script';
  }

  public async generateReplacementQuestion(
    refinedScript: string,
    faultyQuestion: Omit<Question, 'metrics'>,
    apiKey: string
  ): Promise<Omit<Question, 'metrics'>> {
    this.callCount += 1;
    return this.mockNewQuestion;
  }
}

async function runTests() {
  try {
    const quizRepo = new MockQuizRepository();
    const lectureRepo = new MockLectureContentRepository();
    const aiService = new MockAIService();

    const evaluateUseCase = new EvaluateQuestionUseCase(quizRepo, lectureRepo, aiService);

    // 1. Tạo Quiz và LectureContent mẫu
    const quizId = 'quiz-123';
    const lectureId = 'lecture-123';
    const questionId = 'q-1';

    const lecture = new LectureContent(lectureId, 'yt-123', 'Bài học Test', 'Refined script content here', 1, 8.5);
    await lectureRepo.save(lecture);

    const questions: Question[] = [
      {
        id: questionId,
        text: 'Nội dung câu hỏi cũ?',
        options: ['A', 'B', 'C', 'D'],
        correctOptionIndex: 0,
        explanation: 'Giải thích cũ',
        metrics: { upvotes: 0, downvotes: 0, timesAnswered: 0, timesCorrect: 0 }
      }
    ];

    const quiz = new Quiz(quizId, lectureId, 'creator-1', 'yt-123', 'Quiz Test', 'Desc', questions);
    await quizRepo.save(quiz);

    // ------------------------------------------------
    // Case 1: Quiz không tồn tại -> mong đợi ném lỗi QuizNotFoundException
    // ------------------------------------------------
    console.log('1. Đang test trường hợp Quiz không tồn tại...');
    await assert.rejects(
      async () => {
        await evaluateUseCase.execute({
          quizId: 'wrong-quiz-id',
          questionId: 'q-1',
          type: 'up',
          userId: 'user-1'
        });
      },
      QuizNotFoundException
    );
    console.log('✓ Test Quiz không tồn tại thành công!');

    // ------------------------------------------------
    // Case 2: Câu hỏi không tồn tại -> mong đợi ném lỗi QuestionNotFoundException
    // ------------------------------------------------
    console.log('\n2. Đang test trường hợp Câu hỏi không tồn tại...');
    await assert.rejects(
      async () => {
        await evaluateUseCase.execute({
          quizId,
          questionId: 'wrong-question-id',
          type: 'up',
          userId: 'user-1'
        });
      },
      QuestionNotFoundException
    );
    console.log('✓ Test Câu hỏi không tồn tại thành công!');

    // ------------------------------------------------
    // Case 3: Vote up hợp lệ (không lỗi, không kích hoạt self-healing)
    // ------------------------------------------------
    console.log('\n3. Đang test vote UP hợp lệ...');
    const quizUp = await evaluateUseCase.execute({
      quizId,
      questionId,
      type: 'up',
      userId: 'user-1'
    });

    assert.strictEqual(quizUp.questions[0].metrics.upvotes, 1);
    assert.strictEqual(quizUp.questions[0].metrics.downvotes, 0);
    assert.strictEqual(aiService.callCount, 0, 'Lẽ ra không được kích hoạt self-healing vì câu hỏi chưa bị lỗi');
    console.log('✓ Test vote UP thành công!');

    // ------------------------------------------------
    // Case 4: Vote down gây lỗi -> kích hoạt Self-Healing
    // ------------------------------------------------
    console.log('\n4. Đang test vote DOWN gây lỗi và kích hoạt Self-Healing...');
    
    // Upvotes = 1, Downvotes = 0. Thêm 1 downvote nữa -> downvote rate = 1/(1+1) = 50% > 30% -> lỗi!
    // Kèm theo API Key để chạy Self-Healing
    const quizDown = await evaluateUseCase.execute({
      quizId,
      questionId,
      type: 'down',
      userId: 'user-1',
      apiKey: 'mock-gemini-key'
    });

    assert.strictEqual(quizDown.questions[0].metrics.upvotes, 1);
    assert.strictEqual(quizDown.questions[0].metrics.downvotes, 1);

    // Chờ 100ms để tiến trình ngầm hoàn thành
    await new Promise((resolve) => setTimeout(resolve, 100));

    assert.strictEqual(aiService.callCount, 1, 'Self-healing phải được gọi 1 lần');
    
    // Kiểm tra xem câu hỏi trong DB đã được thay thế chưa
    const patchedQuiz = await quizRepo.findById(quizId);
    assert.ok(patchedQuiz);
    assert.strictEqual(patchedQuiz.questions[0].text, 'Nội dung câu hỏi thay thế của AI?');
    assert.strictEqual(patchedQuiz.questions[0].metrics.upvotes, 0, 'Metrics của câu hỏi mới phải được reset');
    assert.strictEqual(patchedQuiz.questions[0].metrics.downvotes, 0);
    console.log('✓ Test vote DOWN & Self-healing thành công!');

    console.log('\n=== TẤT CẢ UNIT TESTS CHO EVALUATE QUESTION ĐỀU ĐẠT (PASS) ===');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ UNIT TEST THẤT BẠI:');
    console.error(error);
    process.exit(1);
  }
}

runTests();
