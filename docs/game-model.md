# Game model

The rules as implemented in `src/game/`. Every number here lives in a data file under `src/game/content/` (mostly `BALANCE` in `world.ts`), so balance changes are one-line edits. If this document and the code disagree, the code and its tests are right; fix the document.

## 1. The loop

One turn is one day in the life of the nation.

1. **Answer the daily question** at the Council. The turn cannot end until you do.
2. **Run the nation**: build on your hexes, raise troops, move armies, claim land, send your envoy, conduct diplomacy.
3. **End the turn.** Rivals act, every nation's books are settled, a turn report shows what happened, and a new question arrives.

**You win** by conquest (no rival capital still stands) or hegemony (you hold 60% of the land). **You lose** if your capital is taken, or a rival reaches hegemony first.

### Players

A world has four nations. One to four are run by people (`state.humans`); the computer runs the rest. Everything that belongs to a person rather than a nation (their daily question, envoy, objectives, daily run, and whether they have ended the turn) lives in that nation's `seat`.

- Every action names the nation taking it: `applyAction(state, action, nationId)`. Nothing in the rules assumes which nation "you" are.
- Players act in any order during a turn. A player who has ended their turn can do nothing more until the world moves on, which happens when every player still in the game has ended theirs.
- A player whose capital falls is out. The game goes on for the others, and ends when one nation wins or no player is left.
- **Deals between players need agreement.** A trade pact, non-aggression pact or peace offered to another player becomes a proposal they accept or decline; it lapses after 2 turns. Gifts between players move real treasury. Computer-run nations still answer at once.
- The log is per-player: private notes (`to`) are only shown to that nation, and events are marked important only for the nations they concern (`about`).
- Players join in this order of starting position: the centre, then Kesh's, Lune's and Ostmark's. The map is not symmetrical, so the positions are not equally good.

## 2. Hex maths

- Hexes are **pointy-top**. For radius `R`: width `W = √3·R`, height `H = 2R`, row spacing `1.5R`.
- World positions are stored as **odd-r offset** `(col, row)`: odd rows shift right by `W/2`.
- Distance uses cube/axial coordinates: `q = col − (row − (row & 1)) / 2`, `r = row`, `distance = (|dq| + |dr| + |dq + dr|) / 2`.
- Coordinates display as `CC·RR` (for example `08·03`).

Code: `hex.ts`.

## 3. The world (14 × 10)

Four nations start with every land hex within 2 of their capital (ties go to the nearer capital): 19 hexes each, or fewer on the coast. The rest of the land is unclaimed.

| Nation | id | Capital | Colour | Temperament | Starting stance |
| --- | --- | --- | --- | --- | --- |
| The player (default "Republic of Veyra") | `veyra` | 5, 5 | `#E8A33D` | — | — |
| Ostmark Union | `ostmark` | 10, 2 | `#3FA7A0` | Cautious, expansionist | Cordial (+30) |
| Kesh Directorate | `kesh` | 11, 7 | `#C4607A` | Aggressive | Hostile (−45) |
| Free Cities of Lune | `lune` | 2, 1 | `#8DB8E8` | Peaceful, land-hungry | Wary (−5) |

- Sea: `(c ≤ 1 and r ≥ 6)`, `(r = 9 and c ≤ 6)`, `(c = 13 and r ≤ 3)`, `(c = 0 and r ≥ 3)`, plus an inlet at `(4, 8)` and `(5, 8)`.
- Terrain is generated from a fixed hash, so the map is the same every game. Land beside the sea is Coast.

| Terrain | Income | Supply | Defender bonus | Armour attacking in |
| --- | --- | --- | --- | --- |
| Plains | 1 | 1 | — | 100% |
| Farmland | 1 | 2 | — | 100% |
| Forest | 2 | 0 | +25% | 60% |
| Hills | 2 | 0 | +25% | 80% |
| Highlands | 1 | 0 | +50% | 60% |
| Coast | 2 | 1 | — | 100% |
| River | 1 | 2 | +15% | 80% |

**Starting land** (chosen at the founding): Coast +10% income · River valley +4 supply, three river hexes by the capital · Highlands +20% defence, −2 supply, highland hexes by the capital.

## 4. Ideology

Four axes, 0–100: Authority↔Liberty, Collective↔Market, Tradition↔Reform, Isolation↔Openness. The founding answers set them to 22 / 50 / 78; the daily question moves them. The further an axis leans, the stronger its effect (`modifiers()` in `economy.ts`). At the extreme:

