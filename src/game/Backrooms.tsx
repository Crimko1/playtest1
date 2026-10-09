import { Elevators } from "./Elevator";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  rooms, hEdges, vEdges, CELL, COLS, ROWS, X0, DOOR_W, DOOR_H, LAB, LAB_OPEN, doorHinged, dynBoxes, scrapFor, hourSeed,
  roomAt, type Room, type Box,
} from "./world";
function openBetween(a: Room, b: Room) { return a.c === b.c ? hEdges[a.c][Math.max(a.r, b.r)] === "open" : vEdges[Math.max(a.c, b.c)][a.r] === "open"; }
import { wallTex, floorTex, ceilingTex, imageTex } from "./textures";
import { tbox, lam } from "./geo";
import { PropMesh } from "./Props";
import { rt, register, lightLevel, visibleLight } from "./runtime";
import { supabase } from "@/integrations/supabase/client";
import { ITEMS } from "./data";
import { addItem, canFit, removeItemById } from "./items";
import { sendPick } from "./net";
import { game, skillCount, useGame } from "./store";
import { sfx } from "./audio";

type Seg = { a: number; b: number; y0: number; y1: number };

function edgeSegs(room: Room, side: "n" | "s" | "w" | "e"): Seg[] {
  const { c, r, ceilH: H } = room;
  const nb = side === "n" ? rooms[(r - 1) * COLS + c] : side === "s" ? rooms[(r + 1) * COLS + c] : side === "w" ? (c > 0 ? rooms[r * COLS + c - 1] : undefined) : c < COLS - 1 ? rooms[r * COLS + c + 1] : undefined;
  const t = side === "n" ? hEdges[c][r] : side === "s" ? hEdges[c][r + 1] : side === "w" ? vEdges[c][r] : vEdges[c + 1][r];
  const base = side === "n" || side === "s" ? room.x0 : room.z0;
  if (side === "n" && r === 0) {
    if (c === 0) return [{ a: base, b: LAB_OPEN.x0, y0: 0, y1: H }, { a: LAB_OPEN.x1, b: base + CELL, y0: 0, y1: H }];
    return [{ a: base, b: base + CELL, y0: 0, y1: H }];
  }
  const nbH = side === "n" && r === 0 ? LAB.h : nb?.ceilH ?? H;
  if (t === "open") return nbH < H ? [{ a: base, b: base + CELL, y0: nbH, y1: H }] : [];
  if (t === "door") {
    const m = base + CELL / 2;
    return [
      { a: base, b: m - DOOR_W / 2, y0: 0, y1: H }, { a: m + DOOR_W / 2, b: base + CELL, y0: 0, y1: H },
      { a: m - DOOR_W / 2, b: m + DOOR_W / 2, y0: DOOR_H, y1: H },
    ];
  }
  return [{ a: base, b: base + CELL, y0: 0, y1: H }];
}

function Walls({ room }: { room: Room }) {
  const mat = lam("w" + room.wall, () => ({ map: wallTex(room.wall) }));
  const base = lam("baseboard", () => ({ color: "#5a4a2a" }));
  const meshes: React.ReactElement[] = [];
  const T = 0.1;
  (["n", "s", "w", "e"] as const).forEach((side) => {
    edgeSegs(room, side).forEach((s, i) => {
      const len = s.b - s.a, h = s.y1 - s.y0; if (len <= 0.01 || h <= 0.01) return;
      const mid = (s.a + s.b) / 2, y = (s.y0 + s.y1) / 2;
      let pos: [number, number, number], size: [number, number, number];
      if (side === "n") { pos = [mid, y, room.z0 + T / 2]; size = [len, h, T]; }
      else if (side === "s") { pos = [mid, y, room.z0 + CELL - T / 2]; size = [len, h, T]; }
      else if (side === "w") { pos = [room.x0 + T / 2, y, mid]; size = [T, h, len]; }
      else { pos = [room.x0 + CELL - T / 2, y, mid]; size = [T, h, len]; }
      meshes.push(<mesh key={side + i} position={pos} geometry={tbox(size[0], size[1], size[2], 1.6)} material={mat} />);
      if (s.y0 === 0) {
        const bp: [number, number, number] = side === "n" || side === "s" ? [pos[0], 0.06, pos[2] + (side === "n" ? T / 2 + 0.01 : -T / 2 - 0.01)] : [pos[0] + (side === "w" ? T / 2 + 0.01 : -T / 2 - 0.01), 0.06, pos[2]];
        const bs: [number, number, number] = side === "n" || side === "s" ? [len, 0.12, 0.02] : [0.02, 0.12, len];
        meshes.push(<mesh key={side + i + "b"} position={bp} geometry={tbox(bs[0], bs[1], bs[2], 1)} material={base} />);
      }
    });
  });
  return <>{meshes}</>;
}

