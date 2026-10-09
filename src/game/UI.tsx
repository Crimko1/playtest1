import { bots, minions } from "./Entities";
import { XP_PER_LEVEL, radarOffset } from "./rules";
import { ScrapSelector, ThemeSelector, BlueprintPanel, ProjectorPanel } from "./alpha-panels";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGame, game, maxSlots, maxHealth, skillCount, todayStr } from "./store";
import { ContainerPanel, ArtworkPanel, PaperMap } from "./RoomPanels";
import { ITEMS, SCRAP_IDS, SHOP_TOOLS, DECOR, OUTFITS, TREES, ENTITIES, VERSION, type TreeId, type EntityId } from "./data";
import { rt } from "./runtime";
import { normInv, removeAt, addItem, held } from "./items";
import { fetchRooms } from "./cloud";
import { PROOM } from "./world";
import { sfx } from "./audio";
import { remotes } from "./net";
import { toAvatar } from "./avatar";
import { Button } from "@/components/ui/button";
import { Canvas } from "@react-three/fiber";
import { Character } from "./Character";

const close = () => { game.set({ panel: null }); rt.lockRequest(); };

function Bar({ v, max, cls, label }: { v: number; max: number; cls: string; label: string }) {
  return (
    <div className="w-56">
      <div className="flex justify-between text-sm text-muted-foreground"><span>{label}</span><span>{Math.round(v)}</span></div>
      <div className="h-2 bg-card border border-border"><div className={`h-full ${cls}`} style={{ width: `${Math.max(0, Math.min(100, (v / max) * 100))}%` }} /></div>
    </div>
  );
}

export function HUD() {
  const s = useGame((x) => x);
  const n = maxSlots(s.save);
  const inv = normInv(s.save.inventory, n);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((v) => v + 1), 500); return () => clearInterval(t); }, []);
  const hurt = Date.now() - rt.lastHurt < 400;
  const showToast = Date.now() - s.toastT < 3500;
  const flash = Date.now() - s.quotaFlash < 4000;
  const selected=inv[s.slot]?.id === "__big" ? inv[s.slot-1] : inv[s.slot];
  const heldDef=selected?ITEMS[selected.id]:null;
  if(s.jumpscare)return <div className="fixed inset-0 z-50"><Jumpscare id={s.jumpscare}/></div>;
  if(s.panel==="dead")return null;
  return (
    <div className="font-hud fixed inset-0 pointer-events-none z-20 text-foreground text-xl">
      {hurt && <div className="absolute inset-0 bg-destructive/30" />}
      <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 bg-primary/80" />
      {s.prompt && <div className="absolute left-1/2 top-[56%] -translate-x-1/2 text-primary text-2xl drop-shadow">{s.prompt}</div>}
       <div className="hud-vitals absolute left-5 top-20 space-y-2">
        <Bar v={s.health} max={maxHealth(s.save)} cls="bg-destructive" label="HEALTH" />
        <Bar v={s.stamina} max={100} cls={s.adrenaline > Date.now() ? "bg-success" : "bg-primary"} label="STAMINA" />
        <Bar v={s.battery} max={100} cls="bg-foreground" label={`FLASHLIGHT ${s.flashlight ? "ON" : "OFF"}`} />
      </div>
       <div className="hud-inventory absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
         {heldDef&&<div className="absolute bottom-full left-1/2 mb-2 w-max max-w-[90vw] -translate-x-1/2 text-center text-primary">{heldDef.name}{heldDef.scrap?` · $${heldDef.value}`:""}</div>}
        {inv.map((it, i) => {
          if (it?.id === "__big") return null;
          const big = it && ITEMS[it.id]?.slots === 2;
          return (
            <div key={i} className={`slot ${i === s.slot || (big && s.slot === i + 1) ? "slot-on" : ""} ${big ? "w-40" : "w-[76px]"} h-[76px] relative flex items-center justify-center`}>
              {it && <img src={ITEMS[it.id].img} className="pix max-h-16" alt="" />}
              <span className="absolute left-1 top-0 text-sm text-muted-foreground">{i + 1}</span>
              {it?.id === "pistol" && <span className="absolute right-1 bottom-0 text-sm">{it.ammo ?? 12}/12</span>}
              {it?.id === "axe" && <span className="absolute right-1 bottom-0 text-sm">{it.uses ?? 100}</span>}
              {it?.id === "pipe" && <span className="absolute right-1 bottom-0 text-sm">{it.uses ?? 20}/20</span>}
            </div>
          );
        })}
      </div>
      <div className="absolute left-5 top-4 text-lg">
        <div className="text-primary">{s.save.name} · LV {s.save.level} · ${s.save.money}</div>
        <div className="text-muted-foreground">XP {s.save.xp}/{XP_PER_LEVEL} {s.save.points > 0 && <span className="text-primary">· {s.save.points} skill point</span>}</div>
        {s.coords && <div className="text-success mt-1">{s.coords}</div>}
      </div>
       <div className={`hud-quota absolute right-5 top-4 text-right ${s.quota.completed ? "text-success" : "text-primary"}`}>
        <div>QUOTA ${s.quota.progress} / ${s.quota.target}</div>
        <div className="text-muted-foreground text-base">resets at midnight · {s.inLab ? "LABORATORY — SAFE" : s.inRoom ? "PERSONAL ROOM" : rt.pos.y>=12?"LEVEL 94 — SAFE":"THE BACKROOMS"}</div>
      </div>
      {showToast && <div className="absolute left-1/2 top-24 -translate-x-1/2 bg-card/80 border border-border px-4 py-1 text-primary">{s.toast}</div>}
      {flash && (
        <div className="absolute inset-0 bg-success/25 flex flex-col items-center justify-center text-success">
          <div className="text-7xl">✔</div><div className="text-5xl">${s.quota.progress} / ${s.quota.target}</div><div className="text-2xl">QUOTA FULFILLED</div>
        </div>
      )}
      {s.jumpscare && <Jumpscare id={s.jumpscare} />}
      <RadarOverlay />
      {s.terrified>Date.now()&&<div className="terror-overlay absolute inset-0"/>}
      {s.glitch > 0 && <div className="absolute inset-0 bg-background pointer-events-none glitch-hole flex items-center justify-center text-destructive text-3xl tracking-[0.5em]">{Date.now() - s.glitch < 400 ? "E̷R̸R̵O̴R̷" : ""}</div>}
      <div className={`absolute inset-0 bg-background transition-opacity duration-500 flex items-center justify-center text-muted-foreground text-2xl ${s.sleeping ? "opacity-100" : "opacity-0"}`}>{s.sleeping ? "z z z" : ""}</div>
    </div>
  );
}

