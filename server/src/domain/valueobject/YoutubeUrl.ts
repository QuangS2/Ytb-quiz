import { InvalidYoutubeUrlException } from '../exception/InvalidYoutubeUrlException';

export class YoutubeUrl {
  public readonly value: string;
  public readonly youtubeId: string;

  private static readonly YOUTUBE_REGEX = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;

  constructor(url: string) {
    if (!url || typeof url !== 'string') {
      throw new InvalidYoutubeUrlException(url || '');
    }

    const id = this.extractId(url);
    if (!id) {
      throw new InvalidYoutubeUrlException(url);
    }

    this.value = url;
    this.youtubeId = id;
  }

  private extractId(url: string): string | null {
    const match = url.match(YoutubeUrl.YOUTUBE_REGEX);
    return match ? match[1] : null;
  }

  public equals(other: YoutubeUrl): boolean {
    if (!(other instanceof YoutubeUrl)) {
      return false;
    }
    return this.youtubeId === other.youtubeId;
  }

  public getCleanUrl(): string {
    return `https://www.youtube.com/watch?v=${this.youtubeId}`;
  }
}
