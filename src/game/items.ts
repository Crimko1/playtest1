import { ITEMS } from "./data";
import { game, maxSlots, type InvItem } from "./store";
import { rt } from "./runtime";
import { sfx } from "./audio";

export function normInv(inv: InvItem[], n: number) {
  const a = inv.slice(0, n);
  while (a.length < n) a.push(null);
  return a;
}

export function canFit(id: string) {
  const s = game.get().save; const inv = normInv(s.inventory, maxSlots(s));
  return ITEMS[id].slots === 2 ? inv.some((x, i) => !x && i + 1 < inv.length && !inv[i + 1]) : inv.some((x) => !x);
}
/** remove the first matching item that was just added (rollback) */
export function removeItemById(id: string) {
  const inv = [...game.get().save.inventory]; const i = inv.findIndex((x) => x?.id === id);
  if (i < 0) return; inv[i] = null; if (inv[i + 1]?.id === "__big") inv[i + 1] = null; game.setSave({ inventory: inv });
}
/** add to inventory; 2-slot items take slot i and i+1 */
export function addItem(id: string, extra: Partial<NonNullable<InvItem>> = {}) {
  const s = game.get().save;
  const inv = normInv(s.inventory, maxSlots(s));
  const def = ITEMS[id];
  // prefer selected slot
  const order = [game.get().slot, ...inv.map((_, i) => i)];
  if (def.scrap && !(s.scrapsFound ?? []).includes(id) && canFit(id)) game.setSave({ scrapsFound: [...(s.scrapsFound ?? []), id] });
  for (const i of order) {
    if (def.slots === 1 && !inv[i]) { inv[i] = { id, ...extra }; game.setSave({ inventory: inv }); sfx.pickup(); return true; }
    if (def.slots === 2 && i + 1 < inv.length && !inv[i] && !inv[i + 1]) {
      inv[i] = { id, ...extra }; inv[i + 1] = { id: "__big" }; game.setSave({ inventory: inv }); sfx.pickup(); return true;
    }
  }
  game.toast(def.slots === 2 ? "Needs 2 free slots side by side" : "Inventory full");
  return false;
}

export function heldIndex() {
  const s = game.get();
  const inv = s.save.inventory;
  let i = s.slot;
  if (inv[i]?.id === "__big" && i > 0) i -= 1;
  return i;
}
export function held() {
  const i = heldIndex();
  const it = game.get().save.inventory[i];
  return it && it.id !== "__big" ? it : null;
}

export function removeAt(i: number) {
  const s = game.get().save;
  const inv = [...s.inventory];
  const it = inv[i];
  if (!it) return null;
  inv[i] = null;
  if (ITEMS[it.id]?.slots === 2 && inv[i + 1]?.id === "__big") inv[i + 1] = null;
  game.setSave({ inventory: inv });
  return it;
}

export function updateHeld(patch: Partial<NonNullable<InvItem>> | null) {
  const i = heldIndex();
  const s = game.get().save;
  const inv = [...s.inventory];
  if (!inv[i]) return;
  if (patch === null) { removeAt(i); return; }
  const item = inv[i]; if (!item) return;
  inv[i] = { ...item, ...patch };
  game.setSave({ inventory: inv });
}

export function dropHeld() {
  const i = heldIndex();
  const it = removeAt(i);
  if (!it) return;
  const f = { x: -Math.sin(rt.yaw), z: -Math.cos(rt.yaw) };
  rt.dropped.push({ ...it, at: Date.now(), key: "d" + Date.now() + Math.random(), x: rt.pos.x + f.x * 0.9, y: 0, z: rt.pos.z + f.z * 0.9 });
  sfx.drop();
}

export function dropAllAtDeath() {
  const s = game.get().save;
  s.inventory.forEach((it, i) => {
    if (it && it.id !== "__big") rt.dropped.push({ ...it, at: Date.now(), key: "x" + Date.now() + i, x: rt.pos.x + (i - 1) * 0.6, y: 0, z: rt.pos.z + 0.3 });
  });
  game.setSave({ inventory: s.inventory.map(() => null) });
}
