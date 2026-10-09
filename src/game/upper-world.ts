import type { SolidBox } from "./rules";
export const STAIR_ROOMS=[60,100,160,220,280];
export const UPPER={x0:1000,x1:1300,z0:0,z1:300,y:12};
export const HOUSES=[{x:1040,z:48},{x:1130,z:60},{x:1240,z:95},{x:1210,z:225},{x:1070,z:218}];
export function upperGround(x:number,z:number){const hills=HOUSES.map(h=>5*Math.exp(-((x-h.x)**2+(z-h.z)**2)/1800));return UPPER.y+Math.max(...hills)+1.5*Math.sin((x-1000)/40)*Math.sin(z/35);}
export const upperBoxes:SolidBox[]=[];
HOUSES.forEach(h=>{const y=upperGround(h.x,h.z);const add=(x0:number,x1:number,z0:number,z1:number,height:number)=>upperBoxes.push({x0:h.x+x0,x1:h.x+x1,z0:h.z+z0,z1:h.z+z1,y0:y,y1:y+height});add(-4,-3.8,-4,4,7);add(3.8,4,-4,4,7);add(-4,4,-4,-3.8,7);add(-4,-.9,3.8,4,7);add(.9,4,3.8,4,7);add(-2.8,-.6,-1,1,.85);add(-3.2,-2.6,1.4,2.1,1);add(-.8,-.2,1.4,2.1,1);add(2,3.5,-3.4,-2.8,2);});
upperBoxes.push({x0:999,x1:1000,z0:0,z1:300,y0:0,y1:100},{x0:1300,x1:1301,z0:0,z1:300,y0:0,y1:100},{x0:1000,x1:1300,z0:-1,z1:0,y0:0,y1:100},{x0:1000,x1:1300,z0:300,z1:301,y0:0,y1:100});