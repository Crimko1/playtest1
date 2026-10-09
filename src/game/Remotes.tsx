import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { remotes, where, type Remote } from "./net";
import { Character } from "./Character";

function tagTex(name: string, lvl: number) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgba(0,0,0,0.55)"; g.fillRect(0, 8, 256, 48);
  g.font = "bold 26px monospace"; g.textAlign = "center"; g.fillStyle = "#e8c547";
  g.fillText(`${name.slice(0, 14)}  ·  LV ${lvl}`, 128, 42);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function RemoteView({ id }: { id: string }) {
  const g = useRef<THREE.Group>(null);
  const r = remotes.get(id);
  const [snap, setSnap] = useState({ held: r?.held ?? "", outfit: r?.outfit ?? "classic", avatar: r?.avatar, name: r?.name ?? "", lvl: r?.lvl ?? 1 });
  const tex = useMemo(() => tagTex(snap.name, snap.lvl), [snap.name, snap.lvl]);
  useFrame((_, dt) => {
    const cur = remotes.get(id) as Remote | undefined; if (!cur || !g.current) return;
    const k = 1 - Math.exp(-10 * dt);
    g.current.position.lerp(new THREE.Vector3(cur.x, cur.y, cur.z), k);
    g.current.rotation.y += (((cur.yaw + Math.PI - g.current.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * k;
    if (cur.held !== snap.held || cur.outfit !== snap.outfit || cur.avatar !== snap.avatar || cur.lvl !== snap.lvl || cur.name !== snap.name)
      setSnap({ held: cur.held, outfit: cur.outfit, avatar: cur.avatar, name: cur.name, lvl: cur.lvl });
  });
  return (
    <group ref={g} position={[r?.x ?? 0, r?.y ?? 0, r?.z ?? 0]}>
      <Character outfit={snap.outfit} avatar={snap.avatar} held={snap.held || undefined} moving={() => remotes.get(id)?.moving ?? 0} />
      <sprite position={[0, 2.25, 0]} scale={[1.4, 0.35, 1]}><spriteMaterial map={tex} transparent depthWrite={false} /></sprite>
    </group>
  );
}

export function Remotes() {
  const [ids, setIds] = useState<string[]>([]);
  useFrame(() => {
    const w = where();
    const now = [...remotes.values()].filter((r) => r.where === w).map((r) => r.id).sort();
    if (now.join() !== ids.join()) setIds(now);
  });
  return <>{ids.map((id) => <RemoteView key={id} id={id} />)}</>;
}
