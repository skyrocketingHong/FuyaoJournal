import test from "node:test";
import assert from "node:assert/strict";
import { sceneTiles, scenePlacement, SceneStripRenderer, SceneImageCache } from "../src/scene-strip.mjs";
import { DriveEngine } from "../src/drive-engine.mjs";

test("every stopped car sits over its own scene, including repeated endpoint fills", () => {
  for (const [width, height] of [[1200, 600], [360, 500], [1600, 250]]) {
    const carX = width * 0.3, carWidth = 160;
    for (let index = 0; index < 23; index += 1) {
      const layout = sceneTiles({ width, height, position: index, count: 23, carX, carWidth });
      const center = carX + carWidth / 2;
      const underCar = layout.tiles.find((tile) => tile.x <= center && tile.x + tile.width > center);
      assert.equal(underCar.index, index);
      assert.ok(layout.tiles[0].x <= 0);
      assert.ok(layout.tiles.at(-1).x + layout.tileWidth >= width);
      assert.ok(layout.tiles.every((tile) => tile.index >= 0 && tile.index < 23));
      assert.ok(layout.tiles.length <= 5);
      layout.tiles.slice(1).forEach((tile, i) => assert.ok(Math.abs(tile.x - layout.tiles[i].x - layout.tileWidth) < 1e-8));
    }
  }
});

test("feathered tiles cover every seam without exceeding the image-cache capacity", () => {
  for (const [width, height] of [[360, 500], [1200, 600], [6000, 180]]) {
    for (let position = 0; position <= 22; position += 0.1) {
      const layout = sceneTiles({ width, height, position, count: 23, carX: width * 0.3, carWidth: 160 });
      assert.ok(layout.blendWidth > 0 && layout.blendWidth < layout.tileWidth / 2);
      assert.ok(layout.tiles.length <= 5);
      const first = layout.tiles[0], last = layout.tiles.at(-1);
      assert.ok(first.x + layout.blendWidth / 2 <= 1e-8, "first opaque core covers the left viewport edge");
      assert.ok(last.x + last.width + layout.blendWidth / 2 >= width - 1e-8);
      for (let index = 1; index < layout.tiles.length; index += 1) {
        const previous = layout.tiles[index - 1], tile = layout.tiles[index];
        const previousEnd = previous.x + previous.width + layout.blendWidth / 2;
        const featherEnd = tile.x + layout.blendWidth / 2;
        assert.ok(Math.abs(previousEnd - featherEnd) < 1e-8, "outgoing image stays opaque underneath the complete incoming feather");
      }
    }
  }
});

test("camera moves continuously right and exposes the adjacent scene during travel", () => {
  const base = { width: 1100, height: 500, count: 23, carX: 400, carWidth: 220 };
  const first = sceneTiles({ ...base, position: 5 });
  const middle = sceneTiles({ ...base, position: 5.5 });
  const last = sceneTiles({ ...base, position: 6 });
  assert.equal(middle.cameraOffset - first.cameraOffset, first.tileWidth / 2);
  assert.equal(last.cameraOffset - middle.cameraOffset, first.tileWidth / 2);
  assert.ok(middle.tiles.some((tile) => tile.index === 5));
  assert.ok(middle.tiles.some((tile) => tile.index === 6));
  assert.equal(sceneTiles({ ...base, position: -10 }).position, 0);
  assert.equal(sceneTiles({ ...base, position: 200 }).position, 22);
});

test("individual curb measurements align while retaining aspect ratio and full coverage", () => {
  for (const groundY of [0.64, 0.695, 0.72, 0.745, 0.85]) {
    for (const stageHeight of [200, 600]) {
      const tileWidth = stageHeight * 1.5;
      const map = scenePlacement({ sourceWidth: 1536, sourceHeight: 1024, groundY, tileWidth, stageHeight });
      assert.ok(Math.abs(map.width / map.height - 1.5) < 1e-10);
      assert.ok(Math.abs(map.y + groundY * map.height - stageHeight * 0.76) < 1e-8);
      assert.ok(map.y <= 1e-8 && map.y + map.height >= stageHeight - 1e-8);
      assert.ok(map.x <= 0 && map.x + map.width >= tileWidth);
    }
  }
  assert.throws(() => scenePlacement({ sourceWidth: 1536, sourceHeight: 1024, groundY: 0, tileWidth: 600, stageHeight: 400 }), RangeError);
});

