import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { useQueue } from 'discord-player';
import type { Message } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: '현재 대기열에 있는 곡들을 보여줍니다.',
	aliases: ['l', 'list', '목록', '대기열']
})
export class UserCommand extends Command {
	public override async messageRun(message: Message) {
		if (!message.guildId) return;

		const queue = useQueue(message.guildId);

		if (!queue || !queue.currentTrack) {
			await message.reply('❌ 현재 재생 중인 곡이 없습니다.');
			return;
		}

		let response = `🎶 현재 재생 중인 곡: [${queue.currentTrack.title}](${queue.currentTrack.url})\n`;
		response += `📝 대기열:\n`;

		const tracks = queue.tracks.toArray();

		if (tracks.length === 0) {
			response += '대기열에 곡이 없습니다.';
		} else {
			const nextTen = tracks.slice(0, 10);
			const trackList = nextTen.map((track, i) => `${i + 1}. [${track.title}](${track.url})`).join('\n');
			response += trackList;

			if (tracks.length > 10) {
				const extra = tracks.length - 10;
				response += '\n...그리고 ' + extra + '곡이 더 대기 중입니다.';
			}
		}

		response += `\n총 대기 중인 노래: ${tracks.length}곡`;

		await message.reply(response);
		return;
	}
}
