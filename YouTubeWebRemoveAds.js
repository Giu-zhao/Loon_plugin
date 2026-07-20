(() => {
  const DROP_KEYS = new Set([
    "adPlacements",
    "adPlacementRenderer",
    "playerAds",
    "adSlots",
    "adBreakHeartbeatParams",
    "adParams",
    "adSafetyReason",
    "adSignalsInfo",
    "paidContentOverlayRenderer",
    "promotionSupportedRenderers",
    "adEngagementPanels",
    "offerModule",
    "mealbarPromoRenderer",
    "merchandiseShelfRenderer",
    "clarificationRenderer",
    "statementBannerRenderer"
  ]);

  const DROP_RENDERERS = new Set([
    "adSlotRenderer",
    "displayAdRenderer",
    "videoDisplayAdRenderer",
    "promotedVideoRenderer",
    "compactPromotedVideoRenderer",
    "promotedSparklesWebRenderer",
    "promotedSparklesTextSearchRenderer",
    "searchPyvRenderer",
    "inFeedAdLayoutRenderer",
    "carouselAdRenderer",
    "mastheadAdRenderer",
    "bannerPromoRenderer",
    "feedNudgeRenderer",
    "upsellDialogRenderer",
    "premiumUpsellRenderer"
  ]);

  const AD_TEXT_RE = /\b(ad|ads|advertiser|advertisement|sponsored|promoted)\b/i;

  function isAdObject(obj) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
    const keys = Object.keys(obj);
    if (keys.some((key) => DROP_RENDERERS.has(key))) return true;

    const logging = obj.loggingDirectives || obj.trackingParams || obj.impressionEndpoints;
    if (logging && keys.some((key) => /ad|promoted|sponsored/i.test(key))) return true;

    const badge = JSON.stringify(obj.badges || obj.ownerBadges || obj.metadataBadgeRenderer || "");
    if (badge && AD_TEXT_RE.test(badge)) return true;

    const command = JSON.stringify(obj.commandMetadata || obj.urlEndpoint || obj.navigationEndpoint || "");
    if (command && /googleads|doubleclick|pagead|adservice|adurl/i.test(command)) return true;

    return false;
  }

  function scrub(value) {
    if (Array.isArray(value)) {
      const next = [];
      for (const item of value) {
        const cleaned = scrub(item);
        if (cleaned !== undefined) next.push(cleaned);
      }
      return next;
    }

    if (!value || typeof value !== "object") return value;
    if (isAdObject(value)) return undefined;

    for (const key of Object.keys(value)) {
      if (DROP_KEYS.has(key) || DROP_RENDERERS.has(key)) {
        delete value[key];
        continue;
      }

      const cleaned = scrub(value[key]);
      if (cleaned === undefined) {
        delete value[key];
      } else {
        value[key] = cleaned;
      }
    }

    return value;
  }

  function removePlayerAds(root) {
    if (!root || typeof root !== "object") return root;

    delete root.adPlacements;
    delete root.playerAds;
    delete root.adSlots;
    delete root.adBreakHeartbeatParams;
    delete root.adSignalsInfo;

    if (root.responseContext) {
      delete root.responseContext.adSignalsInfo;
    }

    if (root.playbackTracking) {
      for (const key of Object.keys(root.playbackTracking)) {
        if (/ad|atr|ptracking/i.test(key)) delete root.playbackTracking[key];
      }
    }

    return root;
  }

  try {
    const raw = $response.body || "";
    if (!raw) return $done({});

    const jsonPrefix = raw.startsWith(")]}'") ? ")]}'\n" : "";
    const body = jsonPrefix ? raw.slice(jsonPrefix.length) : raw;
    const payload = JSON.parse(body);
    const requestUrl = typeof $request !== "undefined" && $request.url ? $request.url : "";
    const isNextResponse = /\/youtubei\/v1\/next(?:[/?]|$)/.test(requestUrl);

    removePlayerAds(payload);
    if (!isNextResponse) scrub(payload);

    $done({
      body: jsonPrefix + JSON.stringify(payload)
    });
  } catch (error) {
    console.log("YouTubeWebRemoveAds error: " + error.message);
    $done({});
  }
})();
