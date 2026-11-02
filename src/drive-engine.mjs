import { sceneTiles, SceneImageCache, SceneStripRenderer } from "./scene-strip.mjs";

const LEG_SECONDS = 2.5;
const MAX_STEP_SECONDS = 0.05;
const BOOST_MULTIPLIER = 1.85;
const ARRIVAL_SECONDS = 0.9;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

/** A discrete route with continuous progress between adjacent stops. */
export class DriveModel {
  constructor({ count = 23, onUpdate, onArrive } = {}) {
    if (!Number.isInteger(count) || count < 1) throw new RangeError("count must be a positive integer");
    this.count = count;
    this.onUpdate = onUpdate;
    this.onArrive = onArrive;
    this._state = {
      index: 0,
      target: 0,
      progress: 0,
      travelled: 0,
      driving: false,
      paused: false,
      boost: false,
      completed: count === 1,
    };
  }

  get state() {
    return Object.freeze({ ...this._state, count: this.count, overall: this._state.travelled });
  }

  _emit() {
    const snapshot = this.state;
    this.onUpdate?.(snapshot);
    return snapshot;
  }

  startNext() {
    const s = this._state;
    if (s.driving || s.index >= this.count - 1) return false;
    Object.assign(s, { target: s.index + 1, progress: 0, driving: true, paused: false });
    this._emit();
    return true;
  }

  pause() {
    const s = this._state;
    if (!s.driving || s.paused) return false;
    Object.assign(s, { paused: true, boost: false });
    this._emit();
    return true;
  }

  resume() {
    const s = this._state;
    if (!s.driving || !s.paused) return false;
    s.paused = false;
    this._emit();
    return true;
  }

  setBoost(enabled) {
    const next = Boolean(enabled) && !this._state.paused;
    if (next === this._state.boost) return false;
    this._state.boost = next;
    this._emit();
    return true;
  }

  seek(index) {
    if (!Number.isFinite(index)) return false;
    const next = clamp(Math.trunc(index), 0, this.count - 1);
    Object.assign(this._state, {
      index: next,
      target: next,
      progress: 0,
      travelled: next,
      driving: false,
      paused: false,
      boost: false,
      completed: next === this.count - 1,
    });
    this._emit();
    return true;
  }

  tick(dtSeconds) {
    const s = this._state;
    if (!s.driving || s.paused || !Number.isFinite(dtSeconds) || dtSeconds <= 0) return false;
    // A resumed background tab must never consume its whole elapsed wall time.
    const dt = Math.min(dtSeconds, MAX_STEP_SECONDS);
    const next = s.progress + dt * (s.boost ? BOOST_MULTIPLIER : 1) / LEG_SECONDS;
    s.progress = Math.min(1, next);
    s.travelled = s.index + s.progress;
    if (next >= 1 - Number.EPSILON * 8) {
      Object.assign(s, {
        index: s.target,
        progress: 1,
        travelled: s.target,
        driving: false,
        paused: false,
        boost: false,
        completed: s.target === this.count - 1,
      });
      const arrival = this._emit();
      this.onArrive?.(arrival);
    } else {
      this._emit();
    }
    return true;
  }
}

