import {describe,it,expect} from "vitest";
import {ALPHA_DECOR_PRICES,BLUEPRINT_MS,craftReady,themePayment,statusKey,radarOffset,stareTime,SPRINT_SPEED} from "@/game/rules";
import {ITEMS,OUTFITS} from "@/game/data";
import {STAIR_ROOMS,HOUSES,ACCESS_THEMES,stairHeight} from "@/game/upper-world";
describe("Alpha 0.2 rules",()=>{
 for(const [id,price] of Object.entries({lightstand:400,booktable:1280,uppercamera:3130,walltelephone:1200,jukebox:1440,candles:270,blueprint:6990,psbconsole:3400,projector:4200}))it(`${id} costs ${price}`,()=>expect(ALPHA_DECOR_PRICES[id as keyof typeof ALPHA_DECOR_PRICES]).toBe(price));
 it("crafts after exactly 16 real hours",()=>{expect(BLUEPRINT_MS).toBe(57600000);expect(craftReady(0,57599999)).toBe(false);expect(craftReady(0,57600000)).toBe(true);});
 it("charges 1000 every theme change including returning",()=>{expect(themePayment(2500,0,1)).toBe(1500);expect(themePayment(1500,1,0)).toBe(500);expect(themePayment(999,0,1)).toBeNull();expect(themePayment(2000,0,0)).toBeNull();});
 it("opens status only with TAB and never during death",()=>{expect(statusKey("Escape",false,false)).toBe("none");expect(statusKey("Tab",false,false)).toBe("open");expect(statusKey("Escape",true,false)).toBe("close");expect(statusKey("Tab",false,true)).toBe("none");});
 it("radar puts forward above center after turning",()=>{const a=radarOffset(0,-10,0);expect(a).toEqual({x:0,y:-10});const b=radarOffset(-10,0,Math.PI/2);expect(b.x).toBeCloseTo(0);expect(b.y).toBeCloseTo(-10);});
 it("interrupting Stalker eye contact resets the timer",()=>{expect(stareTime(3.9,false,.1)).toBe(0);expect(stareTime(3.9,true,.1)).toBe(4);});
 it("sprint is increased to 6.8",()=>expect(SPRINT_SPEED).toBe(6.8));
 it("provides ten distinct continuous stairs to ten furnished themed houses",()=>{expect(new Set(STAIR_ROOMS).size).toBe(10);expect(HOUSES.length).toBe(10);expect(new Set(ACCESS_THEMES).size).toBe(10);expect(stairHeight(-12+(STAIR_ROOMS[0]%20)*14+9,Math.floor(STAIR_ROOMS[0]/20)*14+10)).toBe(6);expect(stairHeight(-12+(STAIR_ROOMS[0]%20)*14+11.2,Math.floor(STAIR_ROOMS[0]/20)*14+1)).toBe(12);});
 const scraps:{[id:string]:[number,number]}={almondcan:[140,1],camcorder:[490,1],lighttube:[130,1],liquidpain:[340,1],crtmonitor:[1400,2],glitchcube:[3000,2],stapler:[200,1],rotaryphone:[320,1],classified:[710,1],cassette:[500,1],fakeplant:[290,2],spraycan:[210,1],walkietalkie:[730,1],mannequinhead:[390,1],ruler:[120,1],keyboard:[440,1],whiteboard:[910,2],slideprojector:[1100,2],asynccrate:[1800,2],hazardbarrel:[4100,2],portablegen:[1400,2]};
 for(const [id,[value,slots]] of Object.entries(scraps))it(`${id} retains requested value and slots`,()=>{expect(ITEMS[id]?.value).toBe(value);expect(ITEMS[id]?.slots).toBe(slots);});
 it("has Classic plus 20 replacement outfits",()=>{expect(OUTFITS.length).toBe(21);expect(OUTFITS.find(o=>o.id==="classic")?.price).toBe(0);expect(OUTFITS.some(o=>o.id==="plague")).toBe(false);});
});