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
    // youtubei.js needs a JS evaluator to decipher n/sig and SABR URLs.
    // oxlint-disable-next-line typescript/no-implied-eval
    return new Function(buildPlayerEvalScript(data, env))();
  };

  return Innertube.create({
    cookie: getEnv().youtubeCookie,
    user_agent: await getYouTubeUserAgent(),
  });
}