| Lean | Effect |
| --- | --- |
| Authority | Army upkeep −30%, recruitment −20% |
| Liberty | Approval +4, influence +2 per turn |
| Collective | Supply +25%, approval +2 |
| Market | Business income +30% |
| Tradition | Stability +8 |
| Reform | Building cost −20% |
| Isolation | Defence of your land +25% |
| Openness | Trade pact income +60%, influence +2 per turn |

Ideology also sets diplomacy: nations with similar axes drift toward friendship, different ones toward hostility.

### Forms of government

The axes decide what kind of state the nation is (`governmentFor()` in `content/governments.ts`). When an answer to the daily question pushes the nation across a line, the government changes: 5 stability is lost in the upheaval, the old powers go and new ones arrive. The Council warns before any answer that would do this.

| Government | When | Standing effects | Powers (cooldown in turns) |
| --- | --- | --- | --- |
| Dictatorship | Liberty ≤ 22 | Upkeep −15%, influence −1. War costs no stability. Unrest starts below 35% | Conscript the young: 2 free infantry, stability −6 (5) · Crack down: stability +14, factions fall (6) · Seize private assets: treasury +160, Merchants −15 (8) |
| Aristocracy | Liberty 23–42, Reform < 50 | Stability +5, defence +10%, buildings cost 10% more. War costs 2 | Levy the estates: treasury +110 (6) · Court patronage: stability +6 for 80 treasury (6) · Dynastic marriage: relations +10 with everyone for 25 influence (10) |
| One-party state | Liberty 23–42, Reform ≥ 50 | Buildings cost 10% less, approval −2. War costs 2. Unrest below 30% | Crash programme: every building site finishes at once, 60 treasury (8) · Purge the ministries: stability +8, influence −8 (8) |
| Council republic | Liberty 43–59 | None | Special assembly: stability +6 for 15 influence (5) |
| Democracy | Liberty ≥ 60, Market 36–64 | Approval +2, influence +1. War needs 50% stability and costs 8 | Referendum: stability +9 for 20 influence (6) · Goodwill mission: influence +20, relations +5 for 60 treasury (8) |
| Merchant republic | Liberty ≥ 60, Market ≥ 65 | Business income +10%, trade pacts +25%, upkeep +10%. War costs 6 | War bonds: treasury +180 for 10 influence (8) · Mercenaries: 2 infantry for 150 treasury (5) |
| Commune | Liberty ≥ 60, Market ≤ 35 | Supply +15%, business income −10%, approval +1. War costs 6 | Work brigade: 2 turns off every building site (6) · Day of solidarity: stability +7 for 40 treasury (6) |

Five buildings can only be built by certain governments (see §6). One already standing keeps working if the government changes. Rivals have governments too (Kesh is a dictatorship, Ostmark an aristocracy, Lune a merchant republic) and use the same powers.

**Factions** (approval 0–100, moved by the daily question): Merchant Houses scale income, Dockworkers' Guild scales supply, Frontier Settlers add to population growth, Old Clergy add to stability. Average faction approval also feeds stability.

## 5. Economy

Settled every turn by `economy()`.

- **Income** = (15 + land yields + 12 per million people + buildings + 10 per trade pact) × multiplier, where the multiplier is `0.75 + stability/200`, scaled by Merchant approval. Minus **army upkeep**.
- **Supply** = 4 + land yields + buildings. Each million people use 8, each unit uses 1. A surplus grows the population (up to +5% a turn); a shortage shrinks it and pulls stability down.
- **Stability** moves a fifth of the way toward a target each turn: 55, plus approval × 1.5, plus faction effects, minus 4 per war, minus 0.5 per hex beyond 20, minus supply shortage. Below 25%, border hexes can break away.
- **Influence** (+2 a turn, more from schools, broadcast towers, embassies and ideology) pays for claiming land and for pacts.
- **Bankruptcy**: an empty treasury makes a unit desert each turn and costs stability.
- **Eras** unlock buildings and units. They need both land and people: First Era 22 hexes and 1.4M · Second Era 26 and 2.4M · Third Era 40 and 4.0M.

## 6. Buildings

Every owned hex has **2 lots**. Placing a building spends its cost at once; it produces nothing until its construction turns are over. Each building a nation owns makes the next 4% dearer. Catalogue: `content/buildings.ts`.

