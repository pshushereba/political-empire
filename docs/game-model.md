# Game model

Rules and content exactly as the designs use them. Numbers here are prototype values: balance them later, but keep them in data files so they are easy to change.

## 1. Hex maths

- Hexes are **pointy-top**. For radius `R`: width `W = √3·R`, height `H = 2R`, row spacing `1.5R`.
- Store world positions as **odd-r offset** `(col, row)`: odd rows shift right by `W/2`. Pixel top-left = `(col·W + (row odd ? W/2 : 0), row·1.5R)`.
- For distance, convert to cube/axial: `q = col − (row − (row & 1)) / 2`, `r = row`. Then `distance = (|dq| + |dr| + |dq + dr|) / 2`.
- Display coordinates as two-digit `CC·RR` (for example `08·03`).

## 2. Starting world (14 × 10)

Each nation claims every hex within its radius of its capital. Ties go to the nearer capital.

| Nation | id | Capital (col, row) | Radius | Colour | Stance to player |
| --- | --- | --- | --- | --- | --- |
| Republic of Veyra (player) | `veyra` | 5, 5 | 3 | `#E8A33D` | — |
| Ostmark Union | `ostmark` | 10, 2 | 2 | `#3FA7A0` | Cordial |
| Kesh Directorate | `kesh` | 11, 7 | 2 | `#C4607A` | Hostile |
| Free Cities of Lune | `lune` | 2, 1 | 2 | `#8DB8E8` | Wary |

- Sea hexes: `(c ≤ 1 and r ≥ 6)` or `(r = 9 and c ≤ 6)` or `(c = 13 and r ≤ 3)` or `(c = 0 and r ≥ 3)`.
- Everything else is unclaimed.
- Map fills: capital at full nation colour, the player's other hexes at 80% opacity, rivals' at 58%, unclaimed `#232B35`, sea `#131C27`.
- Terrain for land hexes (prototype only): `hash(c, r) % 5` over Plains, Forest, Hills, Highlands, Farmland, where `hash = ((c·73856093) XOR (r·19349663)) >>> 0`. Replace with authored or generated terrain.
- The player's radius-3 territory is 37 hexes, which matches "Territory 37 hexes" on the Nation screen.

## 3. Envoy and travel

- The player has one envoy, which starts on their capital.
- Travel time = `ceil(distance / 2)` turns.
- Envoys cannot enter sea hexes. The prototype moves the envoy instantly; the real game should move it along a path over the travel turns.
- Arriving in a foreign nation's hex enables the Foreign screen for that nation ("Your envoy is visiting").

## 4. Nation

```ts
type AxisId = 'liberty' | 'market' | 'reform' | 'openness';
// 0–100. Ends: Authority↔Liberty, Collective↔Market, Tradition↔Reform, Isolation↔Openness.

interface Nation {
  id: string; name: string; motto: string;
  flag: { pattern: 'tricolour' | 'bands' | 'canton'; a: string; b: string };
  capital: HexRef; startingLand: 'coast' | 'river' | 'highlands';
  foundedTurn: number;
  stats: { population: number; treasury: number; stability: number; influence: number };
  axes: Record<AxisId, number>; axesAtFounding: Record<AxisId, number>;
  factions: Record<FactionId, number>;   // approval 0–100
  relations: Record<NationId, number>;   // −100…+100
  decisions: DecisionRecord[];
}
```

**Founding questions** set `axesAtFounding` and `axes`. Option index 0/1/2 → 22/50/78.

| Question | Axis | Options |
| --- | --- | --- |
| Who should hold power? | Authority ↔ Liberty | One strong leader · A council of elders · The people, by vote |
| Who owns the harvest? | Collective ↔ Market | The state shares it · Guilds and towns · Whoever grows it |
| What of the old ways? | Tradition ↔ Reform | Keep them · Adapt them · Replace them |
| Strangers at the border? | Isolation ↔ Openness | Close the gates · Trade only · Welcome them |

**Flag colour pairs:** Amber `#E8A33D` + navy `#1F3A5F` · Teal `#3FA7A0` + black `#0E1217` · Rose `#C4607A` + ivory `#ECE9E2` · Sky `#8DB8E8` + umber `#5B3A1E`. The tricolour's middle stripe is always ivory `#ECE9E2`.

**Prototype state of Veyra at turn 14:** population 3.2M (+4.1%/turn), treasury 1,240 (+85/turn), stability 68%, influence 42, territory 37 hexes. Axes now (at founding): Liberty 66 (45), Market 61 (50), Reform 47 (38), Openness 74 (52).

**Factions:** Merchant Houses 72, Frontier Settlers 63, Old Clergy 55, Dockworkers' Guild 31.

