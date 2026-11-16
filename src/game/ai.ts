import { canBuild, canClaim, canRecruit, doBuild, doClaim, doRecruit, fitsHex, buildCost } from './actions';
import { BUILDINGS } from './content/buildings';
import { BALANCE, TERRAIN, UNITS, UNIT_BY_ID } from './content/world';
import { declareWar, makePeace } from './diplomacy';
import { economy, militaryStrength, ownedHexes, unitCount } from './economy';
import { distance, hexAt, key, neighbourHexes, same } from './hex';
import { armyAt, armySize, executeMove, forecast, noUnits, reachable, sharesBorder } from './military';
import { enemiesOf, relation } from './relations';
import type { Rng } from './rng';
import type { GameState, Hex, HexRef, NationId, UnitCounts } from './types';

// Rival nations play by the player's rules: the same costs, the same checks,
// the same battles. Their temperament comes from `personality` in the content.

export function runAi(state: GameState, id: NationId, rng: Rng): void {
  if (!state.nations[id].alive) return;
  considerWarAndPeace(state, id, rng);
  recruit(state, id, rng);
  build(state, id, rng);
  claim(state, id, rng);
  moveArmies(state, id, rng);
}

function considerWarAndPeace(state: GameState, id: NationId, rng: Rng): void {
  const me = state.nations[id];
  const wars = enemiesOf(state, id);
  if (wars.length) {
    // Long wars between rivals burn out. Wars with the player end only when the player offers peace.
    for (const e of wars) {
      if (e === state.playerId) continue;
      if (state.turn - relation(state, id, e).warSince >= 10 && rng.float() < 0.25) makePeace(state, id, e);
    }
    return;
  }
  if (state.turn < 12) return;
  // Patience runs out as the map fills up.
  const threshold = -50 + me.personality.aggression * 45 + Math.min(20, state.turn / 4);
  const myStrength = militaryStrength(state, id) + 6;
  const targets = state.order.filter((o) => {
    if (o === id || !state.nations[o].alive) return false;
    const rel = relation(state, id, o);
    if (rel.napUntil >= state.turn || rel.value >= threshold) return false;
    // New players get time to find their feet.
    if (o === state.playerId && state.turn < BALANCE.playerGraceTurns) return false;
    if (!sharesBorder(state, id, o)) return false;
    const needed = enemiesOf(state, o).length ? 0.9 : 1.2;
    return myStrength >= needed * (militaryStrength(state, o) + 6);
  });
  if (!targets.length || rng.float() > 0.3) return;
  targets.sort((a, b) => relation(state, id, a).value - relation(state, id, b).value);
  declareWar(state, id, targets[0]);
}

function recruit(state: GameState, id: NationId, rng: Rng): void {
  const me = state.nations[id];
  const atWar = enemiesOf(state, id).length > 0;
  // A full treasury with nothing left to build goes to the army.
  const desired = Math.round(4 + me.era * 2 + me.personality.aggression * 4 + (atWar ? 4 : 0) + state.turn / 8 + Math.min(16, me.stats.treasury / 400));
  const sites = ownedHexes(state, id).filter((h) => canRecruit(state, id, h, UNIT_BY_ID.infantry).ok || h.capitalOf === id);
  for (let n = 0; n < 2 && unitCount(state, id) < desired; n++) {
    const eco = economy(state, id);
    const options = UNITS.filter((u) => sites.some((s) => canRecruit(state, id, s, u).ok));
    if (!options.length) return;
    let pick = UNIT_BY_ID.infantry;
    const armour = options.find((u) => u.id === 'armour');
    const artillery = options.find((u) => u.id === 'artillery');
    if (armour && rng.float() < 0.45) pick = armour;
    else if (artillery && rng.float() < 0.3) pick = artillery;
    if (!options.includes(pick)) pick = options[0];
    if (eco.net - pick.upkeep < (atWar ? -5 : 4)) return;
    const site = sites.filter((s) => canRecruit(state, id, s, pick).ok).sort((a, b) => stackAt(state, a) - stackAt(state, b))[0];
    if (!site) return;
    doRecruit(state, id, site, pick);
  }
}

const stackAt = (state: GameState, h: HexRef): number => {
  const a = armyAt(state, h);
  return a ? armySize(a.units) : 0;
};

function build(state: GameState, id: NationId, rng: Rng): void {
  const me = state.nations[id];
  const atWar = enemiesOf(state, id).length > 0;
  const reserve = atWar ? 140 : 50;
  const rounds = me.stats.treasury > 500 ? 2 : 1;
  for (let round = 0; round < rounds; round++) {
    const eco = economy(state, id);
    const wSupply = eco.supply.net < 3 ? 4 : 0.5;
    const wApproval = me.stats.stability < 50 ? 4 : 0.7;
    const free = ownedHexes(state, id).filter((h) => h.buildings.length < 2);
    let best: { hex: Hex; def: (typeof BUILDINGS)[number]; score: number } | null = null;
    for (const def of BUILDINGS) {
      if (buildCost(state, id, def) + reserve > me.stats.treasury) continue;
      for (const hex of free) {
        if (!fitsHex(state, id, hex, def).ok) continue;
        const border = neighbourHexes(state, hex).some((n) => n.owner !== id && n.terrain !== 'sea');
        const wSecurity = border && atWar ? 1.2 : border ? 0.25 : 0;
        const value = (def.income ?? 0) + (def.supply ?? 0) * wSupply + (def.approval ?? 0) * wApproval
          + (def.security ?? 0) * wSecurity + (def.influence ?? 0) * 1.5 + (def.recruits && border ? 2 : 0);
        const score = (value / def.cost) * (1 - 0.03 * distance(hex, me.capital)) * rng.range(0.8, 1.2);
        if (!best || score > best.score) best = { hex, def, score };
      }
    }
    if (!best || best.score <= 0 || !canBuild(state, id, best.hex, best.def).ok) return;
    doBuild(state, id, best.hex, best.def);
  }
}

