<p align="center"><a href="README.md">English</a> · <a href="README_ZH.md">简体中文</a></p>
<h1 align="center">FuyaoJournal</h1>
<p align="center">A one-screen driving game with bilingual place essays.</p>
<p align="center"><a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0--only-blue.svg" alt="License: AGPL-3.0-only"></a></p>

Journal combines a side-scrolling driving scene with 23 literary notes about 22 places. The final Central entry is a separate closing piece. The essays are generated literary imaginings, not firsthand travel reports or transport advice.

## Features

- A fixed viewport with no document scrolling. Reading and stop selection use pages rather than scrollable panels.
- Drive to the right and stop automatically at the next place; pause, resume, or hold the boost control.
- Keyboard and touch controls; the animation pauses when the page loses focus or becomes hidden.
- English on every page load, regardless of browser, system, or previously saved language settings. Simplified Chinese is available for the current page only; language changes retain the current place and reading paragraph.
- Standard English place identifiers, including North Point, Causeway Bay, Admiralty, Central, and Taipei.
- Twenty-two original 1536×1024 place scenes form a continuous route, with individual road anchors, feathered overlaps between neighbouring scenes, and a bounded image cache. The return to Central reuses its matching scene.
- The complete stop strip stays at the top and wraps with the viewport; every stop is selectable.
- Every start of Auto play returns to the first stop and travels the full route, with a short dwell at each stop, ending at the destination. Panels, manual advance or pause, stop selection, and leaving the page stop it. Holding boost changes speed without turning auto play off.
- One visible reading action, including on narrow screens; controls and content information are available from the info button.
- Light trails, road reflections, boost afterimages, and arrival rings respond to driving; the header, controls, panels, and page turns use matching transitions.
- A transparent vehicle sprite and reduced-motion settings preserve progress with less spatial movement. Driving effects freeze on pause, page motion freezes on loss of focus, and the Canvas loop sleeps after arrival effects finish.
- Local assets and fonts, without analytics, audio, or remote runtime dependencies.

## Build and preview

Python 3.10 or newer builds the site without additional packages. Node.js 18 or newer runs the logic tests.

```sh
python3 scripts/build.py
node --test tests/*.test.mjs
python3 -m http.server 8000 --directory public
```

The build creates the app, an error page, and hashed assets in `public/`. Preview at `http://localhost:8000`; press `Ctrl+C` to stop the server. The generated output can be removed and rebuilt. Missing translations, incomplete paragraphs, mismatched place identifiers, missing scene images, or invalid road anchors stop the build.

## Controls

| Action | Control |
| --- | --- |
| Travel to the next stop | Drive button or Right Arrow |
| Pause or resume | Drive button or Space |
| Boost while driving | Hold the boost button or Shift |
| Play the full route from the start | Start Auto play in the top bar |
| Return to the previous stop | Previous button or Left Arrow while parked |
| Read or choose a place | Read note and stop-selection buttons |
| View controls and content information | Info button |
| Turn a reading page | Page buttons or Left/Right Arrow in the reader |
| Close a panel | Close button or Escape; Back to journey closes the reader without resuming driving |

JavaScript is required for driving and interactive paging. If it is disabled, the page asks the visitor to enable it. Text and source download endpoints are not published.

## Structure

```text
content/                 Bilingual place names, titles, and complete essays
assets/                  Original artwork, local font, and licenses
src/app.mjs              Interface, language, dialogs, and saved position
src/drive-engine.mjs     Driving state model and Canvas renderer
src/scene-strip.mjs      Continuous place scenes and bounded loading cache
src/autoplay.mjs         Explicit automatic playback and stop handling
src/pagination.mjs      Text pagination and reading-position mapping
src/i18n.mjs             Interface translations
src/site.css             Fixed-viewport layout and visual system
scripts/build.py        Ordered route, HTML, and complete scene validation
public/                  Generated deployment files, ignored by Git
```

The `ROUTE` list defines the order. IDs use conventional English place names; the final Central piece uses `central-return`. Hong Kong names follow the [MTR English station names](https://www.mtr.com.hk/en/customer/services/system_map.html).

## Verification and deployment

Logic tests cover travel, pause, boost, route boundaries, hidden-page behavior, automatic playback, scene geometry and feathering buffers, image caching, effect lifecycle, text preservation, and bilingual reading-position mapping. Source checks also verify DOM identifiers, translation keys, output links, image dimensions, and removed download endpoints. These checks do not establish visual quality or device frame rates; browser and visual acceptance remain manual.

Publish only `public/`. Private deployment records, credentials, project instructions, and design-process files stay outside it. Keep previous deployment releases for rollback.

## Assets and license

The city scene and vehicle are original generated game assets. Barlow Condensed is self-hosted under the SIL Open Font License; its license is in `assets/fonts/OFL.txt`. Other text uses system fonts.

This project is licensed under the GNU Affero General Public License v3.0 (SPDX: `AGPL-3.0-only`). See [LICENSE](LICENSE) for the full terms.

This project was developed with assistance from generative AI.

![Vibe PR](https://raw.githubusercontent.com/fenxer/llm-things/main/stickers/vibe-pr.svg)
