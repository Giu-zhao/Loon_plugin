import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const DEFAULT_ARGUMENT = Object.freeze({
  enabled: true,
  web_enhance: true,
  app_enhance: true,
  blockUpload: false,
  blockShorts: false,
  blockImmersive: false,
  captionLang: 'zh-Hans',
  lyricLang: 'zh-Hans',
  debug: false,
});

export async function runLoonBinaryScript(scriptName, options = {}) {
  const source = await readFile(path.join(projectRoot, scriptName), 'utf8');
  const doneCalls = [];
  const logs = [];
  const store = new Map(Object.entries(options.store ?? {}));
  let finish;
  let fail;
  const donePromise = new Promise((resolve, reject) => {
    finish = resolve;
    fail = reject;
  });

  const responseBody = options.bodyBytes instanceof Uint8Array
    ? options.bodyBytes
    : new Uint8Array(options.bodyBytes ?? []);
  const context = {
    $loon: {},
    $argument: options.argument ?? { ...DEFAULT_ARGUMENT },
    $request: {
      method: options.method ?? 'POST',
      url: options.requestUrl ?? 'https://youtubei.googleapis.com/youtubei/v1/player',
      bodyBytes: options.requestBodyBytes,
    },
    $response: {
      ...(options.omitBody ? {} : { body: options.body ?? responseBody }),
      ...(options.legacyBodyBytes ? { bodyBytes: options.legacyBodyBytes } : {}),
      headers: options.headers ?? { 'Content-Type': 'application/x-protobuf' },
      status: options.status ?? 200,
    },
    $persistentStore: {
      read(key) { return store.get(key) ?? null; },
      write(value, key) { store.set(key, value); return true; },
    },
    $httpClient: {
      get(request, callback) {
        if (options.fetchError) {
          queueMicrotask(() => callback(options.fetchError, undefined, undefined));
          return;
        }
        const response = options.fetchResponse ?? { status: 503, body: '' };
        queueMicrotask(() => callback(null, response, response.body ?? ''));
      },
    },
    $notification: { post() {} },
    $done(value = {}) {
      doneCalls.push(value);
      if (doneCalls.length > 1) {
        fail(new Error(`${scriptName} called $done more than once`));
        return;
      }
      finish();
    },
    console: {
      log(message) { logs.push(String(message)); },
    },
    TextEncoder,
    TextDecoder,
    Uint8Array,
    ArrayBuffer,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    queueMicrotask,
  };

  vm.runInNewContext(source, context, { filename: scriptName, timeout: 2_000 });
  await Promise.race([
    donePromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${scriptName} timed out`)), 2_000)),
  ]);

  if (doneCalls.length !== 1) throw new Error(`${scriptName} called $done ${doneCalls.length} times`);
  const result = structuredClone(doneCalls[0]);
  if (result.body instanceof Uint8Array || result.body instanceof ArrayBuffer) result.body = new Uint8Array(result.body);
  if (result.bodyBytes) result.bodyBytes = new Uint8Array(result.bodyBytes);
  return { result, doneCalls: doneCalls.length, logs, store };
}
