# Art

The game's graphics are placeholders built so they can be replaced without touching game or screen code.

## How it fits together

| File | What it holds |
| --- | --- |
| `src/art/sprites.ts` | The sprite registry: one entry per building, unit and piece of scenery, keyed by its game id. Also the small terrain marks used on the world map. |
| `src/art/Sprite.tsx` | `<Sprite id>` for panels and cards, `<SpriteG id>` for use inside the map SVG. |
| `src/styles.css` | Colours, type and spacing, as CSS variables taken from `docs/design-tokens.json`. |
| `src/ui/components/HexMap.tsx` | The world map: hex fills, terrain marks, building sprites, army badges, the envoy token. |

Nothing outside `src/art/` contains drawing data. Screens only say *which* sprite to show.

## Replacing a sprite

Every sprite sits in the same frame: **80 × 90**, ground line at **y = 86**, centred horizontally. Keep to that frame and new art lines up everywhere it is used.

A registry entry is either vector layers or an image file:

```ts
// src/art/sprites.ts
bank: { layers: [{ d: 'M4 48L38 30l34 18z', fill: '#CDD3DA' }, /* … */] },   // today
bank: { image: new URL('./img/bank.png', import.meta.url).href },             // upgraded
```

The id must match the game data: building ids from `src/game/content/buildings.ts`, unit ids from `src/game/content/world.ts`. Extra ids: `site` (a building under construction), `lot` (an empty lot), `trees`.

## Adding a new building or unit

1. Add its data to the catalogue in `src/game/content/`.
2. Add a sprite with the same id to the registry. If you skip this, the empty-lot sprite is shown, so the game still runs.

## Likely upgrade paths

- **Illustrated sprites**: swap registry entries for image files, one at a time.
- **Textured terrain**: `TERRAIN_MARKS` and the hex fill in `HexMap.tsx` are the only places terrain is drawn.
- **A tilted district view** (designed in `design-canvas/project/BuildModern.dc.html`): the sprites already have a ground line and a shadow for it. It would be a new screen that draws the same `GameState`.
- **Animation**: battles and movement are instant today. Each one writes a `LogEntry` with a hex (`at`), which is enough to drive an animation layer over the map.
