import assert from 'node:assert/strict';
import test from 'node:test';
import { runLoonBinaryScript, DEFAULT_ARGUMENT } from './helpers/run-loon-binary-script.mjs';
import { decodePlayer, encodePlayerFixture } from './helpers/app-fixtures.mjs';

async function playerRun(argument = {}) {
  return runLoonBinaryScript('YouTubeUltimateAPI.js', {
    bodyBytes: encodePlayerFixture(),
    argument: { ...DEFAULT_ARGUMENT, ...argument },
  });
}

test('player removes explicit ads and conversion tracking while preserving playback URL', async () => {
  const run = await playerRun();
  const player = decodePlayer(run.result.body);
  assert.equal(player.adPlacements.length, 0);
  assert.equal(player.adSlots.length, 0);
  assert.equal(player.playbackTracking.pageadViewthroughconversion, undefined);
  assert.equal(player.playbackTracking.videostatsPlaybackUrl.baseUrl, 'https://video.example/playback');
});

test('player enables mini player and background playback', async () => {
  const player = decodePlayer((await playerRun()).result.body);
  assert.equal(player.playabilityStatus.miniPlayer.miniPlayerRender.active, true);
  assert.equal(player.playabilityStatus.backgroundPlayer.backgroundPlayerRender.active, true);
});

test('player clones the automatic caption track and selects a loadable Chinese translation', async () => {
  const player = decodePlayer((await playerRun()).result.body);
  const list = player.captions.playerCaptionsTrackListRenderer;
  assert.equal(list.captionTracks.length, 2);
  assert.equal(list.captionTracks[0].kind, 'asr');
  assert.equal(list.captionTracks[1].languageCode, 'zh-Hans');
  assert.equal(list.captionTracks[1].kind, 'asr');
  assert.match(list.captionTracks[1].baseUrl, /[?&]tlang=zh-Hans(?:&|$)/);
  assert.ok(list.translationLanguages.some((language) => language.languageCode === 'zh-Hans'));
  assert.equal(list.audioTracks[0].defaultCaptionTrackIndex, 1);

  const off = decodePlayer((await playerRun({ captionLang: 'off' })).result.body);
  assert.equal(off.captions.playerCaptionsTrackListRenderer.captionTracks.length, 1);
});
