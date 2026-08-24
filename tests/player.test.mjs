import assert from "node:assert/strict";
import test from "node:test";

import { runLoonScript } from "./helpers/run-loon-script.mjs";

const SCRIPT = "YouTubeUltimatePlayer.js";

test("player cleaner removes exact ad fields and preserves playback data", async () => {
  const fixture = {
    adPlacements: [{ adPlacementRenderer: { config: "ad" } }],
    playerAds: [{ playerLegacyDesktopWatchAdsRenderer: {} }],
    adSlots: [{ adSlotRenderer: {} }],
    adBreakHeartbeatParams: "heartbeat",
    responseContext: {
      adSignalsInfo: { params: [{ key: "history", value: "sensitive" }] },
      visitorData: "visitor-kept"
    },
    streamingData: {
      formats: [{ itag: 18, url: "https://video.example/content" }]
    },
    captions: {
      playerCaptionsTracklistRenderer: { captionTracks: [{ languageCode: "zh-CN" }] }
    },
    nested: {
      adSignalsInfo: { params: [] },
      normal: true
    }
  };

  const { result, logs } = await runLoonScript(SCRIPT, {
    body: JSON.stringify(fixture),
    requestUrl: "https://www.youtube.com/youtubei/v1/player?prettyPrint=false"
  });
  const output = JSON.parse(result.body);

  assert.equal("adPlacements" in output, false);
  assert.equal("playerAds" in output, false);
  assert.equal("adSlots" in output, false);
  assert.equal("adBreakHeartbeatParams" in output, false);
  assert.equal("adSignalsInfo" in output.responseContext, false);
  assert.equal("adSignalsInfo" in output.nested, false);
  assert.equal(output.responseContext.visitorData, "visitor-kept");
  assert.deepEqual(output.streamingData, fixture.streamingData);
  assert.deepEqual(output.captions, fixture.captions);
  assert.deepEqual(logs, []);
});

test("player cleaner preserves YouTube anti-XSSI prefix", async () => {
  const prefix = ")]}'\n";
  const { result } = await runLoonScript(SCRIPT, {
    body: prefix + JSON.stringify({ adPlacements: [], videoDetails: { videoId: "abc" } })
  });

  assert.ok(result.body.startsWith(prefix));
  assert.deepEqual(JSON.parse(result.body.slice(prefix.length)), {
    videoDetails: { videoId: "abc" }
  });
});

test("player cleaner fails open for invalid JSON", async () => {
  const { result } = await runLoonScript(SCRIPT, { body: "not-json" });
  assert.deepEqual(result, {});
});

test("player fail-open debug log never includes parser response snippets", async () => {
  const secret = "private-response-fragment";
  const { result, logs } = await runLoonScript(SCRIPT, {
    body: `{\"ok\":true}${secret}`,
    argument: { enabled: true, debug: true }
  });

  assert.deepEqual(result, {});
  assert.deepEqual(logs, ["[YouTube Ultimate][player] fail-open=invalid-response"]);
  assert.doesNotMatch(logs[0], new RegExp(secret));
});

test("player cleaner passes through when disabled", async () => {
  const { result } = await runLoonScript(SCRIPT, {
    body: JSON.stringify({ adPlacements: [] }),
    argument: { enabled: false, debug: true }
  });
  assert.deepEqual(result, {});
});

test("player debug log contains counts but no response data", async () => {
  const secret = "private-visitor-token";
  const { logs } = await runLoonScript(SCRIPT, {
    body: JSON.stringify({ adPlacements: [], responseContext: { visitorData: secret } }),
    argument: { enabled: true, debug: true }
  });

  assert.equal(logs.length, 1);
  assert.match(logs[0], /removed=1/);
  assert.doesNotMatch(logs[0], new RegExp(secret));
});
