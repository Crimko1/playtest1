import { CELL, roomAt, roomPath, portal, collide, nearbyBoxes, type Box } from "./world";
import { rt } from "./runtime";
import { segmentBlocked } from "./rules";
import { sfx } from "./audio";
type Walker = { x: number; z: number };
const cache = new WeakMap<Walker, { goal: string; points: Walker[]; until: number }>();
function clear(a: Walker, b: Walker, boxes: Box[]) {
  return !boxes.some(box => box.y0 < 1.6 && box.y1 > 0 && !box.doorId && segmentBlocked(a.x, a.z, b.x, b.z, box, .38));
}
function localPath(a: Walker, goal: Walker, boxes: Box[]) {
  if (clear(a, goal, boxes)) return [goal];
  const room = roomAt(a.x, a.z); if (!room) return [];
  const nodes: Walker[] = [a, goal, { x: room.cx, z: room.cz }];
  for (const b of room.boxes) {
    if (b.y0 > 0 || b.y1 <= 0) continue;
    for (const x of [b.x0 - .45, b.x1 + .45]) for (const z of [b.z0 - .45, b.z1 + .45]) {
      if (x > room.x0 + .45 && x < room.x0 + CELL - .45 && z > room.z0 + .45 && z < room.z0 + CELL - .45) nodes.push({ x, z });
    }
  }
  const dist = nodes.map(() => Infinity), prev = nodes.map(() => -1), seen = new Set<number>(); dist[0] = 0;
  while (seen.size < nodes.length) {
    let i = -1; for (let n = 0; n < nodes.length; n++) if (!seen.has(n) && (i < 0 || dist[n] < dist[i])) i = n;
    if (i < 0 || !Number.isFinite(dist[i])) return [];
    if (i === 1) break; seen.add(i);
    for (let j = 1; j < nodes.length; j++) if (!seen.has(j) && clear(nodes[i], nodes[j], boxes)) {
      const d = dist[i] + Math.hypot(nodes[i].x - nodes[j].x, nodes[i].z - nodes[j].z);
      if (d < dist[j]) { dist[j] = d; prev[j] = i; }
    }
  }
  const path: Walker[] = []; let i = 1;
  while (i > 0) { path.unshift(nodes[i]); i = prev[i]; } return path;
}
/** Shared grounded navigation; advance beyond portals instead of stopping on boundaries. */
export function walkToward(actor: Walker, tx: number, tz: number, speed: number, dt: number) {
  const a = roomAt(actor.x, actor.z), target = roomAt(tx, tz); if (!a || !target) return;
  let goal = { x: tx, z: tz };
  if (a !== target) {
    const next = roomPath(a, target)[1]; if (!next) return;
    const p = portal(a, next), nx = Math.sign(next.c - a.c), nz = Math.sign(next.r - a.r);
    const entry = { x: p.x - nx * .8, z: p.z - nz * .8 };
    const aligned = nx ? Math.abs(actor.z - p.z) < .25 : Math.abs(actor.x - p.x) < .25;
    goal = aligned && Math.hypot(actor.x - entry.x, actor.z - entry.z) < 1.1 ? { x: p.x + nx * .8, z: p.z + nz * .8 } : entry;
  }
  const boxes = nearbyBoxes(actor.x, actor.z);
  for (const b of boxes) if (b.doorId) {
    const d = Math.hypot(actor.x - (b.x0 + b.x1) / 2, actor.z - (b.z0 + b.z1) / 2);
    if (d < 1.8) {
      const door = rt.doors.get(b.doorId);
      if (door && door.angle < 1.4) { if (door.angle < .05) sfx.door(); door.angle = Math.min(1.4, door.angle + dt * 3); }
      if (door && door.angle >= 1.1) b.y1 = -1;
    }
  }
  const key = `${a.idx}:${goal.x.toFixed(1)}:${goal.z.toFixed(1)}`, now = performance.now();
  let path = cache.get(actor);
  if (!path || path.goal !== key || path.until < now) { path = { goal: key, points: localPath(actor, goal, boxes), until: now + 500 }; cache.set(actor, path); }
  while (path.points.length && Math.hypot(path.points[0].x - actor.x, path.points[0].z - actor.z) < .12) path.points.shift();
  const point = path.points[0]; if (!point) return;
  const dx = point.x - actor.x, dz = point.z - actor.z, d = Math.hypot(dx, dz); if (d < .001) return;
  const step = Math.min(d, speed * Math.min(dt, .05));
  [actor.x, actor.z] = collide(actor.x + dx / d * step, actor.z + dz / d * step, .35, 0, boxes);
}
