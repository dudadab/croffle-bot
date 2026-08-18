import { container } from '@sapphire/framework';
import type Innertube from 'youtubei.js';
import type { Types } from 'youtubei.js';

import { downloadMediaToFile, removeIfExists } from './youtube-media.js';
import type { YouTubePoTokenMinter } from './youtube-po-token.js';
import { downloadSabrAudio } from './youtube-sabr.js';

// WHY: default WEB/ANDROID clients often return SABR-only adaptive formats with
// no `url`. These still sometimes expose progressive URLs. Order is "most likely
// to still have a cipher/url" first so we do not wait on SABR unless we must.
const PROGRESSIVE_CLIENTS: Types.InnerTubeClient[] = [
  'TV',
  'MWEB',
  'YTMUSIC',
  'IOS',
  'TV_EMBEDDED',
  'WEB_EMBEDDED',
  'WEB_CREATOR',
  'ANDROID',
];

type DirectFormat = {
  itag: number;
  bitrate: number;
  content_length?: number;
  mime_type: string;
  has_audio: boolean;
  has_video: boolean;
  url?: string;
  signature_cipher?: string;
  cipher?: string;
};

async function decipherFormatUrl(
  format: DirectFormat,
  player: object | undefined,
): Promise<string> {
  const decipher = (format as DirectFormat & { decipher?: (value?: object) => Promise<string> })
    .decipher;
  if (!decipher) {
    throw new Error('Format has no decipher method');
  }

  return decipher.call(format, player);
}

function hasDirectUrl(format: DirectFormat): boolean {
  return Boolean(format.url || format.signature_cipher || format.cipher);
}

function pickDirectAudioFormat(info: {
  streaming_data?: {
    formats?: DirectFormat[];
    adaptive_formats?: DirectFormat[];
  };
}): DirectFormat | undefined {
  const all = [
    ...(info.streaming_data?.formats ?? []),
    ...(info.streaming_data?.adaptive_formats ?? []),
  ];
  const withUrl = all.filter((format) => format.has_audio && hasDirectUrl(format));
  const audioOnly = withUrl.filter((format) => !format.has_video);
  // WHY: `chooseFormat({ type: 'audio', quality: 'best' })` picks the highest
  // bitrate even when that itag is SABR-only (no url/cipher). We only consider
  // formats that can actually be fetched, and prefer audio-only over muxed.
  const pool = audioOnly.length > 0 ? audioOnly : withUrl;
  pool.sort((left, right) => right.bitrate - left.bitrate);
  return pool[0];
}

function withPoToken(url: string, poToken: string | undefined): string {
  if (!poToken) {
    return url;
  }

  // WHY: googlevideo 403s many progressive URLs unless `pot` is on the query.
  // youtubei.js only auto-appends it when the session itself has po_token.
  const parsed = new URL(url);
  parsed.searchParams.set('pot', poToken);
  return parsed.toString();
}

async function downloadProgressiveAudio(
  innertube: Innertube,
  videoId: string,
  filePath: string,
  poToken: string | undefined,
): Promise<boolean> {
  for (const client of PROGRESSIVE_CLIENTS) {
    try {
      container.logger.info(`[CustomYT] Trying progressive download via ${client}`);
      const info = await innertube.getBasicInfo(videoId, {
        client,
        po_token: poToken,
      });
      const format = pickDirectAudioFormat(info);
      if (!format) {
        const total =
          (info.streaming_data?.formats?.length ?? 0) +
          (info.streaming_data?.adaptive_formats?.length ?? 0);
        container.logger.warn(`[CustomYT] ${client} has no URL formats (total=${total})`);
        continue;
      }

      const url = withPoToken(
        await decipherFormatUrl(format, innertube.session.player as object | undefined),
        poToken,
      );
      container.logger.info(
        `[CustomYT] ${client} selected itag=${format.itag} mime=${format.mime_type} bytes=${format.content_length ?? '?'}`,
      );

      const size = await downloadMediaToFile(innertube, url, filePath, format.content_length);
      container.logger.info(
        `[CustomYT] Progressive download finished via ${client} (${size} bytes)`,
      );
      return true;
    } catch (error) {
      container.logger.warn(`[CustomYT] Progressive ${client} failed:`, error);
      removeIfExists(filePath);
    }
  }

  return false;
}

export async function downloadYouTubeAudio(options: {
  innertube: Innertube;
  poTokenMinter: YouTubePoTokenMinter;
  videoId: string;
  filePath: string;
}): Promise<void> {
  const { innertube, poTokenMinter, videoId, filePath } = options;
  let poToken: string | undefined;

  try {
    await poTokenMinter.init(innertube);
    // WHY: web clients mint a content-bound token per video id. Binding to
    // visitorData (session token) is no longer what youtube.com sends.
    poToken = await poTokenMinter.mint(videoId);
    container.logger.info(`[CustomYT] PO token ${poToken ? 'ready' : 'unavailable'}`);
  } catch (error) {
    container.logger.warn('[CustomYT] PO token mint failed; continuing without it:', error);
  }

  try {
    const progressiveOk = await downloadProgressiveAudio(innertube, videoId, filePath, poToken);
    if (progressiveOk) {
      return;
    }

    if (!poToken) {
      throw new Error('SABR download requires a PO token');
    }

    container.logger.info('[CustomYT] Starting SABR audio download');
    await downloadSabrAudio(innertube, videoId, filePath, poToken);
  } catch (error) {
    // WHY: a failed attempt must not leave a stub m4a, or the next play treats
    // it as a cache hit and audio cuts off.
    removeIfExists(filePath);
    throw error;
  }
}
