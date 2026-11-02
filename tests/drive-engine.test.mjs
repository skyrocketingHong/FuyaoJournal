import test from "node:test";
import assert from "node:assert/strict";
import { DriveModel, DriveEngine } from "../src/drive-engine.mjs";

function advance(model, seconds, step = 1 / 60) {
  for (let elapsed = 0; elapsed < seconds - 1e-10; elapsed += step) model.tick(Math.min(step, seconds - elapsed));
}

test("one action advances exactly one stop and emits one arrival", () => {
  const arrivals = [];
  const model = new DriveModel({ count: 3, onArrive: (state) => arrivals.push(state) });
  assert.equal(model.startNext(), true);
  assert.equal(model.startNext(), false);
  advance(model, 1.25);
  assert.equal(model.state.index, 0);
  assert.ok(Math.abs(model.state.progress - 0.5) < 1e-8);
  assert.equal(model.state.overall, model.state.travelled);
  advance(model, 2.5);
  assert.equal(model.state.index, 1);
  assert.equal(model.state.driving, false);
  assert.equal(model.state.progress, 1);
  assert.equal(arrivals.length, 1);
  assert.equal(arrivals[0].index, 1);
});

test("pausing freezes travel and clears a held boost", () => {
  const model = new DriveModel();
  model.startNext();
  model.setBoost(true);
  advance(model, 0.3);
  assert.equal(model.pause(), true);
  const paused = model.state;
  assert.equal(paused.boost, false);
  advance(model, 20);
  assert.deepEqual(model.state, paused);
  assert.equal(model.resume(), true);
  advance(model, 3);
  assert.equal(model.state.index, 1);
});

test("boost increases rate without skipping a destination", () => {
  const regular = new DriveModel(), fast = new DriveModel();
  regular.startNext(); fast.startNext(); fast.setBoost(true);
  advance(regular, 1); advance(fast, 1);
  assert.ok(fast.state.progress > regular.state.progress);
  advance(fast, 5);
  assert.equal(fast.state.index, 1);
  assert.equal(fast.state.boost, false);
});

test("large, negative, and invalid deltas cannot jump the route", () => {
  const model = new DriveModel();
  model.startNext();
  model.tick(600);
  assert.ok(model.state.progress <= 0.021);
  const state = model.state;
  model.tick(-10); model.tick(Number.NaN); model.tick(Infinity);
  assert.deepEqual(model.state, state);
});

test("seek clamps to valid stops, cancels travel, and permits leaving the end", () => {
  const arrivals = [];
  const model = new DriveModel({ count: 3, onArrive: (s) => arrivals.push(s) });
  model.startNext(); model.tick(0.05); model.seek(999);
  assert.equal(model.state.index, 2);
  assert.equal(model.state.completed, true);
  assert.equal(model.startNext(), false);
  assert.equal(model.state.driving, false);
  assert.equal(arrivals.length, 0);
  model.seek(-100);
  assert.equal(model.state.index, 0);
  assert.equal(model.state.completed, false);
  assert.equal(model.seek(Number.NaN), false);
  assert.equal(model.startNext(), true);
});

test("final arrival stops permanently until another stop is selected", () => {
  const model = new DriveModel({ count: 2 });
  model.startNext(); advance(model, 3);
  assert.equal(model.state.completed, true);
  assert.equal(model.state.index, 1);
  assert.equal(model.startNext(), false);
  assert.equal(model.resume(), false);
  assert.equal(model.tick(1), false);
});

test("snapshots are immutable and a one-stop route is already complete", () => {
  const model = new DriveModel({ count: 1 });
  assert.equal(model.state.completed, true);
  assert.equal(model.startNext(), false);
  assert.throws(() => { model.state.index = 99; }, TypeError);
  assert.throws(() => new DriveModel({ count: 0 }), RangeError);
  assert.throws(() => new DriveModel({ count: 1.2 }), RangeError);
});

function fakeCanvas(context = null) {
  const frames = new Map();
  let id = 0, timestamp = 0;
  const view = new EventTarget();
  view.devicePixelRatio = 3;
  view.requestAnimationFrame = (fn) => { frames.set(++id, fn); return id; };
  view.cancelAnimationFrame = (frame) => frames.delete(frame);
  const document = new EventTarget();
  document.defaultView = view;
  document.hidden = false;
  const canvas = { ownerDocument: document, dataset: {}, getContext: () => context, getBoundingClientRect: () => ({ width: 640, height: 320 }) };
  return {
    canvas, document, view, frames,
    step(ms = 16.667) {
      timestamp += ms;
      const scheduled = Array.from(frames.values());
      frames.clear();
      for (const fn of scheduled) fn(timestamp);
    },
  };
}

