import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { rooms, roomAt, portal, lineOfSight, CELL, COLS, X0, type Room } from "./world";
import { rt, lightLevel , visibleLight } from "./runtime";
import { game, skillCount } from "./store";
import { ENTITIES, type EntityId } from "./data";
import { imageTex } from "./textures";
import { Character } from "./Character";
import { OUTFITS, SCRAP_IDS } from "./data";
import { normInv, removeAt } from "./items";
import { sfx, setChase, entityLoop, entityCue, stopEntityCue } from "./audio";
import { dropAllAtDeath } from "./items";
import { walkToward } from "./navigation";
import { faceToFace, stareTime, SIGHT_RANGE, CHASE_COOLDOWN, MAKA_CHASE_SECONDS, MAKA_BLACKOUT_MS, blackRoseEligible } from "./rules";

/* ======================= MINIONS ======================= */
export type Minion = { key: string; kind: "eye" | "legs"; room: number; x: number; z: number; hp: number; dead: number; atk: number; yaw: number; hitT: number };
export const minions = new Map<string, Minion>();
function minionsFor(room: Room) {
  const out: Minion[] = [];
  for (let i = 0; i < room.minions; i++) {
    const key = room.idx + ":" + i;
    let m = minions.get(key);
    if (!m) {
      m = { key, kind: (room.idx + i) % 2 ? "eye" : "legs", room: room.idx, x: room.cx + (i - 0.5) * 3, z: room.cz + 2, hp: 3 + ((room.idx * 7 + i) % 3), dead: 0, atk: 0, yaw: 0, hitT: 0 };
      minions.set(key, m);
    }
    out.push(m);
  }
  return out;
}
export function hitMinion(m: Minion) {
  m.hp -= 1; m.hitT = 0.25;
  if (m.hp <= 0) {
    m.dead = Date.now(); sfx.minion();
    rt.dropped.push({ key: "c" + m.key + Date.now(), id: "cotton", x: m.x, y: 0, z: m.z });
  }
}

