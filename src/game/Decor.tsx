import { AlphaDecor } from "./AlphaDecor";
import { ITEMS } from "./data";
import paintingArt from "@/assets/backrooms-painting.jpg";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { fabricTex, woodTex, imageTex, metalTex } from "./textures";
import { rt, register } from "./runtime";
import { game, type Placed } from "./store";
import { sleepInBed } from "./room-actions";

function crtBackroomTex() {
  const c = document.createElement("canvas"); c.width = 128; c.height = 96;
  const g = c.getContext("2d")!;
  g.fillStyle = "#2a2508"; g.fillRect(0, 0, 128, 96);
  g.fillStyle = "#8a7a2a"; g.beginPath(); g.moveTo(0, 0); g.lineTo(48, 32); g.lineTo(48, 64); g.lineTo(0, 96); g.fill();
  g.beginPath(); g.moveTo(128, 0); g.lineTo(80, 32); g.lineTo(80, 64); g.lineTo(128, 96); g.fill();
  g.fillStyle = "#5a5020"; g.beginPath(); g.moveTo(0, 96); g.lineTo(48, 64); g.lineTo(80, 64); g.lineTo(128, 96); g.fill();
  g.fillStyle = "#b8a868"; g.beginPath(); g.moveTo(0, 0); g.lineTo(48, 32); g.lineTo(80, 32); g.lineTo(128, 0); g.fill();
  g.fillStyle = "#fff8c0"; g.fillRect(56, 8, 16, 4); g.fillRect(60, 22, 8, 2);
  g.fillStyle = "#1a1604"; g.fillRect(48, 32, 32, 32);
  for (let y = 0; y < 96; y += 2) { g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, y, 128, 1); }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
}
let crtTex: THREE.Texture | null = null;

