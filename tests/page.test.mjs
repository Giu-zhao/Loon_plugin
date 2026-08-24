import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import { runLoonScript } from "./helpers/run-loon-script.mjs";

const SCRIPT = "YouTubeUltimatePage.js";
const HTML = `<!doctype html><html><head><meta charset="utf-8"><script nonce="nonce-123">window.original=true;</script></head><body><ytd-app></ytd-app></body></html>`;

test("page enhancer injects once at the start of head and reuses CSP nonce", async () => {
  const first = await runLoonScript(SCRIPT, {
    body: HTML,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "script-src 'nonce-nonce-123'"
    },
    requestUrl: "https://www.youtube.com/watch?v=abc"
  });

  assert.match(first.result.body, /data-ytul="page-enhance"/);
  assert.match(first.result.body, /nonce="nonce-123"/);
  assert.match(first.result.body, /MutationObserver/);
  assert.match(first.result.body, /ytInitialPlayerResponse/);
  assert.match(first.result.body, /ytInitialData/);
  assert.match(first.result.body, /ytp-ad-skip-button/);
  assert.match(first.result.body, /ytd-ad-slot-renderer/);
  assert.ok(
    first.result.body.indexOf("data-ytul=\"page-enhance\"") <
      first.result.body.indexOf("window.original=true")
  );
  assert.equal("headers" in first.result, false);

  const second = await runLoonScript(SCRIPT, {
    body: first.result.body,
    headers: { "content-type": "text/html" }
  });
  assert.deepEqual(second.result, {});
  assert.equal((first.result.body.match(/data-ytul="page-enhance"/g) || []).length, 1);
});

test("page enhancer injects without changing CSP when no nonce is present", async () => {
  const { result } = await runLoonScript(SCRIPT, {
    body: "<html><head><title>YouTube</title></head><body></body></html>",
    headers: {
      "content-type": "text/html",
      "content-security-policy": "default-src 'self'"
    }
  });

  assert.match(result.body, /data-ytul="page-enhance"/);
  assert.equal("headers" in result, false);
});

test("page enhancer passes through non-HTML and missing-head responses", async () => {
  const json = await runLoonScript(SCRIPT, {
    body: JSON.stringify({ adPlacements: [] }),
    headers: { "Content-Type": "application/json" }
  });
  const fragment = await runLoonScript(SCRIPT, {
    body: "<div>fragment</div>",
    headers: { "Content-Type": "text/html" }
  });

  assert.deepEqual(json.result, {});
  assert.deepEqual(fragment.result, {});
});

test("page enhancer passes through when page enhancement is disabled", async () => {
  const { result } = await runLoonScript(SCRIPT, {
    body: HTML,
    headers: { "Content-Type": "text/html" },
    argument: { enabled: true, web_enhance: false, debug: true }
  });

  assert.deepEqual(result, {});
});

test("embedded page runtime clicks hidden skip buttons and handles added nodes without rescanning the document", async () => {
  const { result } = await runLoonScript(SCRIPT, {
    body: HTML,
    headers: { "Content-Type": "text/html" }
  });
  const runtimeMatch = result.body.match(/<script id="ytul-page-runtime"[^>]*>([\s\S]*?)<\/script>/);
  const styleMatch = result.body.match(/<style data-ytul="page-enhance"[^>]*>([\s\S]*?)<\/style>/);
  assert.ok(runtimeMatch, "embedded runtime should be present");
  assert.ok(styleMatch, "embedded style should be present");
  assert.doesNotMatch(styleMatch[1], /ytp-ad-player-overlay|ytp-ad-overlay-container/);

  let documentScans = 0;
  let initialAdRemovals = 0;
  let initialSkipClicks = 0;
  let observerCallback;
  let observerOptions;
  const frameCallbacks = [];

  const initialAd = {
    remove() { initialAdRemovals += 1; }
  };
  const initialSkip = {
    disabled: false,
    getClientRects() { return []; },
    click() { initialSkipClicks += 1; }
  };
  const document = {
    documentElement: { nodeType: 1 },
    querySelectorAll(selector) {
      documentScans += 1;
      if (selector === "ytd-ad-slot-renderer") return [initialAd];
      if (selector === ".ytp-ad-skip-button") return [initialSkip];
      return [];
    }
  };
  const listeners = {};
  const window = {
    addEventListener(name, callback) { listeners[name] = callback; },
    requestAnimationFrame(callback) { frameCallbacks.push(callback); }
  };

  class MutationObserver {
    constructor(callback) { observerCallback = callback; }
    observe(_root, options) { observerOptions = options; }
  }

  vm.runInNewContext(runtimeMatch[1], {
    document,
    window,
    MutationObserver,
    Object,
    Array
  }, { timeout: 2_000 });

  assert.equal(initialAdRemovals, 1);
  assert.equal(initialSkipClicks, 1, "skip buttons must be clicked even when an ancestor is hidden");
  assert.equal(observerOptions.childList, true);
  assert.equal(observerOptions.subtree, true);
  assert.equal(observerOptions.attributes, true);
  assert.deepEqual(Array.from(observerOptions.attributeFilter), ["disabled", "aria-disabled"]);
  assert.equal(typeof listeners["yt-navigate-finish"], "function");

  const scansAfterInitialPass = documentScans;
  let addedAdRemovals = 0;
  let addedSkipClicks = 0;
  const addedAd = {
    nodeType: 1,
    matches(selector) { return selector === "ytd-ad-slot-renderer"; },
    querySelectorAll() { return []; },
    remove() { addedAdRemovals += 1; }
  };
  const addedSkip = {
    nodeType: 1,
    disabled: false,
    matches(selector) { return selector === ".ytp-ad-skip-button"; },
    querySelectorAll() { return []; },
    click() { addedSkipClicks += 1; }
  };

  observerCallback([{ addedNodes: [addedAd, addedSkip] }]);

  assert.equal(frameCallbacks.length, 1, "multiple nodes in one mutation batch should share one frame");
  assert.equal(addedAdRemovals, 0);
  assert.equal(addedSkipClicks, 0);
  frameCallbacks.shift()();
  assert.equal(addedAdRemovals, 1);
  assert.equal(addedSkipClicks, 1);
  assert.equal(documentScans, scansAfterInitialPass, "mutation handling must inspect added nodes only");

  let transitionedSkipClicks = 0;
  const transitionedSkip = {
    nodeType: 1,
    disabled: true,
    matches(selector) { return selector === ".ytp-ad-skip-button"; },
    querySelectorAll() { return []; },
    click() { transitionedSkipClicks += 1; }
  };
  observerCallback([{ addedNodes: [transitionedSkip] }]);
  frameCallbacks.shift()();
  assert.equal(transitionedSkipClicks, 0);

  transitionedSkip.disabled = false;
  observerCallback([{ type: "attributes", target: transitionedSkip, addedNodes: [] }]);
  assert.equal(frameCallbacks.length, 1);
  frameCallbacks.shift()();
  assert.equal(transitionedSkipClicks, 1);
});
