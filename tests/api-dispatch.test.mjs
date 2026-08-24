import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { runLoonBinaryScript, DEFAULT_ARGUMENT } from './helpers/run-loon-binary-script.mjs';
import { decodePlayer, encodePlayerFixture } from './helpers/app-fixtures.mjs';

const SCRIPT = 'YouTubeUltimateAPI.js';

test('binary harness returns bytes and calls done once', async () => {
  await access(new URL('../YouTubeUltimateAPI.js', import.meta.url));
  const run = await runLoonBinaryScript(SCRIPT, { bodyBytes: encodePlayerFixture() });
  assert.equal(run.doneCalls, 1);
  assert.ok(run.result.bodyBytes instanceof Uint8Array);
});

test('dispatcher cleans JSON strings and preserves anti-XSSI', async () => {
  const raw = `)]}'\n${JSON.stringify({ adPlacements: [{}], videoDetails: { videoId: 'safe' } })}`;
  const run = await runLoonBinaryScript(SCRIPT, {
    body: raw,
    bodyBytes: new Uint8Array(),
    headers: { 'content-type': 'application/json' },
  });
  assert.match(run.result.body, /^\)\]\}'\n/);
  const parsed = JSON.parse(run.result.body.slice(5));
  assert.equal('adPlacements' in parsed, false);
  assert.equal(parsed.videoDetails.videoId, 'safe');
});

test('dispatcher detects JSON bodyBytes and fails open invalid bodies', async () => {
  const encoded = new TextEncoder().encode(JSON.stringify({ adSlots: [{}], safe: true }));
  const json = await runLoonBinaryScript(SCRIPT, {
    bodyBytes: encoded,
    headers: { 'Content-Type': 'application/octet-stream' },
  });
  assert.equal(JSON.parse(json.result.body).safe, true);
  assert.equal('adSlots' in JSON.parse(json.result.body), false);

  const invalid = await runLoonBinaryScript(SCRIPT, {
    body: '{not json', bodyBytes: new Uint8Array(), headers: { 'Content-Type': 'application/json' },
  });
  assert.deepEqual(invalid.result, {});
});

test('dispatcher accepts query-string arguments and disabled switches fail open', async () => {
  const protobuf = await runLoonBinaryScript(SCRIPT, {
    bodyBytes: encodePlayerFixture(),
    argument: 'enabled=true&app_enhance=false&captionLang=zh-Hans',
  });
  assert.deepEqual(protobuf.result, {});

  const json = await runLoonBinaryScript(SCRIPT, {
    body: JSON.stringify({ adSlots: [{}] }), bodyBytes: new Uint8Array(),
    headers: { 'Content-Type': 'application/json' }, argument: { ...DEFAULT_ARGUMENT, enabled: false },
  });
  assert.deepEqual(json.result, {});
});

test('protobuf dispatcher returns a modified player without exposing body in logs', async () => {
  const privateMarker = 'private-account-caption-history-marker';
  const run = await runLoonBinaryScript(SCRIPT, {
    bodyBytes: encodePlayerFixture(),
    requestUrl: `https://youtubei.googleapis.com/youtubei/v1/player?marker=${privateMarker}`,
    argument: { ...DEFAULT_ARGUMENT, debug: true },
  });
  const player = decodePlayer(run.result.bodyBytes);
  assert.equal(player.adPlacements.length, 0);
  assert.doesNotMatch(run.logs.join('\n'), new RegExp(privateMarker));
});

test('only the dispatcher source calls global done', async () => {
  const dispatcher = await readFile(new URL('../src/api/index.ts', import.meta.url), 'utf8');
  const appIndex = await readFile(new URL('../src/app/index.ts', import.meta.url), 'utf8');
  const youtube = await readFile(new URL('../src/app/src/youtube.ts', import.meta.url), 'utf8');
  const response = await readFile(new URL('../src/app/src/response.ts', import.meta.url), 'utf8');
  assert.match(dispatcher, /\$done\s*\(/);
  assert.doesNotMatch(appIndex + youtube + response, /\$done\s*\(/);
});
