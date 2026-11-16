# Political Empire

A turn-based strategy game. Players found a political nation and shape its character by answering one political question ("dilemma") every turn. On a hexagonal world map they build businesses and services, raise armies, claim land, deal with rival nations through an envoy, and go to war.

Two ways to play on one rules engine: alone against computer-run nations, or against other people (pass-and-play on one device today; online through Supabase is planned in `docs/backend.md`). TypeScript + React + Vite, with Supabase for accounts, cloud saves and the world ranking. Solo play is offline-first: it runs fully without a backend configured.

## Commands

```
npm install
npm run dev        # play at the printed localhost URL
npm test           # rules-engine unit tests (Vitest)
npm run build      # typecheck, then production build to dist/
```

## Where things are

| Path | What it is |
| --- | --- |
| `src/game/` | The rules. Pure, UI-free, unit-tested. `applyAction(state, action)` is the only way state changes. |
| `src/game/worldgen.ts` | The map generator: land from a seed and coordinates, capitals, fair starts. |
| `src/game/content/` | Data: buildings, units, terrain, eras, rival nations, forms of government and their powers, objectives, the daily questions, and every balance number (`BALANCE`). |
| `src/backend/` | The Supabase client and every call to it. Nothing else imports `@supabase/supabase-js`. See `docs/backend.md`. |
| `supabase/migrations/` | Database schema and row-level security policies. |
| `src/art/` | The sprite registry. All drawing data lives here. See `docs/art.md`. |
| `src/ui/` | React screens: Founding, Map, District (the tilted close-up), Nation, Economy, Council, Diplomacy. They read state and dispatch actions. `legacy.ts` keeps scores between games. |
| `docs/game-model.md` | The rules in prose, with the numbers. Keep it in step with the code. |
| `docs/art.md` | How to replace or add graphics. |
| `docs/ROADMAP.md` | What comes next, in order, and the long-term vision. Keep it current when a phase lands or priorities change. |
| `docs/decisions.md` | Decisions made and open questions. Read before changing scope. |
| `docs/HANDOFF.md` | The original screen-by-screen design brief, and how the build differs from it. |
| `docs/design-tokens.json` | Colours, type, spacing, radii. Use these, don't invent new values. |
| `design-canvas/project/*.dc.html` | The original design prototypes. Reference only. |

Live design canvas (the prototypes, rendered): https://claude.ai/artifact/H8UMbBGzJ9n7riwhoNFgp8

## Conventions

- Keep game rules in `src/game/`. Screens never compute rules themselves: they call the rules module's checks (`check`, `canBuild`, `forecast`, …) and dispatch actions.
- Inside `src/game/`, `applyAction` clones the state once and the helpers it calls mutate that draft. Randomness comes from the seeded RNG stored in the state, so the same actions always give the same game.
- Never assume which nation is "the player". A world has 4 to 12 nations, any number of them human-run (`state.humans`); every action and check takes the acting nation's id, and per-person state lives in `nation.seat`. Screens get the viewer's nation as `me` from the store.
- Rival nations go through the same checks and costs as the player. Don't give the AI private rules.
- Hex coordinates follow `docs/game-model.md` (pointy-top, odd-r offset storage, cube distance).
- Supabase is the backend and auth provider. Design new features with it in mind, but keep the game playable offline: backend calls must fail quietly and never block play.
- Every table has row-level security. Only the anon key goes in the client; never the service-role key.
- `src/game/` must stay free of browser and Supabase imports so it can also run in an Edge Function.
- The rules never read the clock. Real-world time (the daily run) arrives as data in an action.
- Dilemmas, buildings, units, governments, powers, objectives and nations are data, not code paths. Balance numbers go in `BALANCE`, not inline.
- Graphics go through the sprite registry (`<Sprite id>`). No drawing data in screens.
- Every interactive element is a real `<button>`, `<a>` or `<input>` with a label; map hexes are SVG `role="button"` elements with full labels and arrow-key movement. Text contrast must reach 4.5:1 on its background.
- Use the modern building set only. The medieval set was explored and rejected (see `docs/decisions.md`).
- After changing rules or balance, run `npm test`. The "long game" test plays 120 turns and checks the invariants.

## About the prototypes

The `.dc.html` files are design mockups written for a design tool, not production code. Read them for layout, copy and colours. Do not copy their structure.
