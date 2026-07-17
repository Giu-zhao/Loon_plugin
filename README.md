# YouTube Web Remove Ads for Loon

Remove ads from YouTube web JSON API responses in Safari.

## Files

- `YouTubeWebRemoveAds.lpx`: Loon plugin.
- `YouTubeWebRemoveAds.js`: response body script.

## Usage

Add the plugin URL to Loon:

```ini
[Plugin]
https://raw.githubusercontent.com/Giu-zhao/Loon_plugin/main/YouTubeWebRemoveAds.lpx, enabled=true
```

The plugin enables MitM for:

```ini
www.youtube.com, m.youtube.com, youtubei.googleapis.com
```

Make sure Loon MitM is enabled and the Loon CA certificate is trusted on the device.
