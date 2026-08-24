/* YouTube Ultimate Loon - player response cleaner */
(function () {
  "use strict";

  var BLOCKED_KEYS = {
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

  function clean(value, stats) {
    if (Array.isArray(value)) {
      for (var index = 0; index < value.length; index += 1) {
        clean(value[index], stats);
      }
      return;
    }

    if (!value || typeof value !== "object") return;

    Object.keys(value).forEach(function (key) {
      if (BLOCKED_KEYS[key]) {
        delete value[key];
        stats.removed += 1;
        return;
      }
      clean(value[key], stats);
    });
  }

  try {
    if (!optionEnabled("enabled", true)) return $done({});

    var raw = ($response && $response.body) || "";
    if (!raw) return $done({});

    var prefixMatch = raw.match(/^\)\]\}'(?:\r?\n)?/);
    var prefix = prefixMatch ? prefixMatch[0] : "";
    var payload = JSON.parse(prefix ? raw.slice(prefix.length) : raw);
    var stats = { removed: 0 };
    clean(payload, stats);

    if (optionEnabled("debug", false)) {
      console.log("[YouTube Ultimate][player] removed=" + stats.removed);
    }

    if (stats.removed === 0) return $done({});
    return $done({ body: prefix + JSON.stringify(payload) });
  } catch (error) {
    if (optionEnabled("debug", false)) {
      console.log("[YouTube Ultimate][player] fail-open=" + error.message);
    }
    return $done({});
  }
})();
