// Original pixel art: string maps (char -> color) and procedural tiles.
export const PAL = {
  K: "#181820", W: "#f4f4f4", S: "#f8c890", H: "#402818", h: "#c06018",
  R: "#e03030", r: "#e07030", B: "#2850c8", N: "#283060", G: "#38a048",
  g: "#78c878", Y: "#f8d838", O: "#f08018", P: "#9848c8", C: "#48c8e0",
  E: "#b8b8c8", D: "#585868", L: "#704828", M: "#c8a068",
};

// Draw a string-map sprite onto ctx at (dx,dy), each char 1px, optional flip.
export function blit(ctx, art, dx, dy, flip = false) {
  for (let y = 0; y < art.length; y++) {
    const row = art[y];
    for (let x = 0; x < row.length; x++) {
      const ch = flip ? row[row.length - 1 - x] : row[x];
      if (ch === "." || ch === " ") continue;
      const c = PAL[ch];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(dx + x, dy + y, 1, 1);
    }
  }
}

const HERO_DOWN = [
  ".....HHHHHH.....",
  "....HHHHHHHH....",
  "....HSSSSSSH....",
  "....HSESSHSH....",
  "....HSSSSSSH....",
  ".....SSSSSS.....",
  "....RRRRRRRR....",
  "...SRRRRRRRRS...",
  "...SRRRRRRRRS...",
  "....RRRRRRRR....",
  "....NNNNNNNN....",
  "....NNN..NNN....",
  "....NNN..NNN....",
  "....NNN..NNN....",
  "...KKK....KKK...",
  "...KKK....KKK...",
];
const HERO_DOWN2 = [
  ".....HHHHHH.....",
  "....HHHHHHHH....",
  "....HSSSSSSH....",
  "....HSESSHSH....",
  "....HSSSSSSH....",
  ".....SSSSSS.....",
  "....RRRRRRRR....",
  "...SRRRRRRRRS...",
  "...SRRRRRRRRS...",
  "....RRRRRRRR....",
  "....NNNNNNNN....",
  ".....NNN.NN.....",
  ".....NN...N.....",
  ".....NN...N.....",
  "...KK.....KKK...",
  "...KK.....KKK...",
];
const HERO_UP = [
  ".....HHHHHH.....",
  "....HHHHHHHH....",
  "....HHHHHHHH....",
  "....HHHHHHHH....",
  "....HHHHHHHH....",
  ".....SSSSSS.....",
  "....RRRRRRRR....",
  "...SRRRRRRRRS...",
  "...SRRRRRRRRS...",
  "....RRRRRRRR....",
  "....NNNNNNNN....",
  "....NNN..NNN....",
  "....NNN..NNN....",
  "....NNN..NNN....",
  "...KKK....KKK...",
  "...KKK....KKK...",
];
const HERO_SIDE = [
  ".....HHHHHH.....",
  "....HHHHHHSS....",
  "....HHHSSSS.....",
  "....HHHSES......",
  "....HHSSSS......",
  ".....SSSS.......",
  "....RRRRRR......",
  "...SRRRRRRR.....",
  "...SRRRRRRR.....",
  "....RRRRRR......",
  "....NNNNNN......",
  "....NNNNNN......",
  "....NNN.........",
  "....NNN.........",
  "...KKK..........",
  "...KKK..........",
];

function heroSet(shirt, hair) {
  const swap = (art) => art.map((r) =>
    r.split("").map((c) => (c === "R" ? shirt : c === "H" ? hair : c)).join(""));
  return { down: [swap(HERO_DOWN), swap(HERO_DOWN2)], up: [swap(HERO_UP), swap(HERO_UP)], side: [swap(HERO_SIDE), swap(HERO_SIDE)] };
}

export const HERO = { boy: heroSet("R", "H"), girl: heroSet("r", "h") };

// Generic NPC: coat/body color param.
function npc(shirt, pants, hair, coat = null) {
  const art = [
    ".....HHHHHH.....",
    "....HHHHHHHH....",
    "....HSSSSSSH....",
    "....HSESSHSH....",
    "....HSSSSSSH....",
    ".....SSSSSS.....",
    coat ? "..CCCCCCCCCC.." : "....SSSSSSSS....",
    coat ? ".SCCCCCCCCCS." : "...SSSSSSSS...",
    coat ? ".SCCCCCCCCCS." : "...SSSSSSSS...",
    coat ? ".SCCCCCCCCCS." : "...SSSSSSSS...",
    coat ? "..CCCCCCCCCC.." : "....SSSSSSSS....",
    "....PPPPPPPP....",
    "....PPP..PPP....",
    "....PPP..PPP....",
    "...KKK....KKK...",
    "...KKK....KKK...",
  ];
  return art.map((r) => r.split("").map((c) =>
    c === "S" && shirt !== "S" ? c : c).join(""));
}

