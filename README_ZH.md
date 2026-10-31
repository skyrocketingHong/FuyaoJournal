<p align="center"><a href="README.md">English</a> · <a href="README_ZH.md">简体中文</a></p>
<h1 align="center">FuyaoJournal</h1>
<p align="center">向右出发，停下来读一页。固定一屏的双语夜行小游戏。</p>
<p align="center"><a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0--only-blue.svg" alt="许可证：AGPL-3.0-only"></a></p>

Journal 将横向驾驶场景与 23 篇地点随笔放在同一屏幕中，涉及 22 个不同地点。最后一篇中环另文收尾。文章为生成的文学想象，不是亲历游记或交通指南。

## 已实现功能

- 固定视口，网页不滚动；阅读和地点选择均通过分页完成。
- 车辆从左向右前进，到下一站自动停靠，可暂停、继续及按住加速。
- 支持键盘和触屏；页面失焦或进入后台时暂停动画。
- 默认简体中文，提供完整英文界面及全部 23 篇随笔译文；语言切换保留地点与阅读段落。
- 地点标识使用通行英文名称，如 North Point、Causeway Bay、Admiralty、Central 和 Taipei。
- 原创分层夜景与透明车辆素材；减少动态效果时保留进度，减少空间运动。
- 素材与字体同源，不含统计脚本、音频或远程运行依赖。
- 关于面板提供完整双语文本下载与 AGPL 对应源码包。

## 构建与预览

使用 Python 3.10 或更新版本构建，无需额外 Python 包；Node.js 18 或更新版本可运行逻辑测试。

```sh
python3 scripts/build.py
node --test tests/*.test.mjs
python3 -m http.server 8000 --directory public
```

构建会在 `public/` 生成应用、错误页、带哈希的资源、完整双语文本及 `source.zip`。打开 `http://localhost:8000` 预览，按 `Ctrl+C` 停止服务。生成目录可以删除后重建。缺少翻译、段落不完整或地点标识不匹配时，构建会报错。

## 操作方式

| 操作 | 控件 |
| --- | --- |
| 前往下一站 | 前进按钮或右方向键 |
| 暂停或继续 | 前进按钮或空格键 |
| 行驶中加速 | 按住加速按钮或 Shift |
| 返回上一站 | 停靠时使用上一站按钮或左方向键 |
| 阅读或选择地点 | 随笔与地点按钮 |
| 阅读翻页 | 翻页按钮，或阅读面板内的左右方向键 |
| 关闭面板 | 关闭按钮或 Escape |

驾驶与交互分页需要 JavaScript。关闭脚本时，仍可下载完整的中英双语随笔文本。

## 项目结构

```text
content/                 双语地名、标题与完整正文
assets/                  原创美术、本地字体及许可证
src/app.mjs              界面、语言、面板与位置保存
src/drive-engine.mjs     驾驶状态模型与 Canvas 渲染
src/pagination.mjs      文本分页与阅读位置映射
src/i18n.mjs             界面翻译
src/site.css             固定视口布局与视觉系统
scripts/build.py        有序路线、HTML、资源与源码包构建
public/                  生成的部署文件，不纳入 Git
```

`ROUTE` 定义地点顺序。ID 使用通行英文地名，末尾中环采用 `central-return`。香港地名参考[港铁官方英文站名](https://www.mtr.com.hk/en/customer/services/system_map.html)。

## 验证与部署

逻辑测试覆盖前进、暂停、加速、路线边界、后台暂停、回退调度、文本完整性和双语阅读位置映射；源码检查覆盖 DOM 标识、翻译键、产物链接与源码包允许列表。上述检查不能证明视觉质量或设备帧率，浏览器与视觉验收仍由人工完成。

仅发布 `public/`。源码包包含重建所需的代码、内容、美术和许可证，不包含私有部署记录、凭据、项目工作约定或设计过程文件。部署时保留上一版本以便回滚。

## 素材与许可证

夜景与车辆为生成的原创游戏素材。Barlow Condensed 按 SIL Open Font License 在本地提供，许可文本见 `assets/fonts/OFL.txt`；其他文字采用系统字体。

本项目采用 GNU Affero General Public License v3.0 许可证（SPDX：`AGPL-3.0-only`），完整条款见 [LICENSE](LICENSE)。

本项目在开发过程中使用生成式 AI 协助编码。

![Vibe PR](https://raw.githubusercontent.com/fenxer/llm-things/main/stickers/vibe-pr.svg)
