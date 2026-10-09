# Backrooms Q — rooms, decorations and world expansion

## Personal room
- Entering the game always starts in your own room, with a clear spawn area that decorations cannot block. Preserve existing characters, money and owned items.
- In building mode, **R rotates the selected decoration** by a quarter-turn. Show a valid placement preview and prevent overlap with walls, doors, other objects and the spawn area.
- **E on a bed** sleeps and restores full health, including health bonuses. Fade to black, remain asleep for two seconds, then fade back; movement and other interactions pause during sleep.

## Seven new decorations
Every addition gets its own icon and detailed design, rather than reusing an existing decoration.

| Decoration | Money | Placement and interaction |
|---|---:|---|
| Fish Tank | 2300 | Table-mounted tank with water, grass, hills, an open miniature dimensional doorway and a visible Backroom beyond it. Two distinct fish swim differently. |
| Painting | 400 | Wall-mounted framed Backrooms artwork. |
| Cross | 730 | Small, detailed wall-mounted holy cross. |
| Storage Box | 810 | Floor placement; E opens exactly 10 safe inventory slots. Scrap is rejected. |
| Plant | 320 | Large green floor plant with detailed leaves and planter. |
| Custom Paint | 1300 | Wall-mounted frame; E uploads JPG, PNG or animated GIF artwork. GIFs loop in the room, including for visitors. |
| Stalk Device | 3400 | Wall-mounted camera-like television showing the live view through Uncanny’s eyes, wherever it moves. |

- Add real wall placement with mounting height and orientation, not floor objects pushed against a wall.
- Room owners alone can change artwork or transfer stored items. Each storage box keeps its own contents safely across deaths and game sessions.
- Remove Dog House from the shop and placed rooms. Preserve its purchase value by refunding existing owned or placed Dog Houses once.
- Remove all wall healing and storage holes throughout the world. Move existing stored tools into a free Storage Box in the player’s room, retaining every item; existing overflow receives additional boxes rather than losing items.

## Backrooms rebuild
- Replace the existing room collection with **at least 101 explicitly distinct themes**, including school environments, forests with small lakes, poolrooms, mazes and recognizable community-inspired liminal settings. Theme differences must include architecture, surfaces and objects—not merely different colors.
- Use varied floor plans: winding corridors, L/T-shaped spaces, linked chambers, courtyards, maze layouts and larger open rooms. Keep doors, exits and traversable routes connected.
- Add detailed objects with matching collision. Lakes and other obstacles cannot silently become walk-through surfaces.
- Rebuild enemy paths around the new layouts. Entities and minions must patrol, chase, navigate obstacles and open doors without sticking; preserve exact wall-blocked visibility and entity-specific chase triggers.
- Keep the existing retro horror identity, using textured materials and appropriate detailed model assets. Load nearby room detail only to keep the expanded world practical to render.

## Darkness and hourly scrap
- Dark rooms have no ambient visibility or self-lit scrap/entity faces. The flashlight reveals surfaces, items and entities; nearby lit rooms must not illuminate through solid walls.
- Establish a shared hourly scrap supply of **180–250 items** across the Backrooms. Each hourly refill replenishes the active supply to that hour’s target, rather than adding another full batch on top of leftovers.
- Use shared hour timing and collection records so reconnecting or multiple players cannot recreate collected scrap. Keep dropped player tools separate from the hourly scrap supply.

## New tools
- **Paper Map — 1900 Money:** unique white-paper item. Right-click while holding opens the drawing sheet and releases the mouse; left-drag draws. Mouse wheel cycles black, red and white eraser. Right-click closes it and restores game controls. Save the sketch with the item, including transfers to storage and dropping/picking it up.
- **Pipe — 470 Money:** unique pipe weapon, usable for exactly **20 hits**, then removed. Carry durability through storage and dropped items.

## Technical implementation
- Extend the existing saved-item and placed-decoration models with stable instance IDs, wall mounting data, artwork and container contents. Migrate older saves without discarding items.
- Keep numeric costs, storage eligibility/capacity, sleep duration, durability and refill limits in shared gameplay rules with concrete tests.
- Separate room/theme definitions, generated collision, navigation and rendering while deriving them from the same floor plans. Keep dynamic door collision and exact line-of-sight checks authoritative for enemy movement.
- Use authenticated Lovable Cloud operations for private container contents and shared loot claims; public room visitors receive only safe decoration/display information.
- Reuse the animated-image helper for custom paintings. Render Uncanny’s view to a small offscreen texture only while a Stalk Device is visible; prevent recursive screen rendering and clean up resources.
- Source verified CC0 models for recognizable props and animals, combining them with custom detailing for the tank, dimensional doorway and device. Generate unique artwork/icons where needed and host app assets through the existing asset flow.

## Verification
- Test exact prices, 10-slot tool-only storage, 20-hit pipe durability, two-second sleep, spawn/placement safety, map persistence and the 180–250 hourly refill range.
- Test every generated layout for connected exits, collision-safe loot positions and navigable doorways; run existing sight, chase, jumping and extraction regression tests.
- Inspect the room spawn, wall placement, sleeping fade, all seven decorations, animated fish/GIFs, live Stalk screen, drawing controls and flashlight-only darkness in the running game.
- Check desktop and mobile rendering for nonblank scenes, correctly framed displays and unobstructed controls; retain the existing game controls rather than adding unrelated features.