import { useEffect,useMemo,useRef } from "react";
import { useFrame,useThree } from "@react-three/fiber";
import * as THREE from "three";
import { rt,register } from "./runtime";
import { game,useGame } from "./store";
import { rooms } from "./world";
import { HOUSES,UPPER,STAIR_ROOMS,upperGround } from "./upper-world";
import { floorTex,wallTex,woodTex,screenTex } from "./textures";
import { Remotes } from "./Remotes";

function Solid({p,s,kind="wall"}:{p:[number,number,number];s:[number,number,number];kind?:string}){const map=useMemo(()=>kind==="wood"?woodTex():kind==="roof"?floorTex("wood"):wallTex("panel"),[kind]);return <mesh position={p}><boxGeometry args={s}/><meshStandardMaterial map={map} color={kind==="roof"?"#504c42":kind==="wall"?"#b6b17d":"#d7d4b8"} roughness={.9}/></mesh>;}
function House({i}:{i:number}){
 const h=HOUSES[i],y=upperGround(h.x,h.z);
 useEffect(()=>register({id:`down${i}`,pos:new THREE.Vector3(h.x+2,y+.7,h.z+1),range:1.4,label:()=>"[E] Descend to the Backrooms",onE:()=>{const r=rooms[STAIR_ROOMS[i]];rt.pos.set(r.cx+3,0,r.cz+2);rt.yaw=Math.PI;rt.verticalVelocity=0;game.set({inLab:false,inRoom:null,panel:null});}}),[h,y,i]);
 return <group position={[h.x,y,h.z]}>
  <Solid p={[0,-.08,0]} s={[8,.16,8]} kind="wood"/>
  {[-3.9,3.9].map(x=><Solid key={x} p={[x,3.2,0]} s={[.2,6.4,8]}/>)}
  <Solid p={[0,3.2,-3.9]} s={[8,6.4,.2]}/>{[-2.45,2.45].map(x=><Solid key={x} p={[x,3.2,3.9]} s={[3.1,6.4,.2]}/>)}<Solid p={[0,4.5,3.9]} s={[1.8,3.8,.2]}/>
  <Solid p={[0,3.3,0]} s={[7.8,.15,7.8]} kind="wood"/>
  <group position={[0,6.35,0]}>{[-1,1].map(sd=><group key={sd} position={[sd*2,1,0]} rotation={[0,0,sd*-.46]}><Solid p={[0,0,0]} s={[4.6,.16,8.7]} kind="roof"/></group>)}</group>
  {[-2.4,2.4].map(x=>[1.8,4.8].map(wy=><group key={`${x}${wy}`} position={[x,wy,4.015]}><mesh><planeGeometry args={[1.2,1.5]}/><meshBasicMaterial color="#596e72"/></mesh><Solid p={[0,0,.01]} s={[.055,1.55,.03]}/><Solid p={[0,0,.01]} s={[1.25,.055,.03]}/>{[-.65,.65].map(bx=><Solid key={bx} p={[bx,0,.02]} s={[.08,1.7,.07]} kind="wood"/>)}</group>))}
  <Solid p={[-1.7,.8,0]} s={[2.2,.08,2]} kind="wood"/>{[-2.6,-.8].map(x=>[-.8,.8].map(z=><Solid key={`${x}${z}`} p={[x,.4,z]} s={[.08,.8,.08]} kind="wood"/>))}
  {[-2.9,-.5].map(x=><group key={x}><Solid p={[x,.47,1.7]} s={[.6,.08,.65]} kind="wood"/><Solid p={[x,.75,2]} s={[.6,.55,.06]} kind="wood"/>{[-.23,.23].map(dx=>[-.23,.23].map(dz=><Solid key={`${dx}${dz}`} p={[x+dx,.24,1.7+dz]} s={[.05,.48,.05]} kind="wood"/>))}</group>)}
  <Solid p={[2.75,1,-3.1]} s={[1.5,2,.6]} kind="wood"/>
  <mesh position={[0,3.15,0]} rotation={[Math.PI/2,0,0]}><planeGeometry args={[.6,.5]}/><meshBasicMaterial color="#ffedb7"/></mesh><pointLight position={[0,2.7,0]} intensity={6} distance={8} color="#fff0cf"/>
  <group position={[2,.1,1]}>{Array.from({length:8},(_,n)=><Solid key={n} p={[0,-n*.1,n*.2]} s={[1.3,.12,.22]} kind="wood"/>)}<mesh position={[0,.04,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[1.2,1.2]}/><meshBasicMaterial color="#22291e"/></mesh></group>
  <Solid p={[0,-.25,4.5]} s={[2,.25,1]} kind="wood"/>
 </group>;
}
export function Staircases(){return <>{STAIR_ROOMS.map((idx,i)=><Staircase key={idx} idx={idx} i={i}/>)}</>;}
function Staircase({idx,i}:{idx:number;i:number}){
 const r=rooms[idx];
 useEffect(()=>register({id:`up${i}`,pos:new THREE.Vector3(r.cx+3,2.4,r.cz+5),range:1.65,label:()=>"[E] Ascend to Level 94",onE:()=>{const h=HOUSES[i];rt.pos.set(h.x+2,upperGround(h.x,h.z),h.z+1);rt.yaw=0;rt.verticalVelocity=0;game.set({inRoom:null,inLab:false,panel:null});rt.blackRose=false;rt.flashFlicker=true;}}),[r,i]);
 if(Math.hypot(rt.pos.x-r.cx,rt.pos.z-r.cz)>42)return null;
 return <group position={[r.cx+3,0,r.cz+2]}>{Array.from({length:12},(_,n)=><Solid key={n} p={[0,(n+1)*.1,n*.25]} s={[1.6,(n+1)*.2,.25]} kind="wood"/>)}<mesh position={[0,2.7,3.05]}><planeGeometry args={[1.5,.45]}/><meshBasicMaterial map={screenTex([["HILL ACCESS","SUBURBAN EXIT","THE QUIET STAIR","HOUSE PASSAGE","SKY SERVICE"][i],"94 ↑"],"#d8e1b6")}/></mesh>{[-.9,.9].map(x=><Solid key={x} p={[x,1.7,1.4]} s={[.06,.06,3.6]}/>)}</group>;
}
export function UpperLevel(){
 const inRoom=useGame(s=>s.inRoom),room=useGame(s=>s.save.room);
 const show=rt.pos.x>=UPPER.x0||!!inRoom&&room.some(p=>p.id==="uppercamera");
 const terrain=useMemo(()=>{const g=new THREE.PlaneGeometry(300,300,100,100);g.rotateX(-Math.PI/2);g.translate(1150,0,150);const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,upperGround(p.getX(i),p.getZ(i)));g.computeVertexNormals();return g;},[]);
 const grass=useMemo(()=>floorTex("grass"),[]);
 const road=useMemo(()=>{const g=new THREE.BufferGeometry(),points:number[]=[];for(let i=0;i<=150;i++){const z=i*2,x=1150+35*Math.sin(z/65);for(const dx of [-3,3])points.push(x+dx,upperGround(x+dx,z)+.035,z);}g.setAttribute("position",new THREE.Float32BufferAttribute(points,3));const ids:number[]=[];for(let i=0;i<150;i++){const n=i*2;ids.push(n,n+2,n+1,n+1,n+2,n+3);}g.setIndex(ids);g.computeVertexNormals();return g;},[]);
 const {scene}=useThree();useFrame(()=>{const upper=rt.pos.x>=1000;if(scene.fog instanceof THREE.Fog){scene.fog.near=upper?35:6;scene.fog.far=upper?240:34;scene.fog.color.set(upper?"#a7b4b1":"#0b0a04");}if(scene.background instanceof THREE.Color)scene.background.set(upper?"#aebfcb":"#000");});
 if(!show)return null;
 return <group><ambientLight intensity={.45}/><directionalLight position={[1100,80,100]} intensity={1.7}/><mesh geometry={terrain}><meshStandardMaterial map={grass} color="#899755" roughness={1}/></mesh><mesh geometry={road}><meshStandardMaterial color="#55564f" roughness={1}/></mesh>{HOUSES.map((_,i)=><House key={i} i={i}/>)}{[50,110,190,250].map(z=>{const x=1150+35*Math.sin(z/65)+4,y=upperGround(x,z);return <group key={z} position={[x,y,z]}><mesh position={[0,1.1,0]}><cylinderGeometry args={[.025,.025,2.2,12]}/><meshStandardMaterial color="#969e96" metalness={.8}/></mesh><mesh position={[0,2.1,0]}><circleGeometry args={[.38,32]}/><meshBasicMaterial map={screenTex(["↱"],"#dcdfce")} color="#a93932" side={THREE.DoubleSide}/></mesh></group>;})}<mesh position={[1150,75,150]} rotation={[Math.PI/2,0,0]}><planeGeometry args={[300,300]}/><meshBasicMaterial color="#b0c2cd" side={THREE.DoubleSide}/></mesh>{[1000,1300].map(x=><mesh key={x} position={[x,45,150]}><boxGeometry args={[1,80,300]}/><meshBasicMaterial color="#a7b8c2"/></mesh>)}{[0,300].map(z=><mesh key={z} position={[1150,45,z]}><boxGeometry args={[300,80,1]}/><meshBasicMaterial color="#a7b8c2"/></mesh>)}</group>;
}