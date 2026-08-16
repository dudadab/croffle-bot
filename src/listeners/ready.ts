import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import type { StoreRegistryValue } from '@sapphire/pieces';
import { blue, gray, green, magenta, magentaBright, white, yellow } from 'colorette';

import { getEnv } from '../lib/env';

const dev = process.env.NODE_ENV !== 'production';

@ApplyOptions<Listener.Options>({ once: true })
export class UserEvent extends Listener {
  private readonly style = dev ? yellow : blue;

  public override run() {
    this.printBanner();
    this.printStoreDebugInformation();
  }

  private printBanner() {
    const success = green('+');
    const llc = dev ? magentaBright : white;
    const blc = dev ? magenta : blue;
    const { role } = getEnv();
    const pad = ' '.repeat(7);

    this.container.logger.info(
      String.raw`
${llc('')} ${pad}${blc('pipit-hub')} ${blc('1.0.0')}
${llc('')} ${pad}[${success}] Gateway  ROLE=${llc(role)}
${dev ? ` ${pad}${blc('<')}${llc('/')}${blc('>')} ${llc('DEVELOPMENT MODE')}` : ''}
		`.trim(),
    );
  }

  private printStoreDebugInformation() {
    const { client, logger } = this.container;
    const stores = [...client.stores.values()];
    const last = stores.pop()!;

    for (const store of stores) {
      logger.info(this.styleStore(store, false));
    }
    logger.info(this.styleStore(last, true));
  }

  private styleStore(store: StoreRegistryValue, last: boolean) {
    return gray(
      `${last ? '└─' : '├─'} Loaded ${this.style(store.size.toString().padEnd(3, ' '))} ${store.name}.`,
    );
  }
}
