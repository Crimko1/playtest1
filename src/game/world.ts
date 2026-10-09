import { upperBoxes, STAIR_ROOMS, ACCESS_THEMES, stairOrigin } from "./upper-world";
import { rng, WALLPAPERS, FLOORS, type Wallpaper, type Floor } from "./textures";
import { ITEMS, SCRAP_IDS } from "./data";
import { segmentBlocked, hourlyScrapTarget } from "./rules";

export const COLS = 20, ROWS = 15, CELL = 14, X0 = -12;
export const WALL_T = 0.2;
export const DOOR_W = 1.8, DOOR_H = 2.2;
export const LAB = { x0: -12, x1: 12, z0: -18, z1: 0, h: 3.8 };
export const ROOMS_RETURN = { x: 10.6, z: -12 };
export const LAB_OPEN = { x0: -6.5, x1: -2.5 };
export const PROOM = { x0: 500, x1: 510, z0: 500, z1: 510, h: 3 };

export type Box = { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number; door?: number; doorId?: string };
export type EdgeType = "wall" | "door" | "open";
export type LightMode = "lit" | "flicker" | "dark" | "blackout";
import { THEMES, type ThemeKind, type Feature } from "./themes";
export type PropKind = ThemeKind;
export type Prop = { kind: PropKind; x: number; z: number; rot: number; w: number; d: number; h: number; top: number; seed: number };
export type Room = {
  idx: number; c: number; r: number; x0: number; z0: number; cx: number; cz: number;
  theme: string; name: string; wall: Wallpaper; floor: Floor; ceilH: number; light: LightMode;
  lightColor: string; props: Prop[]; spots: { x: number; y: number; z: number }[]; minions: number;
  boxes: Box[]; fog: number; parts: Box[]; water: Box[]; feature: Feature; layout: string;
};

const FOOT: Record<PropKind, [number, number, number, number]> = {
  // w, d, h, topY(where scrap can sit; 0 = cannot)
  desk: [1.6, 0.8, 0.78, 0.78], chair: [0.5, 0.5, 0.9, 0], cabinet: [0.5, 0.6, 1.3, 1.3], cooler: [0.4, 0.4, 1.3, 0],
  plant: [0.5, 0.5, 1.2, 0], shelf: [1.8, 0.5, 2.0, 1.25], crate: [0.8, 0.8, 0.8, 0.8], barrel: [0.6, 0.6, 0.9, 0.9],
  bed: [1.0, 2.0, 0.6, 0.6], wardrobe: [1.2, 0.6, 2.0, 0], nightstand: [0.5, 0.45, 0.6, 0.6], pillar: [0.8, 0.8, 9, 0],
  bench: [1.6, 0.45, 0.45, 0.45], table: [1.4, 1.4, 0.75, 0.75], sofa: [2.0, 0.9, 0.85, 0.45], tvstand: [1.2, 0.5, 1.15, 0],
  schooldesk: [0.7, 0.5, 0.75, 0.75], pipes: [0.4, 2.2, 3, 0], boiler: [1.2, 1.2, 2.0, 0], arcade: [0.8, 0.8, 1.8, 0],
  vending: [1.0, 0.8, 1.9, 0], stall: [1.0, 1.2, 1.9, 0], sink: [0.6, 0.5, 0.9, 0.9], mattress: [1.0, 2.0, 0.25, 0.25],
  lockers: [1.6, 0.5, 1.9, 0], piano: [1.5, 0.6, 1.2, 1.2], clock: [0.5, 0.4, 2.0, 0], mannequin: [0.5, 0.5, 1.8, 0],
  tree: [0.9, 0.9, 5, 0], rock: [1.1, 0.9, 0.7, 0.7], counter: [1.8, 0.7, 0.95, 0.95], lamp: [0.4, 0.4, 1.6, 0],
  bunk: [1.0, 2.0, 1.8, 0.5], servers: [0.8, 1.0, 2.0, 0], cart: [0.9, 0.6, 1.0, 0.95],
};

