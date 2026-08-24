import assert from 'node:assert/strict';
import test from 'node:test';
import { runLoonBinaryScript, DEFAULT_ARGUMENT } from './helpers/run-loon-binary-script.mjs';
import { decodeBrowse, encodeBrowseFixture, encodeLyricsFixture } from './helpers/app-fixtures.mjs';

const translated = JSON.stringify([[['第一行', 'line one'], ['第二行', 'line two']], null, 'en']);

async function runLyrics(options = {}) {
  return runLoonBinaryScript('YouTubeUltimateAPI.js', {
    requestUrl: 'https://youtubei.googleapis.com/youtubei/v1/browse',
    bodyBytes: encodeLyricsFixture({ timed: options.timed }),
    argument: { ...DEFAULT_ARGUMENT, ...options.argument },
    fetchResponse: options.fetchResponse ?? { status: 200, body: translated },
  });
}

test('ordinary lyrics append translation and disclose Google attribution', async () => {
  const result = await runLyrics();
  const browse = decodeBrowse(result.result.bodyBytes);
  const shelf = browse.content.sectionListRenderer.sectionListSupportedRenderers[0].musicDescriptionShelfRenderer;
  assert.match(shelf.description.runs[0].text, /第一行/);
  assert.match(shelf.footer.runs[0].text, /Translated by Google/);
  assert.doesNotMatch(result.logs.join('\n'), /line one|第一行/);
});

test('timed lyrics append translations line by line', async () => {
  const browse = decodeBrowse((await runLyrics({ timed: true })).result.bodyBytes);
  const runs = browse.content.sectionListRenderer.sectionListSupportedRenderers[0]
    .itemSectionRenderer.richItemContent[0].videoWithContextRenderer.videoRendererContent
    .videoInfo.videoContext.videoContent.timedLyricsRender.timedLyricsContent.runs;
  assert.match(runs[0].text, /第一行/);
  assert.match(runs[1].text, /第二行/);
});

test('translation off and non-MPLYt browse never send lyrics', async () => {
  const off = await runLyrics({ argument: { lyricLang: 'off' } });
  assert.deepEqual(off.result, {});
  const ordinary = await runLoonBinaryScript('YouTubeUltimateAPI.js', {
    requestUrl: 'https://youtubei.googleapis.com/youtubei/v1/browse',
    bodyBytes: encodeBrowseFixture({ browseId: 'FEhome', includeShelf: false, pagead: false }),
    fetchResponse: { status: 200, body: translated },
  });
  assert.deepEqual(ordinary.result, {});
});

test('same-language, invalid JSON, HTTP failure and line mismatch preserve lyrics', async () => {
  const same = await runLyrics({ fetchResponse: { status: 200, body: JSON.stringify([[['line one', 'line one'], ['line two', 'line two']], null, 'zh-CN']) } });
  assert.deepEqual(same.result, {});
  const sameText = decodeBrowse(encodeLyricsFixture()).content.sectionListRenderer.sectionListSupportedRenderers[0].musicDescriptionShelfRenderer.description.runs[0].text;
  assert.equal(sameText, 'line one\nline two');

  for (const fetchResponse of [
    { status: 200, body: '{invalid' },
    { status: 503, body: '' },
    { status: 200, body: JSON.stringify([[['only one', 'line one']], null, 'en']) },
  ]) {
    const failed = await runLyrics({ timed: true, fetchResponse });
    assert.deepEqual(failed.result, {});
  }
});