/* ---------- Fish Tank ---------- */
function Fish({ color, mode }: { color: string; mode: 0 | 1 }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return; const t = clock.elapsedTime;
    if (mode === 0) { ref.current.position.set(Math.sin(t * 0.7) * 0.6, 1.25 + Math.sin(t * 1.3) * 0.06, Math.cos(t * 0.7) * 0.18); ref.current.rotation.y = -t * 0.7 + Math.PI; }
    else { const k = (t * 0.35) % 2, dir = k < 1 ? 1 : -1, x = k < 1 ? -0.6 + k * 1.2 : 0.6 - (k - 1) * 1.2; ref.current.position.set(x, 1.05 + Math.sin(t * 3) * 0.12, 0.1); ref.current.rotation.y = dir > 0 ? 0 : Math.PI; }
    ref.current.children[1].rotation.y = Math.sin(t * 12) * 0.5;
  });
  return <group ref={ref}>
    <mesh scale={mode ? [0.12, 0.09, 0.04] : [0.1, 0.05, 0.035]}><sphereGeometry args={[1, 8, 6]} /><meshPhongMaterial color={color} shininess={60} /></mesh>
    <mesh position={[-0.11, 0, 0]} rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[0.05, 0.08, 4]} /><meshLambertMaterial color={color} /></mesh>
  </group>;
}
function FishTank({ ghost }: { ghost?: boolean }) {
  const wood = useMemo(() => woodTex(), []);
  return <>
    <mesh position={[0, 0.39, 0]}><boxGeometry args={[1.8, 0.06, 0.85]} /><meshLambertMaterial map={wood} /></mesh>
    {[[-0.85, -0.38], [0.85, -0.38], [-0.85, 0.38], [0.85, 0.38]].map(([x, z], i) => <mesh key={i} position={[x, 0.18, z]}><boxGeometry args={[0.07, 0.36, 0.07]} /><meshLambertMaterial map={wood} /></mesh>)}
    <mesh position={[0, 0.12, 0]}><boxGeometry args={[1.7, 0.03, 0.75]} /><meshLambertMaterial map={wood} /></mesh>
    {/* gravel, grass hills */}
    <mesh position={[0, 0.47, 0]}><boxGeometry args={[1.66, 0.1, 0.72]} /><meshLambertMaterial color="#6b5a3a" /></mesh>
    <mesh position={[-0.45, 0.52, -0.1]} scale={[0.5, 0.18, 0.3]}><sphereGeometry args={[1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshLambertMaterial color="#3d6a2a" /></mesh>
    <mesh position={[0.5, 0.52, 0.05]} scale={[0.35, 0.13, 0.25]}><sphereGeometry args={[1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshLambertMaterial color="#4a7a32" /></mesh>
    {Array.from({ length: 14 }, (_, i) => <mesh key={i} position={[-0.75 + i * 0.11, 0.62, -0.25 + ((i * 37) % 5) * 0.1]}><coneGeometry args={[0.02, 0.22 + (i % 3) * 0.08, 3]} /><meshLambertMaterial color={i % 2 ? "#3f8a3a" : "#2f6a2a"} /></mesh>)}
    {/* dimensional doorway with a backroom beyond */}
    <group position={[0.05, 0.53, -0.25]}>
      <mesh position={[0, 0.2, 0]}><boxGeometry args={[0.26, 0.4, 0.04]} /><meshLambertMaterial color="#2a2418" /></mesh>
      <mesh position={[0, 0.19, 0.022]}><planeGeometry args={[0.2, 0.34]} /><meshBasicMaterial map={crtTex ??= crtBackroomTex()} /></mesh>
      <pointLight position={[0, 0.2, 0.08]} intensity={0.6} distance={0.8} color="#ffe98a" />
    </group>
    <Fish color="#e8742a" mode={0} />
    <Fish color="#8ab8d8" mode={1} />
    {/* glass + water */}
    <mesh position={[0, 0.98, 0]}><boxGeometry args={[1.7, 0.95, 0.75]} /><meshPhongMaterial color="#6ab0c0" transparent opacity={ghost ? 0.2 : 0.22} shininess={90} depthWrite={false} /></mesh>
    <mesh position={[0, 1.48, 0]}><boxGeometry args={[1.74, 0.05, 0.79]} /><meshLambertMaterial color="#1a1a1a" /></mesh>
    <pointLight position={[0, 1.4, 0]} intensity={0.8} distance={2.5} color="#a8e0ff" />
  </>;
}

/* ---------- Stalk Device: live view through Uncanny's eyes ---------- */
function StalkScreen() {
  const { gl, scene } = useThree();
  const target = useMemo(() => new THREE.WebGLRenderTarget(160, 120, { magFilter: THREE.NearestFilter }), []);
  const cam = useMemo(() => new THREE.PerspectiveCamera(80, 4 / 3, 0.05, 40), []);
  const screen = useRef<THREE.Mesh>(null);
  const frame = useRef(0);
  useEffect(() => () => target.dispose(), [target]);
  useFrame(() => {
    if (!screen.current || ++frame.current % 3) return;
    const v = rt.uncannyView;
    const sp = new THREE.Vector3(); screen.current.getWorldPosition(sp);
    if (!rt.camera || sp.distanceTo(rt.camera.position) > 9) return;
    cam.position.set(v.x, 1.7, v.z); cam.rotation.set(0, v.yaw + Math.PI, 0, "YXZ");
    screen.current.visible = false;
    const prev = gl.getRenderTarget(); gl.setRenderTarget(target); gl.render(scene, cam); gl.setRenderTarget(prev);
    screen.current.visible = true;
  });
  return <mesh ref={screen} position={[0, 0.02, 0.231]}><planeGeometry args={[0.56, 0.42]} /><meshBasicMaterial map={target.texture} /></mesh>;
}

export function DecorMesh({ id, x, z, r, y = 0, ghost, artwork, lightsOff }: { id: string; x: number; z: number; r: number; y?: number; ghost?: boolean; artwork?: string;lightsOff?:boolean }) {
  const mat = (c: string) => <meshLambertMaterial color={c} transparent={ghost} opacity={ghost ? 0.5 : 1} />;
  const balloon = useRef<THREE.Group>(null);
  const off = useRef(new THREE.Vector3());
  useFrame((_, dt) => {
    if (!balloon.current) return;
    const target = new THREE.Vector3(-rt.vel.x * 0.06, 0, -rt.vel.z * 0.06);
    const d = Math.hypot(rt.pos.x - x, rt.pos.z - z);
    if (d > 3) target.set(0, 0, 0);
    off.current.lerp(target, 1 - Math.exp(-3 * dt));
    balloon.current.position.set(off.current.x, Math.sin(performance.now() / 600) * 0.05, off.current.z);
    balloon.current.rotation.z = off.current.x * 0.8;
  });
  const wood = useMemo(() => woodTex(), []);
  const metal = useMemo(() => metalTex("#7a7a6a"), []);
  const inner = (() => {
    switch (id) {
      case "bed": return (<>
        <mesh position={[0, 0.2, 0]}><boxGeometry args={[2, 0.2, 1.2]} /><meshLambertMaterial map={wood} /></mesh>
        <mesh position={[0, 0.38, 0]}><boxGeometry args={[1.9, 0.18, 1.1]} /><meshLambertMaterial map={fabricTex("#e8e2cc")} /></mesh>
        <mesh position={[0.2, 0.48, 0]}><boxGeometry args={[1.4, 0.05, 1.12]} /><meshLambertMaterial map={fabricTex("#7a2f26")} /></mesh>
        <mesh position={[-0.75, 0.52, 0]}><boxGeometry args={[0.35, 0.1, 0.8]} />{mat("#f0ead8")}</mesh>
        <mesh position={[-1, 0.55, 0]}><boxGeometry args={[0.06, 1.1, 1.2]} /><meshLambertMaterial map={wood} /></mesh>
      </>);
      case "holyicon": return (<>
        <mesh position={[0, 1.4, 0]}><boxGeometry args={[0.8, 1.1, 0.06]} />{mat("#b08a30")}</mesh>
        <mesh position={[0, 1.4, 0.035]}><planeGeometry args={[0.7, 1]} /><meshBasicMaterial map={imageTex("/items/bigicon.png")} transparent alphaTest={0.3} /></mesh>
        <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.03, 0.03, 0.9, 6]} />{mat("#3a2a18")}</mesh>
        <mesh position={[0, 0.85, 0.1]}><cylinderGeometry args={[0.03, 0.03, 0.1, 6]} /><meshBasicMaterial color="#ffd27a" /></mesh>
        <pointLight position={[0, 0.95, 0.15]} intensity={0.8} distance={2} color="#ffb04a" />
      </>);
      case "vcrtv": return (<>
        <mesh position={[0, 0.25, 0]}><boxGeometry args={[0.9, 0.5, 0.6]} /><meshLambertMaterial map={wood} /></mesh>
        <mesh position={[0, 0.82, 0]}><boxGeometry args={[0.8, 0.65, 0.6]} />{mat("#3a3228")}</mesh>
        <mesh position={[-0.05, 0.84, 0.301]}><planeGeometry args={[0.6, 0.48]} /><meshBasicMaterial map={crtTex ??= crtBackroomTex()} /></mesh>
        <mesh position={[0.33, 0.8, 0.31]}><cylinderGeometry args={[0.03, 0.03, 0.02, 8]} />{mat("#999")}</mesh>
      </>);
      case "balloon": return (
        <group ref={balloon}>
          <mesh position={[0, 1.7, 0]} scale={[1, 1.2, 1]}><sphereGeometry args={[0.25, 12, 10]} /><meshPhongMaterial color="#c42020" shininess={80} transparent={ghost} opacity={ghost ? 0.5 : 1} /></mesh>
          <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.004, 0.004, 1.4, 3]} />{mat("#ddd")}</mesh>
          <mesh position={[0, 0.03, 0]}><boxGeometry args={[0.1, 0.06, 0.1]} />{mat("#444")}</mesh>
        </group>
      );
      case "fishtank": return <FishTank ghost={ghost} />;
      case "painting": return (<>
        <mesh position={[0, 0.475, 0]}><boxGeometry args={[1.3, 0.95, 0.08]} />{mat("#6a4a20")}</mesh>
        <mesh position={[0, 0.475, 0.045]}><planeGeometry args={[1.12, 0.78]} /><meshBasicMaterial map={imageTex(paintingArt)} /></mesh>
      </>);
      case "cross": return (<>
        <mesh position={[0, 0.31, 0]}><boxGeometry args={[0.09, 0.62, 0.05]} />{mat("#5a3a1e")}</mesh>
        <mesh position={[0, 0.42, 0]}><boxGeometry args={[0.36, 0.08, 0.05]} />{mat("#5a3a1e")}</mesh>
        {[[0, 0.62], [0, 0.01], [-0.18, 0.42], [0.18, 0.42]].map(([px, py], i) => <mesh key={i} position={[px, py, 0]}><boxGeometry args={[0.12, 0.05, 0.06]} />{mat("#7a5428")}</mesh>)}
        <mesh position={[0, 0.36, 0.035]}><boxGeometry args={[0.03, 0.2, 0.02]} />{mat("#c8a050")}</mesh>
        <mesh position={[0, 0.42, 0.035]}><boxGeometry args={[0.16, 0.025, 0.02]} />{mat("#c8a050")}</mesh>
        <mesh position={[0, 0.5, 0.04]}><sphereGeometry args={[0.022, 6, 4]} />{mat("#c8a050")}</mesh>
      </>);
      case "storagebox": return (<>
        <mesh position={[0, 0.33, 0]}><boxGeometry args={[1.2, 0.62, 0.7]} /><meshLambertMaterial map={wood} /></mesh>
        <mesh position={[0, 0.68, 0]}><boxGeometry args={[1.24, 0.1, 0.74]} /><meshLambertMaterial map={wood} /></mesh>
        {[-0.45, 0, 0.45].map((bx) => <mesh key={bx} position={[bx, 0.36, 0]}><boxGeometry args={[0.08, 0.72, 0.72]} /><meshLambertMaterial map={metal} /></mesh>)}
        <mesh position={[0, 0.55, 0.36]}><boxGeometry args={[0.12, 0.16, 0.03]} /><meshLambertMaterial color="#9a9070" /></mesh>
        {[-0.62, 0.62].map((hx) => <mesh key={hx} position={[hx, 0.45, 0]}><boxGeometry args={[0.03, 0.08, 0.22]} />{mat("#333")}</mesh>)}
      </>);
      case "plant": return (<>
        <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.3, 0.22, 0.5, 12]} />{mat("#7a4a2a")}</mesh>
        <mesh position={[0, 0.51, 0]}><cylinderGeometry args={[0.32, 0.32, 0.04, 12]} />{mat("#5a3a20")}</mesh>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.27, 0.27, 0.03, 10]} />{mat("#3a2a18")}</mesh>
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2, h = 0.9 + (i % 4) * 0.22, tilt = 0.35 + (i % 3) * 0.18;
          return <group key={i} position={[0, 0.5, 0]} rotation={[0, a, 0]}>
            <mesh position={[0.12, h / 2, 0]} rotation={[0, 0, -tilt * 0.5]}><cylinderGeometry args={[0.012, 0.016, h, 4]} />{mat("#3a6a28")}</mesh>
            <mesh position={[0.12 + Math.sin(tilt) * h * 0.55, h * 0.95, 0]} rotation={[0, 0, -tilt - 0.6]} scale={[0.11, 0.32, 0.02]}><sphereGeometry args={[1, 8, 6]} />{mat(i % 2 ? "#2f7a2a" : "#3d8a30")}</mesh>
          </group>;
        })}
      </>);
      case "custompaint": return (<>
        <mesh position={[0, 0.55, 0]}><boxGeometry args={[1.4, 1.1, 0.08]} />{mat("#a8822a")}</mesh>
        <mesh position={[0, 0.55, 0.042]}><boxGeometry args={[1.28, 0.98, 0.01]} />{mat("#7a5a1a")}</mesh>
        <mesh position={[0, 0.55, 0.05]}><planeGeometry args={[1.18, 0.88]} />{artwork ? <meshBasicMaterial map={imageTex(artwork)} /> : mat("#e8e2d0")}</mesh>
      </>);
      case "stalkdevice": return (<>
        <mesh position={[0, 0.02, -0.2]}><boxGeometry args={[0.3, 0.4, 0.04]} /><meshLambertMaterial map={metal} /></mesh>
        <mesh position={[0, 0.02, -0.1]}><boxGeometry args={[0.08, 0.08, 0.2]} /><meshLambertMaterial map={metal} /></mesh>
        <mesh position={[0, 0.02, 0.05]}><boxGeometry args={[0.8, 0.62, 0.36]} /><meshLambertMaterial map={metal} /></mesh>
        <mesh position={[-0.33, -0.22, 0.235]}><cylinderGeometry args={[0.025, 0.025, 0.02, 8]} />{mat("#222")}</mesh>
        <mesh position={[0.33, -0.22, 0.235]}><sphereGeometry args={[0.018, 6, 4]} /><meshBasicMaterial color="#e02020" /></mesh>
        {ghost ? <mesh position={[0, 0.02, 0.231]}><planeGeometry args={[0.56, 0.42]} />{mat("#222")}</mesh> : <StalkScreen />}
      </>);
      case "bigbunny": return <BigBunny />;
      case "chessboard": return <ChessBoard />;
      case "wallclock": return <WallClock />;
      case "scrapdisplay": return <ScrapDisplay item={artwork} />;
    }
    return <AlphaDecor id={id} artwork={artwork} lightsOff={lightsOff}/>;
  })();
  return <group position={[x, y, z]} rotation={[0, r, 0]}>{inner}</group>;
}