function claim(state: GameState, id: NationId, rng: Rng): void {
  const me = state.nations[id];
  if (rng.float() > me.personality.expansion) return;
  const options = state.hexes.filter((h) => canClaim(state, id, h).ok);
  if (!options.length) return;
  options.sort((a, b) => landValue(b, me.capital) - landValue(a, me.capital));
  doClaim(state, id, options[0]);
}

function landValue(h: Hex, capital: HexRef): number {
  const t = TERRAIN[h.terrain];
  return t.income + t.supply - 0.25 * distance(h, capital);
}

function moveArmies(state: GameState, id: NationId, rng: Rng): void {
  const me = state.nations[id];
  const enemies = enemiesOf(state, id);
  const atWar = enemies.length > 0;
  const threatened = state.armies.some((a) => enemies.includes(a.owner) && distance(a, me.capital) <= 2);

  for (const army of state.armies.filter((a) => a.owner === id)) {
    if (!state.armies.includes(army) || !state.nations[id].alive || state.status !== 'playing') continue;
    const atCapital = same(army, me.capital);
    let moving: UnitCounts = { ...army.units };
    if (atCapital) {
      // Keep a home guard in the capital; send the rest out.
      const keep = threatened ? 8 : atWar ? 4 : 3;
      const spare = armySize(army.units) - keep;
      if (spare <= 0) continue;
      moving = noUnits();
      let left = spare;
      for (const u of ['armour', 'artillery', 'infantry'] as const) {
        const take = Math.min(left, army.units[u]);
        moving[u] = take;
        left -= take;
      }
    }
    const options = reachable(state, id, army, moving, army.moved);
    if (!options.size) continue;
    const at = (k: string): HexRef => {
      const [c, r] = k.split(',').map(Number);
      return { c, r };
    };

    // 1. Attack where the odds are good. Capitals are worth the most.
    let bestAttack: { to: HexRef; score: number } | null = null;
    for (const [k, opt] of options) {
      if (opt.kind !== 'attack') continue;
      const hex = hexAt(state, at(k));
      const f = forecast(state, moving, hex);
      if (f.ratio < (hex.capitalOf === hex.owner ? 1.05 : 1.2)) continue;
      const score = (hex.capitalOf === hex.owner ? 100 : 0) + hex.buildings.length * 10 + Math.min(f.ratio, 3) + (armyAt(state, hex) ? 5 : 0);
      if (!bestAttack || score > bestAttack.score) bestAttack = { to: at(k), score };
    }
    if (bestAttack) {
      executeMove(state, army, bestAttack.to, moving, options.get(key(bestAttack.to))!, rng);
      continue;
    }

    // 2. Fall back to a threatened capital.
    if (threatened && !atCapital) {
      stepToward(state, army, moving, options, me.capital, rng);
      continue;
    }

    // 3. At war: close with the enemy.
    if (atWar) {
      let goal: Hex | null = null;
      for (const h of state.hexes) {
        if (!h.owner || !enemies.includes(h.owner)) continue;
        if (!goal || distance(h, army) < distance(goal, army)) goal = h;
      }
      if (goal && stepToward(state, army, moving, options, goal, rng)) continue;
    }

    // 4. At peace: leave the capital and stand on the border facing the least-liked neighbour.
    if (!atWar && atCapital) {
      const rivals = state.order.filter((o) => o !== id && state.nations[o].alive);
      rivals.sort((x, y) => relation(state, id, x).value - relation(state, id, y).value);
      if (rivals.length && rng.float() > me.personality.expansion * 0.6 && stepToward(state, army, moving, options, state.nations[rivals[0]].capital, rng)) continue;
    }

    // 5. Otherwise, walk into unclaimed land.
    if (rng.float() < me.personality.expansion * 0.6) {
      const claims = [...options].filter(([, o]) => o.kind === 'claim').map(([k]) => hexAt(state, at(k)));
      if (claims.length) {
        claims.sort((a, b) => landValue(b, me.capital) - landValue(a, me.capital));
        executeMove(state, army, claims[0], moving, options.get(key(claims[0]))!, rng);
      }
    }
  }
}

/** Move to the reachable friendly hex nearest the goal, if that gets closer. */
function stepToward(state: GameState, army: GameState['armies'][number], moving: UnitCounts, options: ReturnType<typeof reachable>, goal: HexRef, rng: Rng): boolean {
  let best: { to: HexRef; d: number } | null = null;
  for (const [k, opt] of options) {
    if (opt.kind !== 'move') continue;
    const [c, r] = k.split(',').map(Number);
    const d = distance({ c, r }, goal);
    if (!best || d < best.d) best = { to: { c, r }, d };
  }
  if (!best || best.d >= distance(army, goal)) return false;
  executeMove(state, army, best.to, moving, options.get(key(best.to))!, rng);
  return true;
}
