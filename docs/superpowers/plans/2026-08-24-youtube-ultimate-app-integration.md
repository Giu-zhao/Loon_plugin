# YouTube Ultimate App Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已验证的 Safari 网页去广告与 YouTube/YouTube Music App 的广告清理、画中画、后台播放、字幕/歌词翻译和导航按钮开关合并到用户自有 GitHub 的一个 Loon 插件中。

**Architecture:** `YouTubeUltimate.lpx` 保持唯一入口。`YouTubeUltimateAPI.js` 根据响应类型把 JSON 交给网页净化器、把 Protobuf 交给 App 处理器；页面 HTML 继续由已验证的 `YouTubeUltimatePage.js` 处理，App 的 Onesie 请求与配置端点使用固定版本、存放在本仓库的 Maasea 构建产物。所有处理器失败时原样放行，发布后再备份并直接修改 Loon 的 `default.lcf`。

**Tech Stack:** Loon Plugin/JavaScript、TypeScript、`@bufbuild/protobuf` 1.7.2、esbuild 0.16.17、Node.js 18+ 内置测试运行器、Git/GitHub Raw。

---

## 文件结构

### 新建

- `src/api/index.ts`：先作为确定性构建入口创建，再扩展为 JSON/Protobuf 响应分流和唯一 `$done` 出口。
- `src/api/json.ts`：复用当前 Safari player/browse/next JSON 清理规则。
- `src/app/index.ts`：App Protobuf 响应入口。
- `src/app/src/youtube.ts`：App 参数、持久化广告字段缓存、隐私安全日志和失败放行。
- `src/app/src/response.ts`：player、browse、next、search、Shorts、guide、setting、watch 处理器。
- `src/app/lib/client.ts`：Loon/Surge/Quantumult X 运行时适配，项目只发布 Loon 配置。
- `src/app/lib/factory.ts`：端点到 Protobuf 消息类映射。
- `src/app/lib/env.ts`：运行时单例。
- `src/app/lib/googleTranslate.ts`：歌词翻译 URL 与响应处理。
- `src/app/lib/text-polyfill.mjs`：`TextEncoder`/`TextDecoder` 兼容注入。
- `src/app/lib/protobuf/**/*.js`、`src/app/lib/protobuf/**/*.d.ts`：固定提交的生成代码。
- `src/app/protobuf/**/*.proto`：可审计的 Protobuf 定义。
- `scripts/build-app.mjs`：生成稳定、无时间戳的 `YouTubeUltimateAPI.js`。
- `YouTubeUltimateAPI.js`：网页 JSON 与 App Protobuf 的合并响应脚本。
- `YouTubeUltimateAppRequest.js`：App Onesie 请求处理脚本，本仓库本地副本。
- `YouTubeUltimateAppOnesie.js`：`config`/`log_event` 响应处理脚本，本仓库本地副本。
- `vendor/maasea/LICENSE`：Apache-2.0 许可证副本。
- `vendor/maasea/UPSTREAM.md`：上游提交、文件哈希和修改说明。
- `tests/helpers/run-loon-binary-script.mjs`：二进制 Body、持久化存储和异步请求测试环境。
- `tests/helpers/app-fixtures.mjs`：人工构造且不含用户数据的 Protobuf 夹具。
- `tests/fixtures/binary-echo.js`：二进制测试环境的最小回显脚本。
- `tests/api-dispatch.test.mjs`：JSON/Protobuf 分流及只调用一次 `$done`。
- `tests/app-player.test.mjs`：广告、画中画、后台播放与字幕翻译。
- `tests/app-feed.test.mjs`：browse/search/next/Shorts 广告清理。
- `tests/app-ui.test.mjs`：上传、Shorts、选段、升级、设置开关。
- `tests/app-lyrics.test.mjs`：普通歌词、逐行歌词、原语言和翻译失败。
- `tests/vendor.test.mjs`：固定提交、许可证、哈希与本地依赖检查。
- `THIRD_PARTY_NOTICES.md`：第三方来源和许可证说明。

### 修改

- `package.json`、`package-lock.json`：固定构建依赖和新增构建/校验命令。
- `YouTubeUltimate.lpx`：更名为全系统入口，加入 App 参数、二进制脚本、精确广告请求拒绝、QUIC 与 MitM 范围。
- `tests/helpers/run-loon-script.mjs`：默认参数改为合并后的参数名。
- `tests/plugin.test.mjs`：校验系统范围、参数、端点、本地 Raw 地址和 `googlevideo` 边界。
- `YouTubeUltimatePage.js`、`tests/page.test.mjs`：把页面增强参数从 `page_enhance` 同步改为 `web_enhance`，页面逻辑不变。
- `README.md`：全系统安装、参数、隐私、实机验收和回退说明。
- `CHANGELOG.md`：记录 2.0.0 合并版本。
- `/Users/peaceg/Library/Mobile Documents/iCloud~com~ruikq~decar/Documents/Configs/default.lcf`：发布并核验 GitHub 后，直接加入 App 规则/脚本/MitM，保留其他配置不变。

### 保留作回退，不删除