/** Placed decoration with its owner-only interaction. */
export function PlacedDecor({ p, own, ownerId }: { p: Placed; own: boolean; ownerId: string }) {
  const pos = useMemo(() => new THREE.Vector3(p.x, (p.y ?? 0) + 0.6, p.z), [p.x, p.y, p.z]);
  useEffect(() => {
    if (!p.key) return;
    if (p.id === "bed") return register({ id: "bed" + p.key, pos, range: 2.2, label: () => own ? "[E] Sleep — restores full health" : "", onE: () => own && sleepInBed() });
    if (p.id === "storagebox" && own) return register({ id: "box" + p.key, pos, range: 2, label: () => "[E] Open storage box", onE: () => { game.set({ activeDecor: p.key ?? null, panel: "storage" }); document.exitPointerLock(); } });
     if (p.id === "scrapdisplay" && own) return register({ id: "disp" + p.key, pos, range: 2.2, label: () => "[E] Choose displayed scrap", onE: () => game.set({activeDecor:p.key??null,panel:"scrapselector"}) });
    if (["custompaint","psbconsole"].includes(p.id) && own) return register({ id: "art" + p.key, pos, range: 2.4, label: () => "[E] Change artwork", onE: () => { game.set({ activeDecor: p.key ?? null, panel: "artwork" }); document.exitPointerLock(); } });
    if(p.id==="jukebox"&&own)return register({id:"juke"+p.key,pos,range:2.2,label:()=>"[E] Toggle jukebox lights",onE:()=>game.setSave(s=>({room:s.room.map(d=>d.key===p.key?{...d,lightsOff:!d.lightsOff}:d)}))});
    if(["blueprint","projector"].includes(p.id)&&own)return register({id:p.id+p.key,pos,range:2.3,label:()=>"[E] "+(p.id==="blueprint"?"Blueprint Machine":"Video Projector"),onE:()=>game.set({activeDecor:p.key??null,panel:p.id==="blueprint"?"blueprint":"projector"})});
    return undefined;
  }, [p.key, p.id, pos, own, ownerId]);
  return <DecorMesh id={p.id} x={p.x} z={p.z} r={p.r} y={p.y} artwork={p.artwork} lightsOff={p.lightsOff} />;
}

