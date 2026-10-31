#!/usr/bin/env python3
"""Build the ordered journal with the Python standard library."""

from __future__ import annotations

import hashlib
import html
import json
from datetime import datetime
from pathlib import Path
import re
import shutil
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public"
ORIGIN = "https://journal.fuyaoskyrocket.ing"
BUILD_YEAR = datetime.now(ZoneInfo("Asia/Shanghai")).year
ROUTE = [
    ("chaiwan", "柴湾"), ("beijiao", "北角"), ("tongluowan", "铜锣湾"),
    ("wanzai", "湾仔"), ("zhonghuan", "中环"), ("jinzhong", "金锺"),
    ("jianshazui", "尖沙咀"), ("youmadi", "油麻地"), ("wangjiao", "旺角"),
    ("taizi", "太子"), ("jiulongtang", "九龙塘"), ("shatian", "沙田"),
    ("shangshui", "上水"), ("luohu", "罗湖"), ("shenzhen", "深圳"),
    ("guangzhou", "广州"), ("xiamen", "厦门"), ("taibei", "台北"),
    ("fuzhou", "福州"), ("nanjing", "南京"), ("shanghai", "上海"),
    ("beijing", "北京"), ("zhonghuan-return", "中环"),
]
ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>'
CAR = '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="5" y="10" width="22" height="13" rx="4" fill="currentColor"/><path d="m11 6-3 4h16l-3-4z" fill="currentColor"/><path d="M11 13h10" stroke="#17382f" stroke-width="2"/><path d="M8 20h3m10 0h3" stroke="#17382f" stroke-width="2"/><circle cx="10" cy="24" r="2" fill="#17382f"/><circle cx="22" cy="24" r="2" fill="#17382f"/></svg>'


def e(value: str) -> str:
    return html.escape(value, quote=True)


def load_entries() -> list[dict]:
    entries: dict[str, dict] = {}
    for name in ("island.json", "kowloon-north.json", "beyond.json"):
        batch = json.loads((ROOT / "content" / name).read_text(encoding="utf-8"))
        if not isinstance(batch, list):
            raise ValueError(f"{name}: expected a list of essays")
        for entry in batch:
            slug = entry["slug"]
            if slug in entries or not re.fullmatch(r"[a-z]+(?:-[a-z]+)*", slug):
                raise ValueError(f"Duplicate or invalid slug: {slug}")
            if not entry["title"] or not entry["dek"]:
                raise ValueError(f"Missing title or introduction: {slug}")
            paragraphs = entry["paragraphs"]
            if not isinstance(paragraphs, list) or len(paragraphs) != 3 or not all(isinstance(p, str) and p.strip() for p in paragraphs):
                raise ValueError(f"Expected three complete paragraphs: {slug}")
            entries[slug] = entry
    if set(entries) != {slug for slug, _ in ROUTE}:
        raise ValueError("Content does not match the requested route")
    for slug, city in ROUTE:
        if entries[slug]["city"] != city:
            raise ValueError(f"Place label differs from the requested spelling: {slug}")
    return [entries[slug] for slug, _ in ROUTE]


def url(entry: dict) -> str:
    return f'/places/{entry["slug"]}/'


def document(title: str, description: str, body: str, path: str, assets: dict, position: tuple[str, str] = ("柴湾", "01 / 23")) -> str:
    place, progress = position
    return f'''<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#17382f">
  <meta name="description" content="{e(description)}">
  <meta name="referrer" content="same-origin">
  <title>{e(title)} · Journal 沿途随记</title>
  <link rel="canonical" href="{ORIGIN}{e(path)}">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="{assets['css']}">
  <script src="{assets['js']}" defer></script>
</head>
<body id="top">
  <a class="skip-link" href="#main">跳到正文</a>
  <header class="masthead">
    <div class="wrap masthead-inner">
      <a class="wordmark" href="/" aria-label="Journal 沿途随记首页">Journal</a>
      <div class="top-position" aria-label="阅读位置"><span data-current-place>{e(place)}</span><span data-current-position>{e(progress)}</span></div>
      <nav class="site-nav" aria-label="主导航"><a href="/#route">沿途目录</a><a href="/about/">关于文字</a></nav>
    </div>
  </header>
  {body}
  <footer class="site-footer">
    <div class="wrap footer-inner">
      <a class="footer-signature" href="/">Journal</a>
      <nav class="footer-nav" aria-label="页尾导航"><a href="/about/">关于文字</a><a href="#top">回到页首</a></nav>
    </div>
    <div class="wrap footer-meta">
      <p>© 2016 - {BUILD_YEAR} <a href="https://fuyaoskyrocket.ing/">扶摇skyrocketing</a></p>
      <p><a href="https://status.fuyaoskyrocket.ing/">服务状态</a> · 部署于阿里云</p>
    </div>
  </footer>
</body>
</html>
'''