- `YouTubeUltimatePlayer.js`
- `YouTubeUltimateBrowse.js`
- `YouTubeUltimateNext.js`
- `YouTubeUltimatePage.js`
- `YouTubeSafariAdBlock.lpx`

---

### Task 1: 固定上游代码、许可证和来源证据

**Files:**
- Create: `tests/vendor.test.mjs`
- Create: `vendor/maasea/LICENSE`
- Create: `vendor/maasea/UPSTREAM.md`
- Create: `src/app/` 下的 Maasea 历史源码、生成代码和 Protobuf 定义
- Create: `YouTubeUltimateAppRequest.js`
- Create: `YouTubeUltimateAppOnesie.js`

- [ ] **Step 1: 编写失败的来源完整性测试**

```js
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function sha256(file) {
  const body = await readFile(new URL(`../${file}`, import.meta.url));
  return createHash("sha256").update(body).digest("hex");
}

test("vendored Maasea assets are pinned and local", async () => {
  await access(new URL("../vendor/maasea/LICENSE", import.meta.url));
  const notice = await readFile(new URL("../vendor/maasea/UPSTREAM.md", import.meta.url), "utf8");
  assert.match(notice, /65075cdb388fc5e3094afd7e7314c67b243f3525/);
  assert.match(notice, /e5d66ffc39b71e499c6e9b24ef13d44598f2c86f/);
  assert.equal(await sha256("YouTubeUltimateAppRequest.js"), "3ecca15e06e76a31720092c581180f648ef2c45e494644941ba985c878efbb26");
  assert.equal(await sha256("YouTubeUltimateAppOnesie.js"), "f98483d5f5017514f82502253c0db5ce2d4ffb7839887aa2cadc22666f5a7f12");
});
```

- [ ] **Step 2: 运行测试并确认缺少本地文件**

Run: `node --test tests/vendor.test.mjs`

Expected: FAIL，错误指向 `vendor/maasea/LICENSE` 或两个根目录 App 脚本不存在。

- [ ] **Step 3: 从两个固定提交导入真实文件**

```bash
upstream_dir=$(mktemp -d /tmp/ytul-maasea.XXXXXX)
git clone --filter=blob:none https://github.com/Maasea/sgmodule.git "$upstream_dir/sgmodule"
git -C "$upstream_dir/sgmodule" fetch origin 65075cdb388fc5e3094afd7e7314c67b243f3525 e5d66ffc39b71e499c6e9b24ef13d44598f2c86f
git -C "$upstream_dir/sgmodule" archive e5d66ffc39b71e499c6e9b24ef13d44598f2c86f Script/Youtube | tar -x -C "$upstream_dir"
```

将 `$upstream_dir/Script/Youtube/` 中的可编辑源码机械复制到 `src/app/`：

```bash
mkdir -p src/app vendor/maasea "$upstream_dir/current"
cp "$upstream_dir/Script/Youtube/index.ts" src/app/index.ts
cp "$upstream_dir/Script/Youtube/tsconfig.json" "$upstream_dir/Script/Youtube/buf.gen.yaml" src/app/
cp -R "$upstream_dir/Script/Youtube/lib" "$upstream_dir/Script/Youtube/src" "$upstream_dir/Script/Youtube/protobuf" "$upstream_dir/Script/Youtube/types" src/app/
git -C "$upstream_dir/sgmodule" archive 65075cdb388fc5e3094afd7e7314c67b243f3525 LICENSE Script/Youtube/youtube.request.js Script/Youtube/youtube.response.js | tar -x -C "$upstream_dir/current"
cp "$upstream_dir/current/LICENSE" vendor/maasea/LICENSE
cp "$upstream_dir/current/Script/Youtube/youtube.request.js" YouTubeUltimateAppRequest.js
cp "$upstream_dir/current/Script/Youtube/youtube.response.js" YouTubeUltimateAppOnesie.js
```

对应关系为：

```text
65075cdb...:LICENSE                              -> vendor/maasea/LICENSE
65075cdb...:Script/Youtube/youtube.request.js   -> YouTubeUltimateAppRequest.js
65075cdb...:Script/Youtube/youtube.response.js  -> YouTubeUltimateAppOnesie.js
```

`vendor/maasea/UPSTREAM.md` 写入以下完整内容：

```markdown
# Maasea upstream record

- Repository: https://github.com/Maasea/sgmodule
- License: Apache-2.0; local copy: `LICENSE`
- Current behavior baseline: `65075cdb388fc5e3094afd7e7314c67b243f3525` (2026-07-19)
- Editable YouTube source baseline: `e5d66ffc39b71e499c6e9b24ef13d44598f2c86f` (2024-11-24)
- `YouTubeUltimateAppRequest.js` SHA-256: `3ecca15e06e76a31720092c581180f648ef2c45e494644941ba985c878efbb26`
- `YouTubeUltimateAppOnesie.js` SHA-256: `f98483d5f5017514f82502253c0db5ce2d4ffb7839887aa2cadc22666f5a7f12`

Local modifications are built in `YouTubeUltimateAPI.js`: Loon argument defaults, JSON/Protobuf dispatch, preserving Shorts unless requested, button switches, fail-open handling, private debug logging, and restored YouTube Music lyric translation. No runtime URL points to Maasea or kelee.one.
```