/** Canvas is optional: the model and its callbacks also work without a renderer. */
export class DriveEngine {
  constructor({ canvas, backgroundUrl, backgrounds, carUrl, count = 23, onUpdate, onArrive, reducedMotion = false } = {}) {
    this.canvas = canvas;
    this.document = canvas?.ownerDocument ?? globalThis.document ?? null;
    this.view = this.document?.defaultView ?? globalThis.window ?? null;
    this.reducedMotion = Boolean(reducedMotion);
    this.destroyed = false;
    this.frame = null;
    this.lastTime = null;
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.effectTime = 0;
    this.arrivalElapsed = ARRIVAL_SECONDS;
    this.visualPaused = false;
    this.images = { background: null, car: null };
    this.backgrounds = Array.isArray(backgrounds) ? Array.from({ length: count }, (_, index) => backgrounds[index] ?? null) : null;
    this.sceneLayout = null;
    this.pendingImages = new Set();
    this.failedImages = new Set();
    this.imageRequests = [];
    this.carBounds = null;
    this.ctx = null;
    try { this.ctx = canvas?.getContext?.("2d") ?? null; } catch { /* Text controls remain usable. */ }
    this.requestAnimation = this.view?.requestAnimationFrame?.bind(this.view)
      ?? ((callback) => setTimeout(() => callback(globalThis.performance?.now() ?? Date.now()), 16));
    this.cancelAnimation = this.view?.cancelAnimationFrame?.bind(this.view) ?? clearTimeout;
    this.model = new DriveModel({
      count,
      onUpdate: (state) => {
        if (this.destroyed) return;
        onUpdate?.(state);
        this.requestFrame();
      },
      onArrive: (state) => {
        if (this.destroyed) return;
        this.arrivalElapsed = this.reducedMotion ? ARRIVAL_SECONDS : 0;
        onArrive?.(state);
      },
    });
    this.boundFrame = (timestamp) => this._frame(timestamp);
    const ImageClass = this.view?.Image ?? globalThis.Image;
    this.sceneCache = this.backgrounds ? new SceneImageCache({
      createImage: ImageClass ? () => new ImageClass() : undefined,
      onChange: () => { this._assetState(); this.requestFrame(); },
    }) : null;
    this.sceneRenderer = this.backgrounds ? new SceneStripRenderer({
      createCanvas: () => this.document?.createElement?.("canvas"),
    }) : null;
    this.boundResize = () => this.resize();
    this.boundVisibility = () => {
      if (this.document?.hidden) {
        this.pause();
        this.model.setBoost(false);
        this._cancelFrame();
      } else {
        this.lastTime = null;
        this.requestFrame();
      }
    };
    this.document?.addEventListener?.("visibilitychange", this.boundVisibility);
    this.view?.addEventListener?.("resize", this.boundResize);
    const Observer = this.view?.ResizeObserver ?? globalThis.ResizeObserver;
    if (Observer && canvas) {
      this.resizeObserver = new Observer(this.boundResize);
      this.resizeObserver.observe(canvas.parentElement ?? canvas);
    }
    if (!this.backgrounds) this._loadImage("background", backgroundUrl);
    this._loadImage("car", carUrl);
    this.resize();
  }

  startNext() {
    if (this.destroyed || this.document?.hidden) return false;
    const started = this.model.startNext();
    if (started) {
      this.visualPaused = false;
      this.arrivalElapsed = ARRIVAL_SECONDS;
      this.lastTime = null;
    }
    return started;
  }

  pause() {
    if (this.destroyed) return false;
    this.visualPaused = true;
    return this.model.pause();
  }
  resume() {
    if (this.destroyed || this.document?.hidden) return false;
    const resumed = this.model.resume();
    if (resumed) { this.visualPaused = false; this.lastTime = null; }
    return resumed;
  }
  setBoost(enabled) { return !this.destroyed && this.model.setBoost(enabled); }
  seek(index) {
    if (this.destroyed) return false;
    const selected = this.model.seek(index);
    if (selected) {
      this.visualPaused = false;
      this.arrivalElapsed = ARRIVAL_SECONDS;
      this.lastTime = null;
    }
    return selected;
  }
  setReducedMotion(enabled) {
    this.reducedMotion = Boolean(enabled);
    if (this.reducedMotion) this.arrivalElapsed = ARRIVAL_SECONDS;
    this.requestFrame();
  }

  _loadImage(kind, url) {
    const ImageClass = this.view?.Image ?? globalThis.Image;
    if (!url || !ImageClass) {
      this.failedImages.add(kind);
      this._assetState();
      return;
    }
    this.pendingImages.add(kind);
    const image = new ImageClass();
    this.imageRequests.push(image);
    image.onload = () => {
      if (this.destroyed) return;
      this.pendingImages.delete(kind);
      this.images[kind] = image;
      if (kind === "car") this.carBounds = this._visibleBounds(image);
      this._assetState();
      this.requestFrame();
    };
    image.onerror = () => {
      if (this.destroyed) return;
      this.pendingImages.delete(kind);
      this.failedImages.add(kind);
      this._assetState();
      this.requestFrame();
    };
    image.src = url;
    this._assetState();
  }

  _assetState() {
    if (!this.canvas?.dataset) return;
    const scenes = this.sceneLayout?.tiles.map((tile) => {
      const scene = this.backgrounds[tile.index];
      return this._hasSceneGround(scene) ? this.sceneCache?.status(scene.url) : "invalid-metadata";
    }) ?? [];
    const sceneState = scenes.some((s) => s === "loading") ? "loading"
      : scenes.some((s) => s !== "ready") ? "fallback" : "ready";
    this.canvas.dataset.sceneState = this.backgrounds ? sceneState : "single";
    this.canvas.dataset.renderState = !this.ctx ? "unavailable"
      : this.pendingImages.size || sceneState === "loading" ? "loading"
      : this.failedImages.size || sceneState === "fallback" ? "fallback" : "ready";
  }

