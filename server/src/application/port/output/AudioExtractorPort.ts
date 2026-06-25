import { Readable } from 'stream';

export interface AudioExtractorPort {
  extractAudio(youtubeId: string): Promise<Readable>;
}
