import { describe, it, expect } from "vitest";
import { faceToFace, stareTime, segmentBlocked } from "@/game/rules";
import { rooms, passable, portal, roomAt, dynBoxes, lineOfSight, LAB } from "@/game/world";
import { walkToward } from "@/game/navigation";
import { rt } from "@/game/runtime";

describe("Entity sight and triggers", () => {
  it("never detects through a wall, even face-to-face", () => expect(faceToFace(30, 1, 1, false)).toBe(false));
  it("requires both faces to be directed toward each other", () => { expect(faceToFace(30, -1, 1, true)).toBe(false); expect(faceToFace(30, 1, -1, true)).toBe(false); expect(faceToFace(30, 1, 1, true)).toBe(true); });
  it("resets stare triggers when eye contact breaks", () => { expect(stareTime(1.9, false, .05)).toBe(0); expect(stareTime(1.95, true, .05)).toBe(2); });
  it("detects a thin wall missed by sampled sight", () => { const wall = { x0: .19, x1: .21, z0: -1, z1: 1, y0: 0, y1: 3 }; expect(segmentBlocked(0,0,1,0,wall)).toBe(true); expect(segmentBlocked(0,2,1,2,wall)).toBe(false); });
  it("blocks sight through closed doors", () => {
    const box = { x0: -5.1, x1: -4.9, z0: -8, z1: -6, y0: 0, y1: 2.2, doorId: "test" };
    dynBoxes.push(box);
    try { expect(lineOfSight(-6,-7,-4,-7)).toBe(false); box.y1 = -1; expect(lineOfSight(-6,-7,-4,-7)).toBe(true); } finally { dynBoxes.splice(dynBoxes.indexOf(box),1); }
  });
});
describe("Shared enemy doorway movement", () => {
  it("crosses every passable doorway in both directions without stopping at the boundary", () => {
    for (const a of rooms) for (const b of rooms.filter(b => Math.abs(b.c-a.c)+Math.abs(b.r-a.r)===1 && passable(a,b))) {
      const p = portal(a,b), dx = Math.sign(b.c-a.c), dz = Math.sign(b.r-a.r);
      const actor = { x: p.x-dx*1.4, z: p.z-dz*1.4 };
      for (let i=0;i<100;i++) walkToward(actor,p.x+dx*2,p.z+dz*2,4,.05);
      expect(roomAt(actor.x,actor.z)?.idx, `${a.idx} -> ${b.idx}`).toBe(b.idx);
    }
  });
  it("opens a closed door before passing it", () => {
    const a = rooms.find(a => rooms.some(b => Math.abs(b.c-a.c)+Math.abs(b.r-a.r)===1 && passable(a,b)));
    if (!a) throw new Error("Missing connected rooms");
    const b = rooms.find(b => Math.abs(b.c-a.c)+Math.abs(b.r-a.r)===1 && passable(a,b)); if (!b) throw new Error("Missing neighbor");
    const p=portal(a,b), dx=Math.sign(b.c-a.c),dz=Math.sign(b.r-a.r);
    const box = { x0:p.x-(dx?.08:.9), x1:p.x+(dx?.08:.9), z0:p.z-(dz?.08:.9), z1:p.z+(dz?.08:.9), y0:0,y1:2.2,doorId:"test-ai" };
    dynBoxes.push(box); rt.doors.set("test-ai",{angle:0});
    try { const actor={x:p.x-dx*1.4,z:p.z-dz*1.4}; for(let i=0;i<100;i++) walkToward(actor,p.x+dx*2,p.z+dz*2,4,.05); expect(rt.doors.get("test-ai")?.angle).toBeGreaterThanOrEqual(1.1); expect(roomAt(actor.x,actor.z)?.idx).toBe(b.idx); }
    finally { dynBoxes.splice(dynBoxes.indexOf(box),1); rt.doors.delete("test-ai"); }
  });
  it("keeps the laboratory smaller than its original footprint", () => expect((LAB.x1-LAB.x0)*(LAB.z1-LAB.z0)).toBeLessThan(28*22));
});