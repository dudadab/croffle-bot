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

  return parts.reduce((total, part) => total * 60 + part, 0);
}

/** Floor at ~64 kbps so truncated caches are rejected. */
export function minBytesForDuration(seconds: number): number {
  if (seconds <= 0) {
    return 64 * 1024;
  }

  return Math.max(64 * 1024, Math.floor(seconds * 8000));
}
