(() => {
  try {
    const headers = $response.headers || {};
    const contentType = String(headers["Content-Type"] || headers["content-type"] || "");
    const body = $response.body || "";

    if (!body || !/text\/html/i.test(contentType) || body.includes("loon-youtube-safari-ad-skipper")) {
      return $done({});
    }

    const injection = `
<script id="loon-youtube-safari-ad-skipper">
(function () {
  if (window.__loonYouTubeSafariAdSkipper) return;
  window.__loonYouTubeSafariAdSkipper = true;

  const skipSelectors = [
    ".ytp-ad-skip-button",
    ".ytp-ad-skip-button-modern",
    ".ytp-skip-ad-button",
    ".ytp-ad-overlay-close-button",
    "button.ytp-ad-skip-button",
    "button.ytp-skip-ad-button"
  ];

  const hideSelectors = [
    ".ytp-ad-overlay-container",
    ".ytp-ad-player-overlay",
    ".ytp-ad-image-overlay",
    ".video-ads",
    "#player-ads",
    "ytd-action-companion-ad-renderer",
    "ytd-companion-slot-renderer",
    "ytd-display-ad-renderer"
  ];

  let originalMuted = null;
  let originalRate = null;

  function isAdShowing() {
    return !!document.querySelector(".html5-video-player.ad-showing, .html5-video-player.ad-interrupting");
  }

  function clickSkips() {
    for (const selector of skipSelectors) {
      document.querySelectorAll(selector).forEach((button) => {
        if (!button.disabled) button.click();
      });
    }
  }

  function hideAdChrome() {
    for (const selector of hideSelectors) {
      document.querySelectorAll(selector).forEach((element) => {
        element.style.setProperty("display", "none", "important");
        element.style.setProperty("visibility", "hidden", "important");
        element.style.setProperty("pointer-events", "none", "important");
      });
    }
  }

  function tuneAdPlayback() {
    const video = document.querySelector("video");
    if (!video) return;

    if (isAdShowing()) {
      if (originalMuted === null) originalMuted = video.muted;
      if (originalRate === null) originalRate = video.playbackRate || 1;
      video.muted = true;
      if (video.playbackRate < 8) video.playbackRate = 8;
      return;
    }

    if (originalMuted !== null) {
      video.muted = originalMuted;
      originalMuted = null;
    }
    if (originalRate !== null) {
      video.playbackRate = originalRate;
      originalRate = null;
    }
  }

  function run() {
    clickSkips();
    hideAdChrome();
    tuneAdPlayback();
  }

  new MutationObserver(run).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style"]
  });

  window.addEventListener("yt-navigate-finish", run, true);
  window.addEventListener("load", run, true);
  run();
  window.setInterval(run, 250);
})();
</script>`;

    if (/<\/body>/i.test(body)) {
      return $done({ body: body.replace(/<\/body>/i, injection + "\n</body>") });
    }
    if (/<\/head>/i.test(body)) {
      return $done({ body: body.replace(/<\/head>/i, injection + "\n</head>") });
    }

    $done({ body: body + injection });
  } catch (error) {
    console.log("YouTubeSafariAdSkipper error: " + error.message);
    $done({});
  }
})();
