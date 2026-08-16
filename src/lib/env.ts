import { join } from 'node:path';

import { container } from '@sapphire/framework';
import { setup } from '@skyra/env-utilities';

import { rootDir } from './constants';

export type BotRole = 'main' | 'edge';

export interface EnvConfig {
  botToken: string;
  role: BotRole;
  youtubeCookie: string | undefined;
  commandChannelId: string | undefined;
  nodeEnv: string;
  isMain: boolean;
  isEdge: boolean;
}

function parseRole(raw: string | undefined): BotRole {
  const value = (raw ?? 'main').toLowerCase();
  if (value === 'main' || value === 'edge') {
    return value;
  }
  throw new Error(`Invalid ROLE="${raw}". Expected "main" or "edge".`);
}

/**
 * Loads root `.env` (optional) and reads process.env.
 * Node `--env-file=.env.development.local` still wins for overlapping keys.
 */
export function loadEnv(): EnvConfig {
  setup({ path: join(rootDir, '.env') });

  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    throw new Error('BOT_TOKEN is required');
  }

  const role = parseRole(process.env.ROLE);
  const config: EnvConfig = {
    botToken,
    role,
    youtubeCookie: process.env.YOUTUBE_COOKIE || undefined,
    commandChannelId: process.env.COMMAND_CHANNEL_ID || undefined,
    nodeEnv: process.env.NODE_ENV ?? 'development',
    isMain: role === 'main',
    isEdge: role === 'edge',
  };

  container.config = config;
  return config;
}

export function getEnv(): EnvConfig {
  if (!container.config) {
    return loadEnv();
  }
  return container.config;
}

declare module '@sapphire/pieces' {
  interface Container {
    config: EnvConfig;
  }
}