| Building | Category | Cost | Turns | Per turn | Needs | Era |
| --- | --- | --- | --- | --- | --- | --- |
| Border checkpoint | Security | 70 | 1 | Defence +2, income +1 | — | 0 |
| Fortified wall | Security | 200 | 3 | Defence +6, approval −1 | — | 0 |
| Garrison | Security | 220 | 2 | Defence +4; troops can be raised here | — | 0 |
| Farm co-operative | Utilities | 80 | 1 | Supply +3 | Farmland or plains | 0 |
| Water works | Utilities | 120 | 2 | Supply +4, approval +1 | River or coast | 0 |
| Power station | Utilities | 220 | 3 | Supply +6, approval −1 | — | 2 |
| Market street | Commerce | 80 | 1 | Income +7 | — | 0 |
| Timber yard | Commerce | 100 | 2 | Income +8, supply +1 | Forest | 0 |
| Mine | Commerce | 140 | 2 | Income +12, approval −1 | Hills or highlands | 0 |
| Factory | Commerce | 180 | 3 | Income +13, supply +2, approval −1; allows armour | — | 1 |
| Port terminal | Commerce | 240 | 3 | Income +18, supply +2 | Coast | 1 |
| Bank | Commerce | 300 | 3 | Income +26 | Capital, one per nation | 1 |
| Clinic | Services | 120 | 2 | Approval +3 | — | 0 |
| School | Services | 140 | 2 | Approval +2, influence +1 | — | 0 |
| Transit station | Services | 160 | 2 | Approval +2, income +3 | — | 1 |
| Broadcast tower | Services | 240 | 3 | Influence +3, approval +1 | — | 2 |

Only some governments can build these:

| Building | Category | Cost | Turns | Per turn | Needs | Governments |
| --- | --- | --- | --- | --- | --- | --- |
| Security bureau | Security | 160 | 2 | Defence +2, approval +4, influence −1 | — | Dictatorship, One-party state |
| Grand palace | Services | 260 | 3 | Approval +2, influence +3 | Capital, one per nation | Dictatorship, Aristocracy |
| Assembly hall | Services | 200 | 3 | Approval +3, influence +2 | Capital, one per nation | Council republic, Democracy, Commune |
| Stock exchange | Commerce | 280 | 3 | Income +20 | One per nation, First Era | Merchant republic, Democracy |
| People's granary | Utilities | 140 | 2 | Supply +6, approval +1 | — | Commune, One-party state |

### Placement

A building is affected by finished buildings on its own hex and the six hexes around it (`yields.ts`). This is what the district close-up is for: pick a building and every hex that can take it shows what building there would change, counting both the new building's own bonus and what it does to its neighbours.

| Building | Effect, per matching neighbour |
| --- | --- |
| Market street | Income +2 near a clinic, school or transit station (up to 3) |
| Timber yard | Income +3 near a factory |
| Mine | Income +3 near a factory or power station (up to 2) |
| Factory | Income +3 near a mine, timber yard or power station (up to 3) |
| Port terminal | Income +2 near a factory or market street (up to 3) |
| Bank | Income +3 near a market street, port or stock exchange (up to 3) |
| Stock exchange | Income +3 near a bank, port or factory (up to 3) |
| Transit station | Income +1 near a market street, factory or port (up to 3) |
| Farm co-operative | Supply +1 near a water works or granary (up to 2) |
| Clinic, School | Approval −1 near a factory, mine or power station (up to 2) |
| Fortified wall | Defence +2 near a garrison |
| Border checkpoint | Defence +1 near a garrison |

A captured hex keeps its businesses and services. Security buildings, the bank and unfinished sites are destroyed.

## 7. Armies and war

| Unit | Cost | Upkeep | Attack | Defence | Moves | Unlock |
| --- | --- | --- | --- | --- | --- | --- |
| Infantry | 60 | 4 | 3 | 3 | 2 | — |
| Armour | 150 | 9 | 8 | 5 | 3 | First Era and a factory |
| Artillery | 120 | 7 | 6 | 1 | 2 | Second Era; halves the value of fortifications |

