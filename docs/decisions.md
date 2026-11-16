# Decisions and open questions

## Decided

1. **Start over on the designs.** The earlier designs weren't cohesive. Everything now follows one visual system (`docs/design-tokens.json`): a dark map-room look, with the player's nation always amber.
2. **Modern buildings, not medieval.** Both were explored (`BuildModern.dc.html`, `BuildMedieval.dc.html`). Modern was chosen because banks, factories, schools and clinics tie into the factions and politics. The medieval file is kept only for reference.
3. **Flat / Tilted view on the district screen.** Flat is for planning; tilted shows the placed buildings as illustrations.
4. **A district reads as one territory.** Hexes inside a district have no place names of their own. They are labelled by land type, share an amber border, and a mini-map shows the district's share of the nation.
5. **No district names on the world map yet.** This will be worked out with combat and capture.
6. **Later: player-made districts.** As players capture hexes, they should be able to split their land into areas and name them. A likely shape: the district name in the build screen header becomes a menu of the player's districts with "Rename" and "Create district from selected hexes"; captured hexes start unassigned; the mini-map shades each district differently.

7. **Stack: TypeScript, React, Vite.** As `HANDOFF.md` recommended. Rules are a pure module; saves go to `localStorage`.
8. **The daily question is mandatory.** One question per turn, answered before the turn can end. It is the game's core hook, so it cannot be skipped or queued.
9. **Ideology changes the rules.** Each axis gives a bonus that grows the further the nation leans, so the daily question has strategic weight, not just flavour. It also sets who your natural friends and enemies are.
10. **Combat and capture.** Armies are stacks of up to 8 units on a hex. They walk through their own land, occupy unclaimed land for free, and attack only nations they are at war with. Taking a capital ends a nation. Odds are shown before every attack.
11. **Every nation starts level.** 19 hexes each at turn 1, replacing the prototype's turn-14 snapshot. The early game is a race for unclaimed land.
12. **Building happens on the world map.** Every owned hex has two lots, managed from the map's side panel. This replaced the single fixed district so that captured land is immediately useful. Player-made districts (decision 6) are still open.
13. **District output feeds the nation directly.** Income to the treasury, supply to population growth, approval to stability, security to a hex's defence in battle.
14. **Rivals play by the player's rules.** Same costs, same checks, same battles. They leave the player alone for the first 20 turns.
15. **Graphics go through a sprite registry.** All art is placeholder vector drawing in `src/art/`, replaceable one entry at a time. See `docs/art.md`.

## Open questions

- **Is "daily" meant literally?** A turn is one in-game day and you can play as many as you like in a sitting. If the game should allow only one question per real day, that is a small change to when a new question is drawn.
- **Balance.** Numbers were tuned by simulation, not by people playing. Expect to adjust `BALANCE`, unit stats and building yields.
- **Single-player or multiplayer?** The build is single-player against AI rivals. Is multiplayer (shared world, turns, accounts) planned?
- **Player-made districts** and the tilted district view from the designs.
- **Map.** The world is fixed at 14 × 10 with the same terrain every game. Random or larger maps? Zoom levels?
- **Rival politics.** Rivals have fixed ideologies and do not answer dilemmas. "Their council is debating" is not built.
- **Alliances, ceding land, tribute.** Diplomacy stops at pacts, war and peace.
- **Battle and movement animation, sound.**
- **Building and unit art.** Placeholders for an artist.
- **Small screens.** The layout needs at least 1100 px of width.
