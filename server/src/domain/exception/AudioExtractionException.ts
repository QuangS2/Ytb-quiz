import { BusinessException } from './BusinessException';

export class AudioExtractionException extends BusinessException {
  constructor(youtubeId: string, details?: string) {
    super(
      'AUDIO_EXTRACTION_ERROR',
      `Không thể trích xuất âm thanh từ video YouTube ID: ${youtubeId}. ${details || ''}`
    );
  }
}
