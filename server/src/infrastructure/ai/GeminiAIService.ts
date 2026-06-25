import { Readable } from 'stream';
import { GoogleGenAI } from '@google/genai';
import { AIServicePort } from '../../application/port/output/AIServicePort';
import { Question } from '../../domain/model/Quiz';
import { QuizGenerationException } from '../../domain/exception/QuizGenerationException';

export class GeminiAIService implements AIServicePort {
  public async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const ai = new GoogleGenAI({ apiKey });
      await ai.models.list();
      return true;
    } catch (error) {
      return false;
    }
  }

  public async extractLectureContent(
    audioStream: Readable,
    mimeType: string,
    apiKey: string
  ): Promise<{ refinedScript: string; title: string; qualityScore: number }> {
    const ai = new GoogleGenAI({ apiKey });
    let fileRef: any = null;

    try {
      // 1. Chuyển đổi stream sang Buffer trong RAM (No-disk-storage)
      const chunks: Buffer[] = [];
      for await (const chunk of audioStream) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);

      if (buffer.length === 0) {
        throw new Error('Không thể tải âm thanh từ YouTube (Buffer rỗng 0 bytes). Có thể do YouTube chặn IP máy chủ hoặc video không khả dụng.');
      }

      // 2. Upload file lên Gemini File API bằng Blob
      // Node v18+ hỗ trợ lớp Blob toàn cục
      fileRef = await ai.files.upload({
        file: new Blob([buffer], { type: mimeType }),
        config: {
          mimeType: mimeType
        }
      });

      // 3. Đợi file xử lý thành công (PROCESSING -> ACTIVE)
      let fileState = await ai.files.get({ name: fileRef.name });
      while (fileState.state === 'PROCESSING') {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        fileState = await ai.files.get({ name: fileRef.name });
      }

      if (fileState.state === 'FAILED') {
        throw new Error('Gemini File API xử lý âm thanh thất bại.');
      }

      // 4. Bước 1 (AI Cleaner): Lọc sạch âm thanh để lấy kịch bản tinh lọc
      const prompt = `Bạn là một trợ lý học tập AI chuyên nghiệp. Hãy phân tích nội dung âm thanh bài học này, lọc sạch và trích xuất kịch bản học tập cốt lõi của bài giảng (refined script). Loại bỏ hoàn toàn thông tin rác, tên người dạy, quảng cáo, lời chào mừng hoặc các phần giao lưu không liên quan đến kiến thức học thuật.
Hãy trả về kết quả dưới dạng JSON chuẩn có cấu trúc chính xác như sau:
{
  "title": "Tiêu đề bài học cô đọng, súc tích",
  "refinedScript": "Toàn bộ nội dung kiến thức cốt lõi đã được lọc sạch",
  "qualityScore": 8.5
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            fileData: {
              fileUri: fileRef.uri,
              mimeType: fileRef.mimeType
            }
          },
          prompt
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      if (!response.text) {
        throw new Error('AI không trả về kết quả.');
      }

      const result = JSON.parse(response.text);
      return {
        title: result.title || 'Bài học YouTube',
        refinedScript: result.refinedScript || '',
        qualityScore: typeof result.qualityScore === 'number' ? result.qualityScore : 7.0
      };
    } catch (error: any) {
      throw new QuizGenerationException(`Lỗi trích xuất bài học: ${error.message}`);
    } finally {
      // 5. Bắt buộc xóa tệp tạm trên Gemini Cloud ngay lập tức sau khi sinh xong để bảo mật và tiết kiệm quota
      if (fileRef && fileRef.name) {
        try {
          await ai.files.delete({ name: fileRef.name });
        } catch (deleteError) {
          // Log lỗi xóa file nhưng không crash tiến trình chính
          console.error('[Gemini Cleanup Error]:', deleteError);
        }
      }
    }
  }

  public async generateQuizFromContent(
    refinedScript: string,
    apiKey: string
  ): Promise<Omit<Question, 'metrics'>[]> {
    try {
      const ai = new GoogleGenAI({ apiKey });

      // Bước 2 (AI Generator): Sinh câu hỏi trắc nghiệm từ kịch bản sạch
      const prompt = `Dựa trên nội dung học tập (refined script) sau đây, hãy sinh ra một bộ câu hỏi trắc nghiệm gồm từ 5 đến 10 câu hỏi để kiểm tra kiến thức của người học.
Nội dung kịch bản bài học:
"""
${refinedScript}
"""

Hãy trả về kết quả dưới dạng JSON là một mảng các câu hỏi, mỗi câu hỏi có cấu trúc chính xác như sau:
[
  {
    "id": "q-1",
    "text": "Nội dung câu hỏi trắc nghiệm",
    "options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
    "correctOptionIndex": 0,
    "explanation": "Giải thích chi tiết tại sao lựa chọn đó lại đúng"
  }
]`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      if (!response.text) {
        throw new Error('AI không sinh được câu hỏi.');
      }

      const questions = JSON.parse(response.text);
      return questions;
    } catch (error: any) {
      throw new QuizGenerationException(`Lỗi sinh bộ câu hỏi: ${error.message}`);
    }
  }

  public async mergeAndRefineScripts(
    oldScript: string,
    newScript: string,
    apiKey: string
  ): Promise<string> {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Bạn là một biên tập viên học thuật AI chuyên nghiệp. Tôi có hai bản kịch bản bài giảng (transcript/script) được trích xuất từ cùng một video YouTube.
Bản kịch bản cũ (Old Script):
"""
${oldScript}
"""

Bản kịch bản mới trích xuất (New Script):
"""
${newScript}
"""

Hãy đối chiếu hai bản kịch bản này, chọn lọc và hợp nhất chúng thành một bản kịch bản học tập tối ưu, chi tiết và chính xác nhất. Loại bỏ hoàn toàn các lỗi dịch thuật, lỗi chính tả, khoảng trống thông tin và các phần từ ngữ rác (quảng cáo, lời chào mừng không học thuật).
Hãy trả về kết quả dưới dạng JSON chuẩn có cấu trúc chính xác như sau:
{
  "mergedScript": "Toàn bộ nội dung kịch bản học tập tối ưu sau khi hợp nhất"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      if (!response.text) {
        throw new Error('AI không hợp nhất được kịch bản.');
      }

      const result = JSON.parse(response.text);
      return result.mergedScript || oldScript;
    } catch (error: any) {
      throw new QuizGenerationException(`Lỗi hợp nhất kịch bản bài học: ${error.message}`);
    }
  }

  public async generateReplacementQuestion(
    refinedScript: string,
    faultyQuestion: Omit<Question, 'metrics'>,
    apiKey: string
  ): Promise<Omit<Question, 'metrics'>> {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Dựa trên nội dung học tập (refined script) sau đây, hãy sinh ra một câu hỏi trắc nghiệm mới để thay thế cho một câu hỏi cũ bị lỗi (bị đánh giá thấp hoặc sai sót nội dung).
Nội dung kịch bản bài học:
"""
${refinedScript}
"""

Câu hỏi cũ bị lỗi (KHÔNG ĐƯỢC DÙNG LẠI nội dung hoặc đáp án của câu hỏi này):
- Nội dung câu hỏi cũ: "${faultyQuestion.text}"
- Các phương án trả lời cũ: ${JSON.stringify(faultyQuestion.options)}
- Chỉ số đáp án đúng cũ: ${faultyQuestion.correctOptionIndex}
- Giải thích cũ: "${faultyQuestion.explanation}"

Hãy trả về kết quả dưới dạng JSON là một đối tượng câu hỏi duy nhất có cấu trúc chính xác như sau:
{
  "id": "${faultyQuestion.id}",
  "text": "Nội dung câu hỏi trắc nghiệm mới",
  "options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
  "correctOptionIndex": 0,
  "explanation": "Giải thích chi tiết tại sao lựa chọn đó lại đúng"
}
Lưu ý: ID của câu hỏi mới phải giữ nguyên ID cũ là "${faultyQuestion.id}".`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      if (!response.text) {
        throw new Error('AI không sinh được câu hỏi mới thay thế.');
      }

      const newQuestion = JSON.parse(response.text);
      return newQuestion;
    } catch (error: any) {
      throw new QuizGenerationException(`Lỗi tự phục hồi câu hỏi: ${error.message}`);
    }
  }
}
