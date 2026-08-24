import assert from "node:assert/strict";
import test from "node:test";

import { runLoonScript } from "./helpers/run-loon-script.mjs";

const SCRIPT = "YouTubeUltimateNext.js";

test("next cleaner removes promoted recommendations and keeps watch data", async () => {
  const fixture = {
    contents: [
      { compactVideoRenderer: { videoId: "recommended" } },
      { compactPromotedVideoRenderer: { videoId: "advertisement" } },
      { commentThreadRenderer: { comment: { commentRenderer: { commentId: "comment-1" } } } },
      { continuationItemRenderer: { trigger: "CONTINUATION_TRIGGER_ON_ITEM_SHOWN" } },
      { adSlotRenderer: { slotId: "ad-slot" } }
    ],
    playerResponse: {
      adPlacements: [{ adPlacementRenderer: {} }],
      playerAds: [{}],
      adSlots: [{}],
      streamingData: { formats: [{ itag: 18 }] }
    },
    responseContext: {
      adSignalsInfo: { params: [] },
      serviceTrackingParams: [{ service: "CSI" }]
    }
  };

  const { result } = await runLoonScript(SCRIPT, {
    body: JSON.stringify(fixture),
    requestUrl: "https://www.youtube.com/youtubei/v1/next?prettyPrint=false"
  });
  const output = JSON.parse(result.body);
  const serialized = JSON.stringify(output);

  assert.doesNotMatch(serialized, /compactPromotedVideoRenderer/);
  assert.doesNotMatch(serialized, /adSlotRenderer/);
  assert.doesNotMatch(serialized, /adPlacements|playerAds|adSlots|adSignalsInfo/);
  assert.match(serialized, /compactVideoRenderer/);
  assert.match(serialized, /commentThreadRenderer/);
  assert.match(serialized, /continuationItemRenderer/);
  assert.deepEqual(output.playerResponse.streamingData, fixture.playerResponse.streamingData);
  assert.deepEqual(
    output.responseContext.serviceTrackingParams,
    fixture.responseContext.serviceTrackingParams
  );
});

test("next cleaner handles get_watch nested ad renderers", async () => {
  const fixture = {
    watchNextResponse: {
      secondaryResults: {
        secondaryResults: {
          results: [
            { promotedSparklesWebRenderer: { adId: "sparkle" } },
            { compactVideoRenderer: { videoId: "kept" } }
          ]
        }
      }
    }
  };

  const { result } = await runLoonScript(SCRIPT, {
    body: JSON.stringify(fixture),
    requestUrl: "https://www.youtube.com/youtubei/v1/get_watch"
  });
  const results = JSON.parse(result.body)
    .watchNextResponse.secondaryResults.secondaryResults.results;

  assert.deepEqual(results, [{ compactVideoRenderer: { videoId: "kept" } }]);
});

test("next cleaner fails open for invalid JSON", async () => {
  const { result } = await runLoonScript(SCRIPT, { body: "not-json" });
  assert.deepEqual(result, {});
});

test("next cleaner passes through when disabled", async () => {
  const { result } = await runLoonScript(SCRIPT, {
    body: JSON.stringify({ adPlacements: [] }),
    argument: { enabled: false }
  });
  assert.deepEqual(result, {});
});
