import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
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
    return 'yt-dlp'; // Mặc định trong PATH
  }

  public async extractAudio(youtubeId: string): Promise<Readable> {
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

      return child.stdout;
    } catch (error: any) {
      throw new AudioExtractionException(youtubeId, error.message);
    }
  }
}
