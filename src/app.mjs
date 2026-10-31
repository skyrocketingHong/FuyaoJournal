import { DriveEngine } from "./drive-engine.mjs";
import { translate } from "./i18n.mjs";
import { paginateParagraphs, correspondingPage } from "./pagination.mjs";

const config = JSON.parse(document.getElementById("journal-data").textContent);
const entries = config.entries;
const $ = (id) => document.getElementById(id);
const storage = {
  read(key) { try { return localStorage.getItem(key); } catch { return null; } },
  write(key, value) { try { localStorage.setItem(key, value); } catch { /* Storage may be disabled. */ } }
};
let locale = storage.read("journal-language") === "en" ? "en" : "zh";
const t = (key, values) => translate(locale, key, values);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const dialogs = [$('reader-dialog'), $('route-dialog'), $('about-dialog')];
let engine;
let state;
let activeDialog = null;
let returnFocus = null;
let readerEntry = 0;
let readerPage = 0;
let readerPages = [];
let readerParagraphs = [];
let routePage = 0;
let routePageSize = 8;
let aboutPage = 0;
let aboutPages = [];
let aboutParagraphs = [];
let resizeFrame = 0;
let arrivalTimer = 0;
let previousHUD = "";
let sourceIndex = entries.findIndex((entry) => entry.id === decodeHash());
if (sourceIndex < 0) sourceIndex = entries.findIndex((entry) => entry.id === storage.read("journal-stop"));
if (sourceIndex < 0) sourceIndex = 0;
let visited;
try { visited = new Set(JSON.parse(storage.read("journal-visited") ?? "[]").filter((id) => entries.some((entry) => entry.id === id))); }
catch { visited = new Set(); }
visited.add(entries[sourceIndex].id);

function decodeHash() {
  try { return decodeURIComponent(location.hash.slice(1)); } catch { return ""; }
}

function announce(text) { $('announcer').textContent = text; }

function saveStop(index, setHash = true) {
  const id = entries[index].id;
  visited.add(id);
  storage.write("journal-stop", id);
  storage.write("journal-visited", JSON.stringify(Array.from(visited)));
  if (setHash && location.hash !== `#${id}`) history.replaceState(null, "", `#${id}`);
}

function updateHUD(nextState, force = false) {
  state = nextState;
  const index = state.index;
  const entry = entries[index];
  const next = entries[Math.min(index + 1, entries.length - 1)];
  const key = `${index}/${state.driving}/${state.paused}/${state.boost}/${locale}/${visited.size}`;
  const overall = Number.isFinite(state.overall) ? state.overall : index + (state.progress || 0);
  $('journey-progress').value = overall;
  $('game-stage').style.setProperty("--journey-progress", String(overall / Math.max(1, entries.length - 1)));
  if (!force && key === previousHUD) return;
  previousHUD = key;
  $('current-place').textContent = entry.name[locale];
  $('place-subtitle').textContent = locale === "zh" ? entry.name.en : entry.dek.en;
  $('station-position').textContent = `${String(index + 1).padStart(2, "0")} / ${entries.length}`;
  $('next-place').textContent = next.name[locale];
  $('next-label').textContent = t(index === entries.length - 1 ? "lastStop" : "next");
  $('note-title').textContent = entry.title[locale];
  $('visited-count').textContent = t("visited", { count: visited.size, total: entries.length });
  const statusKey = state.paused ? "paused" : state.driving ? "driving" : index === entries.length - 1 ? "completed" : "ready";
  $('drive-status').textContent = t(statusKey);
  $('drive-label').textContent = t(state.driving ? (state.paused ? "resume" : "pause") : index === entries.length - 1 ? "restart" : "drive");
  $('previous-stop').disabled = index === 0 || state.driving;
  $('boost-button').disabled = !state.driving || state.paused;
  $('boost-button').setAttribute("aria-pressed", String(Boolean(state.boost)));
  $('drive-button').setAttribute("aria-pressed", String(state.driving && !state.paused));
  document.body.dataset.driving = String(state.driving && !state.paused);
}

function applyLanguage() {
  document.documentElement.lang = locale === "zh" ? "zh-Hans" : "en";
  document.title = `Journal · ${t("appTitle")}`;
  document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll("[data-i18n-label]").forEach((node) => { node.setAttribute("aria-label", t(node.dataset.i18nLabel)); });
  document.querySelectorAll("[data-action='language']").forEach((node) => { node.setAttribute("lang", locale === "zh" ? "en" : "zh-Hans"); });
  storage.write("journal-language", locale);
  if (state) updateHUD(state, true);
  if (activeDialog === $('reader-dialog')) paginateReader(true);
  if (activeDialog === $('route-dialog')) renderRoute();
  if (activeDialog === $('about-dialog')) paginateAbout(true);
}

function stopBoost() { engine?.setBoost(false); }

