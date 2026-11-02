import assert from "node:assert/strict";
import test from "node:test";
import { AutoplayController } from "../src/autoplay.mjs";
import { DriveModel } from "../src/drive-engine.mjs";

function setup(initial = {}) {
  const state = { index: 0, driving: false, paused: false, completed: false, ...initial };
  const timers = new Map();
  const calls = [];
  let sequence = 0;
  const player = new AutoplayController({
    getState: () => state,
    advance: () => { state.driving = true; calls.push("advance"); return true; },
    resume: () => { state.paused = false; calls.push("resume"); },
    pause: () => { if (state.driving) state.paused = true; calls.push("pause"); },
    rewind: () => { Object.assign(state, { index: 0, completed: false, driving: false, paused: false }); calls.push("rewind"); },
    onChange: (active) => calls.push(active ? "on" : "off"),
    setTimer: (callback, delay) => {
      const id = ++sequence;
      timers.set(id, { callback: () => { timers.delete(id); callback(); }, delay });
      return id;
    },
    clearTimer: (id) => timers.delete(id),
  });
  return { state, timers, calls, player };
}

test("autoplay is initially off and advances only after an explicit start", () => {
  const { player, calls } = setup();
  assert.equal(player.active, false);
  assert.deepEqual(calls, []);
  player.start();
  player.start();
  assert.deepEqual(calls, ["on", "rewind", "advance"]);
});

test("arrival waits once before the next leg", () => {
  const { player, state, timers, calls } = setup();
  player.start();
  state.driving = false;
  player.arrived();
  player.arrived();
  assert.equal(timers.size, 1);
  const timer = Array.from(timers.values())[0];
  assert.equal(timer.delay, 1600);
  timer.callback();
  assert.equal(calls.filter((x) => x === "advance").length, 2);
});

test("stopping for a panel or background cancels dwell and freezes driving", () => {
  const { player, state, timers, calls } = setup();
  player.start();
  player.arrived();
  const stale = Array.from(timers.values())[0].callback;
  player.stop();
  stale();
  assert.equal(timers.size, 0);
  assert.equal(state.paused, true);
  assert.equal(calls.filter((x) => x === "advance").length, 1);
});

test("every start rewinds parked, moving and paused journeys to the first stop", () => {
  for (const initial of [
    { index: 9 },
    { index: 9, driving: true },
    { index: 9, driving: true, paused: true },
  ]) {
    const { player, state, calls } = setup(initial);
    player.start();
    assert.equal(state.index, 0);
    assert.equal(state.driving, true);
    assert.equal(state.paused, false);
    assert.deepEqual(calls, ["on", "rewind", "advance"]);
  }
});

test("the final arrival ends playback, and a new start explicitly rewinds", () => {
  const { player, state, timers, calls } = setup();
  player.start();
  Object.assign(state, { completed: true, driving: false });
  player.arrived();
  assert.equal(player.active, false);
  assert.equal(timers.size, 0);
  player.start();
  assert.deepEqual(calls.slice(-3), ["on", "rewind", "advance"]);
});

test("a stale callback cannot advance a newly started playback session", () => {
  const { player, state, timers, calls } = setup();
  player.start();
  state.driving = false;
  player.arrived();
  const stale = Array.from(timers.values())[0].callback;
  player.stop({ pause: false });
  player.start();
  state.driving = false;
  player.arrived();
  const currentTimer = player.timer;
  const advances = calls.filter((x) => x === "advance").length;
  stale();
  assert.equal(calls.filter((x) => x === "advance").length, advances);
  assert.equal(player.timer, currentTimer);
  player.stop();
  assert.equal(timers.size, 0);
});

test("a replaced arrival timer cannot shorten a later stop", () => {
  const { player, state, timers, calls } = setup();
  player.start();
  state.driving = false;
  player.arrived();
  const stale = Array.from(timers.values())[0].callback;
  player.arrived();
  const currentTimer = player.timer;
  stale();
  assert.equal(calls.filter((x) => x === "advance").length, 1);
  assert.equal(player.timer, currentTimer);
  timers.get(currentTimer).callback();
  assert.equal(calls.filter((x) => x === "advance").length, 2);
  assert.equal(timers.size, 0);
});

test("autoplay travels all 23 stops from the beginning and stops at the final arrival", () => {
  let player;
  let pending = null;
  const arrivals = [];
  const model = new DriveModel({
    count: 23,
    onArrive: (state) => { arrivals.push(state.index); player.arrived(); },
  });
  model.seek(12);
  model.startNext();
  model.tick(0.05);
  player = new AutoplayController({
    getState: () => model.state,
    advance: () => model.startNext(),
    resume: () => model.resume(),
    pause: () => model.pause(),
    rewind: () => model.seek(0),
    setTimer: (callback) => { pending = callback; return callback; },
    clearTimer: () => { pending = null; },
  });
  player.start();
  assert.equal(model.state.index, 0);
  assert.equal(model.state.progress, 0);
  for (let stop = 1; stop < 23; stop += 1) {
    for (let tick = 0; tick < 60 && model.state.driving; tick += 1) model.tick(0.05);
    assert.equal(model.state.index, stop);
    assert.equal(model.state.driving, false);
    if (stop < 22) {
      assert.equal(player.active, true);
      assert.equal(typeof pending, "function");
      const callback = pending;
      pending = null;
      callback();
      assert.equal(model.state.driving, true);
    }
  }
  assert.deepEqual(arrivals, Array.from({ length: 22 }, (_, index) => index + 1));
  assert.equal(player.active, false);
  assert.equal(model.state.completed, true);
  assert.equal(pending, null);
});
