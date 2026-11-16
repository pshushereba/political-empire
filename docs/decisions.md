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

16. **"Daily" means an in-game day.** One question per turn, as many turns a sitting as the player likes. Nothing waits on the real calendar.
17. **Ideology decides the form of government, and government decides what the state can do.** Seven forms, each with its own powers, limits on war, and buildings. Crossing a line costs stability, so drifting back and forth is punished.
18. **The district close-up is back**, as a view of any owned hex and its six neighbours, flat or tilted. It exists for planning: buildings gain or lose from their neighbours, and the close-up shows the effect of each site before you build. Quick building from the map panel stays.
19. **Return hooks never gate play.** Objectives give short-term goals, a daily run pays a small bonus for coming back on consecutive days, and a hall of nations keeps scores between games.

20. **Supabase is the backend and auth provider.** Accounts by email link, one cloud save per player, and a shared ranking. The game stays offline-first: the browser save is always written and the backend is optional at runtime. See `docs/backend.md`.

21. **Two ways to play on one engine.** Alone against computer-run nations, or against other people, with the computer filling empty seats. The rules treat any nation as possibly human; solo is simply a world with one human. Pass-and-play on a shared device exists now; online play is planned in `docs/backend.md`.
22. **Deals between players need both sides.** Pacts and peace offered to a human become proposals. Computer nations answer immediately.

23. **Pace is a setting of each game.** A time limit for answering the daily question (off to 2 minutes) and a length for each turn (off, minutes, or a day). A question that runs out is answered by the council at a cost, so a short timer raises the stakes without being able to stall the game.
24. **Everything stays visible between players for now.** Treasuries and armies are public. Revisit if it hurts play.
25. **Two kinds of multiplayer are wanted:** private games among friends, and open play against people anywhere. See the open question on world size.

26. **Build for worlds of 8 to 12 nations for now.** Friends games and matched public games share this shape. It needs a map generator, more nation colours and a pool of computer nations.
27. **Long term: one open world.** An endless, scrollable hex map where players find, inspect, trade with and attack other nations. It is a separate mode with a different structure, described in `ROADMAP.md`. Nearer work should not close it off: generate land from a seed and coordinates, and build the map view to pan and zoom.

28. **Every world is generated.** The hand-made four-nation map is gone; a world of four is generated like any other. Players are `p1`, `p2`, … and computer nations come from a pool.
29. **Twelve nation colours**, assigned by seat, first player amber: amber, teal, rose, sky, violet, lime, coral, sand, orchid, cobalt, fern, copper. A first pass, in `design-tokens.json` and `NATION_COLORS`. Every nation is also labelled by name, so colour is never the only signal.
30. **Larger worlds are won with a smaller share of the land** (30% from eight nations up), since 60% of a twelve-nation world would mean defeating nearly everyone.

31. **Tax policy is set by the daily question, not by a slider.** Four tax questions move a five-level dial that scales business and wage taxes. Higher taxes pay immediately and cost approval and the Merchants' goodwill over time.
32. **An export market, kept simple.** Four goods, world prices driven by how many nations make each, and shipping capacity from ports and trade pacts. Selling is automatic; the player's choices are what to build, what to hold back, and who to sign pacts with. No stockpiles, imports or player-to-player trading yet.

33. **Every category of question leaves something lasting.** Beyond ideology and faction approval, answers move four standing policies: taxes, schooling, public health and workers' protections. Each acts every turn until another answer moves it.
34. **Every ideological lean has a cost as well as a benefit**, so extremes are trade-offs and a collectivist economy, for example, really does earn less from business.
35. **Hard authoritarian states risk revolt**, which costs treasury, a building, troops and stability and forces concessions.

## Open questions

- **Which other answers deserve a lasting dial?** Candidates: press freedom, religion's role in the state, immigration, military doctrine. Each new dial needs enough questions to move it.

- **How far should trade go?** Imports (buying grain when short), stockpiles, trading directly with a chosen nation, embargoes and blockades are all natural next steps.

- **Should ranked scores be validated on the server?** Today the client reports its own score. An Edge Function could replay the game and compute it. Worth doing before the ranking matters to anyone.
- **Sign-in methods.** Email link only so far. Google, Apple or passwords are a Supabase setting plus a button.

- **Which server-backed return hooks to build.** Candidates are listed at the end of `docs/backend.md`.
- **Balance.** Numbers were tuned by simulation, not by people playing. Expect to adjust `BALANCE`, unit stats and building yields.
- **Player-made districts.** The close-up shows a hex and its neighbours; named, player-drawn districts are still open.
- **Map.** The world is fixed at 14 × 10 with the same terrain every game. Random or larger maps? Zoom levels?
- **Rival politics.** Rivals have fixed ideologies and do not answer dilemmas. "Their council is debating" is not built.
- **Alliances, ceding land, tribute.** Diplomacy stops at pacts, war and peace.
- **Battle and movement animation, sound.**
- **Building and unit art.** Placeholders for an artist.
- **Small screens.** The layout needs at least 1100 px of width.