function openDialog(dialog) {
  if (activeDialog) closeDialog();
  engine?.pause();
  stopBoost();
  returnFocus = document.activeElement;
  activeDialog = dialog;
  $('game-shell').inert = true;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  dialog.querySelector("button")?.focus({ preventScroll: true });
}

function closeDialog() {
  const closing = activeDialog;
  if (!closing) return;
  activeDialog = null;
  if (typeof closing.close === "function") closing.close();
  else closing.removeAttribute("open");
  $('game-shell').inert = false;
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  returnFocus = null;
}

function fitPages(paragraphs, container, textNode) {
  return paginateParagraphs(paragraphs, (candidate) => {
    textNode.textContent = candidate;
    return textNode.scrollHeight <= Math.max(1, container.clientHeight - 2);
  });
}

function paginateReader(preserve = false) {
  const entry = entries[readerEntry];
  const previousPage = preserve ? readerPages[readerPage] : null;
  const oldParagraphs = readerParagraphs;
  $('reader-place').textContent = entry.name[locale];
  $('reader-title').textContent = entry.title[locale];
  readerParagraphs = entry.paragraphs[locale];
  readerPages = fitPages(readerParagraphs, $('reader-body'), $('reader-text'));
  readerPage = correspondingPage(readerPages, readerParagraphs, previousPage, oldParagraphs);
  renderReader();
}

function renderReader() {
  $('reader-text').textContent = readerPages[readerPage]?.text ?? "";
  $('reader-count').textContent = t("readerPage", { current: readerPage + 1, total: readerPages.length });
  $('reader-prev').disabled = readerPage === 0;
  $('reader-next').disabled = readerPage + 1 >= readerPages.length;
}

function turnReader(direction) {
  readerPage = Math.max(0, Math.min(readerPages.length - 1, readerPage + direction));
  renderReader();
  announce($('reader-count').textContent);
}

function openReader() {
  readerEntry = state.index;
  readerPage = 0;
  readerPages = [];
  readerParagraphs = [];
  openDialog($('reader-dialog'));
  paginateReader();
}

function renderRoute() {
  const grid = $('route-grid');
  const baseSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const columns = Math.max(1, Math.min(3, Math.floor(grid.clientWidth / (baseSize * 8.5))));
  const rows = Math.max(1, Math.min(4, Math.floor(grid.clientHeight / (baseSize * 4))));
  routePageSize = columns * rows;
  routePage = Math.min(routePage, Math.ceil(entries.length / routePageSize) - 1);
  grid.style.setProperty("--route-columns", String(columns));
  grid.replaceChildren();
  entries.slice(routePage * routePageSize, (routePage + 1) * routePageSize).forEach((entry, localIndex) => {
    const index = routePage * routePageSize + localIndex;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stop-option";
    button.dataset.stop = String(index);
    button.setAttribute("aria-label", `${String(index + 1).padStart(2, "0")} · ${t("jump", { place: entry.name[locale] })}`);
    if (index === state.index) button.setAttribute("aria-current", "location");
    const number = document.createElement("span");
    number.className = "stop-number";
    number.textContent = String(index + 1).padStart(2, "0");
    const name = document.createElement("span");
    name.textContent = entry.name[locale];
    button.append(number, name);
    if (visited.has(entry.id)) button.classList.add("is-visited");
    grid.append(button);
  });
  const total = Math.ceil(entries.length / routePageSize);
  $('route-count').textContent = t("routePage", { current: routePage + 1, total });
  $('route-prev').disabled = routePage === 0;
  $('route-next').disabled = routePage + 1 >= total;
}

function paginateAbout(preserve = false) {
  const previous = preserve ? aboutPages[aboutPage] : null;
  const old = aboutParagraphs;
  aboutParagraphs = [t("aboutOne"), t("aboutTwo"), t("aboutThree")];
  aboutPages = fitPages(aboutParagraphs, $('about-body'), $('about-text'));
  aboutPage = correspondingPage(aboutPages, aboutParagraphs, previous, old);
  renderAbout();
}

function renderAbout() {
  $('about-text').textContent = aboutPages[aboutPage]?.text ?? "";
  $('about-count').textContent = t("aboutPage", { current: aboutPage + 1, total: aboutPages.length });
  $('about-prev').disabled = aboutPage === 0;
  $('about-next').disabled = aboutPage + 1 >= aboutPages.length;
}

function drive() {
  if (!engine || activeDialog) return;
  if (state.driving) state.paused ? engine.resume() : engine.pause();
  else if (state.index === entries.length - 1) { engine.seek(0); saveStop(0); updateHUD(engine.model.state, true); }
  else engine.startNext();
}

function chooseStop(index) {
  if (!Number.isInteger(index) || !entries[index]) return;
  engine.seek(index);
  saveStop(index);
  updateHUD(engine.model.state, true);
  closeDialog();
  announce(t("arrived", { place: entries[index].name[locale] }));
}

