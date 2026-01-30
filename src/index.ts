import './lib/setup';

import { LogLevel, SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import { Player } from 'discord-player';
// import { DefaultExtractors } from '@discord-player/extractor';
// import { YoutubeiExtractor } from 'discord-player-youtubei';
import { CustomYoutubeExtractor } from './lib/YoutubeExtractor';

export class CustomClient extends SapphireClient {
	public player: Player;

	constructor() {
		super({
			defaultPrefix: '!',
			caseInsensitiveCommands: true,
			logger: {
				level: LogLevel.Debug
			},
			intents: [
				GatewayIntentBits.DirectMessages,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.Guilds,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildVoiceStates
			],
			loadMessageCommandListeners: true
		});

		this.player = new Player(this, {
			skipFFmpeg: false,
			connectionTimeout: 30000,
			probeTimeout: 0
		});

		this.player.events.on('debug', (_, message) => {
			console.log('[PLAYER DEBUG]', message);
		});

		this.player.events.on('playerError', (_, error) => {
			console.error('[PLAYER ERROR]', error);
		});

		this.player.events.on('error', (_, error) => {
			console.error('[QUEUE ERROR]', error);
		});
	}

	public override async login(token?: string) {
		// await this.player.extractors.loadMulti(DefaultExtractors);
		// await this.player.extractors.register(YoutubeiExtractor, {
		// 	cookie: process.env.YOUTUBE_COOKIE,
		// 	// generateWithPoToken: true,
		// 	streamOptions: {
		// 		useClient: 'IOS'
		// 	},
		// 	disablePlayer: true,
		// 	ignoreSignInErrors: true
		// });

		await this.player.extractors.register(CustomYoutubeExtractor, {});

		const loaded = this.player.extractors.store.size;
		this.logger.info(`Loaded ${loaded} extractors into Discord Player's extractor store.`);
		const extractorNames = this.player.extractors.store;
		this.logger.info(`Extractors: ${[...extractorNames.keys()].join(', ')}`);
		return super.login(token);
	}
}

const client = new CustomClient();

const main = async () => {
	try {
		client.logger.info('Logging in');
		await client.login(process.env.BOT_TOKEN);
		client.logger.info('logged in');
	} catch (error) {
		client.logger.fatal(error);
		await client.destroy();
		process.exit(1);
	}
};

void main();
