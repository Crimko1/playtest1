import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fetchLeaderboard } from "./cloud";
import { imageTex } from "./textures";

type Board = Awaited<ReturnType<typeof fetchLeaderboard>>;
function Face({ url, y }: { url: string; y: number }) {
  return <mesh position={[-2.7, y, .055]}><planeGeometry args={[.14, .14]} /><meshBasicMaterial map={imageTex(url)} /></mesh>;
}
export function Leaderboard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const refresh = () => fetchLeaderboard().then(data => { if (mounted.current) { setBoard(data); setError(false); } }).catch(() => { if (mounted.current) setError(true); });
    refresh(); const timer = setInterval(refresh, 15000);
    return () => { mounted.current = false; clearInterval(timer); };
  }, []);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = 1536; canvas.height = 800;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#101817"; ctx.fillRect(0, 0, 1536, 800);
      ctx.fillStyle = "#e8c547"; ctx.font = "bold 42px monospace"; ctx.fillText("TOP SCAVENGERS", 55, 65);
      ctx.font = "26px monospace"; ctx.fillStyle = "#96a9a0";
      ctx.fillText("#", 40, 112); ctx.fillText("NAME", 190, 112); ctx.fillText("LEVEL", 995, 112); ctx.fillText("TOTAL QUOTA", 1200, 112);
      if (!board) { ctx.fillText(error ? "CONNECTION UNAVAILABLE" : "CONNECTING…", 55, 220); }
      const row = (player: NonNullable<Board["me"]>, rank: number, y: number, own = false) => {
        ctx.fillStyle = own ? "#253c33" : rank % 2 ? "#1a2522" : "#101817"; ctx.fillRect(22, y - 33, 1492, 47);
        ctx.fillStyle = own ? "#e8c547" : "#dce7db"; ctx.font = "bold 29px monospace";
        ctx.fillText(String(rank), 40, y); ctx.fillText(player.name.slice(0, 16), 190, y); ctx.fillText(String(player.level), 1030, y);
        ctx.textAlign = "right"; ctx.fillText(`$${player.total_quota.toLocaleString()}`, 1480, y); ctx.textAlign = "left";
      };
      board?.top.forEach((player, i) => row(player, i + 1, 165 + i * 51, player.id === board.me?.id));
      ctx.fillStyle = "#96a9a0"; ctx.font = "24px monospace"; ctx.fillText("YOUR PLACE", 40, 720);
      if (board?.me && board.rank) row(board.me, board.rank, 770, true);
    }
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; return tex;
  }, [board, error]);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame(() => { /* Face textures are advanced globally, including GIFs. */ });
  const height = 3.1;
  const rowY = (pixel: number) => height / 2 - (pixel - 10) / 800 * height;
  return <group position={[6.6, 2.05, -17.84]}>
    <mesh position={[0, 0, -.05]}><boxGeometry args={[6.65, 3.25, .12]} /><meshStandardMaterial color="#343e39" metalness={.6} roughness={.5} /></mesh>
    <mesh position={[0,0,.025]}><planeGeometry args={[6.4, height]} /><meshBasicMaterial map={texture} /></mesh>
    {board?.top.map((p, i) => p.avatar_url ? <Face key={p.id} url={p.avatar_url} y={rowY(165 + i * 51)} /> : null)}
    {board?.me?.avatar_url && <Face url={board.me.avatar_url} y={rowY(770)} />}
  </group>;
}