- [ ] **Step 4: 验证哈希和许可证**

Run: `node --test tests/vendor.test.mjs`

Expected: PASS；两个固定产物哈希完全一致，许可证和提交号存在。

- [ ] **Step 5: 提交来源基线**

```bash
git add src/app vendor/maasea YouTubeUltimateAppRequest.js YouTubeUltimateAppOnesie.js tests/vendor.test.mjs
git commit -m "chore: vendor pinned YouTube app sources"
```

### Task 2: 建立确定性 App 构建

**Files:**
- Create: `scripts/build-app.mjs`
- Create: `src/api/index.ts`
- Modify: `package.json`
- Create: `package-lock.json`
- Create: `YouTubeUltimateAPI.js`
- Test: `tests/vendor.test.mjs`

- [ ] **Step 1: 增加失败的可重复构建断言**

在 `tests/vendor.test.mjs` 增加：

```js
test("generated API bundle has a stable banner and no build timestamp", async () => {
  const bundle = await readFile(new URL("../YouTubeUltimateAPI.js", import.meta.url), "utf8");
  assert.match(bundle, /^\/\* YouTube Ultimate API 2\.0\.0 \*\//);
  assert.doesNotMatch(bundle, /Build:\s*\d{4}|toLocaleString/);
});
```

- [ ] **Step 2: 运行测试确认产物尚未生成**

Run: `node --test tests/vendor.test.mjs`

Expected: FAIL，提示 `YouTubeUltimateAPI.js` 不存在。

- [ ] **Step 3: 创建确定性构建脚本**

先创建初始入口 `src/api/index.ts`，让本任务能够构建历史 App 源码；Task 4 会在测试保护下把它替换为完整分流器：

```ts
import "../app/index";
```

```js
import { build } from "esbuild";

await build({
  entryPoints: ["src/api/index.ts"],
  bundle: true,
  minify: true,
  platform: "browser",
  target: ["es2020"],
  inject: ["src/app/lib/text-polyfill.mjs"],
  banner: { js: "/* YouTube Ultimate API 2.0.0 */" },
  legalComments: "none",
  sourcemap: false,
  outfile: "YouTubeUltimateAPI.js"
});
```

将根 `package.json` 改为以下脚本和固定依赖；保留原有名称、私有标记和 ESM 类型：

```json
{
  "name": "youtube-ultimate-loon",
  "version": "2.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node scripts/build-app.mjs",
    "test": "node --test tests/*.test.mjs",
    "check": "npm run build && node --check YouTubeUltimateAPI.js && node --check YouTubeUltimateAppRequest.js && node --check YouTubeUltimateAppOnesie.js && node --check YouTubeUltimatePage.js",
    "verify:build": "npm run build && shasum -a 256 YouTubeUltimateAPI.js"
  },
  "dependencies": {
    "@bufbuild/protobuf": "1.7.2"
  },
  "devDependencies": {
    "esbuild": "0.16.17",
    "typescript": "4.9.4"
  }
}
```

- [ ] **Step 4: 安装固定依赖并生成锁文件**

Run: `npm install`

Expected: exit 0，并生成 `package-lock.json`；`npm ls --depth=0` 显示上述三个固定版本。

- [ ] **Step 5: 构建两次并比较哈希**

Run: `npm run build && first_hash=$(shasum -a 256 YouTubeUltimateAPI.js | awk '{print $1}') && npm run build && second_hash=$(shasum -a 256 YouTubeUltimateAPI.js | awk '{print $1}') && test "$first_hash" = "$second_hash"`

Expected: exit 0，两个哈希一致。

- [ ] **Step 6: 提交构建系统**

```bash
git add package.json package-lock.json scripts/build-app.mjs src/api/index.ts YouTubeUltimateAPI.js tests/vendor.test.mjs
git commit -m "build: add deterministic YouTube API bundle"
```

### Task 3: 扩展 Loon 二进制测试环境

**Files:**
- Create: `tests/helpers/run-loon-binary-script.mjs`
- Create: `tests/helpers/app-fixtures.mjs`
- Test: `tests/api-dispatch.test.mjs`

- [ ] **Step 1: 编写二进制环境契约测试**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { runLoonBinaryScript } from "./helpers/run-loon-binary-script.mjs";

