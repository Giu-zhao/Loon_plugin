(() => {
  try {
    console.log("YouTubeGoogleVideoInitPlayback blocked: " + $request.url);
    $done({
      response: {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store"
        },
        body: ""
      }
    });
  } catch (error) {
    console.log("YouTubeGoogleVideoInitPlayback error: " + error.message);
    $done({});
  }
})();
