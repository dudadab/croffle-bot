// test-youtube.ts
import { Innertube } from 'youtubei.js';

async function testClients() {
	const clients = ['WEB', 'ANDROID', 'TV_EMBEDDED', 'IOS'];
	const videoId = 'SYacnl6MpSA';

	for (const client of clients) {
		try {
			console.log(`\n=== Testing ${client} ===`);
			const yt = await Innertube.create({
				cookie: process.env.YOUTUBE_COOKIE
			});

			const info = await yt.getInfo(videoId, { client: client as any });

			const formats = info.streaming_data?.adaptive_formats || [];
			console.log(`Found ${formats.length} formats`);

			const audioFormat = formats.find((f) => f.has_audio && !f.has_video);
			if (audioFormat) {
				console.log(`Audio format itag: ${audioFormat.itag}`);
				console.log(`Has URL: ${!!audioFormat.url}`);
				console.log(`Has signatureCipher: ${!!audioFormat.signature_cipher}`);

				if (audioFormat.url) {
					console.log(`✅ ${client} works! Direct URL available`);
				}
			}
		} catch (error: any) {
			console.log(`❌ ${client} failed:`, error.message);
		}
	}
}

testClients();
