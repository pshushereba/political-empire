import { START_RADIUS } from './content/world';
import { distance, neighbours } from './hex';
import { Rng } from './rng';
import type { Hex, HexRef, Terrain } from './types';

// World generation. Land comes from a seed and a pair of coordinates, never
// from the position in a loop, so the same seed always gives the same land and
// a world could later be extended region by region instead of built whole.

export const MIN_NATIONS = 4;
export const MAX_NATIONS = 12;
/** Hexes of map per nation, sea included. About 30 of them are land. */
const HEXES_PER_NATION = 35;
/** Capitals are at least this far apart, so starting territories never touch. */
const MIN_CAPITAL_GAP = 2 * START_RADIUS + 1;

function lattice(seed: number, x: number, y: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in 0…1. `scale` is the size of a feature in hexes. */
function noise(seed: number, x: number, y: number, scale: number): number {
  const fx = x / scale;
  const fy = y / scale;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = lattice(seed, x0, y0);
  const b = lattice(seed, x0 + 1, y0);
  const c = lattice(seed, x0, y0 + 1);
  const d = lattice(seed, x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Where a hex sits on a plane with unit spacing, so noise is the same shape in every direction. */
const plane = (h: HexRef): { x: number; y: number } => ({ x: h.c + (h.r & 1 ? 0.5 : 0), y: h.r * 0.866 });

/** How high the ground is at a coordinate, 0…1. Below `SEA_LEVEL` is water. */
export function elevationAt(seed: number, h: HexRef): number {
  const { x, y } = plane(h);
  return noise(seed, x, y, 5.5) * 0.65 + noise(seed + 101, x, y, 2.4) * 0.35;
}

export const SEA_LEVEL = 0.4;

/** The land type at a coordinate, before coasts are worked out from neighbouring sea. */
export function terrainAt(seed: number, h: HexRef): Terrain {
  if (elevationAt(seed, h) < SEA_LEVEL) return 'sea';
  const { x, y } = plane(h);
  const height = noise(seed + 202, x, y, 3.2);
  const wet = noise(seed + 303, x, y, 3.6);
  const stream = Math.abs(noise(seed + 404, x, y, 4.5) - 0.5);
  if (height > 0.7) return 'highlands';
  if (height > 0.58) return 'hills';
  if (stream < 0.035) return 'river';
  if (wet > 0.6) return 'forest';
  if (wet < 0.4) return 'farmland';
  return 'plains';
}

export interface World {
  cols: number;
  rows: number;
  hexes: Hex[];
  /** One per nation, in no particular order of quality. */
  capitals: HexRef[];
}

export function worldSize(nations: number): { cols: number; rows: number } {
  const area = nations * HEXES_PER_NATION;
  const rows = Math.round(Math.sqrt(area / 1.4));
  return { cols: Math.ceil(area / rows), rows };
}

/** Spread capitals as far apart as the land allows: each new one goes where it is farthest from the rest. */
function placeCapitals(candidates: HexRef[], count: number, rng: Rng): HexRef[] | null {
  const picked: HexRef[] = [rng.pick(candidates)];
  while (picked.length < count) {
    let best: HexRef | null = null;
    let bestScore = -1;
    let bestGap = 0;
    for (const h of candidates) {
      let gap = Infinity;
      for (const p of picked) gap = Math.min(gap, distance(h, p));
      // A little randomness among near-equal sites keeps worlds from looking alike.
      const score = gap + rng.float() * 0.9;
      if (score > bestScore) { best = h; bestScore = score; bestGap = gap; }
    }
    if (!best || bestGap < MIN_CAPITAL_GAP) return null;
    picked.push(best);
  }
  return picked;
}

/**
 * Build a bounded world for `nations` nations. Every capital gets a full ring
 * of land around it, and every capital can be reached from every other by land,
 * so no nation starts short and no nation is safe on an island.
 */
export function generateWorld(seed: number, nations: number): World {
  const count = Math.max(MIN_NATIONS, Math.min(MAX_NATIONS, Math.floor(nations)));
  const { cols, rows } = worldSize(count);
  const rng = new Rng(seed ^ 0x5bd1e995);
  const at = (hexes: Hex[], h: HexRef): Hex => hexes[h.r * cols + h.c];

  for (let attempt = 0; attempt < 40; attempt++) {
    const landSeed = (seed + attempt * 7919) | 0;
    const hexes: Hex[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) hexes.push({ c, r, terrain: terrainAt(landSeed, { c, r }), owner: null, buildings: [] });
    }

    // Capitals stay clear of the map's edge so their starting ring fits.
    const inset = START_RADIUS;
    const candidates = hexes.filter((h) => h.terrain !== 'sea' && h.c >= inset && h.c < cols - inset && h.r >= inset && h.r < rows - inset);
    if (candidates.length < count * 4) continue;
    const capitals = placeCapitals(candidates, count, rng);
    if (!capitals) continue;

    // A fair start: solid land within the starting radius of every capital.
    for (const h of hexes) {
      if (h.terrain === 'sea' && capitals.some((cap) => distance(h, cap) <= START_RADIUS)) h.terrain = 'plains';
    }

    // Join any capital cut off by sea to the mainland with a land bridge.
    const reach = (): Set<Hex> => {
      const seen = new Set<Hex>([at(hexes, capitals[0])]);
      const queue = [at(hexes, capitals[0])];
      while (queue.length) {
        const h = queue.pop()!;
        for (const n of neighbours(h, cols, rows)) {
          const x = at(hexes, n);
          if (x.terrain !== 'sea' && !seen.has(x)) { seen.add(x); queue.push(x); }
        }
      }
      return seen;
    };
    for (let guard = 0; guard < count; guard++) {
      const reached = reach();
      const stranded = capitals.find((cap) => !reached.has(at(hexes, cap)));
      if (!stranded) break;
      const target = capitals.filter((cap) => reached.has(at(hexes, cap))).sort((a, b) => distance(a, stranded) - distance(b, stranded))[0];
      let here: HexRef = stranded;
      while (distance(here, target) > 0) {
        here = neighbours(here, cols, rows).sort((a, b) => distance(a, target) - distance(b, target))[0];
        const x = at(hexes, here);
        if (x.terrain === 'sea') x.terrain = 'plains';
      }
    }

    // Coasts last, now that the shape of the land is final.
    for (const h of hexes) {
      if (h.terrain !== 'sea' && neighbours(h, cols, rows).some((n) => at(hexes, n).terrain === 'sea')) h.terrain = 'coast';
    }
    return { cols, rows, hexes, capitals: capitals.map((h) => ({ c: h.c, r: h.r })) };
  }
  throw new Error(`Could not generate a world for ${count} nations from seed ${seed}`);
}