test("binary harness returns bytes and calls done once", async () => {
  const input = new Uint8Array([8, 1]);
  const run = await runLoonBinaryScript("tests/fixtures/binary-echo.js", { bodyBytes: input });
  assert.equal(run.doneCalls, 1);
  assert.deepEqual(run.result.bodyBytes, input);
});
```

`tests/fixtures/binary-echo.js` 的完整内容：

```js
$done({ bodyBytes: $response.bodyBytes });
```

- [ ] **Step 2: 运行测试确认帮助器缺失**

Run: `node --test tests/api-dispatch.test.mjs`

Expected: FAIL，提示无法导入 `run-loon-binary-script.mjs`。

- [ ] **Step 3: 实现异步 Loon 测试环境**

`runLoonBinaryScript` 必须提供 `$argument`、`$request.bodyBytes`、`$response.bodyBytes`、`$persistentStore`、`$httpClient`、`setTimeout`、`TextEncoder`、`TextDecoder`、`console.log` 和只允许一次的 `$done`。默认参数为：

```js
export const DEFAULT_ARGUMENT = {
  enabled: true,
  web_enhance: true,
  app_enhance: true,
  blockUpload: false,
  blockShorts: false,
  blockImmersive: false,
  captionLang: "zh-Hans",
  lyricLang: "zh-Hans",
  debug: false
};
```

`$httpClient.get` 使用测试传入的 `fetchResponse`，未提供时返回 `{ status: 503, body: "" }`；等待 `$done` 的上限为 2 秒；第二次调用 `$done` 立即使测试失败。

- [ ] **Step 4: 增加无用户数据的 Protobuf 夹具构造器**

`tests/helpers/app-fixtures.mjs` 导出 `encodePlayerFixture`、`encodeBrowseFixture`、`encodeGuideFixture`、`encodeSettingFixture`、`encodeWatchFixture` 和 `addUnknownPageAdField`。未知广告字段使用 `TextEncoder` 生成至少 1001 字节、包含 `pagead` 的内容；正常未知字段使用相同长度但不含该标记。

- [ ] **Step 5: 运行契约测试**

Run: `node --test tests/api-dispatch.test.mjs`

Expected: PASS，`doneCalls` 严格等于 1。

- [ ] **Step 6: 提交测试基础设施**

```bash
git add tests/helpers tests/fixtures tests/api-dispatch.test.mjs
git commit -m "test: add Loon binary script harness"
```

### Task 4: 实现 JSON/Protobuf 单入口分流与失败放行

**Files:**
- Modify: `src/api/index.ts`
- Create: `src/api/json.ts`
- Modify: `src/app/index.ts`
- Modify: `src/app/src/youtube.ts`
- Test: `tests/api-dispatch.test.mjs`

- [ ] **Step 1: 编写分流失败测试**

覆盖四个输入：`application/json` 字符串、JSON `bodyBytes`、Protobuf `bodyBytes`、非法 Body。每个用例断言 `$done` 只调用一次；非法 Body 返回 `{}`；JSON 中 `adPlacements` 被删除；Protobuf 路由返回 `bodyBytes`。

- [ ] **Step 2: 运行测试确认当前 bundle 不支持分流**

Run: `node --test tests/api-dispatch.test.mjs`

Expected: FAIL，JSON 与 Protobuf 至少一类未被正确处理。

- [ ] **Step 3: 提取网页 JSON 清理函数**

`src/api/json.ts` 导出：

```ts
export type JsonResult = { changed: boolean; body: string; removed: number };

export function cleanYouTubeJson(endpoint: string, raw: string): JsonResult;
```

实现必须逐项迁移 `YouTubeUltimatePlayer.js`、`YouTubeUltimateBrowse.js` 和 `YouTubeUltimateNext.js` 的完整阻断字段集合，保留 anti-XSSI 前缀；不按标题、trackingParams 或普通文本中的“ad”模糊删除。

- [ ] **Step 4: 实现唯一分流出口**

`src/api/index.ts` 使用以下判定顺序：

```ts
function isJson(contentType: string, bytes: Uint8Array, body?: string): boolean {
  if (/\b(?:application\/json|text\/json)\b/i.test(contentType)) return true;
  const first = (body ?? new TextDecoder().decode(bytes.subarray(0, 16))).trimStart();
  return first.startsWith("{") || first.startsWith("[") || first.startsWith(")]}'");
}
```

总开关关闭时 `$done({})`；JSON 调用 `cleanYouTubeJson`；其余 Body 只在 `app_enhance=true` 时调用 `handleAppResponse`。最外层 `try/catch` 只记录 `endpoint` 和 `fail-open`，绝不记录 Body，并保证只调用一次 `$done`。

`src/app/index.ts` 不再自行调用 `$done`，而是导出以下接口：

```ts
export type AppResponseResult = {
  changed: boolean;
  bodyBytes?: Uint8Array;
};

export async function handleAppResponse(
  url: string,
  bodyBytes: Uint8Array
): Promise<AppResponseResult>;
```

`changed=false` 表示原样放行；`changed=true` 必须包含编码后的 `bodyBytes`。`YouTubeMessage.done()` 改为返回上述结果，持久化保存仍在返回前完成；只有 `src/api/index.ts` 能调用全局 `$done`。

- [ ] **Step 5: 修正 App 默认参数和关闭逻辑**

`src/app/src/youtube.ts` 的默认参数固定为设计文档中的九项；参数解码同时接受 Loon 插件传入的对象和直接配置传入的 `key=value&key=value` 字符串；`enabled=false` 或 `app_enhance=false` 时不解码、不写持久化数据。缓存键改为 `YTUL.App.AdvertiseInfo.v2`，避免覆盖旧插件状态。

- [ ] **Step 6: 构建并运行分流测试和原网页测试**

Run: `npm run build && node --test tests/api-dispatch.test.mjs tests/player.test.mjs tests/browse.test.mjs tests/next.test.mjs`

Expected: 全部 PASS；网页原有播放数据和正常推荐仍被保留。

- [ ] **Step 7: 提交分流器**

```bash
git add src/api src/app/index.ts src/app/src/youtube.ts YouTubeUltimateAPI.js tests/api-dispatch.test.mjs
git commit -m "feat: dispatch YouTube JSON and protobuf responses"
```

### Task 5: 完成 App player、画中画、后台播放和字幕翻译

**Files:**
- Modify: `src/app/src/response.ts`
- Test: `tests/app-player.test.mjs`

- [ ] **Step 1: 编写 player 失败测试**

构造包含 `adPlacements`、`adSlots`、`pageadViewthroughconversion`、正常格式和字幕轨道的 Player。断言广告字段清空，格式与视频标识不变，mini player active、background player active，目标字幕 `zh-Hans` 存在且被设为默认；`captionLang=off` 不新增字幕。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run build && node --test tests/app-player.test.mjs`

