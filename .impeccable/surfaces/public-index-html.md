---
version: 1
slug: "public-index-html"
primary_target: "public/index.html"
related_targets: ["src/site.css", "src/app.mjs", "src/drive-engine.mjs", "scripts/build.py", "content", "assets"]
---

# Journal 沿途夜行

模式：Experience。用户明确要求单页、不滚动、从左向右前进的小游戏，大胆动画；中文简体，通行英文地点 ID，完整中英切换。保留 23 篇随笔与版权页尾。视觉验收仍由用户完成。

## Direction contract

THESIS：在一个屏幕内驾驶、停靠、读一页。22 个独立地点场景按 23 站顺序组成连续道路，顶部显示完整地点条，支持手动或自动前进；不提供文本和源码下载。

OWN-WORLD：22 张原生 1536×1024 的独立街区和城市夜景、珊瑚橙双门车、深海蓝场景框与车灯金色操作键。以本地 Barlow Condensed 斜体字标建立街机力度，中文和操作说明采用系统无衬线，阅读卡片采用宋体。按真实道路锚点对齐各图，不镜像复用单一城市。

STORY：从柴湾出发，按一次前进驶往下一站并自动停靠；到站可打开随笔卡片，逐页读完后继续。菜单可选地点；最后到中环。中英切换保持位置，全部内容在同一页面完成。

FIRST VIEWPORT：顶端为 Journal、自动播放、语言与说明，下方为包含全部 23 站的地点条，窄屏换行；中央为横版连续场景，车辆位于左侧道路。底部为驾驶控件、地点菜单与进度，最下方常驻版权信息。手机仍是一屏，控件重排，阅读卡片分页。

FORM：用户已明确指定横向驾驶玩法及不滚动结构，本轮按此固定形式实现，替换此前阅读长页。采用代码构建与独立美术资产，不把静态构图当作游戏实现。

MOTION：手动前进到站停帧；自动播放需明确启动，到站停留 1600ms 再继续，终点停止。打开面板、选站、手动前进或暂停、页面失焦时取消自动播放；按住加速不退出自动播放。减少动态效果保留进度与正确地点场景，不使用声音或闪烁。场景仅加载当前及相邻片段，最多缓存 5 张并限制像素预算。

FINISH：unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

验证边界：完成纯逻辑测试、源码复核、双语及内容完整性、构建与线上 HTTP 验证。用户约定不自动启动应用或浏览器做视觉验收，不宣称帧率、设备手感或视觉已通过。
