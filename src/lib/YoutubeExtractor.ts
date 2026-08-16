import { BaseExtractor, ExtractorStreamable, Track } from 'discord-player';
import { FFmpeg } from 'prism-media';
import {
	createReadStream,
	createWriteStream,
	existsSync,
	mkdirSync,
	statSync
	//unlinkSync
} from 'node:fs';
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
		const tempFilePath = join(this.tempDir, `${videoId}.webm`);

		if (!existsSync(tempFilePath)) {
			await this.downloadAudioFile(videoId, tempFilePath);
		}

		const stats = statSync(tempFilePath);
		console.log(`[CustomYT] File ready (${stats.size} bytes)`);
		console.log(`[CustomYT] Creating FFmpeg transcoder stream`);

		// prism-media의 FFmpeg를 사용하여 변환
		const transcoder = new FFmpeg({
			args: ['-analyzeduration', '0', '-loglevel', '0', '-f', 's16le', '-ar', '48000', '-ac', '2']
		});

		// 파일 읽기 스트림
		const input = createReadStream(tempFilePath);

		// 에러 핸들링
		input.on('error', (err) => {
			console.error('[CustomYT] Input stream error:', err);
		});

		transcoder.on('error', (err) => {
			console.error('[CustomYT] FFmpeg error:', err);
		});

		transcoder.on('spawn', () => {
			console.log('[CustomYT] FFmpeg process spawned');
		});

		transcoder.on('close', (code: any) => {
			console.log(`[CustomYT] FFmpeg closed with code: ${code}`);
		});

		// 파일 스트림을 FFmpeg로 파이핑
		input.pipe(transcoder);

		// FFmpeg transcoder 스트림 반환
		return transcoder;
	}

	private async downloadAudioFile(videoId: string, tempFilePath: string): Promise<void> {
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