test("renderer feathers only overlapping edges and reuses a bounded mask surface", () => {
  const masks = [], layers = [], clips = [], maskedImages = [];
  const maskContext = {
    setTransform() {}, clearRect() {}, fillRect() {},
    drawImage: (...args) => maskedImages.push(args),
    createLinearGradient: (...coordinates) => {
      const mask = { coordinates, stops: [], addColorStop(offset, color) { this.stops.push([offset, color]); } };
      masks.push(mask);
      return mask;
    },
  };
  const context = {
    save() {}, restore() {}, beginPath() {}, clip() {},
    rect: (...args) => clips.push(args),
    drawImage: (...args) => layers.push(args),
  };
  const buffer = { width: 0, height: 0, getContext: () => maskContext };
  let created = 0;
  const renderer = new SceneStripRenderer({ createCanvas: () => { created += 1; return buffer; } });
  const scenes = Array.from({ length: 23 }, (_, index) => ({ url: `/scene-${index}`, groundY: index % 2 ? 0.64 : 0.85 }));
  const images = new Map(scenes.map((scene) => [scene.url, { url: scene.url, naturalWidth: 1536, naturalHeight: 1024 }]));
  const layout = sceneTiles({ width: 1200, height: 600, position: 5.5, count: 23, carX: 360, carWidth: 160 });
  const draw = () => renderer.draw({ context, layout, height: 600, dpr: 2, scenes, getImage: (url) => images.get(url) });
  draw();
  assert.equal(created, 1);
  assert.equal(masks.length, 1);
  assert.deepEqual(masks[0].coordinates, [0, 0, layout.blendWidth, 0]);
  assert.deepEqual(masks[0].stops[0], [0, "rgba(0,0,0,0)"]);
  assert.deepEqual(masks[0].stops.at(-1), [1, "rgba(0,0,0,1)"]);
  assert.equal(layers.length, layout.tiles.length * 2);
  layout.tiles.forEach((tile, index) => {
    const direct = layers[index * 2], feather = layers[index * 2 + 1];
    assert.equal(direct[0], images.get(scenes[tile.index].url));
    assert.ok(Math.abs(direct[2] + scenes[tile.index].groundY * direct[4] - layout.roadY) < 1e-8);
    assert.equal(clips[index][0], tile.x + layout.blendWidth / 2);
    assert.equal(feather[0], buffer);
    assert.equal(feather[5], tile.x - layout.blendWidth / 2);
    assert.equal(feather[7], layout.blendWidth);
    assert.equal(maskedImages[index][2], direct[2]);
  });
  draw();
  assert.equal(created, 1);
  assert.equal(masks.length, 1);
  const huge = sceneTiles({ width: 8000, height: 4000, position: 6, count: 23, carX: 2400, carWidth: 300 });
  renderer.draw({ context, layout: huge, height: 4000, dpr: 2, scenes, getImage: (url) => images.get(url) });
  assert.ok(buffer.width * buffer.height <= 4_000_000);
  assert.equal(created, 1);
  renderer.destroy();
  assert.equal(buffer.width, 0);
  assert.equal(buffer.height, 0);
});

function loader() {
  const images = [];
  class FakeImage {
    naturalWidth = 1536;
    naturalHeight = 1024;
    constructor() { images.push(this); }
    set src(value) { this.url = value; }
    get src() { return this.url; }
  }
  return { images, FakeImage, finish() { for (const image of [...images]) if (image.url && image.onload) image.onload(); } };
}
const scene = (index, width = 1536, height = 1024) => ({ id: String(index), url: `/scene-${index}.webp`, width, height, groundY: 0.7 });

test("cache keeps only nearby requests and releases both decoded and pending images", () => {
  const fake = loader();
  const cache = new SceneImageCache({ createImage: () => new fake.FakeImage() });
  for (let index = 0; index < 23; index += 1) {
    cache.sync([index, index + 1, index - 1, index + 2, index - 2].filter((i) => i >= 0 && i < 23).map((i) => scene(i)));
    if (index % 2 === 0) fake.finish();
    assert.ok(cache.stats.entries <= 5);
    assert.ok(cache.stats.decodedPixels <= 24_000_000);
    assert.ok(cache.stats.reservedPixels <= 24_000_000);
    assert.ok(fake.images.filter((image) => image.url).length <= 5);
  }
  cache.destroy();
  assert.equal(cache.stats.entries, 0);
  assert.ok(fake.images.every((image) => !image.url && image.onload === null && image.onerror === null));
});

