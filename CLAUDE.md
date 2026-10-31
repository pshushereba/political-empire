# Political Empire

A turn-based strategy game. Players found a political nation, grow it over time, and shape its character by answering political situations ("dilemmas"). They move an envoy between their nation and other nations on a hexagonal world map, and build on their land.

This repository currently holds **designs only**. No application code exists yet.

## Where things are

| Path | What it is |
| --- | --- |
| `docs/HANDOFF.md` | Start here. Scope, screens, build order, acceptance criteria. |
| `docs/game-model.md` | Game rules, data model, hex maths, all content numbers used in the designs. |
| `docs/design-tokens.json` | Colours, type, spacing, radii. Use these, don't invent new values. |
| `docs/decisions.md` | Decisions already made and open questions. Read before changing scope. |
| `design-canvas/project/*.dc.html` | Interactive design prototypes, one per screen. Reference only. |

Live design canvas (same files, rendered): https://claude.ai/artifact/H8UMbBGzJ9n7riwhoNFgp8

## About the prototypes

The `.dc.html` files are design mockups written for a design tool, not production code. Read them for layout, copy, colours and interaction behaviour. Do not copy their structure: they position hexes with CSS `clip-path` and hold all state in one component per screen. The real app should do what `docs/HANDOFF.md` describes.

Each prototype's game data and logic sits in the `renderVals()` method in the `<script data-dc-script>` block at the bottom of the file.

## Conventions

- Keep game rules in a pure, UI-free module with unit tests. Screens read state and dispatch actions; they never compute rules themselves.
- Hex coordinates follow `docs/game-model.md` (pointy-top, odd-r offset storage, cube distance).
- Dilemmas, buildings and nations are data (JSON/TS objects), not code paths.
- Every interactive element is a real `<button>`, `<a>` or `<input>` with a label. Text contrast must reach 4.5:1 on its background.
- Use the modern building set only. The medieval set was explored and rejected (see `docs/decisions.md`).
