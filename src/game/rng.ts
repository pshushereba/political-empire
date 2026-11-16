// Seeded RNG (mulberry32). The seed lives in GameState so rules stay pure:
// callers thread the returned seed back into the state.

export function next(seed: number): { value: number; seed: number } {
  const s = (seed + 0x6d2b79f5) | 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: s };
}

/** A small mutable wrapper for code that draws several numbers in a row. */
export class Rng {
  constructor(public seed: number) {}
  float(): number {
    const n = next(this.seed);
    this.seed = n.seed;
    return n.value;
  }
  range(min: number, max: number): number {
    return min + this.float() * (max - min);
  }
  int(n: number): number {
    return Math.floor(this.float() * n);
  }
  pick<T>(list: T[]): T {
    return list[this.int(list.length)];
  }
  shuffle<T>(list: T[]): T[] {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
}
