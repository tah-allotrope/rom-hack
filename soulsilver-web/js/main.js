// Entry: game state, title screen, wiring. Exposes window.GAME for battles.
import { W, H, ctx, setScreen, getScreen, loop, bindTouch, textbox, Menu, text, drawPanel, pressedEdge, clearPressed } from "./engine.js";
import { Overworld } from "./overworld.js";
import { SPECIES } from "./data.js";
import { MON_FRONT, blit } from "./sprites.js";
import { ensureAudio, playSong, stopSong, toggleMute, sfx } from "./audio.js";
export * as engine from "./engine.js";

const SAVE_KEY = "ssweb1";

export const GAME = {
  gender: "boy", name: "ASHER", rivalName: "SILAS",
  flags: {}, party: [], bag: { orbit: 0, potion: 0 }, badges: 0,
  pos: { map: "house", x: 3, y: 3, dir: "down" }, lastMon: "",
  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        gender: this.gender, name: this.name, flags: this.flags,
        party: this.party, bag: this.bag, badges: this.badges, pos: this.pos,
      }));
    } catch (e) { /* storage unavailable */ }
  },
  load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!s || !s.party) return false;
      Object.assign(this, s);
      if (this.party.length && this.party.every((m) => m.hp <= 0)) {
        for (const m of this.party) m.hp = m.maxhp; // black-out recovery
      }
      return true;
    } catch (e) { return false; }
  },
  registerCaught(foe) {
    if (foe._caught) return true;
    foe._caught = true;
    if (this.party.length >= 6) return false;
    // store a clean copy at current HP
    this.party.push(JSON.parse(JSON.stringify({ ...foe, stages: { atk: 0, def: 0 } })));
    this.save();
    return true;
  },
};
 window.GAME = GAME;

let ow = null;
export function overworld() {
  if (!ow) ow = new Overworld(GAME);
  return ow;
}
export function resetOverworld() { ow = new Overworld(GAME); }

class Title {
  constructor() { this.menu = null; this.t = 0; this.hasSave = GAME.load(); if (this.hasSave) { /* keep loaded */ } }
  enter() { playSong("town"); }
  update(dt) {
    this.t += dt;
    ensureAudio();
    if (textbox.open) {
      if (pressedEdge("a") || pressedEdge("start")) textbox.advance();
      return;
    }
    if (!this.menu) {
      if (pressedEdge("a") || pressedEdge("start") || pressedEdge("z")) {
        ensureAudio(); sfx.confirm();
        const items = this.hasSave ? ["CONTINUE", "NEW GAME"] : ["NEW GAME"];
        this.menu = new Menu(items, W / 2 - 44, 128, 88);
      }
      if (pressedEdge("m")) { const m = toggleMute(); textbox.say([m ? "Muted." : "Sound on."]); }
      return;
    }
    const c = this.menu.update();
    if (c === "__cancel") this.menu = null;
    else if (c === "CONTINUE") { resetOverworld(); setScreen(overworld()); }
    else if (c === "NEW GAME") {
      this.menu = new Menu(["BOY", "GIRL"], W / 2 - 44, 128, 88);
      this.pickGender = true;
    } else if (this.pickGender && (c === "BOY" || c === "GIRL")) {
      GAME.gender = c.toLowerCase();
      GAME.name = c === "BOY" ? "ASHER" : "LYRA";
      GAME.flags = {}; GAME.party = []; GAME.bag = { orbit: 0, potion: 0 };
      GAME.badges = 0; GAME.pos = { map: "house", x: 3, y: 3, dir: "down" };
      GAME.save(); resetOverworld(); setScreen(overworld());
    }
  }
  draw(g) {
    g.fillStyle = "#0a1a3a"; g.fillRect(0, 0, W, H);
    // starfield
    for (let i = 0; i < 40; i++) {
      const x = (i * 53 + Math.floor(this.t * 4)) % W, y = (i * 97) % 120;
      g.fillStyle = (i + Math.floor(this.t * 2)) % 5 === 0 ? "#f8d838" : "#8899cc";
      g.fillRect(x, y, 1, 1);
    }
    // logo
    g.font = "bold 22px monospace"; g.textBaseline = "top";
    g.fillStyle = "#f8d838"; g.fillText("SOULSILVER", 62, 34);
    g.font = "bold 10px monospace"; g.fillStyle = "#f8f8f8";
    g.fillText("W E B   R E M A K E", 74, 60);
    // marching creatures
    const order = ["skyro", "nibble", "pinebug", "voltpup", "gusthawk"];
    order.forEach((sp, i) => {
      const x = (W - ((this.t * 24 + i * 60) % (W + 60))) + 10;
      g.save(); g.translate(Math.floor(x), 78); blit(g, MON_FRONT[sp], 0, 0); g.restore();
    });
    text(g, this.hasSave ? "A saved journey awaits." : "A new legend begins.", 52, 112, "#9fb8e8");
    if (!this.menu) {
      if (Math.floor(this.t * 2) % 2 === 0) text(g, "PRESS Z / TAP TO START", 58, 132, "#f8d838");
      text(g, "ARROWS MOVE - Z CONFIRM - X BACK", 40, 168);
      text(g, "M MUTE", 104, 178, "#8899cc");
    } else this.menu.draw(g);
    window.__game = { screen: "title", t: this.t };
  }
}

window.addEventListener("pointerdown", ensureAudio, { once: false });
bindTouch();
setScreen(new Title());
requestAnimationFrame(loop);
