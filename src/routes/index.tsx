import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useGame, game } from "@/game/store";
import { GameCanvas } from "@/game/Scene";
import { HUD, Panels } from "@/game/UI";
import { Intro, Auth, Menu, Create, Drop } from "@/game/Screens";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Backrooms Q — Grace Studios" },
      { name: "description", content: "A first-person PS2-style multiplayer backrooms horror game. Scavenge scrap, meet the quota, survive the entities." },
      { property: "og:title", content: "Backrooms Q" },
      { property: "og:description", content: "Liminal PS2-style multiplayer horror in the backrooms." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;700&family=VT323&display=swap" },
    ],
  }),
  component: GamePage,
});

function GamePage() {
  const screen = useGame((s) => s.screen);
  const vhs=useGame(s=>s.save.vhs!==false);
  useEffect(() => {
    try { const v = JSON.parse(localStorage.getItem("brq_vol") || "null"); if (v) game.set({ musicVol: v.mv, sfxVol: v.sv }); } catch { /* ignore */ }
    const { data } = supabase.auth.onAuthStateChange((ev, sess) => {
      if (ev === "SIGNED_IN" || ev === "SIGNED_OUT") {
        game.set({ userId: sess?.user.id ?? null });
        if (game.get().screen === "auth" && sess) game.set({ screen: "menu" });
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return (
    <div className="fixed inset-0 bg-background select-none">
      <GameCanvas />
      {screen === "intro" && <Intro />}
      {screen === "auth" && <Auth />}
      {screen === "menu" && <Menu />}
      {screen === "create" && <Create />}
      {screen === "drop" && <Drop />}
       {screen === "game" && <>{vhs&&<div className="crt vhs" />}<HUD /><Panels /></>}
    </div>
  );
}
