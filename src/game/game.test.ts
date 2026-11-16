import { describe, expect, it } from 'vitest';
import {
  applyAction, armyAt, armySize, canBuild, check, createGame, DEFAULT_FOUNDING, DILEMMA_BY_ID, distance, economy,
  forecast, hexAt, key, MAX_STACK, modifiers, neighbours, ownedHexes, reachable, relation, requirementMet, stance,
  BUILDING_BY_ID, buildCost, buildingYield, coord, governmentFor, placementBonusCount, placementEffect, score, type GameState, type Action,
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
    expect(after.stats.stability).toBe(before.stats.stability - 8 - 5); // the decree, then the change of government
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

describe('forms of government', () => {
  it('follows from the ideology axes', () => {
    expect(governmentFor({ liberty: 22, market: 50, reform: 50, openness: 50 })).toBe('dictatorship');
    expect(governmentFor({ liberty: 30, market: 50, reform: 40, openness: 50 })).toBe('aristocracy');
    expect(governmentFor({ liberty: 30, market: 50, reform: 60, openness: 50 })).toBe('oneparty');
    expect(governmentFor({ liberty: 50, market: 50, reform: 50, openness: 50 })).toBe('council');
    expect(governmentFor({ liberty: 78, market: 78, reform: 50, openness: 50 })).toBe('merchant');
    expect(governmentFor({ liberty: 78, market: 22, reform: 50, openness: 50 })).toBe('commune');
    expect(governmentFor({ liberty: 78, market: 50, reform: 50, openness: 50 })).toBe('democracy');
  });
  it('changes when the daily question moves the nation, at a cost in stability', () => {
    let s = fresh(); // council republic, liberty 50
    expect(s.nations.veyra.government).toBe('council');
    s = act(s, { type: 'decide', choice: 0 }); // break the strike: liberty −12 → 38, reform 50
    expect(s.nations.veyra.government).toBe('oneparty');
    expect(s.nations.veyra.stats.stability).toBe(60 - 8 - 5);
    expect(s.log.some((l) => l.kind === 'government')).toBe(true);
  });
  it('gives a dictatorship powers and buildings a democracy cannot have', () => {
    const tyrant = fresh({ answers: { liberty: 0, market: 1, reform: 1, openness: 1 } });
    const free = fresh({ answers: { liberty: 2, market: 1, reform: 1, openness: 1 } });
    expect(check(free, { type: 'power', power: 'conscript' }).ok).toBe(false);
    const cap = tyrant.nations.veyra.capital;
    const after = act(tyrant, { type: 'power', power: 'conscript' });
    expect(armyAt(after, cap)!.units.infantry).toBe(armyAt(tyrant, cap)!.units.infantry + 2);
    expect(after.nations.veyra.stats.stability).toBe(tyrant.nations.veyra.stats.stability - 6);
    expect(check(after, { type: 'power', power: 'conscript' }).ok).toBe(false); // cooling down
    expect(canBuild(tyrant, 'veyra', hexAt(tyrant, cap), BUILDING_BY_ID.police).ok).toBe(true);
    expect(canBuild(free, 'veyra', hexAt(free, cap), BUILDING_BY_ID.police).ok).toBe(false);
    expect(canBuild(free, 'veyra', hexAt(free, cap), BUILDING_BY_ID.assembly).ok).toBe(true);
  });
  it('lets a dictator go to war freely, and makes a democracy ask first', () => {
    const tyrant = fresh({ answers: { liberty: 0, market: 1, reform: 1, openness: 1 } });
    const t2 = act(tyrant, { type: 'diplomacy', nation: 'lune', act: 'war' });
    expect(t2.nations.veyra.stats.stability).toBe(tyrant.nations.veyra.stats.stability);
    const free = structuredClone(fresh({ answers: { liberty: 2, market: 1, reform: 1, openness: 1 } }));
    free.nations.veyra.stats.stability = 45;
    expect(check(free, { type: 'diplomacy', nation: 'lune', act: 'war' }).ok).toBe(false);
    free.nations.veyra.stats.stability = 60;
    expect(applyAction(free, { type: 'diplomacy', nation: 'lune', act: 'war' }).nations.veyra.stats.stability).toBe(52);
  });
});

describe('placement', () => {
  it('pays more for a market street beside a clinic', () => {
    const s = structuredClone(fresh());
    const cap = hexAt(s, s.nations.veyra.capital);
    expect(buildingYield(s, cap, 0).income).toBe(7);
    const next = hexAt(s, neighbours(cap, s.cols, s.rows)[0]);
    expect(placementEffect(s, 'veyra', next, BUILDING_BY_ID.clinic).others.income).toBe(2);
    next.buildings.push({ type: 'clinic', turnsLeft: 0 });
    expect(buildingYield(s, cap, 0).income).toBe(9);
    expect(placementBonusCount(s, 'veyra')).toBe(1);
    // …and a clinic suffers beside a mine.
    next.buildings.push({ type: 'mine', turnsLeft: 0 });
    expect(buildingYield(s, next, 0).approval).toBe(2);
  });
});

describe('reasons to come back', () => {
  it('pays out objectives and brings in the next one', () => {
    let s = structuredClone(fresh());
    expect(s.objectives.active).toEqual(['first-works', 'standing-army', 'room-to-grow']);
    const t0 = s.nations.veyra.stats.treasury;
    s.armies[0].units.infantry = 5;
    s = act(s, { type: 'recruit', at: s.nations.veyra.capital, unit: 'infantry' });
    expect(s.objectives.done).toEqual(['standing-army']);
    expect(s.objectives.active).toHaveLength(3);
    expect(s.nations.veyra.stats.treasury).toBe(t0 - 60 + 50);
  });
  it('rewards returning on consecutive days, once a day', () => {
    let s = fresh({ day: '2026-11-16' });
    expect(check(s, { type: 'checkIn', day: '2026-11-16' }).ok).toBe(false);
    const t0 = s.nations.veyra.stats.treasury;
    s = act(s, { type: 'checkIn', day: '2026-11-17' });
    expect(s.checkIn.streak).toBe(2);
    expect(s.nations.veyra.stats.treasury).toBe(t0 + 60);
    s = act(s, { type: 'checkIn', day: '2026-11-20' }); // missed days: the run starts again
    expect(s.checkIn.streak).toBe(1);
    expect(score(s)).toBeGreaterThan(0);
  });
});
