# 隐私政策 / Privacy Policy

更新时间:2026-09-25

## 中文

"知乎屏蔽器"(Zhihu Blocker)是一款开源的浏览器扩展,唯一用途是屏蔽知乎的广告与推广内容。

**我们收集什么:不收集。** 本扩展无账户系统、无遥测、无分析 SDK、无广告,不向开发者或任何第三方上传任何数据。

**哪些数据留存在你的浏览器:**
- 你的配置(屏蔽开关、置信阈值)、作者黑名单、AI 判定缓存、标注样本、DeepSeek API key
- 全部存于浏览器自己的 `chrome.storage`;除配置外均存于 `local` 区,不上传、不跨设备同步

**哪些数据会离开你的浏览器:** 仅在你主动开启"AI 软广识别"并填入自己的 DeepSeek API key 后,命中本地初筛的回答正文会被发送到 `api.deepseek.com`(你本人的账户)用于软广判定。这一发送不经过开发者服务器,也无法被开发者看到。关闭该功能后不发生任何网络请求(除打开知乎页面本身)。

**数据删除:** 卸载扩展或使用 popup 中的清空按钮(I 清空黑名单、样本、缓存)即可删除本地全部数据。

**联系方式:** kaiyang939325@gmail.com

## English

"Zhihu Blocker" is an open-source browser extension whose sole purpose is hiding ads and promotional content on Zhihu.

**What we collect: nothing.** No accounts, no telemetry, no analytics SDK, no ads. No data is uploaded to the developer or any third party.

**Data stored in your browser:** your settings (block toggles, confidence threshold), author blocklist, AI judgment cache, labeled samples, and your DeepSeek API key — all in the browser's own `chrome.storage` (mostly the `local` area), never uploaded and never synced across devices.

**Data leaving your browser:** only if you opt in to "AI soft-ad detection" and provide your own DeepSeek API key, answer text that passes the local pre-filter is sent to `api.deepseek.com` under *your* account for classification. This traffic never passes through the developer's servers and is invisible to the developer. With the feature off, the extension makes no network requests at all.

**Deletion:** uninstalling the extension, or using the clear buttons in the popup, removes all locally stored data.

**Contact:** kaiyang939325@gmail.com