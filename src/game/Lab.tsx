import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { LAB, LAB_OPEN, labBoxes, PROOM, ROOMS_RETURN, type Box } from "./world";
import { labTex, floorTex, ceilingTex, screenTex, wallTex, metalTex, imageTex, WALLPAPERS } from "./textures";
import { tbox, lam } from "./geo";
import { rt, register } from "./runtime";
import { game, useGame, payoutMult, todayStr, addXp } from "./store";
import { ITEMS } from "./data";
import { addItem, held, heldIndex, removeAt } from "./items";
import { deposit } from "./cloud";
import { onQuotaComplete } from "./net";
import { sfx } from "./audio";
import { Character } from "./Character";
import { DecorMesh, PlacedDecor } from "./Decor";
import type { Placed } from "./store";
import { Leaderboard } from "./Leaderboard";
import { PERSONAL_THEMES } from "./themes";
import { extractionXp } from "./rules";

const STATIONS: { id: string; box: Box }[] = [
  { id: "extractor", box: { x0: 9.6, x1: 12, z0: -6.4, z1: -3.6, y0: 0, y1: 3 } },
  { id: "tree", box: { x0: 1, x1: 3, z0: -16, z1: -14, y0: 0, y1: 3 } },
  { id: "shop", box: { x0: -8, x1: -4, z0: -18, z1: -16.8, y0: 0, y1: 2.8 } },
  { id: "found", box: { x0: -12, x1: -10.9, z0: -6, z1: -4, y0: 0, y1: 2.3 } },
];
let pushed = false;
if (!pushed) { pushed = true; STATIONS.forEach((s) => labBoxes.push(s.box)); }

function useStation(id: string, pos: [number, number, number], label: () => string, onE: () => void, range = 2.6) {
  const v = useMemo(() => new THREE.Vector3(...pos), [pos[0], pos[1], pos[2]]);
  useEffect(() => register({ id, pos: v, label, onE, range }), [id, v]);
}

function Shell() {
  const wall = lam("labwall", () => ({ map: labTex() }));
  const floor = lam("labfloor", () => ({ map: floorTex("tile") }));
  const ceil = lam("labceil", () => ({ map: ceilingTex("tile") }));
  const { x0, x1, z0, z1, h } = LAB; const w = x1 - x0, d = z1 - z0;
  const segs: [number, number, number, number, number, number][] = [
    [(x0 + x1) / 2, h / 2, z0 + 0.05, w, h, 0.1],
    [x0 + 0.05, h / 2, (z0 + z1) / 2, 0.1, h, d],
    [x1 - 0.05, h / 2, (z0 + z1) / 2, 0.1, h, d],
    [(x0 + LAB_OPEN.x0) / 2, h / 2, z1 - 0.05, LAB_OPEN.x0 - x0, h, 0.1],
    [(LAB_OPEN.x1 + x1) / 2, h / 2, z1 - 0.05, x1 - LAB_OPEN.x1, h, 0.1],
    [(LAB_OPEN.x0 + LAB_OPEN.x1) / 2, (3 + h) / 2, z1 - 0.05, LAB_OPEN.x1 - LAB_OPEN.x0, h - 3, 0.1],
  ];
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, 0.001, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={floor}><planeGeometry args={[w, d]} /></mesh>
      <mesh position={[(x0 + x1) / 2, h, (z0 + z1) / 2]} rotation={[Math.PI / 2, 0, 0]} material={ceil}><planeGeometry args={[w, d]} /></mesh>
      {segs.map((s, i) => <mesh key={i} position={[s[0], s[1], s[2]]} geometry={tbox(s[3], s[4], s[5], 2)} material={wall} />)}
      {/* hazard stripe around opening */}
      <mesh position={[(LAB_OPEN.x0 + LAB_OPEN.x1) / 2, 3.05, z1 - 0.12]}><boxGeometry args={[LAB_OPEN.x1 - LAB_OPEN.x0 + 0.3, 0.12, 0.05]} /><meshLambertMaterial color="#e8c547" /></mesh>
      {[LAB_OPEN.x0 - 0.1, LAB_OPEN.x1 + 0.1].map((x) => <mesh key={x} position={[x, 1.5, z1 - 0.12]}><boxGeometry args={[0.15, 3, 0.05]} /><meshLambertMaterial color="#e8c547" /></mesh>)}
      {/* ceiling lights */}
      {[-8, -2, 4, 9].map((x) => [-15, -9, -3].map((z) => (
        <mesh key={x + "," + z} position={[x, h - 0.01, z]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[2, 0.4]} /><meshBasicMaterial color="#f4f8ff" /></mesh>
      )))}
      <pointLight position={[-4, 3.2, -9]} intensity={14} distance={22} decay={1} color="#f2f6ff" />
      <pointLight position={[8, 3.2, -9]} intensity={14} distance={22} decay={1} color="#f2f6ff" />
      <pointLight position={[2, 3.2, -15]} intensity={8} distance={14} decay={1} color="#eef" />
      {/* pipes along ceiling */}
      {[-17.5, -0.6].map((z) => <mesh key={z} position={[0, 3.55, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.08, 0.08, 23.6, 8]} /><meshLambertMaterial map={metalTex("#6a6d68")} /></mesh>)}

    </group>
  );
}

