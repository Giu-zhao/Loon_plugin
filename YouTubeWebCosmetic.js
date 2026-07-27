(() => {
  try {
    const body = $response.body || "";
    if (!body || body.includes("loon-youtube-web-cosmetic")) return $done({});

    const injection = `
<style id="loon-youtube-web-cosmetic">
ytd-ad-slot-renderer,
ytd-display-ad-renderer,
ytd-promoted-video-renderer,
ytd-promoted-sparkles-web-renderer,
ytd-companion-slot-renderer,
ytd-player-legacy-desktop-watch-ads-renderer,
ytd-action-companion-ad-renderer,
tp-yt-paper-dialog:has(ytd-mealbar-promo-renderer),
#player-ads,
#masthead-ad,
.ytd-ad-slot-renderer,
.ytp-ad-overlay-container,
.ytp-ad-player-overlay,
.ytp-ad-image-overlay {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
</style>
<script>
(function () {
  if (window.__loonYouTubeWebCosmetic) return;
  window.__loonYouTubeWebCosmetic = true;

  const removeSelectors = [
    "ytd-ad-slot-renderer",
    "ytd-display-ad-renderer",
    "ytd-promoted-video-renderer",
    "ytd-promoted-sparkles-web-renderer",
    "ytd-companion-slot-renderer",
    "ytd-player-legacy-desktop-watch-ads-renderer",
    "ytd-action-companion-ad-renderer",
    "#player-ads",
    "#masthead-ad",
    ".ytp-ad-overlay-container",
    ".ytp-ad-player-overlay",
    ".ytp-ad-image-overlay"
  ];

  const skipSelectors = [
    ".ytp-ad-skip-button",
    ".ytp-ad-skip-button-modern",
    ".ytp-skip-ad-button",
    ".ytp-ad-overlay-close-button"
  ];

  function cleanYouTubeAds() {
    for (const selector of removeSelectors) {
      document.querySelectorAll(selector).forEach((element) => element.remove());
    }

    for (const selector of skipSelectors) {
      const button = document.querySelector(selector);
      if (button) button.click();
    }
  }

  new MutationObserver(cleanYouTubeAds).observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  cleanYouTubeAds();
  window.setInterval(cleanYouTubeAds, 1000);
})();
</script>`;

    if (/<\/head>/i.test(body)) {
      return $done({ body: body.replace(/<\/head>/i, injection + "\n</head>") });
    }

    $done({ body: injection + body });
  } catch (error) {
    console.log("YouTubeWebCosmetic error: " + error.message);
    $done({});
  }
})();
