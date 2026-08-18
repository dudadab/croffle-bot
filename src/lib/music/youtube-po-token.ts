/**
 * BotGuard WebPO minter for YouTube SABR / progressive `pot=` query params.
 *
 * jsdom is not a real browser. The DOM + UA setup below exists so BotGuard's
 * snapshot is not immediately classified as Node.
 */
import { container } from '@sapphire/framework';
import type { WebPoSignalOutput } from 'bgutils-js/shared-types' with {
  'resolution-mode': 'import',
};
import type { WebPoMinter } from 'bgutils-js/webpo' with { 'resolution-mode': 'import' };
import type Innertube from 'youtubei.js' with { 'resolution-mode': 'import' };

const YOUTUBE_REQUEST_KEY = 'O43z0dpjhgX20SCx4KAo';

let youtubeUserAgent: string | undefined;
let domReady = false;

export async function getYouTubeUserAgent(): Promise<string> {
  if (youtubeUserAgent) {
    return youtubeUserAgent;
  }

  const { USER_AGENT } = await import('bgutils-js/utils');
  youtubeUserAgent = USER_AGENT;
  return USER_AGENT;
}

function defineGlobal(name: string, value: unknown): void {
  try {
    Object.defineProperty(globalThis, name, {
      value,
      configurable: true,
      writable: true,
    });
  } catch {
    (globalThis as Record<string, unknown>)[name] = value;
  }
}

async function ensureDomEnvironment(): Promise<void> {
  if (domReady) {
    return;
  }

  const userAgent = await getYouTubeUserAgent();
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
    url: 'https://www.youtube.com/',
    referrer: 'https://www.youtube.com/',
    pretendToBeVisual: true,
    // WHY: jsdom 30 moved `userAgent` off ConstructorOptions onto `resources`.
    resources: { userAgent },
  });

  defineGlobal('window', dom.window);
  defineGlobal('document', dom.window.document);
  defineGlobal('location', dom.window.location);
  defineGlobal('origin', dom.window.origin);
  // WHY: Node 21+ already has `globalThis.navigator` (`Node.js/...`). An
  // `if (!('navigator' in globalThis))` guard never overwrote it, so BotGuard
  // minted tokens that SABR rejected (protection status 2/3).
  defineGlobal('navigator', dom.window.navigator);

  domReady = true;
}

async function loadInterpreterFromUrl(interpreterUrl: string): Promise<void> {
  const scriptUrl = interpreterUrl.startsWith('http') ? interpreterUrl : `https:${interpreterUrl}`;
  const response = await fetch(scriptUrl);
  if (!response.ok) {
    throw new Error(`Failed to load BotGuard interpreter (${response.status})`);
  }

  const interpreterJavascript = await response.text();
  if (!interpreterJavascript) {
    throw new Error('BotGuard interpreter script was empty');
  }

  // oxlint-disable-next-line typescript/no-implied-eval
  new Function(interpreterJavascript)();
}

async function createBotGuardClient(
  program: string,
  globalName: string,
): Promise<{
  snapshot: (args: { webPoSignalOutput: WebPoSignalOutput }) => Promise<string>;
}> {
  const { BotGuardClient } = await import('bgutils-js/botguard');
  return BotGuardClient.create({
    program,
    globalName,
    globalObject: globalThis,
  });
}

