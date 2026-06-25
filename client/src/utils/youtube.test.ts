import { describe, it, expect } from 'vitest';
import { extractYoutubeId } from './youtube';

describe('YouTube Utility - extractYoutubeId', () => {
  it('should successfully extract ID from standard watch URL', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    expect(extractYoutubeId(url)).toBe('dQw4w9WgXcQ');
  });

  it('should successfully extract ID from shortened youtu.be URL', () => {
    const url = 'https://youtu.be/dQw4w9WgXcQ';
    expect(extractYoutubeId(url)).toBe('dQw4w9WgXcQ');
  });

  it('should successfully extract ID from embed URL', () => {
    const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    expect(extractYoutubeId(url)).toBe('dQw4w9WgXcQ');
  });

  it('should return the ID itself if it matches the 11-character format', () => {
    const id = 'dQw4w9WgXcQ';
    expect(extractYoutubeId(id)).toBe('dQw4w9WgXcQ');
  });

  it('should handle query parameters in watch URLs', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=45s&feature=shared';
    expect(extractYoutubeId(url)).toBe('dQw4w9WgXcQ');
  });

  it('should return null for invalid hostnames or schemas', () => {
    const url1 = 'https://google.com/watch?v=dQw4w9WgXcQ';
    const url2 = 'not-a-url';
    const url3 = '';
    
    expect(extractYoutubeId(url1)).toBeNull();
    expect(extractYoutubeId(url2)).toBeNull();
    expect(extractYoutubeId(url3)).toBeNull();
  });

  it('should return null for invalid ID formats', () => {
    const url1 = 'https://www.youtube.com/watch?v=short';
    const url2 = 'https://www.youtube.com/watch?v=toolong12345';
    
    expect(extractYoutubeId(url1)).toBeNull();
    expect(extractYoutubeId(url2)).toBeNull();
  });
});