function Extractor() {
  const extracting = useRef(false);
  const quota = useGame((s) => s.quota);
  const tex = useMemo(() => screenTex(["QUOTA", `$${quota.progress} / $${quota.target}`, quota.completed ? "✔ FULFILLED" : "DEPOSIT SCRAP"], quota.completed ? "#7dff8a" : "#e8c547"), [quota]);
  useEffect(() => () => tex.dispose(), [tex]);
  useStation("extractor", [9.4, 1.2, -5], () => {
    const h = held();
    return h && ITEMS[h.id].scrap ? `[E] Insert ${ITEMS[h.id].name} → $${Math.round(ITEMS[h.id].value * payoutMult(game.get().save))}` : "[E] Extractor · view quota";
  }, async () => {
    const h = held();
    if (h && ITEMS[h.id].scrap) {
      if (extracting.current) return;
      extracting.current = true;
      const index = heldIndex();
      const val = Math.round(ITEMS[h.id].value * payoutMult(game.get().save));
      const was = game.get().quota.completed;
      // optimistic: remove + pay instantly, refund the item if the server rejects
      const removed = removeAt(index); sfx.cash();
      game.setSave((s) => ({ money: s.money + val, contribDay: todayStr() }));
      extracting.current = false;
      const d = await deposit(val);
      if (!d) { game.setSave((s) => ({ money: Math.max(0, s.money - val) })); if (removed) addItem(removed.id, removed); return; }
      addXp(extractionXp(ITEMS[h.id].slots));
      if (d.completed && !was) onQuotaComplete();
    } else game.set({ panel: "extractor" });
  });
  const m = lam("extr", () => ({ map: metalTex("#4f5a52") }));
  return (
    <group position={[10.8, 0, -5]}>
      <mesh position={[0, 1.3, 0]} geometry={tbox(2.4, 2.6, 2.8, 1)} material={m} />
      <mesh position={[0, .12, 0]}><boxGeometry args={[2.5, .24, 2.9]} /><meshStandardMaterial map={metalTex("#303b36")} metalness={.6} roughness={.6} /></mesh>
      {[-1, 1].map(side => <group key={side}>
        <mesh position={[side * 1.05, 1.3, -1.42]}><boxGeometry args={[.13, 2.3, .08]} /><meshStandardMaterial map={metalTex("#9ba698")} metalness={.65} /></mesh>
        {[.4, .8, 1.2, 1.6].map(y => <mesh key={y} position={[side * 1.205, y, .7]}><boxGeometry args={[.025, .035, .85]} /><meshLambertMaterial color="#222b26" /></mesh>)}
      </group>)}
      {[-.9, .9].map(z => [ .35, 2.35].map(y => <mesh key={z+","+y} position={[-1.215, y, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.035, .035, .03, 8]} /><meshStandardMaterial color="#b9bfac" metalness={.8} /></mesh>))}
      <mesh position={[-1.3, .75, 0]}><boxGeometry args={[.4, .07, 1.25]} /><meshStandardMaterial color="#8e9682" metalness={.7} /></mesh>
      <mesh position={[-1.25, 1.1, 0]}><boxGeometry args={[0.2, 0.6, 1]} /><meshLambertMaterial color="#111" /></mesh>
      <mesh position={[-1.3, 1.45, 0]}><boxGeometry args={[0.25, 0.08, 1.2]} /><meshLambertMaterial color="#e8c547" /></mesh>
      <mesh position={[-1.285, 2.1, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[1.8, 0.9]} /><meshBasicMaterial map={tex} /></mesh>
      <mesh position={[-1.23, 2.1, 0]}><boxGeometry args={[.08, 1.03, 1.96]} /><meshLambertMaterial color="#1d2824" /></mesh>
      <mesh position={[-1.3, 1.05, .76]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.08, .08, .1, 12]} /><meshBasicMaterial color={quota.completed ? "#7dff8a" : "#dc6649"} /></mesh>
      <mesh position={[0, 2.9, 0]}><cylinderGeometry args={[0.3, 0.5, 0.6, 8]} /><meshLambertMaterial color="#3a3f3a" /></mesh>
      <pointLight position={[-1.6, 1.4, 0]} intensity={2} distance={4} color={quota.completed ? "#7dff8a" : "#e8c547"} />
    </group>
  );
}