**Relations labels:** Hostile, Wary, Cordial, Allied. The bucket boundaries are not set yet; suggested: < −40 Hostile, −40 to 10 Wary, 10 to 60 Cordial, > 60 Allied. Ostmark is +34 (Cordial).

## 5. Eras

| Era | Turns | Note |
| --- | --- | --- |
| Founding | 1 | A harbour town and 12 hexes of coast |
| First Era · The Assembly | 2–9 | Elected council formed; river valley settled |
| Second Era · Trade & Tension | 10–now | 64% toward the next era |
| Third Era | locked | Unlocks at 5M population and 50 hexes |

Era progress formula: open. A reasonable start is the lower of the population progress and the hex progress.

## 6. Districts and buildings

- A **district** is a named group of the player's hexes. For now there is one fixed district per nation (Saline District, 7 hexes: the capital and its six neighbours). Naming and subdividing districts comes later (see decisions).
- Each hex has **2 lots**.
- A building can go on a hex when the hex has a free lot, the hex's land matches the building's `needs` (if any), and any one-per-district limit is respected.
- Placing a building spends its cost from the treasury. It is under construction for `turns` turns, then its effects count.
- District output = the sum of the effects of all finished buildings. The prototype counts new ones immediately; the real game shouldn't.

**District hexes (prototype):** Saline city (Capital) — Bank, Market street · Coast — Border checkpoint · Forest — empty · Farmland — Factory · River — Water works · Hills — empty · Plains — empty.

**Modern building catalogue.** Effects: `def` Security, `sup` Supply, `inc` Revenue, `mor` Approval.

| id | Name | Category | Cost | Turns | Effects | Needs |
| --- | --- | --- | --- | --- | --- | --- |
| checkpoint | Border checkpoint | Security | 70 | 1 | def +2, inc +1 | — |
| wall | Fortified wall | Security | 200 | 3 | def +6, mor −1 | — |
| garrison | Garrison | Security | 260 | 3 | def +7 | — |
| water | Water works | Utilities | 120 | 2 | sup +4, mor +1 | River |
| power | Power station | Utilities | 220 | 3 | sup +5, mor −1 | — |
| factory | Factory | Utilities | 180 | 3 | sup +3, inc +3, mor −1 | — |
| shop | Market street | Commerce | 90 | 1 | inc +3, mor +1 | — |
| bank | Bank | Commerce | 300 | 3 | inc +6 | Capital |
| port | Port terminal | Commerce | 260 | 4 | inc +5, sup +2 | Coast |
| school | School | Services | 140 | 2 | mor +3, inc +1 | — |
| clinic | Clinic | Services | 120 | 2 | mor +4 | — |
| transit | Transit station | Services | 160 | 2 | mor +2, inc +2 | — |

Card descriptions are in `BuildModern.dc.html` (the `B` array). How district output feeds national stats (for example Revenue into treasury per turn, Approval into stability or factions) is open.

## 7. Diplomacy (Ostmark, prototype)

One action per visit.

| Action | Cost | Effect |
| --- | --- | --- |
| Propose a trade pact | 40 influence | Relations +10; both treasuries grow each turn |
| Open an embassy | 200 treasury | Reveals treasury and army; lets you see their dilemmas |
| Settle the river crossing (hex 08·03) | 1 hex | Relations +18 |
| Denounce their chancellor | Free | Relations −25; favour at home with the Assembly |

Known about Ostmark: population 2.6M, 19 hexes, federal council, exports iron and timber. Their axes: Liberty 34, Market 40, Reform 30, Openness 58.

## 8. Dilemmas

```ts
interface Dilemma {
  id: string; title: string; category: string; urgency: string;
  body: string;
  voices: { faction: FactionId; quote: string }[];
  choices: {
    title: string; desc: string; outcome: string;
    effects: { target: string; delta: number }[];   // stat, faction or axis
    requires?: { stat: string; min: number };
  }[];
}
```

**The Saline Docks strike** (Labour, decide this turn). Port closed: treasury −60 per turn until resolved.

| Choice | Effects |
| --- | --- |
| Break the strike | Treasury +60, Stability −8, Dockworkers −30, Merchants +10, Authority +12 |
| Negotiate shorter shifts | Treasury −40, Stability +4, Dockworkers +15, Merchants −5, Collective +6 |
| Give the Guild an Assembly seat | Treasury −10, Stability +9, Dockworkers +35, Merchants −18, Liberty +10 |
| Ask Ostmark to send its own dockers | Requires influence 60 (player has 42) |

"Authority +12" means the Liberty axis moves 12 toward Authority. "Collective +6" moves the Market axis 6 toward Collective.

A second dilemma is teased on the map: "Ostmark asks for river rights" (Diplomacy, 3 turns left). It has no content yet.