Expected: FAIL，至少一个 App player 能力未满足。

- [ ] **Step 3: 实现最小 player 修改**

`PlayerMessage.pure()` 只执行以下变更；固定提交中的 player Protobuf 已包含这些字段，不重新生成或猜测额外字段：

```ts
this.message.adPlacements.length = 0;
this.message.adSlots.length = 0;
delete this.message?.playbackTracking?.pageadViewthroughconversion;
this.enableMiniPlayer();
this.enableBackgroundPlayer();
this.addTranslateCaption();
this.needProcess = true;
```

字幕没有任何轨道时直接返回；目标语言已存在时复用；否则以优先级“目标语言 > 英语 > 第一条轨道”创建 `&tlang=<目标语言>`；不得改写格式 URL、账号状态和版权限制。

- [ ] **Step 4: 运行 player 测试与构建检查**

Run: `npm run build && node --test tests/app-player.test.mjs && node --check YouTubeUltimateAPI.js`

Expected: PASS，生成脚本语法有效。

- [ ] **Step 5: 提交 player 能力**

```bash
git add src/app tests/app-player.test.mjs YouTubeUltimateAPI.js
git commit -m "feat: add YouTube app playback enhancements"
```

### Task 6: 完成 App 信息流、搜索、推荐和 Shorts 广告清理

**Files:**
- Modify: `src/app/src/response.ts`
- Modify: `src/app/src/youtube.ts`
- Test: `tests/app-feed.test.mjs`

- [ ] **Step 1: 编写信息流失败测试**

分别编码 browse、search、next 和 `reel_watch_sequence`：每个包含一条明确 `pagead` 未知字段和一条正常视频。断言只删除广告；`blockShorts=false` 保留正常 Shorts shelf；`blockShorts=true` 删除 Shorts shelf；Shorts 序列中没有 overlay 的广告 entry 被移除。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run build && node --test tests/app-feed.test.mjs`

Expected: FAIL，历史实现会无条件删除 Shorts shelf 或未覆盖全部端点。

- [ ] **Step 3: 修复广告识别和 Shorts 开关**

未知字段必须同时满足“长度至少 1000 字节”和“解码文本包含 `pagead`”才加入黑名单；其他字段号加入白名单。`removeShorts` 仅在 `this.argument.blockShorts === true` 时删除 shelf。正常 Shorts 内容不因 `shorts` 字样被误删。

- [ ] **Step 4: 验证缓存隔离和失败放行**

增加用例：损坏 Protobuf 返回 `{}`；广告缓存仅保存字段号与 EML 名称，不保存原始字节；debug 日志不包含夹具中的私密标记字符串。

- [ ] **Step 5: 运行测试**

Run: `npm run build && node --test tests/app-feed.test.mjs tests/api-dispatch.test.mjs`

Expected: PASS，且每个脚本调用只产生一个 `$done`。

- [ ] **Step 6: 提交信息流处理**

```bash
git add src/app/src tests/app-feed.test.mjs YouTubeUltimateAPI.js
git commit -m "feat: clean YouTube app feeds and Shorts ads"
```

### Task 7: 完成导航按钮、升级入口、设置和 get_watch

**Files:**
- Modify: `src/app/lib/factory.ts`
- Modify: `src/app/src/response.ts`
- Test: `tests/app-ui.test.mjs`

- [ ] **Step 1: 编写 UI 参数失败测试**

Guide 夹具包含 `SPunlimited`、`FEuploads`、`FEshorts`、`FEmusic_immersive` 和一个普通入口。断言升级入口始终删除；三个参数分别只控制对应入口；默认三个开关为 false。Setting 夹具断言加入 PIP 与后台播放项，但不新增下载、智能下载或其他付费权益；Watch 夹具断言嵌套 player/next 均被处理。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run build && node --test tests/app-ui.test.mjs`

Expected: FAIL，`blockShorts` 导航处理尚未实现。

- [ ] **Step 3: 实现精确导航列表**

```ts
const blocked = new Set(["SPunlimited"]);
if (this.argument.blockUpload) blocked.add("FEuploads");
if (this.argument.blockShorts) blocked.add("FEshorts");
if (this.argument.blockImmersive) blocked.add("FEmusic_immersive");
```

只根据 `browseId` 删除匹配项；保留普通入口。Setting 添加项前先查重，避免重复脚本执行生成重复设置；后台播放对象只设置 `backgroundPlayback: true`，不设置 `download`、`downloadQualitySelection` 或 `smartDownload`。Watch 把嵌套 player 和 next 的 `needProcess` 汇总到父消息。

