# Backrooms Q — Bug fixes + Big Content Update

This update is too large to build safely in one go, so it is split into 4 phases. Each phase is tested before the next one starts.

## Phase 1 — Bug fixes (stability first)
- Play button sometimes does nothing: make the click always start the game, even if the music or sign-in is still loading.
- E to extract / pick up feels slow: make it react on the first press every time, and stop the delay that builds up after long play.
- Custom images going black (Custom Paint, face, everywhere): fix how uploaded pictures are stored and reloaded so they stop disappearing.
- Bugs after about an hour of play: fix the leaks that slow the game down over time (timers, lights, textures and entity data that are never cleaned up).
- Patrolling entities getting stuck, and the Stalk Device showing Uncanny stuck: improve how entities find their path and have them pick a new route when blocked.
- Player rooms in the hall appear late: load your room and other players' rooms right away.
- Dropped items (not scrap) in the Backrooms or Laboratory disappear after 1 real hour.
- Run a general check for other bugs and fix what turns up.

## Phase 2 — Player, shop and item changes
- 4 inventory slots by default. Leveling up always needs 50 XP.
- When your inventory is full, you can't pick up scrap or items, and they no longer vanish.
- Shop: remove the decoration pictures. The Backrooms painting shows the image across the whole canvas.
- Flashlight Charge costs $350. Paper Map costs $1630, and you can draw on it with the left mouse button.
- New items: Danger Radar ($2450, green scanner that shows nearby entities while you hold right click), Kitchen Knife ($800, lasts 40 hits), Entity's Tear ($2680, hold right click for 3s to fall through a dark hole into the Laboratory, single use).
- New decorations: Big Bunny ($1640), Chess Board with all the pieces ($1420), Wall Clock based on your carved clock photo, wall only, hands move fast ($2100), Scrap Display stand where you press E to show any scrap you've discovered ($1630).

## Phase 3 — Laboratory and scrap
- The mirror gets its own light.
- Entity Foundation shows each entity's name, danger level (1–3), a more accurate look, how it behaves, and how many times you've met it.
- Click the Extractor to see every scrap you've discovered, with its value and description.
- 7 new outfit themes (including Minecraft, Outlast Trials, REPO and Poppy Playtime). Every outfit costs $1500.
- 16 new scraps with new icons (Diamond, Energy Bar, Almond Water, Plant, Teddy Bear, Big Teddy Bear, Guitar, Skull Mask, Chicken Toy, Pixel Pickaxe, MP3 Player, Huggy toy, Soccer Ball, Entity's Part (very rare), Mushroom, Cards). The Hazard Suit icon becomes a folded Hazmat Suit.

## Phase 4 — Backrooms world
- Fewer monster minions, at most 1 per room, and each one comes back somewhere random 30 minutes after it dies.
- 300 rooms instead of 200, with 150+ themes and more shapes: long halls, small rooms, big rooms and weird rooms. More solid objects you can't walk through.
- 18 elevators: step in and press 1, the doors close, and 2 seconds later they open in another elevator room. No loading screen. The floor number (like -1394) changes every hour.
- Entities can move through every room and doorway.

## Technical notes
- Phase 1: audit Screens.tsx (Play gate), the interaction registry in runtime.ts (one handler per frame, no stale registrations), and the avatar/GIF texture cache (black textures come from object URLs revoked or textures disposed while still in use). Look for leaked setTimeout/makaDark timers, minion maps that keep growing, and sprite materials created per frame. Navigation gets a stuck detector (no progress for 2s, then pick a new target).
- Dropped items get a `droppedAt` timestamp and are filtered out after 3600s, on load and on every tick.
- Shared numbers (XP 50, slots 4, prices, minion cooldown) live in rules.ts and data.ts, and tests are updated to match.
- Elevator pairs are derived from the world seed. The floor label is seeded from the current UTC hour.
- Room count goes to 300 by extending the grid. Themes are data in themes.ts, and the central-corridor rule is kept so navigation stays valid.
