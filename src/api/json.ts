const BLOCKED_RENDERERS = new Set([
  'adSlotRenderer',
  'displayAdRenderer',
  'videoDisplayAdRenderer',
  'promotedVideoRenderer',
  'compactPromotedVideoRenderer',
  'promotedSparklesWebRenderer',
  'promotedSparklesTextSearchRenderer',
  'searchPyvRenderer',
  'inFeedAdLayoutRenderer',
  'carouselAdRenderer',
  'mastheadAdRenderer',
  'actionCompanionAdRenderer',
  'companionAdRenderer',
]);

const PLAYER_FIELDS = new Set([
  'adPlacements',
  'adPlacementRenderer',
  'playerAds',
  'adSlots',
  'adBreakHeartbeatParams',
  'adBreakParams',
  'adBreakService',
  'adSignalsInfo',
]);

const BROWSE_FIELDS = new Set([
  'adPlacements',
  'playerAds',
  'adSlots',
  'adBreakHeartbeatParams',
  'adSignalsInfo',
]);

export type JsonResult = { changed: boolean, body: string, removed: number };

function clean(value: any, blocked: Set<string>, stats: { removed: number }): any {
  if (Array.isArray(value)) {
    const kept: any[] = [];
    for (const item of value) {
      if (item && typeof item === 'object' && !Array.isArray(item) &&
          Object.keys(item).some((key) => BLOCKED_RENDERERS.has(key))) {
        stats.removed += 1;
      } else {
        kept.push(clean(item, blocked, stats));
      }
    }
    return kept;
  }
  if (!value || typeof value !== 'object') return value;
  for (const key of Object.keys(value)) {
    if (blocked.has(key) || BLOCKED_RENDERERS.has(key)) {
      delete value[key];
      stats.removed += 1;
    } else {
      value[key] = clean(value[key], blocked, stats);
    }
  }
  return value;
}

export function cleanYouTubeJson(endpoint: string, raw: string): JsonResult {
  const match = raw.match(/^\)\]\}'(?:\r?\n)?/);
  const prefix = match?.[0] ?? '';
  const payload = JSON.parse(prefix ? raw.slice(prefix.length) : raw);
  const stats = { removed: 0 };
  const blocked = endpoint === 'browse' || endpoint === 'search' || endpoint === 'guide'
    ? BROWSE_FIELDS
    : PLAYER_FIELDS;
  const cleaned = clean(payload, blocked, stats);
  return {
    changed: stats.removed > 0,
    body: prefix + JSON.stringify(cleaned),
    removed: stats.removed,
  };
}
