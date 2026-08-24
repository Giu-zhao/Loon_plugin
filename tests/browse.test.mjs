import assert from "node:assert/strict";
import test from "node:test";

import { runLoonScript } from "./helpers/run-loon-script.mjs";

const SCRIPT = "YouTubeUltimateBrowse.js";

function rendererNames(items) {
  return items.map((item) => Object.keys(item)[0]);
}

test("browse cleaner removes ad renderer items and preserves normal feeds", async () => {
  const fixture = {
    contents: [
      { videoRenderer: { videoId: "normal-1", title: { simpleText: "Sponsored documentary" } } },
      { adSlotRenderer: { slotId: "ad-1" } },
      { reelShelfRenderer: { items: [{ reelItemRenderer: { videoId: "short-1" } }] } },
      { displayAdRenderer: { adId: "ad-2" } },
      { promotedVideoRenderer: { videoId: "ad-3" } },
      { inFeedAdLayoutRenderer: { adLayoutMetadata: {} } },
      { videoRenderer: { videoId: "normal-2", trackingParams: "contains-ad-text" } }
    ],
    header: {
      mastheadAdRenderer: { adId: "masthead" },
      feedFilterChipBarRenderer: { contents: [{ chipCloudChipRenderer: { text: "全部" } }] }
    },
    responseContext: {
      adSignalsInfo: { params: [] },
      visitorData: "visitor-kept"
    }
  };

  const { result } = await runLoonScript(SCRIPT, {
    body: JSON.stringify(fixture),
    requestUrl: "https://www.youtube.com/youtubei/v1/browse?prettyPrint=false"
  });
  const output = JSON.parse(result.body);

  assert.deepEqual(rendererNames(output.contents), [
    "videoRenderer",
    "reelShelfRenderer",
    "videoRenderer"
  ]);
  assert.equal(output.contents[0].videoRenderer.videoId, "normal-1");
  assert.equal(output.contents[1].reelShelfRenderer.items[0].reelItemRenderer.videoId, "short-1");
  assert.equal(output.contents[2].videoRenderer.videoId, "normal-2");
  assert.equal("mastheadAdRenderer" in output.header, false);
  assert.equal("feedFilterChipBarRenderer" in output.header, true);
  assert.equal("adSignalsInfo" in output.responseContext, false);
  assert.equal(output.responseContext.visitorData, "visitor-kept");
});

test("browse cleaner removes nested search and sparkle ads", async () => {
  const fixture = {
    sections: [{
      itemSectionRenderer: {
        contents: [
          { searchPyvRenderer: { adId: "search-ad" } },
          { promotedSparklesWebRenderer: { adId: "sparkle-ad" } },
          { videoRenderer: { videoId: "kept" } }
        ]
      }
    }]
  };

  const { result } = await runLoonScript(SCRIPT, { body: JSON.stringify(fixture) });
  const contents = JSON.parse(result.body).sections[0].itemSectionRenderer.contents;
  assert.deepEqual(rendererNames(contents), ["videoRenderer"]);
});

test("browse cleaner fails open for invalid JSON", async () => {
  const { result } = await runLoonScript(SCRIPT, { body: "<html>not json</html>" });
  assert.deepEqual(result, {});
});

test("browse fail-open debug log contains no parser response snippet", async () => {
  const secret = "private-browse-fragment";
  const { logs } = await runLoonScript(SCRIPT, {
    body: `{\"ok\":true}${secret}`,
    argument: { enabled: true, debug: true }
  });
  assert.deepEqual(logs, ["[YouTube Ultimate][browse] fail-open=invalid-response"]);
  assert.doesNotMatch(logs[0], new RegExp(secret));
});

test("browse cleaner passes through when disabled", async () => {
  const { result } = await runLoonScript(SCRIPT, {
    body: JSON.stringify({ contents: [{ adSlotRenderer: {} }] }),
    argument: { enabled: false, debug: true }
  });
  assert.deepEqual(result, {});
});
