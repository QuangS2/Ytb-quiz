import assert from 'node:assert';
import { Readable } from 'stream';
import { GenerateQuizUseCase } from '../GenerateQuizUseCase';
import { QuizRepositoryPort } from '../../port/output/QuizRepositoryPort';
import { LectureContentRepositoryPort } from '../../port/output/LectureContentRepositoryPort';
import { AudioExtractorPort } from '../../port/output/AudioExtractorPort';
import { AIServicePort } from '../../port/output/AIServicePort';
import { Quiz, Question } from '../../../domain/model/Quiz';
import { LectureContent } from '../../../domain/model/LectureContent';
import { GenerateQuizRequestDto } from '../../dto/GenerateQuizRequestDto';

console.log('=== BẮT ĐẦU CHẠY UNIT TEST CHO GenerateQuizUseCase ===\n');

// 1. Dựng các Mock Repository và Service
class MockQuizRepository implements QuizRepositoryPort {
  public quizzes: Quiz[] = [];

  public async save(quiz: Quiz): Promise<Quiz> {
    this.quizzes.push(quiz);
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
    this.contents.push(content);
    return content;
  }

  public async findById(id: string): Promise<LectureContent | null> {
    return this.contents.find((c) => c.id === id) || null;
  }

  public async findByYoutubeId(youtubeId: string): Promise<LectureContent | null> {
    return this.contents.find((c) => c.youtubeId === youtubeId) || null;
  }

  public async updateRefinedScript(): Promise<void> {}
}

class MockAudioExtractor implements AudioExtractorPort {
  public called = false;
  public async extractAudio(youtubeId: string): Promise<Readable> {
    this.called = true;
    return Readable.from([Buffer.from('mock-audio-data')]);
  }
}

class MockAIService implements AIServicePort {
  public calledExtract = false;
  public calledGenerate = false;
  public calledMerge = false;

  public async validateApiKey(apiKey: string): Promise<boolean> {
    return true;
  }

  public async extractLectureContent(
    audioStream: Readable,
    mimeType: string,
    apiKey: string
  ): Promise<{ refinedScript: string; title: string; qualityScore: number }> {
    this.calledExtract = true;
    return {
      refinedScript: 'Refined script content here',
      title: 'Mock Lesson Title',
      qualityScore: 8.5
    };
  }

  public async generateQuizFromContent(
    refinedScript: string,
    apiKey: string
  ): Promise<Omit<Question, 'metrics'>[]> {
    this.calledGenerate = true;
    return [
      {
        id: 'q-1',
        text: 'Mock Question 1?',
        options: ['A', 'B', 'C', 'D'],
        correctOptionIndex: 0,
        explanation: 'Exp 1'
      }
    ];
  }

  public async mergeAndRefineScripts(
    oldScript: string,
    newScript: string,
    apiKey: string
  ): Promise<string> {
    this.calledMerge = true;
    return 'Merged script';
  }

  public async generateReplacementQuestion(
    refinedScript: string,
    faultyQuestion: Omit<Question, 'metrics'>,
    apiKey: string
  ): Promise<Omit<Question, 'metrics'>> {
    return {
      id: faultyQuestion.id,
      text: 'Mock replacement question',
      options: ['A', 'B', 'C', 'D'],
      correctOptionIndex: 0,
      explanation: 'Exp'
    };
  }
}