function MinionMesh({ m }: { m: Minion }) {
  const g = useRef<THREE.Group>(null), l1 = useRef<THREE.Group>(null), l2 = useRef<THREE.Group>(null), pupil = useRef<THREE.Mesh>(null);
  const t = useRef(Math.random() * 10);
  const groan = useRef(Math.random() * 5);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const s = game.get();
    if (!g.current) return;
    if (m.hp <= 0) {
      if (Date.now() - m.dead > 1800000) { const free = rooms.filter((q) => q.idx > 2 && ![...minions.values()].some((o) => o !== m && o.hp > 0 && o.room === q.idx)); const r = free[Math.floor(Math.random() * free.length)] ?? rooms[m.room]; m.hp = 4; m.dead = 0; m.room = r.idx; m.x = r.cx; m.z = r.cz; }
      g.current.visible = false; return;
    }
    g.current.visible = true;
    const dx = rt.pos.x - m.x, dz = rt.pos.z - m.z, d = Math.hypot(dx, dz);
     const aware = d < 30 && rt.pos.y<.5 && rt.pos.z > 0 && rt.pos.x < 400 && lineOfSight(m.x, m.z, rt.pos.x, rt.pos.z) && s.screen === "game" && !s.jumpscare && s.panel !== "dead";
    let moving = 0;
    if (aware) {
      m.yaw = Math.atan2(dx, dz);
      if (d > 1.1 && m.atk <= 0) {
        const v = 1.35; // never run
        walkToward(m, rt.pos.x, rt.pos.z, v, dt);
        moving = 1;
      }
      if (d < 1.4 && m.atk <= 0) m.atk = 1.0; // windup
    }
    if (m.atk > 0) {
      m.atk -= dt;
      if (m.atk <= 0) {
        if (d < 1.6 && rt.pos.y<.5 && !s.jumpscare && lineOfSight(m.x, m.z, rt.pos.x, rt.pos.z)) {
          const sv = skillCount(s.save, "survivor");
          const dmg = 10 * (1 - (sv >= 3 ? 0.1 : 0) - (sv >= 7 ? 0.15 : 0));
          let hp = s.health - dmg;
          if (hp <= 0 && sv >= 10 && !rt.secondWind) { rt.secondWind = true; hp = 1; game.toast("SECOND WIND"); }
          game.set({ health: Math.max(0, hp) }); rt.lastHurt = Date.now(); sfx.hurt();
          if (hp <= 0) killPlayer("minion");
        }
        m.atk = -0.8; // cooldown
      }
    } else if (m.atk < 0) m.atk = Math.min(0, m.atk + dt);
    groan.current -= dt; if (groan.current < 0 && d < 12) { groan.current = 4 + Math.random() * 6; sfx.minion(); }
    t.current += dt * (moving ? 6 : 1.5);
    g.current.position.set(m.x, 0, m.z);
    g.current.rotation.y = m.yaw;
    const lunge = m.atk > 0 ? (1 - m.atk) * 0.4 : 0;
    if (m.kind === "legs") {
      if (l1.current) l1.current.rotation.x = Math.sin(t.current) * 0.6 * moving;
      if (l2.current) l2.current.rotation.x = -Math.sin(t.current) * 0.6 * moving;
      g.current.position.y = Math.abs(Math.sin(t.current)) * 0.04 * moving;
      g.current.rotation.x = -lunge * 0.5;
    } else {
      g.current.position.y = 1.4 + Math.sin(t.current) * 0.12;
      g.current.position.x += Math.sin(m.yaw) * lunge; g.current.position.z += Math.cos(m.yaw) * lunge;
      if (pupil.current) pupil.current.scale.setScalar(m.atk > 0 ? 0.6 : 1);
    }
    g.current.scale.setScalar(m.hitT > 0 ? 1.1 : 1); m.hitT -= dt;
  });
  const suit = useMemo(() => new THREE.MeshLambertMaterial({ color: "#8a7428" }), []);
  if (m.kind === "legs") return (
    <group ref={g}>
      <mesh position={[0, 0.98, 0]} material={suit}><boxGeometry args={[0.46, 0.3, 0.28]} /></mesh>
      <mesh position={[0, 1.14, 0]}><cylinderGeometry args={[0.2, 0.22, 0.05, 8]} /><meshLambertMaterial color="#5a0a08" /></mesh>
      <mesh position={[0.05, 1.18, 0.03]}><boxGeometry args={[0.06, 0.08, 0.05]} /><meshLambertMaterial color="#d8c8b0" /></mesh>
      {[[-0.12, l1], [0.12, l2]].map(([x, ref], i) => (
        <group key={i} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.85, 0]}>
          <mesh position={[0, -0.42, 0]} material={suit}><boxGeometry args={[0.18, 0.85, 0.2]} /></mesh>
          <mesh position={[0, -0.82, 0.05]}><boxGeometry args={[0.2, 0.12, 0.3]} /><meshLambertMaterial color="#222" /></mesh>
        </group>
      ))}
    </group>
  );
  return (
    <group ref={g}>
      <mesh><sphereGeometry args={[0.32, 14, 10]} /><meshLambertMaterial color="#e8e0d0" /></mesh>
      <mesh position={[0, 0, 0.26]}><sphereGeometry args={[0.14, 10, 8]} /><meshLambertMaterial color="#6a2a10" /></mesh>
      <mesh ref={pupil} position={[0, 0, 0.36]}><sphereGeometry args={[0.07, 8, 6]} /><meshBasicMaterial color="#000" /></mesh>
      {[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[Math.sin(i) * 0.2, Math.cos(i * 2) * 0.2, 0.22]} rotation={[0, 0, i]}><boxGeometry args={[0.18, 0.008, 0.008]} /><meshBasicMaterial color="#a01010" /></mesh>)}
      <mesh position={[0, -0.4, -0.05]}><cylinderGeometry args={[0.03, 0.01, 0.3, 4]} /><meshLambertMaterial color="#5a1a10" /></mesh>
    </group>
  );
}