  _visibleBounds(image) {
    const full = { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
    try {
      const sample = this.document.createElement("canvas");
      const scale = Math.min(1, 256 / Math.max(full.width, full.height));
      sample.width = Math.max(1, Math.round(full.width * scale));
      sample.height = Math.max(1, Math.round(full.height * scale));
      const context = sample.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0, sample.width, sample.height);
      const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
      let left = sample.width, top = sample.height, right = -1, bottom = -1;
      for (let y = 0; y < sample.height; y += 1) {
        for (let x = 0; x < sample.width; x += 1) {
          if (pixels[(y * sample.width + x) * 4 + 3] < 10) continue;
          left = Math.min(left, x); top = Math.min(top, y);
          right = Math.max(right, x); bottom = Math.max(bottom, y);
        }
      }
      if (right < left) return full;
      const x = Math.max(0, (left - 1) / scale);
      const y = Math.max(0, (top - 1) / scale);
      return {
        x, y,
        width: Math.min(full.width - x, (right - left + 3) / scale),
        height: Math.min(full.height - y, (bottom - top + 3) / scale),
      };
    } catch { return full; }
  }

  resize() {
    if (this.destroyed || !this.canvas) return;
    const rect = this.canvas.getBoundingClientRect?.();
    this.width = Math.max(1, rect?.width ?? this.canvas.clientWidth ?? 640);
    this.height = Math.max(1, rect?.height ?? this.canvas.clientHeight ?? 360);
    this.dpr = clamp(this.view?.devicePixelRatio || 1, 1, 2);
    const width = Math.round(this.width * this.dpr);
    const height = Math.round(this.height * this.dpr);
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
    this.requestFrame();
  }

  requestFrame() {
    if (this.destroyed || this.frame !== null || this.document?.hidden) return;
    this.frame = this.requestAnimation(this.boundFrame);
  }

  _cancelFrame() {
    if (this.frame !== null) this.cancelAnimation(this.frame);
    this.frame = null;
    this.lastTime = null;
  }

  _frame(timestamp) {
    this.frame = null;
    if (this.destroyed || this.document?.hidden) return;
    const elapsed = this.lastTime === null ? 0 : (timestamp - this.lastTime) / 1000;
    const dt = Number.isFinite(elapsed) ? clamp(elapsed, 0, MAX_STEP_SECONDS) : 0;
    this.lastTime = timestamp;
    const before = this.model.state;
    if (!this.reducedMotion && !this.visualPaused) {
      if (before.driving && !before.paused) this.effectTime += dt * (before.boost ? BOOST_MULTIPLIER : 1);
      if (this.arrivalElapsed < ARRIVAL_SECONDS) this.arrivalElapsed = Math.min(ARRIVAL_SECONDS, this.arrivalElapsed + dt);
    }
    this.model.tick(dt);
    this.draw();
    const state = this.model.state;
    if ((state.driving && !state.paused) || this._hasActiveEffects()) this.requestFrame();
    else this.lastTime = null;
  }

  _hasActiveEffects() {
    return Boolean(this.ctx && !this.reducedMotion && !this.visualPaused && this.arrivalElapsed < ARRIVAL_SECONDS);
  }

