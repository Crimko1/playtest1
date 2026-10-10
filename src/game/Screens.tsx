import studioLogo from "@/assets/studio-logo.png";
import gameLogo from "@/assets/game-logo-final.png";
import { useEffect, useRef, useState } from "react";
import { game, useGame, emptySave } from "./store";
import { TREES, VERSION, type TreeId } from "./data";
import { Options } from "./UI";
import { initAudio, startAmbience, sfx, playIntro } from "./audio";
import { loadPlayer, writeSave, refreshQuota, checkDayRollover } from "./cloud";
import { connectNet } from "./net";
import { rt } from "./runtime";
import { Button } from "@/components/ui/button";
import { toAvatar } from "./avatar";
import { playScreen } from "./rules";
import { spawnInRoom } from "./room-actions";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const LOOP_START = 4000, HEADPHONE_MS = 6000;
function Headphones({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t0 = performance.now(); let raf = 0, last = 0;
    const tick = () => {
      const t = performance.now() - t0;
      if (t >= HEADPHONE_MS + 600) { onDone(); return; }
      if (t > LOOP_START) { const gap = Math.max(12, 380 - (t - LOOP_START) * 0.32); if (t - last > gap) { last = t; setN((v) => v + 1 + Math.floor((t - LOOP_START) / 500)); } }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [onDone]);
  return (
    <div className="absolute inset-0 overflow-hidden flex items-start justify-start p-[6vmin] logo-fade" style={{ ["--d" as string]: "6.6s" }}>
      <p className="font-hud text-foreground text-2xl leading-snug break-words">
        <span aria-hidden className="mr-3">🎧</span>For better experience, play with headphones.{Array.from({ length: Math.min(n, 900) }, () => " ... loop").join("")}
      </p>
    </div>
  );
}

export function Intro() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const snd = playIntro();
    const a = setTimeout(() => setStep(1), 5000);
    const b = setTimeout(() => setStep(2), 8000);
    return () => { clearTimeout(a); clearTimeout(b); snd?.pause(); };
  }, []);
  useEffect(() => {
    if (step !== 3) return;
    initAudio();
    supabase.auth.getSession().then(({ data }) => game.set({ screen: data.session ? "menu" : "auth", userId: data.session?.user.id ?? null }));
  }, [step]);
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center" onClick={() => setStep((s) => (s < 2 ? 2 : 3))}>
      {step === 0 && <img src={studioLogo} alt="Grace Studios" className="logo-fade w-[42vmin]" style={{ ["--d" as string]: "5s" }} />}
      {step === 1 && <img src={gameLogo} alt="Backrooms Q" className="logo-fade w-[60vmin]" style={{ ["--d" as string]: "3s" }} />}
      {step === 2 && <Headphones onDone={() => setStep(3)} />}
      <span className="absolute bottom-4 right-6 text-muted-foreground font-hud">click to skip</span>
    </div>
  );
}

export function Auth() {
  const [err, setErr] = useState("");
  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-6 font-menu crt">
      <img src={gameLogo} alt="Backrooms Q" className="w-[44vmin] to-menu" />
      <p className="text-muted-foreground max-w-md text-center">Sign in so your progress is saved to the cloud and you can join the live server with everyone else.</p>
      <button className="menu-btn border border-primary text-2xl" onClick={async () => {
        const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
        if (r.error) setErr(String((r.error as any).message ?? r.error));
      }}>CONTINUE WITH GOOGLE</button>
      {err && <p className="text-destructive">{err}</p>}
    </div>
  );
}

export function Menu() {
  const uid = useGame((s) => s.userId);
  const created = useGame((s) => s.save.created);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<"main" | "options">("main");
  useEffect(() => {
    if (!uid) return; let stop = false;
    const tryLoad = () => loadPlayer(uid).then(() => { if (!stop) setLoaded(true); }).catch(() => { if (stop) return; game.toast("Connecting to your save…"); setTimeout(tryLoad, 3000); });
    tryLoad(); return () => { stop = true; };
  }, [uid]);
  const begin = () => { initAudio(); startAmbience(); };
  // start menu music on the first click/key anywhere (browsers block sound before that)
  useEffect(() => {
    const go = () => initAudio();
    window.addEventListener("pointerdown", go, { once: true });
    window.addEventListener("keydown", go, { once: true });
    return () => { window.removeEventListener("pointerdown", go); window.removeEventListener("keydown", go); };
  }, []);
  return (
    <div className="fixed inset-0 z-10 font-menu crt pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
      <div className="relative pointer-events-auto h-full flex flex-col justify-center pl-[8vw] gap-10 to-menu">
        <img src={gameLogo} alt="Backrooms Q" className="w-[min(460px,40vw)] glitch" />
        {view === "main" && (
          <div className="flex flex-col gap-2 text-3xl w-[min(420px,40vw)]">
            <Button variant="ghost" className="menu-btn justify-start h-auto text-3xl" disabled={!loaded} onMouseEnter={() => sfx.hover()} onClick={() => { begin(); game.set({ screen: playScreen(created) }); }}>PLAY</Button>
            <button className="menu-btn" onMouseEnter={() => sfx.hover()} onClick={() => setView("options")}>OPTIONS</button>
          </div>
        )}
        {view === "options" && <Options onBack={() => setView("main")} />}
      </div>
      <span className="absolute bottom-4 right-6 text-muted-foreground font-hud text-lg">{VERSION}</span>
    </div>
  );
}

