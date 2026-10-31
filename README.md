<p align="center"><a href="README.md">English</a> · <a href="README_ZH.md">简体中文</a></p>
<h1 align="center">FuyaoJournal</h1>
<p align="center">A static Chinese literary journal, following a sequence of places from Chai Wan back to Central.</p>
<p align="center"><a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0--only-blue.svg" alt="License: AGPL-3.0-only"></a></p>

The site contains 23 original generated essays about 22 places, in the specified order inspired by Luo Dayou’s *飞车*. Central appears twice, with a separate closing essay. These pieces are literary imaginings, not firsthand travel reporting or transport advice. No song lyrics or audio are distributed.

## Features

- Read the entire sequence on the homepage or open each essay at its own URL.
- Follow the current place through the reading index, destination display, and vehicle progress marker.
- Use previous and next links, keyboard navigation, or the mobile contents disclosure.
- Keep all text and navigation available without JavaScript. Motion respects the system’s reduced-motion preference.
- Use progressive same-origin page transitions where the browser supports them, with ordinary navigation elsewhere.
- Load only local assets and system fonts, without analytics or third-party requests.

## Build and preview

Python 3.10 or newer is sufficient; no Python packages or JavaScript dependencies are required.

```sh
python3 scripts/build.py
python3 -m http.server 8000 --directory public
```

The build writes 26 HTML pages plus hashed CSS and JavaScript assets to `public/`. Open `http://localhost:8000` to preview, and press `Ctrl+C` to stop the preview server. The generated directory may be deleted and rebuilt. Build validation rejects missing places, duplicate slugs, and incomplete paragraphs.

For a JavaScript syntax check, run `node --check src/site.js`; successful execution prints no error. This does not verify browser behavior.

## Structure

```text
content/             Three ordered groups of original essays
src/site.css         Typography, color, layout, and progressive transitions
src/site.js          Reading position and navigation enhancements
scripts/build.py     Route definition, HTML templates, and static builder
public/              Generated deployment output, ignored by Git
PRODUCT.md           Confirmed scope and content constraints
DESIGN.md            Design system recorded from the implementation
```

The `ROUTE` list in `scripts/build.py` defines the exact order. Place names may repeat; article slugs must remain unique. The final Central essay uses `zhonghuan-return`.

## Deployment and verification

Publish only `public/` to the static website backend. Keep product documents, source content, credentials, and operational records outside the web root. The existing relay remains the public gateway; this project supplies only its ordinary website content.

Source checks cover the complete route, local links and anchors, text contrast calculations, and the public output boundary. HTTP checks and the existing protocol probe are run during deployment. Browser rendering, motion smoothness, and visual acceptance remain manual.

Cross-document transitions follow the [MDN View Transitions guidance](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@view-transition) and are optional enhancements.

## License

This project is licensed under the GNU Affero General Public License v3.0 (SPDX: `AGPL-3.0-only`). See [LICENSE](LICENSE) for the full terms.

This project was developed with assistance from generative AI.

![Vibe PR](https://raw.githubusercontent.com/fenxer/llm-things/main/stickers/vibe-pr.svg)
