---
name: "Journal 沿途随记"
description: "以夜行路线为线索、由地点短随笔构成的中文阅读系统。"
colors:
  paper: "#f5f4ee"
  white: "#ffffff"
  night: "#17382f"
  ink: "#20392f"
  muted: "#56645c"
  signal: "#f0cb72"
  signal-ink: "#57441c"
  line: "#cbd3c6"
  night-muted: "#c1d0c6"
  route-hover: "#e4e8dc"
  control-disabled: "#789389"
typography:
  wordmark:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "2.75rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.035em"
  display:
    fontFamily: "'Songti SC', 'STSong', 'SimSun', Georgia, serif"
    fontSize: "4.75rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.02em"
  headline:
    fontFamily: "'Songti SC', 'STSong', 'SimSun', Georgia, serif"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.03em"
  title:
    fontFamily: "'Songti SC', 'STSong', 'SimSun', Georgia, serif"
    fontSize: "2.75rem"
    fontWeight: 600
    lineHeight: 1.4
  story:
    fontFamily: "'Songti SC', 'STSong', 'SimSun', Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.55
  body:
    fontFamily: "'Songti SC', 'STSong', 'SimSun', Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.95
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  action:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
rounded:
  square: "0px"
spacing:
  section: "4rem"
  section-narrow: "3rem"
components:
  begin-link:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.night}"
    typography: "{typography.action}"
    rounded: "{rounded.square}"
    padding: "0.6rem 1rem"
  begin-link-hover:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.night}"
  route-control:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    width: "2.75rem"
    height: "2.75rem"
  route-control-hover:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.night}"
  route-control-disabled:
    textColor: "{colors.control-disabled}"
  route-link-current:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.night}"
    rounded: "{rounded.square}"
  route-link-hover:
    backgroundColor: "{colors.route-hover}"
  destination:
    textColor: "{colors.signal}"
    typography: "{typography.display}"
  masthead:
    backgroundColor: "{colors.night}"
    textColor: "{colors.paper}"
  prose:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
---

# Design System: Journal 沿途随记

## Overview

**Creative North Star: "夜行路线上的书页"**

Journal 以“沿途随记”为中文辅名，把地点、篇章和阅读位置放在同一条线上。深松绿承接刊头与开篇，车灯黄标识当前地点和开始阅读的入口，浅色正文保留纸页般的安静。宋体承担中文地点和散文，无衬线承担导航与状态，Georgia 只承担 Journal 刊名。

本记录对应表面简报中的 Read 模式，依据现有源码提取，未提出新的视觉方向。首页按用户指定的《飞车》灵感序列展开 23 篇短随笔，涵盖 22 个不同地点；两篇中环以独立 slug 区分，末篇另文收尾。“路线”表达阅读顺序，不能解释为真实交通线路。

文档范围为首页、独立文章、关于页和 404 页。实现依据为 `src/site.css`、`src/site.js`、`scripts/build.py` 与 `content/`，方向依据为 `PRODUCT.md` 和 `.impeccable/surfaces/public-index-html.md`。本文记录基于源码与内容结构核对；未启动浏览器，未截图，未完成视觉、交互或跨浏览器验收。视觉验收由用户自行完成。

**Key Characteristics:**

- 深松绿刊头、车灯黄阅读状态和浅色正文形成三层分工。
- 正文优先：首页直接输出全部段落，独立文章可直接访问。
- 路线轴、地点字幕与道路标记共享阅读位置，仅在交互或阅读位置变化时响应。
- 系统字体、同源资源、平面分隔，不依赖照片、视频或音频。
- 动效属于渐进增强；无 JavaScript 与减少动态效果时仍可完整阅读。

## Colors

颜色值以前置 token 为准。基础色沿用 CSS 自定义属性名；`route-hover` 与 `control-disabled` 对应源码中直接声明的两个交互色，不另建虚构色阶。

### Primary

- **夜行松绿**（`night`）：刊头、开篇背景、黄色入口的文字及车辆内部刻画。
- **车灯黄**（`signal`）：当前位置、地点大字、道路进度、目录选中和起读入口。其深色配套文字为 `signal-ink`，用于黄色目录项中的序号。

### Neutral

- **浅色书页**（`paper`）：全站阅读底色，也是夜行区域主文字和按钮悬停底色。
- **正文松墨**（`ink`）：阅读区正文和默认文字。
- **辅助灰绿**（`muted`）：摘要、篇章序号、面包屑和页尾说明。
- **夜行浅灰绿**（`night-muted`）：深色区域说明、阅读序号、道路虚线与按钮边框。
- **页间细线**（`line`）：章节与页尾分隔、目录滚动条。
- **目录浅灰绿**（`route-hover`）：目录链接悬停背景。
- **禁用灰绿**（`control-disabled`）：首尾不可用的路线按钮文字与边框。
- **纯白**（`white`）：键盘跳到正文链接的浮现底色。

