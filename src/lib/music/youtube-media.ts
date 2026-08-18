import { createWriteStream, existsSync, statSync, unlinkSync } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import type Innertube from 'youtubei.js' with { 'resolution-mode': 'import' };

const CHUNK_SIZE = 10 * 1024 * 1024;

const MEDIA_HEADERS = {
  accept: '*/*',
  origin: 'https://www.youtube.com',
  referer: 'https://www.youtube.com/',
} as const;

export function createMediaFetch(innertube: Innertube): typeof fetch {
  const cookie = innertube.session.cookie;
  const userAgent = innertube.session.context.client.userAgent;

  return async (input, init) => {
    const headers = new Headers(init?.headers);
    if (cookie && !headers.has('cookie')) {
      headers.set('cookie', cookie);
    }
    if (userAgent && !headers.has('user-agent')) {
      headers.set('user-agent', userAgent);
    }
    if (!headers.has('origin')) {
      headers.set('origin', MEDIA_HEADERS.origin);
    }
    if (!headers.has('referer')) {
      headers.set('referer', MEDIA_HEADERS.referer);
    }

    return innertube.session.http.fetch_function(input, { ...init, headers });
  };
}

export function expectedLengthFromUrl(url: string): number | undefined {
  const clen = new URL(url).searchParams.get('clen');
  if (!clen) {
    return undefined;
  }

  const size = Number(clen);
  return Number.isFinite(size) && size > 0 ? size : undefined;
}

export async function fetchMedia(
  innertube: Innertube,
  url: string,
): Promise<ReadableStream<Uint8Array>> {
  const headers = new Headers(MEDIA_HEADERS);
  if (innertube.session.cookie) {
    headers.set('cookie', innertube.session.cookie);
  }

  const response = await innertube.session.http.fetch_function(url, {
    method: 'GET',
    headers,
    redirect: 'follow',
  });

  if (!response.ok || !response.body) {
    throw new Error(`Media fetch failed (${response.status})`);
  }

  return response.body;
}

function asNodeWebStream(body: ReadableStream<Uint8Array>): Parameters<typeof Readable.fromWeb>[0] {
  return body as Parameters<typeof Readable.fromWeb>[0];
}

export async function writeWebStreamToFile(
  webStream: ReadableStream<Uint8Array>,
  filePath: string,
): Promise<number> {
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }

  await pipeline(Readable.fromWeb(asNodeWebStream(webStream)), createWriteStream(filePath));
  return statSync(filePath).size;
}

export async function downloadMediaToFile(
  innertube: Innertube,
  url: string,
  filePath: string,
  contentLength?: number,
): Promise<number> {
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }

  const expected = contentLength ?? expectedLengthFromUrl(url);
  if (!expected) {
    const body = await fetchMedia(innertube, url);
    await pipeline(Readable.fromWeb(asNodeWebStream(body)), createWriteStream(filePath));
    return statSync(filePath).size;
  }

  let start = 0;
  let first = true;
  while (start < expected) {
    const end = Math.min(start + CHUNK_SIZE - 1, expected - 1);
    const body = await fetchMedia(innertube, `${url}&range=${start}-${end}`);
    await pipeline(
      Readable.fromWeb(asNodeWebStream(body)),
      createWriteStream(filePath, { flags: first ? 'w' : 'a' }),
    );
    first = false;
    start = end + 1;
  }

  const size = statSync(filePath).size;
  if (size < expected * 0.95) {
    unlinkSync(filePath);
    throw new Error(`Incomplete download (${size}/${expected} bytes)`);
  }

  return size;
}

export function removeIfExists(filePath: string): void {
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}
