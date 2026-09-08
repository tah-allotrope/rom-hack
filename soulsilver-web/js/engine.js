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

// ---- DS chrome helpers: rounded panels, proportional font ----
const DS_FONT = 'Verdana, Tahoma, "DejaVu Sans", sans-serif';
function rr(g, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function triR(g, x, y, s, color) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x, y + s);
  g.lineTo(x + s * 0.9, y + s / 2);
  g.closePath();
  g.fill();
}
function triD(g, cx, y, s, color) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(cx - s / 2, y);
  g.lineTo(cx + s / 2, y);
  g.lineTo(cx, y + s);
  g.closePath();
  g.fill();
}
function panelChrome(g, x, y, w, h) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  g.save();
  g.fillStyle = "rgba(0,0,0,0.35)";
  rr(g, x + 1, y + 2, w, h, 5); g.fill();
  g.fillStyle = "#fdfdf4";
  rr(g, x, y, w, h, 5); g.fill();
  g.lineWidth = 2; g.strokeStyle = "#ffffff";
  rr(g, x + 1, y + 1, w - 2, h - 2, 4); g.stroke();
  g.lineWidth = 1; g.strokeStyle = "#3c5a8a";
  rr(g, x + 2.5, y + 2.5, w - 5, h - 5, 3); g.stroke();
  g.strokeStyle = "#9fb4d8";
  rr(g, x + 4, y + 4, w - 8, h - 8, 2); g.stroke();
  g.restore();
}
function isDarkColor(c) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c || "");
  if (!m) return true;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
  const r = parseInt(h.slice(0, 2), 16), gg = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * gg + 0.114 * b) < 128;
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
    const bx = 4, bw = W - 8, bh = 52, by = H - 56;
    panelChrome(g, bx, by, bw, bh);
    // tail notch on the top edge, right side (speaker tab)
    const tx = bx + bw - 46;
    g.save();
    g.fillStyle = "#fdfdf4";
    g.strokeStyle = "#3c5a8a"; g.lineWidth = 1;
    g.beginPath();
    g.moveTo(tx, by + 1); g.lineTo(tx + 6, by - 5); g.lineTo(tx + 12, by + 1);
    g.closePath();
    g.fill(); g.stroke();
    g.restore();
    // name-plate row: a "NAME: ..." prefix gets its own plate above the box
    const m = this.shown.match(/^([A-Z][A-Z .'\-]{1,11}):(?:\s|\n)/);
    if (m) {
      const nw = m[1].length * 7 + 16;
      panelChrome(g, bx + 6, by - 13, nw, 15);
      text(g, m[1], bx + 14, by - 10, "#14305a", 8, true);
    }
    const lines = this.shown.split("\n");
    lines.slice(0, 4).forEach((ln, i) => text(g, ln, bx + 10, by + 8 + i * 11, "#182028"));
    if (this.done && Math.floor(performance.now() / 400) % 2 === 0) triD(g, bx + bw - 14, by + bh - 12, 6, "#c02020");
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
  panelChrome(g, x, y, w, h);
}

export function text(g, s, x, y, color = "#f8f8f8", size = 8, bold = false) {
  x = Math.round(x); y = Math.round(y);
  g.save();
  g.font = `${bold ? "bold " : ""}${size}px ${DS_FONT}`;
  g.textBaseline = "top"; g.textAlign = "left";
  g.fillStyle = isDarkColor(color) ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.7)";
  g.fillText(s, x + 1, y + 1);
  g.fillStyle = color;
  g.fillText(s, x, y);
  g.restore();
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
    const rh = 13, h = this.items.length * rh + 8;
    drawPanel(g, this.x, this.y, this.w, h);
    this.items.forEach((it, k) => {
      const iy = this.y + 5 + k * rh, sel = k === this.i;
      if (sel) { g.fillStyle = "#dce8f8"; rr(g, this.x + 4, iy - 1, this.w - 8, rh, 3); g.fill(); }
      if (sel) triR(g, this.x + 7, iy + 2, 8, "#2a4a8a");
      text(g, it, this.x + 18, iy + 1, sel ? "#102848" : "#33405a", 8, sel);
    });
  }
}