const ADJ = ["Damp", "Humming", "Forgotten", "Yellow", "Silent", "Moist", "Hollow", "Endless", "Rotting", "Quiet", "Wrong", "Buzzing", "Faded", "Sunken", "Low", "Tall", "Narrow", "Wide", "Old", "Stale"];

export const hEdges: EdgeType[][] = []; // [c][r] r in 0..ROWS
export const vEdges: EdgeType[][] = []; // [c][r] c in 0..COLS
export const doorHinged: Set<string> = new Set();
export const rooms: Room[] = [];
/** 18 elevator rooms; the cabin sits in the room's north-west quadrant, door facing +x */
export const ELEVATOR_ROOMS: number[] = Array.from({ length: 18 }, (_, k) => 10 + k * 16);
export const elevatorCabin = (room: Room) => ({ x0: room.x0 + 0.2, x1: room.x0 + 2.6, z0: room.z0 + 0.2, z1: room.z0 + 2.6 });

/** Interior walls stay inside the four quadrants so the central cross corridor always links every doorway. */
const BAND = 1.75;
function buildLayout(room: Room, layout: string, R: () => number) {
  const { x0, z0, ceilH: H } = room; const t = 0.2; const q = CELL / 2 - BAND; // quadrant depth
  const cl = (v: number) => Math.max(0.1, Math.min(CELL - 0.1, v));
  const wall = (ax: number, az: number, bx: number, bz: number) => { const a = cl(Math.min(ax, bx)), b = cl(Math.max(ax, bx)), c = cl(Math.min(az, bz)), d = cl(Math.max(az, bz)); if (b - a > 0.05 && d - c > 0.05) room.parts.push({ x0: x0 + a, x1: x0 + b, z0: z0 + c, z1: z0 + d, y0: 0, y1: H }); };
  const far = CELL - q;
  const quads: [number, number][] = [[0, 0], [far, 0], [0, far], [far, far]];
  switch (layout) {
    case "L": { const [qx, qz] = quads[Math.floor(R() * 4)]; wall(qx, qz, qx + q, qz + q); break; }
    case "T": { const top = R() < 0.5; const z = top ? 0 : far; wall(0, z, q, z + q); wall(far, z, CELL, z + q); break; }
    case "chambers": quads.forEach(([qx, qz]) => {
      const xm = qx === 0 ? q : far, zm = qz === 0 ? q : far;
      if (R() < 0.5) wall(Math.min(xm, qx + (qx === 0 ? 0 : q)), zm - t / 2, Math.max(xm, qx + (qx === 0 ? 0 : q)) - (qx === 0 ? 1.4 : -1.4), zm + t / 2);
      else wall(xm - t / 2, Math.min(zm, qz + (qz === 0 ? 0 : q)), xm + t / 2, Math.max(zm, qz + (qz === 0 ? 0 : q)) - (qz === 0 ? 1.4 : -1.4));
    }); break;
    case "maze": quads.forEach(([qx, qz]) => {
      for (let i = 0; i < 2; i++) {
        const along = R() < 0.5, o = 1.3 + R() * (q - 2.6), len = 1.6 + R() * (q - 2.4);
        if (along) wall(qx + 0.4, qz + o, qx + 0.4 + len, qz + o + t); else wall(qx + o, qz + 0.4, qx + o + t, qz + 0.4 + len);
      }
    }); break;
    case "winding": quads.forEach(([qx, qz], i) => {
      const edge = i % 2 ? qx + q : qx; const dir = i % 2 ? -1 : 1;
      wall(edge, qz + q * 0.35, edge + dir * (q - 1.2), qz + q * 0.35 + t);
      wall(edge + dir * 1.2, qz + q * 0.72, edge + dir * q, qz + q * 0.72 + t);
    }); break;
    case "courtyard": quads.forEach(([qx, qz]) => wall(qx + (qx ? q - 1.6 : 0), qz + (qz ? q - 1.6 : 0), qx + (qx ? q : 1.6), qz + (qz ? q : 1.6))); break;
  }
}
function buildFeature(room: Room, f: Feature, R: () => number) {
  const { x0, z0 } = room; const q = CELL / 2 - BAND;
  const free = [[0, 0], [CELL - q, 0], [0, CELL - q], [CELL - q, CELL - q]].filter(([qx, qz]) => !room.parts.some((b) => b.x0 < x0 + qx + q && b.x1 > x0 + qx && b.z0 < z0 + qz + q && b.z1 > z0 + qz && (b.x1 - b.x0) * (b.z1 - b.z0) > 6));
  const n = f === "lake" ? 1 + Math.floor(R() * 2) : f === "pool" ? 2 : 1;
  for (let i = 0; i < n && free.length; i++) {
    const [qx, qz] = free.splice(Math.floor(R() * free.length), 1)[0];
    const m = f === "fountain" ? 1.6 : 0.8; const w = q - m * 2, d = q - m * 2;
    room.water.push({ x0: x0 + qx + m, x1: x0 + qx + m + w, z0: z0 + qz + m, z1: z0 + qz + m + d, y0: 0, y1: f === "fountain" ? 0.6 : 0.35 });
  }
}

