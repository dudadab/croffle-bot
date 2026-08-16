// Unless explicitly defined, set NODE_ENV as development:
process.env.NODE_ENV ??= 'development';

import { join } from 'node:path';

// oxlint-disable-next-line import/no-unassigned-import
import '@sapphire/plugin-logger/register';
import { ApplicationCommandRegistries, RegisterBehavior } from '@sapphire/framework';
import { setup } from '@skyra/env-utilities';
import * as colorette from 'colorette';
import { setToken } from 'play-dl';

import { srcDir } from './constants';

// Set default behavior to bulk overwrite
ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite);

// Read env var
setup({ path: join(srcDir, '.env') });

if (process.env.YOUTUBE_COOKIE) {
  // oxlint-disable-next-line no-console
  console.log('YouTube cookie detected, setting up play-dl with the provided cookie.');
  setToken({
    youtube: {
      cookie: process.env.YOUTUBE_COOKIE,
    },
  });
}

// Enable colorette
colorette.createColors({ useColor: true });
