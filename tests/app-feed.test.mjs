import assert from 'node:assert/strict';
import test from 'node:test';
import { runLoonBinaryScript, DEFAULT_ARGUMENT } from './helpers/run-loon-binary-script.mjs';
import {
  decodeBrowse, decodeNext, decodeSearch, decodeShorts,
  encodeBrowseFixture, encodeNextFixture, encodeSearchFixture, encodeShortsFixture,
} from './helpers/app-fixtures.mjs';

async function run(endpoint, bodyBytes, argument = {}) {
  return runLoonBinaryScript('YouTubeUltimateAPI.js', {
    requestUrl: `https://youtubei.googleapis.com/youtubei/v1/${endpoint}`,
    bodyBytes,
    argument: { ...DEFAULT_ARGUMENT, ...argument },
  });
}

function richItems(message) {
  const content = message.content ?? message.content?.nextResult?.content;
  return content.sectionListRenderer.sectionListSupportedRenderers[0].itemSectionRenderer.richItemContent;
}

test('browse removes only explicit pagead unknown-field entries and persists metadata only', async () => {
  const result = await run('browse', encodeBrowseFixture());
  const renderers = decodeBrowse(result.result.body).content.sectionListRenderer.sectionListSupportedRenderers;
  assert.equal(renderers[0].itemSectionRenderer.richItemContent.length, 1);
  assert.equal(renderers.length, 2, 'normal Shorts shelf must remain by default');
  const cache = result.store.get('YTUL.App.AdvertiseInfo.v2');
  assert.match(cache, /blackNo|whiteNo/);
  assert.doesNotMatch(cache, /pagead-private-fixture|ordinary-private-fixture/);
});

test('blockShorts controls only the Shorts shelf', async () => {
  const enabled = await run('browse', encodeBrowseFixture(), { blockShorts: true });
  const renderers = decodeBrowse(enabled.result.body).content.sectionListRenderer.sectionListSupportedRenderers;
  assert.equal(renderers.length, 1);
});

test('search and next remove only explicit pagead entries', async () => {
  const search = decodeSearch((await run('search', encodeSearchFixture())).result.body);
  assert.equal(search.content.sectionListRenderer.sectionListSupportedRenderers[0].itemSectionRenderer.richItemContent.length, 1);
  const next = decodeNext((await run('next', encodeNextFixture())).result.body);
  assert.equal(next.content.nextResult.content.sectionListRenderer.sectionListSupportedRenderers[0].itemSectionRenderer.richItemContent.length, 1);
});

test('Shorts sequence removes entries without overlay', async () => {
  const shorts = decodeShorts((await run('reel/reel_watch_sequence', encodeShortsFixture())).result.body);
  assert.equal(shorts.entries.length, 1);
  assert.ok(shorts.entries[0].command.reelWatchEndpoint.overlay);
});

test('invalid protobuf and privacy markers fail open without unsafe logging', async () => {
  const marker = 'private-account-caption-lyrics-history-marker';
  const invalid = await runLoonBinaryScript('YouTubeUltimateAPI.js', {
    requestUrl: `https://youtubei.googleapis.com/youtubei/v1/browse?secret=${marker}`,
    bodyBytes: new Uint8Array([255, 255, 255]),
    argument: { ...DEFAULT_ARGUMENT, debug: true },
  });
  assert.deepEqual(invalid.result, {});
  assert.doesNotMatch(invalid.logs.join('\n'), new RegExp(marker));
});