def route_list(entries: list[dict]) -> str:
    links = []
    for index, entry in enumerate(entries, 1):
        name = entry["city"]
        label = f'{index:02d} · {name}' + ("，再到中环" if index == len(entries) else "")
        links.append(f'<li><a href="#{entry["slug"]}" data-route-link aria-label="{e(label)}"><span class="route-number" aria-hidden="true">{index:02d}</span><span class="route-label">{e(name)}</span></a></li>')
    return '<ol class="route-list">' + "".join(links) + '</ol>'


def prose(entry: dict) -> str:
    return "\n".join(f'<p>{e(p)}</p>' for p in entry["paragraphs"])


def homepage(entries: list[dict]) -> str:
    index = route_list(entries)
    chapters = []
    for i, entry in enumerate(entries):
        chapters.append(f'''<article class="chapter" id="{entry['slug']}" data-stop data-stop-index="{i}" data-stop-label="{e(entry['city'])}" tabindex="-1" aria-labelledby="title-{entry['slug']}">
          <h2 class="chapter-heading" id="title-{entry['slug']}"><span class="chapter-place"><span class="chapter-number">{i+1:02d}</span><span class="place-name">{e(entry['city'])}</span></span><span class="chapter-title">{e(entry['title'])}</span></h2>
          <div class="chapter-content"><p class="chapter-dek">{e(entry['dek'])}</p><div class="prose">{prose(entry)}</div><a class="chapter-link" data-article-link href="{url(entry)}">单独阅读这篇</a></div>
        </article>''')
    return f'''<main id="main">
    <section class="cover" aria-labelledby="page-title"><div class="wrap cover-grid">
      <div class="cover-copy"><h1 id="page-title">沿途随记</h1><p>从柴湾出发，在中环收笔。<br>让地名带路，把经过的地方读成一页。<br>二十三篇短文，沿着《飞车》的名字往前。</p><a class="begin-link" href="#chaiwan" data-route-link>从柴湾读起 {ARROW}</a></div>
      <div class="route-window" aria-label="沿途阅读字幕">
        <div class="window-head"><span>正在读的地方</span><span data-current-position>01 / 23</span></div>
        <div class="destination"><span class="destination-name" data-current-place>柴湾</span><div class="route-controls" data-route-controls hidden><button type="button" data-route-prev aria-label="读上一处" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20 12H5m6-6-6 6 6 6"/></svg></button><button type="button" data-route-next aria-label="读下一处">{ARROW}</button></div></div>
        <div class="road" data-road aria-hidden="true"><span class="road-fill"></span><span class="road-marker" data-road-marker>{CAR}</span></div>
        <div class="road-endpoints"><span>柴湾</span><span>再到中环</span></div>
        <p class="visually-hidden" data-route-status role="status" aria-live="polite"></p>
      </div>
    </div></section>
    <div class="wrap journal-layout" id="route">
      <aside class="itinerary" aria-labelledby="itinerary-title"><h2 id="itinerary-title">沿途目录</h2><nav aria-label="全部地点">{index}</nav></aside>
      <details class="mobile-index"><summary>展开沿途目录 · 23 篇</summary><nav aria-label="手机地点目录">{index}</nav></details>
      <div class="chapters">{"".join(chapters)}<div class="reading-close"><p>又到中环。字句停在这里，街上的灯还亮着。</p><a href="#chaiwan" data-route-link>回到柴湾，再读一遍</a></div></div>
    </div>
  </main>'''


