import { describe, expect, it } from 'vitest';
import {
  applyAction, armyAt, armySize, canBuild, check, createGame, DEFAULT_FOUNDING, DILEMMA_BY_ID, distance, economy,
  forecast, hexAt, key, MAX_STACK, modifiers, neighbours, ownedHexes, reachable, relation, requirementMet, stance,
  BUILDING_BY_ID, buildCost, buildingYield, coord, governmentFor, placementBonusCount, placementEffect, score, allReady, questionDeadline, questionSealed, turnDeadline, generateWorld, hegemonyShare, type FoundingChoices, type GameState, type Action,
} from './index';

const fresh = (over: Partial<FoundingChoices> & { seed?: number; day?: string } = {}): GameState => {
  const { seed = 7, day, ...choices } = over;
  return createGame({ players: [{ ...DEFAULT_FOUNDING, ...choices }], seed, day });
};
const seat = (s: GameState, id = 'p1') => s.nations[id].seat!;
const act = (s: GameState, a: Action, id = 'p1'): GameState => {
  expect(check(s, a, id)).toEqual({ ok: true });
  return applyAction(s, a, id);
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
    const n = s.nations.p1;
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
    const market = modifiers(fresh({ answers: { liberty: 1, market: 2, reform: 1, openness: 1 } }).nations.p1);
    const collective = modifiers(fresh({ answers: { liberty: 1, market: 0, reform: 1, openness: 1 } }).nations.p1);
    expect(market.commerceMult).toBeGreaterThan(1);
    expect(collective.supplyMult).toBeGreaterThan(1);
  });
});

describe('the daily question', () => {
  it('blocks ending the turn until answered, then applies effects', () => {
    const s = fresh();
    expect(check(s, { type: 'endTurn' }, 'p1').ok).toBe(false);
    const before = s.nations.p1;
    const after = act(s, { type: 'decide', choice: 0 }).nations.p1; // Break the strike
    expect(after.stats.treasury).toBe(before.stats.treasury + 60);
    expect(after.stats.stability).toBe(before.stats.stability - 8 - 5); // the decree, then the change of government
    expect(after.factions.dockworkers).toBe(before.factions.dockworkers - 30);
    expect(after.axes.liberty).toBe(before.axes.liberty - 12);
    expect(after.decisions).toHaveLength(1);
  });
  it('locks choices whose requirement is not met', () => {
    const s = fresh();
    const locked = DILEMMA_BY_ID[seat(s).dilemma!.id].choices[3];
    expect(requirementMet(s, 'p1', locked.requires!)).toBe(false);
    expect(check(s, { type: 'decide', choice: 3 }, 'p1').ok).toBe(false);
  });
  it('asks a new question each turn and cannot be answered twice', () => {
    let s = act(fresh(), { type: 'decide', choice: 1 });
    expect(check(s, { type: 'decide', choice: 0 }, 'p1').ok).toBe(false);
    s = act(s, { type: 'endTurn' });
    expect(s.turn).toBe(2);
    expect(seat(s).dilemma!.choice).toBeNull();
    expect(seat(s).dilemma!.id).not.toBe('docks-strike');
  });
});

describe('building', () => {
  it('spends treasury, takes its turns, then pays', () => {
    let s = fresh();
    const cap = s.nations.p1.capital;
    const income0 = economy(s, 'p1').income.gross;
    const t0 = s.nations.p1.stats.treasury;
    s = act(s, { type: 'build', at: cap, building: 'clinic' });
    const cost = buildCost(fresh(), 'p1', BUILDING_BY_ID.clinic);
    expect(cost).toBe(125); // 120, plus 4% for the market street already standing
    expect(s.nations.p1.stats.treasury).toBe(t0 - cost);
    expect(hexAt(s, cap).buildings).toHaveLength(2);
    expect(check(s, { type: 'build', at: cap, building: 'shop' }, 'p1').ok).toBe(false); // both lots used
    expect(economy(s, 'p1').approval).toBe(economy(fresh(), 'p1').approval); // not finished yet
    s = act(s, { type: 'decide', choice: 1 });
    s = act(s, { type: 'endTurn' });
    s = act(s, { type: 'decide', choice: 0 });
    s = act(s, { type: 'endTurn' });
    expect(hexAt(s, cap).buildings[1].turnsLeft).toBe(0);
    expect(economy(s, 'p1').approval).toBe(economy(fresh(), 'p1').approval + 3);
    expect(income0).toBeGreaterThan(0);
  });
  it('enforces land, era and uniqueness', () => {
    const s = fresh();
    const cap = hexAt(s, s.nations.p1.capital);
    expect(canBuild(s, 'p1', cap, BUILDING_BY_ID.bank).ok).toBe(false); // later era
    expect(canBuild(s, 'p1', cap, BUILDING_BY_ID.sawmill).ok).toBe(false); // needs forest
    const foreign = hexAt(s, s.nations.kesh.capital);
    expect(canBuild(s, 'p1', foreign, BUILDING_BY_ID.shop).ok).toBe(false);
  });
});

