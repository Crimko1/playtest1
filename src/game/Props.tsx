import { TreeModel } from "./TreeModel";
import { memo } from "react";
import * as THREE from "three";
import { tbox, lam } from "./geo";
import { woodTex, metalTex, fabricTex, screenTex } from "./textures";
import { rng } from "./textures";
import type { Prop } from "./world";

const wood = () => lam("wood", () => ({ map: woodTex() }));
const metal = (c = "#6f7470") => lam("metal" + c, () => ({ map: metalTex(c) }));
const fab = (c: string) => lam("fab" + c, () => ({ map: fabricTex(c) }));
const flat = (c: string) => lam("flat" + c, () => ({ color: c }));
let crtScreen: THREE.Material | null = null;
const crt = () => (crtScreen ??= new THREE.MeshBasicMaterial({ map: screenTex(["", "NO SIGNAL", ""], "#9fb", "#0a120d") }));

function B({ p, s, m, r }: { p: [number, number, number]; s: [number, number, number]; m: THREE.Material; r?: [number, number, number] }) {
  return <mesh position={p} rotation={r} geometry={tbox(s[0], s[1], s[2], 1)} material={m} castShadow={false} />;
}

function Legs({ w, d, h, t = 0.05, m }: { w: number; d: number; h: number; t?: number; m: THREE.Material }) {
  return (
    <>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => (
        <B key={i} p={[(a * (w - t)) / 2, h / 2, (b * (d - t)) / 2]} s={[t, h, t]} m={m} />
      ))}
    </>
  );
}