function gen() {
  const R = rng(1337);
  for (let c = 0; c < COLS; c++) { hEdges[c] = []; for (let r = 0; r <= ROWS; r++) hEdges[c][r] = "wall"; }
  for (let c = 0; c <= COLS; c++) { vEdges[c] = []; for (let r = 0; r < ROWS; r++) vEdges[c][r] = "wall"; }
  // spanning tree (DFS)
  const seen = new Set<number>();
  const stack: [number, number][] = [[0, 0]]; seen.add(0);
  while (stack.length) {
    const [c, r] = stack[stack.length - 1];
    const nb = ([[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]] as [number, number][])
      .filter(([a, b]) => a >= 0 && b >= 0 && a < COLS && b < ROWS && !seen.has(b * COLS + a));
    if (!nb.length) { stack.pop(); continue; }
    const [a, b] = nb[Math.floor(R() * nb.length)];
    if (a !== c) vEdges[Math.max(a, c)][r] = "door"; else hEdges[c][Math.max(b, r)] = "door";
    seen.add(b * COLS + a); stack.push([a, b]);
  }
  for (let c = 0; c < COLS; c++) for (let r = 1; r < ROWS; r++) {
    const x = R();
    if (x < 0.14) hEdges[c][r] = "open"; else if (x < 0.4) hEdges[c][r] = "door";
  }
  for (let c = 1; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (R() < 0.3) vEdges[c][r] = "door";
  hEdges[0][0] = "open"; // lab opening (handled specially)
  for (let c = 0; c < COLS; c++) for (let r = 1; r < ROWS; r++) if (hEdges[c][r] === "door" && R() < 0.35) doorHinged.add(`h${c},${r}`);
  for (let c = 1; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (vEdges[c][r] === "door" && R() < 0.35) doorHinged.add(`v${c},${r}`);

  const usedNames = new Set<string>();
  let minionBudget = 25;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const idx = r * COLS + c;
    const rr = rng(idx * 7919 + 17);
    const th = idx === 0 ? THEMES[21] : idx < THEMES.length + 1 ? THEMES[((idx - 1) * 37) % THEMES.length] : THEMES[Math.floor(rr() * THEMES.length)];
    let name = "";
    do { name = `${ADJ[Math.floor(rr() * ADJ.length)]} ${th.name}`; } while (usedNames.has(name) && usedNames.size < 270 && (name += "") && rr() < 0.97);
    if (usedNames.has(name)) name = `${name} ${idx}`;
    usedNames.add(name);
    const x0 = X0 + c * CELL, z0 = r * CELL;
    const lx = rr();
    const db = th.dark ?? 0;
    const light: LightMode = idx === 0 ? "lit" : lx < 0.5 - db * 0.4 ? "lit" : lx < 0.68 - db * 0.3 ? "flicker" : lx < 0.85 ? "dark" : "blackout";
    const room: Room = {
      idx, c, r, x0, z0, cx: x0 + CELL / 2, cz: z0 + CELL / 2, theme: th.name, name: `Room ${idx + 1} · ${name}`,
      wall: th.walls[Math.floor(rr() * th.walls.length)] ?? WALLPAPERS[0], floor: th.floors[Math.floor(rr() * th.floors.length)] ?? FLOORS[0],
      ceilH: th.ceil[0] + rr() * (th.ceil[1] - th.ceil[0]), light,
      lightColor: ["#fff2c0", "#ffe9a8", "#f4ffd6", "#ffd9b0", "#ffffff"][Math.floor(rr() * 5)],
      props: [], spots: [], minions: 0, boxes: [], fog: rr(), parts: [], water: [], feature: th.feature, layout: th.layout,
    };
    if (idx === 0) room.ceilH = 3;
    const elev = ELEVATOR_ROOMS.includes(idx), stair = STAIR_ROOMS.includes(idx);
    if (elev || stair) room.layout = "open";
    buildLayout(room, elev || stair ? "open" : th.layout, rr);
    if (th.feature !== "none" && !elev && !stair) buildFeature(room, th.feature, rr);
    const blocked = [...room.parts, ...room.water];
    if (elev) {
      const e = elevatorCabin(room), H = 2.6;
      const cab = [
        { x0: e.x0, x1: e.x0 + 0.15, z0: e.z0, z1: e.z1, y0: 0, y1: H },
        { x0: e.x0, x1: e.x1, z0: e.z0, z1: e.z0 + 0.15, y0: 0, y1: H },
        { x0: e.x0, x1: e.x1, z0: e.z1 - 0.15, z1: e.z1, y0: 0, y1: H },
      ];
      room.parts.push(...cab);
      blocked.push({ x0: e.x0, x1: e.x1 + 1.2, z0: e.z0, z1: e.z1, y0: 0, y1: H });
    }
    if(stair){const o=stairOrigin(idx);blocked.push({x0:o.x-1.2,x1:o.x+3.4,z0:o.z-.7,z1:o.z+10.4,y0:0,y1:12});room.name=ACCESS_THEMES[STAIR_ROOMS.indexOf(idx)];room.ceilH=12;room.light="lit";}
    // props in quadrants, keep cross corridor clear
    const n = th.density[0] + Math.floor(rr() * (th.density[1] - th.density[0] + 1));
    const tries = n * 12;
    const placed: Prop[] = [];
    for (let t = 0; t < tries && placed.length < n; t++) {
      const kind = th.props[Math.floor(rr() * th.props.length)];
      const [w0, d0, h, top] = FOOT[kind];
      const rot = rr() < 0.5 ? 0 : Math.PI / 2;
      const w = rot ? d0 : w0, d = rot ? w0 : d0;
      const px = x0 + 0.5 + w / 2 + rr() * (CELL - 1 - w);
      const pz = z0 + 0.5 + d / 2 + rr() * (CELL - 1 - d);
      const mid = 1.6;
      if (Math.abs(px - room.cx) < mid + w / 2 || Math.abs(pz - room.cz) < mid + d / 2) continue;
      if (blocked.some((b) => px + w / 2 + 0.4 > b.x0 && px - w / 2 - 0.4 < b.x1 && pz + d / 2 + 0.4 > b.z0 && pz - d / 2 - 0.4 < b.z1)) continue;
      if (placed.some((p) => Math.abs(p.x - px) < (p.w + w) / 2 + 0.5 && Math.abs(p.z - pz) < (p.d + d) / 2 + 0.5)) continue;
      placed.push({ kind, x: px, z: pz, rot, w, d, h: kind === "pillar" || kind === "pipes" ? room.ceilH : h, top, seed: Math.floor(rr() * 1e6) });
    }
    room.props = placed;
    // scrap spots (static per room), item identity rotates hourly
    const spotsN = 2 + Math.floor(rr() * 4);
    for (let t = 0; t < 40 && room.spots.length < spotsN; t++) {
      let s: { x: number; y: number; z: number };
      const tops = placed.filter((p) => p.top > 0);
      if (tops.length && rr() < 0.55) {
        const p = tops[Math.floor(rr() * tops.length)];
        s = { x: p.x + (rr() - 0.5) * p.w * 0.5, y: p.top, z: p.z + (rr() - 0.5) * p.d * 0.5 };
      } else {
        s = { x: x0 + 1 + rr() * (CELL - 2), y: 0, z: z0 + 1 + rr() * (CELL - 2) };
        if (placed.some((p) => Math.abs(p.x - s.x) < p.w / 2 + 0.4 && Math.abs(p.z - s.z) < p.d / 2 + 0.4)) continue;
        if (blocked.some((b) => s.x > b.x0 - 0.4 && s.x < b.x1 + 0.4 && s.z > b.z0 - 0.4 && s.z < b.z1 + 0.4)) continue;
      }
      if (room.spots.some((o) => Math.hypot(o.x - s.x, o.z - s.z) < 2.2)) continue;
      room.spots.push(s);
    }
    if (idx > 2 && minionBudget > 0 && rr() < 0.15) { room.minions = 1; minionBudget -= room.minions; }
    rooms.push(room);
  }
  // collision boxes
  const add = (b: Box, ...cells: (Room | undefined)[]) => cells.forEach((rm) => rm && rm.boxes.push(b));
  const at = (c: number, r: number) => (c >= 0 && r >= 0 && c < COLS && r < ROWS ? rooms[r * COLS + c] : undefined);
  for (let c = 0; c < COLS; c++) for (let r = 0; r <= ROWS; r++) {
    const e = hEdges[c][r]; const z = r * CELL; const xa = X0 + c * CELL, xb = xa + CELL;
    const H = 10;
    if (c === 0 && r === 0) {
      add({ x0: xa, x1: LAB_OPEN.x0, z0: z - WALL_T / 2, z1: z + WALL_T / 2, y0: 0, y1: H }, at(c, r));
      add({ x0: LAB_OPEN.x1, x1: xb, z0: z - WALL_T / 2, z1: z + WALL_T / 2, y0: 0, y1: H }, at(c, r));
      continue;
    }
    if (e === "open") continue;
    const segs = e === "door" ? [[xa, xa + CELL / 2 - DOOR_W / 2], [xa + CELL / 2 + DOOR_W / 2, xb]] : [[xa, xb]];
    segs.forEach(([a, b]) => add({ x0: a, x1: b, z0: z - WALL_T / 2, z1: z + WALL_T / 2, y0: 0, y1: H }, at(c, r - 1), at(c, r)));
    if (e === "door") add({ x0: xa + CELL / 2 - DOOR_W / 2, x1: xa + CELL / 2 + DOOR_W / 2, z0: z - WALL_T / 2, z1: z + WALL_T / 2, y0: DOOR_H, y1: H }, at(c, r - 1), at(c, r));
  }
  for (let c = 0; c <= COLS; c++) for (let r = 0; r < ROWS; r++) {
    const e = vEdges[c][r]; const x = X0 + c * CELL; const za = r * CELL, zb = za + CELL;
    const segs = e === "door" ? [[za, za + CELL / 2 - DOOR_W / 2], [za + CELL / 2 + DOOR_W / 2, zb]] : [[za, zb]];
    segs.forEach(([a, b]) => add({ x0: x - WALL_T / 2, x1: x + WALL_T / 2, z0: a, z1: b, y0: 0, y1: 10 }, at(c - 1, r), at(c, r)));
  }
  rooms.forEach((rm) => rm.boxes.push(...rm.parts, ...rm.water));
  rooms.forEach((rm) => rm.props.forEach((p) => rm.boxes.push({ x0: p.x - p.w / 2, x1: p.x + p.w / 2, z0: p.z - p.d / 2, z1: p.z + p.d / 2, y0: 0, y1: p.h })));
}
gen();
STAIR_ROOMS.forEach(idx=>{const r=rooms[idx],o=stairOrigin(idx);r.boxes.push({x0:o.x+.92,x1:o.x+1.28,z0:o.z-.6,z1:o.z+9,y0:0,y1:12});});

export function roomAt(x: number, z: number): Room | undefined {
  const c = Math.floor((x - X0) / CELL), r = Math.floor(z / CELL);
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return undefined;
  return rooms[r * COLS + c];
}

export function passable(a: Room, b: Room) {
  if (a.c === b.c) return hEdges[a.c][Math.max(a.r, b.r)] !== "wall";
  return vEdges[Math.max(a.c, b.c)][a.r] !== "wall";
}

/** BFS path of room indices from a to b */
export function roomPath(a: Room, b: Room): Room[] {
  if (a === b) return [a];
  const prev = new Map<number, number>(); const q = [a.idx]; prev.set(a.idx, -1);
  while (q.length) {
    const i = q.shift(); if (i === undefined) break; if (i === b.idx) break;
    const rm = rooms[i];
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = rm.c + dc, r = rm.r + dr;
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS) continue;
      const nb = rooms[r * COLS + c];
      if (prev.has(nb.idx) || !passable(rm, nb)) continue;
      prev.set(nb.idx, i); q.push(nb.idx);
    }
  }
  if (!prev.has(b.idx)) return [a];
  const out: Room[] = []; let i = b.idx;
  while (i !== -1) { out.unshift(rooms[i]); const parent = prev.get(i); if (parent === undefined) break; i = parent; }
  return out;
}

