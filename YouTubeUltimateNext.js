/* YouTube Ultimate Loon - next/get_watch response cleaner */
(function () {
  "use strict";

  var BLOCKED_RENDERERS = {
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

  var BLOCKED_FIELDS = {
    adPlacements: true,
    adPlacementRenderer: true,
    playerAds: true,
    adSlots: true,
    adBreakHeartbeatParams: true,
    adBreakParams: true,
    adBreakService: true,
    adSignalsInfo: true
  };

  function optionEnabled(name, defaultValue) {
    if (typeof $argument === "undefined" || $argument === null) return defaultValue;
    var value = $argument[name];
    if (typeof value === "undefined") return defaultValue;
    return value !== false && value !== 0 && String(value).toLowerCase() !== "false";
  }

  function isBlockedRendererObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    return Object.keys(value).some(function (key) {
      return BLOCKED_RENDERERS[key] === true;
    });
  }

  function clean(value, stats) {
    if (Array.isArray(value)) {
      var kept = [];
      value.forEach(function (item) {
        if (isBlockedRendererObject(item)) {
          stats.removed += 1;
          return;
        }
        kept.push(clean(item, stats));
      });
      return kept;
    }

    if (!value || typeof value !== "object") return value;

    Object.keys(value).forEach(function (key) {
      if (BLOCKED_RENDERERS[key] || BLOCKED_FIELDS[key]) {
        delete value[key];
        stats.removed += 1;
        return;
      }
      value[key] = clean(value[key], stats);
    });
    return value;
  }

  try {
    if (!optionEnabled("enabled", true)) return $done({});

    var raw = ($response && $response.body) || "";
    if (!raw) return $done({});

    var prefixMatch = raw.match(/^\)\]\}'(?:\r?\n)?/);
    var prefix = prefixMatch ? prefixMatch[0] : "";
    var payload = JSON.parse(prefix ? raw.slice(prefix.length) : raw);
    var stats = { removed: 0 };
    payload = clean(payload, stats);

    if (optionEnabled("debug", false)) {
      console.log("[YouTube Ultimate][next] removed=" + stats.removed);
    }

    if (stats.removed === 0) return $done({});
    return $done({ body: prefix + JSON.stringify(payload) });
  } catch (_) {
    if (optionEnabled("debug", false)) {
      console.log("[YouTube Ultimate][next] fail-open=invalid-response");
    }
    return $done({});
  }
})();
