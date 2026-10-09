import { upperGround } from "./upper-world";
import { FirstPersonTool } from "./ToolModel";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { collide, nearbyBoxes, LAB, roomAt, DECOR_SIZE, dynBoxes, PROOM, type Box } from "./world";
import { rt } from "./runtime";
import { game, skillCount, maxHealth, maxSlots } from "./store";
import { ITEMS, WALL_DECOR } from "./data";
import { held, updateHeld, dropHeld } from "./items";
import { sfx, setHum } from "./audio";
import { imageTex } from "./textures";
import { minions, hitMinion } from "./Entities";
import { lightLevel, setFlashSource } from "./runtime";
setFlashSource(() => game.get().flashlight);

import { PERSONAL_THEMES } from "./themes";
import { JUMP_SPEED, jumpStamina, verticalStep, pipeRemaining, SPRINT_SPEED, statusKey } from "./rules";
import { readContainer } from "./containers";

const keys = new Set<string>();

export function Player() {
  const { camera, gl } = useThree();
  const flash = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const hand = useRef<THREE.Sprite>(null);
  const stepT = useRef(0);
  const bob = useRef(0);
  const shotT = useRef(0);

  useEffect(() => {
    rt.camera = camera;
    camera.add(target); target.position.set(0, 0, -1);
    const canvas = gl.domElement;
    rt.lockRequest = () => { try { canvas.requestPointerLock(); } catch { /* */ } };
    const kd = (e: KeyboardEvent) => {
      const s = game.get();
       if (s.screen !== "game" || s.sleeping || s.jumpscare) return;
      const k = e.code;
      if (k === "Escape" || k === "Tab") {
        e.preventDefault();
         const action = statusKey(k, !!s.panel, s.panel === "dead" || !!s.jumpscare);
         if (action === "close") { game.set({ panel: null }); rt.lockRequest(); }
         else if (action === "open") { game.set({ panel: "inventory" }); document.exitPointerLock(); }
        return;
      }
      if (s.panel) return;
      if (k === "KeyR" && s.decorMode && !e.repeat) game.set({ decorRotation: s.decorRotation + Math.PI / 2 });
      if (k === "KeyL" && s.decorMode && !e.repeat && s.inRoom === s.userId) {
         game.set({ panel: "themes" }); return;
      }
      keys.add(k);
      if (k === "Space") {
        e.preventDefault();
        const stamina = jumpStamina(s.stamina, rt.grounded);
        if (!e.repeat && stamina !== null && !s.jumpscare) { rt.verticalVelocity = JUMP_SPEED; rt.grounded = false; game.set({ stamina }); }
      }
      if (k === "KeyF") {
        if (s.battery <= 0) { game.toast("Flashlight battery dead"); return; }
        game.set({ flashlight: !s.flashlight }); sfx.flash();
      }
      if (k === "KeyE") {
        if (s.decorMode) { placeDecor(); return; }
        rt.focused?.onE?.();
      }
      if (k === "KeyQ") { if (s.decorMode) storeDecor(); else dropHeld(); }
      if (k === "KeyP") {
        if (s.inRoom && s.inRoom === s.userId) {
          const on = !s.decorMode;
          game.set({ decorMode: on, decorSel: on ? s.save.decorOwned[0] ?? null : null, decorRotation: 0 });
           game.toast(on ? "BUILDING MODE — scroll choose · E place · R rotate · L themes · Q store · P exit" : "Building mode off");
        }
      }
      const n = parseInt(e.key); if (n >= 1 && n <= maxSlots(s.save)) game.set({ slot: n - 1 });
    };
    const ku = (e: KeyboardEvent) => keys.delete(e.code);
    const mm = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas || game.get().panel || game.get().sleeping) return;
      if (rt.lmb && rt.focused?.door) { rt.dragDx += e.movementX; return; }
      rt.yaw -= e.movementX * 0.0022;
      rt.pitch = Math.max(-1.45, Math.min(1.45, rt.pitch - e.movementY * 0.0022));
    };
    const md = (e: MouseEvent) => {
      const s = game.get(); if (s.screen !== "game" || s.panel || s.sleeping) return;
      if (document.pointerLockElement !== canvas) { if (!s.panel) rt.lockRequest(); return; }
      if (e.button === 0) { rt.lmb = true; const hp = held(); if (hp?.id === "papermap" && !rt.focused) { game.set({ panel: "papermap" }); document.exitPointerLock(); rt.lmb = false; return; } }
      if (e.button === 2) { rt.rmb = true; rt.rmbT = 0; useItem(); }
    };
    const mu = (e: MouseEvent) => { if (e.button === 0) { rt.lmb = false; rt.dragDx = 0; } if (e.button === 2) { rt.rmb = false; rt.rmbT = 0; } };
    const wh = (e: WheelEvent) => {
      const s = game.get(); if (s.screen !== "game" || s.panel) return;
      if (s.decorMode) {
        const own = s.save.decorOwned; if (!own.length) return;
        const i = own.indexOf(s.decorSel ?? ""); game.set({ decorSel: own[(i + (e.deltaY > 0 ? 1 : own.length - 1)) % own.length] }); return;
      }
      const n = maxSlots(s.save);
      let i = s.slot;
      for (let k = 0; k < n; k++) {
        i = (i + (e.deltaY > 0 ? 1 : n - 1)) % n;
        if (s.save.inventory[i]?.id !== "__big") break;
      }
      game.set({ slot: i }); sfx.click();
    };
     const plc = () => { if (!document.pointerLockElement) { keys.clear(); rt.lmb = false; rt.rmb = false; rt.radar = false; } };
    const cm = (e: Event) => e.preventDefault();
    // Free the mouse as soon as any screen/panel opens — no ESC needed.
     const unsubPanel = game.subscribe(() => { const g = game.get(); if (g.panel || g.jumpscare || g.screen !== "game") { keys.clear(); rt.lmb = false; rt.rmb = false; rt.radar = false; if (document.pointerLockElement) document.exitPointerLock(); } });
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    window.addEventListener("mousemove", mm); window.addEventListener("mousedown", md); window.addEventListener("mouseup", mu);
    window.addEventListener("wheel", wh); document.addEventListener("pointerlockchange", plc); window.addEventListener("contextmenu", cm);
    return () => {
      window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku);
      window.removeEventListener("mousemove", mm); window.removeEventListener("mousedown", md); window.removeEventListener("mouseup", mu);
      window.removeEventListener("wheel", wh); document.removeEventListener("pointerlockchange", plc); unsubPanel(); window.removeEventListener("contextmenu", cm);
      camera.remove(target);
    };
  }, [camera, gl, target]);

  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05);
    const s = game.get();
    const save = s.save;
    if (s.screen !== "game") return;
    // safety: never leave the player outside the room they are in
    if (s.inRoom && (rt.pos.x < PROOM.x0 || rt.pos.x > PROOM.x1 || rt.pos.z < PROOM.z0 || rt.pos.z > PROOM.z1)) {
      rt.pos.set((PROOM.x0 + PROOM.x1) / 2, 0, PROOM.z1 - 1.5); rt.vel.set(0, 0, 0); rt.yaw = 0;
    }
    const frozen = !!s.panel || !!s.jumpscare || !!s.sleeping;
    if (frozen) { keys.clear(); rt.vel.set(0, 0, 0); rt.lmb = false; }
    // movement
    const f = new THREE.Vector3(-Math.sin(rt.yaw), 0, -Math.cos(rt.yaw));
    const r = new THREE.Vector3(-f.z, 0, f.x);
    const want = new THREE.Vector3();
    if (!frozen) {
      if (keys.has("KeyW")) want.add(f); if (keys.has("KeyS")) want.sub(f);
      if (keys.has("KeyD")) want.add(r); if (keys.has("KeyA")) want.sub(r);
    }
    const sv = skillCount(save, "survivor"), cv = skillCount(save, "carrier");
    const heavy = save.inventory.some((i) => i && i.id !== "__big" && ITEMS[i.id]?.slots === 2);
    const heavyMul = heavy ? 1 - 0.25 * (cv >= 8 ? 0 : cv >= 5 ? 0.4 : cv >= 3 ? 0.6 : cv >= 1 ? 0.9 : 1) : 1;
    const walk = 3.0 * (1 + (cv >= 2 ? 0.05 : 0) + (cv >= 6 ? 0.05 : 0) + (cv >= 9 ? 0.1 : 0)) * heavyMul;
    const adren = s.adrenaline > Date.now();
    const canRun = keys.has("ShiftLeft") || keys.has("ShiftRight");
    const running = canRun && want.lengthSq() > 0 && (s.stamina > 1 || adren);
     const sprint = SPRINT_SPEED * (1 + (sv >= 6 ? 0.05 : 0) + (sv >= 9 ? 0.1 : 0)) * heavyMul;
     const speed = (running ? sprint : walk) * (s.terrified > Date.now() ? .55 : 1);
    if (want.lengthSq() > 0) want.normalize().multiplyScalar(speed);
    rt.vel.lerp(want, 1 - Math.exp(-12 * dt));
    let nx = rt.pos.x + rt.vel.x * dt, nz = rt.pos.z + rt.vel.z * dt;
    const upstairs=rt.pos.x>=1000;
    const ceiling = upstairs ? 80 : s.inRoom ? PROOM.h : rt.pos.z < 0 ? LAB.h : roomAt(nx, nz)?.ceilH ?? 4;
    if (rt.grounded && rt.pos.y === 0) rt.verticalVelocity = 0;
    const vertical = verticalStep(rt.pos.x, rt.pos.z, rt.pos.y, rt.verticalVelocity, dt, nearbyBoxes(rt.pos.x, rt.pos.z), ceiling);
    rt.pos.y = vertical.y; rt.verticalVelocity = vertical.velocity; rt.grounded = vertical.grounded;
    if(upstairs){const floor=upperGround(nx,nz);if(rt.pos.y<=floor){rt.pos.y=floor;rt.verticalVelocity=0;rt.grounded=true;}}
    [nx, nz] = collide(nx, nz, 0.32, rt.pos.y);
    rt.pos.x = nx; rt.pos.z = nz;
    const sp = Math.hypot(rt.vel.x, rt.vel.z);
    rt.moving = sp / 3; rt.running = running;
    // stamina
    const maxSt = 100 * (1 + (sv >= 2 ? 0.1 : 0) + (cv >= 4 ? 0.1 : 0));
    let st = s.stamina;
    if (running && !adren) st -= dt * 18; else st += dt * (running ? 0 : 12) * (sv >= 5 ? 1.15 : 1);
    st = Math.max(0, Math.min(maxSt, st));
    // battery
    let bat = s.battery;
    if (s.flashlight) bat -= dt * (100 / 300) / (1 + (skillCount(save, "scavenger") >= 5 ? 0.2 : 0) + (skillCount(save, "scavenger") >= 8 ? 0.3 : 0));
    bat = Math.max(0, bat);
    const inLab = rt.pos.z < 0 && rt.pos.x < 400;
    const hp = Math.min(s.health, maxHealth(save));
    game.set({ stamina: st, battery: bat, flashlight: s.flashlight && bat > 0, inLab, health: hp });
    // footsteps
    if (sp > 0.5 && rt.grounded) {
      stepT.current += dt * sp;
      if (stepT.current > 1.9) { stepT.current = 0; sfx.step(running); }
      bob.current += dt * sp * 2.2;
    }
    // camera
     const motion = Math.min(1, sp / 3);
     camera.position.set(rt.pos.x, rt.pos.y + 1.62 + Math.sin(bob.current) * (running ? .065 : .035) * motion, rt.pos.z);
     camera.rotation.set(rt.pitch + (running ? Math.cos(bob.current * 2) * .012 * motion : 0), rt.yaw, running ? Math.sin(bob.current) * .015 * motion : 0, "YXZ");
    // ambient hum by room light
    const room = roomAt(rt.pos.x, rt.pos.z);
    setHum(room ? lightLevel(room, clock.elapsedTime) * 0.5 : inLab ? 0.15 : 0.05);
    // flashlight
    if (flash.current) { flash.current.intensity = s.flashlight && (!rt.blackRose || rt.flashFlicker) ? 22 : 0; flash.current.color.set(rt.blackRose ? "#2344b0" : "#fff4d6"); }
    // held right-click tools
    const hh = held();
    rt.radar = rt.rmb && hh?.id === "radar" && !s.panel;
    if (rt.rmb && hh?.id === "tear" && !s.glitch && !s.panel) {
      rt.rmbT += dt;
      if (rt.rmbT >= 3) {
        rt.rmb = false; rt.rmbT = 0; updateHeld(null); sfx.flicker();
        game.set({ glitch: Date.now(), flashlight: false });
        setTimeout(() => { rt.pos.set(0, 0, -6); rt.yaw = 0; rt.verticalVelocity = 0; rt.blackRose=false;rt.flashFlicker=true; game.set({ inRoom: null, inLab: true, decorMode: false }); }, 2000);
        setTimeout(() => game.set({ glitch: 0 }), 2600);
      }
    }
    // focus
    let best: typeof rt.focused = null, bd = 99;
    const cf = new THREE.Vector3(); camera.getWorldDirection(cf);
    if (!rt.lmb && !frozen) {
      for (const it of rt.interactables.values()) {
        const d = it.pos.distanceTo(camera.position);
        if (d > (it.range ?? 2)) continue;
        const dir = it.pos.clone().sub(camera.position).normalize();
        const dot = dir.dot(cf);
        const score = d * (1.6 - dot);
        if (dot > 0.8 && score < bd) { bd = score; best = it; }
      }
      rt.focused = best;
    }
    // door drag
    if (rt.lmb && rt.focused?.door) {
      const d = rt.doors.get(rt.focused.door);
      if (d) {
        const before = d.angle;
        d.angle = Math.max(0, Math.min(1.7, d.angle + rt.dragDx * 0.006)); rt.dragDx = 0;
        if (before < 0.05 && d.angle >= 0.05) sfx.door();
      }
    }
    const h = held();
    { const prompt = frozen ? "" : s.decorMode ? decorPrompt() : rt.focused ? rt.focused.label() : "", coords = h?.id === "navigator" ? coordStr() : ""; if (prompt !== s.prompt || coords !== s.coords) game.set({ prompt, coords }); }
    // hand item sprite
    if (hand.current) {
      const m = hand.current.material as THREE.SpriteMaterial;
      if (h) {
         hand.current.visible = ITEMS[h.id].scrap && !s.panel && !s.jumpscare;
        if (m.map !== imageTex(ITEMS[h.id].img)) { m.map = imageTex(ITEMS[h.id].img); m.needsUpdate = true; }
        rt.swing = Math.max(0, rt.swing - dt * 4);
        rt.handAnim = Math.max(0, rt.handAnim - dt * 2);
        const sw = Math.sin(rt.swing * Math.PI);
        hand.current.position.set(0.42 - sw * 0.25, -0.38 + Math.sin(bob.current) * 0.02 + sw * 0.1, -0.75 - sw * 0.2);
        m.rotation = -sw * 1.2;
        const sc = ITEMS[h.id].slots === 2 ? 0.5 : 0.36; hand.current.scale.set(sc, sc, sc);
      } else hand.current.visible = false;
    }
    shotT.current -= dt;
    // decor ghost
    if (s.decorMode) {
      const g = ghostPos(); rt.ghost = g;
    } else rt.ghost = null;
  });

  return (
    <>
      <primitive object={camera}>
        <spotLight ref={flash} position={[0, -0.03, 0]} castShadow shadow-mapSize={[512,512]} angle={0.42} penumbra={0.5} distance={22} decay={1.2} intensity={0} target={target} color="#fff4d6" />
        <FirstPersonTool />
         <sprite ref={hand} position={[0.42, -0.38, -0.75]} renderOrder={999}>
          <spriteMaterial transparent alphaTest={0.3} depthTest={false} />
        </sprite>
      </primitive>
    </>
  );
}

