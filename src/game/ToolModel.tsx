import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { metalTex, screenTex } from "./textures";
import { rt } from "./runtime";
import { game, useGame } from "./store";
import { OUTFITS } from "./data";
import { held } from "./items";

function Box({p=[0,0,0],s,c="steel"}:{p?:[number,number,number];s:[number,number,number];c?:string}) { const map=useMemo(()=>metalTex(c==="steel"?"#a9ada5":c==="grip"?"#272c29":"#d8c7a0"),[c]);return <mesh position={p}><boxGeometry args={s}/><meshStandardMaterial map={map} metalness={c==="steel"?.7:.1} roughness={.5}/></mesh>; }
export function ToolModel({id}:{id:string}) {
 const screen=useMemo(()=>screenTex([id==="radar"?"RADAR":id==="navigator"?"POSITION":"MAP",id==="radar"?"◎":id==="navigator"?"X / Z":""],"#86d590"),[id]);
 switch(id){
 case "knife":return <><Box p={[0,-.13,0]} s={[.055,.24,.04]} c="grip"/><Box s={[.12,.02,.07]}/><mesh position={[0,.21,0]} scale={[.07,.45,.013]}><coneGeometry args={[1,1,3]}/><meshStandardMaterial color="#cdd1c5" metalness={.9} roughness={.25}/></mesh>{[-.19,-.1].map(y=><mesh key={y} position={[.03,y,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.008,.008,.06,8]}/><meshStandardMaterial color="#cdd1c5" metalness={.9}/></mesh>)}</>;
 case "axe":return <><Box s={[.045,.8,.045]} c="wood"/><Box p={[.09,.3,0]} s={[.22,.16,.035]}/><mesh position={[.2,.3,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.025,.11,.08,4]}/><meshStandardMaterial color="#d5d8d0" metalness={.8}/></mesh></>;
 case "pipe":return <><mesh rotation={[0,0,.12]}><cylinderGeometry args={[.032,.032,.8,16]}/><meshStandardMaterial color="#8b948a" metalness={.85} roughness={.45}/></mesh>{[-.38,.33].map(y=><mesh key={y} position={[0,y,0]}><torusGeometry args={[.034,.008,5,16]}/><meshStandardMaterial color="#b5baaf" metalness={.8}/></mesh>)}</>;
 case "pistol":return <group rotation={[Math.PI/2,0,0]}><Box p={[0,.05,-.13]} s={[.07,.07,.3]}/><Box p={[0,-.09,0]} s={[.065,.2,.08]} c="grip"/><mesh position={[0,-.08,-.08]}><torusGeometry args={[.035,.007,6,16]}/><meshStandardMaterial color="#555c54" metalness={.8}/></mesh><Box p={[0,.09,-.15]} s={[.02,.02,.025]} c="grip"/></group>;
 case "radar":case "navigator":return <><Box s={id==="radar"?[.2,.3,.065]:[.14,.24,.05]} c="grip"/><mesh position={[0,.02,.036]}><planeGeometry args={id==="radar"?[.16,.18]:[.11,.14]}/><meshBasicMaterial map={screen}/></mesh><Box p={[-.07,.23,0]} s={[.012,.2,.012]}/>{[-.05,0,.05].map(x=><Box key={x} p={[x,-.11,.04]} s={[.025,.02,.01]}/>)}</>;
 case "health":return <><Box s={[.23,.16,.09]} c="wood"/><Box p={[0,0,.052]} s={[.1,.03,.01]}/><Box p={[0,0,.052]} s={[.03,.1,.01]}/><Box p={[0,.095,0]} s={[.08,.025,.035]} c="grip"/></>;
 case "adrenaline":return <><mesh><cylinderGeometry args={[.026,.026,.18,12]}/><meshStandardMaterial color="#b4d990" transparent opacity={.65}/></mesh><Box p={[0,.13,0]} s={[.075,.02,.025]}/><Box p={[0,.1,0]} s={[.012,.08,.012]}/><mesh position={[0,-.14,0]}><cylinderGeometry args={[.002,.002,.1,6]}/><meshStandardMaterial color="#cbd3c5" metalness={1}/></mesh></>;
 case "flashcharge":return <><Box s={[.1,.2,.06]} c="grip"/><Box p={[0,.1,0]} s={[.08,.02,.04]}/><Box p={[0,0,.035]} s={[.065,.12,.012]} c="wood"/></>;
 case "tear":return <mesh scale={[.065,.16,.065]}><icosahedronGeometry args={[1,2]}/><meshPhysicalMaterial color="#9ba4cc" metalness={.3} roughness={.1} transmission={.4}/></mesh>;
 case "papermap":return <><Box s={[.35,.25,.007]} c="wood"/><mesh position={[0,0,.005]}><planeGeometry args={[.32,.22]}/><meshBasicMaterial map={screen}/></mesh></>;
 default:return null;
 }
}
export function FirstPersonTool(){
 const item=useGame(s=>{const i=s.save.inventory[s.slot];return i?.id==="__big"?s.save.inventory[s.slot-1]?.id:i?.id;});
 const outfit=useGame(s=>s.save.outfit);
 const ref=useRef<THREE.Group>(null);
 const color=OUTFITS.find(o=>o.id===outfit)?.color??OUTFITS[0].color;
 useFrame((_,raw)=>{const g=ref.current;if(!g)return;const s=game.get();const h=held();g.visible=!!h?.id&&!s.panel&&!s.jumpscare&&["axe","knife","pipe","pistol","radar","navigator","health","adrenaline","flashcharge","tear","papermap"].includes(h.id);const dt=Math.min(raw,.05);rt.swing=Math.max(0,rt.swing-dt*3.2);const wave=Math.sin(rt.swing*Math.PI);g.position.set(.31-wave*.22,-.31+wave*.08,-.72-wave*.26);g.rotation.set(-wave*.75,wave*.15,-wave*(item==="axe"?1.05:.45));});
 return <group ref={ref} position={[.31,-.31,-.72]} scale={.92}><ToolModel id={item??""}/><mesh position={[0,-.13,.02]}><boxGeometry args={[.13,.16,.12]}/><meshStandardMaterial color="#262b28" roughness={.85}/></mesh><mesh position={[0,-.31,.03]}><boxGeometry args={[.16,.25,.14]}/><meshStandardMaterial color={color} roughness={.9}/></mesh></group>;
}