/** waypoint between two adjacent rooms (door/opening center) */
export function portal(a: Room, b: Room) {
  if (a.c === b.c) return { x: a.cx, z: Math.max(a.r, b.r) * CELL };
  return { x: X0 + Math.max(a.c, b.c) * CELL, z: a.cz };
}

export function hourSeed() { return Math.floor(Date.now() / 3600000); }

export type HourScrap = { key: string; ordinal: number; room: number; id: string; x: number; y: number; z: number };
const hourCache = new Map<number, HourScrap[]>();
/** One shared supply per hour (180-250 items) spread over every room's safe loot spots. */
export function hourlyScrap(hour: number): HourScrap[] {
  const hit = hourCache.get(hour); if (hit) return hit;
  const R = rng(hour * 7907 + 11);
  const all = rooms.flatMap((rm) => rm.spots.map((s) => ({ room: rm.idx, ...s })));
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
  const weights = SCRAP_IDS.map((id) => 1 / Math.pow(ITEMS[id].value, 0.85));
  const tot = weights.reduce((a, b) => a + b, 0);
  const out = all.slice(0, Math.min(all.length, hourlyScrapTarget(hour))).map((s, ordinal) => {
    let x = R() * tot, k = 0; while (x > weights[k]) { x -= weights[k]; k++; }
    return { key: `${hour}:${ordinal}`, ordinal, id: SCRAP_IDS[Math.min(k, SCRAP_IDS.length - 1)], ...s };
  });
  hourCache.clear(); hourCache.set(hour, out); return out;
}
export function scrapFor(room: Room, hour: number) { return hourlyScrap(hour).filter((s) => s.room === room.idx); }

