// Engine: canvas, input (keyboard+touch), text box, screen stack, main loop.
export const W = 256, H = 192, TILE = 16;

export const canvas = document.getElementById("screen");
export const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

// ---- input ----
export const keys = {};
const pressed = {}; // edge-triggered queue
window.addEventListener("keydown", (e) => {
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
  if (!keys[e.key]) pressed[e.key] = true;
  keys[e.key] = true;
});
window.addEventListener("keyup", (e) => { keys[e.key] = false; });

// logical buttons; also wired to on-screen touch controls + mouse clicks
export const input = {
  up: () => keys.ArrowUp || keys.w || keys.W,
  down: () => keys.ArrowDown || keys.s || keys.S,
  left: () => keys.ArrowLeft || keys.a || keys.A,
  right: () => keys.ArrowRight || keys.d || keys.D,
  a: () => keys.z || keys.Z || keys.j || keys.J,
  b: () => keys.x || keys.X || keys.k || keys.K,
  start: () => keys.Enter,
};
const EDGE_MAP = {};
export function pressedEdge(name) {
  // check raw keys for the mapped physical keys
  const map = {
    up: ["ArrowUp","w","W"], down: ["ArrowDown","s","S"],
    left: ["ArrowLeft","a","A"], right: ["ArrowRight","d","D"],
    a: ["z","Z","j","J"], b: ["x","X","k","K"], start: ["Enter"],
  }[name] || [];
  for (const k of map) {
    if (pressed[k]) { pressed[k] = false; return true; }
  }
  return false;
}
export function clearPressed() { for (const k in pressed) pressed[k] = false; }

// touch buttons set these virtual keys
export function bindTouch() {
  document.querySelectorAll("[data-key]").forEach((el) => {
    const k = el.dataset.key;
    const dn = (e) => { e.preventDefault(); if (!keys[k]) pressed[k] = true; keys[k] = true; };
    const up = (e) => { e.preventDefault(); keys[k] = false; };
    el.addEventListener("pointerdown", dn);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointerleave", up);
    el.addEventListener("pointercancel", up);
  });
}

// ---- text box ----
export class TextBox {
  constructor() { this.queue = []; this.chars = 0; this.open = false; this.onDone = null; }
  say(pages, onDone = null) {
    // pages: array of strings, \n = newline
    this.queue = [...pages]; this.chars = 0; this.open = true; this.onDone = onDone;
  }
  get text() { return this.queue[0] || ""; }
  get shown() { return this.text.slice(0, Math.floor(this.chars)); }
  get done() { return this.chars >= this.text.length; }
  update(dt) {
    if (!this.open) return;
    if (!this.done) this.chars = Math.min(this.text.length, this.chars + dt * 60);
  }
  // returns true when fully closed (caller should proceed)
  advance() {
    if (!this.open) return true;
    if (!this.done) { this.chars = this.text.length; return false; }
    this.queue.shift(); this.chars = 0;
    if (this.queue.length === 0) { this.open = false; const f = this.onDone; this.onDone = null; if (f) f(); return true; }
    return false;
  }
  draw(g) {
    if (!this.open) return;
    g.fillStyle = "#f8f8f8"; g.fillRect(4, H - 56, W - 8, 52);
    g.fillStyle = "#181820"; g.fillRect(6, H - 54, W - 12, 48);
    g.fillStyle = "#f8f8f8"; g.font = "8px monospace"; g.textBaseline = "top";
    const lines = this.shown.split("\n");
    lines.slice(0, 4).forEach((ln, i) => g.fillText(ln, 10, H - 50 + i * 11));
    if (this.done) {
      const b = Math.floor(performance.now() / 300) % 2 === 0 ? "▼" : " ";
      g.fillText(b, W - 16, H - 16);
    }
  }
}
export const textbox = new TextBox();

// ---- screens ----
let screen = null;
export function setScreen(s) { screen = s; if (screen.enter) screen.enter(); clearPressed(); }
export function getScreen() { return screen; }

let last = 0, acc = 0;
const STEP = 1000 / 60;
let frame = 0;
export function loop(t) {
  requestAnimationFrame(loop);
  if (!last) last = t;
  acc += Math.min(100, t - last); last = t;
  while (acc >= STEP) {
    acc -= STEP; frame++;
    if (screen && screen.update) screen.update(1 / 60, frame);
    textbox.update(1 / 60);
  }
  if (screen && screen.draw) { screen.draw(ctx); textbox.draw(ctx); }
}

export function fmtPages(s) {
  // split a dialog string on \n\n into pages
  return s.split("\n\n");
}

export function drawPanel(g, x, y, w, h) {
  g.fillStyle = "#f8f8f8"; g.fillRect(x, y, w, h);
  g.fillStyle = "#181820"; g.fillRect(x + 2, y + 2, w - 4, h - 4);
}

export function text(g, s, x, y, color = "#f8f8f8") {
  g.fillStyle = color; g.font = "8px monospace"; g.textBaseline = "top";
  g.fillText(s, x, y);
}

// menu helper: items drawn in a panel, index state, returns chosen on A
export class Menu {
  constructor(items, x, y, w = 72) { this.items = items; this.i = 0; this.x = x; this.y = y; this.w = w; }
  update() {
    if (pressedEdge("up")) this.i = (this.i + this.items.length - 1) % this.items.length;
    if (pressedEdge("down")) this.i = (this.i + 1) % this.items.length;
    if (pressedEdge("a") || pressedEdge("start")) return this.items[this.i];
    if (pressedEdge("b")) return "__cancel";
    return null;
  }
  draw(g) {
    const h = this.items.length * 12 + 8;
    drawPanel(g, this.x, this.y, this.w, h);
    this.items.forEach((it, k) => {
      text(g, (k === this.i ? "▶" : " ") + it, this.x + 8, this.y + 5 + k * 12,
        k === this.i ? "#f8d838" : "#f8f8f8");
    });
  }
}