function npcColored(shirt, pants, hair, coat) {
  const base = npc();
  return base.map((r) => r.split("").map((c) => {
    if (c === "H") return hair;
    if (r.indexOf("C") >= 0 && c === "C") return coat || c;
    return c;
  }).join("")).map((r, y) => {
    // recolor torso rows (6..10) S->shirt, legs rows (11..13) P->pants
    if (y >= 6 && y <= 10) return r.split("").map((c) => (c === "S" ? shirt : c)).join("");
    if (y >= 11 && y <= 13) return r.split("").map((c) => (c === "P" ? pants : c)).join("");
    return r;
  });
}

export const NPC = {
  mom:    npcColored("r", "B", "h"),
  elm:    npcColored("W", "N", "E", "W"),
  aide:   npcColored("C", "N", "H", "C"),
  nurse:  npcColored("W", "P", "O", "W"),
  guide:  npcColored("G", "N", "H"),
  sam:    npcColored("P", "N", "Y"),
  harlan: npcColored("C", "W", "O"),
  rival:  npcColored("K", "R", "R"),
};

// ---- creature fronts (20x20) ----
const F_EMBERCUB = [
  "....................",
  ".......RRRR.........",
  "......RRRRRRY.......",
  "......RYRRRYYY......",
  "......RRRRRYY.......",
  ".......RRRR.........",
  ".....OOSSSSOO.......",
  "....OOSSSSSSOO......",
  "....OSSKSSKSOO......",
  "....OSSSSSSSOO......",
  ".....OSSSSSOO.......",
  "......OOOOOO........",
  "....OOOOOOOOOO......",
  "...OOOOWWWOOOO......",
  "...OOOWWWWWOOO......",
  "...OOOWWWWWOOO......",
  "....OOOOOOOOO.......",
  ".....OOO..OOO.......",
  ".....KKK..KKK.......",
  "....................",
];
const F_AQUAPUP = [
  "....................",
  ".......CCCC.........",
  "......CCCCCC........",
  ".....CCCCCCCC.......",
  "......CCCCCC........",
  "....CCCSSSSCCC......",
  "....CCSSSSSSCC......",
  "....CSKSSSKSC.......",
  "....CSSSSSSSC.......",
  ".....SSSSSS.........",
  "....CCCCCCCC........",
  "...CCCCCCCCCC.......",
  "...CCWWWWWWCC.......",
  "...CCWWWWWWCC.......",
  "....CCCCCCCC........",
  ".....CCC..CC........",
  ".....KK...KK........",
  "....................",
  "....................",
  "....................",
];
const F_LEAFHOG = [
  "....................",
  "......GGGGG.........",
  ".....GGGGGGG........",
  ".....GGgGGgG........",
  ".....GGGGGGG........",
  "......GGGGG.........",
  ".....NNNNNNN.........",
  "....NNSSSSSNN.......",
  "....NSKSSKSNN.......",
  "....NSSSSSSSNN......",
  ".....SSSSSSN........",
  "....NNNNNNNNN.......",
  "...NNNGGGGNNNN......",
  "...NNGGGGGGNNN......",
  "...NNGGGGGGNNN......",
  "....NNNNNNNN........",
  ".....NN..NN.........",
  ".....KK..KK.........",
  "....................",
  "....................",
];
const F_SKYRO = [
  "....................",
  "....................",
  "........BB.........",
  ".......BBBB........",
  "......BBBWBB.......",
  ".......BBBB........",
  ".....WWSSSSWW.......",
  "....WWSSKSKSWW......",
  "....WWSSSSSSWW......",
  ".....WSSSSSSW.......",
  "...WWWWWWWWWWWW.....",
  "..WWWWWWWWWWWWWW....",
  "..WYYWWWWWWWWYYW....",
  "...WWWWWWWWWWWW.....",
  ".....WWWWWW.........",
  "......W..W..........",
  "......Y..Y..........",
  "....................",
  "....................",
  "....................",
];
const F_NIBBLE = [
  "....................",
  "....................",
  "....................",
  ".......PPPPP........",
  "......PPPPPPP.......",
  "......PPPPPPP.......",
  "....PPSSSSSSPP......",
  "....PSSKSSKSPP......",
  "....PSSSSSSSSPP.....",
  ".....SSSSSSSP.......",
  "....WWSSSSSS........",
  "....WWWWWWWW........",
  "...PPPPPPPPPP.......",
  "...PPPPPPPPPPP......",
  "....PPPPPPPP........",
  "......PP..PP........",
  "......KK..KK........",
  "....................",
  "....................",
  "....................",
];
const F_PINEBUG = [
  "....................",
  "....................",
  "....................",
  "....................",
  ".......NNNN.........",
  "......NNNNNN........",
  "......NKWKWN........",
  "......NNNNNN........",
  "...G..NNNNNN..G.....",
  "....GGNNNNNNGG......",
  ".....GNNNNNNG.......",
  ".....NNNNNNNN.......",
  ".....NNNNNNNN.......",
  "......NNNNNN........",
  ".......NNNN.........",
  "........NN..........",
  "....................",
  "....................",
  "....................",
  "....................",
];
const F_GUSTHAWK = [
  "....................",
  "........YY..........",
  ".......YYYY.........",
  "......YYWWYY........",
  ".......WWWW.........",
  ".....CCSSSSCC.......",
  "....CCSKSSKSCC......",
  "....CCSSSSSSCC......",
  ".....CSSSSSSSC......",
  "......CCCCCC........",
  "..CCCCCCCCCCCCCC....",
  ".CCCCCCCCCCCCCCCC...",
  ".CCWWCCCCCCCCWWCC...",
  "..CCCCCCCCCCCCCC....",
  "....CCCCCCCCCC......",
  "......CC..CC........",
  "......YY..YY........",
  "....................",
  "....................",
  "....................",
];
const F_VOLTPUP = [
  "....................",
  "....................",
  "......YY..YY........",
  "......YYY.YYY.......",
  ".......YYYYY........",
  "......YYYYYY........",
  ".....YYSSSSYY.......",
  ".....YSKSSKSY.......",
  ".....YSSSSSSY.......",
  "......SSSSSS........",
  ".....YYYYYYYY.......",
  "....YYYYYYYYYY......",
  "....YYWWWWWWYY......",
  "....YYWWWWWWYY......",
  ".....YYYYYYYY.......",
  "......YY..YY........",
  "......KK..KK........",
  "....................",
  "....................",
  "....................",
];

