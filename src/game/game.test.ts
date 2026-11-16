import { describe, expect, it } from 'vitest';
import {
  applyAction, armyAt, armySize, canBuild, check, createGame, DEFAULT_FOUNDING, DILEMMA_BY_ID, distance, economy,
  forecast, hexAt, key, MAX_STACK, modifiers, neighbours, ownedHexes, reachable, relation, requirementMet, stance,
  BUILDING_BY_ID, buildCost, coord, type GameState, type Action,
} from './index';

const fresh = (over = {}): GameState => createGame({ ...DEFAULT_FOUNDING, seed: 7, ...over });
const act = (s: GameState, a: Action): GameState => {
  expect(check(s, a)).toEqual({ ok: true });
  return applyAction(s, a);
};

describe('hex maths', () => {
  it('measures cube distance on odd-r offsets', () => {
    expect(distance({ c: 5, r: 5 }, { c: 5, r: 5 })).toBe(0);
    expect(distance({ c: 5, r: 5 }, { c: 8, r: 3 })).toBe(4);
    expect(distance({ c: 0, r: 0 }, { c: 13, r: 9 })).toBe(18);
  });
  it('gives six neighbours inland, all at distance 1', () => {
    const n = neighbours({ c: 5, r: 5 }, 14, 10);
    expect(n).toHaveLength(6);
    for (const x of n) expect(distance(x, { c: 5, r: 5 })).toBe(1);
    expect(neighbours({ c: 0, r: 0 }, 14, 10)).toHaveLength(2);
  });
  it('formats coordinates', () => expect(coord({ c: 8, r: 3 })).toBe('08·03'));
});

describe('founding', () => {
  it('sets axes from the founding answers', () => {
    const s = fresh({ answers: { liberty: 0, market: 2, reform: 1, openness: 2 } });
    const n = s.nations[s.playerId];
    expect(n.axes).toEqual({ liberty: 22, market: 78, reform: 50, openness: 78 });
    expect(n.axesAtFounding).toEqual(n.axes);
  });
  it('gives every nation its capital ring and an army', () => {
    const s = fresh();
    for (const id of s.order) {
      const cap = hexAt(s, s.nations[id].capital);
      expect(cap.owner).toBe(id);
      expect(cap.capitalOf).toBe(id);
      expect(ownedHexes(s, id).length).toBeGreaterThanOrEqual(15);
      expect(armyAt(s, cap)?.owner).toBe(id);
    }
  });
  it('lets ideology change the rules', () => {
    const market = modifiers(fresh({ answers: { liberty: 1, market: 2, reform: 1, openness: 1 } }).nations.veyra);
    const collective = modifiers(fresh({ answers: { liberty: 1, market: 0, reform: 1, openness: 1 } }).nations.veyra);
    expect(market.commerceMult).toBeGreaterThan(1);
    expect(collective.supplyMult).toBeGreaterThan(1);
  });
});

describe('the daily question', () => {
  it('blocks ending the turn until answered, then applies effects', () => {
    const s = fresh();
    expect(check(s, { type: 'endTurn' }).ok).toBe(false);
    const before = s.nations.veyra;
    const after = act(s, { type: 'decide', choice: 0 }).nations.veyra; // Break the strike
    expect(after.stats.treasury).toBe(before.stats.treasury + 60);
    expect(after.stats.stability).toBe(before.stats.stability - 8);
    expect(after.factions.dockworkers).toBe(before.factions.dockworkers - 30);
    expect(after.axes.liberty).toBe(before.axes.liberty - 12);
    expect(after.decisions).toHaveLength(1);
  });
  it('locks choices whose requirement is not met', () => {
    const s = fresh();
    const locked = DILEMMA_BY_ID[s.dilemma!.id].choices[3];
    expect(requirementMet(s, locked.requires!)).toBe(false);
    expect(check(s, { type: 'decide', choice: 3 }).ok).toBe(false);
  });
  it('asks a new question each turn and cannot be answered twice', () => {
    let s = act(fresh(), { type: 'decide', choice: 1 });
    expect(check(s, { type: 'decide', choice: 0 }).ok).toBe(false);
    s = act(s, { type: 'endTurn' });
    expect(s.turn).toBe(2);
    expect(s.dilemma!.choice).toBeNull();
    expect(s.dilemma!.id).not.toBe('docks-strike');
  });
});

