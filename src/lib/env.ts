import { existsSync as fsExistsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

import { container } from '@sapphire/framework';
import { setup } from '@skyra/env-utilities';

import { rootDir } from './constants.js';

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

function parseCookieFileToHeader(cookieFileContent: string): string | undefined {
  const trimmed = cookieFileContent.trim();
  if (!trimmed) {
    return undefined;
  }

  // WHY: yt-dlp/curl export Netscape (tab-separated). A one-line Cookie header
  // has no tabs. Detect that so we do not split `key=value; key2=value2` as rows.
  // Netscape columns: domain, flag, path, secure, expiration, name, value
  // https://curl.se/docs/http-cookies.html
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim());
  if (lines.length === 0) {
    return undefined;
  }

  const nonComment = lines.filter((l) => l && !l.startsWith('#'));
  const sample = nonComment[0] ?? '';
  if (!sample.includes('\t')) {
    return trimmed.replace(/\s+/g, ' ').trim();
  }

  const cookieMap = new Map<string, string>();
  for (const line of nonComment) {
    const parts = line.split('\t');
    if (parts.length < 7) {
      continue;
    }

    const domain = parts[0]?.toLowerCase() ?? '';
    const name = parts[5];
    const value = parts[6];
    if (!name) {
      continue;
    }

    // WHY: Netscape dumps mix youtube.com / google.com / ads domains. Sending
    // duplicate names (last cookie wins in a Map) from the wrong domain breaks
    // the Cookie header YouTube actually validates.
    const isRelevantDomain =
      domain.includes('youtube.com') ||
      domain.includes('google.com') ||
      domain.includes('google.co.kr');
    if (!isRelevantDomain) {
      continue;
    }

    cookieMap.set(name, value); // last-wins when the same name appears twice
  }

  const pairs = [...cookieMap.entries()].map(([name, value]) => `${name}=${value}`);
  return pairs.length > 0 ? pairs.join('; ') : undefined;
}

function loadYouTubeCookieFromFile(cookieFilePathRaw: string): string | undefined {
  const absPath = isAbsolute(cookieFilePathRaw)
    ? cookieFilePathRaw
    : resolve(rootDir, cookieFilePathRaw);

  if (!fsExistsSync(absPath)) {
    throw new Error(`YOUTUBE_COOKIE_FILE does not exist: ${cookieFilePathRaw}`);
  }

  const content = readFileSync(absPath, 'utf8');
  return parseCookieFileToHeader(content);
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

  // Priority:
  // 1) YOUTUBE_COOKIE (direct cookie header string)
  // 2) YOUTUBE_COOKIE_FILE (Netscape cookie file like yt-dlp/curl exports)
  const youtubeCookieRaw = process.env.YOUTUBE_COOKIE;
  const youtubeCookieFile = process.env.YOUTUBE_COOKIE_FILE;

  let youtubeCookie: string | undefined = youtubeCookieRaw || undefined;
  if (!youtubeCookie && youtubeCookieFile) {
    youtubeCookie = loadYouTubeCookieFromFile(youtubeCookieFile);
  }

  const config: EnvConfig = {
    botToken,
    role,
    youtubeCookie,
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
