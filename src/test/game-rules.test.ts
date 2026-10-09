import { describe, it, expect } from "vitest";
import { jumpStamina, extractionXp, playScreen, verticalStep, carrierSlots, dailyQuotaTarget, blackRoseEligible, MAKA_CHASE_SECONDS, MAKA_BLACKOUT_MS, CHASE_COOLDOWN } from "@/game/rules";
describe("Player rules", () => {
  it("charges exactly 5 stamina for a grounded jump", () => { expect(jumpStamina(100, true)).toBe(95); expect(jumpStamina(5, true)).toBe(0); expect(jumpStamina(4, true)).toBeNull(); expect(jumpStamina(100, false)).toBeNull(); });
  it("awards 3 XP for one-slot scrap", () => expect(extractionXp(1)).toBe(3));
  it("awards 5 XP for two-slot scrap", () => expect(extractionXp(2)).toBe(5));
  it("sends new players to character creation", () => expect(playScreen(false)).toBe("create"));
  it("keeps returning players' progress", () => expect(playScreen(true)).toBe("drop"));
  it("lands on an object below the feet", () => { const b = { x0: -1, x1: 1, z0: -1, z1: 1, y0: 0, y1: .8 }; expect(verticalStep(0, 0, .85, -2, .05, [b], 4)).toEqual({ y: .8, velocity: 0, grounded: true }); });
  it("does not teleport onto an unreachable object", () => { const b = { x0: -1, x1: 1, z0: -1, z1: 1, y0: 0, y1: 3 }; expect(verticalStep(0, 0, .85, -2, .05, [b], 4).y).toBeLessThan(.85); });
});
describe("October gameplay", () => {
 it("starts quota at 10000 and caps at 20000",()=> { expect(dailyQuotaTarget(0)).toBe(10000);expect(dailyQuotaTarget(1)).toBe(10100);expect(dailyQuotaTarget(1000)).toBe(20000); });
 it("awards slots at Carrier 7 and 10",()=>{expect(carrierSlots(6)).toBe(4);expect(carrierSlots(7)).toBe(5);expect(carrierSlots(10)).toBe(6);});
 it("requires battery strictly below 30 with a 30 percent roll",()=>{expect(blackRoseEligible(30,0)).toBe(false);expect(blackRoseEligible(29,.29)).toBe(true);expect(blackRoseEligible(29,.3)).toBe(false);});
 it("keeps requested chase and blackout durations",()=>{expect(MAKA_CHASE_SECONDS).toBe(12);expect(MAKA_BLACKOUT_MS).toBe(60000);expect(CHASE_COOLDOWN).toBe(10);});
});
