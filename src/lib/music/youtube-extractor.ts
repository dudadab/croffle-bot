/**
 * discord-player extractor: resolve metadata, download audio to a local file,
 * then decode that file to 48 kHz stereo PCM for voice.
 */
import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  utimesSync,
} from 'node:fs';
import { join } from 'node:path';

import { container } from '@sapphire/framework';
import { BaseExtractor, type ExtractorInfo, type ExtractorStreamable, Track } from 'discord-player';
import ffmpegPath from 'ffmpeg-static';
import type Innertube from 'youtubei.js' with { 'resolution-mode': 'import' };

import { downloadYouTubeAudio } from './youtube-download';
import {
  durationToSeconds,
  extractVideoId,
  minBytesForDuration,
  parseDuration,
} from './youtube-id';
import { createYouTubeSession } from './youtube-innertube';
import { YouTubePoTokenMinter } from './youtube-po-token';

const YOUTUBE_URL_RE =
  /^https?:\/\/(www\.|m\.|music\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\//i;

// WHY: a 5-person server replays the same tracks. 7 days plus touch-on-play
// keeps those files and drops one-off downloads.
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class CustomYoutubeExtractor extends BaseExtractor {
  private yt: Innertube | null = null;
  private readonly poTokenMinter = new YouTubePoTokenMinter();
  private readonly tempDir = join(process.cwd(), 'dist/pipit-hub-streams');

  public static override get identifier() {
    return 'custom-youtube';
  }

  public override async activate() {
    this.protocols = ['youtube', 'youtubeVideo'];

    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true });
    }

    this.yt = await createYouTubeSession();
    container.logger.info('[CustomYT] Extractor activated (SABR / progressive)');

    try {
      // Warm BotGuard before the first !play so the user is not waiting on VM init.
      await this.poTokenMinter.init(this.yt);
    } catch (error: unknown) {
      container.logger.warn('[CustomYT] PO token warmup failed:', error);
    }
  }

  public override async validate(query: string) {
    return YOUTUBE_URL_RE.test(query) || /^[\w-]{11}$/.test(query);
  }

  public override async handle(query: string, _: unknown): Promise<ExtractorInfo> {
    try {
      if (!this.yt) {
        throw new Error('YouTube extractor not initialized.');
      }

      const videoId = extractVideoId(query);
      container.logger.debug(`[CustomYT] Fetching info for video: ${videoId}`);

      // WHY: ANDROID/WEB player calls are more often SABR-only or non-2xx.
      // MWEB is enough for title/duration; the real client is chosen at download.
      const info = await this.yt.getBasicInfo(videoId, { client: 'MWEB' });
      const videoDetails = info.basic_info;
      container.logger.debug(`[CustomYT] Successfully fetched: ${videoDetails.title}`);

      const track = new Track(this.context.player, {
        title: videoDetails.title || 'Unknown',
        author: videoDetails.author || 'Unknown',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: videoDetails.thumbnail?.[0]?.url || '',
        duration: parseDuration(videoDetails.duration || 0),
        views: videoDetails.view_count || 0,
        source: 'youtube',
        queryType: 'youtubeVideo',
        metadata: info,
        async requestMetadata() {
          return info;
        },
      });

      return this.createResponse(null, [track]);
    } catch (error) {
      container.logger.error('[CustomYT] Error in handle:', error);
      throw error;
    }
  }

  public override async stream(info: Track): Promise<ExtractorStreamable> {
    if (!this.yt) {
      throw new Error('YouTube extractor not initialized.');
    }

    if (!ffmpegPath) {
      throw new Error('ffmpeg-static binary path is missing');
    }

    try {
      const videoId = extractVideoId(info.url);
      const tempFilePath = join(this.tempDir, `${videoId}.m4a`);
      const minBytes = minBytesForDuration(durationToSeconds(info.duration));
      this.purgeExpiredCache(tempFilePath);

      if (!this.isUsableCache(tempFilePath, minBytes)) {
        const legacyPath = join(this.tempDir, `${videoId}.audio`);
        if (this.isUsableCache(legacyPath, minBytes)) {
          renameSync(legacyPath, tempFilePath);
        } else {
          if (existsSync(tempFilePath)) {
            // WHY: a previous failed download can leave a too-small .m4a.
            // Delete it before retrying or we would keep serving the stub.
            unlinkSync(tempFilePath);
          }
          await downloadYouTubeAudio({
            innertube: this.yt,
            poTokenMinter: this.poTokenMinter,
            videoId,
            filePath: tempFilePath,
          });
        }
      }

      const stats = statSync(tempFilePath);
      if (stats.size < minBytes) {
        unlinkSync(tempFilePath);
        throw new Error(`Downloaded file is too small (${stats.size} bytes)`);
      }

      this.touchCache(tempFilePath);
      container.logger.debug(`[CustomYT] Stream ready (${stats.size} bytes): ${tempFilePath}`);
      return this.decodeToPcm(tempFilePath);
    } catch (error) {
      container.logger.error('[CustomYT] Error in stream:', error);
      throw error;
    }
  }

  private isUsableCache(path: string, minBytes: number): boolean {
    if (!existsSync(path)) {
      return false;
    }

    try {
      return statSync(path).size >= minBytes;
    } catch {
      return false;
    }
  }

  private purgeExpiredCache(keepPath: string): void {
    let names: string[];
    try {
      names = readdirSync(this.tempDir);
    } catch (error) {
      container.logger.warn('[CustomYT] Cache purge listing failed:', error);
      return;
    }

    const now = Date.now();
    for (const name of names) {
      if (!name.endsWith('.m4a') && !name.endsWith('.audio')) {
        continue;
      }

      const filePath = join(this.tempDir, name);
      if (filePath === keepPath) {
        continue;
      }

      try {
        if (now - statSync(filePath).mtimeMs <= CACHE_TTL_MS) {
          continue;
        }

        unlinkSync(filePath);
        container.logger.debug(`[CustomYT] Expired cache removed: ${name}`);
      } catch (error) {
        // WHY: Windows can lock a file still held by ffmpeg from the previous track.
        container.logger.warn(`[CustomYT] Failed to remove expired cache ${name}:`, error);
      }
    }
  }

  private touchCache(filePath: string): void {
    const now = new Date();
    try {
      utimesSync(filePath, now, now);
    } catch (error) {
      container.logger.warn('[CustomYT] Cache touch failed:', error);
    }
  }

  private decodeToPcm(tempFilePath: string): ExtractorStreamable {
    // WHY: discord-player is created with skipFFmpeg. If we return an m4a/webm
    // path, the track ends in ~120ms. We must emit s16le 48kHz stereo ourselves.
    const ffmpeg = spawn(
      ffmpegPath as string,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-fflags',
        '+genpts',
        '-i',
        tempFilePath,
        '-af',
        'aresample=async=1',
        '-f',
        's16le',
        '-ar',
        '48000',
        '-ac',
        '2',
        'pipe:1',
      ],
      { windowsHide: true },
    );

    ffmpeg.stderr.on('data', (chunk: Buffer) => {
      container.logger.debug(`[CustomYT][ffmpeg] ${chunk.toString().trim()}`);
    });

    ffmpeg.on('error', (error) => {
      container.logger.error('[CustomYT][ffmpeg] process error:', error);
    });

    ffmpeg.on('close', (code) => {
      if (code && code !== 0) {
        container.logger.warn(`[CustomYT][ffmpeg] exited with code ${code}`);
      }
    });

    if (!ffmpeg.stdout) {
      throw new Error('ffmpeg stdout is unavailable');
    }

    return {
      stream: ffmpeg.stdout,
      $fmt: 'pcm',
    };
  }
}
