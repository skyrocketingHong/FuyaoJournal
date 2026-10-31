const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

/** The car's world position falls inside the matching tile at every integer stop. */
export function sceneTiles({ width, height, position, count, carX, carWidth, tileAspect = 1.5, roadFraction = 0.76 }) {
  if (![width, height, tileAspect].every((n) => Number.isFinite(n) && n > 0)
    || !Number.isInteger(count) || count < 1 || !Number.isFinite(position)
    || ![carX, carWidth].every(Number.isFinite) || carWidth < 0
    || !Number.isFinite(roadFraction) || roadFraction < 0 || roadFraction > 1) throw new RangeError("Invalid scene-strip geometry");
  // Keep at most four tiles visible on an unusually wide, shallow stage.
  const tileWidth = Math.max(height * tileAspect, width / 3);
  const cursor = clamp(position, 0, count - 1);
  const cameraOffset = cursor * tileWidth + tileWidth * 0.45 - (carX + carWidth * 0.5);
  const firstSlot = Math.floor(cameraOffset / tileWidth);
  const lastSlot = Math.ceil((cameraOffset + width) / tileWidth) - 1;
  const tiles = [];
  for (let slot = firstSlot; slot <= lastSlot; slot += 1) {
    tiles.push({ slot, index: clamp(slot, 0, count - 1), x: slot * tileWidth - cameraOffset, width: tileWidth });
  }
  return { tiles, tileWidth, cameraOffset, roadY: height * roadFraction, position: cursor };
}

/** Cover the clipped tile without stretching, aligning its measured curb to the road. */
export function scenePlacement({ sourceWidth, sourceHeight, groundY, tileWidth, stageHeight, roadY = stageHeight * 0.76 }) {
  if (![sourceWidth, sourceHeight, tileWidth, stageHeight].every((n) => Number.isFinite(n) && n > 0)
    || !Number.isFinite(groundY) || groundY <= 0 || groundY >= 1
    || !Number.isFinite(roadY) || roadY < 0 || roadY > stageHeight) throw new RangeError("Invalid scene ground mapping");
  const ratio = sourceWidth / sourceHeight;
  const height = Math.max(stageHeight, roadY / groundY, (stageHeight - roadY) / (1 - groundY), tileWidth / ratio);
  const width = height * ratio;
  return { x: (tileWidth - width) / 2, y: roadY - height * groundY, width, height };
}

/** Bounded image cache; URL identity lets the final return stop reuse its original scene. */
export class SceneImageCache {
  constructor({ createImage, onChange, maxEntries = 5, maxPixels = 24_000_000 } = {}) {
    this.createImage = createImage;
    this.onChange = onChange;
    this.maxEntries = Math.max(1, Math.trunc(maxEntries));
    this.maxPixels = Math.max(1, maxPixels);
    this.entries = new Map();
    this.priority = new Map();
    this.clock = 0;
    this.destroyed = false;
  }

  _estimate(scene) {
    const pixels = scene.width * scene.height;
    return Number.isFinite(pixels) && pixels > 0 ? pixels : 2_000_000;
  }

  get stats() {
    const items = [...this.entries.values()];
    return {
      entries: items.length,
      loading: items.filter((e) => e.state === "loading").length,
      ready: items.filter((e) => e.state === "ready").length,
      failed: items.filter((e) => e.state === "error").length,
      decodedPixels: items.reduce((total, e) => total + (e.state === "ready" ? e.pixels : 0), 0),
      reservedPixels: items.reduce((total, e) => total + e.pixels, 0),
      urls: [...this.entries.keys()],
    };
  }

  status(url) { return this.entries.get(url)?.state ?? "missing"; }
  get(url) {
    const entry = this.entries.get(url);
    if (!entry || entry.state !== "ready") return null;
    entry.used = ++this.clock;
    return entry.image;
  }

  sync(scenes) {
    if (this.destroyed) return;
    const desired = [];
    const seen = new Set();
    let pixels = 0;
    for (const scene of scenes) {
      if (!scene?.url || seen.has(scene.url)) continue;
      seen.add(scene.url);
      const cost = this.entries.get(scene.url)?.pixels ?? this._estimate(scene);
      if (desired.length >= this.maxEntries || pixels + cost > this.maxPixels) continue;
      desired.push(scene); pixels += cost;
    }
    this.priority = new Map(desired.map((scene, rank) => [scene.url, rank]));
    for (const scene of desired) {
      if (this.entries.has(scene.url)) {
        this.entries.get(scene.url).used = ++this.clock;
        continue;
      }
      const cost = this._estimate(scene);
      while (this.entries.size >= this.maxEntries || this.stats.reservedPixels + cost > this.maxPixels) {
        const victim = this._victim(false);
        if (!victim) break;
        this._remove(victim.url);
      }
      if (this.entries.size < this.maxEntries && this.stats.reservedPixels + cost <= this.maxPixels) this._load(scene, cost);
    }
  }

  _victim(includeWanted) {
    return [...this.entries.values()]
      .filter((entry) => includeWanted || !this.priority.has(entry.url))
      .sort((a, b) => (this.priority.get(b.url) ?? Infinity) - (this.priority.get(a.url) ?? Infinity) || a.used - b.used)[0];
  }

  _load(scene, pixels) {
    const entry = { url: scene.url, state: "loading", pixels, used: ++this.clock, image: null };
    this.entries.set(entry.url, entry);
    try {
      entry.image = this.createImage?.();
      if (!entry.image) throw new Error("Image loading is unavailable");
      const image = entry.image;
      image.onload = () => {
        if (this.destroyed || this.entries.get(entry.url) !== entry) return;
        entry.state = "ready";
        entry.pixels = image.naturalWidth * image.naturalHeight;
        image.onload = null; image.onerror = null;
        if (!Number.isFinite(entry.pixels) || entry.pixels < 1 || entry.pixels > this.maxPixels) {
          this._fail(entry);
        } else {
          while (this.stats.reservedPixels > this.maxPixels) {
            const victim = this._victim(true);
            if (!victim) break;
            this._remove(victim.url);
          }
        }
        this.onChange?.();
      };
      image.onerror = () => {
        if (this.destroyed || this.entries.get(entry.url) !== entry) return;
        this._fail(entry);
        this.onChange?.();
      };
      image.decoding = "async";
      image.src = scene.url;
    } catch {
      this._fail(entry);
      this.onChange?.();
    }
  }

  _release(entry) {
    if (!entry.image) return;
    entry.image.onload = null;
    entry.image.onerror = null;
    try {
      if (entry.image.removeAttribute) entry.image.removeAttribute("src");
      else entry.image.src = "";
    } catch { /* Dropping the reference still releases ownership. */ }
    entry.image = null;
  }

  _fail(entry) {
    this._release(entry);
    entry.state = "error";
    entry.pixels = 0;
  }

  _remove(url) {
    const entry = this.entries.get(url);
    if (!entry) return;
    this.entries.delete(url);
    this._release(entry);
  }

  destroy() {
    this.destroyed = true;
    for (const url of [...this.entries.keys()]) this._remove(url);
    this.priority.clear();
    this.onChange = null;
  }
}
