import { BaseExtractor, ExtractorStreamable, Track } from 'discord-player';

export class CustomYoutubeExtractor extends BaseExtractor {
	private yt: any | null = null;

	public override async activate() {
		this.protocols = ['youtube', 'youtubeVideo'];

		this.yt = await (
			await import('youtubei.js')
		).Innertube.create({
			cookie: process.env.YOUTUBE_COOKIE
		});

		console.log('[CustomYT] Extractor activated with ANDROID client');
	}

	public static override get identifier() {
		return 'custom-youtube';
	}

	public override async validate(query: string) {
		return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(query);
	}

	public override async handle(query: string, _: any): Promise<any> {
		try {
			const videoId = this.extractVideoId(query);
			console.log(`[CustomYT] Fetching info for video: ${videoId}`);

			// ANDROID 클라이언트로 정보 가져오기
			const info = await this.yt.getInfo(videoId, { client: 'ANDROID' });

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
		if (!this.yt) {
			throw new Error('YouTube client not initialized');
		}

		try {
			const videoId = this.extractVideoId(info.url);
			console.log(`[CustomYT] Creating stream for: ${videoId}`);

			// 메타데이터에서 정보 재사용 또는 새로 가져오기
			const ytInfo = info.metadata || (await this.yt.getInfo(videoId, { client: 'ANDROID' }));

			const formats = ytInfo.streaming_data?.adaptive_formats || [];
			const audioFormat = formats.filter((f: any) => f.has_audio && !f.has_video).sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];

			if (!audioFormat?.url) {
				throw new Error('No audio stream URL found');
			}

			console.log(`[CustomYT] Stream URL found, itag: ${audioFormat.itag}`);

			return {
				stream: audioFormat.url,
				$fmt: 'arbitrary'
			};
		} catch (error: any) {
			console.error('[CustomYT] Error in stream:', error.message);
			throw error;
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