test("cache reuses a URL for the return stop and rejects stale completion callbacks", () => {
  const fake = loader(); let changes = 0;
  const cache = new SceneImageCache({ createImage: () => new fake.FakeImage(), onChange: () => changes++ });
  cache.sync([scene(4), { ...scene(4), id: "central-return" }]);
  assert.equal(fake.images.length, 1);
  const stale = fake.images[0].onload;
  cache.sync([10, 11, 12, 13, 14].map((i) => scene(i)));
  stale();
  assert.equal(changes, 0);
  fake.finish();
  assert.equal(cache.get(scene(4).url), null);
  assert.equal(changes, 5);
  cache.destroy();
});

test("real dimensions enforce the pixel budget even when metadata understated them", () => {
  const fake = loader();
  const cache = new SceneImageCache({ createImage: () => new fake.FakeImage(), maxPixels: 6_000_000 });
  cache.sync([0, 1, 2, 3, 4].map((i) => scene(i, 100, 100)));
  fake.finish();
  assert.ok(cache.stats.decodedPixels <= 6_000_000);
  assert.ok(cache.get(scene(0).url));
  const first = fake.images.find((image) => image.url === scene(0).url);
  assert.ok(first);
  cache.destroy();
});

test("failed and oversized assets stay explicit and do not retry on every frame", () => {
  const fake = loader();
  const cache = new SceneImageCache({ createImage: () => new fake.FakeImage() });
  cache.sync([scene(0)]);
  fake.images[0].onerror();
  for (let n = 0; n < 100; n++) cache.sync([scene(0)]);
  assert.equal(fake.images.length, 1);
  assert.equal(cache.status(scene(0).url), "error");
  cache.sync([scene(1)]);
  fake.images[1].naturalWidth = 10000; fake.images[1].naturalHeight = 10000;
  fake.images[1].onload();
  assert.equal(cache.status(scene(1).url), "error");
  assert.equal(cache.stats.decodedPixels, 0);
  cache.destroy();
});

test("renderer uses the requested scene in reduced motion and refreshes a parked load", () => {
  const fake = loader(), frames = new Map(), drawn = [];
  let key = 0;
  const view = new EventTarget();
  view.Image = fake.FakeImage;
  view.requestAnimationFrame = (fn) => { frames.set(++key, fn); return key; };
  view.cancelAnimationFrame = (id) => frames.delete(id);
  const doc = new EventTarget(); doc.defaultView = view; doc.hidden = false;
  const ctx = new Proxy({}, { get: (_, name) => name === "drawImage" ? (img) => drawn.push(img.url)
    : ["createLinearGradient", "createRadialGradient"].includes(name) ? () => ({ addColorStop() {} }) : () => {} });
  const canvas = { ownerDocument: doc, dataset: {}, getContext: () => ctx, getBoundingClientRect: () => ({ width: 700, height: 500 }) };
  const engine = new DriveEngine({ canvas, backgrounds: Array.from({ length: 23 }, (_, i) => scene(i)), reducedMotion: true });
  const step = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach((fn) => fn(10)); };
  step();
  engine.seek(12); step();
  fake.finish();
  assert.ok(frames.size > 0, "a stopped scene schedules repaint when its image arrives");
  drawn.length = 0; step();
  assert.ok(drawn.includes(scene(12).url));
  assert.ok(!drawn.includes(scene(0).url));
  assert.equal(engine.model.state.driving, false);
  assert.ok(engine.sceneCache.stats.entries <= 5);
  engine.destroy();
  assert.equal(engine.sceneCache.stats.entries, 0);
  // A short array must not replace later missing places with its final known scene.
  fake.images.length = 0;
  const partial = new DriveEngine({ canvas, backgrounds: [scene(0)], backgroundUrl: "/legacy.webp", reducedMotion: true });
  step(); fake.finish(); step();
  partial.seek(15); drawn.length = 0; step();
  assert.equal(canvas.dataset.sceneState, "fallback");
  assert.equal(drawn.length, 0);
  assert.ok(fake.images.every((image) => image.url !== "/legacy.webp"));
  partial.destroy();
});
