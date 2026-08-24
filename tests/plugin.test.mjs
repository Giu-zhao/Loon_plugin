import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginPath = path.join(root, "YouTubeUltimate.lpx");

test("plugin has a new canonical URL so Loon does not reuse the legacy resource cache", async () => {
  await access(pluginPath);
  assert.notEqual(path.basename(pluginPath), "YouTubeSafariAdBlock.lpx");
});

test("plugin declares the supported systems and nine approved defaults", async () => {
  const plugin = await readFile(pluginPath, "utf8");

  assert.match(plugin, /^#!name\s*=\s*YouTube Ultimate$/m);
  assert.match(plugin, /^#!author\s*=\s*Giu-zhao$/m);
  assert.match(plugin, /^#!system\s*=\s*iOS,iPadOS,macOS$/m);
  assert.doesNotMatch(plugin, /tvOS/);
  assert.match(plugin, /^#!homepage\s*=\s*https:\/\/github\.com\/Giu-zhao\/Loon_plugin$/m);
  assert.match(plugin, /^enabled\s*=\s*switch,true,/m);
  assert.match(plugin, /^web_enhance\s*=\s*switch,true,/m);
  assert.match(plugin, /^app_enhance\s*=\s*switch,true,/m);
  assert.match(plugin, /^blockUpload\s*=\s*switch,false,/m);
  assert.match(plugin, /^blockShorts\s*=\s*switch,false,/m);
  assert.match(plugin, /^blockImmersive\s*=\s*switch,false,/m);
  assert.match(plugin, /^captionLang\s*=\s*select,zh-Hans,zh-Hant,ja,ko,en,off,/m);
  assert.match(plugin, /^lyricLang\s*=\s*select,zh-Hans,zh-Hant,ja,ko,en,off,/m);
  assert.match(plugin, /^debug\s*=\s*switch,false,/m);
  assert.equal((plugin.match(/^\w+\s*=\s*(?:switch|select),/gm) || []).length, 9);
});

test("plugin routes each response endpoint exactly once to repository-owned scripts", async () => {
  const plugin = await readFile(pluginPath, "utf8");
  const apiEndpoints = ['player', 'browse', 'next', 'search', 'reel/reel_watch_sequence', 'guide', 'account/get_setting', 'get_watch'];
  for (const endpoint of apiEndpoints) {
    const escaped = endpoint.replaceAll('/', '\\\/');
    const responseLines = plugin.split('\n').filter((line) => line.startsWith('http-response ') && line.includes(escaped));
    assert.equal(responseLines.length, 1, `${endpoint} must have one response handler`);
    assert.match(responseLines[0], /YouTubeUltimateAPI\.js\?v=2\.0\.0/);
  }
  assert.match(plugin, /YouTubeUltimatePage\.js\?v=2\.0\.0/);
  assert.doesNotMatch(plugin, /YouTubeUltimateAppRequest\.js/);

  for (const endpoint of ['config', 'log_event']) {
    const responseLines = plugin.split('\n').filter((line) => line.startsWith('http-response ') && line.includes(endpoint));
    assert.equal(responseLines.length, 1, `${endpoint} must have one safe Onesie handler`);
    assert.match(responseLines[0], /YouTubeUltimateAppOnesie\.js\?v=2\.0\.0/);
  }

  const scriptMatches = [...plugin.matchAll(/script-path=https:\/\/raw\.githubusercontent\.com\/Giu-zhao\/Loon_plugin\/main\/([^?,\s]+)/g)];
  for (const match of scriptMatches) {
    await access(path.join(root, match[1]));
    const script = await readFile(path.join(root, match[1]), 'utf8');
    assert.doesNotMatch(script, /maasea\.workers\.dev|raw\.githubusercontent\.com\/Maasea|kelee\.one/i);
  }
});

test("plugin uses only the exact initplayback ad marker and never rejects normal media", async () => {
  const plugin = await readFile(pluginPath, "utf8");
  const activeConfiguration = plugin
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("#"))
    .join("\n");

  assert.match(plugin, /initplayback.*\\&oad/);
  assert.doesNotMatch(activeConfiguration, /videoplayback.*reject/i);
  assert.doesNotMatch(activeConfiguration, /DOMAIN-SUFFIX,\s*googlevideo\.com\s*,\s*REJECT/i);
  assert.doesNotMatch(activeConfiguration, /DOMAIN-SUFFIX,\s*(?:doubleclick|googleadservices|googlesyndication|google-analytics)/i);
  assert.doesNotMatch(activeConfiguration, /ytimg\.com/i);
});

test("plugin scopes QUIC fallback and MitM to YouTube API and media hosts", async () => {
  const plugin = await readFile(pluginPath, "utf8");

  assert.match(plugin, /AND,\(\(PROTOCOL,QUIC\),\(DOMAIN-SUFFIX,youtube\.com\)\),REJECT/);
  assert.match(plugin, /AND,\(\(PROTOCOL,QUIC\),\(DOMAIN,youtubei\.googleapis\.com\)\),REJECT/);
  assert.match(plugin, /AND,\(\(PROTOCOL,QUIC\),\(DOMAIN-SUFFIX,googlevideo\.com\)\),REJECT/);
  assert.match(plugin, /^hostname\s*=.*youtube\.com.*youtubei\.googleapis\.com.*\*\.googlevideo\.com/m);
});