- [ ] **Step 4: 运行 UI 与 player/feed 回归测试**

Run: `npm run build && node --test tests/app-ui.test.mjs tests/app-player.test.mjs tests/app-feed.test.mjs`

Expected: PASS。

- [ ] **Step 5: 提交 UI 能力**

```bash
git add src/app tests/app-ui.test.mjs YouTubeUltimateAPI.js
git commit -m "feat: add YouTube app interface switches"
```

### Task 8: 恢复 YouTube Music 普通歌词和逐行歌词翻译

**Files:**
- Modify: `src/app/lib/googleTranslate.ts`
- Modify: `src/app/src/response.ts`
- Test: `tests/app-lyrics.test.mjs`

- [ ] **Step 1: 编写歌词失败测试**

覆盖：非 `MPLYt` browseId 不请求翻译；`lyricLang=off` 不请求；普通歌词追加译文；逐行歌词逐行追加；返回语言已经是目标语言时不重复；HTTP 失败、非法 JSON、行数不匹配均保留原歌词并正常 `$done`。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run build && node --test tests/app-lyrics.test.mjs`

Expected: FAIL，至少一个翻译或失败回退场景不满足。

- [ ] **Step 3: 实现安全翻译流程**

仅当 `name === "Browse"`、browseId 以 `MPLYt` 开头且 `lyricLang !== "off"` 时调用 Google Translate。URL 由 `URLSearchParams` 编码，不把歌词写入日志；请求超时使用 Loon 脚本总超时约束。解析或网络异常在 `translate()` 内捕获并返回，不传播到播放响应。

翻译成功标记固定为：

```ts
const TRANSLATION_NOTICE = " & Translated by Google";
```

普通歌词和逐行歌词只在获得非空译文后改写；已是目标语言时保持原文，不追加重复文本。

- [ ] **Step 4: 运行歌词和隐私日志测试**

Run: `npm run build && node --test tests/app-lyrics.test.mjs tests/app-feed.test.mjs`

Expected: PASS；日志中找不到夹具歌词正文。

- [ ] **Step 5: 提交歌词翻译**

```bash
git add src/app/lib/googleTranslate.ts src/app/src/response.ts tests/app-lyrics.test.mjs YouTubeUltimateAPI.js
git commit -m "feat: restore YouTube Music lyric translation"
```

### Task 9: 更新合并插件定义并消除脚本重叠

**Files:**
- Modify: `YouTubeUltimate.lpx`
- Modify: `YouTubeUltimatePage.js`
- Modify: `tests/plugin.test.mjs`
- Modify: `tests/page.test.mjs`
- Modify: `tests/helpers/run-loon-script.mjs`

- [ ] **Step 1: 把插件静态测试改为全系统预期**

断言：`#!system=iOS,iPadOS,macOS`；九个参数及默认值完整；`YouTubeUltimateAPI.js` 覆盖 player/browse/next/search/reel/guide/get_setting/get_watch；`YouTubeUltimateAppOnesie.js` 仅覆盖 config/log_event；`YouTubeUltimateAppRequest.js` 仅覆盖 initplayback/log_event 请求；每个端点只有一个 response 处理器；所有 Raw URL 都属于 `Giu-zhao/Loon_plugin`。

- [ ] **Step 2: 运行测试确认旧插件元数据失败**

Run: `node --test tests/plugin.test.mjs`

Expected: FAIL，旧插件仍是 macOS Safari 专用且缺少 App 参数。

- [ ] **Step 3: 更新插件头部和参数**

参数固定为设计值：

```ini
[Argument]
enabled = switch,true,tag=总开关,desc=启用 YouTube Ultimate
web_enhance = switch,true,tag=网页增强,desc=清理 Safari 页面广告容器
app_enhance = switch,true,tag=App 增强,desc=启用 YouTube 与 YouTube Music App 功能
blockUpload = switch,false,tag=隐藏上传按钮,desc=隐藏 YouTube 底栏上传按钮
blockShorts = switch,false,tag=隐藏 Shorts 按钮,desc=隐藏 YouTube 底栏 Shorts 按钮
blockImmersive = switch,false,tag=隐藏选段按钮,desc=隐藏 YouTube Music 底栏选段按钮
captionLang = select,zh-Hans,zh-Hant,ja,ko,en,off,tag=字幕翻译语言,desc=选择字幕翻译目标语言
lyricLang = select,zh-Hans,zh-Hant,ja,ko,en,off,tag=歌词翻译语言,desc=选择歌词翻译目标语言
debug = switch,false,tag=调试日志,desc=只记录端点和处理数量
```

- [ ] **Step 4: 同步网页增强参数名**

把 `YouTubeUltimatePage.js` 中的 `optionEnabled("page_enhance", true)` 改为 `optionEnabled("web_enhance", true)`，并把页面测试参数同步改名。除参数名外不修改 CSS、MutationObserver、跳过按钮或 CSP nonce 逻辑。

- [ ] **Step 5: 配置无重叠脚本路由**