function TreeStation() {
  useStation("tree", [2, 1.3, -13.6], () => "[E] The Tree · skills", () => game.set({ panel: "tree" }));
  const branches = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ y: 1.0 + i * 0.13, r: i * 2.1, l: 0.6 - i * 0.04 })), []);
  return (
    <group position={[2, 0, -15]}>
      <mesh position={[0, 0.15, 0]}><cylinderGeometry args={[1, 1.05, 0.3, 14]} /><meshLambertMaterial color="#3a3a36" /></mesh>
      {[0,1,2].map(i => <mesh key={i} position={[0, .08+i*.05, 0]}><torusGeometry args={[.85, .035, 6, 24]} /><meshStandardMaterial color="#8e9d8f" metalness={.7} /></mesh>)}
      {[-1,1].map(x => [-1,1].map(z => <mesh key={x+","+z} position={[x*.64, 1.4, z*.64]}><cylinderGeometry args={[.035,.035,2.3,8]} /><meshStandardMaterial color="#8f9b8c" metalness={.7} /></mesh>))}
      <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.1, 0.16, 1.4, 6]} /><meshLambertMaterial color="#4a3020" /></mesh>
      {branches.map((b, i) => (
        <mesh key={i} position={[Math.sin(b.r) * b.l / 2, b.y + 0.2, Math.cos(b.r) * b.l / 2]} rotation={[Math.cos(b.r) * 0.9, 0, -Math.sin(b.r) * 0.9]}>
          <cylinderGeometry args={[0.02, 0.05, b.l, 4]} /><meshLambertMaterial color="#4a3020" />
        </mesh>
      ))}
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={"o" + i} position={[Math.sin(i * 2.1) * 0.45, 1.35 + (i % 3) * 0.2, Math.cos(i * 2.1) * 0.45]}><sphereGeometry args={[0.04, 6, 4]} /><meshBasicMaterial color="#e8c547" /></mesh>
      ))}
      <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.95, 0.95, 2.2, 16, 1, true]} /><meshPhongMaterial color="#cfe" transparent opacity={0.15} side={THREE.DoubleSide} shininess={100} /></mesh>
      <mesh position={[0, 2.55, 0]}><cylinderGeometry args={[1, 1, 0.12, 14]} /><meshLambertMaterial color="#3a3a36" /></mesh>
      <mesh position={[0,.38,1.025]}><boxGeometry args={[.88,.32,.08]} /><meshStandardMaterial color="#253b32" metalness={.6} /></mesh>
      <mesh position={[0,.38,1.072]}><planeGeometry args={[.78,.23]} /><meshBasicMaterial map={screenTex(["THE TREE", "SKILL ARRAY"], "#b9f2bc")} /></mesh>
      <pointLight position={[0, 1.6, 0]} intensity={2} distance={4} color="#e8c547" />
    </group>
  );
}

