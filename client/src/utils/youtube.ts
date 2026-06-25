/**
 * Extract and validate YouTube Video ID from any YouTube URL format.
 * Matches exactly 11 characters of alphanumeric, dash, and underscore.
 */
export const extractYoutubeId = (url: string): string | null => {
  if (!url) return null;
  
  try {
    const trimmed = url.trim();
    
    // Check if the input is already just an 11-character Video ID
    const rawIdMatch = trimmed.match(/^[a-zA-Z0-9_-]{11}$/);
    if (rawIdMatch) {
      return rawIdMatch[0];
    }

    // Safely parse URL using the built-in URL object to prevent ReDoS
    const parsedUrl = new URL(trimmed);
    let videoId: string | null = null;

    if (parsedUrl.hostname === 'youtu.be') {
      // Shortened URL: youtu.be/VIDEO_ID
      videoId = parsedUrl.pathname.slice(1);
    } else if (
      parsedUrl.hostname.endsWith('youtube.com') || 
      parsedUrl.hostname.endsWith('youtube-nocookie.com')
    ) {
      if (parsedUrl.pathname.startsWith('/embed/')) {
        // Embed URL: youtube.com/embed/VIDEO_ID
        videoId = parsedUrl.pathname.split('/')[2];
      } else if (parsedUrl.pathname.startsWith('/v/')) {
        // Old watch URL: youtube.com/v/VIDEO_ID
        videoId = parsedUrl.pathname.split('/')[2];
      } else {
        // Standard URL: youtube.com/watch?v=VIDEO_ID
        videoId = parsedUrl.searchParams.get('v');
      }
    }

    // Strict validation: ID must be exactly 11 characters
    const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;
    if (videoId && YOUTUBE_ID_REGEX.test(videoId)) {
      return videoId;
    }
    
    return null;
  } catch (e) {
    return null;
  }
};