/* ---------- Big Bunny: oversized seated plush with floppy pink-lined ears ---------- */
function BigBunny() {
  const fur = useMemo(() => fabricTex("#d9bb97"), []);
  const F = <meshStandardMaterial map={fur} roughness={1} />;
  const cream = <meshStandardMaterial color="#efe3cc" roughness={1} />;
  const pink = <meshStandardMaterial color="#e9a0a0" roughness={.9} />;
  return <group>
    <mesh position={[0, .45, 0]} scale={[1, 1.1, .85]}>{<sphereGeometry args={[.42, 20, 16]} />}{F}</mesh>
    <mesh position={[0, .52, .2]} scale={[.8, .9, .5]}><sphereGeometry args={[.36, 16, 12]} /><meshStandardMaterial color="#e3c8a6" roughness={1} /></mesh>
    {[-1, 1].map((sd) => <group key={sd}>
      <mesh position={[sd * .26, .14, .32]} rotation={[Math.PI / 2.3, 0, 0]}><capsuleGeometry args={[.13, .28, 6, 12]} />{F}</mesh>
      <mesh position={[sd * .26, .14, .55]} rotation={[0, 0, 0]} scale={[1, 1, .35]}><sphereGeometry args={[.14, 14, 10]} />{cream}</mesh>
      <mesh position={[sd * .36, .55, .2]} rotation={[.6, 0, sd * .5]}><capsuleGeometry args={[.1, .24, 6, 12]} />{F}</mesh>
      <mesh position={[sd * .25, 1.05, -.02]} rotation={[0, 0, sd * .5]} scale={[1, 1, .35]}><capsuleGeometry args={[.11, .55, 6, 12]} />{F}</mesh>
      <mesh position={[sd * .25, 1.05, .025]} rotation={[0, 0, sd * .5]} scale={[.7, .9, .1]}><capsuleGeometry args={[.11, .5, 6, 12]} />{pink}</mesh>
      <mesh position={[sd * .09, 1.06, .27]}><sphereGeometry args={[.03, 10, 8]} /><meshStandardMaterial color="#111" roughness={.2} /></mesh>
    </group>)}
    <mesh position={[0, 1.0, 0]} scale={[1.05, .95, .95]}><sphereGeometry args={[.29, 20, 16]} />{F}</mesh>
    <mesh position={[0, .95, .26]} scale={[1, .7, .6]}><sphereGeometry args={[.1, 12, 10]} /><meshStandardMaterial color="#ead2b2" roughness={1} /></mesh>
    <mesh position={[0, .98, .32]} rotation={[0, 0, Math.PI]}><coneGeometry args={[.025, .03, 3]} />{pink}</mesh>
  </group>;
}

