import ytdl from '@distube/ytdl-core';
import { Readable, PassThrough } from 'stream';
import { AudioExtractorPort } from '../../application/port/output/AudioExtractorPort';
import { AudioExtractionException } from '../../domain/exception/AudioExtractionException';

export class YtdlAudioExtractor implements AudioExtractorPort {
  public async extractAudio(youtubeId: string): Promise<Readable> {
    try {
      const cleanUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
      console.log(`[YtdlAudioExtractor] Sử dụng @distube/ytdl-core để tải luồng âm thanh từ: ${cleanUrl}`);
      
      // Khởi tạo một PassThrough stream để truyền dữ liệu trực tiếp vào RAM
      const passThrough = new PassThrough();
      
      // Tải audio stream với chất lượng tốt nhất
      const audioStream = ytdl(cleanUrl, { filter: 'audioonly', quality: 'highestaudio' });
      
      // Bắt các lỗi từ thư viện tải
      audioStream.on('error', (err) => {
        console.error(`[YtdlAudioExtractor Error]: ${err.message}`);
        passThrough.destroy(err);
      });

      // Kết nối luồng tải với luồng PassThrough
      audioStream.pipe(passThrough);

      return passThrough;
    } catch (error: any) {
      throw new AudioExtractionException(youtubeId, error.message);
    }
  }
}