function coordStr() {
  const r = roomAt(rt.pos.x, rt.pos.z);
  return `X ${rt.pos.x.toFixed(1)}  Z ${rt.pos.z.toFixed(1)}${r ? `  ·  #${r.idx + 1} ${r.name}` : rt.pos.z < 0 ? "  ·  LABORATORY" : ""}`;
}

let lastUse = 0;
function useItem() {
  const h = held(); if (!h) return;
  const now = performance.now(); if (now - lastUse < 350) return; lastUse = now;
  const s = game.get();
  switch (h.id) {
    case "papermap": game.set({ panel: "papermap" }); document.exitPointerLock(); break;
    case "pipe":
    case "knife":
    case "axe": {
      rt.swing = 1; sfx.swing();
      const f = new THREE.Vector3(-Math.sin(rt.yaw), 0, -Math.cos(rt.yaw));
      let hit = false;
      for (const m of minions.values()) {
        if (m.hp <= 0) continue;
        const d = new THREE.Vector3(m.x - rt.pos.x, 0, m.z - rt.pos.z);
        if (d.length() < 2.1 && d.normalize().dot(f) > 0.5) { hitMinion(m); hit = true; }
      }
      if (hit) { sfx.hit(); const u = h.id === "pipe" ? pipeRemaining(h.uses) : (h.uses ?? (h.id === "knife" ? 40 : 100)) - 1; if (u <= 0) { game.toast(`Your ${h.id} broke`); updateHeld(null); } else updateHeld({ uses: u }); }
      break;
    }
    case "pistol": {
      let ammo = h.ammo ?? 12;
      if (ammo <= 0) return;
      rt.swing = 0.4; sfx.shot();
      const f = new THREE.Vector3(); if (!rt.camera) return; rt.camera.getWorldDirection(f); f.y = 0; f.normalize();
      let target: ReturnType<typeof minions.get> = undefined, bd = 30;
      for (const m of minions.values()) {
        if (m.hp <= 0) continue;
        const d = new THREE.Vector3(m.x - rt.pos.x, 0, m.z - rt.pos.z); const L = d.length();
        if (L < bd && d.normalize().dot(f) > 0.97) { bd = L; target = m; }
      }
      ammo--;
      let uses = h.uses ?? 50;
      if (target) { hitMinion(target); hitMinion(target); sfx.hit(); uses--; }
      if (uses <= 0) { game.toast("Your pistol broke"); updateHeld(null); return; }
      if (ammo <= 0) { sfx.reload(); game.toast("Reloading…"); setTimeout(() => updateHeld({ ammo: 12 }), 1600); }
      updateHeld({ ammo, uses });
      break;
    }
    case "health": game.set({ health: Math.min(maxHealth(s.save), s.health + maxHealth(s.save) * 0.3) }); sfx.heal(); updateHeld(null); break;
    case "adrenaline": game.set({ adrenaline: Date.now() + 30000, stamina: 100 }); sfx.heal(); game.toast("ADRENALINE — 30s unlimited sprint"); updateHeld(null); break;
    case "flashcharge": game.set({ battery: 100 }); sfx.reload(); game.toast("Flashlight recharged"); updateHeld(null); break;
    default: rt.swing = 0.6; sfx.swing();
  }
}