async function createMinterFromChallenge(
  program: string,
  globalName: string,
  interpreterJavascript?: string,
  interpreterUrl?: string,
): Promise<WebPoMinter> {
  if (interpreterJavascript) {
    // oxlint-disable-next-line typescript/no-implied-eval
    new Function(interpreterJavascript)();
  } else if (interpreterUrl) {
    await loadInterpreterFromUrl(interpreterUrl);
  } else {
    throw new Error('BotGuard interpreter is missing');
  }

  const botGuardClient = await createBotGuardClient(program, globalName);
  const webPoSignalOutput: WebPoSignalOutput = [];
  const botguardResponse = await botGuardClient.snapshot({ webPoSignalOutput });

  const { WebPoMinter } = await import('bgutils-js/webpo');
  const { buildURL, getHeaders } = await import('bgutils-js/utils');
  const integrityTokenResponse = await fetch(buildURL('GenerateIT', true), {
    method: 'POST',
    headers: getHeaders() as HeadersInit,
    body: JSON.stringify([YOUTUBE_REQUEST_KEY, botguardResponse]),
  });

  if (!integrityTokenResponse.ok) {
    throw new Error(`Failed to mint integrity token (${integrityTokenResponse.status})`);
  }

  const integrityTokenJson = (await integrityTokenResponse.json()) as [
    string,
    number,
    number,
    string,
  ];
  const [integrityToken, estimatedTtlSecs, mintRefreshThreshold, websafeFallbackToken] =
    integrityTokenJson;
  if (typeof integrityToken !== 'string') {
    throw new Error('BotGuard integrity token was missing');
  }

  return WebPoMinter.create(
    {
      integrityToken,
      estimatedTtlSecs,
      mintRefreshThreshold,
      websafeFallbackToken,
    },
    webPoSignalOutput,
  );
}

async function createMinterFromWaa(): Promise<WebPoMinter> {
  const { getChallenge } = await import('bgutils-js/botguard');
  const challenge = await getChallenge({
    fetchFunction: fetch,
    requestKey: YOUTUBE_REQUEST_KEY,
  });

  if (!challenge.program || !challenge.globalName) {
    throw new Error('WAA challenge did not include BotGuard data');
  }

  return createMinterFromChallenge(
    challenge.program,
    challenge.globalName,
    challenge.interpreterJavascript?.privateDoNotAccessOrElseSafeScriptWrappedValue,
    challenge.interpreterUrl?.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue,
  );
}

async function createMinterFromInnertube(innertube: Innertube): Promise<WebPoMinter> {
  const challenge = await innertube.getAttestationChallenge('ENGAGEMENT_TYPE_UNBOUND');
  const bgChallenge = challenge.bg_challenge;
  if (!bgChallenge?.program || !bgChallenge.global_name) {
    throw new Error('Innertube attestation challenge did not include BotGuard data');
  }

  const interpreterUrl =
    bgChallenge.interpreter_url.private_do_not_access_or_else_trusted_resource_url_wrapped_value;

  return createMinterFromChallenge(
    bgChallenge.program,
    bgChallenge.global_name,
    undefined,
    interpreterUrl,
  );
}

export class YouTubePoTokenMinter {
  private minter: WebPoMinter | null = null;
  private initPromise: Promise<void> | null = null;

  public async init(innertube: Innertube): Promise<void> {
    if (this.minter) {
      return;
    }

    if (!this.initPromise) {
      // WHY: activate() and stream() can both call init(). Share one in-flight
      // promise so we do not run BotGuard twice on the first play.
      this.initPromise = this.createMinter(innertube).catch((error: unknown) => {
        this.initPromise = null;
        throw error;
      });
    }

    await this.initPromise;
  }

  public async mint(contentBinding: string): Promise<string | undefined> {
    if (!this.minter) {
      return undefined;
    }

    return this.minter.mintAsWebsafeString(contentBinding);
  }

  private async createMinter(innertube: Innertube): Promise<void> {
    await ensureDomEnvironment();

    try {
      // WHY: BgUtils' current example uses the WAA Create/GenerateIT endpoints,
      // not Innertube attestation. WAA more often returns inline interpreter JS.
      this.minter = await createMinterFromWaa();
      container.logger.info('[CustomYT] BotGuard PO token minter ready (WAA)');
      return;
    } catch (error) {
      container.logger.warn('[CustomYT] WAA challenge failed; falling back to Innertube:', error);
    }

    this.minter = await createMinterFromInnertube(innertube);
    container.logger.info('[CustomYT] BotGuard PO token minter ready (Innertube)');
  }
}
