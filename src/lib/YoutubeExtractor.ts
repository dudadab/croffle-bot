import { BaseExtractor, ExtractorInfo, ExtractorSearchContext, SearchQueryType, Track } from 'discord-player';
import play from 'play-dl';

export class YouTubeExtractor extends BaseExtractor {
	public override get identifier() {
		return 'com.discord-player.youtubeextractor' as const;
	}

	public override async validate(query: string, _type?: SearchQueryType): Promise<boolean> {
		return typeof query === 'string' && play.yt_validate(query) !== false;
	}

	public override async handle(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo> {
		const isUrl = play.yt_validate(query) === 'video' || play.yt_validate(query) === 'playlist';

		try {
			if (isUrl) {
				const info = await play.video_info(query);
				const track = new Track(this.context.player, {
					title: info.video_details.title ?? 'Unknown Title',
					author: info.video_details.channel?.name ?? 'Unknown Artist',
					url: info.video_details.url,
					thumbnail: info.video_details.thumbnails[0].url,
					duration: info.video_details.durationRaw,
					views: info.video_details.views,
					requestedBy: context.requestedBy,
					source: 'youtube'
				});
				return this.createResponse(null, [track]);
			}

			const searchResults = await play.search(query, { limit: 1, source: { youtube: 'video' } });
			if (searchResults.length === 0) return this.createResponse();

			const track = new Track(this.context.player, {
				title: searchResults[0].title ?? 'Unknown Title',
				author: searchResults[0].channel?.name ?? 'Unknown Artist',
				url: searchResults[0].url,
				thumbnail: searchResults[0].thumbnails[0].url,
				duration: searchResults[0].durationRaw,
				views: searchResults[0].views,
				requestedBy: context.requestedBy,
				source: 'youtube'
			});

			return this.createResponse(null, [track]);
		} catch (error) {
			console.error('[YouTubeExtractor] Handle Error:', error);
			return this.createResponse();
		}
	}

	public override async stream(info: Track): Promise<string | import('stream').Readable> {
		try {
			console.log(`[YouTubeExtractor] Attempting to stream: ${info.url}`);

			const stream = await play.stream(info.url, {
				quality: 2,
				seek: 0
			});

			if (!stream) {
				throw new Error('Stream object is null or undefined');
			}

			return stream.stream;
		} catch (error: any) {
			console.error('[YouTubeExtractor] Stream Extraction Failed:', error.message);
			console.error(error);
			throw error;
		}
	}
}
