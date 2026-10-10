import { describe, it, expect } from "vitest";
import { hourlyScrapTarget, canStoreTool, pipeRemaining, sleepComplete, DECOR_PRICES, TOOL_PRICES, STORAGE_SLOTS, PIPE_HITS, penIndex } from "@/game/rules";
import { THEMES } from "@/game/themes";
import { rooms, CELL, hourlyScrap } from "@/game/world";

describe("Expansion rules", () => {
  it("keeps exact prices", () => {
    expect(DECOR_PRICES).toEqual({ fishtank: 2300, painting: 400, cross: 730, storagebox: 810, plant: 320, custompaint: 1300, stalkdevice: 3400 });
    expect(TOOL_PRICES).toEqual({ pipe: 270, flashcharge: 250, axe: 1430, pistol: 1700, health: 400, adrenaline: 580, knife: 500 });
  });
  it("storage holds ten tools and rejects scrap", () => {
    expect(STORAGE_SLOTS).toBe(10);
    expect(canStoreTool("axe", 9)).toBe(true);
    expect(canStoreTool("axe", 10)).toBe(false);
    expect(canStoreTool("metal", 0)).toBe(false);
  });
  it("pipe lasts exactly 20 hits", () => {
    let uses = PIPE_HITS, hits = 0;
    while (uses > 0) { uses = pipeRemaining(uses); hits++; }
    expect(hits).toBe(20);
  });
  it("sleep takes two seconds", () => { expect(sleepComplete(0, 1999)).toBe(false); expect(sleepComplete(0, 2000)).toBe(true); });
  it("pen cycles black, red, eraser", () => { expect(penIndex(0, 1)).toBe(1); expect(penIndex(2, 1)).toBe(0); expect(penIndex(0, -1)).toBe(2); });
  it("hourly refill stays within 180-250", () => {
    for (let h = 0; h < 500; h++) { const t = hourlyScrapTarget(h); expect(t).toBeGreaterThanOrEqual(180); expect(t).toBeLessThanOrEqual(250); }
    const h = 490000; expect(hourlyScrap(h).length).toBe(hourlyScrapTarget(h));
  });
});

describe("Backrooms layout", () => {
  it("has at least 101 distinct themes, all used", () => {
    expect(new Set(THEMES.map((t) => t.name)).size).toBeGreaterThanOrEqual(101);
    const used = new Set(rooms.map((r) => r.theme));
    expect(used.size).toBe(THEMES.length);
  });
  it("keeps the central cross corridor free so all doorways connect", () => {
    for (const r of rooms) for (const b of [...r.parts, ...r.water]) {
      const crossX = b.x0 < r.cx + 1.6 && b.x1 > r.cx - 1.6, crossZ = b.z0 < r.cz + 1.6 && b.z1 > r.cz - 1.6;
      expect(crossX || crossZ).toBe(false);
      expect(b.x0 >= r.x0 - 0.01 && b.x1 <= r.x0 + CELL + 0.01).toBe(true);
    }
  });
  it("places loot outside solid geometry", () => {
    for (const r of rooms) for (const s of r.spots) {
      if (s.y > 0) continue;
      expect(r.boxes.some((b) => b.y1 > 0.3 && s.x > b.x0 && s.x < b.x1 && s.z > b.z0 && s.z < b.z1)).toBe(false);
    }
  });
});

import { XP_PER_LEVEL } from "@/game/rules";
import { ITEMS, DECOR, OUTFITS } from "@/game/data";
import { rooms as allRooms, ELEVATOR_ROOMS } from "@/game/world";
import { elevatorFloor } from "@/game/Elevator";
describe("content update", () => {
  it("levels every 50 XP", () => { expect(XP_PER_LEVEL).toBe(50); });
  it("has 300 rooms and 18 elevators in valid rooms", () => { expect(allRooms.length).toBe(300); expect(ELEVATOR_ROOMS.length).toBe(18); ELEVATOR_ROOMS.forEach((i) => expect(allRooms[i]).toBeDefined()); });
  it("elevator floors are negative and hourly", () => { const f = elevatorFloor(10, 5); expect(f).toBeLessThan(-999); expect(elevatorFloor(10, 5)).toBe(f); });
  it("new scraps, tools, decor and outfits exist", () => {
    expect(ITEMS.diamond.value).toBe(2000); expect(ITEMS.entitypart.value).toBe(7800); expect(ITEMS.entitypart.slots).toBe(2);
    expect(["radar", "knife", "tear"].every((i) => ITEMS[i])).toBe(true);
    expect(DECOR.find((d) => d.id === "wallclock")?.price).toBe(360);
    expect(OUTFITS.filter((o) => o.id !== "classic").every((o) => o.price === 1500)).toBe(true);
  });
});
