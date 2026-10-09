import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { game, useGame } from "./store";
import { ITEMS, SHOP_TOOLS } from "./data";
import { PERSONAL_THEMES } from "./themes";
import { themePayment } from "./rules";
import { rt } from "./runtime";
import { addItem, canFit } from "./items";

const close = () => { game.set({panel:null}); rt.lockRequest(); };
function Frame({title,children}:{title:string;children:React.ReactNode}) { return <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/70 p-4 font-menu"><section className="panel flex max-h-[88dvh] w-[min(760px,95vw)] flex-col p-5"><header className="mb-4 flex items-center justify-between"><h2 className="text-2xl text-primary">{title}</h2><Button variant="outline" onClick={close}>Close</Button></header><div className="game-scroll min-h-0 overflow-y-auto">{children}</div></section></div>; }
export function ScrapSelector() {
  const s=useGame(x=>x); const p=s.save.room.find(d=>d.key===s.activeDecor);
  const select=(id?:string)=>{if(s.inRoom!==s.userId||!p)return;game.setSave(x=>({room:x.room.map(d=>d.key===p.key?{...d,artwork:id}:d)}));close();};
  return <Frame title="Scrap Display"><Button variant="outline" className="mb-4" onClick={()=>select()}>Empty display</Button><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{(s.save.scrapsFound??[]).filter(id=>ITEMS[id]?.scrap).map(id=><Button variant={p?.artwork===id?"default":"ghost"} key={id} className="slot h-auto min-h-32 flex-col whitespace-normal p-3" onClick={()=>select(id)}><img src={ITEMS[id].img} alt={ITEMS[id].name} className="h-20 w-full object-contain"/><span>{ITEMS[id].name}</span></Button>)}</div></Frame>;
}
export function ThemeSelector() {
  const s=useGame(x=>x); const current=(s.save.roomTheme??s.save.roomIndex)%7;
  return <Frame title="Room Themes · 1000 Money"><div className="grid grid-cols-2 gap-3">{PERSONAL_THEMES.slice(0,7).map((t,i)=><Button key={t.name} variant={i===current?"default":"outline"} className="h-24 flex-col whitespace-normal" disabled={i===current||s.save.money<1000} onClick={()=>{const latest=game.get();if(latest.inRoom!==latest.userId)return;const money=themePayment(latest.save.money,(latest.save.roomTheme??latest.save.roomIndex)%7,i);if(money===null)return;game.setSave({roomTheme:i,money});close();}}><span>{t.name}</span><span className="text-sm">{i===current?"CURRENT":"1000 Money"}</span></Button>)}</div></Frame>;
}
type Job={tool_id:string;ready_at:string};
export function BlueprintPanel() {
  const s=useGame(x=>x), key=s.activeDecor;
  const [job,setJob]=useState<Job|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(""),[confirm,setConfirm]=useState(false),[now,setNow]=useState(Date.now());
  useEffect(()=>{if(!key)return;supabase.from("blueprint_jobs" as never).select("tool_id,ready_at").eq("owner_id",s.userId??"").eq("decor_key",key).maybeSingle().then(({data,error})=>{if(error)setError(error.message);else setJob(data as unknown as Job|null);setBusy(false);});const t=setInterval(()=>setNow(Date.now()),1000);const kd=(e:KeyboardEvent)=>{if(e.code==="KeyC"){e.preventDefault();setConfirm(true);}};window.addEventListener("keydown",kd);return()=>{clearInterval(t);window.removeEventListener("keydown",kd);};},[key,s.userId]);
  const action=async(a:string,tool?:string)=>{if(!key||busy)return;if(a==="claim"&&job&&!canFit(job.tool_id)){setError("Inventory full");return;}setBusy(true);setError("");const {data,error}=await supabase.rpc("blueprint_action" as never,{decor:key,action:a,tool:tool??null} as never);if(error)setError(error.message);else if(a==="start")setJob(data as unknown as Job);else {if(a==="claim"){const result=data as unknown as {tool_id:string};addItem(result.tool_id);}setJob(null);setConfirm(false);}setBusy(false);};
  const remaining=job?Math.max(0,new Date(job.ready_at).getTime()-now):0;
  return <Frame title="Blueprint Machine">{job?<div className="space-y-4"><h3 className="text-xl text-primary">{ITEMS[job.tool_id]?.name}</h3><p className="text-3xl font-hud">{remaining?`${Math.floor(remaining/3600000)}:${String(Math.floor(remaining/60000)%60).padStart(2,"0")}:${String(Math.floor(remaining/1000)%60).padStart(2,"0")}`:"READY"}</p><Button disabled={busy||remaining>0} onClick={()=>action("claim")}>Collect tool</Button><Button variant="outline" disabled={busy} onClick={()=>setConfirm(true)}>Cancel [C]</Button></div>:<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{SHOP_TOOLS.map(t=><Button key={t.id} variant="outline" disabled={busy} className="h-auto min-h-32 flex-col whitespace-normal" onClick={()=>action("start",t.id)}><img src={ITEMS[t.id].img} className="h-16 w-20 object-contain" alt=""/><span>{ITEMS[t.id].name}</span><span className="text-muted-foreground">Free · 16 hours</span></Button>)}</div>}{confirm&&<div className="mt-4 border-t border-border pt-4"><p>Cancel this tool’s progress?</p><div className="mt-3 flex gap-3"><Button disabled={busy} onClick={()=>action("cancel")}>Yes</Button><Button variant="outline" onClick={()=>setConfirm(false)}>No</Button></div></div>}{error&&<p className="mt-3 text-destructive">{error}</p>}</Frame>;
}
export function ProjectorPanel(){
  const s=useGame(x=>x),p=s.save.room.find(d=>d.key===s.activeDecor);
  const [url,setUrl]=useState(p?.video??""),[volume,setVolume]=useState(p?.volume??.5),[error,setError]=useState("");
  const save=(def=false)=>{if(!p||s.inRoom!==s.userId)return;let id="";if(!def){try{const u=new URL(url);if(u.hostname==="youtu.be")id=u.pathname.slice(1);else if(["youtube.com","www.youtube.com","m.youtube.com"].includes(u.hostname))id=u.searchParams.get("v")??u.pathname.split("/").pop()??"";}catch{}if(!/^[\w-]{11}$/.test(id)){setError("Enter a valid YouTube video URL");return;}}game.setSave(x=>({room:x.room.map(d=>d.key===p.key?{...d,video:def?undefined:`https://www.youtube.com/watch?v=${id}`,volume,videoStart:Date.now()}:d)}));close();};
  return <Frame title="Video Projector"><label className="block">YouTube URL<input value={url} onChange={e=>setUrl(e.target.value)} className="my-2 w-full border border-border bg-card p-3"/></label><label className="block">Volume {Math.round(volume*100)}%<input type="range" min="0" max="1" step=".05" value={volume} onChange={e=>setVolume(+e.target.value)} className="my-3 w-full accent-primary"/></label><div className="flex gap-3"><Button onClick={()=>save()}>Play</Button><Button variant="outline" onClick={()=>save(true)}>Default</Button></div>{error&&<p className="mt-3 text-destructive">{error}</p>}</Frame>;
}