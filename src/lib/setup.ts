// Unless explicitly defined, set NODE_ENV as development:
process.env.NODE_ENV ??= 'development';

import { ApplicationCommandRegistries, RegisterBehavior } from '@sapphire/framework';
import '@sapphire/plugin-logger/register';
import { setup } from '@skyra/env-utilities';
import * as colorette from 'colorette';
import { join } from 'node:path';
import { srcDir } from './constants';
// import play from 'play-dl';

// Set default behavior to bulk overwrite
ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite);

// Read env var
setup({ path: join(srcDir, '.env') });

// if (process.env.YOUTUBE_COOKIE) {
// 	console.log('YouTube cookie detected, setting up play-dl with the provided cookie.');
// 	console.log(`Cookie: ${process.env.YOUTUBE_COOKIE}`);

// 	play.setToken({
// 		youtube: {
// 			cookie: process.env.YOUTUBE_COOKIE
// 		}
// 	});
// }

// Enable colorette
colorette.createColors({ useColor: true });