/* ---------- Chess Board: small table with a full 32-piece set ---------- */
const BACK = ["r", "n", "b", "q", "k", "b", "n", "r"];
function ChessPiece({ t, white }: { t: string; white: boolean }) {
  const m = <meshStandardMaterial color={white ? "#efe6d2" : "#2a1d14"} roughness={.35} />;
  const h = t === "p" ? .05 : t === "k" || t === "q" ? .1 : .075;
  return <group>
    <mesh position={[0, .008, 0]}><cylinderGeometry args={[.021, .025, .016, 12]} />{m}</mesh>
    <mesh position={[0, .016 + h / 2, 0]}><cylinderGeometry args={[.01, .017, h, 10]} />{m}</mesh>
    {t === "p" && <mesh position={[0, .016 + h + .01, 0]}><sphereGeometry args={[.014, 10, 8]} />{m}</mesh>}
    {t === "r" && <mesh position={[0, .016 + h + .008, 0]}><cylinderGeometry args={[.02, .018, .018, 8]} />{m}</mesh>}
    {t === "n" && <mesh position={[0, .016 + h + .012, .006]} rotation={[.5, 0, 0]}><boxGeometry args={[.016, .03, .03]} />{m}</mesh>}
    {t === "b" && <mesh position={[0, .016 + h + .014, 0]} scale={[1, 1.5, 1]}><sphereGeometry args={[.014, 10, 8]} />{m}</mesh>}
    {t === "q" && <mesh position={[0, .016 + h + .01, 0]}><coneGeometry args={[.02, .025, 8]} />{m}</mesh>}
    {t === "k" && <><mesh position={[0, .016 + h + .015, 0]}><boxGeometry args={[.007, .03, .007]} />{m}</mesh><mesh position={[0, .016 + h + .02, 0]}><boxGeometry args={[.022, .007, .007]} />{m}</mesh></>}
  </group>;
}
function ChessBoard() {
  const wood = useMemo(() => woodTex(), []);
  const S = .07, top = .78;
  return <group>
    <mesh position={[0, top - .02, 0]}><boxGeometry args={[.74, .04, .74]} /><meshStandardMaterial map={wood} roughness={.6} /></mesh>
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => <mesh key={`${a}${b}`} position={[a * .3, (top - .04) / 2, b * .3]}><cylinderGeometry args={[.025, .02, top - .04, 8]} /><meshStandardMaterial map={wood} /></mesh>)}
    <mesh position={[0, top + .005, 0]}><boxGeometry args={[S * 8 + .04, .012, S * 8 + .04]} /><meshStandardMaterial color="#3b2414" /></mesh>
    {Array.from({ length: 64 }, (_, i) => { const c = i % 8, r = Math.floor(i / 8); return <mesh key={i} position={[(c - 3.5) * S, top + .012, (r - 3.5) * S]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[S, S]} /><meshStandardMaterial color={(c + r) % 2 ? "#5a3a22" : "#e8d6b0"} roughness={.4} /></mesh>; })}
    {[0, 1, 6, 7].flatMap((r) => Array.from({ length: 8 }, (_, c) => <group key={`${r}-${c}`} position={[(c - 3.5) * S, top + .012, (r - 3.5) * S]} rotation={[0, r > 3 ? Math.PI : 0, 0]}><ChessPiece t={r === 1 || r === 6 ? "p" : BACK[c]} white={r < 2} /></group>))}
  </group>;
}

