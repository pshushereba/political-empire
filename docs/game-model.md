# Game model

The rules as implemented in `src/game/`. Every number here lives in a data file under `src/game/content/` (mostly `BALANCE` in `world.ts`), so balance changes are one-line edits. If this document and the code disagree, the code and its tests are right; fix the document.

## 1. The loop

One turn is one day in the life of the nation.

1. **Answer the daily question** at the Council. The turn cannot end until you do.
2. **Run the nation**: build on your hexes, raise troops, move armies, claim land, send your envoy, conduct diplomacy.
3. **End the turn.** Rivals act, every nation's books are settled, a turn report shows what happened, and a new question arrives.

**You win** by conquest (no rival capital still stands) or hegemony (you hold 60% of the land). **You lose** if your capital is taken, or a rival reaches hegemony first.

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
