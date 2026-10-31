import assert from "node:assert/strict";
import test from "node:test";
import { AutoplayController } from "../src/autoplay.mjs";

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
    rewind: () => { Object.assign(state, { index: 0, completed: false, driving: false }); calls.push("rewind"); },
    onChange: (active) => calls.push(active ? "on" : "off"),
    setTimer: (callback, delay) => { timers.set(++sequence, { callback, delay }); return sequence; },
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
  assert.deepEqual(calls, ["on", "advance"]);
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

test("autoplay resumes a paused leg without restarting it", () => {
  const { player, calls } = setup({ driving: true, paused: true });
  player.start();
  assert.deepEqual(calls, ["on", "resume"]);
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
  const advances = calls.filter((x) => x === "advance").length;
  stale();
  assert.equal(calls.filter((x) => x === "advance").length, advances);
});