export function Create() {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [imageError, setImageError] = useState("");
  const [tree, setTree] = useState<TreeId | null>(null);
  const [info, setInfo] = useState<TreeId | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const ok = name.trim().length >= 2 && avatar && tree;
  return (
    <div className="fixed inset-0 bg-background font-menu crt flex items-center justify-center">
      <div className="panel p-8 w-[min(900px,95vw)] grid grid-cols-[240px_1fr] gap-8">
        <div>
          <button onClick={() => file.current?.click()} className="slot w-full aspect-square flex items-center justify-center overflow-hidden relative">
            {avatar ? <img src={avatar} className="w-full h-full object-cover opacity-80" alt="" /> : <span className="text-muted-foreground">UPLOAD FACE<br />png · jpg · gif</span>}
            <div className="absolute inset-0 bg-gradient-to-b from-foreground/10 to-background/50 pointer-events-none" />
          </button>
          <input ref={file} type="file" accept="image/png,image/jpeg,image/gif" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { setAvatar(await toAvatar(f)); setImageError(""); } catch (error) { setImageError(error instanceof Error ? error.message : "Could not load image"); } } }} />
          {imageError && <p className="text-destructive mt-2">{imageError}</p>}
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="text-3xl tracking-[.2em] text-primary">IDENTIFICATION</h2>
          <input value={name} maxLength={16} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="bg-card border border-border px-3 py-2 text-2xl outline-none focus:border-primary" />
          <h3 className="text-xl text-muted-foreground tracking-widest">SKILL TREE</h3>
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(TREES) as TreeId[]).map((k) => (
              <div key={k} className={`slot p-3 cursor-pointer ${tree === k ? "slot-on" : ""}`} onClick={() => setTree(k)}>
                <div className="text-xl">{TREES[k].name}</div>
                <button className="text-sm text-primary underline" onClick={(e) => { e.stopPropagation(); setInfo(info === k ? null : k); }}>details</button>
              </div>
            ))}
          </div>
          {info && (
            <div className="panel p-4 text-sm">
              <div className="text-primary text-lg mb-1">{TREES[info].name}</div>
              <p className="text-muted-foreground mb-2">{TREES[info].blurb}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">{TREES[info].stats.map(([l, v]) => <div key={l} className="flex items-center gap-2"><span className="w-24">{l}</span><div className="flex-1 h-2 bg-card border border-border"><div className="h-full bg-primary" style={{ width: `${v * 10}%` }} /></div></div>)}</div>
              <ol className="grid grid-cols-2 gap-x-4 list-decimal list-inside">{TREES[info].skills.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </div>
          )}
          <button disabled={!ok} className="menu-btn border border-primary text-2xl self-end" onClick={async () => {
            if (!tree || !ok) return;
            const s = { ...emptySave(), created: true, name: name.trim(), avatar, tree, skills: { [tree]: 0 } };
            game.set({ save: s }); await writeSave(s); game.set({ screen: "drop" });
          }}>DONE</button>
        </div>
      </div>
    </div>
  );
}

export function Drop() {
  const [phase, setPhase] = useState(0);
  const [pct, setPct] = useState(0);
  useEffect(() => {
    sfx.click();
    const t = [setTimeout(() => { setPhase(1); sfx.door(); }, 600), setTimeout(() => setPhase(3), 1800)];
    const start = Date.now() + 1800; const dur = 9000;
    const iv = setInterval(() => setPct(Math.max(0, Math.min(1, (Date.now() - start) / dur))), 100);
    const end = setTimeout(async () => {
      await Promise.all([refreshQuota(), checkDayRollover()]).catch(() => {});
      connectNet();
      game.set({ screen: "game", panel: null });
      // spawn after the menu camera has stopped moving the player
      requestAnimationFrame(() => requestAnimationFrame(() => spawnInRoom()));
      rt.lockRequest();
    }, 1800 + dur);
    return () => { t.forEach(clearTimeout); clearTimeout(end); clearInterval(iv); };
  }, []);
  return (
    <div className="fixed inset-0 z-10 font-hud crt">
      <div className={`absolute inset-0 bg-background transition-opacity duration-[1200ms] ${phase >= 1 ? "opacity-100" : "opacity-0"}`} />
      {phase === 3 && (
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-16 gap-3 loading-fade">
          <img src={gameLogo} className="w-48 opacity-60 mb-auto mt-[30vh]" alt="" />
          <p className="text-primary text-2xl">{pct < 0.3 ? "Falling through the floor…" : pct < 0.7 ? "Reality is noclipping…" : "Waking in your room…"}</p>
          <div className="w-80 h-2 bg-card border border-border"><div className="h-full bg-primary" style={{ width: `${pct * 100}%` }} /></div>
        </div>
      )}
    </div>
  );
}
