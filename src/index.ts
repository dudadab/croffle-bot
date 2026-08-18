import { container } from '@sapphire/framework';

import { CustomClient } from './lib/client.js';
import { env } from './lib/setup.js';

const client = new CustomClient(env);

const main = async () => {
  try {
    container.logger.info(`Logging in as ROLE=${env.role}`);
    await client.login();
    container.logger.info('Logged in');
  } catch (error) {
    container.logger.fatal(error);
    await client.destroy();
    process.exit(1);
  }
};

void main();
