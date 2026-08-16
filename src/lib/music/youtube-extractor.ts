import { spawn } from 'node:child_process';
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  renameSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';

import { container } from '@sapphire/framework';
import { BaseExtractor, type ExtractorInfo, type ExtractorStreamable, Track } from 'discord-player';
import ffmpegPath from 'ffmpeg-static';

import { getEnv } from '../env';

type InnertubeClient = {
  getBasicInfo: (
    videoId: string,
    options?: { client?: string },
  ) => Promise<{
    basic_info: {
      title?: string;
      author?: string;
      thumbnail?: { url?: string }[];
      duration?: number;
      view_count?: number;
    };
  }>;
  download: (
    videoId: string,
    options?: {
      type?: string;
      quality?: string;
      format?: string;
      client?: string;
    },
  ) => Promise<ReadableStream | Readable>;
};

const YOUTUBE_URL_RE =
  /^https?:\/\/(www\.|m\.|music\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\//i;

const DOWNLOAD_CLIENTS = ['ANDROID', 'IOS', 'TV', 'WEB'] as const;

export class CustomYoutubeExtractor extends BaseExtractor {
  private yt: InnertubeClient | null = null;
  private readonly tempDir = join(process.cwd(), 'dist/pipit-hub-streams');

  public static override get identifier() {
    return 'custom-youtube';
  }

  public override async activate() {
    this.protocols = ['youtube', 'youtubeVideo'];

    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true });
    }

    const { Innertube } = await import('youtubei.js');
    this.yt = (await Innertube.create({
      cookie: getEnv().youtubeCookie,
    })) as unknown as InnertubeClient;

    container.logger.info('[CustomYT] Extractor activated (local temp file mode)');
  }

  public override async validate(query: string) {
    return YOUTUBE_URL_RE.test(query) || /^[\w-]{11}$/.test(query);
  }

  public override async handle(query: string, _: unknown): Promise<ExtractorInfo> {
    try {
      const videoId = this.extractVideoId(query);
      container.logger.debug(`[CustomYT] Fetching info for video: ${videoId}`);

      if (!this.yt) {
        throw new Error('YouTube extractor not initialized.');
      }

      const info = await this.yt.getBasicInfo(videoId, { client: 'ANDROID' });
      const videoDetails = info.basic_info;

      container.logger.debug(`[CustomYT] Successfully fetched: ${videoDetails.title}`);

      const track = new Track(this.context.player, {
        title: videoDetails.title || 'Unknown',
        author: videoDetails.author || 'Unknown',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: videoDetails.thumbnail?.[0]?.url || '',
        duration: this.parseDuration(videoDetails.duration || 0),
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
      const videoId = this.extractVideoId(info.url);
      const tempFilePath = join(this.tempDir, `${videoId}.m4a`);

      if (!this.isUsableCache(tempFilePath)) {
        const legacyPath = join(this.tempDir, `${videoId}.audio`);
        if (this.isUsableCache(legacyPath)) {
          renameSync(legacyPath, tempFilePath);
        } else {
          await this.downloadAudioFile(videoId, tempFilePath);
        }
      }

      const stats = statSync(tempFilePath);
      container.logger.debug(`[CustomYT] Stream ready (${stats.size} bytes): ${tempFilePath}`);

      // Decode locally to PCM. Returning a file path makes discord-player add HTTP
      // `-reconnect*` flags that abort local files almost immediately on Windows.
      const ffmpeg = spawn(
        ffmpegPath,
        [
          '-hide_banner',
          '-loglevel',
          'error',
          '-i',
          tempFilePath,
          '-analyzeduration',
          '0',
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
    } catch (error) {
      container.logger.error('[CustomYT] Error in stream:', error);
      throw error;
    }
  }

  private isUsableCache(path: string): boolean {
    if (!existsSync(path)) {
      return false;
    }

    try {
      return statSync(path).size > 0;
    } catch {
      return false;
    }
  }

  private async downloadAudioFile(videoId: string, tempFilePath: string): Promise<void> {
    if (!this.yt) {
      throw new Error('YouTube extractor not initialized.');
    }

    if (existsSync(tempFilePath)) {
      unlinkSync(tempFilePath);
    }

    let lastError: unknown;

    for (const client of DOWNLOAD_CLIENTS) {
      try {
        container.logger.info(`[CustomYT] Downloading ${videoId} via ${client}`);

        const webStream = await this.yt.download(videoId, {
          type: 'audio',
          quality: 'best',
          format: 'any',
          client,
        });

        await this.writeStreamToFile(webStream, tempFilePath);

        const size = statSync(tempFilePath).size;
        if (size === 0) {
          throw new Error('Downloaded file is empty (0 bytes)');
        }

        container.logger.info(`[CustomYT] Download finished via ${client} (${size} bytes)`);
        return;
      } catch (error) {
        lastError = error;
        container.logger.warn(`[CustomYT] Download via ${client} failed:`, error);
        if (existsSync(tempFilePath)) {
          unlinkSync(tempFilePath);
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`Failed to download audio for ${videoId}`);
  }

  private async writeStreamToFile(
    webStream: ReadableStream | Readable,
    tempFilePath: string,
  ): Promise<void> {
    const fs = createWriteStream(tempFilePath);
    const nodeReadable =
      webStream instanceof Readable
        ? webStream
        : Readable.fromWeb(webStream as Parameters<typeof Readable.fromWeb>[0]);

    await new Promise<void>((resolve, reject) => {
      nodeReadable.pipe(fs);
      fs.on('finish', () => {
        fs.close();
        resolve();
      });
      fs.on('error', reject);
      nodeReadable.on('error', reject);
    });
  }

  private extractVideoId(url: string): string {
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

  private parseDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}