export function Minions() {
  const [cell, setCell] = useState("");
  useFrame(() => { const c = Math.floor((rt.pos.x - X0) / CELL) + "," + Math.floor(rt.pos.z / CELL); if (c !== cell) setCell(c); });
  const list = useMemo(() => {
    const [c, r] = cell.split(",").map(Number);
    return rooms.filter((rm) => Math.abs(rm.c - c) <= 1 && Math.abs(rm.r - r) <= 1).flatMap(minionsFor);
  }, [cell]);
  if (rt.pos.z < 0 || rt.pos.x > 400) return null;
  const visible = [...new Map([...list, ...[...minions.values()].filter(m => Math.hypot(m.x-rt.pos.x,m.z-rt.pos.z)<35)].map(m => [m.key,m])).values()];
  return <>{visible.map((m) => <MinionMesh key={m.key} m={m} />)}</>;
}

/* ======================= ENTITIES ======================= */
type Bot = {
  id: EntityId; active: boolean; room: number; x: number; z: number; respawn: number;
  mode: "idle" | "wander" | "follow" | "chase" | "peek" | "lurk" | "rush"; t: number; chaseT: number; look: number; flashT: number; target: number;
  noticed: boolean; enraged: number; lastRoom: number; yaw: number; stuck?: number; cooldown: number; escapedRooms: Set<number>; teleportT: number; stolen?: NonNullable<ReturnType<typeof game.get>["save"]["inventory"][number]>;
};
const BOT_IDS: EntityId[] = ["uncanny", "thirsty", "not", "unknown", "maka", "blackrose", "akamanto", "hand", "mimic"];
export const bots: Bot[] = BOT_IDS.map((id) => ({
  id, active: false, room: 0, x: 0, z: 0, respawn: 5 + BOT_IDS.indexOf(id) * 8, mode: "idle", t: 0, chaseT: 0, look: 0, flashT: 0, target: 0, noticed: false, enraged: 0, lastRoom: -1, yaw: 0, cooldown: 0, escapedRooms: new Set<number>(), teleportT: 5,
}));
const SPEED: Record<EntityId, number> = { uncanny: 4.7, thirsty: 4.5, not: 13, unknown: 5.0, maka: 4.8, blackrose: 3.2, akamanto: 5.1, hand: 3.6, mimic: 4.9, stalker: 24 };

export function killPlayer(by: EntityId | "minion") {
  const s = game.get(); if (s.jumpscare || s.panel === "dead") return;
  rt.blackRose = false; rt.flashFlicker = true;
   game.set({ jumpscare: by, panel: null, chase: 0, prompt: "" }); document.exitPointerLock?.(); sfx.scream(); setChase(0); stopEntityCue("blackrose");
  setTimeout(() => {
    dropAllAtDeath();
    game.set({ jumpscare: null, panel: "dead", health: 0, flashlight: false });
    bots.forEach((b) => { if (b.mode === "chase" || b.mode === "rush") despawn(b); });
  }, 2200);
}
function despawn(b: Bot) { b.active = false; b.respawn = 15 + Math.random() * 25; b.mode = "idle"; b.noticed = false; b.chaseT = 0; b.cooldown = CHASE_COOLDOWN; stopEntityCue(b.id); if (b.id === "blackrose") { rt.blackRose = false; rt.flashFlicker = true; } }

function spawnFar(b: Bot, filter?: (r: Room) => boolean) {
  const pr = roomAt(rt.pos.x, rt.pos.z);
  const cand = rooms.filter((r) => r.idx > 2 && (!pr || Math.abs(r.c - pr.c) + Math.abs(r.r - pr.r) >= 3) && (!filter || filter(r)));
  if (!cand.length) return false;
  const r = cand[Math.floor(Math.random() * cand.length)];
  b.room = r.idx; b.x = r.cx; b.z = r.cz; b.active = true; b.mode = "wander"; b.t = 0; b.target = r.idx; b.look = 0; b.flashT = 0; b.enraged = 0;
  return true;
}

/** step toward player (or a room) through room graph */
function stepToward(b: Bot, tx: number, tz: number, v: number, dt: number) {
  const x = b.x, z = b.z;
  walkToward(b, tx, tz, v, dt);
  const moved = Math.hypot(b.x - x, b.z - z);
  if (moved > .001) b.yaw = Math.atan2(b.x - x, b.z - z);
  // stuck detector: barely moving while trying to move -> new route / small unstick hop
  if (v > 0.5 && moved < v * dt * 0.2) b.stuck = (b.stuck ?? 0) + dt; else b.stuck = 0;
  if ((b.stuck ?? 0) > 1.5) {
    b.stuck = 0;
    const r0 = rooms[b.room];
    if (r0) { b.x += (r0.cx - b.x) * 0.35; b.z += (r0.cz - b.z) * 0.35; }
    b.target = b.id === "thirsty" ? (rooms.filter((q) => q.light === "dark")[Math.floor(Math.random() * 50)]?.idx ?? neighborRoom(b.room)) : neighborRoom(b.room);
  }
  const r = roomAt(b.x, b.z); if (r) b.room = r.idx;
}