describe('armies', () => {
  it('recruits at the capital and musters for a turn', () => {
    let s = fresh();
    const cap = s.nations.p1.capital;
    s = act(s, { type: 'recruit', at: cap, unit: 'infantry' });
    const army = armyAt(s, cap)!;
    expect(army.units.infantry).toBe(4);
    expect(reachable(s, 'p1', army, army.units, army.moved).size).toBe(0);
    expect(check(s, { type: 'recruit', at: cap, unit: 'armour' }, 'p1').ok).toBe(false);
  });
  it('moves through own land, claims unclaimed land, and cannot enter neutral nations', () => {
    let s = fresh();
    const army = armyAt(s, s.nations.p1.capital)!;
    const opts = reachable(s, 'p1', army, army.units, 0);
    expect(opts.size).toBeGreaterThan(6);
    for (const [k, o] of opts) {
      const [c, r] = k.split(',').map(Number);
      const h = hexAt(s, { c, r });
      expect(h.terrain).not.toBe('sea');
      expect(o.kind).toBe(h.owner === 'p1' ? 'move' : 'claim');
    }
    // Split one unit off toward the edge.
    const edge = [...opts].find(([, o]) => o.kind === 'move' && o.cost === 2)![0].split(',').map(Number);
    s = act(s, { type: 'moveArmy', armyId: army.id, to: { c: edge[0], r: edge[1] }, units: { infantry: 1 } });
    expect(armyAt(s, { c: edge[0], r: edge[1] })!.units.infantry).toBe(1);
    expect(armyAt(s, s.nations.p1.capital)!.units.infantry).toBe(2);
  });
  it('captures a hex when the attack wins, and ends the nation when its capital falls', () => {
    let s = fresh();
    // Put a strong player army next to the Kesh capital and go to war.
    const kesh = s.nations.kesh.capital;
    const next = neighbours(kesh, s.cols, s.rows)[3];
    s = structuredClone(s);
    hexAt(s, next).owner = 'p1';
    s.armies.push({ id: 99, owner: 'p1', ...next, units: { infantry: 0, armour: 8, artillery: 0 }, moved: 0 });
    expect(reachable(s, 'p1', next, s.armies[s.armies.length - 1].units, 0).has(key(kesh))).toBe(false);
    s = act(s, { type: 'diplomacy', nation: 'kesh', act: 'war' });
    expect(stance(relation(s, 'p1', 'kesh'))).toBe('At war');
    expect(forecast(s, s.armies.find((a) => a.id === 99)!.units, hexAt(s, kesh)).ratio).toBeGreaterThan(1.2);
    s = act(s, { type: 'moveArmy', armyId: 99, to: kesh });
    expect(hexAt(s, kesh).owner).toBe('p1');
    expect(s.nations.kesh.alive).toBe(false);
    expect(s.armies.some((a) => a.owner === 'kesh')).toBe(false);
    expect(ownedHexes(s, 'kesh')).toHaveLength(0);
  });
});