  draw() {
    if (!this.ctx || this.destroyed || this.width < 2 || this.height < 2) return;
    const c = this.ctx, w = this.width, h = this.height;
    const state = this.model.state;
    const moving = state.driving && !state.paused && !this.reducedMotion;
    const distance = this.reducedMotion ? 0 : state.travelled;
    const roadY = h * 0.76;
    const carWidth = Math.min(w * 0.36, clamp(w * 0.23, 128, 300));
    const carX = this.reducedMotion ? w * 0.27 : w * (0.16 + 0.27 * (1 - Math.exp(-distance * 0.9)));
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    c.fillStyle = "#092c35";
    c.fillRect(0, 0, w, h);
    if (this.backgrounds) {
      this.sceneLayout = sceneTiles({ width: w, height: h, position: this.reducedMotion ? state.index : state.travelled, count: this.backgrounds.length, carX, carWidth });
      this._drawSceneStrip();
    } else {
      this._drawBackground(distance);
    }

    if (!this.images.background && !this.backgrounds) {
      c.fillStyle = "#112c31";
      c.fillRect(0, roadY, w, h - roadY);
    }
    if (state.driving && !this.reducedMotion) this._drawLightTrails(this.effectTime, roadY, state.boost);
    const roadShade = c.createLinearGradient(0, roadY, 0, h);
    roadShade.addColorStop(0, "rgba(4,19,30,0)");
    roadShade.addColorStop(1, "rgba(4,19,30,0.44)");
    c.fillStyle = roadShade;
    c.fillRect(0, roadY, w, h - roadY);
    c.fillStyle = "#f0ca7a";
    c.globalAlpha = 0.8;
    c.fillRect(0, roadY + 3, w, 2);
    c.globalAlpha = 1;
    const roadOffset = (distance * 900) % 128;
    c.fillStyle = "#8da4a0";
    for (let x = -roadOffset - 128; x < w + 128; x += 128) c.fillRect(x, roadY + (h - roadY) * 0.72, 60, 3);

    const carBaseline = roadY + Math.min(28, h * 0.06);
    if (state.driving && !this.reducedMotion) {
      this._drawRoadReflections(this.effectTime, roadY, state.boost);
      this._drawSpeedLines(this.effectTime, state.boost);
      this._drawSparks(this.effectTime, carX, carBaseline, carWidth, state.boost);
      if (state.boost) this._drawCarEchoes(carX, carBaseline, carWidth);
    }
    if (state.driving && !this.reducedMotion) this._drawCheckpoint(carX + carWidth * 0.55, state.progress, roadY);
    this._drawCar(carX, carBaseline, carWidth, moving ? Math.sin(distance * 43) * 1.1 : 0, moving && state.boost);
    if (!this.reducedMotion && this.arrivalElapsed < ARRIVAL_SECONDS) this._drawArrival(carX + carWidth * 0.52, carBaseline, carWidth);
  }

  _drawSceneStrip() {
    const { tiles, position } = this.sceneLayout;
    const anchor = clamp(Math.floor(position + 0.45), 0, this.backgrounds.length - 1);
    const visible = [...new Set(tiles.map((tile) => tile.index))].sort((a, b) => Math.abs(a - anchor) - Math.abs(b - anchor));
    const indices = [...new Set([anchor, ...visible, anchor + 1, anchor - 1, anchor + 2, anchor - 2])]
      .filter((index) => index >= 0 && index < this.backgrounds.length);
    this.sceneCache.sync(indices.map((index) => this.backgrounds[index]));
    this.sceneRenderer.draw({
      context: this.ctx, layout: this.sceneLayout, height: this.height, dpr: this.dpr,
      scenes: this.backgrounds, getImage: (url) => this.sceneCache.get(url),
    });
    this._assetState();
  }

  _hasSceneGround(scene) {
    return scene && Number.isFinite(scene.groundY) && scene.groundY > 0 && scene.groundY < 1;
  }

  _drawBackground(distance) {
    const image = this.images.background;
    if (!image?.naturalWidth || !image.naturalHeight) return;
    const c = this.ctx;
    const scale = Math.max(this.width / image.naturalWidth, this.height / image.naturalHeight);
    const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
    const offset = distance * this.width * 0.16;
    const first = Math.floor(offset / width);
    const start = -(offset % width);
    // Mirrored adjacent tiles share the same edge pixels, avoiding a hard seam.
    for (let tile = 0, x = start; x < this.width; tile += 1, x += width) {
      c.save();
      if ((first + tile) % 2) {
        c.translate(x + width, this.height - height);
        c.scale(-1, 1);
        c.drawImage(image, 0, 0, width, height);
      } else {
        c.drawImage(image, x, this.height - height, width, height);
      }
      c.restore();
    }
  }

  _drawLightTrails(time, roadY, boost) {
    const c = this.ctx, span = this.width + 400;
    c.save();
    c.globalCompositeOperation = "screen";
    for (let i = 0; i < 10; i += 1) {
      const x = ((i * 173 - time * (110 + (i % 3) * 85)) % span + span) % span - 200;
      const y = roadY * (0.48 + (i % 5) * 0.085);
      const length = (80 + (i % 4) * 36) * (boost ? 1.65 : 1);
      const beam = c.createLinearGradient(x - length, 0, x + 30, 0);
      beam.addColorStop(0, "rgba(91,195,216,0)");
      beam.addColorStop(0.75, i % 2 ? "rgba(242,123,83,0.22)" : "rgba(91,195,216,0.2)");
      beam.addColorStop(1, "rgba(242,203,117,0)");
      c.fillStyle = beam;
      c.fillRect(x - length, y, length + 30, i % 3 ? 2 : 4);
    }
    c.restore();
  }