describe('building', () => {
  it('spends treasury, takes its turns, then pays', () => {
    let s = fresh();
    const cap = s.nations.veyra.capital;
    const income0 = economy(s, 'veyra').income.gross;
    const t0 = s.nations.veyra.stats.treasury;
    s = act(s, { type: 'build', at: cap, building: 'clinic' });
    const cost = buildCost(fresh(), 'veyra', BUILDING_BY_ID.clinic);
    expect(cost).toBe(125); // 120, plus 4% for the market street already standing
    expect(s.nations.veyra.stats.treasury).toBe(t0 - cost);
    expect(hexAt(s, cap).buildings).toHaveLength(2);
    expect(check(s, { type: 'build', at: cap, building: 'shop' }).ok).toBe(false); // both lots used
    expect(economy(s, 'veyra').approval).toBe(economy(fresh(), 'veyra').approval); // not finished yet
    s = act(s, { type: 'decide', choice: 1 });
    s = act(s, { type: 'endTurn' });
    s = act(s, { type: 'decide', choice: 0 });
    s = act(s, { type: 'endTurn' });
    expect(hexAt(s, cap).buildings[1].turnsLeft).toBe(0);
    expect(economy(s, 'veyra').approval).toBe(economy(fresh(), 'veyra').approval + 3);
    expect(income0).toBeGreaterThan(0);
  });
  it('enforces land, era and uniqueness', () => {
    const s = fresh();
    const cap = hexAt(s, s.nations.veyra.capital);
    expect(canBuild(s, 'veyra', cap, BUILDING_BY_ID.bank).ok).toBe(false); // later era
    expect(canBuild(s, 'veyra', cap, BUILDING_BY_ID.sawmill).ok).toBe(false); // needs forest
    const foreign = hexAt(s, s.nations.kesh.capital);
    expect(canBuild(s, 'veyra', foreign, BUILDING_BY_ID.shop).ok).toBe(false);
  });
});

