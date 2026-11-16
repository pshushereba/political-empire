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

## What the backend makes possible next

- Server-validated scores (above), then seasonal or weekly rankings.
- The daily run judged by server time instead of the device clock.
- A shared daily question: everyone answers the same one, and sees how the world voted.
- Email or push reminders ("Kesh has declared war on you").
- Multiplayer: shared worlds where the rivals are other players. This is a redesign of turn order, not an add-on.