/* ---------- Wall Clock: carved Black Forest case, brass pendulum, fast hands ---------- */
function WallClock() {
  const wood = useMemo(() => woodTex(), []);
  const W = <meshStandardMaterial map={wood} color="#5a3420" roughness={.8} />;
  const brass = <meshStandardMaterial color="#c9a24a" metalness={.85} roughness={.3} />;
  const hour = useRef<THREE.Group>(null), min = useRef<THREE.Group>(null), pend = useRef<THREE.Group>(null);
  const face = useMemo(() => {
    const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d")!;
    g.fillStyle = "#efe1b4"; g.beginPath(); g.arc(128, 128, 124, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#3a2410"; g.lineWidth = 6; g.stroke();
    g.fillStyle = "#1c120a"; g.font = "bold 34px serif"; g.textAlign = "center"; g.textBaseline = "middle";
    for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; g.fillText(String(i), 128 + Math.sin(a) * 96, 128 - Math.cos(a) * 96); }
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; g.fillRect(128 + Math.sin(a) * 116 - 1, 128 - Math.cos(a) * 116 - 1, 2, i % 5 ? 2 : 5); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  useEffect(() => () => face.dispose(), [face]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (min.current) min.current.rotation.z = -t * 1.2;
    if (hour.current) hour.current.rotation.z = -t * 0.1;
    if (pend.current) pend.current.rotation.z = Math.sin(t * 4) * .22;
  });
  return <group position={[0, .2, 0]}>
    <mesh position={[0, .75, .06]}><boxGeometry args={[.5, 1.5, .12]} />{W}</mesh>
    {[-1, 1].map((sd) => <group key={sd}>
      <mesh position={[sd * .28, .75, .09]}><cylinderGeometry args={[.035, .04, 1.5, 7]} />{W}</mesh>
      {[.25, .6, .95, 1.25].map((y, i) => <mesh key={y} position={[sd * .3, y, .13]} rotation={[0, 0, sd * (.6 + i * .2)]}><coneGeometry args={[.04, .14, 4]} />{W}</mesh>)}
    </group>)}
    <mesh position={[0, 1.55, .08]}><boxGeometry args={[.6, .12, .16]} />{W}</mesh>
    <group position={[0, 1.68, .08]}>
      <mesh scale={[1.6, .8, .7]}><sphereGeometry args={[.1, 12, 8]} />{W}</mesh>
      <mesh position={[.15, .02, 0]}><sphereGeometry args={[.06, 10, 8]} />{W}</mesh>
      {[-.08, .08].map((x) => <mesh key={x} position={[x, -.07, 0]}><cylinderGeometry args={[.025, .025, .08, 6]} />{W}</mesh>)}
    </group>
    <mesh position={[0, 1.22, .125]}><circleGeometry args={[.19, 32]} /><meshBasicMaterial map={face} /></mesh>
    <mesh position={[0, 1.22, .12]}><torusGeometry args={[.195, .018, 6, 32]} />{brass}</mesh>
    <group ref={hour} position={[0, 1.22, .135]}><mesh position={[0, .05, 0]}><boxGeometry args={[.018, .1, .005]} /><meshBasicMaterial color="#120a04" /></mesh></group>
    <group ref={min} position={[0, 1.22, .14]}><mesh position={[0, .075, 0]}><boxGeometry args={[.01, .15, .005]} /><meshBasicMaterial color="#120a04" /></mesh></group>
    <mesh position={[0, .6, .125]}><planeGeometry args={[.36, .85]} /><meshPhysicalMaterial color="#1a1008" transparent opacity={.55} roughness={.05} /></mesh>
    {[-.1, 0, .1].map((x, i) => <mesh key={x} position={[x, .82 - (i === 1 ? .08 : 0), .1]}><cylinderGeometry args={[.025, .025, .2, 12]} />{brass}</mesh>)}
    <group ref={pend} position={[0, .98, .1]}>
      <mesh position={[0, -.3, 0]}><boxGeometry args={[.01, .6, .005]} />{brass}</mesh>
      <mesh position={[0, -.62, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.07, .07, .015, 20]} />{brass}</mesh>
    </group>
  </group>;
}

/* ---------- Scrap Display: museum plinth with a glass case ---------- */
function ScrapDisplay({ item }: { item?: string }) {
  const spin = useRef<THREE.Sprite>(null);
  useFrame(({ clock }) => { if (spin.current) spin.current.position.y = 1.12 + Math.sin(clock.elapsedTime * 1.5) * .02; });
  const def = item ? ITEMS[item] : undefined;
  return <group>
    <mesh position={[0, .04, 0]}><boxGeometry args={[.7, .08, .7]} /><meshStandardMaterial color="#1e1e22" roughness={.4} /></mesh>
    <mesh position={[0, .5, 0]}><boxGeometry args={[.56, .84, .56]} /><meshStandardMaterial color="#efece4" roughness={.5} /></mesh>
    <mesh position={[0, .94, 0]}><boxGeometry args={[.66, .05, .66]} /><meshStandardMaterial color="#c9a24a" metalness={.8} roughness={.3} /></mesh>
    <mesh position={[0, .55, .282]}><planeGeometry args={[.32, .1]} /><meshStandardMaterial color="#c9a24a" metalness={.8} /></mesh>
    <mesh position={[0, 1.17, 0]}><boxGeometry args={[.56, .42, .56]} /><meshPhysicalMaterial color="#dff4ff" transparent opacity={.18} roughness={0} /></mesh>
    <pointLight position={[0, 1.45, 0]} intensity={1.2} distance={2} color="#fff2c8" />
    {def && <sprite ref={spin} position={[0, 1.12, 0]} scale={[.32, .32, .32]}><spriteMaterial map={imageTex(def.img)} transparent alphaTest={.3} /></sprite>}
  </group>;
}
