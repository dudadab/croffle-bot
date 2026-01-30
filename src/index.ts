import './lib/setup';

import { LogLevel, SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import { Player } from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor';
import { YoutubeiExtractor } from 'discord-player-youtubei';

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
			skipFFmpeg: false
		});

		this.player.on('error', (err) => {
			this.logger.error(`[Player Instance Error] ${err.message}`);
		});

		// 2. Queue 이벤트 리스너 (기존 코드 유지 및 보강)
		this.player.events.on('error', (q, err) => {
			this.logger.error(`[Queue Error] ${q.guild.name}: ${err.message}`);
		});

		this.player.events.on('playerError', (q, err) => {
			this.logger.error(`[Player Error] Error emit from the player: ${q.guild.name} - ${err.message}`);
			console.error(err);
		});
	}

	public override async login(token?: string) {
		await this.player.extractors.loadMulti(DefaultExtractors);
		await this.player.extractors.register(YoutubeiExtractor, {});

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
