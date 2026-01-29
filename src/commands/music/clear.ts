import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { useQueue } from 'discord-player';
import type { Message } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: '현재 대기열의 모든 곡을 삭제합니다.',
	aliases: ['c']
})
export class UserCommand extends Command {
	public override async messageRun(message: Message) {
		if (!message.guildId) return;

		const memberVoiceChannelId = message.member?.voice.channelId;
		if (!memberVoiceChannelId) {
			await message.reply('❌ 음성 채널에 먼저 입장해주세요.');
			return;
		}

		const botVoiceChannelId = message.guild?.members.me?.voice.channelId;

		if (botVoiceChannelId && botVoiceChannelId !== memberVoiceChannelId) {
			await message.reply('❌ 봇이 다른 음성 채널에 있습니다. 같은 채널에 입장해주세요.');
			return;
		}

		const queue = useQueue(message.guildId);

		if (!queue || queue.tracks.size === 0) {
			await message.reply('❌ 현재 대기열에 곡이 없습니다.');
			return;
		}

		queue.tracks.clear();
		await message.reply(`✅ 대기열이 비워졌습니다.`);
		return;
	}
}
