#!/usr/bin/env python3
"""Build the single-screen journal and its place-specific scene strip."""

from __future__ import annotations

from datetime import datetime
import hashlib
import html
import json
from pathlib import Path
import re
import shutil
import struct
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public"
ORIGIN = "https://journal.fuyaoskyrocket.ing"
YEAR = datetime.now(ZoneInfo("Asia/Shanghai")).year
ROUTE = [
    ("chai-wan", "柴湾", "Chai Wan"), ("north-point", "北角", "North Point"),
    ("causeway-bay", "铜锣湾", "Causeway Bay"), ("wan-chai", "湾仔", "Wan Chai"),
    ("central", "中环", "Central"), ("admiralty", "金钟", "Admiralty"),
    ("tsim-sha-tsui", "尖沙咀", "Tsim Sha Tsui"), ("yau-ma-tei", "油麻地", "Yau Ma Tei"),
    ("mong-kok", "旺角", "Mong Kok"), ("prince-edward", "太子", "Prince Edward"),
    ("kowloon-tong", "九龙塘", "Kowloon Tong"), ("sha-tin", "沙田", "Sha Tin"),
    ("sheung-shui", "上水", "Sheung Shui"), ("lo-wu", "罗湖", "Lo Wu"),
    ("shenzhen", "深圳", "Shenzhen"), ("guangzhou", "广州", "Guangzhou"),
    ("xiamen", "厦门", "Xiamen"), ("taipei", "台北", "Taipei"),
    ("fuzhou", "福州", "Fuzhou"), ("nanjing", "南京", "Nanjing"),
    ("shanghai", "上海", "Shanghai"), ("beijing", "北京", "Beijing"),
    ("central-return", "中环", "Central"),
]


def e(value: str) -> str:
    return html.escape(value, quote=True)


def entries() -> list[dict]:
    by_id = {}
    for name in ("island.json", "kowloon-north.json", "beyond.json"):
        for entry in json.loads((ROOT / "content" / name).read_text(encoding="utf-8")):
            identity = entry["id"]
            if identity in by_id or not re.fullmatch(r"[a-z]+(?:-[a-z]+)*", identity):
                raise ValueError(f"Duplicate or invalid place identifier: {identity}")
            for key in ("name", "title", "dek"):
                if set(entry[key]) != {"zh", "en"} or not all(entry[key].values()):
                    raise ValueError(f"Missing bilingual {key}: {identity}")
            for language in ("zh", "en"):
                paragraphs = entry["paragraphs"][language]
                if len(paragraphs) != 3 or not all(isinstance(p, str) and p.strip() for p in paragraphs):
                    raise ValueError(f"Incomplete {language} prose: {identity}")
            by_id[identity] = entry
    if set(by_id) != {identity for identity, _, _ in ROUTE}:
        raise ValueError("Content differs from the agreed route")
    for identity, zh, en in ROUTE:
        if by_id[identity]["name"] != {"zh": zh, "en": en}:
            raise ValueError(f"Unexpected place spelling: {identity}")
    return [by_id[identity] for identity, _, _ in ROUTE]


def asset(data: bytes, name: str) -> str:
    source = Path(name)
    filename = f"{source.stem}.{hashlib.sha256(data).hexdigest()[:12]}{source.suffix}"
    (OUT / "assets" / filename).write_bytes(data)
    return "/assets/" + filename


def icon(name: str) -> str:
    paths = {
        "right": '<path d="M4 12h15m-6-6 6 6-6 6"/>',
        "left": '<path d="M20 12H5m6-6-6 6 6 6"/>',
        "close": '<path d="m6 6 12 12M6 18 18 6"/>',
        "boost": '<path d="m4 5 7 7-7 7m8-14 7 7-7 7"/>',
        "route": '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h9a4 4 0 0 1 0 8H8a4 4 0 0 0 0 6h9"/>',
        "book": '<path d="M12 5v15M3 4h4c3 0 5 2 5 2s2-2 5-2h4v15h-4c-3 0-5 2-5 2s-2-2-5-2H3z"/>',
        "info": '<circle cx="12" cy="12" r="9"/><path d="M12 10v7m0-11v1"/>',
    }
    return f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths[name]}</svg>'


