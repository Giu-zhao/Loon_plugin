# YouTube Ultimate Loon

面向 **Loon macOS + Safari 网页版 YouTube** 的去广告插件。插件使用新的稳定入口，避免 Loon 继续复用旧版 `YouTube Safari-Style AdBlock` 的资源缓存。

## 安装地址

```text
https://raw.githubusercontent.com/Giu-zhao/Loon_plugin/main/YouTubeUltimate.lpx
```

已经安装旧版的用户需要把旧地址替换为上述新地址。只修改旧地址后的查询参数不足以刷新 Loon 的插件资源缓存。

## 功能

- 清理 `/youtubei/v1/player` 中的贴片和中插广告字段；
- 清理首页、搜索、指南、Shorts 信息流中的广告卡片；
- 清理推荐列表和 `get_watch` 响应中的推广内容；
- 清理 Safari 页面残留广告容器，并点击可见的“跳过广告”按钮；
- 保留视频格式、字幕、评论、继续加载、正常推荐和 Shorts 内容；
- 解析或脚本异常时原样放行，优先保证页面与播放可用。

## 安全边界

- 不 MitM、拒绝或重写 `googlevideo.com` 视频媒体流；
- 不屏蔽全局 `doubleclick.net`、`googlesyndication.com` 或 Google Analytics 域名；
- 不修改 Cookie、登录状态、请求头、清晰度、播放地址或账号信息；
- 调试日志只记录脚本类型和删除数量，不打印响应体、Cookie、账号标识或观看历史；
- 不处理视频作者口播、植入推广或 SponsorBlock 类型片段；
- 不提供会员功能解锁。

## 使用前提

1. 使用 Loon macOS 和 Safari；
2. Loon 已开启并正确配置 MitM，证书已在 macOS 中安装和信任；
3. Safari 的 YouTube 流量经过 Loon；
4. 同类 YouTube 网页脚本不要同时启用，排查时尤其如此。

插件只对 YouTube 页面和 JSON API 的 QUIC 做 TCP 回退，便于 Loon 执行 HTTPS 响应脚本。视频 CDN 不在回退或 MitM 范围内。

## 插件开关

- `总开关`：启用全部 API 净化与页面增强；
- `网页增强`：控制 DOM 广告清理和跳过按钮，默认开启；
- `调试日志`：只输出端点与删除数量，默认关闭。

## 更新与验证

更新插件后，在 Safari 中关闭原 YouTube 标签页并重新打开，或执行强制刷新。

建议按以下顺序验证：

1. 打开 YouTube 首页、搜索页和 Shorts，确认正常内容可加载；
2. 打开普通视频，确认画面、声音、字幕和推荐列表正常；
3. 在 Loon 请求记录中确认 `youtubei/v1/player`、`browse`、`next` 等请求经过脚本；
4. 如需排查，临时开启 `调试日志`，确认出现 `removed=<数量>`；
5. 使用确实会返回广告的账号/地区/视频样本做实机验收。

自动化测试只证明已知 JSON/HTML 结构能被正确处理，不能代替真实账号和广告投放环境的验收。

## 故障排查

### 插件显示已启用，但规则与脚本没有命中

- 确认安装地址以 `YouTubeUltimate.lpx` 结尾；
- 不要继续使用 `YouTubeSafariAdBlock.lpx?v=...` 作为更新方式；
- 重新载入配置后，用 `pagead` 测试请求或 Loon 请求记录确认 Rewrite 已命中。

### 首页正常，但视频仍有广告

- 确认旧插件已更新为 `YouTube Ultimate - Safari`；
- 确认 MitM 主机包含 `www.youtube.com` 与 `youtubei.googleapis.com`；
- 查看请求记录中是否出现 `youtubei/v1/player`；
- 暂时关闭其他 YouTube 去广告插件，排除脚本顺序冲突。

### 页面空白、视频加载失败或出现反广告拦截提示

1. 先关闭 `网页增强`，保留 API 净化重试；
2. 若仍异常，关闭插件总开关并强制刷新；
3. 保留出现问题时的请求 URL、端点类型和 Loon 日志，不要提交 Cookie 或完整响应体；
4. 在仓库 Issue 中说明 macOS、Safari、Loon 版本与复现步骤。

### 回退

在 Loon 中关闭本插件即可立即停止规则与脚本。GitHub 中的历史版本可以通过提交记录恢复，不需要修改其他插件或全局代理配置。

## 项目文件

- `YouTubeUltimate.lpx`：当前稳定插件入口；
- `YouTubeSafariAdBlock.lpx`：旧地址兼容文件，不再作为推荐安装入口；
- `YouTubeUltimatePlayer.js`：播放响应广告字段清理；
- `YouTubeUltimateBrowse.js`：首页、搜索和指南广告卡片清理；
- `YouTubeUltimateNext.js`：推荐与 `get_watch` 清理；
- `YouTubeUltimatePage.js`：Safari HTML/DOM 增强；
- `tests/`：直接执行以上 Loon 脚本的回归测试。

旧的 `YouTubeSafariAdSkipper.js`、`YouTubeWebRemoveAds.js`、`YouTubeWebCosmetic.js` 和 `YouTubeWebRemoveAds.lpx` 仅保留作历史参考，新插件不会加载它们。

## 本地测试

需要 Node.js 18 或更新版本：

```bash
npm test
npm run check
```

Loon 插件与 Script 语法参考：[插件文档](https://nsloon.app/docs/Plugin/) · [脚本类型](https://nsloon.app/docs/Script/)