describe('diplomacy', () => {
  it('needs the envoy on site, and an embassy costs treasury', () => {
    let s = fresh();
    expect(check(s, { type: 'diplomacy', nation: 'ostmark', act: 'gift' }, 'p1').ok).toBe(false);
    const target = ownedHexes(s, 'ostmark')[0];
    s = act(s, { type: 'moveEnvoy', to: target });
    s = act(s, { type: 'decide', choice: 1 });
    while (seat(s).envoy.dest) {
      s = act(s, { type: 'endTurn' });
      s = act(s, { type: 'decide', choice: DILEMMA_BY_ID[seat(s).dilemma!.id].choices.length - 2 });
    }
    const before = relation(s, 'p1', 'ostmark').value;
    s = act(s, { type: 'diplomacy', nation: 'ostmark', act: 'gift' });
    expect(relation(s, 'p1', 'ostmark').value).toBe(before + 12);
    expect(check(s, { type: 'diplomacy', nation: 'ostmark', act: 'trade' }, 'p1').ok).toBe(false); // one per turn
  });
});

describe('a long game', () => {
  it('runs 120 turns without breaking its invariants', () => {
    for (const seed of [1, 2, 3]) {
      let s = fresh({ seed });
      for (let t = 0; t < 120 && s.status === 'playing'; t++) {
        const choices = DILEMMA_BY_ID[seat(s).dilemma!.id].choices;
        const pick = choices.findIndex((c, i) => i >= t % choices.length && (!c.requires || requirementMet(s, 'p1', c.requires)));
        s = applyAction(s, { type: 'decide', choice: pick === -1 ? 0 : pick }, 'p1');
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
    expect(s.nations.p1.government).toBe('council');
    s = act(s, { type: 'decide', choice: 0 }); // break the strike: liberty −12 → 38, reform 50
    expect(s.nations.p1.government).toBe('oneparty');
    expect(s.nations.p1.stats.stability).toBe(60 - 8 - 5);
    expect(s.log.some((l) => l.kind === 'government')).toBe(true);
  });
  it('gives a dictatorship powers and buildings a democracy cannot have', () => {
    const tyrant = fresh({ answers: { liberty: 0, market: 1, reform: 1, openness: 1 } });
    const free = fresh({ answers: { liberty: 2, market: 1, reform: 1, openness: 1 } });
    expect(check(free, { type: 'power', power: 'conscript' }, 'p1').ok).toBe(false);
    const cap = tyrant.nations.p1.capital;
    const after = act(tyrant, { type: 'power', power: 'conscript' });
    expect(armyAt(after, cap)!.units.infantry).toBe(armyAt(tyrant, cap)!.units.infantry + 2);
    expect(after.nations.p1.stats.stability).toBe(tyrant.nations.p1.stats.stability - 6);
    expect(check(after, { type: 'power', power: 'conscript' }, 'p1').ok).toBe(false); // cooling down
    expect(canBuild(tyrant, 'p1', hexAt(tyrant, cap), BUILDING_BY_ID.police).ok).toBe(true);
    expect(canBuild(free, 'p1', hexAt(free, cap), BUILDING_BY_ID.police).ok).toBe(false);
    expect(canBuild(free, 'p1', hexAt(free, cap), BUILDING_BY_ID.assembly).ok).toBe(true);
  });
  it('lets a dictator go to war freely, and makes a democracy ask first', () => {
    const tyrant = fresh({ answers: { liberty: 0, market: 1, reform: 1, openness: 1 } });
    const t2 = act(tyrant, { type: 'diplomacy', nation: 'lune', act: 'war' });
    expect(t2.nations.p1.stats.stability).toBe(tyrant.nations.p1.stats.stability);
    const free = structuredClone(fresh({ answers: { liberty: 2, market: 1, reform: 1, openness: 1 } }));
    free.nations.p1.stats.stability = 45;
    expect(check(free, { type: 'diplomacy', nation: 'lune', act: 'war' }, 'p1').ok).toBe(false);
    free.nations.p1.stats.stability = 60;
    expect(applyAction(free, { type: 'diplomacy', nation: 'lune', act: 'war' }, 'p1').nations.p1.stats.stability).toBe(52);
  });
});

describe('placement', () => {
  it('pays more for a market street beside a clinic', () => {
    const s = structuredClone(fresh());
    const cap = hexAt(s, s.nations.p1.capital);
    expect(buildingYield(s, cap, 0).income).toBe(7);
    const next = hexAt(s, neighbours(cap, s.cols, s.rows)[0]);
    expect(placementEffect(s, 'p1', next, BUILDING_BY_ID.clinic).others.income).toBe(2);
    next.buildings.push({ type: 'clinic', turnsLeft: 0 });
    expect(buildingYield(s, cap, 0).income).toBe(9);
    expect(placementBonusCount(s, 'p1')).toBe(1);
    // …and a clinic suffers beside a mine.
    next.buildings.push({ type: 'mine', turnsLeft: 0 });
    expect(buildingYield(s, next, 0).approval).toBe(2);
  });
});

describe('reasons to come back', () => {
  it('pays out objectives and brings in the next one', () => {
    let s = structuredClone(fresh());
    expect(seat(s).objectives.active).toEqual(['first-works', 'standing-army', 'room-to-grow']);
    const t0 = s.nations.p1.stats.treasury;
    s.armies[0].units.infantry = 5;
    s = act(s, { type: 'recruit', at: s.nations.p1.capital, unit: 'infantry' });
    expect(seat(s).objectives.done).toEqual(['standing-army']);
    expect(seat(s).objectives.active).toHaveLength(3);
    expect(s.nations.p1.stats.treasury).toBe(t0 - 60 + 50);
  });
  it('rewards returning on consecutive days, once a day', () => {
    let s = fresh({ day: '2026-11-16' });
    expect(check(s, { type: 'checkIn', day: '2026-11-16' }, 'p1').ok).toBe(false);
    const t0 = s.nations.p1.stats.treasury;
    s = act(s, { type: 'checkIn', day: '2026-11-17' });
    expect(seat(s).checkIn.streak).toBe(2);
    expect(s.nations.p1.stats.treasury).toBe(t0 + 60);
    s = act(s, { type: 'checkIn', day: '2026-11-20' }); // missed days: the run starts again
    expect(seat(s).checkIn.streak).toBe(1);
    expect(score(s, 'p1')).toBeGreaterThan(0);
  });
});

describe('several players in one world', () => {
  const two = (): GameState => createGame({
    players: [{ ...DEFAULT_FOUNDING, name: 'Northern League' }, { ...DEFAULT_FOUNDING, name: 'Kingdom of Arden', answers: { liberty: 0, market: 1, reform: 0, openness: 1 } }],
    seed: 11,
  });

  it('seats each player in their own nation and leaves the rest to the computer', () => {
    const s = two();
    expect(s.humans).toEqual(['p1', 'p2']);
    expect(s.nations.p2.name).toBe('Kingdom of Arden');
    expect(s.nations.p2.government).toBe('dictatorship');
    expect(s.nations.p2.seat).not.toBeNull();
    expect(s.order).toEqual(['p1', 'p2', 'ostmark', 'kesh']);
    expect(s.nations.ostmark.seat).toBeNull();
    expect(s.nations.kesh.seat).toBeNull();
  });

  it('gives each player their own question, and only moves the world on when all are ready', () => {
    let s = two();
    expect(check(s, { type: 'build', at: s.nations.p2.capital, building: 'clinic' }, 'p1').ok).toBe(false); // not your land
    s = act(s, { type: 'decide', choice: 1 }, 'p1');
    expect(seat(s, 'p2').dilemma!.choice).toBeNull();
    s = act(s, { type: 'endTurn' }, 'p1');
    expect(s.turn).toBe(1);
    expect(allReady(s)).toBe(false);
    expect(check(s, { type: 'recruit', at: s.nations.p1.capital, unit: 'infantry' }, 'p1').ok).toBe(false); // waiting
    expect(check(s, { type: 'endTurn' }, 'p2').ok).toBe(false); // has not answered
    s = act(s, { type: 'decide', choice: 2 }, 'p2');
    s = act(s, { type: 'endTurn' }, 'p2');
    expect(s.turn).toBe(2);
    expect(seat(s, 'p1').ready).toBe(false);
    expect(seat(s, 'p1').dilemma!.choice).toBeNull();
    expect(seat(s, 'p2').dilemma!.choice).toBeNull();
  });

  it('makes deals between players wait for the other side to agree', () => {
    let s = structuredClone(two());
    seat(s, 'p1').envoy = { ...ownedHexes(s, 'p2')[0], dest: null, arrivesTurn: 0 };
    s.nations.p1.stats.influence = 50;
    s = act(s, { type: 'diplomacy', nation: 'p2', act: 'trade' }, 'p1');
    expect(relation(s, 'p1', 'p2').tradePact).toBe(false);
    expect(s.proposals).toHaveLength(1);
    expect(check(s, { type: 'respond', proposal: s.proposals[0].id, accept: true }, 'p1').ok).toBe(false); // not yours to answer
    s = act(s, { type: 'respond', proposal: s.proposals[0].id, accept: true }, 'p2');
    expect(relation(s, 'p1', 'p2').tradePact).toBe(true);
    expect(s.nations.p1.stats.influence).toBe(10);
    expect(s.proposals).toHaveLength(0);
  });

  it('lets one player conquer another, and names the winner', () => {
    let s = structuredClone(two());
    const target = s.nations.p2.capital;
    const next = neighbours(target, s.cols, s.rows)[3];
    hexAt(s, next).owner = 'p1';
    s.armies.push({ id: 99, owner: 'p1', ...next, units: { infantry: 0, armour: 8, artillery: 0 }, moved: 0 });
    s = act(s, { type: 'diplomacy', nation: 'p2', act: 'war' }, 'p1');
    s = act(s, { type: 'moveArmy', armyId: 99, to: target }, 'p1');
    expect(s.nations.p2.alive).toBe(false);
    expect(s.status).toBe('playing'); // two computer nations remain
    expect(check(s, { type: 'decide', choice: 0 }, 'p2').ok).toBe(false);
    // The fallen player no longer holds up the turn.
    s = act(s, { type: 'decide', choice: 1 }, 'p1');
    s = act(s, { type: 'endTurn' }, 'p1');
    expect(s.turn).toBe(2);
  });

  it('plays a long four-player game to the end without breaking', () => {
    let s = createGame({ players: [DEFAULT_FOUNDING, DEFAULT_FOUNDING, DEFAULT_FOUNDING, DEFAULT_FOUNDING], seed: 5 });
    expect(s.humans).toHaveLength(4);
    for (let t = 0; t < 60 && s.status === 'playing'; t++) {
      for (const id of s.humans) {
        if (!s.nations[id].alive || s.status !== 'playing') continue;
        s = applyAction(s, { type: 'decide', choice: t % 3 }, id);
        s = applyAction(s, { type: 'endTurn' }, id);
      }
      for (const a of s.armies) expect(hexAt(s, a).owner).toBe(a.owner);
    }
    expect(s.turn).toBeGreaterThan(50);
  });
});

describe('clocks', () => {
  const timed = (settings = {}): GameState => createGame({ players: [DEFAULT_FOUNDING], seed: 7, now: 1_000, settings: { questionSeconds: 60, ...settings } });

  it('seals a timed question until the player opens it', () => {
    let s = timed();
    expect(questionSealed(s, 'p1')).toBe(true);
    expect(check(s, { type: 'decide', choice: 0 }, 'p1', 2_000).ok).toBe(false);
    s = applyAction(s, { type: 'openQuestion' }, 'p1', 5_000);
    expect(questionDeadline(s, 'p1')).toBe(65_000);
    expect(check(s, { type: 'expire' }, 'p1', 64_999).ok).toBe(false);
    s = applyAction(s, { type: 'decide', choice: 1 }, 'p1', 30_000);
    expect(seat(s).dilemma!.choice).toBe(1);
    expect(questionDeadline(s, 'p1')).toBeNull();
  });

  it('has the council decide, at a cost, when the minute runs out', () => {
    let s = applyAction(timed(), { type: 'openQuestion' }, 'p1', 5_000);
    const before = s.nations.p1.stats.stability;
    s = applyAction(s, { type: 'expire' }, 'p1', 65_000);
    const picked = seat(s).dilemma!.choice!;
    expect(picked).not.toBeNull();
    expect(picked).not.toBe(3); // the locked choice is never picked
    const own = DILEMMA_BY_ID['docks-strike'].choices[picked].effects.find((e) => e.target === 'stability')!.delta;
    const upheaval = s.nations.p1.government === 'council' ? 0 : 5;
    expect(s.nations.p1.stats.stability).toBe(before + own - upheaval - 3);
    expect(s.turn).toBe(1); // the turn itself goes on
  });

  it('ends an overdue turn for a player, answering for them if need be', () => {
    let s = createGame({ players: [DEFAULT_FOUNDING, DEFAULT_FOUNDING], seed: 7, now: 1, settings: { turnSeconds: 180, clock: 'together' } });
    s = applyAction(s, { type: 'decide', choice: 1 }, 'p1', 10_000);
    s = applyAction(s, { type: 'endTurn' }, 'p1', 20_000);
    expect(turnDeadline(s, 'p1')).toBeNull();
    expect(turnDeadline(s, 'p2')).toBe(180_001);
    expect(check(s, { type: 'expire' }, 'p2', 179_000).ok).toBe(false);
    s = applyAction(s, { type: 'expire' }, 'p2', 180_001);
    expect(s.turn).toBe(2); // the absent player no longer holds up the world
    expect(s.nations.p2.decisions).toHaveLength(1);
    expect(turnDeadline(s, 'p2')).toBe(360_001);
  });

  it('starts a pass-and-play clock when the player takes the device', () => {
    let s = createGame({ players: [DEFAULT_FOUNDING, DEFAULT_FOUNDING], seed: 7, now: 0, settings: { turnSeconds: 180, clock: 'inTurn' } });
    s = applyAction(s, { type: 'startClock' }, 'p2', 500_000);
    expect(turnDeadline(s, 'p2')).toBe(680_000);
    expect(check(timed(), { type: 'startClock' }, 'p1', 1).ok).toBe(false);
  });
});

describe('generated worlds', () => {
  it('builds the same world from the same seed, and a different one from another', () => {
    const a = generateWorld(42, 8);
    expect(generateWorld(42, 8)).toEqual(a);
    expect(generateWorld(43, 8).hexes.map((h) => h.terrain)).not.toEqual(a.hexes.map((h) => h.terrain));
  });

  it('gives every nation a full, separate start in worlds of 4 to 12, joined by land', () => {
    for (const n of [4, 6, 8, 10, 12]) {
      for (const seed of [1, 7, 2026]) {
        const s = createGame({ players: [DEFAULT_FOUNDING], nations: n, seed });
        expect(s.order).toHaveLength(n);
        expect(new Set(s.order.map((id) => s.nations[id].color)).size).toBe(n);
        for (const id of s.order) expect(ownedHexes(s, id)).toHaveLength(19);
        // Every capital can be walked to from the first.
        const seen = new Set([key(s.nations[s.order[0]].capital)]);
        const queue = [s.nations[s.order[0]].capital];
        while (queue.length) {
          for (const x of neighbours(queue.pop()!, s.cols, s.rows)) {
            if (hexAt(s, x).terrain !== 'sea' && !seen.has(key(x))) { seen.add(key(x)); queue.push(x); }
          }
        }
        for (const id of s.order) expect(seen.has(key(s.nations[id].capital))).toBe(true);
      }
    }
  });

  it('asks for a smaller share of a bigger world to win', () => {
    expect(hegemonyShare(createGame({ players: [DEFAULT_FOUNDING], nations: 4, seed: 1 }))).toBe(0.6);
    expect(hegemonyShare(createGame({ players: [DEFAULT_FOUNDING], nations: 8, seed: 1 }))).toBe(0.3);
    expect(hegemonyShare(createGame({ players: [DEFAULT_FOUNDING], nations: 12, seed: 1 }))).toBe(0.3);
  });

  it('plays a twelve-nation world for 60 turns without breaking', () => {
    let s = createGame({ players: [DEFAULT_FOUNDING, DEFAULT_FOUNDING], nations: 12, seed: 3 });
    const start = Date.now();
    for (let t = 0; t < 60 && s.status === 'playing'; t++) {
      for (const id of s.humans) {
        if (!s.nations[id].alive || s.status !== 'playing') continue;
        s = applyAction(s, { type: 'decide', choice: t % 3 }, id);
        s = applyAction(s, { type: 'endTurn' }, id);
      }
      for (const a of s.armies) {
        expect(hexAt(s, a).owner).toBe(a.owner);
        expect(armySize(a.units)).toBeLessThanOrEqual(MAX_STACK);
      }
    }
    expect(Date.now() - start).toBeLessThan(20_000);
    expect(s.log.some((l) => l.kind === 'war')).toBe(true); // a world this crowded does not stay peaceful
  });
});
