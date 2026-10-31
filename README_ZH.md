<p align="center"><a href="README.md">English</a> · <a href="README_ZH.md">简体中文</a></p>
<h1 align="center">FuyaoJournal</h1>
<p align="center">从柴湾写起，再回到中环的静态中文沿途随记。</p>
<p align="center"><a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0--only-blue.svg" alt="许可证：AGPL-3.0-only"></a></p>

站点按指定的《飞车》地名顺序收录 23 篇原创生成随笔，涉及 22 个不同地点。中环出现两次，末篇另文收尾。文章是文学想象，不是亲历游记或交通指南；站点不发布歌曲歌词与音频。

## 已实现功能

- 首页连续阅读全部篇章，各篇也有独立地址。
- 沿途目录、地点字幕和车辆行进标记共同显示当前阅读位置。
- 支持前后篇链接、键盘导航及可展开的手机目录。
- 关闭 JavaScript 仍可阅读全文和使用链接；动效遵循系统的减少动态效果偏好。
- 支持的浏览器可使用同源跨页过渡，其他浏览器正常跳转。
- 全部资源同源，使用系统字体，不包含统计脚本或第三方请求。

## 构建与预览

需要 Python 3.10 或更新版本，无需安装 Python 包或 JavaScript 依赖。

```sh
python3 scripts/build.py
python3 -m http.server 8000 --directory public
```

构建会在 `public/` 生成 26 个 HTML 页面以及带内容哈希的 CSS、JavaScript。打开 `http://localhost:8000` 可预览，按 `Ctrl+C` 结束预览服务。生成目录可删除后重新构建；缺少地点、slug 重复或正文段落不完整时，构建会报错。

JavaScript 语法检查使用 `node --check src/site.js`，成功时没有错误输出。语法检查不能替代浏览器运行验证。

## 项目结构

```text
content/             三组原创地点随笔
src/site.css         字体、配色、布局与渐进式过渡
src/site.js          阅读定位和导航增强
scripts/build.py     路线定义、HTML 模板与静态构建
public/              生成的部署产物，不纳入 Git
PRODUCT.md           已确认范围与内容约束
DESIGN.md            依据实现整理的设计系统
```

`scripts/build.py` 中的 `ROUTE` 定义精确顺序。地点名允许重复，文章 slug 必须唯一；末尾中环使用 `zhonghuan-return`。

## 部署与验证

只将 `public/` 发布到静态网页后端。产品说明、原始内容、凭据和运维记录不进入网站根目录。既有 relay 继续作为公开入口，本项目仅提供普通访问时的网页内容。

源码检查覆盖完整路线、本地链接与锚点、文字对比度计算及公开产物边界。部署时执行 HTTP 检查和既有协议探针。浏览器渲染、动效流畅度及视觉验收仍需人工完成。

跨页过渡参考 [MDN View Transitions 文档](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@view-transition)，作为可降级的增强功能。

## 许可证

本项目采用 GNU Affero General Public License v3.0 许可证（SPDX：`AGPL-3.0-only`），完整条款见 [LICENSE](LICENSE)。

本项目在开发过程中使用生成式 AI 协助编码。

![Vibe PR](https://raw.githubusercontent.com/fenxer/llm-things/main/stickers/vibe-pr.svg)