function seesBot(b: Bot, cam: THREE.Camera, time: number) {
  const dx = b.x - rt.pos.x, dz = b.z - rt.pos.z, d = Math.hypot(dx, dz);
  if (d > SIGHT_RANGE) return { sees: false, dot: 0, d, los: false };
  const f = new THREE.Vector3(); cam.getWorldDirection(f); f.y = 0; f.normalize();
  const dot = (dx * f.x + dz * f.z) / Math.max(d, 0.01);
  const los = lineOfSight(rt.pos.x, rt.pos.z, b.x, b.z);
  const r = rooms[b.room];
  const lit = (r && lightLevel(r, time) > 0.3) || (game.get().flashlight && d < 18 && dot > 0.9);
  const entityDot = (-dx * Math.sin(b.yaw) - dz * Math.cos(b.yaw)) / Math.max(d, .01);
  return { sees: faceToFace(d, dot, entityDot, los) && (lit || d < 8), dot, d, los };
}

function BotSprite({ b }: { b: Bot }) {
  const ref = useRef<THREE.Sprite>(null);
  const disguise = useRef<THREE.Group>(null);
  const [identity, setIdentity] = useState(() => mimicIdentity());
  const tex = useMemo(() => imageTex(ENTITIES[b.id].img), [b.id]);
  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05);
    const s = game.get(); const cam = rt.camera; if (!cam || !ref.current) return;
     const inWorld = rt.pos.y<.5 && rt.pos.z > 0 && rt.pos.x < 400 && s.screen === "game" && !s.jumpscare && s.panel !== "dead";
    b.cooldown = Math.max(0, b.cooldown - dt);
    if (b.id === "mimic" && identity.hour !== Math.floor(Date.now()/3600000)) setIdentity(mimicIdentity());
    if (disguise.current) disguise.current.visible = false;
    if (!b.active) {
      ref.current.visible = false;
       if (inWorld) { b.respawn -= dt; if (b.respawn <= 0) { if (b.id === "blackrose") { if (blackRoseEligible(s.battery, Math.random()) && spawnAhead(b, cam, 4)) { b.mode = "chase"; b.chaseT = 15; b.teleportT = 4; rt.blackRose = true; b.noticed = true; entityCue(b.id); } else b.respawn = 15; } else if (!spawnFar(b, b.id === "thirsty" ? (r) => r.light === "dark" : undefined)) b.respawn = 10; if (b.id === "not" || b.id === "unknown") b.active = false, b.mode = "lurk"; } }
      if (b.mode !== "lurk" && !(b.id === "uncanny" && s.inRoom)) return;
    }
    if (!inWorld) {
       if (b.mode === "chase" || b.mode === "rush") { if (b.id === "blackrose" || b.id === "not") despawn(b); else { b.mode = "wander"; b.chaseT = 0; b.noticed = false; b.cooldown = CHASE_COOLDOWN; stopEntityCue(b.id); } }
      ref.current.visible = false; entityLoop(b.id, 0, 60);
      if (b.id === "uncanny" && !b.active && s.inRoom) spawnFar(b);
      if (b.id === "uncanny" && b.active && s.inRoom) { stepToward(b, rooms[b.target].cx, rooms[b.target].cz, 1.4, dt); if (Math.hypot(rooms[b.target].cx - b.x, rooms[b.target].cz - b.z) < 1) b.target = neighborRoom(b.room); }
      if (b.id === "uncanny") rt.uncannyView = { x: b.x, z: b.z, yaw: b.yaw, active: b.active };
      return;
    }
    if (b.id === "uncanny") rt.uncannyView = { x: b.x, z: b.z, yaw: b.yaw, active: b.active };
    const time = clock.elapsedTime;
    const pr = roomAt(rt.pos.x, rt.pos.z);
    const v = seesBot(b, cam, time);
    const H = b.id === "maka" ? 2.2 : b.id === "unknown" ? 2.0 : 1.9;
    const discover = () => {
      const enc = game.get().save.encounters ?? {}; game.setSave({ encounters: { ...enc, [b.id]: (enc[b.id] ?? 0) + 1 } });
      if (!s.save.discovered.includes(b.id)) { game.setSave({ discovered: [...s.save.discovered, b.id] }); game.set({ newEntity: b.id }); }
    };
    b.t += dt;

    const eDot = (-(b.x - rt.pos.x) * Math.sin(b.yaw) - (b.z - rt.pos.z) * Math.cos(b.yaw)) / Math.max(v.d, .01);
    const botSees = v.los && v.d < 22 && eDot > 0.35;
    const patrol = (sp: number, pick: () => number) => {
      stepToward(b, rooms[b.target].cx, rooms[b.target].cz, sp, dt);
      if (Math.hypot(rooms[b.target].cx - b.x, rooms[b.target].cz - b.z) < 1) b.target = pick();
    };
    const darkRooms = () => rooms.filter((r) => r.light === "dark");
    const inDark = (r?: Room | null) => !!r && (r.light === "dark" || r.light === "blackout" || rt.makaDark.has(r.idx));
    const startChase = (seconds: number) => { b.mode = "chase"; b.chaseT = seconds; b.noticed = false; discover(); };
    switch (b.id) {
      case "blackrose": {
         if (b.mode === "chase") { rt.blackRose = true; rt.flashFlicker = Math.sin(time * 48) > 0; b.teleportT -= dt;
           if (b.teleportT <= 0) { spawnAhead(b, cam, 4 + Math.random()*3); b.mode = "chase"; b.teleportT = 4 + Math.random()*3; }
        } break;
      }
      case "akamanto": {
        if (b.mode !== "chase") { patrol(1.9, () => neighborRoom(b.room)); if (botSees && b.cooldown <= 0) { startChase(3600); b.escapedRooms = new Set(pr ? [pr.idx] : []); } }
        else if (pr) { b.escapedRooms.add(pr.idx); if (b.escapedRooms.size >= 6) b.chaseT = 0; }
        break;
      }
      case "hand": {
        if (b.mode === "follow" && b.stolen) { const goal = rooms[b.target]; stepToward(b,goal.cx,goal.cz,8,dt); if (Math.hypot(b.x-goal.cx,b.z-goal.cz)<1) { rt.dropped.push({ ...b.stolen,key:crypto.randomUUID(),x:b.x,y:0,z:b.z,at:Date.now() }); b.stolen = undefined; b.mode="wander"; b.cooldown=CHASE_COOLDOWN; } }
        else if (b.mode === "chase") {
          if (!v.los || v.d > 24) { b.mode="wander"; b.cooldown=CHASE_COOLDOWN; }
          else if (v.d<1.1) { const inv=normInv(s.save.inventory, s.save.inventory.length); const candidates=inv.map((it,i)=>it && it.id!=="__big" ? i : -1).filter(i=>i>=0); const slot=candidates[Math.floor(Math.random()*candidates.length)]; const item=slot===undefined?null:inv[slot]; if(item) { b.stolen={...item}; removeAt(slot); const far=rooms.filter(r=>Math.hypot(r.cx-b.x,r.cz-b.z)>55); b.target=(far[Math.floor(Math.random()*far.length)]??rooms[b.room]).idx; b.mode="follow"; b.chaseT=0; game.toast("Some Hand stole your item!"); } else { b.mode="wander"; b.cooldown=CHASE_COOLDOWN; } }
        } else { patrol(1.1,()=>neighborRoom(b.room)); if(botSees && b.cooldown<=0) startChase(3600); }
        break;
      }
      case "mimic": {
        if (b.mode !== "chase") { patrol(1.7,()=>neighborRoom(b.room)); if (v.d<3.2 && v.los && b.cooldown<=0) startChase(13); }
        break;
      }
      case "uncanny": {
        if (b.mode !== "chase") { b.mode = "wander"; patrol(2.6, () => neighborRoom(b.room)); if (botSees && b.cooldown <= 0) { b.mode = "chase"; b.chaseT = 10; discover(); sfx.whisper(); } }
        break;
      }
      case "thirsty": {
        if (b.mode !== "chase") {
          b.mode = "wander";
          if (!inDark(rooms[b.target])) { const d = darkRooms(); if (d.length) b.target = d[Math.floor(Math.random() * d.length)].idx; }
          const before = b.target;
          patrol(2.2, () => b.target);
          if (Math.hypot(rooms[before].cx - b.x, rooms[before].cz - b.z) < 1) {
            // patrol done: reappear in another dark room
            const d = darkRooms(); const n = d[Math.floor(Math.random() * d.length)];
            if (n) { b.x = n.cx; b.z = n.cz; b.room = n.idx; const m = d[Math.floor(Math.random() * d.length)]; b.target = m.idx; }
          }
          if (b.cooldown <= 0 && botSees && inDark(pr) && inDark(rooms[b.room])) { b.mode = "chase"; b.chaseT = 10; discover(); }
        } else if (!inDark(pr)) { b.mode = "wander"; b.chaseT = 0; b.cooldown = CHASE_COOLDOWN; }
        break;
      }
      case "maka": {
        if (b.mode !== "chase") { b.mode = "wander"; patrol(1.8, () => neighborRoom(b.room)); if (b.cooldown <= 0 && v.d >= 7 && (botSees || v.sees)) { b.mode = "chase"; b.chaseT = MAKA_CHASE_SECONDS; discover(); rooms.forEach((r) => { rt.makaDark.add(r.idx); rt.makaRestore.set(r.idx, Date.now() + MAKA_BLACKOUT_MS); }); sfx.flicker(); } }
        break;
      }
      case "not": {
        if (b.mode === "lurk") {
          if (pr && pr.light === "dark" && Math.random() < dt * 0.04) {
            const f = new THREE.Vector3(); cam.getWorldDirection(f); f.y = 0; f.normalize();
            b.x = rt.pos.x + f.x * 2.2; b.z = rt.pos.z + f.z * 2.2;
            b.room = pr.idx; b.active = true; b.mode = "peek"; b.t = 0; b.flashT = 0; b.yaw = Math.atan2(rt.pos.x - b.x, rt.pos.z - b.z); sfx.whisper(); entityCue(b.id); discover();
          }
        } else if (b.mode === "peek") {
          b.yaw = Math.atan2(rt.pos.x - b.x, rt.pos.z - b.z);
          if (s.flashlight && v.los && v.dot > 0.9 && v.d < 15) b.flashT += dt;
          if (b.flashT >= 4) { sfx.flicker(); b.active = false; b.mode = "lurk"; b.respawn = 0; }
          else if (b.t > 10) b.mode = "rush";
        } else if (b.mode === "rush") {
          stepToward(b, rt.pos.x, rt.pos.z, 16, dt);
          if (b.t > 25) { b.active = false; b.mode = "lurk"; }
        }
        break;
      }
      case "unknown": {
        if (b.mode === "lurk") {
          if (pr && Math.random() < dt * 0.03) {
            const nb = rooms.filter((r) => Math.abs(r.c - pr.c) + Math.abs(r.r - pr.r) === 1);
            const n = nb[Math.floor(Math.random() * nb.length)];
            if (n) { const p = portal(pr, n); b.x = p.x; b.z = p.z; b.room = pr.idx; b.active = true; b.mode = "peek"; b.t = 0; b.yaw = Math.atan2(rt.pos.x - b.x, rt.pos.z - b.z); discover(); entityCue(b.id); sfx.whisper(); }
          }
        } else if (b.mode === "peek") {
          // blocks the doorway; push the player back
          const dx = rt.pos.x - b.x, dz = rt.pos.z - b.z, d = Math.hypot(dx, dz);
          if (d < 0.9 && d > 0.001) { rt.pos.x = b.x + dx / d * 0.9; rt.pos.z = b.z + dz / d * 0.9; }
          if (b.t > 25) { b.active = false; b.mode = "lurk"; }
        }
        break;
      }
    }

    if (b.mode === "chase" || b.mode === "rush") { if (!b.noticed) { b.noticed = true; entityCue(b.id); } }
    if (b.mode === "chase") {
      b.chaseT -= dt;
      stepToward(b, rt.pos.x, rt.pos.z, SPEED[b.id], dt);
      if (b.chaseT <= 0) { b.cooldown = CHASE_COOLDOWN; b.noticed = false; if (b.id === "maka" || b.id === "blackrose") { despawn(b); rt.blackRose = false; rt.flashFlicker = true; } else { b.mode = "wander"; b.chaseT = 0; } game.toast("…it lost your trail."); }
    }
    if (b.active && b.id !== "unknown" && b.id !== "hand" && (b.mode === "chase" || b.mode === "rush") && Math.hypot(rt.pos.x - b.x, rt.pos.z - b.z) < 0.9 && v.los) killPlayer(b.id);

    // render + audio
    ref.current.visible = b.active && !(b.id === "mimic" && b.mode !== "chase");
    if (disguise.current && b.id === "mimic") { disguise.current.visible = b.active && b.mode !== "chase"; disguise.current.position.set(b.x, 0, b.z); disguise.current.rotation.y = b.yaw + Math.sin(time*.5)*.15; }
    ref.current.position.set(b.x, H / 2 + (b.id === "not" ? Math.sin(time * 9) * 0.03 : 0), b.z);
    ref.current.scale.set(H * 0.9, H, 1);
    (ref.current.material as THREE.SpriteMaterial).color.setScalar(visibleLight(ref.current.position, time));
    const hunting = b.active && (b.mode === "chase" || b.mode === "rush");
    const hear = skillCount(s.save, "scavenger") >= 10 ? 1 : v.los ? 1 : 0.35;
    entityLoop(b.id, b.active && !hunting && v.los ? Math.max(0, 1 - v.d / 14) * hear * .4 : 0, 50 + BOT_IDS.indexOf(b.id) * 13 + (hunting ? 30 : 0));
  });
  return (
    <>
    {b.id === "mimic" && <group ref={disguise} visible={false}><Character outfit={identity.outfit} avatar={identity.avatar} held={identity.held} moving={() => b.mode === "wander" ? 1 : 0} /><sprite position={[0,2.3,0]} scale={[1.4,.3,1]}><spriteMaterial map={identity.label} transparent depthTest /></sprite></group>}
    <sprite ref={ref} visible={false}>
      <spriteMaterial map={tex} transparent alphaTest={0.25} fog={false} />
    </sprite>
    </>
  );
}

