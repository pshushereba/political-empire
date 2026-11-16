# Backend

Supabase provides accounts and the database. The game is **offline-first**: it always saves in the browser, and the backend is an addition on top. With no project configured, everything in `src/backend/` does nothing and no account controls are shown.

## Setting up

1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql` (`supabase db push`, or paste it into the SQL editor).
3. In Authentication → URL Configuration, add the game's address (and `http://localhost:5173` for development) to the redirect URLs.
4. Copy `.env.example` to `.env.local` and fill in the project URL and anon key from Settings → API. Both are public values; row-level security is what protects the data. Never put the service-role key in the client.

## What exists

| Piece | Where | Notes |
| --- | --- | --- |
| Client | `src/backend/client.ts` | `null` when not configured. Uses the PKCE sign-in flow so the return link carries `?code=` and leaves the URL hash to the game's router. |
| Sign-in | `AccountPanel` in `src/ui/components/Account.tsx` | Email link, no password. Shown on the founding screen and the Nation screen. |
| Cloud save | `saves` table, `src/backend/cloud.ts`, sync in `src/ui/store.tsx` | One save per player: the whole `GameState` as JSON. Uploaded 1.5 s after each change. |
| World ranking | `scores` table | Readable by anyone, one row per player per game, written when a game ends. Shown on the founding screen. Stores the nation's name, never the email. |

**Reconciling saves on sign-in.** Every game has an `id`. If the account has no save, the local one is uploaded. If the browser has no game, the online one is loaded. If both are the same game, the one with the higher turn wins. If they are different games, the player is asked which to keep. Nothing is uploaded until this is settled.

## Not yet verified

This was written without a live project. It typechecks, the game runs with and without the configuration, and an unreachable backend fails quietly. The SQL and the sign-in, save and ranking calls have **not** been run against a real Supabase project. Test those first.

## Known gap: scores are trusted

The client computes its own score and writes it. Anyone with the anon key can post a false one. The fix fits this codebase well: the rules engine is pure and deterministic (seeded RNG, no clock), so a Supabase Edge Function can import `src/game/` unchanged, replay a game's list of actions from its seed, and record the score it computes itself. That needs the client to keep the action list, which it does not do yet.

## Online multiplayer: the plan

The rules engine already supports it: one to four human-run nations in a world, every action attributed to a nation, a turn that advances when all players are ready, and proposals between players. Pass-and-play on one device uses exactly this, so the multiplayer rules are playable and tested today. What is missing is the server around it.

1. **Tables.** `games` (id, status, turn, the `GameState` as JSON, a turn deadline) and `game_players` (game, user, nation id). Players may read games they are in. Nobody writes `games` from the client.
2. **An Edge Function, `act`.** It takes a game id and an action, looks up which nation the signed-in user plays, loads the state, calls `applyAction(state, action, nationId)` from `src/game/` unchanged, and saves the result. This makes the server the only authority: a client cannot move another player's armies or invent treasury. It also fixes the trusted-score gap for online games.
3. **Realtime.** Clients subscribe to their game's row and re-render when it changes.
4. **A lobby.** Create a game, invite by link or join an open one, found your nation, start when full or fill the empty seats with computer nations.
5. **Turn deadline.** A scheduled function ends the turn for anyone who has not, so one absent player cannot freeze a world.

Open design points, in rough order of importance:

- **How long a turn lasts.** A day per turn makes the daily question literal and gives a reason to return; minutes per turn suits a single sitting. The engine does not care. Both could be offered.
- **Hidden information.** Today the whole state is visible to every player (treasuries, armies, other players' questions). Online, the server should send each player a filtered view.
- **Who moves first.** Actions resolve the moment they arrive, so within a turn the faster player has an edge in a race for the same hex. Resolving all orders together at the end of the turn is fairer and a bigger change.
- **Fair starts.** A symmetrical or generated map.

## What the backend makes possible next

- Server-validated scores (above), then seasonal or weekly rankings.
- The daily run judged by server time instead of the device clock.
- A shared daily question: everyone answers the same one, and sees how the world voted.
- Email or push reminders ("Kesh has declared war on you").
