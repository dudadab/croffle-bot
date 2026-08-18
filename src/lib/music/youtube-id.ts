/**
 * Video-id parsing and cache-size helpers shared by the extractor and downloader.
 */

export function extractVideoId(url: string): string {
  let match = url.match(/youtu\.be\/([\w-]{11})/);
  if (match) {
    return match[1];
  }

  match = url.match(/[?&]v=([\w-]{11})/);
  if (match) {
    return match[1];
  }

  match = url.match(/\/(?:shorts|embed|live)\/([\w-]{11})/);
  if (match) {
    return match[1];
  }

  if (/^[\w-]{11}$/.test(url)) {
    return url;
  }

  throw new Error(`Could not extract video ID from: ${url}`);
}

export function parseDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function durationToSeconds(duration: string | number | undefined): number {
  if (typeof duration === 'number' && Number.isFinite(duration)) {
    return Math.max(0, duration);
  }

  if (!duration) {
    return 0;
  }

  const parts = String(duration)
    .split(':')
    .map((part) => Number(part));
  if (parts.length === 0 || parts.some((part) => Number.isNaN(part))) {
    return 0;
  }

  // WHY: "1:02:03" and "5:09" both fold left as total = total * 60 + part,
  // so the same reducer works for mm:ss and hh:mm:ss.
  return parts.reduce((total, part) => total * 60 + part, 0);
}

/**
 * Minimum on-disk size before a cached file is treated as complete.
 * Floor is ~64 kbps so a truncated SABR dump cannot be replayed as a full track.
 */
export function minBytesForDuration(seconds: number): number {
  if (seconds <= 0) {
    return 64 * 1024;
  }

  // WHY: failed SABR/progressive runs left ~1MB stubs. `size > 0` treated those
  // as hits, so the next play cut off early. 8000 bytes/sec ≈ 64 kbps is below
  // real YouTube audio (~128 kbps) but above those truncated files.
  return Math.max(64 * 1024, Math.floor(seconds * 8000));
}