function Shop() {
  useStation("shop", [-6, 1.3, -16.3], () => "[E] Shop", () => game.set({ panel: "shop" }));
  const supplies = ["health", "flashcharge", "adrenaline", "navigator", "axe", "pistol"];
  const steel = lam("vending-steel", () => ({ map: metalTex("#738479") }));
  return <group position={[-6, 0, -17.4]}>
    <mesh position={[0, 1.4, -.48]} geometry={tbox(4, 2.8, .22, 1)} material={steel} />
    {[-1.9, 1.9].map(x => <mesh key={x} position={[x, 1.4, 0]}><boxGeometry args={[.2, 2.8, 1.2]} /><meshStandardMaterial map={metalTex("#738479")} metalness={.65} roughness={.55} /></mesh>)}
    <mesh position={[0, 2.7, 0]} material={steel}><boxGeometry args={[4, .2, 1.2]} /></mesh>
    <mesh position={[0, .28, 0]} material={steel}><boxGeometry args={[4, .56, 1.2]} /></mesh>
    <mesh position={[-.28, .3, .615]}><boxGeometry args={[2.5, .24, .03]} /><meshLambertMaterial color="#19251f" /></mesh>
    <mesh position={[1.45, 1.5, .1]} material={steel}><boxGeometry args={[.7, 2.25, 1]} /></mesh>
    {[.72, 1.48].map(y => <mesh key={y} position={[-.4, y, -.05]}><boxGeometry args={[2.8, .045, .94]} /><meshStandardMaterial color="#b5bca3" metalness={.7} /></mesh>)}
    {supplies.map((id, i) => <group key={id} position={[-1.35+(i%3)*.92, .98+Math.floor(i/3)*.76, .08]}>
      <mesh position={[0, 0, -.33]}><boxGeometry args={[.6, .42, .16]} /><meshLambertMaterial color="#39483d" /></mesh>
      <mesh position={[0, 0, .025]}><planeGeometry args={[.54, .5]} /><meshBasicMaterial map={imageTex(ITEMS[id].img)} transparent alphaTest={.3} /></mesh>
      <mesh position={[0, -.25, .35]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.16,.018,6,16]} /><meshStandardMaterial color="#9aa592" metalness={.8} /></mesh>
    </group>)}
    <mesh position={[1.45, 2.16, .625]}><planeGeometry args={[.43,.24]} /><meshBasicMaterial map={screenTex(["SUPPLY", "ONLINE"], "#8ae2ac")} /></mesh>
    {Array.from({length: 6},(_,i) => <mesh key={i} position={[1.35+(i%2)*.2,1.8-Math.floor(i/2)*.16,.63]}><cylinderGeometry args={[.045,.045,.03,12]} /><meshStandardMaterial color="#b6c5aa" metalness={.6} /></mesh>)}
    <mesh position={[1.45, 1.03, .63]}><boxGeometry args={[.35, .035, .03]} /><meshLambertMaterial color="#17231c" /></mesh>
    {[-1.75,1.75].map(x => <mesh key={x} position={[x,.07,0]}><boxGeometry args={[.24,.14,.8]} /><meshLambertMaterial color="#28342d" /></mesh>)}
    <mesh position={[-.35,2.57,.15]}><boxGeometry args={[2.7,.035,.8]} /><meshBasicMaterial color="#e2edd0" /></mesh>
    <pointLight position={[-.4,2.35,.15]} intensity={2} distance={4} color="#c8edb7" />
  </group>;
}

