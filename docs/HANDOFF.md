# Implementation handoff

This document turns the Political Empire designs into a build plan. Read `docs/decisions.md` first for what is settled and what is not.

## 1. Scope of the first build

A single-player, in-browser version of the five core screens plus the district building screen, running on local game state. Out of scope for now: combat, capturing hexes, multiplayer, accounts, a server, sound, and naming or subdividing districts.

The rival nations (Ostmark, Kesh, Lune) do not need AI yet. They can be static data with a few scripted reactions (relations changes from diplomatic actions).

## 2. Recommended stack

The repo has no code, so this is a recommendation. Confirm it with the project owner before scaffolding if they have a preference.

- TypeScript, React, Vite.
- Game rules in `src/game/` as pure functions over a `GameState` object, with a reducer (`applyAction(state, action) → state`). Test with Vitest.
- UI state (selected hex, open tab, flat/tilted view) stays in components, not in `GameState`.
- Draw hex maps as SVG `<polygon>`s inside `<button>`s or with an accessible SVG `role="button"` pattern. SVG gives correct hex-shaped hit areas; the prototypes' rectangular buttons with `clip-path` do not.
- Save the game to `localStorage` at the end of each turn.
- Fonts from Google Fonts: Space Grotesk (500, 700), IBM Plex Sans (400, 500, 600), IBM Plex Mono (500).

## 3. App shell (all screens except Founding)

Prototype: the `<header>` in any of `Main`, `Nation`, `Foreign`, `Dilemma`, `BuildModern`.

- 64 px top bar, background `surface.header`, bottom border `line`.
- Left: logo mark (hex outline with filled inner hex, amber) and the wordmark "POLITICAL EMPIRE" (Space Grotesk 700, 17 px, 0.08em tracking).
- Navigation: Map · Nation · Council · Diplomacy. The current page has `aria-current="page"` and a `surface.raised` pill. Council shows an amber badge with the number of open dilemmas.
- Right: resources (Treasury, Stability, Influence, Population) as label-over-value pairs, then a divider, then era name over "Turn N".

## 4. Screens

The routes are suggestions.

### 4.1 Found a nation — `/new` — `Founding.dc.html`

The first screen of a new game. No app shell.

- Left column: name input, motto input, four founding questions, starting land.
- Each founding question offers three options as toggle buttons (one selected at a time). Each question sets the starting value of one ideology axis: option 1 = 22, option 2 = 50, option 3 = 78 (see `game-model.md` §4).
- Starting land: Coast, River valley, Highlands, with a one-line trade-off each. The effect of each is an open question; store the choice for now.
- Right column (460 px): live preview. Flag (pattern: Tricolour, Bands or Canton; plus one of four colour pairs), nation name (falls back to "[NATION NAME]" when empty), motto, land, and the four axis markers.
- "Found the nation" creates `GameState` and goes to the map.

### 4.2 World map — `/` — `Main.dc.html`

- Map area: a 14 × 10 grid of pointy-top hexes, radius 38 px, 3 px gaps. Ownership, sea and capitals as in `game-model.md` §2. Capitals carry a star and a nation-name label.
- Clicking a hex selects it (white hex ring). Arrow-key movement between hexes would be a good addition.
- The envoy token (white circle with a flag) sits on its current hex. A dashed line joins the envoy to the selected hex.
- Bottom-left legend of nations. Bottom-right: zoom out, zoom in, and "Centre on your envoy".
- Right panel (360 px), "Selected hex": coordinate, terrain, owner with colour swatch, and four stat tiles: Population, Stance to you, Distance, Travel time.
  - Main button "Move envoy here". Disabled with an explanation when the hex is sea ("Envoys cannot cross open sea") or the envoy is already there.
  - If the hex is foreign: "View {nation}" goes to the Foreign screen for that nation.
  - If the hex is yours: "Open nation ledger" goes to the Nation screen. A route into the district building screen should also go here (see §4.6).
- Below that, "Awaiting your decision": cards for open dilemmas, linking to the Council. "End turn N" button at the bottom.

### 4.3 Your nation — `/nation` — `Nation.dc.html`

- Header row: flag, name, motto · founded turn · capital, then four stat cards (Population with growth, Territory, Stability with recent change, Treasury with per-turn income).
- "Growth of the nation": eras as four cards. Past eras plain, the current era highlighted amber with a progress bar toward the next, the next era dashed and locked. The unlock rule shown is "5M population and 50 hexes".
- "Character of the state": the four ideology axes. A faded dot marks the turn-1 value; the amber dot marks the current value. Each has a verdict label (for example "Leaning liberty").
- "Factions": approval bars, 0–100.
- "Decisions on record": the last few decisions, each with its turn, a one-line summary and its effects.