`YouTubeUltimateAPI.js` 匹配 player/browse/next/search/reel/guide/get_setting/get_watch，使用 `requires-body=true,binary-body-mode=true`；App 参数全部传入。页面脚本保留且参数改为 `{enabled},{web_enhance},{debug}`。config/log_event 与 request 脚本分别使用两个本地 Raw 地址，不引用 Maasea 或 Kelee。

- [ ] **Step 6: 扩大但限制 googlevideo 边界**

新增 `*.googlevideo.com` QUIC 回退和 MitM；Rewrite 只拒绝 URL 含明确 `&oad` 广告标记的 `initplayback`。静态测试必须继续拒绝普通 `videoplayback`、整域 `googlevideo.com` REJECT 和跨站广告域名屏蔽。

- [ ] **Step 7: 运行插件和全量自动化测试**

Run: `npm run check && npm test`

Expected: exit 0；旧 26 项 Safari 回归继续通过，新增 App 测试全部通过。

- [ ] **Step 8: 提交插件合并**

```bash
git add YouTubeUltimate.lpx YouTubeUltimatePage.js tests/plugin.test.mjs tests/page.test.mjs tests/helpers/run-loon-script.mjs
git commit -m "feat: merge Safari and YouTube app plugin"
```

### Task 10: 完成第三方声明、用户文档和版本记录

**Files:**
- Create: `THIRD_PARTY_NOTICES.md`
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: 编写第三方声明**

声明 `Maasea/sgmodule`、两个固定提交、Apache-2.0、本项目修改项和 `vendor/maasea/LICENSE` 路径；明确 App 运行时只访问本仓库 Raw 脚本，歌词翻译开启时歌词正文会发送到 Google Translate。

- [ ] **Step 2: 更新 README**

写明 iOS/iPadOS/macOS 支持、不支持 tvOS；列出九个参数、默认值、MitM/证书/QUIC 前提、App 与 Safari 验收步骤、关闭歌词翻译的隐私方式，以及 `app_enhance=false` 仍保留 MitM 主机列表这一 Loon 限制。

- [ ] **Step 3: 更新 CHANGELOG 2.0.0**

记录 App Protobuf、按钮、PIP、后台、字幕/歌词、许可证、精确 googlevideo 边界和 Safari 回归保留；不得写“所有设备已验证”，iOS/iPadOS 标注需要用户实机验收。

- [ ] **Step 4: 扫描外部依赖和占位文本**

Run: `rg -n 'kelee\.one|raw\.githubusercontent\.com/Maasea|TBD|TODO|implement later|自行补充' YouTubeUltimate.lpx README.md CHANGELOG.md THIRD_PARTY_NOTICES.md src tests`

Expected: 无运行时外部脚本地址、无占位文本；第三方文档中的来源链接允许出现 `github.com/Maasea/sgmodule`。

- [ ] **Step 5: 提交文档**

```bash
git add README.md CHANGELOG.md THIRD_PARTY_NOTICES.md
git commit -m "docs: document YouTube Ultimate 2.0"
```

### Task 11: 完整验证、GitHub 发布和 Raw 哈希核对

**Files:**
- Verify: all tracked project files

- [ ] **Step 1: 从干净依赖状态重建**

Run: `npm ci && npm run build`

Expected: exit 0；`git status --short` 只显示预期构建产物变化，或完全为空。

- [ ] **Step 2: 运行完整测试和语法检查**

Run: `npm run check && npm test && git diff --check`

Expected: 全部 exit 0，无失败、无语法错误、无尾随空格。

- [ ] **Step 3: 验证确定性构建**

Run: `first_hash=$(shasum -a 256 YouTubeUltimateAPI.js | awk '{print $1}') && npm run build >/dev/null && second_hash=$(shasum -a 256 YouTubeUltimateAPI.js | awk '{print $1}') && test "$first_hash" = "$second_hash" && printf '%s\n' "$second_hash"`

Expected: exit 0，输出一个稳定 SHA-256。

- [ ] **Step 4: 提交最后的生成产物（仅在有差异时）**

```bash
git add YouTubeUltimateAPI.js package-lock.json
git diff --cached --quiet || git commit -m "build: refresh YouTube Ultimate bundle"
```

- [ ] **Step 5: 推送 GitHub main**

Run: `git push origin main`

Expected: GitHub 显示本地 `main` 已推送，无拒绝或冲突。

- [ ] **Step 6: 比较 GitHub Raw 与本地哈希**

用当前 Loon HTTP 端口 `127.0.0.1:7222` 下载并逐一比较：

```bash
raw_dir=$(mktemp -d /tmp/ytul-raw.XXXXXX)
for file_name in YouTubeUltimate.lpx YouTubeUltimateAPI.js YouTubeUltimateAppRequest.js YouTubeUltimateAppOnesie.js YouTubeUltimatePage.js; do
  curl --fail --silent --show-error --location --proxy http://127.0.0.1:7222 "https://raw.githubusercontent.com/Giu-zhao/Loon_plugin/main/$file_name" --output "$raw_dir/$file_name"
  test "$(shasum -a 256 "$file_name" | awk '{print $1}')" = "$(shasum -a 256 "$raw_dir/$file_name" | awk '{print $1}')"
done
```

