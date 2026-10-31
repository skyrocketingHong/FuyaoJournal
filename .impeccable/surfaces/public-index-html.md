---
version: 1
slug: "public-index-html"
primary_target: "public/index.html"
related_targets: ["src/site.css","src/site.js","scripts/build.py","content"]
---

# Journal 沿途随记

模式：Read。范围：首页连续阅读、23 篇独立随笔、关于页和 404 页。

用户最新确认：用给定的《飞车》地点序列取代 40 城；整合阅读轴、书页过渡和地点字幕，加入飞车元素。23 篇、22 个不同地点，末尾中环另文收尾。原生静态页面；不改变代理、凭据或 DNS。用户自行视觉验收，不自动启动浏览器或截屏。

## Direction contract

THESIS：将用户给出的地名顺序做成一条可阅读的路线。首页直接展开全部正文，目录、地点字幕和行进标记共享同一个阅读位置；独立文章仍可直接访问。

OWN-WORLD：深松绿色的夜行刊头、车灯黄的当前位置、浅色书页。宋体负责正文与地点字形，无衬线负责导航，Georgia 只作 Journal 刊名。飞车元素仅用于道路刻线与一个行进标记，不使用自动循环、音频、车速或虚构里程。

STORY：在“柴湾”字幕下开始阅读，沿 23 段文字前行，目录随阅读定位；随时跳到指定地点或打开单篇。最后回到中环。灵感出处和生成散文性质在关于页说明，不抄录歌曲歌词。

FIRST VIEWPORT：固定刊名与当前位置；深绿色开篇左侧为“沿途随记”和入口，右侧为大字地点、前后控制与道路进度。下方进入柴湾正文，桌面左栏为有序目录，手机目录可展开；正文宽约 32 至 34 个汉字，不让动画穿过阅读列。

FORM：原先选择现代地理读本（候选第 4；seed:b6c25415502ad304），由用户随后明确的《飞车》灵感和三种主体验整合要求更新。保留文字尺度，将框架改为夜行路线。序号表达篇章顺序，不表示交通线路。

MOTION：只在阅读位置变更时更新地点字幕、目录选中与车辆标记；支持的同源页面使用 View Transitions 衔接地点标题。无脚本和不支持 API 时普通链接完整有效。减少动态效果时无空间移动，保留文字与选中反馈。

FINISH：unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

验证边界：依据用户长期约定，检查源码、构建、全部链接、HTTP 状态、代理协议回归和部署差异；不进行浏览器视觉验收。评审须明确仅覆盖静态源码和内容，不给出视觉通过结论。