/** Static lab & personal room colliders (stations registered at runtime) */
export const labBoxes: Box[] = [];
(() => {
  const { x0, x1, z0, z1 } = LAB; const t = WALL_T;
  labBoxes.push({ x0, x1, z0: z0 - t, z1: z0, y0: 0, y1: 10 });
  labBoxes.push({ x0: x0 - t, x1: x0, z0, z1, y0: 0, y1: 10 });
  labBoxes.push({ x0: x1, x1: x1 + t, z0, z1, y0: 0, y1: 10 });
  labBoxes.push({ x0, x1: LAB_OPEN.x0, z0: z1 - t / 2, z1: z1 + t / 2, y0: 0, y1: 10 });
  labBoxes.push({ x0: LAB_OPEN.x1, x1, z0: z1 - t / 2, z1: z1 + t / 2, y0: 0, y1: 10 });
})();
export const proomBoxes: Box[] = (() => {
  const { x0, x1, z0, z1 } = PROOM; const t = WALL_T;
  return [
    { x0, x1, z0: z0 - t, z1: z0, y0: 0, y1: 10 }, { x0, x1, z0: z1, z1: z1 + t, y0: 0, y1: 10 },
    { x0: x0 - t, x1: x0, z0, z1, y0: 0, y1: 10 }, { x0: x1, x1: x1 + t, z0, z1, y0: 0, y1: 10 },
  ];
})();

