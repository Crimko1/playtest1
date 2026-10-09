import { UpperLevel, Staircases } from "./UpperLevel";
import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame, game, type Placed } from "./store";
import { rt } from "./runtime";
import { rooms, dynBoxes, roomAt, type Box } from "./world";
import { Backrooms, DroppedItems } from "./Backrooms";
import { Lab, PersonalRoom } from "./Lab";
import { Player, decorBox } from "./Player";
import { Entities, Minions } from "./Entities";
import { Remotes } from "./Remotes";
import { DecorMesh } from "./Decor";
import { fetchPlayer } from "./cloud";
import { updateAnimatedTextures } from "./textures";

function DarkAmbient() {
  const ref = useRef<THREE.AmbientLight>(null);
  useFrame(() => {
    if (!ref.current) return; const r = game.get().inRoom ? undefined : roomAt(rt.pos.x, rt.pos.z);
    ref.current.intensity = r ? 0 : 0.06;
  });
  return <ambientLight ref={ref} intensity={0.06} color="#fff6c8" />;
}
function AnimatedImages() { useFrame(() => updateAnimatedTextures(performance.now())); return null; }

const menuRoom = rooms.find((r) => r.theme === "Pillar Hall" && r.light === "lit") ?? rooms.find((r) => r.light === "lit")!;

function MenuCam() {
  const { camera } = useThree();
  useEffect(() => { rt.pos.set(menuRoom.cx, 0, menuRoom.cz); }, []);
  useFrame(({ clock }) => {
    if (game.get().screen === "game" || game.get().inRoom) return;
    const t = clock.elapsedTime;
    const dark = game.get().screen === "drop";
    camera.position.set(menuRoom.x0 + 2 + Math.sin(t * 0.05) * 0.6, 1.6 + Math.sin(t * 0.4) * 0.02, menuRoom.z0 + 2 + t * (dark ? 0.5 : 0.04) % 8);
    camera.rotation.set(Math.sin(t * 0.13) * 0.02, -Math.PI * 0.75 + Math.sin(t * 0.07) * 0.08, 0, "YXZ");
    rt.pos.set(camera.position.x, 0, camera.position.z);
  });
  return null;
}

function Room() {
  const inRoom = useGame((s) => s.inRoom);
  const uid = useGame((s) => s.userId);
  const own = useGame((s) => s.save.room);
  const roomTheme = useGame((s) => s.save.roomTheme);
  const roomIndex = useGame((s) => s.save.roomIndex);
  const decorMode = useGame((s) => s.decorMode);
  const [other, setOther] = useState<{ list: Placed[]; idx: number; theme?: number } | null>(null);
  const [, f] = useState(0);
  useEffect(() => {
    if (!inRoom || inRoom === uid) { setOther(null); return; }
    fetchPlayer(inRoom).then((d) => { const list = ((d?.room as unknown as Placed[]) ?? []).filter((p) => p.id !== "doghouse"); rt.visitStalk = list.some((p) => p.id === "stalkdevice"); setOther({ list, idx: inRoom.charCodeAt(0), theme: (d?.save as {roomTheme?:number} | undefined)?.roomTheme }); });
  }, [inRoom, uid]);
  const list = inRoom === uid ? own : other?.list ?? [];
  useEffect(() => {
    const boxes: Box[] = list.map((p) => decorBox(p.id, p.x, p.z, p.r, p.y));
    dynBoxes.push(...boxes);
    return () => { boxes.forEach((b) => { const i = dynBoxes.indexOf(b); if (i >= 0) dynBoxes.splice(i, 1); }); };
  }, [list]);
  useFrame(() => { if (decorMode) f((n) => (n + 1) % 1000); });
  if (!inRoom) return null;
  const g = rt.ghost;
  return (
    <PersonalRoom themeIndex={inRoom === uid ? roomTheme : other?.theme} own={inRoom === uid} ownerId={inRoom} ownerRoom={list} ownerIdx={inRoom === uid ? roomIndex : other?.idx ?? 0}
      ghost={decorMode && g ? <group><DecorMesh id={g.id} x={g.x} z={g.z} r={g.r} y={g.y} ghost />
        <mesh position={[g.x, 0.02, g.z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.6, 1.6]} /><meshBasicMaterial color={g.ok ? "#7dff8a" : "#ff4a3a"} transparent opacity={0.3} /></mesh></group> : null} />
  );
}

export function GameCanvas() {
  const screen = useGame((s) => s.screen);
  if (screen === "intro" || screen === "auth" || screen === "create") return null;
  const inGame = screen === "game";
  return (
    <div className="fixed inset-0">
      <Canvas
        shadows dpr={0.5}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{ fov: 72, near: 0.05, far: 80 }}
        style={{ imageRendering: "pixelated" }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.NoToneMapping; }}
      >
        <color attach="background" args={["#000"]} />
        <fog attach="fog" args={["#0b0a04", 6, 34]} />
        {inGame ? <DarkAmbient /> : <ambientLight intensity={0.12} color="#fff6c8" />}
        <Suspense fallback={null}>
          <AnimatedImages />
          {inGame ? (
            <>
              <Player />
              <Lab />
              <Backrooms />
              <Room />
               <UpperLevel />
               <Staircases />
              <DroppedItems />
              <Minions />
              <Entities />
              <Remotes />
            </>
          ) : (
            <>
              <MenuCam />
              <Backrooms />
            </>
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
