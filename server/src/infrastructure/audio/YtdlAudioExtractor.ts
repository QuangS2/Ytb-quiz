import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Readable, PassThrough } from 'stream';
import play from 'play-dl';
import { Innertube, UniversalCache } from 'youtubei.js';
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

  private async extractWithYtdlp(youtubeId: string): Promise<Readable> {
    return new Promise((resolve, reject) => {
      try {
        const cleanUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
        const { command, baseArgs } = this.getCommandAndArgs();

        console.log(`[YtdlAudioExtractor - yt-dlp] Sử dụng: ${command} ${baseArgs.join(' ')} để tải video ID: ${youtubeId}`);
        
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
        let hasData = false;
        let isSettled = false;

        // Bắt lỗi nếu không khởi chạy được (ví dụ ENOENT)
        child.on('error', (err: any) => {
          console.error('[YtdlAudioExtractor - yt-dlp] Lỗi khởi chạy:', err.message);
          if (!isSettled) {
            isSettled = true;
            reject(new AudioExtractionException(youtubeId, `Không thể khởi chạy yt-dlp. Chi tiết: ${err.message}`));
          }
          passThrough.destroy(err);
        });

        // Tích lũy dữ liệu stderr để trích xuất thông tin lỗi chi tiết
        child.stderr.on('data', (chunk) => {
          stderrChunks.push(Buffer.from(chunk));
        });

        // Lắng nghe dữ liệu ghi vào stdout
        child.stdout.on('data', (chunk) => {
          if (!hasData) {
            hasData = true;
            if (!isSettled) {
              isSettled = true;
              // Có dữ liệu đầu tiên, resolve ngay lập tức để stream tiếp tục
              resolve(passThrough);
            }
          }
          passThrough.write(chunk);
        });

        child.stdout.on('end', () => {
          passThrough.end();
        });

        child.on('close', (code) => {
          const stderrStr = Buffer.concat(stderrChunks).toString().trim();
          if (code !== 0) {
            console.error(`[YtdlAudioExtractor - yt-dlp] Tiến trình kết thúc với mã lỗi ${code}. Stderr: ${stderrStr}`);
            const error = new AudioExtractionException(
              youtubeId, 
              `yt-dlp kết thúc với mã lỗi ${code}. Chi tiết: ${stderrStr || 'Không có thông tin lỗi trong stderr.'}`
            );
            if (!isSettled) {
              isSettled = true;
              reject(error);
            }
            passThrough.destroy(error);
          } else {
            console.log('[YtdlAudioExtractor - yt-dlp] Tải audio hoàn tất thành công.');
            if (!isSettled) {
              isSettled = true;
              resolve(passThrough);
            }
          }
        });

      } catch (error: any) {
        reject(new AudioExtractionException(youtubeId, error.message));
      }
    });
  }

  public async extractAudio(youtubeId: string): Promise<Readable> {
    const cleanUrl = `https://www.youtube.com/watch?v=${youtubeId}`;

    // Thử 1: Tải bằng yt-dlp
    try {
      console.log(`[YtdlAudioExtractor] Thử tải bằng yt-dlp cho ID: ${youtubeId}`);
      const stream = await this.extractWithYtdlp(youtubeId);
      return stream;
    } catch (ytdlErr: any) {
      console.warn(`[YtdlAudioExtractor] yt-dlp thất bại: ${ytdlErr.message}. Thử fallback sang play-dl...`);
    }

    // Thử 2: Fallback sang play-dl
    try {
      console.log(`[YtdlAudioExtractor] Thử tải bằng play-dl cho ID: ${youtubeId}`);
      const playStream = await play.stream(cleanUrl, { quality: 2, discordPlayerCompatibility: true });
      console.log('[YtdlAudioExtractor] Khởi tạo play-dl stream thành công.');
      return playStream.stream;
    } catch (playErr: any) {
      console.warn(`[YtdlAudioExtractor] play-dl thất bại: ${playErr.message}. Thử fallback sang youtubei.js...`);
    }

    // Thử 3: Fallback sang youtubei.js
    try {
      console.log(`[YtdlAudioExtractor] Thử tải bằng youtubei.js cho ID: ${youtubeId}`);
      const yt = await Innertube.create({ cache: new UniversalCache(false) });
      const ytStream = await yt.download(youtubeId, {
        type: 'audio',
        quality: 'best',
        format: 'mp4'
      });
      console.log('[YtdlAudioExtractor] Khởi tạo youtubei.js stream thành công.');
      return Readable.from(ytStream as any);
    } catch (ytErr: any) {
      console.error(`[YtdlAudioExtractor] youtubei.js thất bại: ${ytErr.message}`);
    }

    throw new AudioExtractionException(
      youtubeId, 
      'Tất cả các phương thức trích xuất âm thanh (yt-dlp, play-dl, youtubei.js) đều thất bại do YouTube chặn IP máy chủ.'
    );
  }
}
