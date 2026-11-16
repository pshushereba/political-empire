# Roadmap

Where the game is, what comes next, and where it is heading. Phases are in order; items inside a phase are not. Reasons for past choices are in `decisions.md`; the rules are in `game-model.md`; backend detail is in `backend.md`.

## Where we are

Playable today, in the browser:

- **Solo**: found a nation and play against 3 to 11 computer-run rivals to conquest or hegemony.
- **Pass and play**: two to eight people on one device, computer nations in the empty seats.
- **Generated worlds** of 4 to 12 nations, on a map you can pan and zoom.
- **The core loop**: one political question a turn; ideology decides the form of government, and government decides powers, limits and buildings; an economy of businesses, supply and stability; armies, battles and capture; diplomacy by envoy; a tilted district close-up with placement bonuses.
- **An economy you can read**: an Economy screen with revenue by source, tax policy set by the daily question, every business and what it pays, and an export market with moving world prices.
- **Pace settings**: a time limit on answering the question, and on each turn.
- **Reasons to return**: objectives, a daily run, a hall of nations.

Written but not yet proven:

- **Supabase accounts, cloud saves and world ranking.** The code and database script exist and have never run against a real project.

Known limits: balance tuned by simulation, not by people; placeholder art; needs a window at least 1100 px wide.

## Phase 1: Connect the backend

*Blocked on: a Supabase project.*

- Run the migration; test sign-in, cloud save, save reconciliation and the ranking for real. Fix what breaks.
- Decide sign-in methods beyond email link (Google, Apple).

## Phase 2: Worlds for 8 to 12 nations — done

Built and playable in solo and pass-and-play:

- **Map generator**: a world sized to the number of nations (4 to 12), generated from a seed and coordinates, with fairly spaced capitals, equal starting land, and no nation stranded on an island.
- **More nations**: a palette of 12 nation colours and a pool of 11 computer nations with their own ideologies and temperaments.
- **A map you can move around**: drag to pan, scroll or buttons to zoom, a minimap, "go to my capital", and a nation list that jumps to each capital.
- **Balance for larger worlds**: the share of land needed to win, and the share at which a nation alarms the others, shrink as worlds grow.

Left over, to pick up alongside later phases:

- Balance in large worlds has only met simulated players. Aggressive rivals snowball; a passive player is overrun in 30 to 85 turns.
- The palette is a first pass to adjust by eye.
- Starting land is equal in amount but not in quality; some seeds favour some seats.

## Phase 3: Online games with friends

*Needs phase 1. Better with phase 2.*

- **Server-run games**: a table of games and a server function that applies each player's action through the existing rules. The server becomes the only authority on a game's state.
- **Live updates**: every player sees the world change as it happens.
- **A lobby**: create a private game, choose its size and pace, invite by link, found your nation, start when ready.
- **Turn deadlines** enforced by the server, including a day per turn, so one absent player cannot freeze a world.
- **Rejoining**: a list of your games, and what happened since you last looked.

## Phase 4: Open play against anyone

- **Matchmaking** into public games of 8 to 12.
- **A global ranking**, likely in seasons, built on scores the server computes itself rather than ones the player's device reports.
- **Fair-play basics**: what happens when a player abandons a game (a computer nation takes over), reporting, rate limits.

## Running alongside

Not tied to a phase; picked up as they become the weakest part of the game.

- **Playtesting and balance.** The numbers have only met simulated players.
- **Return hooks the server makes possible**: reminders ("Kesh has declared war on you"), a shared daily question where everyone sees how the world voted, the daily run judged by server time.
- **Deeper trade**: imports, stockpiles, deals with a chosen nation, embargoes and blockades.
- **Deeper politics**: rivals that answer their own questions and change government; alliances; tribute and ceding land; more questions, including ones that react to your government.
- **Information**: decide whether treasuries and armies should stay public between players.
- **Presentation**: real art through the sprite registry, movement and battle animation, sound.
- **Reach**: a layout for phones and small screens.

## Long-term vision: one open world

A multiplayer mode with no edges and no end: **an endless hexagonal map that a player scrolls around freely.** They see other nations and unclaimed land, and can explore, trade with, or attack whoever they find. Any nation can be inspected: its form of government, its ideology, its population and standing.

This is a different game structure from phases 3 and 4, not a larger version of them:

| Matched games (phases 3–4) | The open world |
| --- | --- |
| A world is created for its players and ends with a winner | The world is always there; nations rise and fall inside it |
| Everyone starts together | People arrive at any time, next to established empires |
| A turn waits for all players, up to a deadline | Time moves on a schedule for everyone, present or not |
| The whole world is one saved document | The map is stored and loaded in regions, as a player scrolls |
| Win by conquest or hegemony | No final victory: standing, seasons, or eras instead |

Questions it will force, to keep in mind rather than answer now: where new nations appear and how they are protected early on; what "winning" means in a world that never ends; how far a nation can project power; how trade works between strangers; how much one player can see of another.

What earlier phases contribute, so that work is not thrown away:

- The **rules engine** already treats every nation as possibly human and takes time from its caller, so it can run on a server on a schedule.
- The **map generator** (phase 2) should produce land from a seed and coordinates, so a world can be extended region by region instead of generated whole.
- The **pan-and-zoom map** (phase 2) is the same view the open world needs.
- The **server-run game** (phase 3) is the same authority model, applied to one endless world instead of many small ones.
- A **public nation profile** (government, ideology, population, relations) is useful in every multiplayer mode and is exactly the "view another nation's political state" part of this vision.
