import type { GameState, Hex, HexRef } from './types';

// Pointy-top hexes, odd-r offset storage, cube distance. See docs/game-model.md §1.

export const key = (h: HexRef): string => `${h.c},${h.r}`;
export const same = (a: HexRef, b: HexRef): boolean => a.c === b.c && a.r === b.r;

export function toAxial(h: HexRef): { q: number; r: number } {
  return { q: h.c - (h.r - (h.r & 1)) / 2, r: h.r };
}

export function distance(a: HexRef, b: HexRef): number {
  const A = toAxial(a);
  const B = toAxial(b);
  const dq = A.q - B.q;
  const dr = A.r - B.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

const EVEN = [
  [1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1],
];
const ODD = [
  [1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1],
];

/** The up-to-six neighbours inside a cols × rows grid. */
export function neighbours(h: HexRef, cols: number, rows: number): HexRef[] {
  const out: HexRef[] = [];
  for (const [dc, dr] of h.r & 1 ? ODD : EVEN) {
    const c = h.c + dc;
    const r = h.r + dr;
    if (c >= 0 && c < cols && r >= 0 && r < rows) out.push({ c, r });
  }
  return out;
}

export function hexAt(state: GameState, h: HexRef): Hex {
  return state.hexes[h.r * state.cols + h.c];
}

export function neighbourHexes(state: GameState, h: HexRef): Hex[] {
  return neighbours(h, state.cols, state.rows).map((n) => hexAt(state, n));
}

/** Display coordinate, e.g. 08·03. */
export function coord(h: HexRef): string {
  return `${String(h.c).padStart(2, '0')}·${String(h.r).padStart(2, '0')}`;
}

/** Pixel centre of a hex of radius R. */
export function centre(h: HexRef, R: number): { x: number; y: number } {
  const W = Math.sqrt(3) * R;
  return { x: h.c * W + (h.r & 1 ? W / 2 : 0) + W / 2, y: h.r * 1.5 * R + R };
}

/** Corner points of a pointy-top hex, as an SVG points string. */
export function corners(cx: number, cy: number, R: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 90);
    pts.push(`${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}
