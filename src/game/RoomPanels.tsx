import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { game, useGame, maxSlots, type InvItem } from "./store";
import { rt } from "./runtime";
import { held, heldIndex, normInv, addItem, removeAt } from "./items";
import { ITEMS } from "./data";
import { readContainer, writeContainer } from "./containers";
import { canStoreTool, penIndex, STORAGE_SLOTS } from "./rules";
import { toAvatar } from "./avatar";

const close = () => { game.set({ panel: null }); rt.lockRequest(); };
export function PaperMap() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const slot = useRef(heldIndex());
  const [pen, setPen] = useState(0);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const save = () => {
    const c = canvas.current; if (!c) return;
    const inv = [...game.get().save.inventory]; const item = inv[slot.current];
    if (item?.id === "papermap") { inv[slot.current] = { ...item, sketch: c.toDataURL("image/png") }; game.setSave({ inventory: inv }); }
  };
  useEffect(() => {
    const c = canvas.current, g = c?.getContext("2d"); if (!c || !g) return;
    g.fillStyle = "#ffffff"; g.fillRect(0,0,c.width,c.height);
    const sketch = held()?.sketch;
    if (sketch) { const img = new Image(); img.onload = () => g.drawImage(img,0,0,c.width,c.height); img.src = sketch; }
    const key = (e: KeyboardEvent) => { if (e.code === "Escape" || e.code === "Tab") save(); };
    window.addEventListener("keydown",key, true);
    return () => { save(); window.removeEventListener("keydown",key,true); };
  }, []);
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => { const c = e.currentTarget, b = c.getBoundingClientRect(); return { x: (e.clientX-b.left)/b.width*c.width, y: (e.clientY-b.top)/b.height*c.height }; };
  return <div className="fixed inset-0 z-40 bg-background/70 flex items-center justify-center p-5" onContextMenu={e => { e.preventDefault(); save(); close(); }}>
    <div className="w-[min(920px,95vw)] font-menu">
      <div className="flex items-center justify-between mb-3"><h2 className="text-primary text-2xl">Paper Map</h2><div className="flex gap-2">{["Black","Red","Eraser"].map((name,i) => <Button key={name} variant={pen === i ? "default" : "outline"} size="sm" onClick={() => setPen(i)}>{name}</Button>)}<Button variant="outline" onClick={() => { save(); close(); }}>Close</Button></div></div>
      <canvas aria-label="Paper Map drawing sheet" ref={canvas} width={1200} height={800} className="paper-sheet w-full aspect-[3/2] max-h-[78vh] touch-none cursor-crosshair" onWheel={e => { e.preventDefault(); setPen(i => penIndex(i,e.deltaY)); }}
        onPointerDown={e => { if (e.button !== 0) return; drawing.current = true; last.current = point(e); e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={e => { if (!drawing.current) return; const g = canvas.current?.getContext("2d"); if (!g) return; const p = point(e); g.strokeStyle = ["#000000","#c52020","#ffffff"][pen]; g.lineWidth = pen === 2 ? 22 : 4; g.lineCap = "round"; g.beginPath(); g.moveTo(last.current.x,last.current.y); g.lineTo(p.x,p.y); g.stroke(); last.current = p; }}
        onPointerUp={() => { drawing.current = false; save(); }} />
    </div>
  </div>;
}

export function ContainerPanel() {
  const s = useGame(x => x); const id = s.activeDecor;
  const [items,setItems] = useState<InvItem[]>([]), [busy,setBusy] = useState(true), [error,setError] = useState("");
  useEffect(() => { if (!id) return; readContainer(id).then(setItems).catch(e => setError(e.message)).finally(() => setBusy(false)); },[id]);
  const transfer = async (index: number, into: boolean) => {
    if (!id || busy || s.inRoom !== s.userId) return;
    const it = into ? game.get().save.inventory[index] : items[index]; if (!it) return;
    if (into && !canStoreTool(it.id,items.filter(Boolean).length)) { setError(ITEMS[it.id]?.scrap ? "Scrap cannot be stored" : "All ten slots are occupied"); return; }
    if (!into && !normInv(game.get().save.inventory,maxSlots(s.save)).some(x => !x)) { setError("Inventory full"); return; }
    setBusy(true); setError("");
    const next = into ? [...items.filter(Boolean),it] : items.filter((_,i) => i !== index);
    try { await writeContainer(id,next); if (into) removeAt(index); else addItem(it.id,it); setItems(next); }
    catch(e) { setError(e instanceof Error ? e.message : "Storage unavailable"); }
    finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-40 bg-background/70 flex items-center justify-center p-4 font-menu"><section className="panel w-[min(800px,95vw)] p-5 h-[88dvh] flex flex-col overflow-hidden">
    <header className="flex justify-between items-center mb-4"><h2 className="text-2xl text-primary">Storage Box · {items.filter(Boolean).length}/{STORAGE_SLOTS}</h2><Button variant="outline" onClick={close}>Close</Button></header>
    <div className="flex gap-3 mb-5 shrink-0">{s.save.inventory.map((it,i) => it && it.id !== "__big" ? <Button key={i} variant="ghost" disabled={busy} className="slot h-24 w-24 flex-col" onClick={() => transfer(i,true)}><img className="h-14 max-w-full object-contain" src={ITEMS[it.id].img} alt={ITEMS[it.id].name} /><span>Store</span></Button> : null)}</div>
    <div className="grid grid-cols-5 gap-2 game-scroll overflow-y-auto min-h-0 flex-1 content-start">{Array.from({length:10},(_,i) => <Button key={i} variant="ghost" className="slot h-24 flex-col" disabled={busy || !items[i]} onClick={() => transfer(i,false)}>{items[i] ? <img className="h-14 max-w-full object-contain" src={ITEMS[items[i]?.id ?? ""].img} alt="Stored tool" /> : <span className="text-muted-foreground">{i+1}</span>}</Button>)}</div>
    {error && <p className="text-destructive mt-3">{error}</p>}
  </section></div>;
}

export function ArtworkPanel() {
  const s = useGame(x => x); const p = s.save.room.find(p => p.key === s.activeDecor);
  const [error,setError] = useState(""); const [busy,setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  return <div className="fixed inset-0 z-40 bg-background/70 flex items-center justify-center font-menu p-4"><section className="panel p-5 w-[min(540px,95vw)] max-h-[88dvh] overflow-y-auto game-scroll"><header className="flex justify-between mb-4"><h2 className="text-primary text-2xl">{p?.id==="psbconsole"?"PSB Console":"Custom Paint"}</h2><Button variant="outline" onClick={close}>Close</Button></header>
    {p?.artwork && <img src={p.artwork} alt="Your artwork" className="w-full max-h-64 object-contain mb-4" />}
    <input ref={file} type="file" accept="image/jpeg,image/png,image/gif" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (!f || s.inRoom !== s.userId) return; setBusy(true); try { const artwork = await toAvatar(f); game.setSave({ room: game.get().save.room.map(d => d.key === p?.key ? {...d,artwork} : d) }); close(); } catch(e) { setError(e instanceof Error ? e.message : "Image unavailable"); } finally { setBusy(false); } }} />
    <Button disabled={busy} onClick={() => file.current?.click()}>Choose image</Button>{p?.artwork && <Button variant="ghost" onClick={() => { game.setSave({ room: s.save.room.map(d => d.key === p.key ? {...d,artwork:undefined} : d) }); close(); }}>Remove image</Button>}{error && <p className="text-destructive">{error}</p>}
  </section></div>;
}