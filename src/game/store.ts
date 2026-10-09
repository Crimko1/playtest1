import { XP_PER_LEVEL, carrierSlots } from "./rules";
import { useSyncExternalStore } from "react";
import type { EntityId, TreeId } from "./data";

export type InvItem = { id: string; uses?: number; ammo?: number; sketch?: string } | null;
export type Placed = { id: string; x: number; z: number; r: number; y?: number; key?: string; artwork?: string; lightsOff?: boolean; video?: string; volume?: number; videoStart?: number };

export type Save = {
  created: boolean;
  name: string;
  avatar: string; // data url
  tree: TreeId;
  unlockedTrees: TreeId[];
  skills: Record<string, number>; // tree -> unlocked count
  level: number;
  xp: number;
  points: number;
  money: number;
  trophies: number;
  outfit: string;
  outfits: string[];
  inventory: InvItem[];
  storage: InvItem[];
  decorOwned: string[]; // ids in storage (not placed)
  room: Placed[];
  discovered: EntityId[];
  scrapsFound?: string[];
  encounters?: Record<string, number>;
  seenFoundation: EntityId[];
  lastHeal: number;
  lastDay: string;
  quotaDays: string[]; // days player contributed and got xp
  roomIndex: number;
  contribDay: string;
  roomVersion: number;
  roomTheme?: number;
  vhs?: boolean;
};

export const emptySave = (): Save => ({
  created: false, name: "", avatar: "", tree: "survivor", unlockedTrees: [], skills: {},
  level: 1, xp: 0, points: 0, money: 0, trophies: 0, outfit: "classic", outfits: ["classic"],
  inventory: [null, null, null, null], storage: [], decorOwned: [], room: [], discovered: [], seenFoundation: [],
  lastHeal: 0, lastDay: "", quotaDays: [], roomIndex: Math.floor(Math.random() * 200), contribDay: "", roomVersion: 0,
});

export type Screen = "intro" | "auth" | "menu" | "create" | "drop" | "game";
export type Panel =
  | null | "inventory" | "tree" | "shop" | "mirror" | "rooms" | "extractor"
  | "foundation" | "storage" | "options" | "dead" | "papermap" | "artwork" | "scrapselector" | "themes" | "blueprint" | "projector";

type State = {
  screen: Screen;
  panel: Panel;
  save: Save;
  userId: string | null;
  musicVol: number;
  sfxVol: number;
  health: number;
  stamina: number;
  battery: number;
  flashlight: boolean;
  slot: number;
  prompt: string;
  toast: string;
  toastT: number;
  quota: { target: number; progress: number; completed: boolean; day: string };
  quotaFlash: number;
  inLab: boolean;
  inRoom: string | null; // owner id of decorated room being visited
  decorMode: boolean;
  decorSel: string | null;
  jumpscare: EntityId | "minion" | null;
  chase: number;
  coords: string;
  adrenaline: number;
  newEntity: EntityId | null;
  sleeping: number;
  glitch: number;
  activeDecor: string | null;
  decorRotation: number;
  terrified: number;
};

let state: State = {
  screen: "intro", panel: null, save: emptySave(), userId: null,
  musicVol: 0.6, sfxVol: 0.8, health: 100, stamina: 100, battery: 100, flashlight: false, slot: 0,
  prompt: "", toast: "", toastT: 0, quota: { target: 0, progress: 0, completed: false, day: "" }, quotaFlash: 0,
  inLab: true, inRoom: null, decorMode: false, decorSel: null, jumpscare: null, chase: 0, coords: "", adrenaline: 0,
  newEntity: null, sleeping: 0, glitch: 0, activeDecor: null, decorRotation: 0, terrified: 0,
};
const subs = new Set<() => void>();

export const game = {
  get: () => state,
  set: (p: Partial<State> | ((s: State) => Partial<State>)) => {
    const patch = typeof p === "function" ? p(state) : p;
    let changed = false;
    for (const k in patch) if ((state as any)[k] !== (patch as any)[k]) { changed = true; break; }
    if (!changed) return;
    state = { ...state, ...patch };
    subs.forEach((f) => f());
  },
  setSave: (p: Partial<Save> | ((s: Save) => Partial<Save>)) => {
    const patch = typeof p === "function" ? p(state.save) : p;
    game.set({ save: { ...state.save, ...patch } });
    scheduleSave();
  },
  subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; },
  toast: (msg: string) => game.set({ toast: msg, toastT: Date.now() }),
};

export function useGame<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(game.subscribe, () => sel(state), () => sel(state));
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saveFn: ((s: Save) => Promise<void>) | null = null;
export function registerSaver(fn: (s: Save) => Promise<void>) { saveFn = fn; }
export function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { if (saveFn && state.save.created) saveFn(state.save); }, 1500);
}

export function maxSlots(s: Save) {
  return carrierSlots(s.skills["carrier"] ?? 0);
}
export function skillCount(s: Save, t: TreeId) { return s.skills[t] ?? 0; }
export function maxHealth(s: Save) {
  const n = skillCount(s, "survivor");
  return 100 + (n >= 1 ? 10 : 0) + (n >= 4 ? 10 : 0) + (n >= 8 ? 20 : 0);
}
export function payoutMult(s: Save) {
  const n = skillCount(s, "scavenger");
  return 1 + (n >= 2 ? 0.05 : 0) + (n >= 4 ? 0.05 : 0) + (n >= 6 ? 0.1 : 0) + (n >= 9 ? 0.1 : 0);
}
export function addXp(amount: number) {
  game.setSave((s) => {
    let xp = s.xp + amount, level = s.level, points = s.points;
    while (xp >= XP_PER_LEVEL) { xp -= XP_PER_LEVEL; level++; points++; }
    if (level > s.level) game.toast(`LEVEL UP — Level ${level}. +1 Skill Point`);
    return { xp, level, points };
  });
}
export const todayStr = () => new Date().toISOString().slice(0, 10);
