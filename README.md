# Loon YouTube Plugins

Stable YouTube/Safari-style ad blocking rules for Loon.

## Recommended plugin

Use the conservative rule-only plugin first:

```ini
[Plugin]
https://raw.githubusercontent.com/Giu-zhao/Loon_plugin/main/YouTubeSafariAdBlock.lpx, enabled=true
```

This plugin does not inject scripts, does not rewrite YouTube player APIs, and does not block `googlevideo.com`, so playback should remain stable.

## Files

- `YouTubeSafariAdBlock.lpx`: conservative rule-only YouTube/Safari-style ad blocking.
- `YouTubeWebRemoveAds.lpx`: disabled legacy experiment kept for reference.
- `YouTubeWebRemoveAds.js`: legacy response body script.
- `YouTubeWebCosmetic.js`: legacy cosmetic script.

## Notes

The stable plugin only blocks known Google/YouTube advertising domains. It may not remove every video ad, but it avoids the black-screen and player-error problems caused by rewriting YouTube pages or player responses.
