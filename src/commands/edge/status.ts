import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import type { Message } from 'discord.js';

import { getEnv } from '../../lib/env';

@ApplyOptions<Command.Options>({
  description: 'Show this edge node status',
  aliases: ['node'],
  preconditions: ['EdgeOnly', 'CommandChannel'],
})
export class UserCommand extends Command {
  public override async messageRun(message: Message) {
    const { role, nodeEnv } = getEnv();
    const content = [
      '**pipit-hub edge status**',
      `• ROLE: \`${role}\``,
      `• NODE_ENV: \`${nodeEnv}\``,
      `• Guilds: \`${this.container.client.guilds.cache.size}\``,
      '• Features: healthcheck / maintenance (coming soon)',
    ].join('\n');

    await message.reply(content);
  }
}