describe('armies', () => {
  it('recruits at the capital and musters for a turn', () => {
    let s = fresh();
    const cap = s.nations.veyra.capital;
    s = act(s, { type: 'recruit', at: cap, unit: 'infantry' });
    const army = armyAt(s, cap)!;
    expect(army.units.infantry).toBe(4);
    expect(reachable(s, 'veyra', army, army.units, army.moved).size).toBe(0);
    expect(check(s, { type: 'recruit', at: cap, unit: 'armour' }).ok).toBe(false);
  });
  it('moves through own land, claims unclaimed land, and cannot enter neutral nations', () => {
    let s = fresh();
    const army = armyAt(s, s.nations.veyra.capital)!;
    const opts = reachable(s, 'veyra', army, army.units, 0);
    expect(opts.size).toBeGreaterThan(6);
    for (const [k, o] of opts) {
      const [c, r] = k.split(',').map(Number);
      const h = hexAt(s, { c, r });
      expect(h.terrain).not.toBe('sea');
      expect(o.kind).toBe(h.owner === 'veyra' ? 'move' : 'claim');
    }
    // Split one unit off toward the edge.
    const edge = [...opts].find(([, o]) => o.kind === 'move' && o.cost === 2)![0].split(',').map(Number);
    s = act(s, { type: 'moveArmy', armyId: army.id, to: { c: edge[0], r: edge[1] }, units: { infantry: 1 } });
    expect(armyAt(s, { c: edge[0], r: edge[1] })!.units.infantry).toBe(1);
    expect(armyAt(s, s.nations.veyra.capital)!.units.infantry).toBe(2);
  });
  it('captures a hex when the attack wins, and ends the nation when its capital falls', () => {
    let s = fresh();
    // Put a strong player army next to the Kesh capital and go to war.
    const kesh = s.nations.kesh.capital;
    const next = neighbours(kesh, s.cols, s.rows)[3];
    s = structuredClone(s);
    hexAt(s, next).owner = 'veyra';
    s.armies.push({ id: 99, owner: 'veyra', ...next, units: { infantry: 0, armour: 8, artillery: 0 }, moved: 0 });
    expect(reachable(s, 'veyra', next, s.armies[s.armies.length - 1].units, 0).has(key(kesh))).toBe(false);
    s = act(s, { type: 'diplomacy', nation: 'kesh', act: 'war' });
    expect(stance(relation(s, 'veyra', 'kesh'))).toBe('At war');
    expect(forecast(s, s.armies.find((a) => a.id === 99)!.units, hexAt(s, kesh)).ratio).toBeGreaterThan(1.2);
    s = act(s, { type: 'moveArmy', armyId: 99, to: kesh });
    expect(hexAt(s, kesh).owner).toBe('veyra');
    expect(s.nations.kesh.alive).toBe(false);
    expect(s.armies.some((a) => a.owner === 'kesh')).toBe(false);
    expect(ownedHexes(s, 'kesh')).toHaveLength(0);
  });
});

describe('diplomacy', () => {
  it('needs the envoy on site, and an embassy costs treasury', () => {
    let s = fresh();
    expect(check(s, { type: 'diplomacy', nation: 'ostmark', act: 'gift' }).ok).toBe(false);
    const target = ownedHexes(s, 'ostmark')[0];
    s = act(s, { type: 'moveEnvoy', to: target });
    s = act(s, { type: 'decide', choice: 1 });
    while (s.envoy.dest) {
      s = act(s, { type: 'endTurn' });
      s = act(s, { type: 'decide', choice: DILEMMA_BY_ID[s.dilemma!.id].choices.length - 2 });
    }
    const before = relation(s, 'veyra', 'ostmark').value;
    s = act(s, { type: 'diplomacy', nation: 'ostmark', act: 'gift' });
    expect(relation(s, 'veyra', 'ostmark').value).toBe(before + 12);
    expect(check(s, { type: 'diplomacy', nation: 'ostmark', act: 'trade' }).ok).toBe(false); // one per turn
  });
});

describe('a long game', () => {
  it('runs 120 turns without breaking its invariants', () => {
    for (const seed of [1, 2, 3]) {
      let s = fresh({ seed });
      for (let t = 0; t < 120 && s.status === 'playing'; t++) {
        const choices = DILEMMA_BY_ID[s.dilemma!.id].choices;
        const pick = choices.findIndex((c, i) => i >= t % choices.length && (!c.requires || requirementMet(s, c.requires)));
        s = applyAction(s, { type: 'decide', choice: pick === -1 ? 0 : pick });
        s = act(s, { type: 'endTurn' });
        for (const a of s.armies) {
          expect(hexAt(s, a).owner).toBe(a.owner);
          expect(armySize(a.units)).toBeGreaterThan(0);
          expect(armySize(a.units)).toBeLessThanOrEqual(MAX_STACK);
          expect(s.nations[a.owner].alive).toBe(true);
        }
        expect(new Set(s.armies.map((a) => key(a))).size).toBe(s.armies.length);
        for (const id of s.order) {
          const n = s.nations[id];
          for (const v of Object.values(n.stats)) expect(Number.isFinite(v)).toBe(true);
          expect(n.stats.stability).toBeGreaterThanOrEqual(0);
          expect(n.stats.stability).toBeLessThanOrEqual(100);
        }
      }
    }
  });
});