- Troops are raised at the capital or a garrison and spend their first turn mustering.
- An army is the units on one hex: at most 8, one army per hex. It moves at the pace of its slowest unit and can be split.
- Armies travel through their own land. Stepping onto **unclaimed land occupies it for free**. Stepping onto **a nation you are at war with is an attack**. Either ends the move. You cannot enter a nation you are at peace with.
- **Battle** (`executeMove` in `military.ts`): attack = sum of unit attack, ±15%. Defence = (units' defence + militia 3, or 10 in a capital) × terrain × 1.25 in a capital × ideology, + fortifications. A hex with no friendly land beside it is **cut off** and defends at 60%.
  - Attack ≥ defence: the hex is taken. The attacker loses up to 45% of its units (fewer the bigger the margin). Defenders lose half and retreat, or are destroyed at 2:1.
  - Otherwise the attackers lose 30–70% and fall back; defenders lose a few.
- The panel shows a forecast (Decisive / Favourable / Even / Poor) before you commit.
- **Taking a capital ends that nation.** The conqueror gets every hex within 2 of the capital and half the treasury; the outer provinces become unclaimed.

## 8. Diplomacy

Relations run −100 to +100: below −40 Hostile, to 10 Wary, to 60 Cordial, above Allied. Each turn they drift one point toward a baseline: `30 − 1.4 × average axis difference`, +15 with a trade pact, +10 with your embassy, −8 for a shared border with no pact, −15 if either nation holds over 35% of the land.

Envoy actions need the envoy inside the nation's borders (travel takes `ceil(distance / 2)` turns), one per nation per turn.

| Action | Cost | Effect |
| --- | --- | --- |
| Trade pact | 40 influence, relations ≥ 0 | Relations +10; income each turn |
| Embassy | 200 treasury | Reveals treasury and army; baseline +10; +1 influence a turn |
| State gift | 100 treasury | Relations +12 |
| Non-aggression pact | 30 influence, relations ≥ 20 | No war for 12 turns; removes border friction |
| Denounce | Free | Relations −25; stability +3 at home |
| Declare war (from anywhere) | Stability −4 | Ends pacts. Breaking a non-aggression pact costs 10 stability and 15 relations with everyone |
| Propose peace (from anywhere) | Free | Accepted after 3 turns of war unless they are clearly stronger; always after 12. Starts a 6-turn truce |

Land can also be claimed peacefully: an unclaimed hex beside yours costs `8 + hexes/4` influence.

## 9. Rival nations

Rivals use the same rules, costs and battles as the player (`ai.ts`). Each turn a rival decides on war and peace, raises troops toward a target size, builds what it most needs (supply if short, approval if unstable, otherwise income), claims land, and moves its armies: attack at good odds, fall back if its capital is threatened, close with the enemy at war, otherwise garrison the border or occupy free land.

A rival declares war on a neighbour it dislikes enough (how much depends on its aggression, and patience shortens as the game goes on) when it is at least 20% stronger and no pact stands in the way. Rivals leave each other alone until turn 12 and the player alone until turn 20.

## 10. The daily question

```ts
interface Dilemma {
  id: string; title: string; category: string; body: string;
  voices: { faction: FactionId; name: string; quote: string }[];
  choices: { title: string; desc: string; outcome: string; effects: Effect[]; requires?: Requirement }[];
  when?: 'war' | 'peace';   // only asked in that situation
}
```

- One question per turn, drawn from a shuffled deck of 22 (`content/dilemmas.ts`); none repeats until all have been asked. The first is always *The Saline Docks strike*.
- Effects change stats, faction approval, axes and (via `relations`) every rival's opinion. Axis deltas point toward Liberty / Market / Reform / Openness, so `liberty −12` displays as "Authority +12". Treasury effects grow 50% per era.
- A choice with `requires` is locked until the stat or axis reaches its threshold.
- To add a question, add an object to the `DILEMMAS` array. No code changes.

### Pace

Each game has settings chosen when it is created (`state.settings`):

- **Time to answer the question** (`questionSeconds`: off, 30 s, 1 min, 2 min). When on, the day's question is sealed. Opening it starts the clock. If it runs out, the council picks one of the available answers at random and the nation loses 3 stability on top of that answer's effects.
- **Time for each turn** (`turnSeconds`: off, or any length; a day is 86400). When it runs out the player's turn is ended for them, answering the question by default first if they hadn't.
- **Whose clock runs when** (`clock`): `together` starts everyone's turn clock when the turn begins, for online play. `inTurn` starts a player's clock when they take the device, for pass-and-play.

The rules never read the time. The caller passes `now` to `applyAction`, and an `expire` action is accepted only if a deadline has really passed. The browser does this for local games; a server will do it for online ones, so a player cannot stop their own clock.

## 11. Reasons to come back

- **Objectives** (`content/objectives.ts`): three are always active, taken in order from a list of 21, from "finish 3 buildings" to "reach the Third Era". Completing one pays a reward and brings in the next. Each is a metric and a target, so adding one is a line of data.
- **The daily run**: opening the game on a new calendar day pays a welcome-back bonus of 30 treasury and 4 influence per day of the run, up to day 5. Missing a day restarts the run. It never blocks play. The rules stay pure: the screen passes today's date in a `checkIn` action.
- **The hall of nations** (`src/ui/legacy.ts`): every finished or abandoned game of 5 turns or more is scored (`score.ts`) and kept in the browser. The founding screen shows the best scores and which of the seven governments you have won as.
