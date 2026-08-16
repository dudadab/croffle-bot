import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { useQueue } from 'discord-player';
import type { Message } from 'discord.js';

@ApplyOptions<Command.Options>({
  description: 'Skip the currently playing track',
})
export class UserCommand extends Command {
  public override async messageRun(message: Message): Promise<void> {
    const result = this.doSkip(message.guildId);

    if (message.channel.isSendable()) {
      await message.channel.send(result);
    }
  }

  private doSkip(guildId: string | null): string {
    if (!guildId) {
      return 'No guild ID provided';
    }

    const queue = useQueue(guildId);
    if (!queue) {
      return 'No active music session found in this server.';
    }

    const currentTrack = queue.currentTrack;
    if (!currentTrack) {
      return 'No track is currently playing.';
    }

    const success = queue.node.skip();
    if (success) {
      return `Skipped: **${currentTrack.title}**`;
    } else {
      return 'Failed to skip the track.';
    }
  }
}
