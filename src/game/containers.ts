import { supabase } from "@/integrations/supabase/client";
import { game, type InvItem } from "./store";
import { STORAGE_SLOTS, canStoreTool } from "./rules";
export async function readContainer(id: string): Promise<InvItem[]> {
  const uid = game.get().userId; if (!uid) throw new Error("Sign in to open storage");
  const { data, error } = await supabase.from("room_containers").select("items").eq("id", id).eq("owner_id", uid).maybeSingle();
  if (error) throw error;
  return (data?.items as InvItem[] | undefined) ?? [];
}
export async function writeContainer(id: string, items: InvItem[]) {
  const uid = game.get().userId; if (!uid || game.get().inRoom !== uid) throw new Error("Only the owner can change storage");
  if (items.length > STORAGE_SLOTS || items.some(it => it && !canStoreTool(it.id, 0))) throw new Error("Storage accepts ten tools only");
  const { error } = await supabase.from("room_containers").upsert({ id, owner_id: uid, items: items as never, updated_at: new Date().toISOString() });
  if (error) throw error;
}