**The Reading Signal Rule.** 车灯黄承担当前地点、路线选中、起读入口与文字选择反馈；正文保持深墨色，黄色不铺满阅读列。

## Typography

**Display Font:** 中文地点和标题使用 `typography.display` 的宋体栈；英文刊名使用 `typography.wordmark` 的 Georgia 栈。

**Body Font:** `typography.body` 的 Songti SC、STSong、SimSun、Georgia、serif。

**Label/Mono Font:** `typography.label` 的系统无衬线栈。界面没有独立等宽字体；篇章序号使用 `tabular-nums` 保持数字宽度稳定。

**Character:** 地点和正文共享宋体字形，导航用无衬线保证扫读。刊名字形单独保留，不扩展成英文正文风格。

### Hierarchy

- **Wordmark**：Journal 刊名，常规字重和紧字距；48rem 以下缩至 2.25rem，24rem 以下缩至 2rem。
- **Display**：开篇动态地点字幕；默认值见 `typography.display`，48rem 以下为 4.25rem。
- **Headline**：开篇“沿途随记”；默认值见 `typography.headline`，48rem 以下为 2.5rem。
- **Title**：独立文章地点；默认值见 `typography.title`，48rem 以下为 2.25rem。关于页和 404 标题使用同一字号，行高为 1.45。
- **Story**：首页篇章标题；默认值见 `typography.story`，48rem 以下为 1.625rem。独立文章的故事标题另为 1.875rem、1.6 行高，窄屏为 1.625rem。
- **Body**：宋体正文，最大宽 42rem；默认字号见 `typography.body`，48rem 以下为 1.125rem，行高仍为 1.95。段落间隔为 1.1em。
- **Label**：阅读序号、导航和元信息；默认值见 `typography.label`，顶部位置在窄屏为 0.8125rem。摘要为 1rem 无衬线、1.8 行高，开篇说明的行高为 1.9。
- **Action**：车灯黄起读入口，使用 `typography.action`。

**The Type Roles Rule.** 中文标题和正文使用宋体栈，导航与状态使用系统无衬线，Georgia 用于 Journal 刊名；不加载远程字体。

## Layout

全站容器为 `min(100% - 5rem, 74rem)`，左右居中。刊头粘在视口顶部，高度下限为 5.25rem；页面锚点通过根元素的 7rem 滚动预留避让刊头。首页开篇采用两列，左侧说明、右侧地点字幕与道路；默认列间距为 5rem，垂直内边距为上 3rem、下 4rem。

首页正文区为目录与阅读列的网格：目录宽 12.5rem，列间距 4.5rem。目录距顶部 7rem，并在剩余视口高度内独立滚动。章节标题内部先放 7.5rem 地点列，再以 1.75rem 间距接文章标题；正文左缩进 9.25rem，对齐文章标题。阅读正文最大宽 42rem，按字号换算最大约 33.6 个全角字；实际行长随可用列宽收窄，不保证所有窗口都占满此值。章节以 `spacing.section` 的下内边距和下外边距分隔。

- **67rem 及以下**：开篇间距减至 3rem；目录变为 10rem，外列间距为 2.5rem；章节地点与文章标题改为上下排列，取消正文左缩进。
- **48rem 及以下**：容器为 `calc(100% - 2.5rem)`，刊头下限 4.75rem；开篇与正文均改为单列。桌面目录隐藏，原生 `details` 目录显示，展开后为两列地点。章节节奏采用 `spacing.section-narrow`。主导航中的“关于文字”隐藏，页尾仍保留入口。
- **24rem 及以下**：刊头阅读数字隐藏，地点仍显示；前后篇导航改为单列。
- **独立文章**：居中的 42rem 阅读列，顶部面包屑、地点、标题、摘要、正文和前后篇导航依次排列。关于页和 404 页沿用同一文本宽度。
- **打印**：隐藏刊头、开篇、目录、面包屑、页尾和篇章操作，保留正文；采用白底黑字、12pt 正文字号。此为样式规则，未执行打印验收。

## Elevation & Depth

当前界面不使用 `box-shadow`、滤镜或半透明叠层。刊头与开篇通过深底色聚为一体，正文依靠浅底、章节留白和 1px 分隔线建立层次。粘性刊头的层级为 5，跳到正文链接为 20；这是覆盖顺序，不代表悬浮卡片材质。

**The Flat Page Rule.** 页面以底色、留白和细分隔线组织层次；当前界面不使用阴影、浮起卡片或模糊玻璃。

## Shapes

界面采用直角入口、方形路线按钮与矩形目录选中面，`rounded.square` 对应目录中显式声明的零圆角。路线控件的边框为 1px；键盘焦点使用 2px 轮廓与 5px 外移。章节焦点另用 0.75rem 外移。

道路由细虚线、实色已读线和单个 SVG 车辆构成。车辆图形内部有圆角与车轮，favicon 的底板也有圆角；这些是图像几何，不作为界面卡片圆角规则。页面没有常规卡片、输入框或标签组件。