  _drawRoadReflections(time, roadY, boost) {
    const c = this.ctx, w = this.width, depth = this.height - roadY;
    c.save();
    c.globalCompositeOperation = "screen";
    for (let i = 0; i < 8; i += 1) {
      const span = w + 360;
      const x = ((i * 179 - time * (boost ? 640 : 390)) % span + span) % span - 180;
      const y = roadY + depth * (0.15 + (i % 4) * 0.22);
      const length = 85 + (i % 3) * 55;
      const reflection = c.createLinearGradient(x - length, 0, x + 45, 0);
      reflection.addColorStop(0, "rgba(242,203,117,0)");
      reflection.addColorStop(0.72, i % 2 ? "rgba(242,123,83,0.34)" : "rgba(91,195,216,0.3)");
      reflection.addColorStop(1, "rgba(242,203,117,0)");
      c.fillStyle = reflection;
      c.fillRect(x - length, y, length + 45, 3 + i % 3);
    }
    c.restore();
  }

  _drawSpeedLines(time, boost) {
    const c = this.ctx;
    const span = this.width + 260;
    c.save();
    c.globalCompositeOperation = "screen";
    for (let i = 0; i < (boost ? 32 : 18); i += 1) {
      const phase = (i * 0.61803398875) % 1;
      const x = ((phase * span - time * (280 + i % 6 * 76)) % span + span) % span;
      const y = this.height * (0.28 + ((i * 0.38196601125) % 1) * 0.7);
      const length = (24 + (i % 5) * 15) * (boost ? 2.4 : 1);
      c.strokeStyle = i % 4 ? "#d3e6db" : "#f2cb75";
      c.lineWidth = i % 5 === 0 ? 2 : 1;
      c.globalAlpha = (boost ? 0.35 : 0.16) * (0.45 + phase * 0.55);
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - length, y); c.stroke();
    }
    c.restore();
  }

  _drawSparks(time, carX, baseline, width, boost) {
    const c = this.ctx, count = boost ? 30 : 14;
    c.save();
    c.globalCompositeOperation = "screen";
    for (let i = 0; i < count; i += 1) {
      const phase = (time * (0.9 + i % 3 * 0.15) + i / count) % 1;
      const x = carX + width * 0.16 - phase * (boost ? 320 : 170);
      const y = baseline - 4 - Math.sin(phase * Math.PI) * (8 + i % 6 * 5);
      c.globalAlpha = (1 - phase) * (boost ? 0.72 : 0.4);
      c.strokeStyle = i % 3 ? "#f2cb75" : "#f27b53";
      c.lineWidth = i % 4 === 0 ? 2 : 1;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - (boost ? 18 : 7) * (1 - phase), y + phase * 3); c.stroke();
    }
    c.restore();
  }

  _drawCarEchoes(x, baseline, width) {
    const c = this.ctx, image = this.images.car, bounds = this.carBounds;
    if (!image || !bounds) return;
    const height = width * bounds.height / bounds.width;
    c.save();
    c.globalCompositeOperation = "screen";
    for (let i = 3; i > 0; i -= 1) {
      c.globalAlpha = 0.17 / i;
      c.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height, x - i * width * 0.12, baseline - height, width, height);
    }
    c.restore();
  }

  _drawArrival(center, baseline, width) {
    const c = this.ctx;
    const elapsed = clamp(this.arrivalElapsed / ARRIVAL_SECONDS, 0, 1);
    c.save();
    c.globalCompositeOperation = "screen";
    for (let ring = 0; ring < 2; ring += 1) {
      const t = clamp((elapsed - ring * 0.16) / (1 - ring * 0.16), 0, 1);
      if (ring && elapsed < 0.16) continue;
      const spread = 1 - (1 - t) ** 3;
      c.globalAlpha = (1 - t) * (ring ? 0.55 : 0.8);
      c.strokeStyle = ring ? "#f27b53" : "#f2cb75";
      c.lineWidth = 2 + (1 - t) * 2;
      c.beginPath();
      c.ellipse(center, baseline + 3, width * 0.32 + spread * Math.min(this.width * 0.6, 520), 5 + spread * this.height * 0.13, 0, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = (1 - elapsed) * 0.65;
    c.strokeStyle = "#f2cb75";
    c.lineWidth = 2;
    for (let i = 0; i < 16; i += 1) {
      const angle = i / 16 * Math.PI * 2;
      const radius = width * (0.4 + elapsed * 1.2);
      const x = center + Math.cos(angle) * radius;
      const y = baseline + Math.sin(angle) * radius * 0.16;
      c.beginPath(); c.moveTo(x, y);
      c.lineTo(x + Math.cos(angle) * 22 * (1 - elapsed), y + Math.sin(angle) * 5 * (1 - elapsed)); c.stroke();
    }
    c.restore();
  }

  _drawCheckpoint(carCenter, progress, roadY) {
    const c = this.ctx;
    const x = carCenter + (this.width * 0.88 - carCenter) * (1 - progress);
    c.globalAlpha = 0.75;
    c.fillStyle = "#e9c679";
    c.fillRect(x, roadY - 73, 3, 76);
    c.fillRect(x + 3, roadY - 73, 27, 22);
    c.strokeStyle = "#17382f"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x + 10, roadY - 62); c.lineTo(x + 22, roadY - 62);
    c.moveTo(x + 18, roadY - 66); c.lineTo(x + 22, roadY - 62); c.lineTo(x + 18, roadY - 58); c.stroke();
    c.globalAlpha = 1;
  }

  _drawCar(x, baseline, width, bob, boost) {
    const c = this.ctx, image = this.images.car, bounds = this.carBounds;
    const height = bounds?.width ? width * bounds.height / bounds.width : width * 0.4;
    const beamLength = Math.min(this.width * 0.6, boost ? 440 : 280);
    const beam = c.createLinearGradient(x + width * 0.85, 0, x + width + beamLength, 0);
    beam.addColorStop(0, boost ? "rgba(255,220,144,0.46)" : "rgba(255,220,144,0.23)");
    beam.addColorStop(1, "rgba(255,220,144,0)");
    c.fillStyle = beam;
    c.beginPath(); c.moveTo(x + width * 0.9, baseline - height * 0.4);
    c.lineTo(x + width + beamLength, baseline - height * 0.8); c.lineTo(x + width + beamLength, baseline + 12); c.closePath(); c.fill();
    c.save();
    c.translate(x + width * 0.5, baseline);
    c.scale(width * 0.58, Math.max(8, height * 0.14));
    const underglow = c.createRadialGradient(0, 0, 0, 0, 0, 1);
    underglow.addColorStop(0, boost ? "rgba(242,123,83,0.4)" : "rgba(242,203,117,0.2)");
    underglow.addColorStop(1, "rgba(242,123,83,0)");
    c.fillStyle = underglow;
    c.fillRect(-1, -1, 2, 2);
    c.restore();
    c.fillStyle = "rgba(0,0,0,0.32)";
    c.beginPath(); c.ellipse(x + width * 0.51, baseline + 1, width * 0.46, Math.max(3, height * 0.08), 0, 0, Math.PI * 2); c.fill();
    if (image && bounds) {
      c.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height, x, baseline - height + bob, width, height);
    } else if (this.failedImages.has("car")) {
      c.fillStyle = "#e9a476"; c.fillRect(x, baseline - height * 0.65, width, height * 0.45);
      c.fillStyle = "#183c42"; c.fillRect(x + width * 0.3, baseline - height, width * 0.42, height * 0.4);
      c.fillStyle = "#071e25";
      for (const wheelX of [x + width * 0.2, x + width * 0.8]) {
        c.beginPath(); c.arc(wheelX, baseline - height * 0.15, height * 0.17, 0, Math.PI * 2); c.fill();
      }
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this._cancelFrame();
    this.model.pause();
    this.document?.removeEventListener?.("visibilitychange", this.boundVisibility);
    this.view?.removeEventListener?.("resize", this.boundResize);
    this.resizeObserver?.disconnect();
    this.sceneCache?.destroy();
    this.sceneRenderer?.destroy();
    for (const image of this.imageRequests) {
      image.onload = null; image.onerror = null;
      try {
        if (image.removeAttribute) image.removeAttribute("src");
        else image.src = "";
      } catch { /* The engine no longer retains the image. */ }
    }
    this.imageRequests.length = 0;
    this.images = { background: null, car: null };
  }
}
