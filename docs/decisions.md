# Decisions and open questions

## Decided

1. **Start over on the designs.** The earlier designs weren't cohesive. Everything now follows one visual system (`docs/design-tokens.json`): a dark map-room look, with the player's nation always amber.
2. **Modern buildings, not medieval.** Both were explored (`BuildModern.dc.html`, `BuildMedieval.dc.html`). Modern was chosen because banks, factories, schools and clinics tie into the factions and politics. The medieval file is kept only for reference.
3. **Flat / Tilted view on the district screen.** Flat is for planning; tilted shows the placed buildings as illustrations.
4. **A district reads as one territory.** Hexes inside a district have no place names of their own. They are labelled by land type, share an amber border, and a mini-map shows the district's share of the nation.
5. **No district names on the world map yet.** This will be worked out with combat and capture.
6. **Later: player-made districts.** As players capture hexes, they should be able to split their land into areas and name them. A likely shape: the district name in the build screen header becomes a menu of the player's districts with "Rename" and "Create district from selected hexes"; captured hexes start unassigned; the mini-map shades each district differently.

## Open questions

- **Tech stack.** `HANDOFF.md` recommends TypeScript + React + Vite. Confirm with the project owner.
- **Single-player or multiplayer?** The first build is single-player against scripted rivals. Is multiplayer (shared world, turns, accounts) planned?
- **Combat and capture.** Not designed. It will affect the map, districts, the Security stat and diplomacy.
- **How district output feeds the nation.** For example, Revenue → treasury per turn, Approval → stability and factions, Supply → population growth.
- **Starting land effects.** Coast, River valley and Highlands each have a one-line trade-off but no rules yet.
- **Era progression.** The unlock rule and how progress is calculated.
- **Relations thresholds** for Hostile / Wary / Cordial / Allied.
- **Map zoom levels.** Should the world map have a region view and a world view?
- **When dilemmas appear.** In the Council queue (as designed), or as pop-ups during a turn?
- **Rival AI.** When rivals start making their own decisions, and how much the player sees ("Their council is debating").
- **Building art.** The tilted-view illustrations are placeholders for an artist.
- **Screen size.** The designs are a fixed 1440 × 900 game window. Decide how the game scales to smaller and larger windows.
