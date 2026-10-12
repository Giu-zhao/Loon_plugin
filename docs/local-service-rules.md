# 本地服务直连规则

安装地址：

```text
https://raw.githubusercontent.com/Giu-zhao/Loon_plugin/main/LocalServiceDirect.lpx
```

这份插件从现有 macOS 本地规则整理而来，按旅行服务、Apple、微信与腾讯、远程控制分类，全部使用 DIRECT。它包含进程规则，面向 macOS。规则中清除了被同策略上级域名后缀完全覆盖的条目，保留原有关键词匹配范围。

腾讯部分包含 qq.com、qcloud.com、myqcloud.com 等广泛使用的域名，启用后这些域名会直连；请按自己的分流需求使用。

插件不包含个人服务器 IP、节点域名、订阅地址、MitM 证书，以及依赖个人策略组的 LinkedIn、Bybit 和其他站点规则。LAN、GEOIP CN 和 FINAL 继续由主配置管理。

Loon 的规则来源优先级为本地规则、插件规则、订阅规则。若以后将主配置中的对应规则迁移到插件，应先检查其他插件是否有冲突；本次发布没有修改正在使用的主配置，也没有自动启用本插件。停用插件即可撤销它提供的规则。

官方规则文档：https://nsloon.app/docs/Rule/
