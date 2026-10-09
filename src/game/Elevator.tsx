import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { rooms, ELEVATOR_ROOMS, elevatorCabin, type Room } from "./world";
import { rt, register } from "./runtime";
import { game } from "./store";
import { sfx } from "./audio";
import { metalTex } from "./textures";

/** Floor label changes every real hour; each elevator shows its own number. */
export function elevatorFloor(roomIdx: number, hour = Math.floor(Date.now() / 3600000)) {
  const h = Math.abs(Math.sin(hour * 12.9898 + roomIdx * 78.233) * 43758.5453) % 1;
  return -(1000 + Math.floor(h * 8999));
}

/** ride state shared by all cabins: doors close, 2s later player is moved, doors open */
const ride = { from: -1, to: -1, t: -1 };
function startRide(from: number) {
  if (ride.t >= 0) return;
  const others = ELEVATOR_ROOMS.filter((i) => i !== from && rooms[i]);
  ride.from = from; ride.to = others[Math.floor(Math.random() * others.length)]; ride.t = 0; sfx.door();
}

function floorTex(idx: number) {
  const c = document.createElement("canvas"); c.width = 128; c.height = 48; const g = c.getContext("2d")!;
  g.fillStyle = "#120806"; g.fillRect(0, 0, 128, 48);
  g.fillStyle = "#ff5a2a"; g.font = "bold 30px monospace"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(String(elevatorFloor(idx)), 64, 26);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function Cabin({ room }: { room: Room }) {
  const e = elevatorCabin(room);
  const doorL = useRef<THREE.Mesh>(null), doorR = useRef<THREE.Mesh>(null);
  const open = useRef(1);
  const steel = useMemo(() => metalTex("#8d918e"), []);
  const hour = Math.floor(Date.now() / 3600000);
  const label = useMemo(() => floorTex(room.idx), [room.idx, hour]);
  useEffect(() => () => label.dispose(), [label]);
  const btn = useMemo(() => new THREE.Vector3(e.x0 + 0.25, 1.25, (e.z0 + e.z1) / 2 + 0.55), [e.x0, e.z0, e.z1]);
  useEffect(() => register({ id: "elev" + room.idx, pos: btn, range: 1.6, label: () => ride.t >= 0 ? "" : "[E] Press 1", onE: () => startRide(room.idx) }), [room.idx, btn]);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const mine = ride.t >= 0 && (ride.from === room.idx || ride.to === room.idx);
    if (ride.t >= 0 && ride.from === room.idx) {
      ride.t += dt;
      if (ride.t >= 2 && ride.to >= 0) {
        // seamless move: same offset inside the destination cabin
        const to = rooms[ride.to], d = elevatorCabin(to);
        rt.pos.x = d.x0 + (rt.pos.x - e.x0); rt.pos.z = d.z0 + (rt.pos.z - e.z0);
        ride.from = ride.to; ride.to = -1; ride.t = 2.0001;
      }
      if (ride.to < 0 && ride.t > 3.2) { ride.t = -1; ride.from = -1; }
    }
    const closed = mine && ride.t < 2.6;
    open.current += ((closed ? 0 : 1) - open.current) * (1 - Math.exp(-6 * dt));
    const w = 1.12 * open.current;
    const zc = (e.z0 + e.z1) / 2;
    if (doorL.current) doorL.current.position.z = zc - 0.53 - w;
    if (doorR.current) doorR.current.position.z = zc + 0.53 + w;
    // keep the player inside while doors are shut
    if (closed && rt.pos.x > e.x1 - 0.35 && rt.pos.x < e.x1 + 0.6 && rt.pos.z > e.z0 && rt.pos.z < e.z1) rt.pos.x = e.x1 - 0.35;
  });
  const zc = (e.z0 + e.z1) / 2, H = 2.6;
  return <group>
    {/* interior steel lining, floor, ceiling light */}
    <mesh position={[(e.x0 + e.x1) / 2, 0.01, zc]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[e.x1 - e.x0, e.z1 - e.z0]} /><meshStandardMaterial color="#3a3530" roughness={.7} /></mesh>
    <mesh position={[(e.x0 + e.x1) / 2, H - 0.02, zc]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[e.x1 - e.x0, e.z1 - e.z0]} /><meshStandardMaterial map={steel} /></mesh>
    <mesh position={[e.x0 + 0.16, H / 2, zc]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[e.z1 - e.z0 - 0.3, H]} /><meshStandardMaterial map={steel} metalness={.6} roughness={.35} /></mesh>
    {[e.z0 + 0.16, e.z1 - 0.16].map((z, i) => <mesh key={z} position={[(e.x0 + e.x1) / 2, H / 2, z]} rotation={[0, i ? Math.PI : 0, 0]}><planeGeometry args={[e.x1 - e.x0, H]} /><meshStandardMaterial map={steel} metalness={.6} roughness={.35} /></mesh>)}
    <mesh position={[(e.x0 + e.x1) / 2, 1.0, e.z0 + 0.2]}><boxGeometry args={[e.x1 - e.x0 - 0.3, 0.04, 0.05]} /><meshStandardMaterial color="#c9c9c0" metalness={.9} roughness={.2} /></mesh>
    <mesh position={[(e.x0 + e.x1) / 2, H - 0.05, zc]}><boxGeometry args={[0.8, 0.03, 0.8]} /><meshBasicMaterial color="#fff4d6" /></mesh>
    <pointLight position={[(e.x0 + e.x1) / 2, H - 0.3, zc]} intensity={2.5} distance={4} color="#fff2d0" />
    {/* button panel */}
    <group position={[e.x0 + 0.17, 1.25, zc + 0.55]}>
      <mesh rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.22, 0.42]} /><meshStandardMaterial color="#6d6f6b" metalness={.8} roughness={.3} /></mesh>
      <mesh position={[0.012, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.035, 0.035, 0.02, 16]} /><meshStandardMaterial color="#ffdd88" emissive="#ff9a2a" emissiveIntensity={1.2} /></mesh>
      <mesh position={[0.012, -0.06, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.03, 0.03, 0.02, 16]} /><meshStandardMaterial color="#444" /></mesh>
    </group>
    {/* front frame + floor indicator + sliding doors */}
    <mesh position={[e.x1 + 0.03, H - 0.15, zc]}><boxGeometry args={[0.1, 0.3, e.z1 - e.z0]} /><meshStandardMaterial map={steel} metalness={.7} /></mesh>
    <mesh position={[e.x1 + 0.085, H - 0.15, zc]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.5, 0.19]} /><meshBasicMaterial map={label} /></mesh>
    <mesh position={[e.x1 - 0.12, H - 0.15, zc]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[0.5, 0.19]} /><meshBasicMaterial map={label} /></mesh>
    <mesh ref={doorL} position={[e.x1, (H - 0.3) / 2, zc - 0.83]}><boxGeometry args={[0.12, H - 0.3, 1.08]} /><meshStandardMaterial map={steel} metalness={.75} roughness={.25} /></mesh>
    <mesh ref={doorR} position={[e.x1, (H - 0.3) / 2, zc + 0.83]}><boxGeometry args={[0.12, H - 0.3, 1.08]} /><meshStandardMaterial map={steel} metalness={.75} roughness={.25} /></mesh>
  </group>;
}

export function Elevators({ visible }: { visible: Room[] }) {
  const list = visible.filter((r) => ELEVATOR_ROOMS.includes(r.idx));
  // the destination cabin must exist during a ride even if far away
  const extra = ride.to >= 0 && !list.some((r) => r.idx === ride.to) ? [rooms[ride.to]] : [];
  return <>{[...list, ...extra].map((r) => <Cabin key={r.idx} room={r} />)}</>;
}