function neighborRoom(i: number) {
  const r = rooms[i];
  const n = rooms.filter((o) => Math.abs(o.c - r.c) + Math.abs(o.r - r.r) <= 2 && o.idx !== i);
  return n[Math.floor(Math.random() * n.length)]?.idx ?? i;
}

export function Entities() {
  useFrame(() => {
    rt.makaRestore.forEach((until,idx) => { if(Date.now()>=until) { rt.makaRestore.delete(idx); rt.makaDark.delete(idx); } });
    const chasing = bots.some((b) => b.active && (b.mode === "chase" || b.mode === "rush"));
    setChase(chasing ? 1 : 0);
    if ((game.get().chase > 0) !== chasing) game.set({ chase: chasing ? 1 : 0 });
  });
   return <><Stalker />{bots.map((b) => <BotSprite key={b.id} b={b} />)}</>;
}
function Stalker() {
  const ref = useRef<THREE.Sprite>(null);
  const state = useRef({ active: false, wait: 12, age: 0, duration: 15, gaze: 0, rushing: false, x: 0, z: 0 });
  const tex = useMemo(() => imageTex(ENTITIES.stalker.img), []);
  useFrame(({clock},raw) => {
    const b = state.current, dt = Math.min(raw,.05), s = game.get(), mesh = ref.current;
    if (!mesh) return;
    const world = s.screen === "game" && rt.pos.x < 400 && rt.pos.z > 0 && !s.jumpscare && s.panel !== "dead";
    if (!world) { b.active = false; b.rushing = false; mesh.visible = false; return; }
    if (!b.active) {
      b.wait -= dt;
      if (b.wait <= 0) {
        b.wait = 20;
        const options = rooms.filter(r => lightLevel(r,clock.elapsedTime) < .15 && Math.hypot(r.cx-rt.pos.x,r.cz-rt.pos.z) > 10 && Math.hypot(r.cx-rt.pos.x,r.cz-rt.pos.z) < 35 && lineOfSight(rt.pos.x,rt.pos.z,r.cx,r.cz));
        if (Math.random() < .3 && options.length) { const r = options[Math.floor(Math.random()*options.length)]; b.x=r.cx; b.z=r.cz; b.active=true; b.age=0; b.gaze=0; b.duration=10+Math.random()*10; }
      }
    } else {
      b.age += dt;
      const dx=b.x-rt.pos.x,dz=b.z-rt.pos.z,d=Math.hypot(dx,dz);
      const dot = (-dx*Math.sin(rt.yaw)-dz*Math.cos(rt.yaw))/Math.max(.01,d);
      b.gaze=stareTime(b.gaze,dot>.93 && lineOfSight(rt.pos.x,rt.pos.z,b.x,b.z),dt);
      if (!b.rushing && b.gaze>4) { b.rushing=true; entityCue("stalker"); const enc=s.save.encounters??{}; game.setSave({discovered:Array.from(new Set([...s.save.discovered,"stalker" as const])),encounters:{...enc,stalker:(enc.stalker??0)+1}}); }
      if(b.rushing) { const step=Math.min(d,24*dt); b.x-=dx/Math.max(.01,d)*step; b.z-=dz/Math.max(.01,d)*step; if(d<.8){game.set({terrified:Date.now()+5000});b.active=false;b.rushing=false;b.wait=25;} }
      else if(b.age>b.duration)b.active=false;
    }
    mesh.visible=b.active; mesh.position.set(b.x,1.5,b.z); (mesh.material as THREE.SpriteMaterial).color.setScalar(b.rushing?1:.5);
  });
  return <sprite ref={ref} visible={false} scale={[1.4,3,1]}><spriteMaterial map={tex} transparent alphaTest={.25} fog={false}/></sprite>;
}
export const _cols = COLS;

