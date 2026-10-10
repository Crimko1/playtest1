# Backrooms Q — Big Update Plan

There's too much here for one go without breaking things, so I'll build it in phases. Each phase ends with the automatic checks and a signed-in playtest before the next one starts.

## Phase 1 — Quick fixes and your new sounds/entities (first)
- Intro sound plays only once, on the studio logo. It never plays again in the menu or when clicking in the game.
- Extractor: money, XP and quota update instantly. The game shows the new amounts right away, then confirms in the background.
- Your Room door: no Door Open sound. That sound only plays when entering a room.
- Entity loses you: no text at all. Entities are visible in the laboratory. Escaping into the laboratory ends the chase immediately.
- Stalker: new grab sound and new running sound. Runs much faster. The grab shows your Stalker Jumpscare GIF for 1 second, then 5 seconds of blur, glitch, darkness, dizzy sway and slow walking.
- Akamanto: walk sound while patrolling. Chase sound loops until she loses you.
- Thirsty: walk and chase sounds the same way. Seeing you in a dark room starts a 10-second chase, then a 10-second wait before he can chase again.
- Maka remake:
  - Every room goes dark when she appears. Lit rooms get their light back after 40 seconds.
  - She freezes while you look at her and rushes when you look away.
  - She hunts you around walls, opens doors, turns your flashlight dark red and loops her sound.
  - Taking an elevator ends her chase.
- New entity, Charle:
  - Hops around, opens and closes doors, and rushes at you when he sees you.
  - Starts one of his two conversations in an eerie message box above the inventory. Left click moves to the next line.
  - Then you have a 40-second countdown to find his hopping bunny or his flying food nearby. Pick it up with E and hand it to him.
  - Success: his thank-you lines, then a 120-second cooldown. Failure: a very fast chase that kills you.
  - Uses your Charle, bunny and food GIFs.

## Phase 2 — Removals, prices already done, layout
- Remove the stair rooms and the upper level and its houses. Normal, unique rooms replace them.
- Smaller laboratory with the same machines, boards and text. Add a big open back hall into more Backrooms, with nothing blocking the doorway.
- Elevator doors stay inside their walls.
- Light from an open door spills a little way into dark rooms.

## Phase 3 — Performance and stability
- Fix the lag when looking at elevators and in heavy rooms: fewer lights and shadows, merged walls, and only nearby rooms drawn.
- Stop the random reloads that send you back to the start.
- Leaving the game remembers your last spot in the Backrooms, and your Alogapawn if you had one out.

## Phase 4 — Multiplayer
- Items and money stay private to each player. Only the quota is shared.
- Each entity has one target. When two players are near, it has up to a 20% chance to switch targets.
- Only you can change decorations in your room. Visitors can use only the Light Stand and the Standing Mirror.
- Sounds get quieter with distance and come from the right direction in headphones.
- Proximity voice chat. M mutes and unmutes. Options gets mic settings and a mic test.
- Mimic copies short clips of players' voices and keeps them so it can reuse them later.

## Phase 5 — World expansion
- 500 rooms and 14 elevators.
- Many community-inspired level themes, written as data:
  - small mazes with dead ends
  - claustrophobic rooms
  - huge halls
  - forests, including one under a fake sky
  - rooms with doors in odd wall positions
  - solid objects everywhere
- New minions: more Eyes and Half Bodies, up to 30 per hour, plus the Cockroach. New HP and damage values as you listed.

## Phase 6 — New items and decorations
- Items: Scrap Bag, M2.0 Flashlight Charge, Camera Device, Pocket CRT TV, Empty Paper, Power Device, Alogapawn.
- Decorations: Vintage Jukebox, the 7 Comfy toys, Custom Comfy, Favourite Entity, Standing Mirror, Item Extractor, Fake Wall Leafs.
- Video Projector plays a YouTube link on repeat.

## Phase 7 — Visual overhaul
- New icons drawn one at a time.
- Held items that match their icons. Bigger hand on the right with an overhead-to-left swing.
- More detailed textures for walls, decorations, outfits and lab machines.
- Stronger VHS filter.
- All of this stays within a frame-rate budget so it doesn't bring the lag back.

## Honest limits
- I can't promise zero bugs or zero lag. I'll test each phase in the game and fix what I find.
- Fully realistic graphics aren't possible in a browser game. I'll aim for a detailed retro PS2 horror look that still runs smoothly.
- "Over 300/400 community levels" will be many distinct themed variations. Each won't be an exact copy of a community level.

## Technical details
- New rules and timers go in `src/game/rules.ts`, each with tests: Charle 40s/120s, Thirsty 10s/10s, Maka 40s light return, Stalker 5s effect, damage values.
- The extractor updates the screen first, and the database call confirms afterwards.
- Charle uses the existing entity framework and shared navigation. His conversation text lives as data.
- Voice chat uses peer-to-peer audio between nearby players, connected through the existing live channel. Mimic clips are stored in the cloud.
