/**
 * SABR (Server Adaptive BitRate) audio download via googlevideo.
 * Used when InnerTube clients no longer return progressive googlevideo URLs.
 */
import { container } from '@sapphire/framework';
import type { ReloadPlaybackContext } from 'googlevideo/protos' with {
  'resolution-mode': 'import',
};
import type { FormatStream } from 'googlevideo/shared-types' with { 'resolution-mode': 'import' };
import type Innertube from 'youtubei.js' with { 'resolution-mode': 'import' };

import { createMediaFetch, writeWebStreamToFile } from './youtube-media';

// WHY: formats with this xtag (Voice Boost) make the server emit
// "reload player response" and then `sabr.no_audio_selected`. Filtering them
// is the workaround from googlevideo#42.
const VOICE_BOOST_XTAG = 'CgcKAnZiEgEx';

type PlayerResponse = {
  streaming_data?: {
    server_abr_streaming_url?: string;
    adaptive_formats?: FormatStream[];
  };
  player_config?: {
    media_common_config: {
      media_ustreamer_request_config?: {
        video_playback_ustreamer_config?: string;
      };
    };
  };
  basic_info?: { duration?: number };
  video_details?: { duration?: number };
};

async function fetchPlayerResponse(
  innertube: Innertube,
  videoId: string,
  poToken: string,
  reloadPlaybackContext?: ReloadPlaybackContext,
): Promise<PlayerResponse> {
  const { YTNodes } = await import('youtubei.js');
  const watchEndpoint = new YTNodes.NavigationEndpoint({ watchEndpoint: { videoId } });
  const extraArgs: Record<string, unknown> = {
    playbackContext: {
      adPlaybackContext: { pyv: true },
      contentPlaybackContext: {
        vis: 0,
        splay: false,
        lactMilliseconds: '-1',
        signatureTimestamp: innertube.session.player?.signature_timestamp,
      },
      ...(reloadPlaybackContext ? { reloadPlaybackContext } : {}),
    },
    serviceIntegrityDimensions: { poToken },
    contentCheckOk: true,
    racyCheckOk: true,
  };

  // WHY: `getBasicInfo({ client: 'WEB' })` is a thinner player request and can
  // return a SABR URL / ustreamer config that googlevideo then rejects. The
  // official downloader uses watchEndpoint + this playbackContext instead.
  return watchEndpoint.call(innertube.actions, {
    ...extraArgs,
    parse: true,
  }) as Promise<PlayerResponse>;
}

async function applyPlayerStreamingConfig(
  innertube: Innertube,
  info: PlayerResponse,
): Promise<{
  serverAbrStreamingUrl: string;
  videoPlaybackUstreamerConfig: string;
  formats: FormatStream[];
}> {
  const serverAbrStreamingUrl = await innertube.session.player?.decipher(
    info.streaming_data?.server_abr_streaming_url,
  );
  const videoPlaybackUstreamerConfig =
    info.player_config?.media_common_config.media_ustreamer_request_config
      ?.video_playback_ustreamer_config;
  const formats = (info.streaming_data?.adaptive_formats ?? []).filter(
    (format) => format.xtags !== VOICE_BOOST_XTAG,
  );

  if (!serverAbrStreamingUrl || !videoPlaybackUstreamerConfig) {
    throw new Error('SABR streaming URL or ustreamer config is missing');
  }

  return { serverAbrStreamingUrl, videoPlaybackUstreamerConfig, formats };
}

export async function downloadSabrAudio(
  innertube: Innertube,
  videoId: string,
  filePath: string,
  poToken: string,
): Promise<void> {
  const [{ SabrStream }, { EnabledTrackTypes, buildSabrFormat }, { Constants }] = await Promise.all(
    [import('googlevideo/sabr-stream'), import('googlevideo/utils'), import('youtubei.js')],
  );

  const info = await fetchPlayerResponse(innertube, videoId, poToken);
  const initial = await applyPlayerStreamingConfig(innertube, info);
  const clientName = innertube.session.context.client
    .clientName as keyof typeof Constants.CLIENT_NAME_IDS;

  const durationSeconds = info.basic_info?.duration ?? info.video_details?.duration ?? 0;
  const sabrStream = new SabrStream({
    formats: initial.formats.map((format) => buildSabrFormat(format)),
    serverAbrStreamingUrl: initial.serverAbrStreamingUrl,
    videoPlaybackUstreamerConfig: initial.videoPlaybackUstreamerConfig,
    poToken,
    ...(durationSeconds > 0 ? { durationMs: durationSeconds * 1000 } : {}),
    fetch: createMediaFetch(innertube),
    clientInfo: {
      clientName: Number.parseInt(Constants.CLIENT_NAME_IDS[clientName] ?? '1', 10),
      clientVersion: innertube.session.context.client.clientVersion,
    },
  });

  sabrStream.on('streamProtectionStatusUpdate', (data) => {
    // WHY: status 1 = token accepted (or not required). 2/3 = PO token rejected
    // and googlevideo then throws "No media parts or protocol updates received".
    container.logger.warn(`[CustomYT] SABR protection status=${data.status ?? '?'}`);
  });

  sabrStream.on('reloadPlayerResponse', (reloadPlaybackContext) => {
    // WHY: SABR is a conversation. When formats expire or the IP/session changes
    // the server asks us to reload the player and swap the streaming URL in place.
    void fetchPlayerResponse(innertube, videoId, poToken, reloadPlaybackContext)
      .then((playerResponse) => applyPlayerStreamingConfig(innertube, playerResponse))
      .then((next) => {
        sabrStream.setStreamingURL(next.serverAbrStreamingUrl);
        sabrStream.setUstreamerConfig(next.videoPlaybackUstreamerConfig);
      })
      .catch((error: unknown) => {
        container.logger.warn('[CustomYT] SABR player reload failed:', error);
      });
  });

  const { audioStream, videoStream } = await sabrStream.start({
    preferWebM: false,
    preferMP4: true,
    audioQuality: 'AUDIO_QUALITY_MEDIUM',
    enabledTrackTypes: EnabledTrackTypes.AUDIO_ONLY,
  });

  try {
    const size = await writeWebStreamToFile(audioStream, filePath);
    container.logger.info(`[CustomYT] SABR download finished (${size} bytes)`);
  } finally {
    void videoStream.cancel().catch(() => undefined);
  }
}