const partMats = new Map<string, THREE.Material>();
function Parts({ room }: { room: Room }) {
  const mat = lam("w" + room.wall, () => ({ map: wallTex(room.wall) }));
  let water = partMats.get(room.feature);
  if (!water) { water = new THREE.MeshLambertMaterial({ color: room.feature === "lake" ? "#2c4a52" : "#5fb0c0", transparent: true, opacity: 0.82 }); partMats.set(room.feature, water); }
  const rim = lam(room.feature === "lake" ? "rimrock" : "rimtile", () => ({ color: room.feature === "lake" ? "#4a4436" : "#d8dccf" }));
  return (<>
    {room.parts.map((b, i) => <mesh key={"p" + i} position={[(b.x0 + b.x1) / 2, b.y1 / 2, (b.z0 + b.z1) / 2]} geometry={tbox(b.x1 - b.x0, b.y1, b.z1 - b.z0, 1.6)} material={mat} />)}
    {room.water.map((b, i) => <group key={"w" + i}>
      <mesh position={[(b.x0 + b.x1) / 2, b.y1 / 2, (b.z0 + b.z1) / 2]} geometry={tbox(b.x1 - b.x0 + 0.3, b.y1, b.z1 - b.z0 + 0.3, 1)} material={rim} />
      <mesh position={[(b.x0 + b.x1) / 2, b.y1 + 0.01, (b.z0 + b.z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={water}><planeGeometry args={[b.x1 - b.x0, b.z1 - b.z0]} /></mesh>
    </group>)}
  </>);
}

function HingedDoor({ id, hx, hz, axis }: { id: string; hx: number; hz: number; axis: "x" | "z" }) {
  const ref = useRef<THREE.Group>(null);
  const box = useMemo<Box>(() => (axis === "x"
    ? { x0: hx, x1: hx + DOOR_W, z0: hz - 0.08, z1: hz + 0.08, y0: 0, y1: DOOR_H, door: 1, doorId: id }
    : { x0: hx - 0.08, x1: hx + 0.08, z0: hz, z1: hz + DOOR_W, y0: 0, y1: DOOR_H, door: 1, doorId: id }), [id, hx, hz, axis]);
  const pos = useMemo(() => new THREE.Vector3(axis === "x" ? hx + DOOR_W / 2 : hx, 1.1, axis === "x" ? hz : hz + DOOR_W / 2), [hx, hz, axis]);
  useEffect(() => {
    if (!rt.doors.has(id)) rt.doors.set(id, { angle: 0 });
    dynBoxes.push(box);
    const un = register({ id: "door" + id, pos, range: 2.4, door: id, label: () => "[Hold LMB + drag] Open / close door" });
    return () => { un(); const i = dynBoxes.indexOf(box); if (i >= 0) dynBoxes.splice(i, 1); };
  }, [id, box, pos]);
  useFrame(() => {
    const d = rt.doors.get(id); if (!d || !ref.current) return;
    ref.current.rotation.y = axis === "x" ? -d.angle : d.angle;
    box.y1 = d.angle < 1.1 ? DOOR_H : -1;
  });
  const mat = lam("door", () => ({ color: "#7a5a34" }));
  return (
    <group ref={ref} position={[hx, 0, hz]}>
      <group position={axis === "x" ? [DOOR_W / 2, DOOR_H / 2, 0] : [0, DOOR_H / 2, DOOR_W / 2]}>
        <mesh material={mat} geometry={tbox(axis === "x" ? DOOR_W - 0.04 : 0.05, DOOR_H - 0.04, axis === "x" ? 0.05 : DOOR_W - 0.04, 1)} />
        {[0.5, -0.4].map((y) => <mesh key={y} position={[0, y, 0]}><boxGeometry args={axis === "x" ? [DOOR_W - 0.4, 0.5, 0.07] : [0.07, 0.5, DOOR_W - 0.4]} /><meshLambertMaterial color="#6a4a28" /></mesh>)}
        <mesh position={axis === "x" ? [DOOR_W / 2 - 0.15, -0.05, 0.05] : [0.05, -0.05, DOOR_W / 2 - 0.15]}><sphereGeometry args={[0.035, 6, 4]} /><meshLambertMaterial color="#b08a40" /></mesh>
      </group>
    </group>
  );
}

function RoomView({ room }: { room: Room }) {
  const group = useRef<THREE.Group>(null);
  const roomIllumination = useMemo(() => ({value: 1}), []);
  useEffect(() => {
    const cloned: THREE.Material[] = [];
    group.current?.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const replacements = materials.map(original => {
        if (!(original instanceof THREE.MeshLambertMaterial || original instanceof THREE.MeshStandardMaterial || original instanceof THREE.MeshPhongMaterial)) return original;
        const material = original.clone(); cloned.push(material);
        material.onBeforeCompile = shader => {
          shader.uniforms.roomIllumination = roomIllumination;
          shader.fragmentShader = "uniform float roomIllumination;\n" + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>', THREE.ShaderChunk.lights_fragment_begin.replace('getPointLightInfo( pointLight, geometryPosition, directLight );', 'getPointLightInfo( pointLight, geometryPosition, directLight ); directLight.color *= roomIllumination;'));
          shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= roomIllumination;');
        };
        material.customProgramCacheKey = () => "isolated-room-light-v1";
        return material;
      }); object.material = Array.isArray(object.material) ? replacements : replacements[0];
      object.castShadow = true; object.receiveShadow = true;
    });
    return () => cloned.forEach(material => material.dispose());
  }, [room, roomIllumination]);
  const floorMat = lam("f" + room.floor, () => ({ map: floorTex(room.floor) }));
  const ceilMat = lam("c" + (room.light === "dark" ? "d" : "t"), () => ({ map: ceilingTex(room.light === "dark" ? "dark" : "tile") }));
  const panel = useMemo(() => new THREE.MeshBasicMaterial({ color: room.lightColor }), [room]);
  const base = useMemo(() => new THREE.Color(room.lightColor), [room]);
  const panels = useMemo(() => {
    const out: [number, number][] = [];
    const n = room.theme === "Pillar Hall" ? 3 : 2;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out.push([room.x0 + ((i + 0.5) * CELL) / n, room.z0 + ((j + 0.5) * CELL) / n]);
    return out;
  }, [room]);
  useFrame(({ clock }) => {
    const l = lightLevel(room, clock.elapsedTime);
    roomIllumination.value = l;
    panel.color.copy(base).multiplyScalar(l > 0 ? 0.25 + l * 0.75 : 0);
  });
  const doors: React.ReactElement[] = [];
  if (room.r > 0 && hEdges[room.c][room.r] === "door" && doorHinged.has(`h${room.c},${room.r}`))
    doors.push(<HingedDoor key="h" id={`h${room.c},${room.r}`} hx={room.cx - DOOR_W / 2} hz={room.z0} axis="x" />);
  if (room.c > 0 && vEdges[room.c][room.r] === "door" && doorHinged.has(`v${room.c},${room.r}`))
    doors.push(<HingedDoor key="v" id={`v${room.c},${room.r}`} hx={room.x0} hz={room.cz - DOOR_W / 2} axis="z" />);
  return (
    <group ref={group}>
      <mesh position={[room.cx, 0, room.cz]} rotation={[-Math.PI / 2, 0, 0]} material={floorMat}>
        <planeGeometry args={[CELL, CELL]} />
      </mesh>
      <mesh position={[room.cx, room.ceilH, room.cz]} rotation={[Math.PI / 2, 0, 0]} material={ceilMat}>
        <planeGeometry args={[CELL, CELL]} />
      </mesh>
      {room.light !== "dark" && panels.map(([x, z], i) => (
        <group key={i} position={[x, room.ceilH - 0.01, z]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={panel}><planeGeometry args={[1.2, 0.6]} /></mesh>
          <mesh position={[0, -0.005, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[1.3, 0.7]} /><meshLambertMaterial color="#8a8676" /></mesh>
        </group>
      ))}
      <Walls room={room} />
      {room.props.map((p, i) => <PropMesh key={i} p={p} />)}
      <Parts room={room} />
      {doors}
      <Scraps room={room} />
    </group>
  );
}

function ScrapSprite({ k, id, x, y, z, onPick, glow }: { k: string; id: string; x: number; y: number; z: number; onPick: () => void; glow: number }) {
  const ref = useRef<THREE.Sprite>(null);
  const pos = useMemo(() => new THREE.Vector3(x, y + 0.2, z), [x, y, z]);
  const pick = useRef(onPick); pick.current = onPick;
  useEffect(() => register({ id: "s" + k, pos, range: 2, label: () => `[E] Pick up ${ITEMS[id].name} ($${ITEMS[id].value || "—"}) · ${ITEMS[id].slots} slot${ITEMS[id].slots > 1 ? "s" : ""}`, onE: () => pick.current() }), [k, id, pos]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const d = rt.pos.distanceTo(pos);
    const m = ref.current.material as THREE.SpriteMaterial;
    const base = glow > 0 && d < glow ? 1.4 + Math.sin(clock.elapsedTime * 4) * 0.4 : 1;
    m.color.setScalar(base * visibleLight(pos, clock.elapsedTime));
  });
  const sz = ITEMS[id].slots === 2 ? 0.6 : 0.4;
  return (
    <sprite ref={ref} position={[x, y + sz / 2, z]} scale={[sz, sz, sz]}>
      <spriteMaterial map={imageTex(ITEMS[id].img)} transparent alphaTest={0.35} />
    </sprite>
  );
}

const claimed = { hour: -1, at: 0, keys: new Set<string>() };
async function refreshClaims(hour: number) {
  if (claimed.hour === hour && Date.now() - claimed.at < 20000) return;
  claimed.at = Date.now();
  const { data } = await supabase.from("hourly_scrap_claims").select("ordinal").eq("hour", hour);
  if (claimed.hour !== hour) { claimed.hour = hour; claimed.keys = new Set(); }
  data?.forEach((r) => claimed.keys.add(`${hour}:${r.ordinal}`));
}
async function claimScrap(hour: number, ordinal: number, id: string) {
  // optimistic: item lands instantly, rolled back if the server says someone else took it
  if (!addItem(id)) return null;
  const { data, error } = await supabase.rpc("claim_hourly_scrap", { requested_hour: hour, requested_ordinal: ordinal });
  if (error || !data) { removeItemById(id); claimed.keys.add(`${hour}:${ordinal}`); game.toast("Someone already took that"); return false; }
  return true;
}

function Scraps({ room }: { room: Room }) {
  const [hour, setHour] = useState(hourSeed());
  const [, force] = useState(0);
  useEffect(() => { const t = setInterval(() => { setHour(hourSeed()); refreshClaims(hourSeed()).then(() => force((n) => n + 1)); }, 3000); refreshClaims(hourSeed()).then(() => force((n) => n + 1)); return () => clearInterval(t); }, []);
  const list = useMemo(() => scrapFor(room, hour), [room, hour]);
  const glow = (() => { const n = skillCount(game.get().save, "scavenger"); return n >= 7 ? 15 : n >= 3 ? 10 : n >= 1 ? 6 : 0; })();
  return (
    <>
      {list.filter((s) => !rt.picked.has(s.key) && !claimed.keys.has(s.key)).map((s) => (
        <ScrapSprite key={s.key} k={s.key} id={s.id} x={s.x} y={s.y} z={s.z} glow={glow}
          onPick={() => { if (!canFit(s.id)) { game.toast(ITEMS[s.id].slots === 2 ? "Needs 2 free slots side by side" : "Inventory full"); return; } rt.picked.add(s.key); force((n) => n + 1); claimScrap(hour, s.ordinal, s.id).then((ok) => { if (ok) { sendPick(s.key); claimed.keys.add(s.key); } else if (ok === null) rt.picked.delete(s.key); force((n) => n + 1); }); }} />
      ))}
    </>
  );
}

export function DroppedItems() {
  const [, force] = useState(0);
  const n = useRef(0);
  useFrame(() => {
    const now = Date.now();
    if (rt.dropped.some((d) => d.at && now - d.at > 3600_000 && !ITEMS[d.id].scrap)) rt.dropped = rt.dropped.filter((d) => !d.at || now - d.at <= 3600_000 || ITEMS[d.id].scrap);
    if (rt.dropped.length !== n.current) { n.current = rt.dropped.length; force((v) => v + 1); }
  });
  return (
    <>
      {rt.dropped.map((d) => (
        <ScrapSprite key={d.key} k={d.key} id={d.id} x={d.x} y={d.y} z={d.z} glow={0}
          onPick={() => { if (addItem(d.id, { uses: d.uses, ammo: d.ammo, sketch: d.sketch })) { rt.dropped = rt.dropped.filter((o) => o !== d); force((v) => v + 1); } }} />
      ))}
    </>
  );
}

function LightPool() {
  const refs = useRef<(THREE.PointLight | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const here = roomAt(rt.pos.x, rt.pos.z);
    const near = rooms
      .map((r) => ({ r, d: Math.hypot(r.cx - rt.pos.x, r.cz - rt.pos.z) }))
      .filter((o) => o.d < 32 && lightLevel(o.r, t) > 0 && (!here || o.r === here || Math.abs(o.r.c - here.c) + Math.abs(o.r.r - here.r) <= 2))
      .sort((a, b) => a.d - b.d).slice(0, 8);
    refs.current.forEach((l, i) => {
      if (!l) return;
      const o = near[i];
      if (!o) { l.intensity = 0; return; }
      l.position.set(o.r.cx, o.r.ceilH - 0.4, o.r.cz);
      l.color.set(o.r.lightColor);
      l.intensity = lightLevel(o.r, t) * 9;
    });
  });
  return <>{Array.from({ length: 8 }, (_, i) => <pointLight key={i} ref={(el) => { refs.current[i] = el; }} distance={13} decay={1.1} intensity={0} />)}</>;
}

export function Backrooms() {
  const [cell, setCell] = useState<[number, number]>([0, 0]);
  useFrame(() => {
    const c = Math.floor((rt.pos.x - X0) / CELL), r = Math.max(0, Math.floor(rt.pos.z / CELL));
    if (c !== cell[0] || r !== cell[1]) setCell([c, r]);
  });
  const inRoom = useGame((s) => s.inRoom);
  const stalk = useGame((s) => !!s.inRoom && stalkPresent(s));
  const [ucell, setUcell] = useState<[number, number]>([-9, -9]);
  useFrame(() => {
    if (!stalk) return; const v = rt.uncannyView;
    const c = Math.floor((v.x - X0) / CELL), r = Math.floor(v.z / CELL);
    if (c !== ucell[0] || r !== ucell[1]) setUcell([c, r]);
  });
  const visible = useMemo(() => rooms.filter((rm) => (!inRoom && Math.abs(rm.c - cell[0]) <= 2 && Math.abs(rm.r - cell[1]) <= 2) || (stalk && Math.abs(rm.c - ucell[0]) <= 1 && Math.abs(rm.r - ucell[1]) <= 1)), [cell, ucell, inRoom, stalk]);
  if (inRoom && !stalk) return null;
  if (inRoom) return <group>{visible.map((r) => <RoomView key={r.idx} room={r} />)}</group>;
  return (
    <group>
      {visible.map((r) => <RoomView key={r.idx} room={r} />)}
      <Elevators visible={visible} />
      <LightPool />
      {/* outer boundary void caps */}
      <mesh position={[X0 + (COLS * CELL) / 2, -0.01, (ROWS * CELL) / 2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[COLS * CELL + 40, ROWS * CELL + 40]} /><meshBasicMaterial color="#000" /></mesh>
    </group>
  );
}

function stalkPresent(s: ReturnType<typeof game.get>) { return s.inRoom === s.userId ? s.save.room.some((p) => p.id === "stalkdevice") : rt.visitStalk; }
