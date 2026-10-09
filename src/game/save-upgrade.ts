import type { Save, Placed } from "./store";
import { supabase } from "@/integrations/supabase/client";
export async function upgradeRoom(save: Save, uid: string): Promise<Save> {
  if (save.roomVersion >= 1) return save;
  const dogs = save.decorOwned.filter(id => id === "doghouse").length + save.room.filter(p => p.id === "doghouse").length;
  const room: Placed[] = save.room.filter(p => p.id !== "doghouse").map((p, i) => ({ ...p, key: p.key ?? `${uid}-legacy-${i}` }));
  const storage = save.storage.filter(it => it && it.id !== "__big");
  for (let i = 0; i < storage.length; i += 10) {
    const key = `${uid}-legacy-storage-${i / 10}`;
    const { error } = await supabase.from("room_containers").upsert({ id: key, owner_id: uid, items: storage.slice(i, i + 10) as never });
    if (error) throw error;
    room.push({ id: "storagebox", key, x: 501 + (i / 10 % 4) * 1.8, z: 501 + Math.floor(i / 40) * 1.2, r: 0 });
  }
  if (!room.some(p => p.id === "bed")) room.push({ id: "bed", key: `${uid}-starter-bed`, x: 501.4, z: 506.5, r: 0 });
  return { ...save, room, storage: [], roomVersion: 1, money: save.money + dogs * 1800, decorOwned: save.decorOwned.filter(id => id !== "doghouse") };
}