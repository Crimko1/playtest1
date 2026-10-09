import { supabase } from "@/integrations/supabase/client";
import { emptySave, game, registerSaver, todayStr, type Save } from "./store";
import { upgradeRoom } from "./save-upgrade";

export async function loadPlayer(userId: string) {
  const { data } = await supabase.from("players").select("*").eq("id", userId).maybeSingle();
  if (data && (data.save as any)?.created) {
    const save = await upgradeRoom({ ...emptySave(), ...(data.save as unknown as Save) }, userId);
    game.set({ save });
    await writeSave(save);
    localStorage.setItem("brq_has_save", "1");
  } else {
    game.set({ save: emptySave() });
    localStorage.removeItem("brq_has_save");
  }
}

export async function writeSave(s: Save) {
  const uid = game.get().userId;
  if (!uid) return;
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
    if (!data || !data.completed) {
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
