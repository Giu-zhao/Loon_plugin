/* YouTube Ultimate Loon - Safari page enhancement injector */
(function () {
  "use strict";

  function optionEnabled(name, defaultValue) {
    if (typeof $argument === "undefined" || $argument === null) return defaultValue;
    var value = $argument[name];
    if (typeof value === "undefined") return defaultValue;
    return value !== false && value !== 0 && String(value).toLowerCase() !== "false";
  }

  function getHeader(headers, name) {
    var target = name.toLowerCase();
    var keys = Object.keys(headers || {});
    for (var index = 0; index < keys.length; index += 1) {
      if (keys[index].toLowerCase() === target) return String(headers[keys[index]] || "");
    }
    return "";
  }

  function escapeAttribute(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  try {
    if (!optionEnabled("enabled", true) || !optionEnabled("page_enhance", true)) {
      return $done({});
    }

    var headers = ($response && $response.headers) || {};
    var contentType = getHeader(headers, "content-type");
    var body = ($response && $response.body) || "";

    if (!body || !/\btext\/html\b/i.test(contentType)) return $done({});
    if (body.indexOf('data-ytul="page-enhance"') !== -1) return $done({});
    if (!/<head(?:\s[^>]*)?>/i.test(body)) return $done({});

    var nonceMatch = body.match(/<script\b[^>]*\bnonce\s*=\s*(["'])([^"']+)\1/i);
    var nonceAttribute = nonceMatch ? ' nonce="' + escapeAttribute(nonceMatch[2]) + '"' : "";

    var injection = `
<style data-ytul="page-enhance"${nonceAttribute}>
ytd-ad-slot-renderer,
ytd-display-ad-renderer,
ytd-video-masthead-ad-v3-renderer,
ytd-promoted-video-renderer,
ytd-in-feed-ad-layout-renderer,
ytd-action-companion-ad-renderer,
ytd-companion-slot-renderer,
ytd-player-legacy-desktop-watch-ads-renderer,
#player-ads,
.ytp-ad-overlay-container,
.ytp-ad-player-overlay,
.ytp-ad-image-overlay {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
</style>
<script id="ytul-page-runtime"${nonceAttribute}>
(function () {
  "use strict";
  if (window.__ytulPageEnhance) return;
  window.__ytulPageEnhance = true;

  var BLOCKED_KEYS = {
    adPlacements: true,
    adPlacementRenderer: true,
    playerAds: true,
    adSlots: true,
    adBreakHeartbeatParams: true,
    adBreakParams: true,
    adBreakService: true,
    adSignalsInfo: true,
    adSlotRenderer: true,
    displayAdRenderer: true,
    videoDisplayAdRenderer: true,
    promotedVideoRenderer: true,
    compactPromotedVideoRenderer: true,
    promotedSparklesWebRenderer: true,
    promotedSparklesTextSearchRenderer: true,
    searchPyvRenderer: true,
    inFeedAdLayoutRenderer: true,
    carouselAdRenderer: true,
    mastheadAdRenderer: true,
    actionCompanionAdRenderer: true,
    companionAdRenderer: true
  };

  var REMOVE_SELECTORS = [
    "ytd-ad-slot-renderer",
    "ytd-display-ad-renderer",
    "ytd-video-masthead-ad-v3-renderer",
    "ytd-promoted-video-renderer",
    "ytd-in-feed-ad-layout-renderer",
    "ytd-action-companion-ad-renderer",
    "ytd-companion-slot-renderer",
    "ytd-player-legacy-desktop-watch-ads-renderer",
    "#player-ads"
  ];

  var SKIP_SELECTORS = [
    ".ytp-ad-skip-button",
    ".ytp-ad-skip-button-modern",
    ".ytp-skip-ad-button",
    "button.ytp-ad-skip-button",
    "button.ytp-skip-ad-button",
    ".ytp-ad-overlay-close-button"
  ];

  function hasBlockedKey(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    return Object.keys(value).some(function (key) { return BLOCKED_KEYS[key] === true; });
  }

  function cleanData(value) {
    if (Array.isArray(value)) {
      for (var index = value.length - 1; index >= 0; index -= 1) {
        if (hasBlockedKey(value[index])) {
          value.splice(index, 1);
        } else {
          cleanData(value[index]);
        }
      }
      return value;
    }
    if (!value || typeof value !== "object") return value;
    Object.keys(value).forEach(function (key) {
      if (BLOCKED_KEYS[key]) delete value[key];
      else cleanData(value[key]);
    });
    return value;
  }

  function hookInitialData(name) {
    var current = cleanData(window[name]);
    try {
      Object.defineProperty(window, name, {
        configurable: true,
        enumerable: true,
        get: function () { return current; },
        set: function (value) { current = cleanData(value); }
      });
    } catch (_) {
      if (window[name]) cleanData(window[name]);
    }
  }

  function removeAdNodes() {
    REMOVE_SELECTORS.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (node) { node.remove(); });
    });
  }

  function clickSkipButtons() {
    SKIP_SELECTORS.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (button) {
        if (!button.disabled && button.getClientRects().length > 0) button.click();
      });
    });
  }

  function cleanPage() {
    removeAdNodes();
    clickSkipButtons();
    if (window.ytInitialData) cleanData(window.ytInitialData);
    if (window.ytInitialPlayerResponse) cleanData(window.ytInitialPlayerResponse);
  }

  hookInitialData("ytInitialData");
  hookInitialData("ytInitialPlayerResponse");

  var root = document.documentElement;
  if (root) {
    new MutationObserver(cleanPage).observe(root, { childList: true, subtree: true });
  }
  window.addEventListener("yt-navigate-finish", cleanPage, true);
  window.addEventListener("DOMContentLoaded", cleanPage, true);
  window.setInterval(clickSkipButtons, 800);
  cleanPage();
})();
</script>`;

    var updatedBody = body.replace(/<head(?:\s[^>]*)?>/i, function (openingHead) {
      return openingHead + injection;
    });

    if (optionEnabled("debug", false)) {
      console.log("[YouTube Ultimate][page] injected=1 nonce=" + (nonceMatch ? "yes" : "no"));
    }
    return $done({ body: updatedBody });
  } catch (error) {
    if (optionEnabled("debug", false)) {
      console.log("[YouTube Ultimate][page] fail-open=" + error.message);
    }
    return $done({});
  }
})();
