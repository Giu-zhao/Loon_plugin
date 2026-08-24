import assert from "node:assert/strict";
import test from "node:test";

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
    argument: { enabled: true, page_enhance: false, debug: true }
  });

  assert.deepEqual(result, {});
});
