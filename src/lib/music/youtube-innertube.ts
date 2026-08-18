/**
 * Innertube session used by the custom YouTube extractor.
 *
 * WHY: this package is CJS while youtubei.js is ESM. Type-only imports need
 * `resolution-mode: import` so tsc does not try to load them as CJS.
 */
import type Innertube from 'youtubei.js' with { 'resolution-mode': 'import' };
import type { Types } from 'youtubei.js' with { 'resolution-mode': 'import' };

import { getEnv } from '../env';
import { getYouTubeUserAgent } from './youtube-po-token';

function buildPlayerEvalScript(
  data: Types.BuildScriptResult,
  env: Record<string, Types.VMPrimative>,
): string {
  const properties: string[] = [];

  if (typeof env.n === 'string') {
    properties.push(`n: exportedVars.nFunction(${JSON.stringify(env.n)})`);
  }

  if (typeof env.sig === 'string') {
    properties.push(`sig: exportedVars.sigFunction(${JSON.stringify(env.sig)})`);
  }

  return `${data.output}\nreturn { ${properties.join(', ')} }`;
}

export async function createYouTubeSession(): Promise<Innertube> {
  const { Innertube, Platform } = await import('youtubei.js');

  Platform.shim.eval = async (
    data: Types.BuildScriptResult,
    env: Record<string, Types.VMPrimative>,
  ) => {
    // WHY: youtubei.js extracts n/sig (and SABR URL) decipher functions from the
    // player JS. Node has no browser VM, so we eval the extracted script ourselves.
    // oxlint-disable-next-line typescript/no-implied-eval
    return new Function(buildPlayerEvalScript(data, env))();
  };

  return Innertube.create({
    cookie: getEnv().youtubeCookie,
    // WHY: BotGuard fingerprints navigator.userAgent. The Innertube session and
    // the jsdom used to mint PO tokens must look like the same YouTube web client.
    user_agent: await getYouTubeUserAgent(),
  });
}
