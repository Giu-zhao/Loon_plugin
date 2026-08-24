# 更新记录

## 1.0.1 - 2026-08-24

- 新增 `YouTubeUltimate.lpx` 稳定入口，避免 Loon 复用旧插件地址的缓存内容；
- 更新安装与排查说明，明确旧地址查询参数不能保证资源刷新；
- 保留 `YouTubeSafariAdBlock.lpx` 作为历史兼容文件。

## 1.0.0 - 2026-08-24

- 将原 `YouTube Safari-Style AdBlock` 原位升级为 `YouTube Ultimate - Safari`；
- 新增 player、browse/search/guide、next/get_watch 三类 JSON 响应净化脚本；
- 新增带 CSP nonce 复用的 Safari 页面增强与广告 DOM 清理；
- 新增总开关、网页增强与隐私安全调试日志选项；
- 移除对 `googlevideo.com`、`ytimg.com` 和跨站 Google 广告域名的广泛规则；
- QUIC 回退缩小到 YouTube 页面与 JSON API；
- 新增 Node.js VM 回归测试和插件静态检查。

已知限制：YouTube 会持续调整广告结构；自动化夹具通过不代表所有账号、地区和投放时段均无广告，仍需 Loon macOS + Safari 实机验证。