function spawnAhead(b: Bot, cam: THREE.Camera, distance: number) {
  const f = new THREE.Vector3(); cam.getWorldDirection(f); f.y=0; f.normalize();
  const options=rooms.filter(r=>Math.hypot(r.cx-rt.pos.x,r.cz-rt.pos.z)>=distance && Math.hypot(r.cx-rt.pos.x,r.cz-rt.pos.z)<distance+24 && lineOfSight(rt.pos.x,rt.pos.z,r.cx,r.cz));
  options.sort((a,c)=> ((c.cx-rt.pos.x)*f.x+(c.cz-rt.pos.z)*f.z) - ((a.cx-rt.pos.x)*f.x+(a.cz-rt.pos.z)*f.z));
  const r=options[0]; if(!r) return false; b.x=r.cx;b.z=r.cz;b.room=r.idx;b.active=true;b.yaw=Math.atan2(rt.pos.x-b.x,rt.pos.z-b.z);return true;
}
function mimicIdentity() {
  const hour=Math.floor(Date.now()/3600000); const names=["Ash","Rook","Echo","Moss","Nox","Vale","Reed","Finch"];
  const seed=(hour*16807)%2147483647;const name=names[seed%names.length]+String(seed%100);const level=2+seed%4;
  const face=document.createElement("canvas");face.width=64;face.height=64;const c=face.getContext("2d");if(c){c.fillStyle=`hsl(${seed%360},30%,45%)`;c.fillRect(0,0,64,64);c.fillStyle="#ddd";c.fillRect(12,17,12,10);c.fillRect(40,17,12,10);c.fillStyle="#222";c.fillRect(15,20,5,5);c.fillRect(43,20,5,5);c.fillRect(20,42,25,5);}
  const label=document.createElement("canvas");label.width=256;label.height=48;const ctx=label.getContext("2d");if(ctx){ctx.font="bold 25px monospace";ctx.textAlign="center";ctx.fillStyle="#fff";ctx.fillText(`${name} · LV ${level}`,128,34);}
  return {hour,avatar:face.toDataURL(),outfit:OUTFITS[seed%OUTFITS.length].id,held:seed%3?SCRAP_IDS[seed%SCRAP_IDS.length]:"axe",label:new THREE.CanvasTexture(label)};
}
