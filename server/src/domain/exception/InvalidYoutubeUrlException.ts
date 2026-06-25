import { BusinessException } from './BusinessException';

export class InvalidYoutubeUrlException extends BusinessException {
  constructor(url: string) {
    super('INVALID_YOUTUBE_URL', `Đường dẫn YouTube không hợp lệ hoặc không được hỗ trợ: ${url}`);
  }
}
