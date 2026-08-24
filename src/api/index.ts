import { handleAppResponse } from '../app/index';
import { cleanYouTubeJson } from './json';

type Arguments = {
  enabled: boolean,
  web_enhance: boolean,
  app_enhance: boolean,
  blockUpload: boolean,
  blockShorts: boolean,
  blockImmersive: boolean,
  lyricLang: string,
  debug: boolean,
};

const DEFAULTS: Arguments = {
  enabled: true,
  web_enhance: true,
  app_enhance: true,
  blockUpload: false,
  blockShorts: false,
  blockImmersive: false,
  lyricLang: 'zh-Hans',
  debug: false,
};

function scalar(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  return value;
}

function argumentsFromRuntime(): Arguments {
  let supplied: Record<string, unknown> = {};
  if (typeof $argument === 'string') {
    const text = $argument.trim();
    if (text) {
      if (text.startsWith('{')) {
        supplied = JSON.parse(text);
      } else {
        supplied = Object.fromEntries(new URLSearchParams(text));
      }
    }
  } else if ($argument && typeof $argument === 'object') {
    supplied = $argument;
  }
  const merged = { ...DEFAULTS } as Record<string, unknown>;
  for (const key of Object.keys(DEFAULTS)) {
    if (supplied[key] !== undefined) merged[key] = scalar(supplied[key]);
  }
  return merged as Arguments;
}

function header(name: string): string {
  const headers = $response?.headers ?? {};
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === name.toLowerCase()) return String(value);
  }
  return '';
}

function responsePayload(): { bytes: Uint8Array, text?: string, binary: boolean } {
  const body = $response?.body;
  if (body instanceof Uint8Array) return { bytes: body, binary: true };
  if (body instanceof ArrayBuffer) return { bytes: new Uint8Array(body), binary: true };
  if (typeof body === 'string') return { bytes: new TextEncoder().encode(body), text: body, binary: false };

  const compatibilityBytes = $response?.bodyBytes;
  if (compatibilityBytes instanceof Uint8Array) return { bytes: compatibilityBytes, binary: true };
  if (compatibilityBytes instanceof ArrayBuffer) return { bytes: new Uint8Array(compatibilityBytes), binary: true };
  return { bytes: new Uint8Array(), binary: false };
}

function isJson(contentType: string, bytes: Uint8Array, body?: string): boolean {
  if (/\b(?:application\/json|text\/json)\b/i.test(contentType)) return true;
  const first = (body ?? new TextDecoder().decode(bytes.subarray(0, 16))).trimStart();
  return first.startsWith('{') || first.startsWith('[') || first.startsWith(")]}'");
}

function endpointFromUrl(url: string): string {
  const match = url.match(/\/youtubei\/v1\/(reel\/reel_watch_sequence|account\/get_setting|[^/?]+)/);
  return match?.[1] ?? 'unknown';
}

async function run(): Promise<Record<string, unknown>> {
  const argument = argumentsFromRuntime();
  if (!argument.enabled) return {};

  const endpoint = endpointFromUrl($request?.url ?? '');
  const payload = responsePayload();
  if (isJson(header('content-type'), payload.bytes, payload.text)) {
    const raw = payload.text ?? new TextDecoder().decode(payload.bytes);
    if (!raw) return {};
    const result = cleanYouTubeJson(endpoint.split('/').pop() ?? endpoint, raw);
    if (argument.debug) console.log(`[YouTube Ultimate][${endpoint}] type=json removed=${result.removed}`);
    return result.changed ? { body: payload.binary ? new TextEncoder().encode(result.body) : result.body } : {};
  }

  if (!argument.app_enhance || payload.bytes.length === 0) return {};
  const result = await handleAppResponse($request?.url ?? '', payload.bytes);
  if (argument.debug) console.log(`[YouTube Ultimate][${endpoint}] type=protobuf changed=${result.changed}`);
  return result.changed && result.bodyBytes ? { body: result.bodyBytes } : {};
}

void run()
  .then((result) => $done(result))
  .catch((error) => {
    let debug = false;
    try { debug = argumentsFromRuntime().debug; } catch (_) {}
    if (debug) console.log(`[YouTube Ultimate][${endpointFromUrl($request?.url ?? '')}] fail-open error=${error instanceof Error ? error.name : 'Error'}`);
    $done({});
  });
