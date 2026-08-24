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

const CAPTION_NAMES: Record<string, string> = {
  'zh-Hans': '中文（简体）', 'zh-Hant': '中文（繁體）', ja: '日本語', ko: '한국어', en: 'English',
};

function enableTranslatedCaptions(value: any, target: string): boolean {
  if (!value || typeof value !== 'object') return false;
  let changed = false;
  if (value.playerCaptionsTracklistRenderer) {
    const list = value.playerCaptionsTracklistRenderer;
    const tracks = list.captionTracks;
    if (Array.isArray(tracks) && tracks.length > 0) {
      for (const track of tracks) track.isTranslatable = true;
      let targetIndex = tracks.findIndex((track) => track.languageCode === target);
      if (targetIndex < 0) {
        let sourceIndex = tracks.findIndex((track) => track.languageCode === 'en');
        if (sourceIndex < 0) sourceIndex = tracks.findIndex((track) => track.kind === 'asr');
        if (sourceIndex < 0) sourceIndex = 0;
        const source = tracks[sourceIndex];
        const separator = String(source.baseUrl).includes('?') ? '&' : '?';
        const translated = {
          ...source,
          baseUrl: `${source.baseUrl}${separator}tlang=${encodeURIComponent(target)}`,
          name: { simpleText: CAPTION_NAMES[target] ?? target },
          vssId: `.${target}`,
          languageCode: target,
          isTranslatable: true,
        };
        delete translated.kind;
        tracks.push(translated);
        targetIndex = tracks.length - 1;
      }
      list.defaultCaptionTrackIndex = targetIndex;
      if (Array.isArray(list.audioTracks)) {
        for (const audio of list.audioTracks) {
          if (!Array.isArray(audio.captionTrackIndices)) audio.captionTrackIndices = [];
          if (!audio.captionTrackIndices.includes(targetIndex)) audio.captionTrackIndices.push(targetIndex);
          audio.defaultCaptionTrackIndex = targetIndex;
          audio.hasDefaultTrack = true;
          audio.captionsInitialState = 'CAPTIONS_INITIAL_STATE_ON_RECOMMENDED';
        }
      }
      const languages = Array.isArray(list.translationLanguages) ? list.translationLanguages : [];
      if (!languages.some((language) => language.languageCode === target)) {
        languages.push({ languageCode: target, languageName: { simpleText: CAPTION_NAMES[target] ?? target } });
      }
      list.translationLanguages = languages;
      changed = true;
    }
  }
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') changed = enableTranslatedCaptions(child, target) || changed;
  }
  return changed;
}

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

export function cleanYouTubeJson(endpoint: string, raw: string, captionLang = 'off'): JsonResult {
  const match = raw.match(/^\)\]\}'(?:\r?\n)?/);
  const prefix = match?.[0] ?? '';
  const payload = JSON.parse(prefix ? raw.slice(prefix.length) : raw);
  const stats = { removed: 0 };
  const blocked = endpoint === 'browse' || endpoint === 'search' || endpoint === 'guide'
    ? BROWSE_FIELDS
    : PLAYER_FIELDS;
  const cleaned = clean(payload, blocked, stats);
  const captionsChanged = endpoint === 'player' && captionLang !== 'off'
    ? enableTranslatedCaptions(cleaned, captionLang)
    : false;
  return {
    changed: stats.removed > 0 || captionsChanged,
    body: prefix + JSON.stringify(cleaned),
    removed: stats.removed,
  };
}