// backs: simplified rear views (darker + head bump)
function makeBack(front, dark) {
  return front.map((row, y) => {
    if (y < 6) return "....................";
    return row.split("").map((c) => {
      if (c === "." || c === " ") return ".";
      if ("KW".includes(c)) return c;
      return dark;
    }).join("");
  });
}

export const MON_FRONT = {
  embercub: F_EMBERCUB, aquapup: F_AQUAPUP, leafhog: F_LEAFHOG,
  skyro: F_SKYRO, nibble: F_NIBBLE, pinebug: F_PINEBUG,
  gusthawk: F_GUSTHAWK, voltpup: F_VOLTPUP,
};
export const MON_BACK = {
  embercub: makeBack(F_EMBERCUB, "O"),
  aquapup: makeBack(F_AQUAPUP, "C"),
  leafhog: makeBack(F_LEAFHOG, "G"),
  skyro: makeBack(F_SKYRO, "B"),
  nibble: makeBack(F_NIBBLE, "P"),
  pinebug: makeBack(F_PINEBUG, "N"),
  gusthawk: makeBack(F_GUSTHAWK, "C"),
  voltpup: makeBack(F_VOLTPUP, "Y"),
};

// ---- procedural tiles (16x16), drawn with rects ----
export function drawTile(ctx, t, x, y, frame = 0) {
  const R = (cx, cy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + cx, y + cy, w, h); };
  switch (t) {
    case ",":
      R(0, 0, 16, 16, "#5da862"); R(3, 5, 2, 2, "#529a58"); R(10, 9, 2, 2, "#529a58"); R(6, 12, 2, 2, "#67b46c");
      break;
    case ".":
      R(0, 0, 16, 16, "#d8b878"); R(0, 0, 16, 1, "#c8a868"); R(4, 4, 2, 1, "#c8a868"); R(9, 10, 2, 1, "#c8a868");
      break;
    case "~":
      R(0, 0, 16, 16, "#c8a060"); R(0, 7, 16, 2, "#b89058"); R(0, 0, 16, 1, "#b89058");
      break;
    case "G": {
      R(0, 0, 16, 16, "#4c9448");
      const o = frame % 2;
      R(2 + o, 3, 2, 8, "#3d7d3a"); R(7 - o, 2, 2, 9, "#3d7d3a"); R(12 + o, 4, 2, 8, "#3d7d3a");
      R(3 + o, 2, 1, 3, "#67b46c"); R(8 - o, 1, 1, 3, "#67b46c");
      break;
    }
    case "F":
      R(0, 0, 16, 16, "#5da862"); R(4, 4, 3, 3, "#f4f4f4"); R(5, 5, 1, 1, "#f8d838");
      R(11, 9, 3, 3, "#e86a8a"); R(12, 10, 1, 1, "#f8d838");
      break;
    case "T":
      R(0, 0, 16, 16, "#5da862"); R(7, 10, 2, 6, "#704828");
      R(3, 2, 10, 9, "#2e7d32"); R(5, 0, 6, 4, "#388e3c"); R(4, 4, 2, 2, "#4caf50");
      break;
    case "W": {
      R(0, 0, 16, 16, "#3d7dc8");
      const o = frame % 2 ? 2 : 0;
      R(2 + o, 4, 5, 1, "#7db8e8"); R(9 - o, 10, 5, 1, "#7db8e8"); R(4, 13, 4, 1, "#7db8e8");
      break;
    }
    case "#":
      R(0, 0, 16, 16, "#202028"); break;
    case "H":
      R(0, 0, 16, 16, "#e8d8b8"); R(0, 0, 16, 2, "#d0b898"); R(0, 7, 16, 1, "#d0b898"); R(0, 14, 16, 2, "#d0b898");
      break;
    case "R":
      R(0, 0, 16, 16, "#c03828"); R(0, 3, 16, 1, "#982818"); R(0, 7, 16, 1, "#982818"); R(0, 11, 16, 1, "#982818"); R(0, 15, 16, 1, "#982818");
      break;
    case "D":
      R(0, 0, 16, 16, "#d8b878"); R(3, 0, 10, 16, "#8a5a28"); R(5, 2, 6, 12, "#6e4520"); R(9, 7, 2, 2, "#f8d838");
      break;
    case "C":
      R(0, 0, 16, 16, "#c8a068"); R(0, 0, 16, 6, "#e08080"); R(0, 0, 16, 1, "#f0a0a0"); R(0, 6, 16, 2, "#8a5a28");
      break;
    case "L":
      R(0, 0, 16, 16, "#b8b8c8"); R(0, 0, 16, 3, "#d8d8e8"); R(4, 3, 2, 13, "#9898a8"); R(10, 3, 2, 13, "#9898a8");
      break;
    case "O":
      R(0, 0, 16, 16, "#b8b8c8"); R(1, 10, 14, 6, "#888898");
      R(2, 5, 3, 4, "#e03030"); R(2, 7, 3, 1, "#f4f4f4");
      R(6, 5, 3, 4, "#f8d838"); R(6, 7, 3, 1, "#f4f4f4");
      R(10, 5, 3, 4, "#38a048"); R(10, 7, 3, 1, "#f4f4f4");
      break;
    case "B":
      R(0, 0, 16, 16, "#8a5a28"); R(1, 1, 14, 4, "#4858a8"); R(1, 6, 14, 4, "#a84848"); R(1, 11, 14, 4, "#48a858");
      R(0, 5, 16, 1, "#5e3a18"); R(0, 10, 16, 1, "#5e3a18");
      break;
    case "S":
      R(0, 0, 16, 16, "#5da862"); R(6, 4, 4, 8, "#8a5a28"); R(5, 2, 6, 5, "#48a858"); R(6, 3, 4, 2, "#78c878");
      break;
    case "P":
      R(0, 0, 16, 16, "#b8b8c8"); R(5, 9, 6, 5, "#a8542c"); R(4, 4, 8, 6, "#38a048"); R(6, 2, 4, 3, "#4caf50");
      break;
    case "=":
      R(0, 0, 16, 16, "#5da862"); R(0, 3, 16, 2, "#e8d8b8"); R(0, 11, 16, 2, "#e8d8b8");
      R(3, 0, 2, 16, "#c8b898"); R(11, 0, 2, 16, "#c8b898");
      break;
    case "_":
      R(0, 0, 16, 16, "#c8a068"); R(0, 5, 16, 1, "#b89058"); R(0, 11, 16, 1, "#b89058"); R(5, 0, 1, 16, "#b89058"); R(11, 0, 1, 16, "#b89058");
      break;
    case ":":
      R(0, 0, 16, 16, "#d0d0e0"); R(0, 0, 8, 8, "#c0c0d0"); R(8, 8, 8, 8, "#c0c0d0");
      break;
    case "+":
      R(0, 0, 16, 16, "#e8e0d0"); R(7, 0, 2, 16, "#c03828"); R(0, 7, 16, 2, "#c03828");
      break;
    default:
      R(0, 0, 16, 16, "#ff00ff");
  }
}
