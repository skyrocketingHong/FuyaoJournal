export class AutoplayController {
  constructor({ getState, advance, resume, pause, rewind, onChange, dwell = 1600, setTimer = setTimeout, clearTimer = clearTimeout }) {
    Object.assign(this, { getState, advance, resume, pause, rewind, onChange, dwell, setTimer, clearTimer });
    this.active = false;
    this.timer = null;
    this.generation = 0;
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.generation += 1;
    this.onChange?.(true);
    this.rewind();
    this._advance();
  }

  stop({ pause = true } = {}) {
    const changed = this.active;
    this.active = false;
    this.generation += 1;
    if (this.timer !== null) this.clearTimer(this.timer);
    this.timer = null;
    if (pause) this.pause();
    if (changed) this.onChange?.(false);
  }

  arrived() {
    if (!this.active) return;
    if (this.getState().completed) {
      this.stop({ pause: false });
      return;
    }
    if (this.timer !== null) this.clearTimer(this.timer);
    const generation = ++this.generation;
    this.timer = this.setTimer(() => {
      if (!this.active || this.generation !== generation) return;
      this.timer = null;
      this._advance();
    }, this.dwell);
  }

  _advance() {
    if (!this.active) return;
    const state = this.getState();
    if (state.completed) return this.stop({ pause: false });
    if (state.driving) {
      if (state.paused) this.resume();
    } else if (this.advance() === false) this.stop({ pause: false });
  }

  destroy() { this.stop(); }
}
