import assert from 'node:assert/strict';
import test from 'node:test';
import { runLoonBinaryScript, DEFAULT_ARGUMENT } from './helpers/run-loon-binary-script.mjs';
import {
  decodeGuide, decodeSetting, decodeWatch, encodeGuideFixture, encodeSettingFixture, encodeWatchFixture,
} from './helpers/app-fixtures.mjs';

async function run(endpoint, bodyBytes, argument = {}) {
  return runLoonBinaryScript('YouTubeUltimateAPI.js', {
    requestUrl: `https://youtubei.googleapis.com/youtubei/v1/${endpoint}`,
    bodyBytes,
    argument: { ...DEFAULT_ARGUMENT, ...argument },
  });
}

function guideIds(guide) {
  return guide.items4[0].guideSectionRenderer.rendererItems.map((item) => item.iconRender?.browseId ?? item.labelRender?.browseId);
}

test('guide always hides upgrades and defaults preserve optional buttons', async () => {
  const ids = guideIds(decodeGuide((await run('guide', encodeGuideFixture())).result.body));
  assert.deepEqual(ids, ['FEuploads', 'FEshorts', 'FEmusic_immersive', 'FEhome']);
});

test('guide switches independently control uploads, Shorts and immersive', async () => {
  for (const [option, blocked] of [['blockUpload', 'FEuploads'], ['blockShorts', 'FEshorts'], ['blockImmersive', 'FEmusic_immersive']]) {
    const ids = guideIds(decodeGuide((await run('guide', encodeGuideFixture(), { [option]: true })).result.body));
    assert.equal(ids.includes(blocked), false);
    assert.equal(ids.includes('FEhome'), true);
  }
});

test('settings add deduplicated PIP and background controls without download flags', async () => {
  const setting = decodeSetting((await run('account/get_setting', encodeSettingFixture())).result.body);
  const category = setting.settingItems.find((item) => item.settingCategoryCollectionRenderer?.categoryId === 10135);
  assert.equal(category.settingCategoryCollectionRenderer.subSettings.length, 1);
  const backgrounds = setting.settingItems.filter((item) => item.backgroundPlayBackSettingRenderer);
  assert.equal(backgrounds.length, 1);
  assert.equal(backgrounds[0].backgroundPlayBackSettingRenderer.backgroundPlayback, true);
  assert.equal('download' in backgrounds[0].backgroundPlayBackSettingRenderer, false);
  assert.equal('downloadQualitySelection' in backgrounds[0].backgroundPlayBackSettingRenderer, false);
  assert.equal('smartDownload' in backgrounds[0].backgroundPlayBackSettingRenderer, false);

  const existing = decodeSetting((await run('account/get_setting', encodeSettingFixture({ existing: true }))).result.body);
  assert.equal(existing.settingItems.filter((item) => item.backgroundPlayBackSettingRenderer).length, 1);
});

test('get_watch processes nested player and next messages', async () => {
  const watch = decodeWatch((await run('get_watch', encodeWatchFixture())).result.body);
  const player = watch.contents.find((item) => item.player).player;
  const next = watch.contents.find((item) => item.next).next;
  assert.equal(player.adPlacements.length, 0);
  assert.equal(next.content.nextResult.content.sectionListRenderer.sectionListSupportedRenderers[0].itemSectionRenderer.richItemContent.length, 1);
});
