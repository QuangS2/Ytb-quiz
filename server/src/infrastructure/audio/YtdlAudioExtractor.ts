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
          cleanUrl
        ]);

        const passThrough = new PassThrough();

        // Bắt lỗi nếu không tìm thấy phần mềm yt-dlp (ví dụ trên Railway chưa cài)
        child.on('error', (err: any) => {
          console.error('[YtdlAudioExtractor] Lỗi khởi chạy yt-dlp:', err.message);
          reject(new AudioExtractionException(youtubeId, `Không thể khởi chạy yt-dlp. Đảm bảo phần mềm đã được cài đặt. Chi tiết: ${err.message}`));
        });

        // Bắt lỗi trong quá trình tải
        child.stderr.on('data', (data) => {
          const msg = data.toString();
          if (msg.toLowerCase().includes('error')) {
             console.error('[YtdlAudioExtractor stderr]:', msg);
          }
        });

        child.on('close', (code) => {
          if (code !== 0) {
            console.warn(`[YtdlAudioExtractor] Tiến trình kết thúc với mã lỗi ${code}`);
            passThrough.destroy(new Error(`yt-dlp exited with error code ${code}. Có thể do IP bị YouTube chặn hoặc thiếu bản cập nhật yt-dlp mới nhất.`));
          }
        });

        // Pipe stdout (luồng audio) vào PassThrough
        child.stdout.pipe(passThrough);

        resolve(passThrough);
      } catch (error: any) {
        reject(new AudioExtractionException(youtubeId, error.message));
      }
    });
  }
}
