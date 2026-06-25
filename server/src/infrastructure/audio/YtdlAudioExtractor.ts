import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Readable, PassThrough } from 'stream';
import { AudioExtractorPort } from '../../application/port/output/AudioExtractorPort';
import { AudioExtractionException } from '../../domain/exception/AudioExtractionException';

export class YtdlAudioExtractor implements AudioExtractorPort {
  private getDlpPath(): string {
    const userProfile = process.env.USERPROFILE || '';
    if (userProfile) {
      const pythonDir = path.join(userProfile, 'AppData', 'Roaming', 'Python');
      if (fs.existsSync(pythonDir)) {
        try {
          const subdirs = fs.readdirSync(pythonDir);
          for (const subdir of subdirs) {
            const candidate = path.join(pythonDir, subdir, 'Scripts', 'yt-dlp.exe');
            if (fs.existsSync(candidate)) {
              return candidate;
            }
          }
        } catch (e) {
          // Bỏ qua lỗi đọc thư mục
        }
      }
    }
    return 'yt-dlp'; // Mặc định trong PATH (dùng cho Linux/Railway)
  }

  public async extractAudio(youtubeId: string): Promise<Readable> {
    return new Promise((resolve, reject) => {
      try {
        const cleanUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
        const ytDlpPath = this.getDlpPath();

        console.log(`[YtdlAudioExtractor] Sử dụng yt-dlp tại: ${ytDlpPath} để tải video ID: ${youtubeId}`);
        
        const child = spawn(ytDlpPath, [
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
