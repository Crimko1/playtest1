import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { game, todayStr, addXp } from "./store";
import { rt } from "./runtime";
import { fetchPlayer } from "./cloud";
import { sfx } from "./audio";
import { isUpper } from "./upper-world";

export type Remote = {
  id: string; name: string; lvl: number; x: number; y: number; z: number; yaw: number; held: string;
  outfit: string; where: string; moving: number; t: number; avatar?: string;
};
export const remotes = new Map<string, Remote>();
let ch: RealtimeChannel | null = null;
let quotaCh: RealtimeChannel | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let lastAvatar: string | null = null;

export function where() {
  const s = game.get();
  return s.inRoom ? `room:${s.inRoom}` : isUpper(rt.pos.x,rt.pos.y,rt.pos.z) ? "upper" : "world";
}

export function connectNet() {
  const uid = game.get().userId;
  if (!uid || ch) return;
  ch = supabase.channel("brq-world", { config: { broadcast: { self: false }, presence: { key: uid } } });
  ch.on("broadcast", { event: "p" }, ({ payload }) => {
    const p = payload as Remote;
    const prev = remotes.get(p.id);
    remotes.set(p.id, { ...p, avatar: prev?.avatar, t: Date.now() });
    if (!prev) fetchPlayer(p.id).then((d) => { const r = remotes.get(p.id); if (r && d) r.avatar = d.avatar_url ?? ""; });
  });
  ch.on("broadcast", { event: "profile" }, ({ payload }) => {
    const profile = payload as { id: string; avatar: string };
    const r = remotes.get(profile.id); if (r) r.avatar = profile.avatar;
  });
  ch.on("broadcast", { event: "pick" }, ({ payload }) => { rt.picked.add((payload as any).key); });
  ch.on("presence", { event: "leave" }, ({ key }) => { remotes.delete(key); });
  ch.subscribe((st) => { if (st === "SUBSCRIBED") ch?.track({ at: Date.now() }); });
  timer = setInterval(() => {
    const s = game.get();
    if (s.screen !== "game" || !ch) return;
    if (lastAvatar !== s.save.avatar) { lastAvatar = s.save.avatar; ch.send({ type: "broadcast", event: "profile", payload: { id: uid, avatar: s.save.avatar } }); }
    const inv = s.save.inventory[s.slot];
    ch.send({
      type: "broadcast", event: "p",
      payload: {
        id: uid, name: s.save.name, lvl: s.save.level, x: rt.pos.x, y: rt.pos.y, z: rt.pos.z, yaw: rt.yaw,
        held: inv && inv.id !== "__big" ? inv.id : "", outfit: s.save.outfit, where: where(), moving: rt.moving,
      },
    });
    for (const [k, r] of remotes) if (Date.now() - r.t > 6000) remotes.delete(k);
  }, 100);

  quotaCh = supabase.channel("brq-quota").on("postgres_changes", { event: "*", schema: "public", table: "daily_quota" }, ({ new: n }) => {
    const d = n as any; if (!d?.day) return;
    const prev = game.get().quota;
    game.set({ quota: { target: d.target, progress: d.progress, completed: d.completed, day: d.day } });
    if (d.completed && !prev.completed) onQuotaComplete();
  }).subscribe();
}

export function onQuotaComplete() {
  const s = game.get().save; const today = todayStr();
  game.set({ quotaFlash: Date.now() });
  sfx.ding();
  if ((s as any).contribDay === today && !s.quotaDays.includes(today)) {
    game.setSave({ quotaDays: [...s.quotaDays, today], trophies: s.trophies + 1 });
    addXp(40);
    game.toast("QUOTA FULFILLED — +40 XP, +1 Trophy");
  }
}

export function sendPick(key: string) { ch?.send({ type: "broadcast", event: "pick", payload: { key } }); }

export function disconnectNet() {
  if (timer) clearInterval(timer);
  if (ch) supabase.removeChannel(ch);
  if (quotaCh) supabase.removeChannel(quotaCh);
  ch = null; quotaCh = null; timer = null; lastAvatar = null; remotes.clear();
}
