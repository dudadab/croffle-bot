import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { getVoiceConnection, useQueue } from 'discord-player';
import type { Message } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: 'A basic command'
})
export class UserCommand extends Command {
	public override async messageRun(message: Message) {
		const result = this.doLeave(message.guildId);
		if (message.channel.isSendable()) {
			return message.channel.send(result);
		}
		return;
	}

	private doLeave(guildId: string | null): string {
		if (!guildId) {
			return 'No guild ID provided';
		}

		const queue = useQueue(guildId);

		const connection = getVoiceConnection(guildId);

		if (!queue && !connection) {
			return 'No active music session found in this server.';
		}

		if (queue) {
			queue.delete();
		} else if (connection) {
			connection.destroy();
		}

		return 'Left the voice channel successfully.';
	}
}
