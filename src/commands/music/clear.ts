import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { useQueue } from 'discord-player';
import type { Message } from 'discord.js';

@ApplyOptions<Command.Options>({
  description: 'Clear all tracks from the queue',
  aliases: ['c'],
  preconditions: ['MainOnly', 'CommandChannel'],
})
export class UserCommand extends Command {
  public override async messageRun(message: Message) {
    if (!message.guildId) {
      return;
    }

    const memberVoiceChannelId = message.member?.voice.channelId;
    if (!memberVoiceChannelId) {
      await message.reply('Join a voice channel first.');
      return;
    }

    const botVoiceChannelId = message.guild?.members.me?.voice.channelId;

    if (botVoiceChannelId && botVoiceChannelId !== memberVoiceChannelId) {
      await message.reply('I am in a different voice channel. Join the same channel first.');
      return;
    }

    const queue = useQueue(message.guildId);

    if (!queue || queue.tracks.size === 0) {
      await message.reply('The queue is empty.');
      return;
    }

    queue.tracks.clear();
    await message.reply('Queue cleared.');
  }
}
