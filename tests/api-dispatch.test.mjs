import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { runLoonBinaryScript, DEFAULT_ARGUMENT } from './helpers/run-loon-binary-script.mjs';
import { decodeBrowse, decodePlayer, encodeBrowseFixture, encodePlayerFixture } from './helpers/app-fixtures.mjs';

const SCRIPT = 'YouTubeUltimateAPI.js';

test('binary harness returns bytes and calls done once', async () => {
  await access(new URL('../YouTubeUltimateAPI.js', import.meta.url));
  const run = await runLoonBinaryScript(SCRIPT, { bodyBytes: encodePlayerFixture() });
  assert.equal(run.doneCalls, 1);
  assert.ok(run.result.body instanceof Uint8Array);
  assert.equal('bodyBytes' in run.result, false);
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

test('dispatcher detects JSON bytes in official Loon body and fails open invalid bodies', async () => {
  const encoded = new TextEncoder().encode(JSON.stringify({ adSlots: [{}], safe: true }));
  const json = await runLoonBinaryScript(SCRIPT, {
    bodyBytes: encoded,
    headers: { 'Content-Type': 'application/octet-stream' },
  });
  assert.ok(json.result.body instanceof Uint8Array);
  const jsonBody = new TextDecoder().decode(json.result.body);
  assert.equal(JSON.parse(jsonBody).safe, true);
  assert.equal('adSlots' in JSON.parse(jsonBody), false);

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
  const player = decodePlayer(run.result.body);
  assert.equal(player.adPlacements.length, 0);
  assert.doesNotMatch(run.logs.join('\n'), new RegExp(privateMarker));
});

test('dispatcher supports legacy response bodyBytes only as a compatibility fallback', async () => {
  const run = await runLoonBinaryScript(SCRIPT, {
    omitBody: true,
    legacyBodyBytes: encodePlayerFixture(),
    requestUrl: 'https://youtubei.googleapis.com/youtubei/v1/player',
  });
  assert.ok(run.result.body instanceof Uint8Array);
  assert.equal(decodePlayer(run.result.body).adPlacements.length, 0);
});

test('dispatcher routes exact endpoint path and ignores query-string endpoint names', async () => {
  const player = await runLoonBinaryScript(SCRIPT, {
    bodyBytes: encodePlayerFixture(),
    requestUrl: 'https://youtubei.googleapis.com/youtubei/v1/player?next=1',
  });
  assert.equal(decodePlayer(player.result.body).adPlacements.length, 0);

  const browse = await runLoonBinaryScript(SCRIPT, {
    bodyBytes: encodeBrowseFixture(),
    requestUrl: 'https://youtubei.googleapis.com/youtubei/v1/browse?player=1',
    argument: { ...DEFAULT_ARGUMENT, lyricLang: 'off' },
  });
  assert.equal(decodeBrowse(browse.result.body).content.sectionListRenderer.sectionListSupportedRenderers[0].itemSectionRenderer.richItemContent.length, 1);

  const unknown = await runLoonBinaryScript(SCRIPT, {
    bodyBytes: encodePlayerFixture(),
    requestUrl: 'https://youtubei.googleapis.com/youtubei/v1/not_player?player=1',
  });
  assert.deepEqual(unknown.result, {});
});

test('manual golden player bytes remove field 7 and preserve unknown field 99', async () => {
  const golden = new Uint8Array([0x3a, 0x00, 0x9a, 0x06, 0x06, 0x67, 0x6f, 0x6c, 0x64, 0x65, 0x6e]);
  const expected = new Uint8Array([0x9a, 0x06, 0x06, 0x67, 0x6f, 0x6c, 0x64, 0x65, 0x6e]);
  const run = await runLoonBinaryScript(SCRIPT, {
    bodyBytes: golden,
    requestUrl: 'https://youtubei.googleapis.com/youtubei/v1/player',
    argument: { ...DEFAULT_ARGUMENT, captionLang: 'off' },
  });
  assert.deepEqual(run.result.body, expected);
});

test('only the dispatcher source calls global done', async () => {
  const dispatcher = await readFile(new URL('../src/api/index.ts', import.meta.url), 'utf8');
  const appIndex = await readFile(new URL('../src/app/index.ts', import.meta.url), 'utf8');
  const youtube = await readFile(new URL('../src/app/src/youtube.ts', import.meta.url), 'utf8');
  const response = await readFile(new URL('../src/app/src/response.ts', import.meta.url), 'utf8');
  assert.match(dispatcher, /\$done\s*\(/);
  assert.doesNotMatch(appIndex + youtube + response, /\$done\s*\(/);
});
