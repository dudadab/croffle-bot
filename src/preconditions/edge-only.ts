import { ApplyOptions } from '@sapphire/decorators';
import { AllFlowsPrecondition } from '@sapphire/framework';
import type {
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  Message,
} from 'discord.js';

import { getEnv } from '../lib/env.js';

@ApplyOptions<AllFlowsPrecondition.Options>({
  name: 'EdgeOnly',
})
export class UserPrecondition extends AllFlowsPrecondition {
  public override messageRun(message: Message) {
    return this.check(message);
  }

  public override chatInputRun(interaction: ChatInputCommandInteraction) {
    return this.check(interaction);
  }

  public override contextMenuRun(interaction: ContextMenuCommandInteraction) {
    return this.check(interaction);
  }

  private check(_context: Message | ChatInputCommandInteraction | ContextMenuCommandInteraction) {
    if (getEnv().isEdge) {
      return this.ok();
    }

    return this.error({
      identifier: 'EdgeOnly',
      message: 'This command is only available on the edge bot node.',
    });
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    EdgeOnly: never;
  }
}
