# YouTube Web Remove Ads for Loon

Remove ads from YouTube web JSON API responses in Safari.

## Files

- `YouTubeWebRemoveAds.lpx`: Loon plugin.
- `YouTubeWebRemoveAds.js`: response body script.
- `YouTubeWebCosmetic.js`: injects lightweight cosmetic cleanup for YouTube web pages.

## Usage

Add the plugin URL to Loon after publishing this folder to GitHub:

```ini
[Plugin]
https://raw.githubusercontent.com/Giu-zhao/Loon_plugin/main/YouTubeWebRemoveAds.lpx, enabled=true
```

The plugin enables MitM for:

```ini
www.youtube.com, m.youtube.com, youtubei.googleapis.com
```

Make sure Loon MitM is enabled and the Loon CA certificate is trusted on the device.
