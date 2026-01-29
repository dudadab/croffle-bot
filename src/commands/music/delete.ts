import { ApplyOptions } from '@sapphire/decorators';
import { Args, Command } from '@sapphire/framework';
import { useQueue } from 'discord-player';
import { Message } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: 'Skip the currently playing track'
})
export class UserCommand extends Command {
	public override async messageRun(message: Message, args: Args) {
		const result = await this.doDelete(message.guildId, args);

		if (message.channel.isSendable()) {
			return message.channel.send(result);
		}

		return;
	}

	private async doDelete(guildId: string | null, args: Args): Promise<string> {
		if (!guildId) {
			return 'No guild ID provided';
		}

		const idx = await args.pick('integer').catch(() => null);
		if (idx === null) {
			return 'Please provide a valid track index to skip.';
		}

		const queue = useQueue(guildId);
		if (!queue) {
			return 'No active music session found in this server.';
		}

		const track = queue.tracks.find((_, i) => i === idx - 1);
		if (!track) {
			return `No track found at index ${idx}.`;
		}

		queue.tracks.remove((_, i) => i === idx - 1);
		return `Removed **${track.title}** from the queue.`;
	}
}
