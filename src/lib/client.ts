import { LogLevel, SapphireClient, container } from '@sapphire/framework';
import { Player } from 'discord-player';
import { GatewayIntentBits } from 'discord.js';

import type { EnvConfig } from './env';
import { CustomYoutubeExtractor } from './music/youtube-extractor';

export class CustomClient extends SapphireClient {
  public player: Player | null = null;

  public constructor(private readonly config: EnvConfig) {
    super({
      defaultPrefix: '!',
      caseInsensitiveCommands: true,
      logger: {
        level: LogLevel.Debug,
      },
      intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
      ],
      loadMessageCommandListeners: true,
    });

    if (config.isMain) {
      this.player = new Player(this, {
        // We already decode YouTube audio to PCM in CustomYoutubeExtractor.
        skipFFmpeg: true,
        connectionTimeout: 30000,
        probeTimeout: 0,
      });

      // Keep player debug visible while streaming is unstable.
      this.player.on('debug', (message) => {
        container.logger.debug(`[player-lib] ${message}`);
      });

      this.player.events.on('debug', (_, message) => {
        container.logger.debug(`[player] ${message}`);
      });

      this.player.events.on('playerError', (_, error) => {
        container.logger.error('[player]', error);
      });

      this.player.events.on('error', (_, error) => {
        container.logger.error('[queue]', error);
      });
    }
  }

  public override async login(token?: string) {
    if (this.config.isMain && this.player) {
      if (!this.config.youtubeCookie) {
        container.logger.warn('YouTube cookie is not set; SABR extraction may fail.');
      }

      await this.player.extractors.register(CustomYoutubeExtractor, {});
      container.logger.info(
        `Loaded ${this.player.extractors.store.size} extractors: ${[...this.player.extractors.store.keys()].join(', ')}`,
      );
    } else {
      container.logger.info(`Running in ROLE=${this.config.role}; music player disabled.`);
    }

    return super.login(token ?? this.config.botToken);
  }
}
