/**
 * Innertube session used by the custom YouTube extractor.
 */
import Innertube, { Platform, type Types } from 'youtubei.js';

import { getEnv } from '../env.js';
import { getYouTubeUserAgent } from './youtube-po-token.js';

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
