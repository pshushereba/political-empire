import { describe, expect, it } from 'vitest';
import { FLAG_COLOURS, FLAG_EMBLEMS, FLAG_PATTERNS } from '../art/flags';
import { applyAction, check, createGame, DEFAULT_FOUNDING, economy } from '../game';
import { COSMETICS, owns, ownsFlag, PRODUCT_BY_ID } from './catalog';

describe('the catalogue', () => {
  it('lists every piece of flag art exactly once, and every pack it names exists', () => {
    const art = { pattern: FLAG_PATTERNS, emblem: FLAG_EMBLEMS, colours: FLAG_COLOURS };
    for (const kind of ['pattern', 'emblem', 'colours'] as const) {
      const listed = COSMETICS.filter((c) => c.kind === kind).map((c) => c.id).sort();
      expect(listed).toEqual(Object.keys(art[kind]).sort());
    }
    for (const c of COSMETICS) if (c.pack) expect(PRODUCT_BY_ID[c.pack]).toBeDefined();
  });

  it('gives everyone the free designs, a pack its own, and a member everything', () => {
    const cross = COSMETICS.find((c) => c.id === 'cross')!;
    const tree = COSMETICS.find((c) => c.id === 'tree')!;
    const bands = COSMETICS.find((c) => c.id === 'bands')!;
    expect(owns([], bands)).toBe(true);
    expect(owns([], cross)).toBe(false);
    expect(owns(['pack-heraldry'], cross)).toBe(true);
    expect(owns(['pack-heraldry'], tree)).toBe(false);
    expect(owns(['membership'], tree)).toBe(true);
  });

  it('judges a whole flag: every part must be owned, and unknown parts are refused', () => {
    const base = { pattern: 'bands', a: '#E8A33D', b: '#1F3A5F' };
    expect(ownsFlag([], base, 'amber-navy')).toBe(true);
    expect(ownsFlag([], { ...base, emblem: 'star' }, 'amber-navy')).toBe(false);
    expect(ownsFlag(['pack-heraldry'], { ...base, emblem: 'star' }, 'amber-navy')).toBe(true);
    expect(ownsFlag(['membership'], { ...base, pattern: 'made-up' }, 'amber-navy')).toBe(false);
    expect(ownsFlag(['membership'], base, null)).toBe(false); // colours not from the art
  });

  it('changes a flag without changing anything the nation can do', () => {
    const s = createGame({ players: [DEFAULT_FOUNDING], seed: 4 });
    const flag = { pattern: 'saltire', a: '#9B8AE0', b: '#ECE9E2', emblem: 'tower' };
    const after = applyAction(s, { type: 'setFlag', flag }, 'p1');
    expect(after.nations.p1.flag).toEqual(flag);
    expect(economy(after, 'p1')).toEqual(economy(s, 'p1'));
    expect({ ...after.nations.p1, flag: null }).toEqual({ ...s.nations.p1, flag: null });
    expect(check(s, { type: 'setFlag', flag: { ...flag, a: 'red' } }, 'p1').ok).toBe(false);
  });
});
