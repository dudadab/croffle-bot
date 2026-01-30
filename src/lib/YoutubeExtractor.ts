import { BaseExtractor, ExtractorStreamable, StreamType, Track } from 'discord-player';
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';

export class CustomYoutubeExtractor extends BaseExtractor {
	private yt: any | null = null;
	private readonly tempDir = join(process.cwd(), 'dist/croffle-bot-streams');

	public static override get identifier() {
		return 'custom-youtube';
	}

	public override async activate() {
		this.protocols = ['youtube', 'youtubeVideo'];

		// 임시 디렉토리 생성
		if (!existsSync(this.tempDir)) {
			mkdirSync(this.tempDir, { recursive: true });
		}

		this.yt = await (
			await import('youtubei.js')
		).Innertube.create({
			cookie: process.env.YOUTUBE_COOKIE
		});

		console.log('[CustomYT] Extractor activated (Local Temp File Mode)');
	}

	public override async validate(query: string) {
		return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(query);
	}

	public override async handle(query: string, _: any): Promise<any> {
		try {
			const videoId = this.extractVideoId(query);
			console.log(`[CustomYT] Fetching info for video: ${videoId}`);

			// ANDROID 클라이언트로 정보 가져오기
			const info = await this.yt.getBasicInfo(videoId, { client: 'ANDROID' });

			const videoDetails = info.basic_info;

			console.log(`[CustomYT] Successfully fetched: ${videoDetails.title}`);

			// Track 객체 생성
			const track: Track = new Track(this.context.player, {
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
				}
			});

			return this.createResponse(null, [track]);
		} catch (error: any) {
			console.error('[CustomYT] Error in handle:', error.message);
			throw error;
		}
	}

	public override async stream(info: Track): Promise<ExtractorStreamable> {
		if (!this.yt) throw new Error('YouTube extractor not initialized.');

		const videoId = this.extractVideoId(info.url);
		const tempFilePath = join(this.tempDir, `${videoId}-${Date.now()}.webm`);
		try {
			// 고유한 파일명 생성 (충돌 방지)

			console.log(`[CustomYT] Downloading: ${videoId}`);

			const webStream = await this.yt.download(videoId, {
				type: 'audio',
				quality: 'best',
				format: 'webm', // opus 코덱을 포함한 webm이 디스코드 처리에 가장 빠름
				client: 'ANDROID'
			});

			const fs = createWriteStream(tempFilePath);
			const nodeReadable = Readable.fromWeb(webStream as any);

			// 파이핑 및 완료 대기
			await new Promise<void>((resolve, reject) => {
				nodeReadable.pipe(fs);
				fs.on('finish', () => {
					fs.close();
					resolve();
				});
				fs.on('error', reject);
			});

			console.log(`[CustomYT] Download finished: ${tempFilePath}`);

			// 파일이 실제로 존재하는지 최종 확인
			if (!existsSync(tempFilePath)) {
				throw new Error(`[CustomYT] File does not exist: ${tempFilePath}`);
			}
			const stats = statSync(tempFilePath);
			console.log(`[CustomYT] [DEBUG] File saved. Size: ${stats.size} bytes`);

			if (stats.size === 0) {
				throw new Error('[CustomYT] Saved file is empty (0 bytes)');
			}

			// 읽기 스트림 생성
			const readable = createReadStream(tempFilePath);

			const cleanup = () => {
				if (existsSync(tempFilePath)) {
					try {
						unlinkSync(tempFilePath);
						console.log(`[CustomYT] Temp file deleted.`);
					} catch (e) {
						console.error(`[CustomYT] Error deleting temp file:`, e);
					}
				}
			};

			// 스트림 종료 시 정리
			readable.on('end', cleanup);
			readable.on('error', cleanup);

			return {
				$fmt: 'arbitrary',
				stream: readable,
				// @ts-ignore
				type: StreamType.Opus
			};
		} catch (err: any) {
			console.error('[CustomYT] Stream Error:', err.message);
			if (existsSync(tempFilePath)) unlinkSync(tempFilePath);
			throw err;
		}
	}

	private extractVideoId(url: string): string {
		// youtu.be 형식
		let match = url.match(/youtu\.be\/([\w-]{11})/);
		if (match) return match[1];

		// youtube.com 형식
		match = url.match(/[?&]v=([\w-]{11})/);
		if (match) return match[1];

		// 그냥 ID인 경우
		if (/^[\w-]{11}$/.test(url)) return url;

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