function Foundation() {
  const newE = useGame((s) => s.newEntity);
  useStation("found", [-10.6, 1, -5], () => (newE ? "[E] Entity Foundation · NEW ENTRY" : "[E] Entity Foundation"), () => game.set({ panel: "foundation", newEntity: null }));
  const tex = useMemo(() => screenTex(["ENTITY", "FOUNDATION", newE ? "! NEW DATA !" : "ARCHIVE"], newE ? "#ff5a4a" : "#9fd"), [newE]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <group position={[-11.4, 0, -5]}>
      <mesh position={[0, 0.6, 0]}><boxGeometry args={[1, 1.2, 1.8]} /><meshLambertMaterial map={metalTex("#555a55")} /></mesh>
      {[-.65,.65].map(z => <mesh key={z} position={[0,.5,z]}><boxGeometry args={[1.02,.02,.02]} /><meshLambertMaterial color="#1a2420" /></mesh>)}
       <mesh position={[.15,1.28,0]} rotation={[0,0,-.12]}><boxGeometry args={[.54,.08,1.6]} /><meshStandardMaterial map={metalTex("#8d9c8e")} metalness={.5} /></mesh>
      <mesh position={[.1,1.74,0]}><boxGeometry args={[.34,1,1.8]} /><meshLambertMaterial color="#303e35" /></mesh>
      <mesh position={[.36,1.1,0]} rotation={[0,0,-.15]}><boxGeometry args={[.32,.06,1.2]} /><meshStandardMaterial color="#a2aa91" metalness={.5} /></mesh>
      {Array.from({length:8},(_,i)=><mesh key={i} position={[.1,.72+i*.045,.91]}><boxGeometry args={[.6,.015,.02]} /><meshLambertMaterial color="#1c271f" /></mesh>)}
      {[-.83,.83].map(z => <mesh key={z} position={[.3,1.78,z]}><boxGeometry args={[.06,.95,.07]} /><meshStandardMaterial color="#8d9b8b" metalness={.7} /></mesh>)}
      {Array.from({length:12},(_,i) => <mesh key={i} position={[.4,1.075,-.49+(i%6)*.19]} rotation={[0,0,-.15]}><boxGeometry args={[.08,.015,.12]} /><meshStandardMaterial color={i<6 ? "#8d9b8b" : "#323e35"} /></mesh>)}
      <mesh position={[.525,.8,.52]}><sphereGeometry args={[.035,8,6]} /><meshBasicMaterial color="#91e4af" /></mesh>
      <mesh position={[0.285, 1.78, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[1.52, 0.72]} /><meshBasicMaterial map={tex} /></mesh>
    </group>
  );
}

function RoomsDoor() {
  useStation("roomsdoor", [11.1, 1.1, -12], () => "[E] Rooms Hall · open the door", () => { sfx.door(); game.set({ panel: "rooms" }); });
  return (
    <group position={[11.85, 0, -12]}>
      <mesh position={[0, 1.1, 0]}><boxGeometry args={[0.08, 2.2, 1.4]} /><meshLambertMaterial color="#6a4a2a" /></mesh>
      <mesh position={[-.052,1.75,0]} rotation={[0,-Math.PI/2,0]}><planeGeometry args={[.92,.3]} /><meshBasicMaterial map={screenTex(["ROOMS HALL"], "#e5e1bd")} /></mesh>
      {[.45,1.12].map(y => <mesh key={y} position={[-.055,y,0]}><boxGeometry args={[.025,.48,1.1]} /><meshStandardMaterial map={metalTex("#5a6456")} roughness={.85} /></mesh>)}
      <mesh position={[-0.06, 1.05, -0.5]}><sphereGeometry args={[0.04, 6, 4]} /><meshLambertMaterial color="#b08a40" /></mesh>
      {[-.65,.65].map(z => <mesh key={z} position={[-.04,1.15,z]}><boxGeometry args={[.12,2.35,.09]} /><meshStandardMaterial map={metalTex("#687465")} metalness={.4} /></mesh>)}
      <mesh position={[-.04,2.3,0]}><boxGeometry args={[.12,.1,1.4]} /><meshStandardMaterial map={metalTex("#687465")} /></mesh>
    </group>
  );
}

function Mirror() {
  const save = useGame((s) => s.save);
  const body = useRef<THREE.Group>(null);
  const mirror = useMemo(() => {
    const m = new Reflector(new THREE.PlaneGeometry(3, 2.4), { textureWidth: 512, textureHeight: 410, color: 0x9a9a92, clipBias: 0.003 });
    m.position.set(LAB.x0 + 0.12, 1.4, -11); m.rotation.y = Math.PI / 2;
    const orig = m.onBeforeRender.bind(m);
    m.onBeforeRender = (...a: Parameters<typeof orig>) => {
      const hidden: THREE.Object3D[] = [];
      rt.camera?.children.forEach(o => { if ((o instanceof THREE.Sprite || o instanceof THREE.Group) && o.visible) { hidden.push(o); o.visible=false; } });
      if(body.current)body.current.visible=true;
      try { orig(...a); } finally { if(body.current)body.current.visible=false;hidden.forEach(o=>{o.visible=true;}); }
    };
    return m;
  }, []);
  useEffect(() => () => { mirror.dispose(); }, [mirror]);
  useStation("mirror", [LAB.x0 + 1, 1.4, -11], () => "[E] Mirror", () => game.set({ panel: "mirror" }));
  useFrame(() => { if (body.current) { body.current.position.set(rt.pos.x, rt.pos.y, rt.pos.z); body.current.rotation.y = rt.yaw + Math.PI; } });
  const h = held();
  return (
    <>
      <primitive object={mirror} />
      <pointLight position={[LAB.x0 + 2.2, 2.4, -11]} intensity={6} distance={6} decay={1.2} color="#fff4dc" />
      <mesh position={[LAB.x0 + .2, 2.85, -11]}><boxGeometry args={[.12, .06, 1.6]} /><meshBasicMaterial color="#fff6dc" /></mesh>
      <mesh position={[LAB.x0 + 0.08, 1.4, -11]}><boxGeometry args={[0.05, 2.6, 3.2]} /><meshStandardMaterial map={metalTex("#8e9987")} metalness={.7} /></mesh>
      {[-12.55,-9.45].map(z=><mesh key={z} position={[LAB.x0+.15,1.4,z]}><boxGeometry args={[.08,2.65,.07]} /><meshStandardMaterial color="#afb8a2" metalness={.8} /></mesh>)}
      <group ref={body} visible={false}><Character outfit={save.outfit} avatar={save.avatar} held={h && h.id !== "__big" ? h.id : undefined} moving={() => rt.moving} /></group>
    </>
  );
}

export function Lab() {
  const inRoom = useGame((s) => s.inRoom);
  if (inRoom) return null;
  return (
    <group>
      <Shell />
      <Extractor />
      <TreeStation />
      <Shop />
      <Foundation />
      <Leaderboard />
      <RoomsDoor />
      <Mirror />
    </group>
  );
}

/** Personal / visited room */
export function PersonalRoom({ ownerRoom, ownerIdx, ghost, own, ownerId, themeIndex }: { ownerRoom: Placed[]; ownerIdx: number; ghost: React.ReactNode; own: boolean; ownerId: string; themeIndex?: number }) {
  const theme = PERSONAL_THEMES[(themeIndex ?? ownerIdx) % PERSONAL_THEMES.length];
  const wp = theme.wall;
  const wall = lam("pw" + wp, () => ({ map: wallTex(wp) }));
  const floor = lam("pf" + theme.floor, () => ({ map: floorTex(theme.floor) }));
  const ceil = lam("pc"+theme.wall, () => ({ map: wallTex(theme.wall) }));
  const { x0, x1, z0, z1, h } = PROOM;
  const exitPos = useMemo(() => new THREE.Vector3((x0 + x1) / 2, 1.1, z1 - 0.2), []);
  useEffect(() => register({
    id: "pexit", pos: exitPos, range: 2, label: () => "[E] Leave room",
    onE: () => { sfx.door(); rt.pos.set(ROOMS_RETURN.x, 0, ROOMS_RETURN.z); rt.yaw = Math.PI / 2; game.set({ inRoom: null, decorMode: false, inLab: true }); },
  }), [exitPos]);
  const [, f] = useState(0);
  useEffect(() => { const t = setInterval(() => f((n) => n + 1), 500); return () => clearInterval(t); }, []);
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, 0, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={floor}><planeGeometry args={[10, 10]} /></mesh>
      <mesh position={[(x0 + x1) / 2, h, (z0 + z1) / 2]} rotation={[Math.PI / 2, 0, 0]} material={ceil}><planeGeometry args={[10, 10]} /></mesh>
      {[[505, z0 + 0.05, 10, 0.1], [505, z1 - 0.05, 10, 0.1], [x0 + 0.05, 505, 0.1, 10], [x1 - 0.05, 505, 0.1, 10]].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, h / 2, z]} geometry={tbox(w, h, d, 1.6)} material={wall} />
      ))}
      <group position={[505,0,z1-.14]}>
        <mesh position={[0,1.1,0]}><boxGeometry args={[1.25,2.2,.08]}/><meshStandardMaterial map={wallTex("wood")} roughness={.8}/></mesh>
        {[-.68,.68].map(x=><mesh key={x} position={[x,1.14,-.04]}><boxGeometry args={[.1,2.35,.15]}/><meshStandardMaterial map={metalTex("#77796b")}/></mesh>)}
        <mesh position={[0,2.3,-.04]}><boxGeometry args={[1.46,.12,.15]}/><meshStandardMaterial map={metalTex("#77796b")}/></mesh>
        {[.5,1.4].map(y=><mesh key={y} position={[0,y,-.055]}><boxGeometry args={[1,.65,.04]}/><meshStandardMaterial map={wallTex("panel")}/></mesh>)}
        <mesh position={[-.44,1.05,-.11]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.025,.025,.12,12]}/><meshStandardMaterial color="#b5a67b" metalness={.8}/></mesh>
        <mesh position={[-.35,1.05,-.17]}><boxGeometry args={[.2,.035,.045]}/><meshStandardMaterial color="#b5a67b" metalness={.8}/></mesh>
      </group>
      <mesh position={[505, h - 0.01, 505]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[1.2, 0.6]} /><meshBasicMaterial color="#fff2c0" /></mesh>
      <pointLight position={[505, h - 0.4, 505]} intensity={10} distance={14} decay={1} color="#fff2c0" />
      {ownerRoom.filter((p) => p.id !== "doghouse").map((p, i) => <PlacedDecor key={p.key ?? i} p={p} own={own} ownerId={ownerId} />)}
      {ghost}
    </group>
  );
}