function Inner({ p }: { p: Prop }) {
  const R = rng(p.seed);
  // dimensions are in un-rotated local space
  const w = p.rot ? p.d : p.w, d = p.rot ? p.w : p.d;
  switch (p.kind) {
    case "desk":
      return (<>
        <B p={[0, 0.76, 0]} s={[w, 0.04, d]} m={wood()} />
        <B p={[-w / 2 + 0.22, 0.38, 0]} s={[0.4, 0.74, d - 0.05]} m={wood()} />
        {[0.15, 0.38, 0.6].map((y) => <B key={y} p={[-w / 2 + 0.22, y, d / 2 - 0.01]} s={[0.34, 0.18, 0.02]} m={flat("#4a3018")} />)}
        <B p={[w / 2 - 0.03, 0.38, 0]} s={[0.04, 0.74, d - 0.05]} m={wood()} />
        <B p={[0, 0.45, -d / 2 + 0.03]} s={[w - 0.1, 0.5, 0.02]} m={wood()} />
        {R() > 0.4 && (<group position={[0.2, 0.78, -0.05]}>
          <B p={[0, 0.2, 0]} s={[0.42, 0.36, 0.4]} m={flat("#bdb6a0")} />
          <mesh position={[0, 0.2, 0.201]} material={crt()}><planeGeometry args={[0.32, 0.26]} /></mesh>
          <B p={[0, 0.01, 0.25]} s={[0.4, 0.03, 0.14]} m={flat("#cfc8b2")} />
        </group>)}
        {R() > 0.5 && <B p={[-0.4, 0.8, 0.1]} s={[0.25, 0.05, 0.32]} m={flat("#e8e2cc")} r={[0, 0.3, 0]} />}
      </>);
    case "chair":
      return (<>
        <B p={[0, 0.45, 0]} s={[0.44, 0.05, 0.44]} m={fab("#4a4a3a")} />
        <B p={[0, 0.72, -0.2]} s={[0.42, 0.5, 0.04]} m={fab("#4a4a3a")} />
        <Legs w={0.42} d={0.42} h={0.43} t={0.03} m={metal("#3b3d3a")} />
      </>);
    case "schooldesk":
      return (<>
        <B p={[0, 0.72, 0]} s={[w, 0.03, d]} m={wood()} />
        <B p={[0, 0.55, 0]} s={[w - 0.05, 0.12, d - 0.05]} m={metal("#6a6d63")} />
        <Legs w={w} d={d} h={0.71} t={0.03} m={metal("#55574f")} />
      </>);
    case "cabinet":
      return (<>
        <B p={[0, 0.65, 0]} s={[w, 1.3, d]} m={metal("#7b7e72")} />
        {[0.25, 0.65, 1.05].map((y) => (<group key={y}>
          <B p={[0, y, d / 2 + 0.005]} s={[w - 0.06, 0.34, 0.01]} m={metal("#8a8d80")} />
          <B p={[0, y + 0.08, d / 2 + 0.02]} s={[0.12, 0.025, 0.02]} m={flat("#2a2a26")} />
        </group>))}
      </>);
    case "cooler":
      return (<>
        <B p={[0, 0.5, 0]} s={[0.36, 1, 0.36]} m={flat("#d8d3c0")} />
        <mesh position={[0, 1.15, 0]}><cylinderGeometry args={[0.15, 0.15, 0.32, 8]} /><meshLambertMaterial color="#7fb3c4" transparent opacity={0.7} /></mesh>
        <B p={[0.08, 0.75, 0.19]} s={[0.04, 0.05, 0.04]} m={flat("#3060c0")} />
        <B p={[-0.08, 0.75, 0.19]} s={[0.04, 0.05, 0.04]} m={flat("#c03030")} />
      </>);
    case "plant":
      return (<>
        <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.2, 0.15, 0.4, 8]} /><meshLambertMaterial color="#6a3b22" /></mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[Math.sin(i * 1.3) * 0.12, 0.7 + i * 0.08, Math.cos(i * 1.3) * 0.12]} rotation={[Math.sin(i) * 0.6, i, Math.cos(i) * 0.6]}>
            <boxGeometry args={[0.05, 0.6, 0.18]} /><meshLambertMaterial color="#4c4a24" />
          </mesh>
        ))}
      </>);
    case "shelf":
      return (<>
        {[-1, 1].map((s) => <B key={s} p={[(s * (w - 0.05)) / 2, 1, 0]} s={[0.05, 2, d]} m={metal("#5b5e58")} />)}
        {[0.08, 0.6, 1.2, 1.8].map((y) => <B key={y} p={[0, y, 0]} s={[w, 0.04, d]} m={metal("#6d706a")} />)}
        {Array.from({ length: 6 }, (_, i) => {
          const y = [0.1, 0.62, 1.22][i % 3]; const bw = 0.25 + R() * 0.3;
          return <B key={i} p={[-w / 2 + 0.2 + R() * (w - 0.4), y + bw * 0.4, 0]} s={[bw, bw * 0.8, d * 0.7]} m={fab(["#8a6a3a", "#6a5a3a", "#9a8a6a"][i % 3])} />;
        })}
      </>);
    case "crate":
      return (<>
        <B p={[0, 0.4, 0]} s={[0.8, 0.8, 0.8]} m={wood()} />
        {[-0.38, 0.38].map((x) => <B key={x} p={[x, 0.4, 0.405]} s={[0.06, 0.8, 0.02]} m={flat("#3f2a16")} />)}
        <B p={[0, 0.4, 0.41]} s={[0.8, 0.06, 0.02]} m={flat("#3f2a16")} r={[0, 0, 0.78]} />
      </>);
    case "barrel":
      return (<>
        <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.3, 0.3, 0.9, 10]} /><meshLambertMaterial map={metalTex(R() > 0.5 ? "#2f4a5a" : "#6a3a20")} /></mesh>
        {[0.15, 0.75].map((y) => <mesh key={y} position={[0, y, 0]}><torusGeometry args={[0.3, 0.015, 4, 10]} /><meshLambertMaterial color="#333" /></mesh>)}
      </>);
    case "bed":
      return (<>
        <B p={[0, 0.2, 0]} s={[w, 0.2, d]} m={wood()} />
        <B p={[0, 0.4, 0.05]} s={[w - 0.05, 0.2, d - 0.15]} m={fab("#d6cfb7")} />
        <B p={[0, 0.52, -d / 2 + 0.3]} s={[w - 0.3, 0.1, 0.35]} m={fab("#e8e2cc")} />
        <B p={[0, 0.47, 0.35]} s={[w - 0.02, 0.06, d * 0.6]} m={fab(["#7a2f26", "#3a4a6a", "#5f6b45"][Math.floor(R() * 3)])} />
        <B p={[0, 0.55, -d / 2]} s={[w, 1.1, 0.06]} m={wood()} />
        <Legs w={w} d={d} h={0.12} t={0.06} m={wood()} />
      </>);
    case "mattress":
      return (<>
        <B p={[0, 0.12, 0]} s={[w, 0.24, d]} m={fab("#c9bfa0")} />
        <B p={[0.2, 0.245, 0.3]} s={[0.4, 0.01, 0.5]} m={flat("#8a6a30")} />
      </>);
    case "wardrobe":
      return (<>
        <B p={[0, 1, 0]} s={[w, 2, d]} m={wood()} />
        <B p={[-0.005, 1, d / 2 + 0.005]} s={[0.01, 1.9, 0.01]} m={flat("#1a1008")} />
        {[-0.08, 0.08].map((x) => <B key={x} p={[x, 1.05, d / 2 + 0.02]} s={[0.02, 0.12, 0.02]} m={flat("#b08a40")} />)}
        <B p={[0, 2.02, 0]} s={[w + 0.06, 0.05, d + 0.04]} m={wood()} />
      </>);
    case "nightstand":
      return (<>
        <B p={[0, 0.3, 0]} s={[w, 0.6, d]} m={wood()} />
        <B p={[0, 0.42, d / 2 + 0.01]} s={[w - 0.06, 0.16, 0.01]} m={flat("#4a3018")} />
        <mesh position={[0, 0.72, 0]}><cylinderGeometry args={[0.04, 0.08, 0.24, 6]} /><meshLambertMaterial color="#8a7a50" /></mesh>
        <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.09, 0.14, 0.16, 8, 1, true]} /><meshLambertMaterial color="#e8d8a0" emissive="#504020" side={THREE.DoubleSide} /></mesh>
      </>);
    case "pillar":
      return (<>
        <B p={[0, p.h / 2, 0]} s={[0.8, p.h, 0.8]} m={lam("pillar", () => ({ color: "#c4ad55" }))} />
        <B p={[0, 0.06, 0]} s={[0.86, 0.12, 0.86]} m={wood()} />
      </>);
    case "bench":
      return (<>
        <B p={[0, 0.43, 0]} s={[w, 0.05, d]} m={wood()} />
        {[-1, 1].map((s) => <B key={s} p={[(s * (w - 0.2)) / 2, 0.21, 0]} s={[0.06, 0.42, d - 0.05]} m={metal("#444")} />)}
      </>);
    case "table":
      return (<>
        <mesh position={[0, 0.74, 0]}><cylinderGeometry args={[0.7, 0.7, 0.04, 14]} /><meshLambertMaterial map={woodTex()} /></mesh>
        <mesh position={[0, 0.37, 0]}><cylinderGeometry args={[0.05, 0.05, 0.72, 6]} /><meshLambertMaterial color="#3a2a18" /></mesh>
        <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.35, 0.4, 0.04, 10]} /><meshLambertMaterial color="#3a2a18" /></mesh>
        <mesh position={[0, 0.765, 0]}><cylinderGeometry args={[0.55, 0.55, 0.005, 14]} /><meshLambertMaterial color="#d8d0b8" /></mesh>
      </>);
    case "sofa": {
      const c = ["#6a3a2a", "#3a4a3a", "#5a4a3a", "#7a6a4a"][Math.floor(R() * 4)];
      return (<>
        <B p={[0, 0.25, 0.05]} s={[w, 0.3, d - 0.1]} m={fab(c)} />
        <B p={[0, 0.45, 0.08]} s={[w - 0.4, 0.12, d - 0.3]} m={fab(c)} />
        <B p={[0, 0.6, -d / 2 + 0.1]} s={[w, 0.6, 0.2]} m={fab(c)} />
        {[-1, 1].map((s) => <B key={s} p={[(s * (w - 0.2)) / 2, 0.45, 0.05]} s={[0.2, 0.4, d - 0.1]} m={fab(c)} />)}
      </>);
    }
    case "tvstand":
      return (<>
        <B p={[0, 0.25, 0]} s={[w, 0.5, d]} m={wood()} />
        <B p={[0, 0.82, 0]} s={[0.7, 0.6, 0.48]} m={flat("#2a2824")} />
        <mesh position={[0, 0.82, 0.241]} material={crt()}><planeGeometry args={[0.58, 0.46]} /></mesh>
        <B p={[0.15, 1.15, -0.1]} s={[0.02, 0.15, 0.02]} m={flat("#777")} r={[0, 0, 0.5]} />
      </>);
    case "pipes":
      return (<>
        {[-0.12, 0.12].map((x, i) => (
          <mesh key={x} position={[x, p.h / 2, 0]}><cylinderGeometry args={[0.07 + i * 0.03, 0.07 + i * 0.03, p.h, 8]} /><meshLambertMaterial map={metalTex("#5a4a3a")} /></mesh>
        ))}
        <mesh position={[0, 1.3, 0]}><torusGeometry args={[0.15, 0.03, 4, 8]} /><meshLambertMaterial color="#8a2020" /></mesh>
      </>);
    case "boiler":
      return (<>
        <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.55, 0.55, 1.9, 12]} /><meshLambertMaterial map={metalTex("#5c5f58")} /></mesh>
        <mesh position={[0, 1.4, 0.55]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.1, 0.1, 0.04, 10]} /><meshLambertMaterial color="#e8e2cc" /></mesh>
        <mesh position={[0.3, 0.4, 0.5]}><boxGeometry args={[0.2, 0.15, 0.1]} /><meshLambertMaterial color="#ff6a1a" emissive="#ff4a0a" emissiveIntensity={0.6} /></mesh>
      </>);
    case "arcade":
      return (<>
        <B p={[0, 0.9, 0]} s={[0.7, 1.8, 0.7]} m={flat(R() > 0.5 ? "#2a2a5a" : "#5a1a2a")} />
        <mesh position={[0, 1.3, 0.36]} rotation={[-0.2, 0, 0]}><planeGeometry args={[0.55, 0.42]} /><meshBasicMaterial color={R() > 0.6 ? "#123" : "#3a6a4a"} /></mesh>
        <B p={[0, 0.95, 0.38]} s={[0.6, 0.08, 0.15]} m={flat("#111")} />
        <B p={[0, 1.7, 0.36]} s={[0.66, 0.15, 0.02]} m={lam("arcmarq", () => ({ color: "#e8c547", emissive: "#3a2a00" }))} />
      </>);
    case "vending":
      return (<>
        <B p={[0, 0.95, 0]} s={[w, 1.9, d]} m={flat("#7a1a1a")} />
        <mesh position={[-0.12, 1.1, d / 2 + 0.01]}><planeGeometry args={[0.6, 1.2]} /><meshLambertMaterial color="#223" emissive="#1a2a3a" /></mesh>
        <B p={[0.38, 1.1, d / 2 + 0.02]} s={[0.16, 0.4, 0.02]} m={flat("#bbb")} />
      </>);
    case "stall":
      return (<>
        <B p={[-w / 2 + 0.02, 1, 0]} s={[0.04, 1.8, d]} m={metal("#7a8a7a")} />
        <B p={[w / 2 - 0.02, 1, 0]} s={[0.04, 1.8, d]} m={metal("#7a8a7a")} />
        <B p={[0, 1, -d / 2 + 0.02]} s={[w, 1.8, 0.04]} m={metal("#7a8a7a")} />
        <B p={[0.1, 1, d / 2 - 0.02]} s={[w - 0.25, 1.7, 0.03]} m={metal("#6f7f6f")} r={[0, 0.5, 0]} />
        <mesh position={[0, 0.22, -0.2]}><cylinderGeometry args={[0.18, 0.15, 0.44, 10]} /><meshLambertMaterial color="#e8e6dc" /></mesh>
        <B p={[0, 0.55, -d / 2 + 0.12]} s={[0.38, 0.4, 0.16]} m={flat("#e8e6dc")} />
      </>);
    case "sink":
      return (<>
        <B p={[0, 0.82, 0]} s={[w, 0.15, d]} m={flat("#e0ddd0")} />
        <B p={[0, 0.4, -d / 2 + 0.08]} s={[0.12, 0.8, 0.12]} m={flat("#d8d4c4")} />
        <B p={[0, 0.98, -d / 2 + 0.06]} s={[0.04, 0.18, 0.04]} m={metal("#999")} />
        <mesh position={[0, 1.5, -d / 2 + 0.01]}><planeGeometry args={[0.5, 0.6]} /><meshLambertMaterial color="#8a9a9a" emissive="#1a1f1f" /></mesh>
      </>);
    case "lockers":
      return (<>
        {[0, 1, 2, 3].map((i) => (<group key={i} position={[-w / 2 + 0.2 + i * 0.4, 0, 0]}>
          <B p={[0, 0.95, 0]} s={[0.39, 1.9, d]} m={metal(R() > 0.8 ? "#7a5a3a" : "#4a5a6a")} />
          {[1.6, 1.65, 1.7].map((y) => <B key={y} p={[0, y, d / 2 + 0.005]} s={[0.25, 0.015, 0.01]} m={flat("#222")} />)}
          <B p={[0.13, 1, d / 2 + 0.02]} s={[0.03, 0.12, 0.03]} m={flat("#999")} />
        </group>))}
      </>);
    case "piano":
      return (<>
        <B p={[0, 0.6, 0]} s={[w, 1.2, d]} m={flat("#1a120c")} />
        <B p={[0, 0.72, d / 2 + 0.12]} s={[w - 0.1, 0.04, 0.24]} m={flat("#1a120c")} />
        <B p={[0, 0.75, d / 2 + 0.12]} s={[w - 0.2, 0.02, 0.2]} m={flat("#e8e2cc")} />
      </>);
    case "clock":
      return (<>
        <B p={[0, 1, 0]} s={[0.45, 2, 0.35]} m={wood()} />
        <mesh position={[0, 1.7, 0.18]}><circleGeometry args={[0.16, 12]} /><meshLambertMaterial color="#e8dcb8" /></mesh>
        <B p={[0, 0.8, 0.18]} s={[0.05, 0.5, 0.01]} m={flat("#b08a40")} />
      </>);
    case "mannequin":
      return (<>
        <mesh position={[0, 1.65, 0]}><sphereGeometry args={[0.12, 8, 6]} /><meshLambertMaterial color="#d8c8b0" /></mesh>
        <B p={[0, 1.25, 0]} s={[0.36, 0.6, 0.2]} m={flat("#d8c8b0")} />
        <B p={[0, 0.8, 0]} s={[0.3, 0.35, 0.18]} m={flat("#d8c8b0")} />
        <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.02, 0.02, 0.6, 4]} /><meshLambertMaterial color="#333" /></mesh>
        <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.2, 0.2, 0.04, 8]} /><meshLambertMaterial color="#333" /></mesh>
      </>);
    case "tree": return <TreeModel />;
    case "rock":
      return <mesh position={[0, 0.32, 0]} scale={[w / 1.1, 0.7, d / 0.9]} rotation={[0, R() * 3, 0]}><dodecahedronGeometry args={[0.55, 0]} /><meshLambertMaterial color="#6a665c" flatShading /></mesh>;
    case "counter":
      return (<>
        <B p={[0, 0.45, 0]} s={[w, 0.9, d]} m={wood()} />
        <B p={[0, 0.93, 0]} s={[w + 0.06, 0.05, d + 0.06]} m={flat("#c8c2b0")} />
        <B p={[0, 0.45, d / 2 + 0.005]} s={[w - 0.2, 0.7, 0.01]} m={flat("#4a3018")} />
      </>);
    case "lamp":
      return (<>
        <mesh position={[0, 0.75, 0]}><cylinderGeometry args={[0.02, 0.02, 1.5, 5]} /><meshLambertMaterial color="#333" /></mesh>
        <mesh position={[0, 1.45, 0]}><coneGeometry args={[0.22, 0.3, 8, 1, true]} /><meshLambertMaterial color="#d8c890" side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.15, 0.15, 0.04, 8]} /><meshLambertMaterial color="#333" /></mesh>
      </>);
    case "bunk":
      return (<>
        {[0.35, 1.3].map((y) => <B key={y} p={[0, y, 0]} s={[w - 0.08, 0.16, d - 0.08]} m={fab("#7a7868")} />)}
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <B key={i} p={[a * (w / 2 - 0.04), 0.9, b * (d / 2 - 0.04)]} s={[0.06, 1.8, 0.06]} m={metal("#4a4e4a")} />)}
      </>);
    case "servers":
      return (<>
        <B p={[0, 1, 0]} s={[w, 2, d]} m={metal("#2a2d2c")} />
        {Array.from({ length: 8 }, (_, i) => <B key={i} p={[0, 0.3 + i * 0.22, d / 2 + 0.005]} s={[w - 0.12, 0.12, 0.01]} m={flat(i % 3 ? "#1a1c1b" : "#3a7a4a")} />)}
      </>);
    case "cart":
      return (<>
        <B p={[0, 0.6, 0]} s={[w, 0.5, d]} m={metal("#8a8e88")} />
        <B p={[w / 2, 0.95, 0]} s={[0.04, 0.04, d]} m={metal("#555")} />
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <mesh key={i} position={[a * (w / 2 - 0.08), 0.06, b * (d / 2 - 0.08)]}><sphereGeometry args={[0.06, 6, 4]} /><meshLambertMaterial color="#222" /></mesh>)}
      </>);
  }
  return null;
}

export const PropMesh = memo(function PropMesh({ p }: { p: Prop }) {
  return (
    <group position={[p.x, 0, p.z]} rotation={[0, p.rot, 0]}>
      <Inner p={p} />
    </group>
  );
});
