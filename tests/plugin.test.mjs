import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginPath = path.join(root, "YouTubeSafariAdBlock.lpx");

test("plugin replaces the old Safari-Style entry with YouTube Ultimate metadata", async () => {
  const plugin = await readFile(pluginPath, "utf8");

  assert.match(plugin, /^#!name\s*=\s*YouTube Ultimate - Safari$/m);
  assert.match(plugin, /^#!author\s*=\s*Giu-zhao$/m);
  assert.match(plugin, /^#!system\s*=\s*macOS$/m);
  assert.match(plugin, /^#!homepage\s*=\s*https:\/\/github\.com\/Giu-zhao\/Loon_plugin$/m);
  assert.match(plugin, /^enabled\s*=\s*switch,true,/m);
  assert.match(plugin, /^page_enhance\s*=\s*switch,true,/m);
  assert.match(plugin, /^debug\s*=\s*switch,false,/m);
  assert.doesNotMatch(plugin, /Safari-Style AdBlock/);
});

test("plugin routes all designed YouTube endpoints to existing scripts", async () => {
  const plugin = await readFile(pluginPath, "utf8");

  assert.match(plugin, /youtubei\\\/v1\\\/player/);
  assert.match(plugin, /youtubei\\\/v1\\\/(?:browse\|search\|guide|\(browse\|search\|guide\))/);
  assert.match(plugin, /youtubei\\\/v1\\\/(?:next\|get_watch|\(next\|get_watch\))/);
  assert.match(plugin, /YouTubeUltimatePage\.js\?v=1\.0\.0/);

  const scriptMatches = [...plugin.matchAll(/script-path=https:\/\/raw\.githubusercontent\.com\/Giu-zhao\/Loon_plugin\/main\/([^?,\s]+)/g)];
  assert.equal(scriptMatches.length, 4);

  for (const match of scriptMatches) {
    await access(path.join(root, match[1]));
  }
});

test("plugin uses narrow ad rejection and does not intercept video CDN traffic", async () => {
  const plugin = await readFile(pluginPath, "utf8");
  const activeConfiguration = plugin
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("#"))
    .join("\n");

  assert.match(plugin, /api\\\/stats\\\/ads/);
  assert.match(plugin, /pagead\|ptracking/);
  assert.match(plugin, /adcontext/);
  assert.doesNotMatch(activeConfiguration, /DOMAIN-SUFFIX,\s*(?:doubleclick|googleadservices|googlesyndication|google-analytics)/i);
  assert.doesNotMatch(activeConfiguration, /googlevideo\.com/i);
  assert.doesNotMatch(activeConfiguration, /ytimg\.com/i);
});

test("plugin scopes QUIC fallback and MitM to YouTube page and API hosts", async () => {
  const plugin = await readFile(pluginPath, "utf8");

  assert.match(plugin, /AND,\(\(PROTOCOL,QUIC\),\(DOMAIN-SUFFIX,youtube\.com\)\),REJECT/);
  assert.match(plugin, /AND,\(\(PROTOCOL,QUIC\),\(DOMAIN,youtubei\.googleapis\.com\)\),REJECT/);
  assert.match(plugin, /^hostname\s*=.*youtube\.com.*www\.youtube\.com.*m\.youtube\.com.*s\.youtube\.com.*youtubei\.googleapis\.com/m);
});