def article(entry: dict, index: int, entries: list[dict]) -> str:
    neighbors = []
    if index > 0:
        previous = entries[index-1]
        neighbors.append(f'<a href="{url(previous)}" rel="prev"><small>上一篇 · {e(previous["city"])}</small><span>{e(previous["title"])}</span></a>')
    else:
        neighbors.append('<a href="/#route"><small>从这里出发</small><span>打开沿途目录</span></a>')
    if index+1 < len(entries):
        following = entries[index+1]
        neighbors.append(f'<a href="{url(following)}" rel="next"><small>下一篇 · {e(following["city"])}</small><span>{e(following["title"])}</span></a>')
    else:
        neighbors.append(f'<a href="{url(entries[0])}"><small>这一程读完了</small><span>回到起点 · 柴湾</span></a>')
    return f'''<main id="main" class="wrap">
      <nav class="breadcrumbs" aria-label="当前位置"><ol><li><a href="/#{entry['slug']}">回到沿途阅读</a></li><li aria-current="page">{index+1:02d} / 23 · {e(entry['city'])}</li></ol></nav>
      <article class="reading-page">
        <h1 class="article-heading"><span class="place-name">{e(entry['city'])}</span><span class="story-title">{e(entry['title'])}</span></h1>
        <p class="dek">{e(entry['dek'])}</p><div class="prose">{prose(entry)}</div>
        <div class="article-end"><a href="/#{entry['slug']}">回到这一页在路线中的位置</a><nav class="neighbor-links" aria-label="前后篇随记">{"".join(neighbors)}</nav></div>
      </article>
    </main>'''


def write_page(path: str, text: str) -> None:
    target = OUT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")


def main() -> None:
    entries = load_entries()
    if OUT.is_symlink():
        raise ValueError("Refusing to replace a symlinked build directory")
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "assets").mkdir(parents=True)
    assets = {}
    for ext in ("css", "js"):
        data = (ROOT / f"src/site.{ext}").read_bytes()
        path = f'/assets/site.{hashlib.sha256(data).hexdigest()[:12]}.{ext}'
        (OUT / path.lstrip("/")).write_bytes(data)
        assets[ext] = path
    write_page("assets/favicon.svg", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="#17382f"/><text x="24" y="35" text-anchor="middle" font-family="Georgia,serif" font-size="37" fill="#f0cb72">J</text></svg>\n')
    write_page("index.html", document("沿途随记", "从柴湾到中环，23 篇地点短随笔。以罗大佑《飞车》里的地名为灵感，沿街区与城市慢慢读下去。", homepage(entries), "/", assets))
    for index, entry in enumerate(entries):
        write_page(f'places/{entry["slug"]}/index.html', document(f'{entry["city"]} · {entry["title"]}', entry["dek"], article(entry, index, entries), url(entry), assets, (entry["city"], f'{index+1:02d} / {len(entries)}')))
    about = '''<main id="main" class="wrap standalone"><h1>关于这些文字</h1><div class="prose">
      <p>Journal 的这一组随记，以罗大佑《飞车》中的地名为灵感。从柴湾、北角、铜锣湾写起，经过街区与城市，最后再回到中环。这里的顺序是一条阅读线索，不是交通线路。</p>
      <p>二十三篇短文，落在二十二个不同的地方。中环出现两次，末尾的一篇另作收笔。同一个名字，可以容得下另一页。</p>
      <p>随笔由生成式工具创作并整理，属于城市与街区主题的文学想象，不是亲历游记、现场采访或出行指南。本站不播放歌曲，也不转载歌词。</p>
      <p>可以从头往下读，也可以在目录里选一个地点。每篇都有独立页面，读到哪里，就从哪里接着翻。</p>
    </div><a class="text-link" href="/#chaiwan">从柴湾读起</a></main>'''
    write_page("about/index.html", document("关于这些文字", "Journal 沿途随记的灵感、内容说明与阅读方式。", about, "/about/", assets, ("关于文字", "")))
    missing = '''<main id="main" class="wrap standalone"><h1>这一页不在沿途</h1><div class="prose"><p>地址可能有误，或者这一页已经移走。沿途目录里的二十三篇随记仍在原处。</p></div><a class="text-link" href="/#route">返回沿途目录</a></main>'''
    write_page("404.html", document("页面未找到", "回到 Journal 沿途目录，继续阅读。", missing, "/404.html", assets, ("页面未找到", "")))
    pages = list(OUT.rglob("*.html"))
    size = sum(p.stat().st_size for p in OUT.rglob("*") if p.is_file())
    print(f"Built {len(entries)} essays in the requested order; {len(pages)} HTML pages, {size:,} bytes.")


if __name__ == "__main__":
    main()