/** dynamic colliders (doors, lab stations, decor) */
export const dynBoxes: Box[] = [];

export function nearbyBoxes(x: number, z: number, upper = false): Box[] {
  if (upper) return upperBoxes;
  if (x > 400) return [...proomBoxes, ...dynBoxes];
  const out: Box[] = [...dynBoxes];
  if (z < 0.5) out.push(...labBoxes);
  const c = Math.floor((x - X0) / CELL), r = Math.floor(z / CELL);
  for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
    const rm = c + dc >= 0 && r + dr >= 0 && c + dc < COLS && r + dr < ROWS ? rooms[(r + dr) * COLS + c + dc] : undefined;
    if (rm) out.push(...rm.boxes);
  }
  return out;
}

/** circle vs AABB slide. returns corrected position */
export function collide(x: number, z: number, rad: number, y = 0.5, boxes = nearbyBoxes(x, z)) {
  for (let it = 0; it < 3; it++) {
    for (const b of boxes) {
      if (y + 1.6 <= b.y0 + .001 || y >= b.y1 - .001) continue;
      const cx = Math.max(b.x0, Math.min(x, b.x1)), cz = Math.max(b.z0, Math.min(z, b.z1));
      const dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
      if (d2 < rad * rad) {
        if (d2 > 1e-8) { const d = Math.sqrt(d2), p = rad - d; x += (dx / d) * p; z += (dz / d) * p; }
        else {
          const l = x - b.x0, r = b.x1 - x, t = z - b.z0, bo = b.z1 - z; const m = Math.min(l, r, t, bo);
          if (m === l) x = b.x0 - rad; else if (m === r) x = b.x1 + rad; else if (m === t) z = b.z0 - rad; else z = b.z1 + rad;
        }
      }
    }
  }
  return [x, z] as const;
}

/** line of sight test using walls only (2D segment vs boxes taller than 1.8) */
export function lineOfSight(ax: number, az: number, bx: number, bz: number) {
  const boxes = new Set<Box>(dynBoxes);
  if (az < 0 || bz < 0) labBoxes.forEach(b => boxes.add(b));
  const minX = Math.min(ax, bx), maxX = Math.max(ax, bx), minZ = Math.min(az, bz), maxZ = Math.max(az, bz);
  const c0=Math.max(0,Math.floor((minX-X0)/CELL)),c1=Math.min(COLS-1,Math.floor((maxX-X0)/CELL)),r0=Math.max(0,Math.floor(minZ/CELL)),r1=Math.min(ROWS-1,Math.floor(maxZ/CELL));
  for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++)rooms[r*COLS+c].boxes.forEach(b=>boxes.add(b));
  for (const b of boxes) if (b.y0 <= 1.5 && b.y1 >= 1.7 && segmentBlocked(ax, az, bx, bz, b)) return false;
  return true;
}

import { DECOR as _DECOR } from "./data";
export const DECOR_SIZE: Record<string, [number, number, number]> = Object.fromEntries(_DECOR.map((d) => [d.id, d.size]));
