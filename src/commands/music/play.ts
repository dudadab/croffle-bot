import { ApplyOptions } from '@sapphire/decorators';
import { type Args, Command } from '@sapphire/framework';
import { useMainPlayer } from 'discord-player';
import type { Message } from 'discord.js';

@ApplyOptions<Command.Options>({
  description: 'Plays music in your current voice channel',
  aliases: ['p'],
  preconditions: ['MainOnly', 'CommandChannel'],
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

    const query = await args.rest('string').catch(() => null);

    if (!query) {
      return message.reply(
        'You need to provide a YouTube URL to play music.\nExample: `!play <YouTube URL>`',
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
          leaveOnEmpty: true,
          leaveOnEnd: true,
          leaveOnEmptyCooldown: 30_000,
          leaveOnEndCooldown: 30_000,
          // WHY: extractor already emits 48 kHz s16le PCM. The default
          // equalizer/resampler/volume chain reprocesses it and can stutter.
          disableVolume: true,
          disableEqualizer: true,
          disableBiquad: true,
          disableResampler: true,
          disableFilterer: true,
          disableCompressor: true,
          disableReverb: true,
          disableSeeker: true,
        },
      });

      if (queue.isPlaying() && queue.tracks.size > 0) {
        return feedbackMessage.edit(
          `\`${track.title}\` has been added to the queue! (position: ${queue.tracks.size})`,
        );
      }

      return feedbackMessage.edit(`\`${track.title}\` is now playing!`);
    } catch (error) {
      this.container.logger.error('Error playing music:', error);
      const detail =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Unknown error';
      const content = `Error occurred while trying to play music: ${detail}`.slice(0, 1900);
      return message.channel.send(content);
    }
  }
}