Expected: 五个文件逐一一致；任何一个不一致都停止配置部署。

### Task 12: 备份并直接更新 Loon 配置

**Files:**
- Modify: `/Users/peaceg/Library/Mobile Documents/iCloud~com~ruikq~decar/Documents/Configs/default.lcf`
- Create: `/Users/peaceg/Library/Mobile Documents/iCloud~com~ruikq~decar/Documents/Configs/default.lcf.codex-backup-20260824-youtube-ultimate-2.0`

- [ ] **Step 1: 核对精确目标并创建备份**

确认配置路径存在且备份目标尚不存在；复制完整原文件到上述固定备份名。记录更新前 SHA-256。

- [ ] **Step 2: 只替换 YouTube 相关配置块**

用补丁修改当前第 70-71、203-211、230、248 行附近的 YouTube 条目：保留页面 Rewrite 和 `YouTubeUltimatePage.js`；把三个旧 API 脚本行替换成合并 API、App Request 和 Onesie 行；合并 API 的直接配置参数固定为 `enabled=true&web_enhance=true&app_enhance=true&blockUpload=false&blockShorts=false&blockImmersive=false&captionLang=zh-Hans&lyricLang=zh-Hans&debug=false`；加入精确 initplayback Rewrite、googlevideo QUIC 与 `*.googlevideo.com` MitM；不改策略组、节点、其他插件、规则或全局代理设置。

由于本机已经确认远程插件资源未稳定进入请求链，macOS 配置把 GitHub 插件行保留但设为 `enabled=false`，由直接 `[Rule]`、`[Rewrite]`、`[Script]` 和 `[Mitm]` 条目作为唯一运行来源，避免未来缓存恢复后同一响应被处理两次。iOS/iPadOS 新安装仍使用 GitHub `.lpx` 的可视参数设置；本机开关调整按用户要求直接修改 `default.lcf` 的参数字符串。

- [ ] **Step 3: 检查配置差异**

Run: `diff -u '/Users/peaceg/Library/Mobile Documents/iCloud~com~ruikq~decar/Documents/Configs/default.lcf.codex-backup-20260824-youtube-ultimate-2.0' '/Users/peaceg/Library/Mobile Documents/iCloud~com~ruikq~decar/Documents/Configs/default.lcf'; rg -n 'YouTubeUltimate|youtubei|googlevideo|initplayback' '/Users/peaceg/Library/Mobile Documents/iCloud~com~ruikq~decar/Documents/Configs/default.lcf'`

Expected: 差异只包含设计中的 YouTube 行；旧的 Kelee App 插件和本机 GitHub 资源行均为 `enabled=false`，直接配置中每个 API 端点只有一个响应处理器。

- [ ] **Step 4: 等待 Loon 自动重新载入并核对运行态**

全程不使用视觉技能。保存 `default.lcf` 后，每秒比较一次它与 `/Users/peaceg/Library/Application Support/com.loon.Loon/tempFile/lastConfig`，最多 20 次；两者一致后，再分别用 `rg` 确认 `YouTubeUltimateAPI.js`、`YouTubeUltimateAppRequest.js`、`YouTubeUltimateAppOnesie.js`、`*.googlevideo.com` 和 initplayback Rewrite 已进入 `lastConfig`。20 秒内未一致则停止并报告，不重启 Loon 或系统扩展。

- [ ] **Step 5: macOS Safari 实际链路回归**

验证首页、搜索、Shorts 和普通视频；确认 pagead 被拒绝、页面注入标记仅一次、player JSON 有效且无 `adPlacements`/`adSlots`、视频播放正常。

- [ ] **Step 6: 保留回退证据**

记录备份路径、更新前后哈希和请求命中结果。若运行态未载入或 Safari 回归失败，立即恢复固定备份并重新载入，不继续 App 验收。

### Task 13: iOS/iPadOS App 实机验收交接

**Files:**
- Verify: GitHub Raw plugin and user devices

- [ ] **Step 1: 给出同一安装地址**

```text
https://raw.githubusercontent.com/Giu-zhao/Loon_plugin/main/YouTubeUltimate.lpx
```

- [ ] **Step 2: 用户验证 YouTube App**

依次验证视频贴片/中插、首页、搜索、Shorts、画中画、锁屏后台、字幕翻译，以及上传/Shorts 按钮开关。每项区分“通过”“仍出现广告”“功能异常”，不要把未测试项记为通过。

- [ ] **Step 3: 用户验证 YouTube Music**

验证后台播放、升级入口、选段按钮开关、普通歌词、逐行歌词和 `lyricLang=off`。首次开启歌词翻译前再次提示歌词正文会发送到 Google Translate。

- [ ] **Step 4: 根据真实请求记录做最小修正**

若某端点未命中，只收集请求 URL、Content-Type、脚本标签和错误摘要；不收集 Cookie、完整 Body、账号标识或观看历史。修正必须新增对应最小夹具与失败测试，再改源码、构建、全量测试、推送和重新核对 Raw 哈希。

- [ ] **Step 5: 最终记录验收状态**

只有用户实际验证的系统和功能才能标记为已通过；macOS Safari 与 iOS/iPadOS App 结果分别记录，保留备份恢复路径。
