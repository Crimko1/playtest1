import type { SolidBox } from "./rules";
export const STAIR_ROOMS=[24,57,82,119,143,176,201,234,260,287];
export const ACCESS_THEMES=["Conservatory Steps","Abandoned School Landing","Poolside Stairwell","Library of Daylight","Suburban Service Hall","Botanical Passage","Clockwork Landing","Gallery of Clouds","Quiet Chapel Steps","Observatory Approach"];
export const UPPER={x0:-12,x1:268,z0:0,z1:210,y:12};
export const stairOrigin=(idx:number)=>({x:-12+(idx%20)*14+9,z:Math.floor(idx/20)*14+1});
export const HOUSES=STAIR_ROOMS.map(idx=>({x:stairOrigin(idx).x-7,z:stairOrigin(idx).z+5}));
export function isUpper(x:number,y:number,z:number){return x>=UPPER.x0&&x<=UPPER.x1&&z>=0&&z<=UPPER.z1&&y>=UPPER.y-.05;}
export function upperGround(_x:number,_z:number){return UPPER.y;}
/** Two 6m flights meet on a generous landing. This same surface drives walking and rendering. */
export function stairHeight(x:number,z:number):number|null {
 for(const idx of STAIR_ROOMS){const o=stairOrigin(idx),dx=x-o.x,dz=z-o.z;
  if(dx<-.9||dx>3.1||dz<-.5||dz>10)return nullIfNext(x,z,idx);
  if(dz>=9)return 6;
  if(dx<=.9)return Math.max(0,Math.min(6,dz/9*6));
  if(dx>=1.3)return 6+Math.max(0,Math.min(6,(9-dz)/9*6));
 }
 return null;
}
function nullIfNext(x:number,z:number,skip:number):number|null {for(const idx of STAIR_ROOMS){if(idx===skip)continue;const o=stairOrigin(idx),dx=x-o.x,dz=z-o.z;if(dx>=-.9&&dx<=3.1&&dz>=-.5&&dz<=10){if(dz>=9)return 6;if(dx<=.9)return Math.max(0,Math.min(6,dz/9*6));if(dx>=1.3)return 6+Math.max(0,Math.min(6,(9-dz)/9*6));}}return null;}
export function inStairShaft(x:number,z:number){return STAIR_ROOMS.some(idx=>{const o=stairOrigin(idx);return x>o.x-1&&x<o.x+3.2&&z>o.z-.6&&z<o.z+10.1;});}
export const upperBoxes:SolidBox[]=[];
HOUSES.forEach(h=>{const y=UPPER.y;const add=(x0:number,x1:number,z0:number,z1:number,height:number)=>upperBoxes.push({x0:h.x+x0,x1:h.x+x1,z0:h.z+z0,z1:h.z+z1,y0:y,y1:y+height});add(-3,-2.8,-3,3,4);add(2.8,3,-3,3,4);add(-3,3,-3,-2.8,4);add(-3,-1,2.8,3,4);add(1,3,2.8,3,4);add(-2.5,-.8,-1,1,.85);add(1.5,2.5,-2.5,-1.5,2);});