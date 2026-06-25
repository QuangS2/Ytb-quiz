import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Readable, PassThrough } from 'stream';
import { AudioExtractorPort } from '../../application/port/output/AudioExtractorPort';
import { AudioExtractionException } from '../../domain/exception/AudioExtractionException';

export class YtdlAudioExtractor implements AudioExtractorPort {
  private getCommandAndArgs(): { command: string; baseArgs: string[] } {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      return { command: 'python', baseArgs: ['-m', 'yt_dlp'] };
    }

    // Trên Linux/macOS, ưu tiên sử dụng standalone binary cục bộ nằm trong thư mục dist
    const localYtdlp = path.join(process.cwd(), 'dist', 'yt-dlp');
    if (fs.existsSync(localYtdlp)) {
      return { command: localYtdlp, baseArgs: [] };
    }

    return { command: 'python3', baseArgs: ['-m', 'yt_dlp'] };
  }

  public async extractAudio(youtubeId: string): Promise<Readable> {
    return new Promise((resolve, reject) => {
      try {
        const cleanUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
        const { command, baseArgs } = this.getCommandAndArgs();

        console.log(`[YtdlAudioExtractor] Sử dụng: ${command} ${baseArgs.join(' ')} để tải video ID: ${youtubeId}`);
        
        const child = spawn(command, [
          ...baseArgs,
          '-f', 'bestaudio',
          '-o', '-',
          '--no-playlist',
          '--extractor-args', 'youtube:player-client=web_embedded,android,mweb',
          cleanUrl
        ]);

        const passThrough = new PassThrough();
        const stderrChunks: Buffer[] = [];

        // Bắt lỗi nếu không khởi chạy được (ví dụ ENOENT)
        child.on('error', (err: any) => {
          console.error('[YtdlAudioExtractor] Lỗi khởi chạy yt-dlp:', err.message);
          passThrough.destroy(new AudioExtractionException(youtubeId, `Không thể khởi chạy yt-dlp. Chi tiết: ${err.message}`));
        });

        // Tích lũy dữ liệu stderr để trích xuất thông tin lỗi chi tiết
        child.stderr.on('data', (chunk) => {
          stderrChunks.push(Buffer.from(chunk));
        });

        // Pipe stdout (luồng audio) vào PassThrough nhưng không tự động đóng stream (end: false)
        // để ta tự quyết định qua exit code của tiến trình con
        child.stdout.pipe(passThrough, { end: false });

        child.on('close', (code) => {
          const stderrStr = Buffer.concat(stderrChunks).toString().trim();
          if (code !== 0) {
            console.error(`[YtdlAudioExtractor] Tiến trình kết thúc với mã lỗi ${code}. Stderr: ${stderrStr}`);
            passThrough.destroy(new AudioExtractionException(
              youtubeId, 
              `yt-dlp kết thúc với mã lỗi ${code}. Chi tiết: ${stderrStr || 'Không có thông tin lỗi trong stderr.'}`
            ));
          } else {
            // Hoàn thành thành công, đóng passThrough
            passThrough.end();
          }
        });

        // Giải quyết Promise ngay lập tức bằng passThrough. Nếu sau đó tiến trình lỗi,
        // passThrough sẽ bị destroy với lỗi, và vòng lặp for await trong GeminiAIService sẽ ném ra lỗi này.
        resolve(passThrough);
      } catch (error: any) {
        reject(new AudioExtractionException(youtubeId, error.message));
      }
    });
  }
}
