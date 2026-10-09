import { game, maxHealth } from "./store";
import { rt } from "./runtime";
import { PROOM } from "./world";
import { SLEEP_MS } from "./rules";
import { sfx } from "./audio";

export function spawnInRoom() {
  const s = game.get();
  if (!s.userId) return;
  rt.pos.set((PROOM.x0 + PROOM.x1) / 2, 0, PROOM.z1 - 1.5);
  rt.vel.set(0, 0, 0); rt.verticalVelocity = 0; rt.grounded = true; rt.yaw = 0; rt.pitch = 0; rt.secondWind = false;
  game.set({ inRoom: s.userId, inLab: false, panel: null, decorMode: false });
}
export function sleepInBed() {
  const s = game.get();
  if (s.sleeping || s.decorMode || s.inRoom !== s.userId) return;
  game.set({ sleeping: Date.now(), prompt: "" }); rt.vel.set(0, 0, 0);
  setTimeout(() => { game.set({ health: maxHealth(game.get().save) }); sfx.heal(); }, SLEEP_MS);
  setTimeout(() => game.set({ sleeping: 0 }), SLEEP_MS + 500);
}