### 4.4 Visiting another nation — `/nations/:id` — `Foreign.dc.html`

- A banner tinted with that nation's colour: flag, "Your envoy is visiting · arrived turn N", name, one-line description, "Back to map".
- "Relations": a −100 to +100 bar filled from the centre, a word label (Hostile / Wary / Cordial / Allied), and a sentence of reasoning.
- "How you compare": the four axes, your marker (amber circle) against theirs (nation-colour square).
- "What your envoy learned": known facts. Treasury and Army are locked until you open an embassy. Below that, "Their council is debating" shows a teaser of what the nation is deciding.
- "Diplomatic actions": one action per visit. Each card has a name, description, cost and effect (`game-model.md` §7).

### 4.5 Council — `/council` — `Dilemma.dc.html`

- Left: tags (category, urgency), title, situation text, and quotes from the factions involved (avatar ring in the faction's colour).
- Right: "How will you respond?" A radio group of choices. Locked choices show the requirement and cannot be selected.
- "Expected result" chips update with the selected choice (green for gains, orange for losses).
- "Decide later" goes back to the map. "Issue decree" applies the effects and shows the outcome card, with "See your nation change" and "Choose again". In the real game, "Choose again" should not exist after the turn ends; it is there for the prototype.

### 4.6 District building — `/district/:id` — `BuildModern.dc.html`

This is the chosen direction. `BuildMedieval.dc.html` is reference only.

- Header: "← World map", district name ("Saline District"), "One district · 7 hexes · 14 building lots". On the right, a 37-hex mini-map of the nation with this district's hexes highlighted ("7 of 37 hexes in the Republic of Veyra"), and the Flat / Tilted toggle.
- District: 7 large hexes (radius 110 px) in a flower shape, sitting on a shared amber district border. Hexes are labelled by land type only (the centre one is "Saline city"). Do not give individual hexes place names (see decisions).
- Flat view: each hex shows "N of 2 lots used", its land type, and two lot rows (building icon and name, or "Empty lot"). Newly placed buildings show "· new" and an amber border.
- Tilted view: the district tilts back (`perspective(1800px) rotateX(56deg)` in the prototype), and each building stands upright on its hex as an illustration. Buildings under construction show an amber "N turns" badge. Forest hexes with no buildings show trees. Labels with the land type sit at the front of each hex.
- Build menu (420 px): category tabs (Security, Utilities, Commerce, Services) and building cards (icon, name, cost, description, effect chips, build time, land requirement). Selecting a card highlights the hexes that can take it; the others dim. Clicking a highlighted hex places the building. A hint line at the bottom explains what to do next, or why nothing can take the building.
- Bottom bar: district output totals (Security, Supply, Revenue, Approval), queued builds and their cost, and "Undo new builds".
- Building art: the prototype draws each building from up to 8 SVG paths (`ART` in the script). Treat these as placeholders an artist will replace. Keep each illustration in an 80 × 90 box with the ground line at y = 86 so the art can be swapped without layout changes.

## 5. Build order and acceptance criteria

1. **Scaffold and tokens.** Vite + React + TS; tokens from `design-tokens.json` exposed as CSS variables; fonts loaded; app shell with working navigation. *Done when* all routes render inside the shell and the header matches the prototype.
2. **Game core.** `GameState` types, hex maths, the fixed starting world, turn advance, effects engine. *Done when* unit tests cover distance, ownership, travel time, effect application, and building placement rules.
3. **World map.** Selection, envoy movement and travel time, links. *Done when* the envoy can't enter sea, the route line and panel update, and End turn advances the turn.
4. **Council.** Dilemma content as data; locked choices; effects applied on decree; decision added to the record. *Done when* issuing the Saline Docks strike decree changes the nation's stats, faction approval and axes.
5. **Nation ledger.** Reads everything from `GameState`. *Done when* the numbers change after a decree.
6. **Foreign nation.** Relations, comparison, intel locks, one action per visit. *Done when* an embassy unlocks Treasury and Army, and actions change relations.
7. **Founding.** Builds the initial `GameState` from the answers. *Done when* the founding answers set the axes' turn-1 values shown on the Nation screen.
8. **District building.** Flat view first, then tilted. *Done when* the placement rules in `game-model.md` §6 hold, builds take their stated turns, and the toggle switches views without losing state.

## 6. Accessibility

- All controls are real buttons, links or inputs, reachable by keyboard with a visible amber focus ring.
- Icon-only buttons have `aria-label`s. Decorative SVG has `aria-hidden="true"`.
- Each hex button's accessible name includes land type, owner and state (the prototypes build these in `label` / `aria`).
- Colour is never the only signal: nations also differ in lightness, and every nation colour has a text label nearby.