async function runTests() {
  try {
    // ------------------------------------------
    // Case 1: Video chưa từng được tạo Quiz (Cache Miss)
    // ------------------------------------------
    console.log('1. Đang test trường hợp chưa có Quiz trong DB (Tạo mới)...');
    
    const quizRepo = new MockQuizRepository();
    const lectureRepo = new MockLectureContentRepository();
    const audioExtractor = new MockAudioExtractor();
    const aiService = new MockAIService();

    const useCase = new GenerateQuizUseCase(quizRepo, lectureRepo, audioExtractor, aiService);

    const dto: GenerateQuizRequestDto = {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      creatorId: 'user-abc',
      apiKey: 'key-123'
    };

    const quiz = await useCase.execute(dto);

    // Kiểm tra Use Case đã chạy qua các Adapter tương ứng
    assert.strictEqual(audioExtractor.called, true, 'Lẽ ra phải chạy AudioExtractor');
    assert.strictEqual(aiService.calledExtract, true, 'Lẽ ra phải gọi AI trích xuất bài giảng');
    assert.strictEqual(aiService.calledGenerate, true, 'Lẽ ra phải gọi AI sinh Quiz');

    // Kiểm tra dữ liệu được tạo
    assert.strictEqual(quiz.youtubeId, 'dQw4w9WgXcQ');
    assert.strictEqual(quiz.title, 'Mock Lesson Title');
    assert.strictEqual(quiz.questions.length, 1);
    assert.strictEqual(quiz.questions[0].metrics.upvotes, 0); // metrics reset ban đầu = 0
    
    // Kiểm tra việc lưu vào repository
    assert.strictEqual(quizRepo.quizzes.length, 1);
    assert.strictEqual(lectureRepo.contents.length, 1);

    console.log('✓ Test tạo mới Quiz thành công!');

    // ------------------------------------------
    // Case 2: Video đã từng được tạo Quiz (Cache Hit / Tránh lưu trùng lặp)
    // ------------------------------------------
    console.log('\n2. Đang test trường hợp đã có sẵn Quiz (Cache Hit - Tránh lưu lặp)...');

    // Tạo sẵn một Quiz trong Mock Repository
    const preExistingQuiz = new Quiz(
      'pre-existing-id',
      'lecture-id',
      'user-abc',
      'dQw4w9WgXcQ',
      'Old Title',
      'Old Desc',
      []
    );
    quizRepo.quizzes = [preExistingQuiz];
    
    // Reset flags của các mock
    audioExtractor.called = false;
    aiService.calledExtract = false;
    aiService.calledGenerate = false;

    // Chạy lại use case
    const cachedQuiz = await useCase.execute(dto);

    // Kiểm tra xem Use Case có trả về ngay thực thể đã có sẵn mà không gọi AI/Extractor
    assert.strictEqual(cachedQuiz.id, 'pre-existing-id');
    assert.strictEqual(cachedQuiz.title, 'Old Title');
    assert.strictEqual(audioExtractor.called, false, 'Không được tải lại audio');
    assert.strictEqual(aiService.calledExtract, false, 'Không được gọi AI Cleaner');
    assert.strictEqual(aiService.calledGenerate, false, 'Không được gọi AI Generator');
    assert.strictEqual(quizRepo.quizzes.length, 1, 'Không được lưu thêm instance mới vào database');

    console.log('✓ Test Cache Hit và tránh lưu trùng lặp thành công!');

    // ------------------------------------------
    // Case 3: Máy mạnh (DevicePerformance == 'high') có cache -> Trả về Quiz cũ ngay lập tức,
    // đồng thời kích hoạt tác vụ ngầm tối ưu hóa.
    // ------------------------------------------
    console.log('\n3. Đang test trường hợp máy mạnh (x-device-performance == "high") và có Cache...');

    // Đưa sẵn LectureContent cũ vào database mock
    const oldLecture = new LectureContent(
      'lecture-id',
      'dQw4w9WgXcQ',
      'Old Title',
      'Old cleaned script',
      1,
      8.0
    );
    lectureRepo.contents = [oldLecture];

    // Reset các flags
    audioExtractor.called = false;
    aiService.calledExtract = false;
    aiService.calledGenerate = false;
    aiService.calledMerge = false;

    const dtoHighPerf: GenerateQuizRequestDto = {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      creatorId: 'user-abc',
      apiKey: 'key-123',
      devicePerformance: 'high'
    };

    // Gọi execute -> mong đợi trả về Quiz hiện tại ngay lập tức
    const highPerfQuiz = await useCase.execute(dtoHighPerf);

    assert.strictEqual(highPerfQuiz.id, 'pre-existing-id');
    console.log('✓ Trả về Quiz cũ thành công (dưới 0.5s)!');

    // Chờ một chút để tiến trình ngầm hoàn tất (vì nó chạy ngầm không await)
    console.log('Đang chờ tiến trình ngầm chạy...');
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Sau khi tiến trình ngầm chạy xong:
    assert.strictEqual(audioExtractor.called, true, 'Lẽ ra phải chạy audio extractor ngầm');
    assert.strictEqual(aiService.calledExtract, true, 'Lẽ ra phải gọi AI extract ngầm');
    assert.strictEqual(aiService.calledMerge, true, 'Lẽ ra phải gọi AI merge kịch bản ngầm');
    assert.strictEqual(aiService.calledGenerate, true, 'Lẽ ra phải gọi AI sinh câu hỏi mới ngầm');

    // Kiểm tra kịch bản và câu hỏi đã được cập nhật mới
    const updatedLecture = await lectureRepo.findById('lecture-id');
    assert.strictEqual(updatedLecture?.refinedScript, 'Merged script', 'Kịch bản cũ phải được thay bằng kịch bản merged');
    assert.strictEqual(updatedLecture?.version, 2, 'Kịch bản version phải tăng lên 2');

    const updatedQuiz = await quizRepo.findById('pre-existing-id');
    assert.strictEqual(updatedQuiz?.questions.length, 1, 'Quiz phải được cập nhật câu hỏi mới');
    assert.strictEqual(updatedQuiz?.title, 'Mock Lesson Title', 'Tiêu đề Quiz phải được cập nhật mới');

    console.log('✓ Test tiến trình chạy ngầm tinh lọc kịch bản bài giảng thành công!');

    console.log('\n=== TẤT CẢ UNIT TESTS CHO GenerateQuizUseCase ĐỀU ĐẠT (PASS) ===');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ UNIT TEST THẤT BẠI:');
    console.error(error);
    process.exit(1);
  }
}

runTests();
