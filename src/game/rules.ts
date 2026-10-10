export const JUMP_COST = 5;
export const JUMP_SPEED = 5.8;
export const GRAVITY = 16;
export const SIGHT_RANGE = 48;
export const SLEEP_MS = 2000;
export const STORAGE_SLOTS = 10;
export const PIPE_HITS = 20;
export const DECOR_PRICES = { bed: 450, holyicon: 380, vcrtv: 720, balloon: 300, fishtank: 1100, painting: 330, cross: 300, storagebox: 810, plant: 340, custompaint: 1240, stalkdevice: 1500, bigbunny: 510, chessboard: 420, wallclock: 360, scrapdisplay: 1250 } as const;
export const TOOL_PRICES = { pipe: 270, flashcharge: 250, axe: 1430, pistol: 1700, health: 400, adrenaline: 580, knife: 500 } as const;
export const REMOVED_ITEMS = ["papermap"];
export const REMOVED_DECOR = ["uppercamera", "candles", "jukebox"];
/** Once stamina drops to 1 or less, sprinting stays locked until it recovers to this value. */
export const SPRINT_RECOVER = 20;
export function canSprint(stamina: number, exhausted: boolean) { return exhausted ? stamina >= SPRINT_RECOVER : stamina > 1; }
export function hourlyScrapTarget(hour: number) { return 180 + ((hour * 17) % 71 + 71) % 71; }
export function pipeRemaining(uses = PIPE_HITS) { return Math.max(0, uses - 1); }
export function canStoreTool(id: string, count: number) { return count < STORAGE_SLOTS && ["axe", "pistol", "health", "adrenaline", "navigator", "flashcharge", "papermap", "pipe", "knife", "radar", "tear"].includes(id); }
export function penIndex(index: number, direction: number) { return (index + (direction > 0 ? 1 : 2)) % 3; }
export function sleepComplete(start: number, now: number) { return now - start >= SLEEP_MS; }
export function faceToFace(distance: number, playerDot: number, entityDot: number, clear: boolean) {
  return clear && distance <= SIGHT_RANGE && playerDot > .7 && entityDot > .5;
}
export function stareTime(previous: number, eyeContact: boolean, dt: number) {
  return eyeContact ? previous + dt : 0;
}
/** Exact slab intersection: even thin walls and segment endpoints block sight. */
export function segmentBlocked(ax: number, az: number, bx: number, bz: number, b: SolidBox, padding = 0) {
  let lo = 0, hi = 1;
  for (const [a, d, min, max] of [[ax, bx - ax, b.x0 - padding, b.x1 + padding], [az, bz - az, b.z0 - padding, b.z1 + padding]]) {
    if (Math.abs(d) < 1e-9) { if (a < min || a > max) return false; }
    else { const t1 = (min - a) / d, t2 = (max - a) / d; lo = Math.max(lo, Math.min(t1, t2)); hi = Math.min(hi, Math.max(t1, t2)); if (lo > hi) return false; }
  }
  return lo <= hi;
}
export function jumpStamina(stamina: number, grounded: boolean): number | null {
  return grounded && stamina >= JUMP_COST ? stamina - JUMP_COST : null;
}
export function extractionXp(slots: 1 | 2) { return slots === 1 ? 3 : 5; }
export function playScreen(created: boolean) { return created ? "drop" as const : "create" as const; }
export type SolidBox = { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number };
export function verticalStep(x: number, z: number, y: number, velocity: number, dt: number, boxes: SolidBox[], ceiling: number) {
  let v = velocity - GRAVITY * dt;
  let next = y + v * dt;
  const overlaps = boxes.filter(b => x + .28 > b.x0 && x - .28 < b.x1 && z + .28 > b.z0 && z - .28 < b.z1);
  if (v > 0) {
    const head = Math.min(ceiling, ...overlaps.filter(b => b.y0 >= y + 1.6).map(b => b.y0));
    if (next + 1.6 >= head) { next = head - 1.6; v = 0; }
  }
  const floor = Math.max(0, ...overlaps.filter(b => b.y1 <= y + .025 && b.y1 >= next).map(b => b.y1));
  const grounded = v <= 0 && next <= floor;
  return { y: grounded ? floor : next, velocity: grounded ? 0 : v, grounded };
}export const XP_PER_LEVEL = 50;

export const ROOM_THEME_PRICE = 1000;
export const BLUEPRINT_MS = 16 * 60 * 60 * 1000;
export const SPRINT_SPEED = 6.8;
export const ALPHA_DECOR_PRICES = { lightstand: 380, booktable: 310, walltelephone: 1200, blueprint: 4100, psbconsole: 1200, projector: 1520 } as const;
export function craftReady(start: number, now: number) { return now - start >= BLUEPRINT_MS; }
export function themePayment(money: number, current: number, selected: number) { return selected === current || money < ROOM_THEME_PRICE ? null : money - ROOM_THEME_PRICE; }
export function radarOffset(dx: number, dz: number, yaw: number) { return { x: dx * Math.cos(yaw) - dz * Math.sin(yaw), y: dx * Math.sin(yaw) + dz * Math.cos(yaw) }; }
export function statusKey(key: string, panel: boolean, dying: boolean) { return dying ? "none" : panel && (key === "Escape" || key === "Tab") ? "close" : !panel && key === "Tab" ? "open" : "none"; }
export const CHASE_COOLDOWN = 10;
export const MAKA_CHASE_SECONDS = 12;
export const MAKA_BLACKOUT_MS = 60000;
export function dailyQuotaTarget(players: number) { return Math.min(20000, 10000 + Math.max(0, Math.floor(players)) * 100); }
export function carrierSlots(skills: number) { return 4 + (skills >= 7 ? 1 : 0) + (skills >= 10 ? 1 : 0); }
export function blackRoseEligible(battery: number, roll: number) { return battery < 30 && roll < .3; }