document.addEventListener("click", (event) => {
  const stopButton = event.target.closest("button[data-stop]");
  if (stopButton) return chooseStop(Number(stopButton.dataset.stop));
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "language") { locale = locale === "zh" ? "en" : "zh"; applyLanguage(); }
  else if (action === "drive") drive();
  else if (action === "read") openReader();
  else if (action === "route") { openDialog($('route-dialog')); routePage = 0; renderRoute(); }
  else if (action === "about") { openDialog($('about-dialog')); aboutPage = 0; paginateAbout(); }
  else if (action === "close") closeDialog();
  else if (action === "previous-stop") chooseStop(state.index - 1);
  else if (action === "reader-prev") turnReader(-1);
  else if (action === "reader-next") turnReader(1);
  else if (action === "route-prev") { routePage = Math.max(0, routePage - 1); renderRoute(); }
  else if (action === "route-next") { routePage += 1; renderRoute(); }
  else if (action === "about-prev") { aboutPage = Math.max(0, aboutPage - 1); renderAbout(); }
  else if (action === "about-next") { aboutPage = Math.min(aboutPages.length - 1, aboutPage + 1); renderAbout(); }
});

dialogs.forEach((dialog) => {
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeDialog(); });
  dialog.addEventListener("click", (event) => { if (event.target === dialog) closeDialog(); });
});

$('boost-button').addEventListener("pointerdown", (event) => {
  if (state.driving && !state.paused) {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    engine.setBoost(true);
  }
});
$('boost-button').addEventListener("keydown", (event) => {
  if ([" ", "Enter"].includes(event.key) && state.driving && !state.paused) {
    event.preventDefault();
    engine.setBoost(true);
  }
});
$('boost-button').addEventListener("keyup", (event) => {
  if ([" ", "Enter"].includes(event.key)) stopBoost();
});
$('boost-button').addEventListener("blur", stopBoost);
window.addEventListener("pointerup", stopBoost);
window.addEventListener("pointercancel", stopBoost);
window.addEventListener("blur", () => { stopBoost(); engine?.pause(); });
window.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
  if (activeDialog) {
    if (event.key === "Escape") { event.preventDefault(); closeDialog(); }
    else if (activeDialog === $('reader-dialog') && ["ArrowLeft", "ArrowRight"].includes(event.key)) { event.preventDefault(); turnReader(event.key === "ArrowRight" ? 1 : -1); }
    return;
  }
  if (event.key === "Shift" && state.driving && !state.paused) engine.setBoost(true);
  if (event.repeat) return;
  if (["ArrowRight", " "].includes(event.key) && !(event.key === " " && event.target.closest("button, a"))) { event.preventDefault(); drive(); }
  else if (event.key === "ArrowLeft" && !state.driving && state.index > 0) { event.preventDefault(); chooseStop(state.index - 1); }
});
window.addEventListener("keyup", (event) => { if (event.key === "Shift") stopBoost(); });
window.addEventListener("hashchange", () => {
  const index = entries.findIndex((entry) => entry.id === decodeHash());
  if (index >= 0 && engine && index !== state.index) chooseStop(index);
});

function resizePanels() {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    if (activeDialog === $('reader-dialog')) paginateReader(true);
    else if (activeDialog === $('route-dialog')) renderRoute();
    else if (activeDialog === $('about-dialog')) paginateAbout(true);
  });
}
window.addEventListener("resize", resizePanels);
if ("ResizeObserver" in window) {
  const observer = new ResizeObserver(resizePanels);
  dialogs.forEach((dialog) => observer.observe(dialog));
}
reducedMotion.addEventListener("change", () => engine?.setReducedMotion(reducedMotion.matches));

applyLanguage();
try {
  engine = new DriveEngine({
    canvas: $('road-canvas'), backgroundUrl: config.assets.background, carUrl: config.assets.car,
    count: entries.length, reducedMotion: reducedMotion.matches,
    onUpdate: updateHUD,
    onArrive: (arrived) => {
      const index = typeof arrived === "number" ? arrived : arrived.index;
      saveStop(index);
      updateHUD(engine.model.state, true);
      clearTimeout(arrivalTimer);
      $('game-stage').classList.add("has-arrived");
      arrivalTimer = setTimeout(() => $('game-stage').classList.remove("has-arrived"), 650);
      announce(t("arrived", { place: entries[index].name[locale] }));
    }
  });
  engine.seek(sourceIndex);
  saveStop(sourceIndex, false);
  updateHUD(engine.model.state, true);
  document.body.classList.add("is-ready");
  document.querySelectorAll("[data-needs-game]").forEach((button) => { button.disabled = false; });
  updateHUD(engine.model.state, true);
} catch {
  $('startup-message').hidden = false;
  $('startup-message').textContent = t("unavailable");
}
