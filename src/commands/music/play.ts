import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import type { Message } from 'discord.js';

// Not Implemented Yet
@ApplyOptions<Command.Options>({
	description: 'Plays music in your current voice channel',
	aliases: ['p'] // Adding an alias commands for the play command
})
export class UserCommand extends Command {
	public override async messageRun(message: Message) {
		if (!message.channel.isSendable()) {
			return;
		}

		// need to implement music play logic here
		return message.channel.send('Music Play Command Executed!');
	}
}
