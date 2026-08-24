import assert from 'node:assert/strict';
import test from 'node:test';
import { runLoonBinaryScript } from './helpers/run-loon-binary-script.mjs';
import { encodeLyricsFixture } from './helpers/app-fixtures.mjs';

test('native YouTube Music lyrics are preserved without translation requests', async () => {
  const run = await runLoonBinaryScript('YouTubeUltimateAPI.js', {
    requestUrl: 'https://youtubei.googleapis.com/youtubei/v1/browse',
    bodyBytes: encodeLyricsFixture({ timed: true }),
    fetchError: new Error('translation must not be requested'),
  });
  assert.equal(run.doneCalls, 1);
  assert.deepEqual(run.result, {});
  assert.deepEqual(run.logs, []);
});