function Jumpscare({ id }: { id: EntityId | "minion" }) {
  const img = id === "minion" ? "/items/cotton.png" : ENTITIES[id].img;
  const filt: Record<string, string> = { uncanny: "contrast(1.6)", thirsty: "saturate(2) contrast(1.4)", not: "invert(1) contrast(2)", unknown: "contrast(2) brightness(.8)", maka: "sepia(.6) contrast(1.5)", minion: "contrast(2)" };
  return (
    <div className="absolute inset-0 bg-background flex items-center justify-center overflow-hidden">
      <img src={img} alt="" className="scare w-[80vmin]" style={{ filter: filt[id] }} />
      <div className="blood-splatter" aria-hidden="true">{Array.from({length: 18}, (_,i) => <i key={i} style={{left:`${(i*37)%100}%`,top:`${(i*23)%100}%`,width:`${12+i%5*9}px`,height:`${25+i%4*18}px`,transform:`rotate(${i*29}deg)`}} />)}</div>
    </div>
  );
}

function Shell({ title, children, wide }: { title: string; children: import("react").ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-background/60 font-menu">
      <div className={`panel ${wide ? "w-[min(1100px,95vw)]" : "w-[min(760px,95vw)]"} h-[88dvh] overflow-hidden p-6 flex flex-col game-panel`}>
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-3xl tracking-[.2em] text-primary uppercase">{title}</h2>
           <Button variant="ghost" className="menu-btn" onClick={close}>CLOSE [{title==="Status"?"TAB":"ESC"}]</Button>
        </div>
        <div className="panel-body min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

function Inventory() {
  const s = useGame((x) => x);
  const n = maxSlots(s.save); const inv = normInv(s.save.inventory, n);
  const [sel, setSel] = useState<number | null>(null);
  return (
    <Shell title="Status" wide>
      <div className="grid grid-cols-[260px_1fr] gap-6 panel-split">
        <div className="slot aspect-square flex items-center justify-center bg-success/10 border-success/50">
          {s.save.avatar ? <img src={s.save.avatar} className="w-full h-full object-cover opacity-80" alt="" /> : null}
        </div>
        <div>
          <div className="flex gap-3 flex-wrap">
            {inv.map((it, i) => it?.id === "__big" ? null : (
              <button key={i} onClick={() => setSel(i)} className={`slot ${sel === i ? "slot-on" : ""} ${it && ITEMS[it.id].slots === 2 ? "w-72" : "w-36"} h-40 flex flex-col items-center justify-center`}>
                {it ? <><img src={ITEMS[it.id].img} className="pix max-h-24" alt="" /><span className="mt-2 text-lg">{ITEMS[it.id].name}</span>
                  <span className="text-sm text-muted-foreground">{ITEMS[it.id].scrap ? `$${ITEMS[it.id].value}` : "tool"} · {ITEMS[it.id].slots} slot</span></> : <span className="text-muted-foreground">empty</span>}
              </button>
            ))}
          </div>
          {sel !== null && inv[sel] && (
            <div className="mt-3 flex gap-2">
              <button className="menu-btn border border-border" onClick={() => { game.set({ slot: sel }); close(); }}>HOLD</button>
              <button className="menu-btn border border-border" onClick={() => { game.set({ slot: sel }); import("./items").then((m) => m.dropHeld()); setSel(null); }}>DROP</button>
            </div>
          )}
          <div className="mt-6 grid grid-cols-2 gap-x-8 text-lg text-muted-foreground">
            <div>Level <span className="text-foreground">{s.save.level}</span> · XP {s.save.xp}/{XP_PER_LEVEL}</div>
            <div>Money <span className="text-primary">${s.save.money}</span></div>
            <div>Skill tree <span className="text-foreground">{TREES[s.save.tree].name}</span></div>
            <div>Trophies <span className="text-foreground">{s.save.trophies}</span></div>
          </div>
          <p className="mt-6 text-xl"><span className="text-primary">Objective:</span> Bring scrap to the Extractor and meet today's quota of ${s.quota.target}. ${s.quota.progress} so far.</p>
          <p className="mt-4 text-sm text-muted-foreground">WSAD move · Shift run · F flashlight · E interact · hold LMB + drag doors · RMB use · Q drop · scroll switch · P decorate (your room)</p>
        </div>
      </div>
      <div className="mt-6 flex gap-2 border-t border-border pt-4">
        <button className="menu-btn" onClick={() => game.set({ panel: "options" })}>OPTIONS</button>
        <button className="menu-btn" onClick={() => { game.set({ panel: null, screen: "menu" }); }}>QUIT TO MENU</button>
        <span className="ml-auto text-muted-foreground self-center">{VERSION}</span>
      </div>
    </Shell>
  );
}

function Tree() {
  const save = useGame((s) => s.save);
  const [view, setView] = useState<TreeId>(save.tree);
  const t = TREES[view]; const n = skillCount(save, view);
  const unlocked = view === save.tree || save.unlockedTrees.includes(view);
  const unlockCost = 3;
  return (
    <Shell title="The Tree" wide>
      <div className="flex gap-2 mb-4">
        {(Object.keys(TREES) as TreeId[]).map((k) => (
          <button key={k} className={`menu-btn border ${view === k ? "border-primary" : "border-border"}`} onClick={() => setView(k)}>
            {TREES[k].name} {k === save.tree ? "· ACTIVE" : !save.unlockedTrees.includes(k) ? "· LOCKED" : ""}
          </button>
        ))}
        <span className="ml-auto self-center text-primary text-xl">{save.points} point{save.points === 1 ? "" : "s"}</span>
      </div>
      <p className="text-muted-foreground mb-4">{t.blurb}</p>
      <div className="flex flex-col gap-1 game-scroll min-h-0 overflow-y-auto flex-1">
        {t.skills.map((sk, i) => {
          const own = i < n; const next = i === n;
          return (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-3 h-8 ${own ? "bg-primary" : "bg-card border border-border"}`} />
              <div className={`flex-1 border px-3 py-1 ${own ? "border-primary text-primary" : next ? "border-foreground/40" : "border-border text-muted-foreground"}`}>{i + 1}. {sk}</div>
              {next && unlocked && view === save.tree && (
                <button disabled={save.points < 1} className="menu-btn border border-primary" onClick={() => { sfx.ding(); game.setSave({ points: save.points - 1, skills: { ...save.skills, [view]: n + 1 } }); }}>UNLOCK · 1 pt</button>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex gap-2">
        {!unlocked && <button disabled={save.points < unlockCost} className="menu-btn border border-primary" onClick={() => game.setSave({ points: save.points - unlockCost, unlockedTrees: [...save.unlockedTrees, view] })}>UNLOCK TREE · {unlockCost} pts</button>}
        {unlocked && view !== save.tree && <button className="menu-btn border border-primary" onClick={() => game.setSave({ tree: view, unlockedTrees: Array.from(new Set([...save.unlockedTrees, save.tree])) })}>SWITCH TO THIS TREE</button>}
      </div>
    </Shell>
  );
}

const DECOR_ICON = new Set(["fishtank", "painting", "cross", "storagebox", "plant", "custompaint", "stalkdevice"]);
function Shop() {
  const save = useGame((s) => s.save);
  const [tab, setTab] = useState("tools");
  const buy = (price: number, f: () => boolean) => {
    if (save.money < price) { game.toast("Not enough money"); sfx.hurt(); return; }
    if (f()) { game.setSave((s) => ({ money: s.money - price })); sfx.cash(); }
  };
  return (
    <Shell title="Shop" wide>
      <div className="text-primary text-xl mb-3">Balance ${save.money}</div>
      <div className="flex gap-3 mb-3"><Button variant={tab === "tools" ? "default" : "outline"} onClick={() => setTab("tools")}>TOOLS</Button><Button variant={tab === "decor" ? "default" : "outline"} onClick={() => setTab("decor")}>DECORATIONS</Button></div>
      <div className="game-scroll min-h-0 overflow-y-auto flex-1">
      {tab === "tools" && <>
      <div className="grid grid-cols-3 gap-3">
        {SHOP_TOOLS.map((t) => (
          <div key={t.id} className="slot p-3 flex gap-3 items-center">
            <img src={ITEMS[t.id].img} className="pix w-16" alt="" />
            <div className="flex-1"><div>{ITEMS[t.id].name}</div><div className="text-xs text-muted-foreground">{t.desc}</div>
              <button className="menu-btn border border-border mt-1" onClick={() => buy(t.price, () => addItem(t.id, t.id === "axe" ? { uses: 100 } : t.id === "pistol" ? { uses: 50, ammo: 12 } : t.id === "pipe" ? { uses: 20 } : {}))}>${t.price}</button></div>
          </div>
        ))}
      </div>
      </>}
      {tab === "decor" && <>
      <div className="grid grid-cols-5 gap-3">
        {DECOR.map((d) => (
          <div key={d.id} className="slot p-3 text-center"><div>{d.name}</div>
            <button className="menu-btn border border-border mt-2" onClick={() => buy(d.price, () => { game.setSave((s) => ({ decorOwned: [...s.decorOwned, d.id] })); game.toast(`${d.name} added to your room storage`); return true; })}>${d.price}</button></div>
        ))}
      </div></>}
      </div>
    </Shell>
  );
}

function Mirror() {
  const save = useGame((s) => s.save);
  const [name, setName] = useState(save.name);
  const [avatar, setAvatar] = useState(save.avatar);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  return (
    <Shell title="Mirror" wide>
      <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-6 panel-split mirror-split">
        <div className="space-y-3">
          <Button variant="ghost" className="slot w-full h-auto aspect-square p-0" aria-label="Change face image" onClick={() => file.current?.click()}>
            <img src={avatar} alt="Your face" className="w-full h-full object-cover" />
          </Button>
          <input ref={file} type="file" accept="image/jpeg,image/png,image/gif" className="hidden" onChange={async e => {
            const f = e.target.files?.[0]; if (!f) return;
            setLoading(true);
            try { setAvatar(await toAvatar(f)); setError(""); } catch (err) { setError(err instanceof Error ? err.message : "Could not load image"); }
            finally { setLoading(false); }
          }} />
          <label className="block text-muted-foreground" htmlFor="mirror-name">Name</label>
          <input id="mirror-name" value={name} maxLength={16} onChange={e => setName(e.target.value)} className="w-full bg-card border border-border px-3 py-2 text-xl outline-none focus:border-primary" />
          <Button variant="outline" disabled={name.trim().length < 2 || loading} onClick={() => { game.setSave({ name: name.trim(), avatar }); game.toast("Profile saved"); }}>SAVE PROFILE</Button>
          {error && <p className="text-destructive">{error}</p>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 game-scroll min-h-0 overflow-y-auto content-start">
          {OUTFITS.map(o => {
            const own = save.outfits.includes(o.id);
            return <Button variant="ghost" key={o.id} className={`slot h-auto p-2 flex-col whitespace-normal text-left ${save.outfit === o.id ? "slot-on" : ""}`} onClick={() => {
              if (own) game.setSave({ outfit: o.id });
              else if (save.money >= o.price) { sfx.cash(); game.setSave({ money: save.money - o.price, outfits: [...save.outfits, o.id], outfit: o.id }); }
              else game.toast("Not enough money");
            }}>
               <LazyPreview>
                 <Canvas dpr={1} camera={{ position: [2.6, 1.8, 3.6], fov: 33 }} onCreated={({ camera }) => camera.lookAt(0, 1, 0)}>
                   <ambientLight intensity={2} /><directionalLight position={[2, 4, 3]} intensity={3} />
                   <Character outfit={o.id} avatar={avatar} held={held()?.id} />
                 </Canvas>
               </LazyPreview>
              <span className="w-full">{o.name}</span>
              <span className="w-full text-sm text-muted-foreground">{own ? save.outfit === o.id ? "WEARING" : "OWNED" : `$${o.price}`}</span>
            </Button>;
          })}
        </div>
      </div>
    </Shell>
  );
}

let roomsCache: any[] = [];
function Rooms() {
  const uid = useGame((s) => s.userId);
  const save = game.get().save;
  const mine = uid ? { id: uid, name: save.name, avatar_url: save.avatar, level: save.level, room: save.room } : null;
  const [list, setList] = useState<any[]>(() => roomsCache.length ? roomsCache : mine ? [mine] : []);
  const [q, setQ] = useState("");
  useEffect(() => { fetchRooms().then((l) => { roomsCache = l ?? []; setList(roomsCache); }).catch(() => {}); }, []);
  const enter = (id: string) => {
    sfx.door();
    rt.pos.set((PROOM.x0 + PROOM.x1) / 2, 0, PROOM.z1 - 1.5); rt.yaw = 0;
    game.set({ inRoom: id, panel: null, inLab: false }); rt.lockRequest();
    if (id === uid) game.toast("Your room — press P to decorate");
  };
  const f = list.filter((p) => p.name?.toLowerCase().includes(q.toLowerCase()));
  return (
    <Shell title="Rooms Hall">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rooms by player…" className="w-full bg-card border border-border px-3 py-2 mb-3 outline-none focus:border-primary" />
      <div className="flex flex-col gap-1 game-scroll min-h-0 overflow-y-auto flex-1">
        {f.map((p) => (
          <button key={p.id} className="menu-btn border border-border flex items-center gap-3" onClick={() => enter(p.id)}>
            {p.avatar_url ? <img src={p.avatar_url} className="w-8 h-8 object-cover" alt="" /> : <div className="w-8 h-8 bg-card" />}
            <span>{p.name}'s room {p.id === uid && "(YOURS)"}</span><span className="ml-auto text-sm opacity-70">LV {p.level} · {(p.room ?? []).length} items</span>
          </button>
        ))}
      </div>
    </Shell>
  );
}

function Extractor() {
  const q = useGame((s) => s.quota);
  const save = useGame((s) => s.save);
  return (
    <Shell title="Extractor">
      <div className={`text-5xl font-hud ${q.completed ? "text-success" : "text-primary"}`}>${q.progress} / ${q.target} {q.completed && "✔"}</div>
      <div className="h-4 bg-card border border-border my-3"><div className={`h-full ${q.completed ? "bg-success" : "bg-primary"}`} style={{ width: `${Math.min(100, (q.progress / Math.max(1, q.target)) * 100)}%` }} /></div>
      <p className="text-muted-foreground">Everyone on the server fills this quota together. Hold scrap in your hand and press E at the Extractor to insert it. If the quota isn't met by midnight, every player loses all held items and money. Room storage is safe.</p>
      <h3 className="text-primary mt-4 mb-2">DISCOVERED SCRAP ({(save.scrapsFound ?? []).length}/{SCRAP_IDS.length})</h3>
      <div className="grid grid-cols-4 gap-2 game-scroll min-h-0 flex-1 overflow-y-auto content-start">
        {SCRAP_IDS.map((id) => { const known = (save.scrapsFound ?? []).includes(id); const it = ITEMS[id]; return (
          <div key={id} className="slot p-2 text-center text-sm">
            {known ? <img src={it.img} className="pix h-10 mx-auto object-contain" alt="" /> : <div className="h-10 flex items-center justify-center text-muted-foreground">?</div>}
            <div>{known ? it.name : "???"}</div>
            <div className="text-muted-foreground">{known ? `$${it.value} · ${it.slots} slot${it.slots > 1 ? "s" : ""}` : "undiscovered"}</div>
          </div>); })}
      </div>
      <p className="mt-2">{save.contribDay === todayStr() ? "You contributed today — you'll earn +40 XP when it completes." : "You haven't contributed today."}</p>
    </Shell>
  );
}

function Foundation() {
  const save = useGame((s) => s.save);
  const [sel, setSel] = useState<EntityId | null>(save.discovered[0] ?? null);
  return (
    <Shell title="Entity Foundation" wide>
      <div className="grid grid-cols-[220px_1fr] gap-6 panel-split foundation-split">
        <div className="flex flex-col gap-1 game-scroll min-h-0 overflow-y-auto flex-1">
          {(Object.keys(ENTITIES) as EntityId[]).map((id) => {
            const known = save.discovered.includes(id);
            return <button key={id} disabled={!known} className={`menu-btn border ${sel === id ? "border-primary" : "border-border"}`} onClick={() => setSel(id)}>{known ? ENTITIES[id].name : "??? UNKNOWN"}</button>;
          })}
        </div>
        {sel ? (
          <div className="flex gap-5 game-scroll overflow-y-auto min-h-0">
            <img src={ENTITIES[sel].img} className="w-48 h-48 object-contain bg-card" alt="" />
            <div className="space-y-2">
              <h3 className="text-3xl text-primary">{ENTITIES[sel].name}</h3>
              <div>DANGER {"■".repeat(ENTITIES[sel].danger)}<span className="text-muted-foreground">{"□".repeat(3 - ENTITIES[sel].danger)}</span> ({ENTITIES[sel].danger}/3)</div>
              <p><span className="text-primary">Appearance:</span> {ENTITIES[sel].appearance}</p>
              <p><span className="text-primary">Behaviour:</span> {ENTITIES[sel].behaviour}</p>
              <p className="text-muted-foreground">{ENTITIES[sel].details}</p>
              <p><span className="text-primary">Encounters:</span> {save.encounters?.[sel] ?? 0}</p>
            </div>
          </div>
        ) : <p className="text-muted-foreground">No entities documented yet. Survive the backrooms to learn what lives there.</p>}
      </div>
    </Shell>
  );
}

export function Options({ onBack }: { onBack?: () => void }) {
  const mv = useGame((s) => s.musicVol), sv = useGame((s) => s.sfxVol);
  const vhs=useGame(s=>s.save.vhs!==false);
  useEffect(() => { localStorage.setItem("brq_vol", JSON.stringify({ mv, sv })); }, [mv, sv]);
  return (
    <div className="space-y-4 font-menu text-xl w-80">
      <label className="block">MUSIC VOLUME {Math.round(mv * 100)}
        <input type="range" min={0} max={1} step={0.05} value={mv} onChange={(e) => game.set({ musicVol: +e.target.value })} className="w-full accent-primary" /></label>
      <label className="block">SOUND EFFECTS {Math.round(sv * 100)}
        <input type="range" min={0} max={1} step={0.05} value={sv} onChange={(e) => { game.set({ sfxVol: +e.target.value }); sfx.click(); }} className="w-full accent-primary" /></label>
      <div className="text-muted-foreground">VERSION {VERSION}</div>
       <label className="flex items-center gap-3"><input type="checkbox" checked={vhs} onChange={e=>game.setSave({vhs:e.target.checked})} className="accent-primary"/>VHS FILTER</label>
      {onBack && <button className="menu-btn" onClick={onBack}>BACK</button>}
    </div>
  );
}

function Dead() {
  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col items-center justify-center font-menu gap-4">
      <h1 className="text-6xl tracking-[.4em] text-destructive glitch">YOU DIED</h1>
      <p className="text-muted-foreground">Your items lie where you fell. Your room storage is safe.</p>
      <button className="menu-btn border border-primary text-2xl" onClick={() => {
        rt.pos.set(-4.5, 0, -10); rt.yaw = Math.PI; rt.vel.set(0, 0, 0); rt.secondWind = false;
        game.set({ panel: null, health: maxHealth(game.get().save), stamina: 100, inRoom: null }); rt.lockRequest();
      }}>WAKE UP IN THE LABORATORY</button>
    </div>
  );
}

export function Panels() {
  const p = useGame((s) => s.panel);
  const dying=useGame(s=>!!s.jumpscare);
  const _ = useMemo(() => remotes.size, [p]);
  void _;
  if(dying)return null;
  switch (p) {
    case "inventory": return <Inventory />;
    case "scrapselector": return <ScrapSelector />;
    case "themes": return <ThemeSelector />;
    case "blueprint": return <BlueprintPanel />;
    case "projector": return <ProjectorPanel />;
    case "tree": return <Tree />;
    case "shop": return <Shop />;
    case "mirror": return <Mirror />;
    case "rooms": return <Rooms />;
    
    case "extractor": return <Extractor />;
    case "foundation": return <Foundation />;
    case "storage": return <ContainerPanel />;
    case "artwork": return <ArtworkPanel />;
    case "papermap": return <PaperMap />;
    case "options": return <Shell title="Options"><Options onBack={() => game.set({ panel: "inventory" })} /></Shell>;
    case "dead": return <Dead />;
  }
  return null;
}

function RadarOverlay() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    let id = 0, sweep = 0, last = performance.now();
    const loop = (now: number) => {
      id = requestAnimationFrame(loop);
      if (rt.radar !== onRef.current) { onRef.current = rt.radar; setOn(rt.radar); }
      const c = ref.current; if (!c || !rt.radar) return;
      const g = c.getContext("2d")!; const W = c.width, R = W / 2 - 6, RANGE = 30;
      sweep += (now - last) / 1000 * 2.4; last = now;
      g.fillStyle = "rgba(0,20,6,0.35)"; g.fillRect(0, 0, W, W);
      g.strokeStyle = "#1f8a3a"; g.lineWidth = 1;
      for (const k of [1, .66, .33]) { g.beginPath(); g.arc(W / 2, W / 2, R * k, 0, Math.PI * 2); g.stroke(); }
      g.beginPath(); g.moveTo(W / 2 - R, W / 2); g.lineTo(W / 2 + R, W / 2); g.moveTo(W / 2, W / 2 - R); g.lineTo(W / 2, W / 2 + R); g.stroke();
      const grad = g.createConicGradient(sweep, W / 2, W / 2); grad.addColorStop(0, "rgba(80,255,120,0.55)"); grad.addColorStop(0.12, "rgba(80,255,120,0)"); grad.addColorStop(1, "rgba(80,255,120,0)");
      g.fillStyle = grad; g.beginPath(); g.arc(W / 2, W / 2, R, 0, Math.PI * 2); g.fill();
      const blip = (x: number, z: number, col: string, size: number) => {
        const dx = x - rt.pos.x, dz = z - rt.pos.z, d = Math.hypot(dx, dz); if (d > RANGE) return;
       const offset=radarOffset(dx,dz,rt.yaw);
       g.fillStyle = col; g.beginPath(); g.arc(W / 2 + offset.x/RANGE*R, W / 2 + offset.y/RANGE*R, size, 0, Math.PI * 2); g.fill();
      };
      bots.forEach((b) => b.active && blip(b.x, b.z, "#ff4a3a", 5));
      minions.forEach((m) => m.hp > 0 && blip(m.x, m.z, "#ffd23a", 3.5));
      g.fillStyle = "#7dff8a"; g.beginPath(); g.moveTo(W / 2, W / 2 - 7); g.lineTo(W / 2 - 5, W / 2 + 5); g.lineTo(W / 2 + 5, W / 2 + 5); g.fill();
    };
    const onRef = { current: false };
    id = requestAnimationFrame(loop); return () => cancelAnimationFrame(id);
  }, []);
  return <canvas ref={ref} width={260} height={260} className={`absolute bottom-28 left-1/2 -translate-x-1/2 rounded-full border-2 border-primary/60 pointer-events-none ${on ? "" : "hidden"}`} />;
}

// Browsers allow ~16 live 3D views; mounting every outfit preview at once kills the game view.
function LazyPreview({ children }: { children: import("react").ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setShow(e.isIntersecting), { threshold: 0.01 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <div ref={ref} className="w-full h-36 pointer-events-none">{show ? children : null}</div>;
}
