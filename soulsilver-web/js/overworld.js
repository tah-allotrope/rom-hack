// Overworld: tile maps, player, NPCs, warps, encounters, story events.
import { MAPS, DIALOG, STARTERS, RIVAL_PICK, WILD_R29, RIVAL_TEAM, GYM_TRAINER, GYM_LEADER, SPECIES } from "./data.js";
import { W, H, TILE, input, pressedEdge, textbox, fmtPages, Menu, text } from "./engine.js";
import { drawTile, HERO, NPC, blit } from "./sprites.js";
import { Battle, makeMon } from "./battle.js";
import { playSong } from "./audio.js";
import { sfx } from "./audio.js";

const SOLID = new Set(["#", "T", "W", "H", "R", "C", "L", "O", "B", "S", "P", "="]);
const TALL = new Set(["G"]);

function sub(s, game) {
  return s.replace("{name}", game.name).replace("{rival}", game.rivalName).replace("{mon}", game.lastMon || "");
}

export class Overworld {
  constructor(game) {
    this.game = game;
    const p = game.pos;
    this.map = p.map; this.x = p.x; this.y = p.y; this.dir = p.dir || "down";
    this.px = this.x * TILE; this.py = this.y * TILE;
    this.moving = false; this.stepT = 0; this.walkFrame = 0;
    this.event = false; // event lock
    this.menu = null;
    this.frame = 0;
    this.npcs = this.buildNpcs(this.map);
    playSong(this.map === "gym" ? "gym" : "town");
  }
  buildNpcs(map) {
    const G = this.game, F = G.flags, list = [];
    const add = (x, y, spr, id) => list.push({ x, y, spr, id });
    if (map === "house") add(3, 1, NPC.mom, "mom");
    if (map === "lab") {
      add(4, 1, NPC.elm, "elm");
      add(6, 1, NPC.aide, "aide");
    }
    if (map === "center") add(4, 1, NPC.nurse, "nurse");
    if (map === "violet" && !F.badge1) add(17, 13, NPC.guide, "guide");
    if (map === "gym" && !F.beat_sam) add(4, 4, NPC.sam, "sam");
    if (map === "gym") add(4, 1, NPC.harlan, "harlan");
    if (map === "violethouse") add(2, 1, NPC.guide, "neighbor");
    if (this.map === map && F.rival_out && !F.beat_rival && map === "newbark") add(12, 14, NPC.rival, "rival");
    return list;
  }
  goto(map, x, y) {
    this.map = map; this.x = x; this.y = y; this.px = x * TILE; this.py = y * TILE;
    this.moving = false;
    this.npcs = this.buildNpcs(map);
    this.game.pos = { map, x, y, dir: this.dir };
    playSong(map === "gym" ? "gym" : "town");
    sfx.confirm();
  }
  tile(x, y) {
    const m = MAPS[this.map];
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return "#";
    return m.rows[y][x];
  }
  solid(x, y) {
    if (this.npcs.some((n) => n.x === x && n.y === y)) return true;
    const t = this.tile(x, y);
    if (t === "D" && !(MAPS[this.map].warps && MAPS[this.map].warps[`${x},${y}`])) return true;
    return SOLID.has(t);
  }
  facing() {
    const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[this.dir];
    return [this.x + d[0], this.y + d[1]];
  }
  update(dt, frame) {
    this.frame = frame;
    if (textbox.open) {
      if (pressedEdge("a") || pressedEdge("start")) { sfx.blip(); textbox.advance(); }
      return;
    }
    if (this.menu) {
      const c = this.menu.update();
      if (c === "__cancel") this.menu = null;
      else if (c && this.menuCb) { const cb = this.menuCb; this.menu = null; this.menuCb = null; cb(c); }
      return;
    }
    if (this.event) return;
    // movement
    let dx = 0, dy = 0, dir = null;
    if (input.up()) { dy = -1; dir = "up"; }
    else if (input.down()) { dy = 1; dir = "down"; }
    else if (input.left()) { dx = -1; dir = "left"; }
    else if (input.right()) { dx = 1; dir = "right"; }
    if (dir) {
      this.dir = dir;
      if (!this.moving) {
        const nx = this.x + dx, ny = this.y + dy;
        if (!this.solid(nx, ny)) {
          this.moving = true; this.stepT = 0;
          this.fromX = this.x; this.fromY = this.y; this.x = nx; this.y = ny;
          this.walkFrame ^= 1;
        }
      }
    }
    if (this.moving) {
      this.stepT += dt * 4.2;
      if (this.stepT >= 1) {
        this.stepT = 0; this.moving = false;
        this.px = this.x * TILE; this.py = this.y * TILE;
        this.afterStep();
      }
    }
    this.game.pos = { map: this.map, x: this.x, y: this.y, dir: this.dir };
    if (pressedEdge("a")) this.interact();
    if (pressedEdge("start")) this.openPause();
  }
  afterStep() {
    const t = this.tile(this.x, this.y);
    // warps
    const key = `${this.x},${this.y}`;
    const w = MAPS[this.map].warps && MAPS[this.map].warps[key];
    if ((t === "D" || w) && w) {
      const [m, x, y] = w.split(","); this.goto(m, +x, +y); return;
    }
    // rival trigger outside lab
    if (this.map === "newbark" && this.game.flags.got_starter && !this.game.flags.beat_rival &&
        this.x >= 7 && this.x <= 11 && (this.y === 13 || this.y === 14)) {
      if (!this.game.flags.rival_out) {
        this.game.flags.rival_out = true;
        this.npcs = this.buildNpcs(this.map);
      }
      return;
    }
    // wild encounters
    if (TALL.has(t) && this.hasConscious()) {
      if (Math.random() < 0.12) this.startWild();
    }
  }
  hasConscious() { return this.game.party.some((m) => m.hp > 0); }
  openPause() {
    sfx.confirm();
    this.menu = new Menu(["PARTY", "BAG", "SAVE", "QUIT"], W - 84, 24, 76);
    this.menuCb = (c) => {
      if (c === "PARTY") this.showParty();
      else if (c === "BAG") this.showBag();
      else if (c === "SAVE") { this.game.save(); textbox.say(["Progress saved!"]); sfx.confirm(); }
      else if (c === "QUIT") { window.location.reload(); }
    };
  }
  showParty() {
    const lines = this.game.party.map((m) => `${SPECIES[m.sp].name} LV${m.lv} ${m.hp}/${m.maxhp}`);
    textbox.say([lines.join("\n") || "(empty)"]);
  }
  showBag() {
    const b = this.game.bag;
    textbox.say([`ORBIT BALL x${b.orbit}\nPOTION x${b.potion}`]);
  }
  interact() {
    const [fx, fy] = this.facing();
    const npc = this.npcs.find((n) => n.x === fx && n.y === fy);
    const t = this.tile(fx, fy);
    const G = this.game;
    if (npc) return this.talk(npc.id);
    if (t === "S") {
      const s = MAPS[this.map].signs && MAPS[this.map].signs[`${fx},${fy}`];
      textbox.say(fmtPages(sub(s || DIALOG.locked, G))); sfx.blip(); return;
    }
    if (t === "O") return this.starterEvent();
    if (t === "D") { textbox.say(["It's locked."]); return; }
    if (t === "C") { textbox.say(fmtPages("It's the counter.")); return; }
    if (t === "B") { textbox.say(fmtPages(sub(DIALOG.books, G))); return; }
    if (t === "P") { textbox.say(fmtPages(sub(DIALOG.plant, G))); return; }
    if (t === "L") { textbox.say(fmtPages(sub(DIALOG.machine, G))); return; }
  }
  talk(id) {
    const G = this.game, F = G.flags;
    const say = (key, done) => textbox.say(fmtPages(sub(DIALOG[key], G)), done);
    switch (id) {
      case "mom":
        this.heal();
        if (G.bag.potion < 3) {
          G.bag.potion = 3;
          textbox.say(["MOM: Take these POTIONS,\nsweetie. Be careful!",
            ...fmtPages(sub(DIALOG[F.got_starter ? "mom_after" : "mom_before"], G))]);
        }
        else say(F.got_starter ? "mom_after" : "mom_before");
        break;
      case "elm":
        if (!F.got_starter) say("elm_intro");
        else if (!F.got_balls) {
          F.got_balls = true; G.bag.orbit += 5; G.bag.potion += 3; G.save();
          say("elm_balls");
        }
        else say("elm_after_pick");
        break;
      case "aide": say("aide"); break;
      case "nurse":
        this.heal(); say("center_nurse"); break;
      case "guide": say("guide"); break;
      case "neighbor": textbox.say(["It's a quiet house.\nSomeone lives here."]); break;
      case "rival":
        if (!F.beat_rival && F.got_starter) this.rivalBattle();
        else say("rival_after");
        break;
      case "sam":
        this.event = true;
        textbox.say(fmtPages(sub(DIALOG.trainer_sam, G)), () => {
          this.startBattle(GYM_TRAINER, { trainer: { name: "SAM" } }, (win) => {
            this.event = false;
            if (win) { F.beat_sam = true; this.npcs = this.buildNpcs(this.map); this.healSilent(); }
            else this.faintReset();
          });
        });
        break;
      case "harlan":
        if (F.badge1) { textbox.say(["HARLAN: With that badge,\nyou can go far."]); break; }
        this.event = true;
        textbox.say(fmtPages(sub(DIALOG.harlan_before, G)), () => {
          this.startBattle(GYM_LEADER, { trainer: { name: "HARLAN", after: DIALOG.harlan_after } }, (win) => {
            this.event = false;
            if (win) {
              F.badge1 = true; G.badges = 1; G.save(); sfx.badge();
              textbox.say(fmtPages(sub(DIALOG.badge_get, G)));
              this.healSilent();
            } else this.faintReset();
          });
        });
        break;
    }
  }
  starterEvent() {
    const G = this.game;
    if (G.flags.got_starter) { textbox.say(["The machine hums quietly."]); return; }
    this.event = true;
    const names = STARTERS.map((s) => SPECIES[s].name.toUpperCase());
    this.menu = new Menu(names, 40, 60, 110);
    this.menuCb = (c) => {
      if (c === "__cancel") { this.event = false; return; }
      const idx = names.indexOf(c);
      const sp = STARTERS[idx];
      const mon = makeMon(sp, 5);
      G.party.push(mon); G.flags.got_starter = sp; G.lastMon = SPECIES[sp].name.toUpperCase();
      G.save(); sfx.catch_();
      textbox.say([`You chose ${SPECIES[sp].name}!`, ...fmtPages(sub(DIALOG.elm_after_pick, G))],
        () => { this.event = false; });
    };
  }
  rivalBattle() {
    const G = this.game;
    this.event = true;
    const team = [{ sp: RIVAL_PICK[G.flags.got_starter], lv: 4 }];
    textbox.say(fmtPages(sub(DIALOG.rival_before, G)), () => {
      this.startBattle(team, { trainer: { name: G.rivalName } }, (win) => {
        if (win) {
          G.flags.beat_rival = true; G.save();
          this.npcs = this.buildNpcs(this.map);
          textbox.say(fmtPages(sub(DIALOG.rival_after, G)), () => {
            this.event = false;
            // Elm runs out with supplies
            textbox.say(fmtPages(sub(DIALOG.elm_balls, G)), () => {
              G.flags.got_balls = true; G.bag.orbit += 5; G.bag.potion += 3; G.save();
            });
          });
        } else { this.event = false; this.faintReset(); }
      });
    });
  }
  startWild() {
    // pick encounter
    const total = WILD_R29.reduce((a, e) => a + e.w, 0);
    let r = Math.random() * total, pick = WILD_R29[0];
    for (const e of WILD_R29) { r -= e.w; if (r <= 0) { pick = e; break; } }
    const lv = pick.min + Math.floor(Math.random() * (pick.max - pick.min + 1));
    this.startBattle([{ sp: pick.sp, lv }], {}, (win) => { if (!win) this.faintReset(); });
  }
  startBattle(foes, opts, cb) {
    import("./main.js").then((m) => {
      playSong("battle");
      const { setScreen } = m.engine;
      setScreen(new Battle(this.game.party, foes, {
        trainer: opts.trainer || null,
        onEnd: (win) => {
          playSong(this.map === "gym" ? "gym" : "town");
          if (win) this.game.save();
          setScreen(m.overworld());
          cb(win);
        },
      }));
    });
  }
  heal() { for (const m of this.game.party) { m.hp = m.maxhp; m.status = null; m.moves.forEach((mv) => { const d = { tackle: 35 }; }); } this.healSilent(); sfx.heal(); }
  healSilent() {
    import("./battle.js").then(({ MOVES }) => {
      for (const m of this.game.party) { m.hp = m.maxhp; m.status = null; m.stages = { atk: 0, def: 0 }; m.moves.forEach((mv) => { mv.pp = MOVES[mv.id].pp; }); }
    });
  }
  faintReset() {
    // wipe to last center/heal: respawn at mom's house with healed party
    this.healSilent();
    for (const m of this.game.party) m.hp = m.maxhp;
    textbox.say(["You hurry home to heal..."], () => this.goto("house", 3, 3));
  }
  draw(g) {
    g.fillStyle = "#000"; g.fillRect(0, 0, 256, 192);
    const m = MAPS[this.map];
    const ox = Math.max(0, Math.min(m.w * TILE - W, Math.floor(this.px + 8 - W / 2)));
    const oy = Math.max(0, Math.min(m.h * TILE - H, Math.floor(this.py + 8 - H / 2)));
    const x0 = Math.floor(ox / TILE), y0 = Math.floor(oy / TILE);
    for (let y = y0; y <= y0 + H / TILE; y++) {
      for (let x = x0; x <= x0 + W / TILE; x++) {
        if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue;
        drawTile(g, m.rows[y][x], x * TILE - ox, y * TILE - oy, Math.floor(this.frame / 30));
      }
    }
    const drawChar = (sx, sy, art) => {
      g.save(); g.translate(Math.floor(sx - ox), Math.floor(sy - oy)); blit(g, art, 0, 0); g.restore();
    };
    const ents = [...this.npcs.map((n) => ({ y: n.y, f: () => drawChar(n.x * TILE, n.y * TILE - 4, n.spr) })),
      {
        y: this.y + 0.01, f: () => {
          const set = HERO[this.game.gender];
          const art = this.dir === "up" ? set.up[this.moving ? this.walkFrame : 0]
            : this.dir === "down" ? set.down[this.moving ? this.walkFrame : 0]
            : set.side[this.moving ? this.walkFrame : 0];
          const bob = this.moving && this.frame % 12 < 6 ? -1 : 0;
          g.save(); g.translate(Math.floor(this.px - ox), Math.floor(this.py - oy - 4 + bob));
          if (this.dir === "left") { g.translate(16, 0); g.scale(-1, 1); }
          blit(g, art, 0, 0); g.restore();
        },
      }];
    ents.sort((a, b) => a.y - b.y).forEach((e) => e.f());
    if (this.menu) this.menu.draw(g);
    // debug handle for automated verification
    window.__ow = { map: this.map, x: this.x, y: this.y, event: this.event, menu: !!this.menu,
      npcs: this.npcs.map((n) => [n.x, n.y]), rows: MAPS[this.map].rows };
  }
}
