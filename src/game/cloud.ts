import { supabase } from "@/integrations/supabase/client";
import { emptySave, game, registerSaver, todayStr, type Save } from "./store";
import { upgradeRoom } from "./save-upgrade";
import { REMOVED_DECOR, REMOVED_ITEMS } from "./rules";

const backupKey = (uid: string) => `brq_save_backup_${uid}`;
let loadedFor: string | null = null;

/** Drop removed items/decor so old saves never break, but keep everything else. */
export function sanitizeSave(s: Save): Save {
  const okDecor = (id: string) => !REMOVED_DECOR.includes(id);
  return {
    ...s,
    inventory: s.inventory.map((i) => (i && REMOVED_ITEMS.includes(i.id) ? null : i)),
    storage: s.storage.filter((i) => !i || !REMOVED_ITEMS.includes(i.id)),
    decorOwned: s.decorOwned.filter(okDecor),
    room: s.room.filter((p) => okDecor(p.id)),
  };
}

export async function loadPlayer(userId: string) {
  let backup: Save | null = null;
  try { const raw = localStorage.getItem(backupKey(userId)); if (raw) backup = JSON.parse(raw); } catch { backup = null; }
  // Retry on network/server errors: never treat a failed read as "no character".
  let data: any = null, error: unknown = null;
  for (let i = 0; i < 4; i++) {
    const r = await supabase.from("players").select("*").eq("id", userId).maybeSingle();
    data = r.data; error = r.error;
    if (!error) break;
    await new Promise((res) => setTimeout(res, 800 * (i + 1)));
  }
  const cloud = data && (data.save as any)?.created ? (data.save as Save) : null;
  if (error && !backup) throw error; // keep the menu waiting rather than showing "create character"
  const cloudT = Date.parse(data?.updated_at ?? "") || 0;
  const pick = cloud && (!backup?.created || cloudT >= ((backup as any)._t ?? 0)) ? cloud : backup?.created ? backup : null;
  if (pick) {
    const save = sanitizeSave(await upgradeRoom({ ...emptySave(), ...pick }, userId));
    loadedFor = userId;
    game.set({ save });
    await writeSave(save);
    localStorage.setItem("brq_has_save", "1");
  } else {
    loadedFor = userId;
    game.set({ save: emptySave() });
    localStorage.removeItem("brq_has_save");
  }
}

export async function writeSave(s: Save) {
  const uid = game.get().userId;
  if (!uid || !s.created || loadedFor !== uid) return; // never overwrite a save we have not loaded
  try { localStorage.setItem(backupKey(uid), JSON.stringify({ ...s, _t: Date.now() })); } catch { /* storage full */ }
  await supabase.from("players").upsert({
    id: uid, name: s.name, avatar_url: s.avatar, level: s.level, trophies: s.trophies,
    room: s.room as any, save: s as any, updated_at: new Date().toISOString(),
  });
  localStorage.setItem("brq_has_save", "1");
}
registerSaver(writeSave);

export async function deleteSave() {
  const uid = game.get().userId;
  if (!uid) return;
  await supabase.from("players").delete().eq("id", uid);
  localStorage.removeItem(backupKey(uid));
  localStorage.removeItem("brq_has_save");
}

export async function refreshQuota() {
  const { data } = await supabase.rpc("get_today_quota");
  if (data) {
    const d = data as any;
    game.set({ quota: { target: d.target, progress: d.progress, completed: d.completed, day: d.day } });
  }
}

export async function deposit(amount: number) {
  const { data, error } = await supabase.rpc("deposit_scrap", { amount });
  if (error) { game.toast("Extractor offline — try again"); return null; }
  const d = data as any;
  game.set({ quota: { target: d.target, progress: d.progress, completed: d.completed, day: d.day } });
  return d;
}

/** Called at load and every minute: apply end-of-day penalty if yesterday's quota failed */
export async function checkDayRollover() {
  const s = game.get().save;
  if (!s.created) return;
  const today = todayStr();
  if (s.lastDay && s.lastDay !== today) {
    const { data } = await supabase.from("daily_quota").select("completed").eq("day", s.lastDay).maybeSingle();
    if (data && !data.completed) {
      game.setSave({ inventory: s.inventory.map(() => null), money: 0, lastDay: today });
      game.toast("Yesterday's quota failed. Your items and money were taken.");
      return;
    }
  }
  if (s.lastDay !== today) game.setSave({ lastDay: today });
}

export async function fetchLeaderboard() {
  const uid = game.get().userId;
  const fields = "id,name,avatar_url,level,total_quota" as const;
  const { data, error } = await supabase.from("players").select(fields).order("total_quota", { ascending: false }).order("id").limit(10);
  if (error) throw error;
  if (!uid) return { top: data ?? [], me: null, rank: null };
  const { data: me, error: meError } = await supabase.from("players").select(fields).eq("id", uid).maybeSingle();
  if (meError) throw meError;
  if (!me) return { top: data ?? [], me: null, rank: null };
  const [higher, tied] = await Promise.all([
    supabase.from("players").select("id", { count: "exact", head: true }).gt("total_quota", me.total_quota),
    supabase.from("players").select("id", { count: "exact", head: true }).eq("total_quota", me.total_quota).lt("id", uid),
  ]);
  if (higher.error || tied.error) throw higher.error ?? tied.error;
  return { top: data ?? [], me, rank: (higher.count ?? 0) + (tied.count ?? 0) + 1 };
}
export async function fetchRooms() {
  const { data } = await supabase.from("players").select("id,name,avatar_url,level,room").order("name").limit(500);
  return data ?? [];
}
export async function fetchPlayer(id: string) {
  const { data } = await supabase.from("players").select("id,name,avatar_url,level,room,save").eq("id", id).maybeSingle();
  return data;
}
