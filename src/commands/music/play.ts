import { ApplyOptions } from '@sapphire/decorators';
import { Args, Command } from '@sapphire/framework';
import { useMainPlayer } from 'discord-player';
import type { Message } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: 'Plays music in your current voice channel',
	aliases: ['p'] // Adding an alias commands for the play command
})
export class UserCommand extends Command {
	public override async messageRun(message: Message, args: Args) {
		const { member, guild } = message;

		if (!guild) {
			return message.reply('This command can only be used in a server.');
		}

		if (!message.channel.isSendable()) {
			return;
		}

		const voiceChannel = member?.voice.channel;
		if (!voiceChannel) {
			return message.reply('You need to be in a voice channel to use this command.');
		}

		// URL parsing and search query handling
		const query = await args.rest('string').catch(() => null);

		if (!query) {
			return message.reply(
				'You need to provide a search term or URL to play music.\nExamples:\n`!play never gonna give you up`\n`!play <YouTube URL>`'
			);
		}

		const player = useMainPlayer();

		try {
			const feedbackMessage = await message.channel.send(`Searching for \`${query}\`...`);

			const { track, queue } = await player.play(voiceChannel, query, {
				nodeOptions: {
					metadata: message,
					bufferingTimeout: 30000,
					connectionTimeout: 30000,
					leaveOnStop: true,
					leaveOnEmpty: true
				}
			});

			if (queue.isPlaying() && queue.tracks.size > 0) {
				return feedbackMessage.edit(`\`${track.title}\` has been added to the queue! (position: ${queue.tracks.size})`);
			} else {
				return feedbackMessage.edit(`\`${track.title}\` is now playing!`);
			}
		} catch (error) {
			console.error('Error playing music:', error);
			return message.channel.send(`Error occurred while trying to play music: ${error}`);
		}
	}
}
