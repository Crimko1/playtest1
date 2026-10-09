import { forwardRef, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { ToolModel } from "./ToolModel";
import { OUTFITS, ITEMS } from "./data";
import { imageTex, fabricTex, metalTex } from "./textures";

/*
 * Head layout (shared by every outfit):
 *  - Rounded-box helmet centred at y=1.68, front surface at z=HEAD_FRONT.
 *  - The face screen fills the whole front panel and sits flush inside a bezel
 *    whose inner edge overlaps the screen, so there is never a visible gap.
 *  - The "screen zone" (|x|<.21, 1.47<y<1.89, z>.1) is kept completely clear:
 *    all headgear lives above y=1.89, at the sides (|x|>.22) or behind the head.
 */
const HEAD_Y = 1.68, HEAD_W = .44, HEAD_H = .44, HEAD_D = .4;
const HEAD_FRONT = HEAD_D / 2;
const SCREEN = .34, BEZEL = .045;

type M = { suit: THREE.Material; dark: THREE.Material; trim: THREE.Material };
const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => <meshStandardMaterial color={color} roughness={.7} {...extra} />;

/** Every outfit gets its own hand-built headgear and body details — nothing is shared. */
function Gear({ outfit, m }: { outfit: string; m: M }) {
  const { suit, dark, trim } = m;
  switch (outfit) {
    case "classic": return <>
      {/* hazard hood seams + twin side filters + back oxygen tanks + chest zipper */}
      <mesh position={[0, HEAD_Y + .23, -.02]} material={suit}><boxGeometry args={[.46, .04, .42]} /></mesh>
      {[-1, 1].map(s => <group key={s}>
        <mesh position={[s * .27, HEAD_Y - .08, .04]} rotation={[Math.PI / 2, 0, 0]} material={dark}><cylinderGeometry args={[.07, .07, .14, 12]} /></mesh>
        <mesh position={[s * .27, HEAD_Y - .08, .12]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.055, .055, .02, 12]} />{std("#d9b52c", { metalness: .3 })}</mesh>
        <mesh position={[s * .145, 1.14, .19]} material={suit}><boxGeometry args={[.13, .14, .035]} /></mesh>
      </group>)}
      <mesh position={[0, 1.23, .196]} material={dark}><boxGeometry args={[.025, .52, .015]} /></mesh>
      <mesh position={[0, 1.22, -.25]} material={dark}><boxGeometry args={[.32, .44, .18]} /></mesh>
      {[-.095, .095].map(x => <mesh key={x} position={[x, 1.22, -.34]} material={trim}><cylinderGeometry args={[.072, .072, .42, 10]} /></mesh>)}
    </>;

    case "olive": return <>
      <mesh position={[0,1.99,-.03]}><cylinderGeometry args={[.24,.3,.18,16]}/>{std("#4d592c")}</mesh>
      <mesh position={[0,1.91,-.04]}><cylinderGeometry args={[.38,.38,.025,20]}/>{std("#38462c")}</mesh>
      {Array.from({length:20},(_,i)=><mesh key={i} position={[(i%5-2)*.085,.99+Math.floor(i/5)*.11,.188]} rotation={[0,0,i*.7]}><boxGeometry args={[.065,.07,.014]}/>{std(i%3===0?"#2d3e25":i%3===1?"#828158":"#5c7043")}</mesh>)}
      {[-.16,.16].map(x=><mesh key={x} position={[x,1.07,.24]} material={dark}><boxGeometry args={[.12,.2,.09]}/></mesh>)}
      <mesh position={[0,1.2,-.3]} material={suit}><boxGeometry args={[.38,.45,.2]}/></mesh>
    </>;
    case "pinkcat": return <>
      {[-1,1].map(sd=><group key={sd}><mesh position={[sd*.19,2.04,-.02]} rotation={[0,0,sd*-.3]}><coneGeometry args={[.12,.32,3]}/>{std("#e58baa")}</mesh><mesh position={[sd*.19,2.04,.05]} rotation={[0,0,sd*-.3]}><coneGeometry args={[.07,.22,3]}/>{std("#a94975")}</mesh></group>)}
      <mesh position={[0,1.16,.19]} scale={[1,1.2,.3]}><sphereGeometry args={[.17,16,12]}/>{std("#ffe0e7")}</mesh>
      <mesh position={[0,.97,-.26]} rotation={[.5,0,0]}><torusGeometry args={[.2,.035,8,20,Math.PI*1.6]}/>{std("#da88a8")}</mesh>
      {[-.12,.12].map(x=><mesh key={x} position={[x,1.45,.18]}><coneGeometry args={[.08,.13,3]}/>{std("#a84979")}</mesh>)}
    </>;
    case "ash": return <>
      <mesh position={[0,1.98,-.06]} material={trim}><boxGeometry args={[.05,.17,.36]}/></mesh>
      {[-1,1].map(sd=><group key={sd}><mesh position={[sd*.26,1.71,-.02]} material={suit}><boxGeometry args={[.07,.42,.34]}/></mesh><mesh position={[sd*.38,1.43,0]} scale={[1,.6,1]} material={suit}><sphereGeometry args={[.19,12,8]}/></mesh></group>)}
      <mesh position={[0,1.22,.19]} scale={[1,1.2,.4]} material={suit}><sphereGeometry args={[.29,12,10]}/></mesh>
      {[.83,.94,1.05].map(y=><mesh key={y} position={[0,y,.21]} material={trim}><boxGeometry args={[.49,.09,.055]}/></mesh>)}
      <mesh position={[0,1.2,-.28]} material={dark}><boxGeometry args={[.32,.6,.04]}/></mesh>
    </>;
    case "white": return <>
      <mesh position={[0,2.09,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.23,.022,8,32]}/><meshStandardMaterial color="#fff0ac" emissive="#d4bc6c" emissiveIntensity={1.1}/></mesh>
      <mesh position={[0,.66,0]} material={suit}><cylinderGeometry args={[.24,.38,.94,20]}/></mesh>
      {[-1,1].map(sd=><group key={sd} position={[sd*.18,1.4,-.25]}>{Array.from({length:10},(_,i)=><mesh key={i} position={[sd*(.17+i*.06),.25-i*.04,-i*.01]} rotation={[0,0,sd*(.4+i*.07)]} scale={[1,1,.25]} material={suit}><capsuleGeometry args={[.055,.6-i*.026,4,8]}/></mesh>)}</group>)}
      <mesh position={[0,.94,.19]} material={trim}><boxGeometry args={[.45,.04,.03]}/></mesh>
    </>;
    case "diver": return <>
      <mesh position={[0,1.96,-.04]} scale={[1,.6,1]}><sphereGeometry args={[.27,20,12,0,Math.PI*2,0,Math.PI/2]}/>{std("#bda15d",{metalness:.75})}</mesh>
      {[-1,1].map(sd=><group key={sd} position={[sd*.26,1.69,-.02]} rotation={[0,Math.PI/2,0]}><mesh><torusGeometry args={[.09,.025,8,20]}/>{std("#af8d49",{metalness:.8})}</mesh><mesh><circleGeometry args={[.078,20]}/>{std("#64b0bd")}</mesh></group>)}
      <mesh position={[0,1.44,-.04]} rotation={[Math.PI/2,0,0]} material={trim}><torusGeometry args={[.22,.045,8,24]}/></mesh>
      {[-.11,.11].map(x=><mesh key={x} position={[x,1.21,-.35]}><capsuleGeometry args={[.08,.43,6,12]}/>{std("#bdc8bf",{metalness:.6})}</mesh>)}
      <mesh position={[0,1.14,.2]}><boxGeometry args={[.19,.2,.045]}/>{std("#287580")}</mesh>
    </>;
    case "office": return <>
      <mesh position={[0,1.97,-.04]}><boxGeometry args={[.44,.11,.38]}/>{std("#444455")}</mesh>
      <mesh position={[0,1.39,.19]}><boxGeometry args={[.22,.12,.025]}/>{std("#e8e5df")}</mesh>
      <mesh position={[0,1.15,.22]}><coneGeometry args={[.045,.42,4]}/>{std("#713948")}</mesh>
      {[-1,1].map(sd=><mesh key={sd} position={[sd*.13,1.24,.2]} rotation={[0,0,sd*.35]} material={dark}><boxGeometry args={[.13,.39,.025]}/></mesh>)}
      <mesh position={[.23,.84,.07]}><boxGeometry args={[.24,.32,.11]}/>{std("#4d3425")}</mesh>
      {[1.08,1.19].map(y=><mesh key={y} position={[-.13,y,.205]} material={trim}><sphereGeometry args={[.014,8,6]}/></mesh>)}
    </>;
    case "agent0": return <>
      <mesh position={[0,1.99,-.02]}><boxGeometry args={[.46,.08,.43]}/>{std("#111a23")}</mesh>
      <mesh position={[.265,1.75,.015]}><boxGeometry args={[.045,.19,.1]}/>{std("#718187")}</mesh>
      <mesh position={[.26,1.58,.07]} rotation={[0,0,.2]}><boxGeometry args={[.018,.22,.018]}/>{std("#202b31")}</mesh>
      <mesh position={[0,1.22,.2]}><boxGeometry args={[.38,.38,.06]}/>{std("#17222c")}</mesh>
      {[0,1,2].map(i=><mesh key={i} position={[-.12+i*.12,1.1,.25]}><boxGeometry args={[.09,.12,.07]}/>{std("#394c53")}</mesh>)}
      <mesh position={[0,1.25,-.25]}><boxGeometry args={[.15,.48,.09]}/>{std("#566467")}</mesh>
    </>;
    case "gears": return <>
      {[-1,1].map(sd=><group key={sd} position={[sd*.27,1.7,-.01]} rotation={[0,Math.PI/2,0]}><mesh><torusGeometry args={[.105,.023,6,16]}/>{std("#a3aaa2",{metalness:.9})}</mesh>{Array.from({length:10},(_,i)=><mesh key={i} position={[Math.cos(i*Math.PI/5)*.11,Math.sin(i*Math.PI/5)*.11,0]} rotation={[0,0,i*Math.PI/5]}><boxGeometry args={[.045,.035,.05]}/>{std("#5b6868",{metalness:.8})}</mesh>)}</group>)}
      {[.95,1.12,1.29].map(y=><mesh key={y} position={[0,y,.2]} material={trim}><boxGeometry args={[.38,.035,.06]}/></mesh>)}
      {[-.12,.12].map(x=><mesh key={x} position={[x,1.2,-.28]} material={trim}><cylinderGeometry args={[.04,.04,.5,12]}/></mesh>)}
      <mesh position={[0,1.98,0]} material={trim}><sphereGeometry args={[.045,12,8]}/></mesh>
    </>;
    case "security": return <>
      <mesh position={[0,1.97,-.04]}><cylinderGeometry args={[.24,.26,.12,16]}/>{std("#b85d79")}</mesh><mesh position={[0,1.92,.24]}><boxGeometry args={[.3,.025,.15]}/>{std("#6a3a58")}</mesh>
      <mesh position={[0,2.0,.2]} rotation={[0,0,Math.PI/4]}><boxGeometry args={[.07,.07,.018]}/>{std("#e0d4a6",{metalness:.8})}</mesh>
      <mesh position={[-.15,1.3,.21]}><boxGeometry args={[.06,.085,.015]}/>{std("#e0d4a6")}</mesh>
      <mesh position={[.18,1.26,.22]} material={dark}><boxGeometry args={[.09,.19,.065]}/></mesh><mesh position={[.18,1.42,.22]} material={dark}><cylinderGeometry args={[.006,.006,.16,6]}/></mesh>
      <mesh position={[.25,.87,.06]} material={dark}><boxGeometry args={[.09,.27,.1]}/></mesh>
    </>;
    case "firefighter": return <>
      <mesh position={[0,1.96,-.08]} scale={[1,.6,1.2]}><sphereGeometry args={[.29,20,12,0,Math.PI*2,0,Math.PI/2]}/>{std("#b42a20")}</mesh>
      <mesh position={[0,1.93,-.24]}><boxGeometry args={[.48,.025,.27]}/>{std("#8e251e")}</mesh><mesh position={[0,2.04,.17]}><boxGeometry args={[.13,.13,.025]}/>{std("#e7d395",{metalness:.7})}</mesh>
      {[1.03,1.34].map(y=><mesh key={y} position={[0,y,0]}><cylinderGeometry args={[.277,.277,.045,16]}/>{std("#dae29b")}</mesh>)}
      <mesh position={[0,1.2,-.35]}><capsuleGeometry args={[.12,.48,6,12]}/>{std("#d5d9ca",{metalness:.65})}</mesh>
      <mesh position={[.29,1.15,-.2]} rotation={[0,0,.25]}><boxGeometry args={[.05,.65,.07]}/>{std("#774633")}</mesh>
    </>;
    case "blackbunny": return <>
      {[-1,1].map(sd=><group key={sd}><mesh position={[sd*.18,2.17,-.04]} rotation={[0,0,sd*.2]} scale={[1,1,.4]}><capsuleGeometry args={[.075,.43,6,12]}/>{std("#28232c")}</mesh><mesh position={[sd*.18,2.17,.0]} rotation={[0,0,sd*.2]}><boxGeometry args={[.055,.37,.012]}/>{std("#714c70")}</mesh></group>)}
      <mesh position={[0,1.2,.19]} scale={[1,1.4,.3]}><sphereGeometry args={[.17,16,12]}/>{std("#514859")}</mesh><mesh position={[0,.8,-.22]}><sphereGeometry args={[.11,14,10]}/>{std("#38323f")}</mesh>
      <mesh position={[0,1.45,.19]}><torusGeometry args={[.045,.012,6,12]}/>{std("#a789ad")}</mesh>
    </>;
    case "blocky": return <>
      <mesh position={[0,1.98,-.02]}><boxGeometry args={[.51,.14,.47]}/>{std("#61462e")}</mesh><mesh position={[0,2.04,.23]}><boxGeometry args={[.095,.09,.05]}/><meshStandardMaterial color="#eeeac6" emissive="#c7b76b" emissiveIntensity={1}/></mesh>
      {[-1,1].map(sd=><mesh key={sd} position={[sd*.34,1.42,0]}><boxGeometry args={[.2,.2,.22]}/>{std("#359a97")}</mesh>)}
      <mesh position={[0,1.16,.2]}><boxGeometry args={[.39,.32,.045]}/>{std("#215f65")}</mesh><mesh position={[0,1.17,.23]}><boxGeometry args={[.25,.11,.04]}/>{std("#a17d44")}</mesh>
      <mesh position={[0,1.25,-.3]} rotation={[0,0,.75]}><boxGeometry args={[.055,.75,.055]}/>{std("#77532e")}</mesh><mesh position={[-.2,1.48,-.3]} rotation={[0,0,.75]}><boxGeometry args={[.43,.075,.06]}/>{std("#8ae0d1",{metalness:.8})}</mesh>
    </>;
    case "flesh": return <>
      {Array.from({length:12},(_,i)=><mesh key={i} position={[Math.sin(i*2.4)*.27,1.05+i*.028,Math.cos(i*2.4)*.19]} rotation={[0,0,i*.5]} scale={[1,1,.6]}><capsuleGeometry args={[.045,.2,4,8]}/>{std(i%2?"#b67c72":"#763334")}</mesh>)}
      {[-1,1].map(sd=><mesh key={sd} position={[sd*.25,1.95,-.08]} rotation={[0,0,-sd*.45]}><coneGeometry args={[.07,.32,6]}/>{std("#c9b298")}</mesh>)}
      <mesh position={[0,1.2,-.28]}><sphereGeometry args={[.2,16,12]}/>{std("#a65457",{roughness:.4})}</mesh>
      <mesh position={[0,1.02,.22]}><torusGeometry args={[.14,.018,6,18]}/>{std("#cca395")}</mesh>
    </>;
    case "olympus": return <>
      <mesh position={[0,1.97,-.04]} rotation={[0,0,.2]}><boxGeometry args={[.09,.12,.39]}/>{std("#9d2425")}</mesh>
      <mesh position={[0,1.25,.195]} rotation={[0,0,.53]}><boxGeometry args={[.085,.53,.025]}/>{std("#a22c29")}</mesh>
      <mesh position={[-.36,1.43,0]} scale={[1,.7,1]}><sphereGeometry args={[.18,12,8]}/>{std("#715a3c",{metalness:.5})}</mesh>
      <mesh position={[0,.72,0]}><cylinderGeometry args={[.25,.3,.34,10]}/>{std("#6c4930")}</mesh>
      {[-1,1].map(sd=><group key={sd} position={[sd*.36,1.11,.02]}>{[0,1,2].map(i=><mesh key={i} position={[0,-i*.045,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.09,.012,6,12]}/>{std("#8b8c82",{metalness:.9})}</mesh>)}</group>)}
    </>;
    case "king": return <>
      <mesh position={[0,1.99,-.02]}><cylinderGeometry args={[.23,.25,.15,16]}/>{std("#2f2c38",{metalness:.4})}</mesh><mesh position={[0,2.18,-.02]}><boxGeometry args={[.04,.28,.04]}/>{std("#d5b567",{metalness:.8})}</mesh><mesh position={[0,2.22,-.02]}><boxGeometry args={[.18,.04,.04]}/>{std("#d5b567",{metalness:.8})}</mesh>
      <mesh position={[0,.69,0]}><cylinderGeometry args={[.22,.36,.95,12]}/>{std("#272530")}</mesh>
      <mesh position={[0,1.18,.21]}><boxGeometry args={[.16,.23,.03]}/>{std("#bfa36a")}</mesh>
      {[-1,1].map(sd=><mesh key={sd} position={[sd*.32,1.39,-.06]}><boxGeometry args={[.19,.08,.35]}/>{std("#716447",{metalness:.6})}</mesh>)}
    </>;
    case "queen": return <>
      <mesh position={[0,1.97,-.02]}><torusGeometry args={[.24,.026,8,24]}/>{std("#dcd6c0",{metalness:.3})}</mesh>
      {Array.from({length:7},(_,i)=><mesh key={i} position={[Math.cos(i*Math.PI*2/7)*.2,2.07,Math.sin(i*Math.PI*2/7)*.2]}><coneGeometry args={[.035,.22,6]}/>{std("#d4bc83",{metalness:.5})}</mesh>)}
      <mesh position={[0,.66,0]}><cylinderGeometry args={[.22,.42,.98,24]}/>{std("#e7e2d2")}</mesh>
      {Array.from({length:12},(_,i)=><mesh key={i} position={[Math.cos(i*Math.PI/6)*.35,.4,Math.sin(i*Math.PI/6)*.35]}><boxGeometry args={[.025,.44,.025]}/>{std("#c6bda0")}</mesh>)}
      <mesh position={[0,1.37,.2]}><sphereGeometry args={[.035,12,8]}/>{std("#af8560",{metalness:.7})}</mesh>
    </>;
    case "bathroom": return <>
      <mesh position={[0,1.99,-.02]} scale={[1,.65,1]}><sphereGeometry args={[.27,16,12]}/>{std("#e0e7de")}</mesh><mesh position={[0,2.08,.03]} rotation={[0,0,.6]}><torusGeometry args={[.07,.032,8,20]}/>{std("#c6d5cd")}</mesh>
      <mesh position={[0,.78,.03]}><cylinderGeometry args={[.26,.32,.48,18]}/>{std("#dbe5e0")}</mesh><mesh position={[0,1.17,.21]}><boxGeometry args={[.36,.36,.025]}/>{std("#cbd7d4")}</mesh>
      <mesh position={[.19,1.1,.24]} rotation={[0,0,.2]}><boxGeometry args={[.09,.32,.05]}/>{std("#a9bdba")}</mesh>
      {[-.18,.18].map(x=><mesh key={x} position={[x,.11,.15]}><boxGeometry args={[.22,.07,.4]}/>{std("#7ba29d")}</mesh>)}
    </>;
    case "void": return <>
      <mesh position={[0,2.04,-.04]} rotation={[Math.PI/2,.3,0]}><torusGeometry args={[.28,.012,6,32,Math.PI*1.7]}/>{std("#525574",{emissive:"#242639"})}</mesh>
      {Array.from({length:8},(_,i)=><mesh key={i} position={[Math.sin(i)*.31,.8+i*.07,-.2]} rotation={[i*.3,0,i]}><tetrahedronGeometry args={[.12,0]}/>{std("#262b40",{metalness:.4})}</mesh>)}
      <mesh position={[0,1.12,.21]}><torusGeometry args={[.115,.02,6,24]}/>{std("#777896",{emissive:"#34354a"})}</mesh>
      <mesh position={[0,.65,-.08]}><coneGeometry args={[.33,.8,7,1,true]}/>{std("#181e2d",{side:THREE.DoubleSide})}</mesh>
    </>;
    case "animatronic": return <>
      {[-1,1].map(sd=><group key={sd}><mesh position={[sd*.2,2.02,-.03]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.09,.09,.08,16]}/>{std("#bd7535")}</mesh><mesh position={[sd*.2,2.02,.018]}><circleGeometry args={[.054,16]}/>{std("#705036")}</mesh><mesh position={[sd*.34,1.42,0]}><sphereGeometry args={[.145,16,12]}/>{std("#b56b2b")}</mesh></group>)}
      <mesh position={[0,2.07,-.09]}><cylinderGeometry args={[.12,.15,.17,16]}/>{std("#38352f")}</mesh>
      <mesh position={[0,1.44,.21]}><boxGeometry args={[.08,.04,.025]}/>{std("#422c29")}</mesh>
      <mesh position={[0,1.19,.195]} scale={[1,1.1,.25]}><sphereGeometry args={[.19,16,12]}/>{std("#d7b981")}</mesh>
      {[1.08,1.23,1.35].map(y=><mesh key={y} position={[0,y,.25]}><sphereGeometry args={[.014,8,6]}/>{std("#393d37")}</mesh>)}
    </>;
    case "playtime": return <>
      <mesh position={[0,1.99,-.04]}><boxGeometry args={[.43,.12,.38]}/>{std("#d4ae32")}</mesh>
      <mesh position={[0,1.18,-.31]}><boxGeometry args={[.45,.48,.22]}/>{std("#3d5fa2")}</mesh>
      {[-1,1].map(sd=><group key={sd} position={[sd*.35,1.12,0]}><mesh><capsuleGeometry args={[.1,.32,5,12]}/>{std("#e6c34f")}</mesh><mesh position={[0,-.3,.05]}><boxGeometry args={[.17,.16,.07]}/>{std(sd<0?"#c43134":"#2c65b7")}</mesh>{Array.from({length:4},(_,i)=><mesh key={i} position={[-.065+i*.043,-.41,.06]}><capsuleGeometry args={[.016,.07,3,6]}/>{std(sd<0?"#c43134":"#2c65b7")}</mesh>)}</group>)}
      <mesh position={[0,1.17,.2]}><boxGeometry args={[.28,.3,.04]}/>{std("#395f9f")}</mesh>
    </>;
    default: return null;
  }
}