test("no-canvas fallback still advances, sleeps at rest, and caps DPR", () => {
  const env = fakeCanvas();
  const engine = new DriveEngine({ canvas: env.canvas, count: 2 });
  assert.equal(env.canvas.width, 1280);
  assert.equal(env.canvas.height, 640);
  assert.equal(env.canvas.dataset.renderState, "unavailable");
  env.step(); assert.equal(env.frames.size, 0);
  engine.startNext();
  for (let i = 0; i < 170; i += 1) env.step();
  assert.equal(engine.model.state.index, 1);
  assert.equal(env.frames.size, 0);
  engine.destroy();
  assert.equal(engine.startNext(), false);
});

test("hidden pages pause without automatic resume or accumulated time", () => {
  const env = fakeCanvas();
  const engine = new DriveEngine({ canvas: env.canvas });
  env.step(); engine.startNext(); env.step(); env.step();
  env.document.hidden = true;
  env.document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(engine.model.state.paused, true);
  assert.equal(env.frames.size, 0);
  const stopped = engine.model.state.travelled;
  assert.equal(engine.resume(), false);
  env.document.hidden = false;
  env.document.dispatchEvent(new Event("visibilitychange"));
  env.step(120000);
  assert.equal(engine.model.state.travelled, stopped);
  assert.equal(engine.model.state.paused, true);
  assert.equal(env.frames.size, 0);
  engine.resume(); env.step(); env.step();
  assert.ok(engine.model.state.travelled > stopped);
  engine.destroy();
  assert.equal(env.frames.size, 0);
});

function drawingContext() {
  const calls = [];
  const gradient = { addColorStop() {} };
  const context = new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === "createLinearGradient" || key === "createRadialGradient") return () => gradient;
      return (...values) => { calls.push([key, ...values]); };
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  return { context, calls };
}

test("driving effects freeze while paused and stop scheduling after the arrival settles", () => {
  const { context, calls } = drawingContext();
  const env = fakeCanvas(context);
  const engine = new DriveEngine({ canvas: env.canvas, count: 2 });
  env.step();
  engine.startNext();
  for (let i = 0; i < 12; i += 1) env.step();
  assert.ok(engine.effectTime > 0);
  assert.ok(calls.some(([method]) => method === "stroke"));
  engine.pause();
  env.step();
  const frozen = engine.effectTime;
  env.step(30000);
  assert.equal(engine.effectTime, frozen);
  assert.equal(env.frames.size, 0);
  engine.resume();
  for (let i = 0; i < 180 && engine.model.state.driving; i += 1) env.step();
  assert.equal(engine.model.state.index, 1);
  assert.equal(engine._hasActiveEffects(), true);
  for (let i = 0; i < 60; i += 1) env.step();
  assert.equal(engine._hasActiveEffects(), false);
  assert.equal(env.frames.size, 0);
  engine.destroy();
});

test("reduced motion disables travel effects and the post-arrival animation loop", () => {
  const { context } = drawingContext();
  const env = fakeCanvas(context);
  const engine = new DriveEngine({ canvas: env.canvas, count: 2, reducedMotion: true });
  env.step(); engine.startNext();
  for (let i = 0; i < 170; i += 1) env.step();
  assert.equal(engine.model.state.index, 1);
  assert.equal(engine.effectTime, 0);
  assert.equal(engine._hasActiveEffects(), false);
  assert.equal(env.frames.size, 0);
  engine.destroy();
});

test("backgrounding during an arrival freezes effects without an automatic restart", () => {
  const { context } = drawingContext();
  const env = fakeCanvas(context);
  const engine = new DriveEngine({ canvas: env.canvas, count: 2 });
  env.step(); engine.startNext();
  for (let i = 0; i < 180 && engine.model.state.driving; i += 1) env.step();
  assert.equal(engine._hasActiveEffects(), true);
  env.document.hidden = true;
  env.document.dispatchEvent(new Event("visibilitychange"));
  const arrival = engine.arrivalElapsed;
  assert.equal(env.frames.size, 0);
  env.document.hidden = false;
  env.document.dispatchEvent(new Event("visibilitychange"));
  env.step(60000);
  assert.equal(engine.arrivalElapsed, arrival);
  assert.equal(env.frames.size, 0);
  engine.destroy();
});
