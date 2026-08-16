import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { joinVoiceChannel } from 'discord-player';
import type { Message } from 'discord.js';

@ApplyOptions<Command.Options>({
  description: 'Joins the voice channel you are currently in',
})
export class UserCommand extends Command {
  public override async messageRun(message: Message): Promise<void> {
    const { member, guild } = message;

    if (!guild) {
      await message.reply('This command can only be used in a server.');
      return;
    }

    const voiceChannel = member?.voice.channel;
    if (!voiceChannel) {
      await message.reply('You need to be in a voice channel to use this command.');
      return;
    }

    try {
      joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
      });

      if (message.channel.isSendable()) {
        await message.channel.send('Joined your voice channel successfully!');
      }
    } catch (error) {
      // oxlint-disable-next-line no-console
      console.error('Error joining voice channel:', error);
      await message.reply('Sorry, I could not join your voice channel.');
    }
  }
}
