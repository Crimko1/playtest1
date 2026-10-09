import { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { rt } from './runtime';
import { game } from './store';
import { STAIR_ROOMS, ACCESS_THEMES, HOUSES, UPPER, stairOrigin, isUpper } from './upper-world';
import { floorTex, wallTex, woodTex, screenTex } from './textures';
import { TreeModel } from './TreeModel';

function Solid({p,s,kind='wall'}:{p:[number,number,number];s:[number,number,number];kind?:string}) {
 const map=useMemo(()=>kind==='wood'?woodTex():kind==='grass'?floorTex('grass'):wallTex(kind==='tile'?'tile':'panel'),[kind]);
 return <mesh position={p} receiveShadow><boxGeometry args={s}/><meshLambertMaterial map={map}/></mesh>;
}
function Access({idx,i}:{idx:number;i:number}) {
 const o=stairOrigin(idx), label=useMemo(()=>screenTex([ACCESS_THEMES[i],'94 ↑'],'#e4e9dc'),[i]);
 return <group position={[o.x,0,o.z]}>
  {[0,1].map(flight=><group key={flight}>{Array.from({length:30},(_,n)=>{const y=(n+1)*.2+(flight?6:0),z=flight?9-(n+.5)*.3:(n+.5)*.3;return <group key={n}><Solid p={[flight?2.2:0,y-.07,z]} s={[1.8,.14,.3]} kind={i%3===0?'wood':'tile'}/><Solid p={[flight?2.2:0,y-.035,z-.13]} s={[1.8,.02,.025]} kind="wood"/></group>;})}</group>)}
  <Solid p={[1.1,5.9,9.5]} s={[4,.2,1]}/>
  {[-1,3.2].map(x=><group key={x}><Solid p={[x,6,4.5]} s={[.12,12,10.3]}/>{[0,1].map(f=>Array.from({length:10},(_,n)=>{const z=.45+n*.9,y=f?12-z*2/3:z*2/3;return <Solid key={`${f}${n}`} p={[f?2.2+.94:-.94,y+.5,z]} s={[.035,1,.035]} kind="wood"/>;}))}</group>)}
  <Solid p={[1.1,6,-.65]} s={[4.3,12,.15]}/><Solid p={[1.1,6,10.2]} s={[4.3,12,.15]}/>
  <mesh position={[0,1.8,-.55]}><planeGeometry args={[1.65,.7]}/><meshBasicMaterial map={label}/></mesh>
  <mesh position={[1.1,12.8,4.5]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[4.2,10.8]}/><meshBasicMaterial color="#b8d7e4" side={THREE.DoubleSide}/></mesh>
  <pointLight position={[2.2,10,1]} intensity={12} distance={12} color="#e4f2ff"/>
 </group>;
}
export function Staircases(){
 const [near,setNear]=useState<number[]>([]); const key=useRef('');
 useFrame(()=>{const ids=STAIR_ROOMS.filter(idx=>{const o=stairOrigin(idx);return !game.get().inRoom&&Math.hypot(o.x-rt.pos.x,o.z-rt.pos.z)<40;});const k=ids.join(',');if(k!==key.current){key.current=k;setNear(ids);}});
 return <>{near.map(idx=><Access key={idx} idx={idx} i={STAIR_ROOMS.indexOf(idx)}/>)}</>;
}
function House({i}:{i:number}) {
 const h=HOUSES[i];
 return <group position={[h.x,12,h.z]}>
  <Solid p={[0,-.08,0]} s={[6,.16,6]} kind="wood"/>
  {[-2.9,2.9].map(x=><Solid key={x} p={[x,1.8,0]} s={[.2,3.6,6]} kind={i%2?'wood':'wall'}/>)}
  <Solid p={[0,1.8,-2.9]} s={[6,3.6,.2]}/>{[-2,2].map(x=><Solid key={x} p={[x,1.8,2.9]} s={[2,3.6,.2]}/>)}
  <Solid p={[0,3.5,0]} s={[6,.15,6]} kind="wood"/>
  <group position={[0,4.1,0]}>{[-1,1].map(s=><group key={s} position={[s*1.55,0,0]} rotation={[0,0,s*-.4]}><Solid p={[0,0,0]} s={[3.5,.15,6.6]} kind="wood"/></group>)}</group>
  <Solid p={[-1.65,.8,0]} s={[1.7,.1,2]} kind="wood"/>{[-2.3,-1].map(x=>[-.8,.8].map(z=><Solid key={`${x}${z}`} p={[x,.4,z]} s={[.07,.8,.07]} kind="wood"/>))}
  <Solid p={[2,1,-2]} s={[1,2,1]} kind="wood"/>
  {i%3===0?<Solid p={[-1.5,.5,-1.9]} s={[2,1,.8]} kind="wood"/>:i%3===1?<Solid p={[0,.4,-2]} s={[2,.8,1]} kind="tile"/>:<Solid p={[0,1.3,-2.7]} s={[2.4,1.8,.15]} kind="wood"/>}
  <pointLight position={[0,2.8,0]} intensity={4} distance={7} color="#fff0cf"/>
 </group>;
}
export function UpperLevel(){
 const [show,setShow]=useState(false); const {scene}=useThree();
 const terrain=useMemo(()=>{const s=new THREE.Shape();s.moveTo(-12,0);s.lineTo(268,0);s.lineTo(268,210);s.lineTo(-12,210);s.closePath();for(const idx of STAIR_ROOMS){const o=stairOrigin(idx),h=new THREE.Path();h.moveTo(o.x-1,o.z-.6);h.lineTo(o.x-1,o.z+10.3);h.lineTo(o.x+3.3,o.z+10.3);h.lineTo(o.x+3.3,o.z-.6);h.closePath();s.holes.push(h);}const g=new THREE.ShapeGeometry(s);g.rotateX(Math.PI/2);g.translate(0,12,0);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/20,uv.getY(i)/20);return g;},[]);
 const grass=useMemo(()=>floorTex('grass'),[]);
 useEffect(()=>()=>terrain.dispose(),[terrain]);
 useFrame(()=>{const upper=isUpper(rt.pos.x,rt.pos.y,rt.pos.z),visible=!game.get().inRoom&&(upper||rt.pos.y>2);if(visible!==show)setShow(visible);if(scene.fog instanceof THREE.Fog){scene.fog.near=upper?25:6;scene.fog.far=upper?90:34;scene.fog.color.set(upper?'#b4c5c8':'#0b0a04');}if(scene.background instanceof THREE.Color)scene.background.set(upper?'#c1dbe7':'#000');});
 if(!show)return null;
 return <group><hemisphereLight args={['#d9edf4','#8a9063',.7]}/><directionalLight position={[80,90,30]} intensity={1.4}/><mesh geometry={terrain}><meshLambertMaterial map={grass} side={THREE.DoubleSide}/></mesh>{HOUSES.map((_,i)=><House key={i} i={i}/>)}{HOUSES.map((h,i)=><group key={i} position={[h.x-4,12,h.z+5]} scale={1+i%3*.15}><TreeModel/></group>)}</group>;
}
