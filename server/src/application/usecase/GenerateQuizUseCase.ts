import { randomUUID } from 'crypto';
import { QuizRepositoryPort } from '../port/output/QuizRepositoryPort';
import { LectureContentRepositoryPort } from '../port/output/LectureContentRepositoryPort';
import { AudioExtractorPort } from '../port/output/AudioExtractorPort';
import { AIServicePort } from '../port/output/AIServicePort';
import { YoutubeUrl } from '../../domain/valueobject/YoutubeUrl';
import { LectureContent } from '../../domain/model/LectureContent';
import { Quiz, Question } from '../../domain/model/Quiz';
import { GenerateQuizRequestDto } from '../dto/GenerateQuizRequestDto';

export class GenerateQuizUseCase {
  constructor(
    private readonly quizRepository: QuizRepositoryPort,
    private readonly lectureContentRepository: LectureContentRepositoryPort,
    private readonly audioExtractor: AudioExtractorPort,
    private readonly aiService: AIServicePort
  ) { }

  public async execute(dto: GenerateQuizRequestDto): Promise<Quiz> {
    // 1. Phân tích và xác thực Youtube URL
    const ytUrl = new YoutubeUrl(dto.url);
    const youtubeId = ytUrl.youtubeId;

    // 2. Tránh lưu lặp video trùng youtubeId (theo mistake.md)
    const existingQuiz = await this.quizRepository.findByYoutubeId(youtubeId);
    if (existingQuiz) {
      if (dto.devicePerformance === 'high') {
        // Kích hoạt tiến trình ngầm tinh lọc kịch bản bài học mà không dùng await
        this.runBackgroundRefinement(youtubeId, existingQuiz, dto.apiKey).catch((err) => {
          console.error('[Background Refinement Error]:', err);
        });
      }
      return existingQuiz;
    }

    let lectureContent = await this.lectureContentRepository.findByYoutubeId(youtubeId);
    if (!lectureContent) {
      // 3. Tải luồng âm thanh (audio-only) từ YouTube trực tiếp vào RAM
      const audioStream = await this.audioExtractor.extractAudio(youtubeId);

      // 4. Bước 1 (AI Cleaner): Lọc sạch audio trích xuất nội dung học tập
      const lectureData = await this.aiService.extractLectureContent(
        audioStream,
        'audio/mp4', // MimeType truyền lên Gemini File API
        dto.apiKey
      );

      // 5. Tạo và lưu thực thể LectureContent
      const lectureId = randomUUID();
      lectureContent = new LectureContent(
        lectureId,
        youtubeId,
        lectureData.title,
        lectureData.refinedScript,
        1,
        lectureData.qualityScore
      );
      await this.lectureContentRepository.save(lectureContent);
    }

    // 6. Bước 2 (AI Generator): Sinh câu hỏi trắc nghiệm từ kịch bản sạch
    const rawQuestions = await this.aiService.generateQuizFromContent(
      lectureContent.refinedScript,
      dto.apiKey
    );

    // Ánh xạ câu hỏi thô từ AI sang thực thể Question với metrics ban đầu = 0
    const questions: Question[] = rawQuestions.map((rq) => ({
      id: rq.id || randomUUID(),
      text: rq.text,
      options: rq.options,
      correctOptionIndex: rq.correctOptionIndex,
      explanation: rq.explanation,
      metrics: {
        upvotes: 0,
        downvotes: 0,
        timesAnswered: 0,
        timesCorrect: 0
      }
    }));

    // 7. Tạo và lưu thực thể Quiz
    const quizId = randomUUID();
    const quiz = new Quiz(
      quizId,
      lectureContent.id,
      dto.creatorId,
      youtubeId,
      lectureContent.title,
      `Bài trắc nghiệm tự động sinh từ video bài giảng: ${lectureContent.title}`,
      questions,
      0,
      0
    );

    const savedQuiz = await this.quizRepository.save(quiz);
    return savedQuiz;
  }

  private async runBackgroundRefinement(
    youtubeId: string,
    existingQuiz: Quiz,
    apiKey: string
  ): Promise<void> {
    const oldLecture = await this.lectureContentRepository.findByYoutubeId(youtubeId);
    if (!oldLecture) {
      return;
    }

    // 1. Tải audio mới
    const audioStream = await this.audioExtractor.extractAudio(youtubeId);

    // 2. Trích xuất kịch bản mới
    const newLectureData = await this.aiService.extractLectureContent(
      audioStream,
      'audio/mp4',
      apiKey
    );

    // 3. Đối chiếu và hợp nhất kịch bản bằng Gemini
    const mergedScript = await this.aiService.mergeAndRefineScripts(
      oldLecture.refinedScript,
      newLectureData.refinedScript,
      apiKey
    );

    // 4. Lưu LectureContent đã cập nhật
    oldLecture.refinedScript = mergedScript;
    oldLecture.version += 1;
    oldLecture.qualityScore = Math.max(oldLecture.qualityScore, newLectureData.qualityScore);
    await this.lectureContentRepository.save(oldLecture);

    // 5. Sinh bộ câu hỏi mới từ kịch bản tối ưu
    const rawQuestions = await this.aiService.generateQuizFromContent(mergedScript, apiKey);

    const newQuestions: Question[] = rawQuestions.map((rq) => ({
      id: rq.id || randomUUID(),
      text: rq.text,
      options: rq.options,
      correctOptionIndex: rq.correctOptionIndex,
      explanation: rq.explanation,
      metrics: {
        upvotes: 0,
        downvotes: 0,
        timesAnswered: 0,
        timesCorrect: 0
      }
    }));

    // 6. Cập nhật và lưu Quiz
    existingQuiz.questions = newQuestions;
    existingQuiz.title = newLectureData.title;
    existingQuiz.updatedAt = new Date();
    await this.quizRepository.save(existingQuiz);
  }
}