/** Shared costume model for the mirror and every online player. */
export const Character = forwardRef<THREE.Group, { outfit: string; avatar?: string; held?: string; moving?: () => number }>(
  function Character({ outfit, avatar, held, moving }, ref) {
    const color = OUTFITS.find(o => o.id === outfit)?.color ?? "#c9a227";
    const knight = outfit === "ash", angel = outfit === "white";
    const suit = useMemo(() => new THREE.MeshStandardMaterial({ map: knight ? metalTex(color) : fabricTex(color), roughness: knight ? .38 : .9, metalness: knight ? .75 : 0 }), [color, knight]);
    const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#262b28", roughness: .85 }), []);
    const trim = useMemo(() => new THREE.MeshStandardMaterial({ color: angel || outfit === "blood" ? "#d6b74e" : outfit === "rust" ? "#e4e5c7" : "#969b89", metalness: .45, roughness: .45 }), [angel, outfit]);
    const bezel = useMemo(() => new THREE.MeshStandardMaterial({ color: "#121513", roughness: .5, metalness: .3 }), []);
    const face = useMemo(() => avatar ? imageTex(avatar) : null, [avatar]);
    const left = useRef<THREE.Group>(null), right = useRef<THREE.Group>(null), arm = useRef<THREE.Group>(null);
    const time = useRef(0);
    useFrame((_, dt) => {
      const m = moving?.() ?? 0; time.current += dt * (4 + m * 4);
      const swing = Math.sin(time.current) * .55 * Math.min(1, m);
      if (left.current) left.current.rotation.x = swing;
      if (right.current) right.current.rotation.x = -swing;
      if (arm.current) arm.current.rotation.x = -swing * .8;
    });
    const item = held ? ITEMS[held] : undefined;
    const fz = HEAD_FRONT + .004;
    const half = SCREEN / 2, edge = half + BEZEL / 2 - .006;
    return <group ref={ref}>
      {[-1, 1].map(side => <group key={side} ref={side < 0 ? left : right} position={[side * .14, .88, 0]}>
        <mesh position={[0, -.36, 0]} material={suit}><capsuleGeometry args={[.105, .51, 4, 10]} /></mesh>
        {knight && <><mesh position={[0, -.38, .105]} material={trim}><sphereGeometry args={[.115, 8, 6]} /></mesh><mesh position={[0, -.62, .08]} material={suit}><boxGeometry args={[.2, .3, .12]} /></mesh></>}
        <mesh position={[0, -.78, .055]} material={dark}><boxGeometry args={[.23, .2, .34]} /></mesh>
      </group>)}
      <mesh position={[0, 1.18, 0]} scale={[1, 1, .7]} material={suit}><capsuleGeometry args={[.265, .3, 4, 12]} /></mesh>
      <mesh position={[0, .93, 0]} material={dark}><boxGeometry args={[.48, .075, .32]} /></mesh>
      <mesh position={[0, .93, .18]} material={trim}><boxGeometry args={[.1, .065, .025]} /></mesh>
      {[-1, 1].map(side => <group key={side} ref={side < 0 ? arm : undefined} position={[side * .32, 1.43, 0]} rotation={[side > 0 && item ? -1.1 : 0, 0, side * .06]}>
        <mesh position={[0, -.25, 0]} material={suit}><capsuleGeometry args={[.085, .38, 4, 10]} /></mesh>
        <mesh position={[0, -.55, 0]} material={dark}><boxGeometry args={[.16, .16, .18]} /></mesh>
        {side > 0 && item && (item.scrap ? <sprite position={[0, -.57, .08]} scale={[.35, .35, .35]}><spriteMaterial map={imageTex(item.img)} transparent alphaTest={.3} /></sprite> : <group position={[0,-.56,.04]} rotation={[1.1,0,0]} scale={.6}><ToolModel id={item.id}/></group>)}
      </group>)}
      {/* neck + flat-fronted helmet head */}
      <mesh position={[0, 1.47, 0]} material={dark}><cylinderGeometry args={[.09, .11, .1, 10]} /></mesh>
      <RoundedBox args={[HEAD_W, HEAD_H, HEAD_D]} radius={.06} smoothness={3} position={[0, HEAD_Y, 0]} material={suit} />
      {/* screen: bezel bars overlap the screen edge so the image and border are one piece */}
      <group position={[0, HEAD_Y, fz]}>
        <mesh position={[0, 0, -.001]} material={bezel}><planeGeometry args={[SCREEN + BEZEL * 2, SCREEN + BEZEL * 2]} /></mesh>
        <mesh>
          <planeGeometry args={[SCREEN, SCREEN]} />
          {face ? <meshBasicMaterial map={face} toneMapped={false} /> : <meshStandardMaterial color="#0d1a12" emissive="#0a2a14" />}
        </mesh>
        {[[0, edge, SCREEN + BEZEL * 2, BEZEL], [0, -edge, SCREEN + BEZEL * 2, BEZEL], [edge, 0, BEZEL, SCREEN], [-edge, 0, BEZEL, SCREEN]].map(([x, y, w, h], i) =>
          <mesh key={i} position={[x, y, .003]} material={bezel}><boxGeometry args={[w, h, .008]} /></mesh>)}
      </group>
      <Gear outfit={outfit} m={{ suit, dark, trim }} />
    </group>;
  },
);