/* ---------------- decoration mode ---------------- */
export function ghostPos() {
  const s = game.get(); if (!s.decorSel) return null;
  const f = new THREE.Vector3(-Math.sin(rt.yaw), 0, -Math.cos(rt.yaw));
  const size = DECOR_SIZE[s.decorSel] ?? [1, 1, 1];
  let rot = Math.round(rt.yaw / (Math.PI / 2)) * (Math.PI / 2) + Math.PI + s.decorRotation;
  const swap = Math.abs(Math.sin(rot)) > .5, w = swap ? size[2] : size[0], d = swap ? size[0] : size[2];
  let x = Math.max(PROOM.x0 + w / 2 + .15, Math.min(PROOM.x1 - w / 2 - .15, rt.pos.x + f.x * 2.2));
  let z = Math.max(PROOM.z0 + d / 2 + .15, Math.min(PROOM.z1 - d / 2 - .15, rt.pos.z + f.z * 2.2));
  let y = 0;
  if (WALL_DECOR.has(s.decorSel)) {
    const sides = [
      { t: f.z < 0 ? (PROOM.z0 - rt.pos.z) / f.z : Infinity, r: 0, axis: "z", value: PROOM.z0 + size[2] / 2 + .11 },
      { t: f.z > 0 ? (PROOM.z1 - rt.pos.z) / f.z : Infinity, r: Math.PI, axis: "z", value: PROOM.z1 - size[2] / 2 - .11 },
      { t: f.x < 0 ? (PROOM.x0 - rt.pos.x) / f.x : Infinity, r: Math.PI / 2, axis: "x", value: PROOM.x0 + size[2] / 2 + .11 },
      { t: f.x > 0 ? (PROOM.x1 - rt.pos.x) / f.x : Infinity, r: -Math.PI / 2, axis: "x", value: PROOM.x1 - size[2] / 2 - .11 },
    ].sort((a,b) => a.t - b.t);
    const wall = sides[0]; if (!wall || wall.t > 5) return { id: s.decorSel, x, z, y: 1, r: rot, ok: false };
    x = rt.pos.x + f.x * wall.t; z = rt.pos.z + f.z * wall.t; rot = wall.r;
    if (wall.axis === "x") { x = wall.value; z = Math.max(PROOM.z0 + size[0]/2 + .15, Math.min(PROOM.z1-size[0]/2-.15,z)); }
    else { z = wall.value; x = Math.max(PROOM.x0+size[0]/2+.15,Math.min(PROOM.x1-size[0]/2-.15,x)); }
    y = Math.max(.6, Math.min(PROOM.h-size[1]-.15, 1.62 + Math.tan(rt.pitch)*wall.t-size[1]/2));
  }
  const box = decorBox(s.decorSel, x, z, rot, y);
  const exit = { x0: 503.9, x1: 506.1, z0: 507, z1: 510, y0: 0, y1: 3 };
  const ok = !overlap(box, exit) && !s.save.room.some((p) => overlap(box, decorBox(p.id, p.x, p.z, p.r, p.y)))
    && !(rt.pos.x > box.x0 - 0.3 && rt.pos.x < box.x1 + 0.3 && rt.pos.z > box.z0 - 0.3 && rt.pos.z < box.z1 + 0.3);
  return { id: s.decorSel, x, z, y, r: rot, ok };
}
export function decorBox(id: string, x: number, z: number, r: number, y = 0): Box {
  const sz = DECOR_SIZE[id] ?? [1, 1, 1];
  const swap = Math.abs(Math.sin(r)) > 0.5;
  const w = swap ? sz[2] : sz[0], d = swap ? sz[0] : sz[2];
  return { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y0: y, y1: y + sz[1] + .02 };
}
const overlap = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0 && a.y0 < b.y1 && a.y1 > b.y0;
function decorPrompt() {
  const g = rt.ghost; const s = game.get();
  if (!s.decorSel) return "No decorations in storage — buy some in the Shop · Q store nearby · P exit";
   return `${g?.ok ? `[E] Place ${s.decorSel}` : "Can't place here"} · R rotate · L themes (1000) · Q store · scroll choose · P exit`;
}
function placeDecor() {
  const g = rt.ghost; const s = game.get();
  if (!g || !g.ok) { sfx.hurt(); return; }
  const own = [...s.save.decorOwned]; own.splice(own.indexOf(g.id), 1);
  game.setSave({ room: [...s.save.room, { id: g.id, key: crypto.randomUUID(), x: g.x, y: g.y, z: g.z, r: g.r }], decorOwned: own });
  game.set({ decorSel: own[0] ?? null }); sfx.thud();
}
async function storeDecor() {
  const s = game.get(); const f = new THREE.Vector3(-Math.sin(rt.yaw), 0, -Math.cos(rt.yaw));
  const px = rt.pos.x + f.x * 2, pz = rt.pos.z + f.z * 2;
  let bi = -1, bd = 2.2;
  s.save.room.forEach((p, i) => { const d = Math.hypot(p.x - px, p.z - pz); if (d < bd) { bd = d; bi = i; } });
  if (bi < 0) return;
  const p = s.save.room[bi];
  if (p.id === "storagebox" && p.key) { try { if ((await readContainer(p.key)).some(Boolean)) { game.toast("Empty the storage box first"); return; } } catch { game.toast("Storage unavailable"); return; } }
  if (p.artwork) { game.toast("Remove the artwork before storing its frame"); return; }
  game.setSave({ room: s.save.room.filter((_, i) => i !== bi), decorOwned: [...s.save.decorOwned, p.id] });
  game.set({ decorSel: p.id }); sfx.pickup();
}
export { dynBoxes };
