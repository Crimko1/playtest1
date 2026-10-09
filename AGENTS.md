<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep shared gameplay rules in `src/game/rules.ts` and test numeric rewards and movement costs there so player input and extraction use the same rules.
- Use a shared costume model for mirror, outfit previews, and remote players so outfits stay visually consistent.
- Decode animated GIF faces into canvas textures and advance them once per game frame so GIF animation works in all 3D views.
- Render the laboratory leaderboard as a read-only world display with an exact personal rank query so rankings remain correct beyond the top ten.
- Preserve animated uploads in the shared avatar helper so character creation and mirror editing do not flatten GIF faces.
- Share grounded enemy navigation through room portals and local obstacle waypoints so entities and minions use the same collision and door-opening behavior.
- Test exact line-segment visibility and uninterrupted eye-contact timers in shared gameplay rules so thin walls and interrupted gazes cannot trigger chases.
- Keep room themes as data in `src/game/themes.ts` and keep generated interior walls/water inside room quadrants so the central cross corridor always connects every doorway and navigation stays valid.
- Derive the hourly scrap supply globally from shared loot spots and gate pickups through the authenticated hourly claim function so reconnects and multiple players cannot recreate collected scrap.
- Treat dark rooms as flashlight-only by tinting unlit sprites through the shared `visibleLight` helper instead of per-component light checks.

- Gate each room mesh’s point-light and emissive shading by its own room illumination, while preserving the shadowed flashlight, so neighboring lights never reveal unlit interiors.
- Keep entity chase cues as one-shot uploaded audio keyed by entity identity and personal room palettes as shared theme data so presentation and gameplay remain consistent.
- Keep every outfit's headgear/body extras in its own case of the Character Gear switch and keep the head's front screen zone clear so faces are never covered and no two outfits share a design.
