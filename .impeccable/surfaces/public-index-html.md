---
version: 1
slug: "public-index-html"
primary_target: "public/index.html"
related_targets: ["src/site.css", "src/app.mjs", "src/drive-engine.mjs", "scripts/build.py", "content", "assets"]
---

# Journal 沿途夜行

模式：Experience。用户明确要求单页、不滚动、从左向右前进的小游戏，大胆动画；中文简体，通行英文地点 ID，完整中英切换。保留 23 篇随笔与版权页尾。视觉验收仍由用户完成。

## Direction contract

THESIS：在一个屏幕内驾驶、停靠、读一页。车与道路是真正运行的舞台，按钮和随笔围绕驾驶状态组织，不把旧长文页面套上游戏装饰。

OWN-WORLD：原创夜港全景、珊瑚橙双门车、深海蓝场景框与车灯金色操作键。以本地 Barlow Condensed 斜体字标建立街机力度，中文和操作说明采用系统无衬线，阅读卡片采用宋体。图像保留原作质感，不用几何拼凑城市。

STORY：从柴湾出发，按一次前进驶往下一站并自动停靠；到站可打开随笔卡片，逐页读完后继续。菜单可选地点；最后到中环。中英切换保持位置，全部内容在同一页面完成。

FIRST VIEWPORT：顶端为 Journal、语言与说明；中央绝大部分为完整横版夜港场景，地点大字置于上方，车辆位于左侧道路，下一站与文卡入口置于另一侧。底部为前进、暂停、加速、地点菜单与路线进度，最下方常驻版权信息。手机仍是一屏，控件重排、阅读卡片自适应分页。

FORM：用户已明确指定横向驾驶玩法及不滚动结构，本轮按此固定形式实现，替换此前阅读长页。采用代码构建与独立美术资产，不把静态构图当作游戏实现。

MOTION：只有主动驾驶时启动视差、路面流动与短速度线；到站制动并停帧。暂停、隐藏、打开阅读卡片时停止驾驶。减少动态效果保留逻辑进度与到站反馈，减少空间运动；不使用声音或闪烁。

FINISH：unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

验证边界：完成纯逻辑测试、源码复核、双语及内容完整性、构建与线上 HTTP 验证。用户约定不自动启动应用或浏览器做视觉验收，不宣称帧率、设备手感或视觉已通过。