## Components

### Buttons

起读入口是可直接导航的链接。默认使用车灯黄底与夜行松绿字，方角、最小高度 3rem；左右留出 1rem，图文间距 1rem。悬停转为浅色书页底，键盘焦点使用可见轮廓。没有另设表单提交按钮。

路线前后按钮是 2.75rem 的方形轮廓按钮，透明底、浅色文字和浅灰绿边框；可用时悬停反转为浅底深字。首尾按钮使用禁用灰绿并由原生 `disabled` 标识。无 JavaScript 时整组按钮隐藏，原生目录链接仍完整可用。

### Navigation

刊头左侧为 Journal，中央显示当前地点和阅读序号，右侧为普通链接。首页目录行最小高度为 2.75rem，序号与地点分列；选中行使用黄色背景、加粗地点、下划线和 `aria-current="location"`，并非仅以颜色传达状态。窄屏目录采用原生 `details` 和 `summary`，无需脚本即可展开。

独立文章顶部有返回路线当前位置的面包屑，末尾有返回位置和前后篇导航。所有地址由构建时的有序条目生成；最后一篇回到柴湾入口，不自动跳转。

页尾保留 Journal、关于文字与回到页首，在下方追加版权和服务信息。元信息沿用 `typography.label`、`colors.muted`，行高 1.8；桌面两侧分布，48rem 以下改为上下两行。版权署名链接个人主页，服务状态链接对应状态站；年份在构建时按东八区更新。

### Reading Chapter

首页章节是完整文章容器，包含地点与序号、标题、短引、三段正文以及“单独阅读这篇”。各篇以语义化 `article`、可聚焦的章节容器和真实锚点组成；源码中的正文不处于隐藏状态。章节没有卡片背景或阴影。

### Destination and Route Axis

地点字幕、顶部位置、目录选中、前后按钮状态、道路填充和车辆标记由同一个当前篇章索引更新。阅读位置从章节边界与预留的顶部空间推导；道路进度为 `index / (count - 1)`，表达篇章进度，不表达里程。滚动与尺寸变化通过一次待执行的动画帧合并更新，没有持续自动播放循环。

目录点击更新地址 hash 并将焦点交给目标章节；前后按钮额外通过 `role="status"` 的礼貌播报说明目标。手动滚动时不会持续向辅助技术播报字幕。桌面目录只在当前条目超出其可见范围时调整自己的滚动位置。

### Page and Caption Transitions

支持的同源页面在未要求减少动态效果时启用 CSS View Transitions。根页离场为 180ms 的轻微左移与淡出，入场为 260ms 的轻微右移与淡入；共享地点标题的时长为 320ms。首页进入独立文章时，脚本仅为所选地点赋予 `place-title`；独立文章之间的前后篇也共享同名地点标题。返回首页当前只使用根页过渡，不声明双向共享标题。

地点字幕在变化时采用 240ms 的轻微纵向位移与显现；道路标记和填充在位置变化时采用 280ms 过渡。链接和按钮的颜色反馈为 140ms。空间动效使用源码中的 `--ease-out`，没有需要常驻运行的动画计时器。

启用减少动态效果时，跨页 View Transitions 关闭，字幕动画和道路过渡停用，锚点导航立即定位；地点文字、选中状态和普通链接继续工作。不支持 API 或无 JavaScript 时，全部正文与导航仍由静态 HTML 提供。这些为源码已接线行为，尚未作浏览器交互验收。

## Do's and Don'ts

### Do:

- **Do** 保留浅色阅读正文、深松绿刊头与车灯黄状态的职责分工。
- **Do** 保持系统字体栈、可见键盘焦点、原生链接和手机原生 details 目录。
- **Do** 让地点字幕、阅读序号、目录选中和道路标记从同一阅读位置更新。
- **Do** 将完整正文和所有独立文章链接保留在构建后的 HTML 中。
- **Do** 保留“金锺”的写法、末尾第二篇中环及其不同 slug；以构建脚本的 ROUTE 为唯一顺序来源。
- **Do** 将新验证写明为源码、构建或实际浏览器证据；视觉未验时保持未验状态。

### Don't:

- **Don't** 引入持续自动滚动、循环播放、自动翻篇或歌曲音频。
- **Don't** 用动画或 JavaScript 初始化隐藏默认正文。
- **Don't** 把阅读序列改写为精确交通路线、距离或车速，也不恢复已被替代的 40 城方案。
- **Don't** 将生成散文标为亲历游记，或补入未经提供的歌词、照片、作者身份与发布日期。
- **Don't** 将标题共享过渡描述成全部往返方向都已接通；返回首页当前只有根页过渡。
- **Don't** 从 sidecar 推导不存在的输入框、卡片、色阶或阴影 token；以后扩展须以实际实现更新。
