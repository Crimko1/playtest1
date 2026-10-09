import * as THREE from "three";
import type { EntityId } from "./data";
import type { Room } from "./world";
import { rooms, lineOfSight, roomAt } from "./world";

export type Interactable = {
  id: string;
  pos: THREE.Vector3;
  label: () => string;
  onE?: () => void;
  range?: number;
  door?: string;
};

export type Dropped = { key: string; id: string; x: number; y: number; z: number; uses?: number; ammo?: number; sketch?: string; at?: number };

export const rt = {
  pos: new THREE.Vector3(-4.5, 0, -10),
  vel: new THREE.Vector3(),
  verticalVelocity: 0,
  grounded: true,
  yaw: Math.PI,
  pitch: 0,
  moving: 0,
  running: false,
  camera: null as THREE.Camera | null,
  interactables: new Map<string, Interactable>(),
  focused: null as Interactable | null,
  picked: new Set<string>(),
  dropped: [] as Dropped[],
  doors: new Map<string, { angle: number }>(),
  makaDark: new Set<number>(),
  makaRestore: new Map<number, number>(),
  blackRose: false,
  flashFlicker: true,
  lmb: false,
  rmb: false,
  rmbT: 0,
  radar: false,
  dragDx: 0,
  swing: 0,
  lastHurt: 0,
  handAnim: 0,
  remoteHeld: "",
  entityVisible: new Set<EntityId>(),
  minionHits: [] as { x: number; z: number; dmg: number }[],
  lockRequest: () => {},
  secondWind: false,
  ghost: null as null | { id: string; x: number; y?: number; z: number; r: number; ok: boolean },
  uncannyView: { x: 0, z: 0, yaw: 0, active: false },
  visitStalk: false,
};

export function register(i: Interactable) {
  rt.interactables.set(i.id, i);
  return () => { rt.interactables.delete(i.id); };
}

/** light level of a room (0..1) at time t seconds */
export function lightLevel(room: Room, t: number) {
  if (rt.blackRose) return 0;
  if (rt.makaDark.has(room.idx)) return 0;
  if (room.light === "dark") return 0;
  if (room.light === "flicker") {
    const s = Math.sin(t * 13 + room.idx) * Math.sin(t * 7.3 + room.idx * 3) + Math.sin(t * 0.7 + room.idx);
    return s > 0.9 ? 0.05 : s > 0.6 ? 0.5 : 1;
  }
  if (room.light === "blackout") {
    const w = Math.floor(t / 240);
    const k = (Math.sin(w * 91.7 + room.idx * 13.1) + 1) / 2;
    if (k < 0.35 && t % 240 < 60) return 0;
  }
  // rare global flicker
  const f = Math.sin(t * 0.37 + room.idx * 1.7) * Math.sin(t * 23 + room.idx);
  return f > 0.985 ? 0.2 : 1;
}

export function roomsList() { return rooms; }
export function forward() {
  return new THREE.Vector3(-Math.sin(rt.yaw) * Math.cos(rt.pitch), Math.sin(rt.pitch), -Math.cos(rt.yaw) * Math.cos(rt.pitch));
}

const _v = new THREE.Vector3(), _f = new THREE.Vector3();
/** 1 in lit rooms; in dark rooms only the flashlight cone (with clear sight) reveals things. */
export function visibleLight(pos: THREE.Vector3, time: number) {
  const r = roomAt(pos.x, pos.z);
  if (!r || lightLevel(r, time) > 0.15) return 1;
  return flashlightHits(pos) ? 1 : 0;
}
export function flashlightHits(pos: THREE.Vector3) {
  const cam = rt.camera; if (!cam || (!flashOn() || (rt.blackRose && !rt.flashFlicker))) return false;
  _v.copy(pos).sub(cam.position); const d = _v.length(); if (d > 20) return false;
  cam.getWorldDirection(_f); if (_v.normalize().dot(_f) <= Math.cos(0.45)) return false;
  return lineOfSight(cam.position.x, cam.position.z, pos.x, pos.z);
}
let flashOn = () => false;
export function setFlashSource(f: () => boolean) { flashOn = f; }
function roomAtPos(x: number, z: number) { const c = Math.floor((x + 12) / 14), r = Math.floor(z / 14); return c < 0 || r < 0 || c >= 20 || r >= 10 ? undefined : rooms[r * 20 + c]; }