def page_controls(prefix: str, count: str) -> str:
    return f'''<div class="page-controls"><button type="button" id="{prefix}-prev" data-action="{prefix}-prev" data-i18n-label="prevPage" aria-label="Previous page">{icon('left')}</button><span class="page-count" id="{prefix}-count">{count}</span><button type="button" id="{prefix}-next" data-action="{prefix}-next" data-i18n-label="nextPage" aria-label="Next page">{icon('right')}</button></div>'''


def close_button() -> str:
    return f'<button type="button" class="close-button" data-action="close" data-i18n-label="close" aria-label="Close">{icon("close")}</button>'


def place_strip(data: list[dict]) -> str:
    buttons = []
    for index, entry in enumerate(data):
        current = ' aria-current="location"' if index == 0 else ''
        buttons.append(f'<button type="button" class="place-button" data-stop="{index}" data-needs-game disabled aria-label="{index + 1} / {len(data)} · {e(entry["name"]["en"])}"{current}><span data-place-name>{e(entry["name"]["en"])}</span></button>')
    return '<nav class="place-strip" id="place-strip" data-i18n-label="allStops" aria-label="All stops">' + ''.join(buttons) + '</nav>'


def document(data: list[dict], assets: dict) -> str:
    payload = json.dumps({"entries": data, "assets": assets}, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    first = data[0]
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#081d29">
  <meta name="description" content="A single-screen night drive through 23 stops, with city notes in English and Simplified Chinese.">
  <meta name="referrer" content="same-origin">
  <title>Journal · Along the Way</title>
  <link rel="canonical" href="{ORIGIN}/">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="{assets['background']}" as="image">
  <link rel="stylesheet" href="{assets['css']}">
  <script type="module" src="{assets['app']}"></script>
</head>
<body>
  <div class="viewport-app" id="game-shell">
    <header class="topbar">
      <div class="identity"><h1><a class="wordmark" href="/" aria-label="Journal">JOURNAL</a></h1></div>
      <nav class="top-actions" data-i18n-label="pageActions" aria-label="Page actions"><button type="button" class="quiet-button autoplay-button" id="autoplay-button" data-action="autoplay" data-needs-game disabled aria-pressed="false" aria-label="Auto play"><span id="autoplay-label">Auto play</span></button><button type="button" class="quiet-button language-button" data-action="language" data-i18n-label="languageLabel" aria-label="Switch to Simplified Chinese"><span data-i18n="language">简体中文</span></button></nav>
    </header>
    {place_strip(data)}
    <main class="game-stage" id="game-stage" data-i18n-label="stageLabel" aria-label="A city night scene with a car travelling from left to right">
      <img class="scene-background" id="scene-background" src="{assets['background']}" alt="" aria-hidden="true">
      <canvas class="road-canvas" id="road-canvas" width="1400" height="700" aria-hidden="true"></canvas>
      <div class="scene-shade" aria-hidden="true"></div>
      <div class="stage-effects" aria-hidden="true"><div class="light-sweep"></div><div class="speed-frame"></div><div class="arrival-flare"></div></div>
      <div class="scene-heading"><h2 id="current-place">Chai Wan</h2></div>
      <div class="station-position" id="station-position" data-i18n-label="currentStop" aria-label="Current stop">01 / 23</div>
      <div class="next-sign"><span id="next-label">Next stop</span><strong id="next-place">North Point</strong></div>
      <p class="startup-message" id="startup-message" hidden></p>
      <noscript><section class="no-script"><h2>Enable JavaScript</h2><p>Enable JavaScript and reload this page to drive and read.</p></section></noscript>
    </main>
    <section class="drive-console" data-i18n-label="controls" aria-label="Driving controls">
      <div class="transport"><button type="button" class="icon-button" id="previous-stop" data-action="previous-stop" data-i18n-label="previousStop" aria-label="Previous stop" data-needs-game disabled>{icon('left')}</button><button type="button" class="drive-button" id="drive-button" data-action="drive" data-needs-game disabled aria-pressed="false">{icon('right')}<span id="drive-label">Next stop</span></button><button type="button" class="boost-button" id="boost-button" data-i18n-label="boostLabel" aria-label="Hold to boost while driving" data-needs-game disabled aria-pressed="false">{icon('boost')}<span data-i18n="boost">Hold to boost</span></button></div>
      <div class="journey-info"><progress id="journey-progress" max="22" value="0" data-i18n-label="progress" aria-label="Journey progress"></progress></div>
      <div class="secondary-actions"><button type="button" class="secondary-button route-button" data-action="route" data-i18n-label="route" aria-label="Choose a stop" data-i18n-title="route" title="Choose a stop" data-needs-game disabled>{icon('route')}<span class="button-copy" data-i18n="routeTitle">Stops</span></button><button type="button" class="secondary-button read-button" data-action="read" data-i18n-label="read" aria-label="Read note" data-needs-game disabled>{icon('book')}<span data-i18n="read">Read note</span></button><button type="button" class="icon-button" data-action="about" data-i18n-label="about" aria-label="Controls and about" data-i18n-title="about" title="Controls and about">{icon('info')}</button></div>
    </section>
    <footer class="site-footer"><p>© 2016 - {YEAR} <a href="https://fuyaoskyrocket.ing/">扶摇skyrocketing</a></p><p><a href="https://status.fuyaoskyrocket.ing/" data-i18n="serviceStatus">Service status</a> · <span data-i18n="hosting">Deployed on Aliyun</span></p></footer>
  </div>

  <dialog id="reader-dialog" aria-labelledby="reader-title" aria-describedby="reader-text">
    <div class="modal-panel"><header><div class="modal-topline"><p class="reader-place" id="reader-place">Chai Wan</p><div class="modal-actions"><button type="button" class="quiet-button" data-action="language" data-i18n-label="languageLabel" aria-label="Switch to Simplified Chinese"><span data-i18n="language">简体中文</span></button>{close_button()}</div></div><h2 class="modal-heading" id="reader-title">{e(first['title']['en'])}</h2></header><div class="reader-body" id="reader-body"><p class="reader-text" id="reader-text"></p></div><footer class="modal-footer">{page_controls('reader','Page 1 / 3')}<button type="button" class="reader-close" data-action="close" data-i18n="continue">Back to journey</button></footer></div>
  </dialog>
  <dialog id="route-dialog" aria-labelledby="route-title">
    <div class="modal-panel route-panel"><header class="modal-topline"><h2 class="modal-heading" id="route-title" data-i18n="routeTitle">Stops</h2>{close_button()}</header><div class="route-grid" id="route-grid"></div><footer class="modal-footer">{page_controls('route','Stops page 1 / 3')}</footer></div>
  </dialog>
  <dialog id="about-dialog" aria-labelledby="about-title">
    <div class="modal-panel"><header><div class="modal-topline"><h2 class="modal-heading" id="about-title" data-i18n="aboutTitle">Controls</h2>{close_button()}</div></header><div class="reader-body" id="about-body"><p class="reader-text" id="about-text"></p></div><footer class="modal-footer">{page_controls('about','About 1 / 3')}</footer></div>
  </dialog>
  <p class="visually-hidden" id="announcer" role="status" aria-live="polite"></p>
  <script id="journal-data" type="application/json">{payload}</script>
</body>
</html>
'''


def scene_catalog() -> dict[str, dict]:
    result = {}
    expected = {"central" if identity == "central-return" else identity for identity, _, _ in ROUTE}
    for path in (ROOT / "assets/scenes").glob("*-provenance.json"):
        for record in json.loads(path.read_text())["assets"]:
            identity = record["id"]
            if identity in result or identity not in expected:
                raise ValueError(f"Duplicate or unexpected scene metadata: {identity}")
            if record["source"] != f"{identity}.png" or record["delivery"] != f"{identity}.webp":
                raise ValueError(f"Invalid scene filename: {identity}")
            image = ROOT / "assets/scenes" / record["delivery"]
            if not image.is_file() or record["height"] < 1024:
                raise ValueError(f"Scene unavailable or insufficient native resolution: {identity}")
            with (ROOT / "assets/scenes" / record["source"]).open("rb") as native:
                header = native.read(24)
            if header[:8] != b"\x89PNG\r\n\x1a\n" or struct.unpack(">II", header[16:24]) != (record["width"], record["height"]):
                raise ValueError(f"Native image dimensions differ from metadata: {identity}")
            ground = record.get("groundY")
            if not isinstance(ground, (int, float)) or isinstance(ground, bool) or not 0 < ground < 1:
                raise ValueError(f"Missing or invalid road anchor: {identity}")
            result[identity] = record
    missing = sorted(expected - result.keys())
    if missing:
        raise ValueError("Missing place scenes: " + ", ".join(missing))
    return result


def main() -> None:
    data = entries()
    scenes = scene_catalog()
    if OUT.is_symlink():
        raise ValueError("Refusing to replace a symlinked output directory")
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "assets").mkdir(parents=True)
    scene_urls = {identity: asset((ROOT / "assets/scenes" / record["delivery"]).read_bytes(), record["delivery"]) for identity, record in scenes.items()}
    backgrounds = []
    for identity, _, _ in ROUTE:
        scene_id = "central" if identity == "central-return" else identity
        record = scenes[scene_id]
        backgrounds.append({"id": identity, "url": scene_urls[scene_id], "width": record["width"], "height": record["height"], "groundY": record["groundY"]})
    assets = {"background": backgrounds[0]["url"], "backgrounds": backgrounds, "car": asset((ROOT / "assets/night-coupe.webp").read_bytes(), "night-coupe.webp")}
    font = asset((ROOT / "assets/fonts/BarlowCondensed-ExtraBoldItalic.ttf").read_bytes(), "road-sign.ttf")
    assets["css"] = asset((ROOT / "src/site.css").read_text().replace("__FONT_URL__", font).encode(), "site.css")
    dependencies = {}
    for name in ("scene-strip.mjs", "drive-engine.mjs", "i18n.mjs", "pagination.mjs", "autoplay.mjs", "app.mjs"):
        code = (ROOT / "src" / name).read_text()
        for dependency, path in dependencies.items():
            code = code.replace(f'"./{dependency}"', f'"./{Path(path).name}"')
        dependencies[name] = asset(code.encode(), name)
    assets["app"] = dependencies["app.mjs"]
    (OUT / "index.html").write_text(document(data, assets), encoding="utf-8")
    (OUT / "assets/favicon.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="6" fill="#081d29"/><path d="M15 12h18v16c0 8-5 11-11 11-6 0-10-3-10-9h7c0 2 1 3 3 3 3 0 4-2 4-5V18H15z" fill="#f2cb75"/></svg>\n')
    (OUT / "assets/OFL.txt").write_bytes((ROOT / "assets/fonts/OFL.txt").read_bytes())
    (OUT / "404.html").write_text(f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Return to Journal</title><link rel="stylesheet" href="{assets['css']}"></head><body><main class="no-script"><h1>Page not found</h1><a href="/">Return to Journal</a></main></body></html>''', encoding="utf-8")
    print(f"Built one-screen app: {len(data)} bilingual notes, {len(set(x['name']['en'] for x in data))} places, {sum(1 for p in OUT.rglob('*') if p.is_file())} public files.")


if __name__ == "__main__":
    main()
