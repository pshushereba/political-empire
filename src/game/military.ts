import { BUILDING_BY_ID } from './content/buildings';
import { BALANCE, MAX_STACK, TERRAIN, UNIT_BY_ID, UNIT_IDS } from './content/world';
import { modifiers } from './economy';
import { buildingYield } from './yields';
import { coord, distance, hexAt, key, neighbourHexes, neighbours } from './hex';
import { atWar, pairKey } from './relations';
import type { Rng } from './rng';
import type { Army, GameState, Hex, HexRef, NationId, UnitCounts } from './types';

export const noUnits = (): UnitCounts => ({ infantry: 0, armour: 0, artillery: 0 });

export function armySize(units: UnitCounts): number {
  return units.infantry + units.armour + units.artillery;
}

/** Hexes per turn: the pace of the slowest unit present. */
export function armySpeed(units: UnitCounts): number {
  let speed = Infinity;
  for (const u of UNIT_IDS) if (units[u] > 0) speed = Math.min(speed, UNIT_BY_ID[u].move);
  return speed === Infinity ? 0 : speed;
}

export function armyAt(state: GameState, h: HexRef): Army | undefined {
  return state.armies.find((a) => a.c === h.c && a.r === h.r);
}

export function describeUnits(units: UnitCounts): string {
  const parts = UNIT_IDS.filter((u) => units[u] > 0).map((u) => `${units[u]} ${UNIT_BY_ID[u].plural}`);
  return parts.length ? parts.join(', ') : 'no units';
}

export type MoveKind = 'move' | 'claim' | 'attack';
export interface MoveOption {
  kind: MoveKind;
  cost: number;
}

/**
 * Where a group of units standing on `from` can go this turn. They travel
 * through their own land; stepping onto unclaimed land claims it, and stepping
 * onto an enemy's land (only when at war) is an attack. Both end the move.
 */
export function reachable(state: GameState, owner: NationId, from: HexRef, units: UnitCounts, moved: number): Map<string, MoveOption> {
  const out = new Map<string, MoveOption>();
  const left = armySpeed(units) - moved;
  if (left <= 0) return out;
  const size = armySize(units);
  const seen = new Map<string, number>([[key(from), 0]]);
  let frontier: HexRef[] = [from];
  for (let cost = 1; cost <= left && frontier.length; cost++) {
    const nextFrontier: HexRef[] = [];
    for (const f of frontier) {
      for (const n of neighbours(f, state.cols, state.rows)) {
        const k = key(n);
        if (seen.has(k)) continue;
        const hex = hexAt(state, n);
        if (hex.terrain === 'sea') continue;
        if (hex.owner === owner) {
          seen.set(k, cost);
          nextFrontier.push(n);
          const there = armyAt(state, n);
          // A full hex can be passed through but not stopped on.
          if (!there || armySize(there.units) + size <= MAX_STACK) out.set(k, { kind: 'move', cost });
        } else if (hex.owner === null) {
          if (!out.has(k)) out.set(k, { kind: 'claim', cost });
        } else if (atWar(state, owner, hex.owner)) {
          if (!out.has(k)) out.set(k, { kind: 'attack', cost });
        }
      }
    }
    frontier = nextFrontier;
  }
  return out;
}

export interface Forecast {
  attack: number;
  defence: number;
  ratio: number;
  label: 'Decisive' | 'Favourable' | 'Even' | 'Poor';
}

export function attackPower(units: UnitCounts, target: Hex): number {
  const t = TERRAIN[target.terrain];
  return units.infantry * UNIT_BY_ID.infantry.attack + units.armour * UNIT_BY_ID.armour.attack * t.armour + units.artillery * UNIT_BY_ID.artillery.attack;
}

export function hexSecurity(state: GameState, hex: Hex): number {
  let s = 0;
  hex.buildings.forEach((b, i) => { if (b.turnsLeft === 0) s += buildingYield(state, hex, i).security; });
  return s;
}

export function defencePower(state: GameState, target: Hex, attackerHasArtillery: boolean): number {
  if (!target.owner) return 0;
  const defender = state.nations[target.owner];
  const isCapital = target.capitalOf === target.owner;
  const army = armyAt(state, target);
  let men = isCapital ? BALANCE.capitalMilitia : BALANCE.militia;
  if (army) for (const u of UNIT_IDS) men += army.units[u] * UNIT_BY_ID[u].defence;
  let mult = TERRAIN[target.terrain].defence * (isCapital ? BALANCE.capitalDefence : 1) * modifiers(defender).defenceMult;
  if (isCutOff(state, target)) mult *= BALANCE.cutOffDefence;
  return men * mult + hexSecurity(state, target) * (attackerHasArtillery ? 0.5 : 1);
}

/** A hex with no friendly land beside it is cut off, and defends badly. */
export function isCutOff(state: GameState, hex: Hex): boolean {
  return hex.owner !== null && !neighbourHexes(state, hex).some((n) => n.owner === hex.owner);
}

/** Expected odds before the dice (the real battle varies attack by ±15%). */
export function forecast(state: GameState, units: UnitCounts, target: Hex): Forecast {
  const attack = attackPower(units, target);
  const defence = defencePower(state, target, units.artillery > 0);
  const ratio = defence > 0 ? attack / defence : 99;
  const label = ratio >= 1.5 ? 'Decisive' : ratio >= 1.15 ? 'Favourable' : ratio >= 0.9 ? 'Even' : 'Poor';
  return { attack: Math.round(attack * 10) / 10, defence: Math.round(defence * 10) / 10, ratio, label };
}

function removeCasualties(units: UnitCounts, count: number, rng: Rng): void {
  for (let i = 0; i < count; i++) {
    const size = armySize(units);
    if (size === 0) return;
    let roll = rng.int(size);
    for (const u of UNIT_IDS) {
      if (roll < units[u]) { units[u]--; break; }
      roll -= units[u];
    }
  }
}

function log(state: GameState, entry: Omit<GameState['log'][number], 'turn'>): void {
  state.log.push({ turn: state.turn, ...entry });
}

/** Hand a hex to a new owner. Security buildings, capital-only buildings and building sites don't survive. */
export function transferHex(hex: Hex, owner: NationId | null): void {
  hex.buildings = hex.buildings.filter((b) => {
    const d = BUILDING_BY_ID[b.type];
    return b.turnsLeft === 0 && d.category !== 'security' && !d.needs?.includes('capital');
  });
  hex.owner = owner;
}

/** A nation whose capital has fallen is finished. */
export function collapse(state: GameState, loserId: NationId, winnerId: NationId): void {
  const loser = state.nations[loserId];
  const winner = state.nations[winnerId];
  loser.alive = false;
  winner.tally.capitalsTaken++;
  state.armies = state.armies.filter((a) => a.owner !== loserId);
  for (const h of state.hexes) {
    if (h.owner !== loserId) continue;
    // The heartland goes to the conqueror; the outer provinces break away.
    transferHex(h, distance(h, loser.capital) <= 2 ? winnerId : null);
  }
  const loot = Math.round(Math.max(0, loser.stats.treasury) * 0.5);
  winner.stats.treasury += loot;
  loser.stats.treasury = 0;
  for (const other of state.order) {
    if (other === loserId) continue;
    const rel = state.relations[pairKey(loserId, other)];
    rel.war = false;
    rel.tradePact = false;
  }
  state.proposals = state.proposals.filter((p) => p.from !== loserId && p.to !== loserId);
  log(state, { kind: 'war', important: true, at: loser.capital,
    text: `${loser.name} has fallen. ${winner.name} took its capital${loot ? ` and ${loot} from its treasury` : ''}; its outer provinces broke away.` });
  checkOutcome(state);
}

/** Is the game decided? Sets status, winner and a description of how it ended. */
export function checkOutcome(state: GameState): void {
  if (state.status !== 'playing') return;
  const end = (winner: NationId | null, outcome: string): void => {
    state.status = 'over';
    state.winner = winner;
    state.outcome = outcome;
  };
  const alive = state.order.filter((id) => state.nations[id].alive);
  if (alive.length === 1) {
    end(alive[0], `Conquest. No other capital still stands, and ${state.nations[alive[0]].name} rules alone.`);
    return;
  }
  const land = state.hexes.filter((h) => h.terrain !== 'sea').length;
  const needed = Math.ceil(land * BALANCE.hegemonyShare);
  for (const id of alive) {
    const held = state.hexes.filter((h) => h.owner === id).length;
    if (held >= needed) {
      end(id, `Hegemony. ${state.nations[id].name} holds ${held} of ${land} hexes, and the world answers to it now.`);
      return;
    }
  }
  // With no person left to play, there is no game.
  if (!state.humans.some((id) => state.nations[id].alive)) {
    const leader = alive.sort((x, y) => state.hexes.filter((h) => h.owner === y).length - state.hexes.filter((h) => h.owner === x).length)[0];
    end(leader ?? null, `Every nation run by a player has fallen. ${leader ? state.nations[leader].name + ' is left to inherit the map.' : ''}`);
  }
}

function placeArmy(state: GameState, mover: Army): void {
  const there = armyAt(state, mover);
  if (there && there.owner === mover.owner) {
    for (const u of UNIT_IDS) there.units[u] += mover.units[u];
    there.moved = Math.max(there.moved, mover.moved);
  } else {
    state.armies.push(mover);
  }
}

/**
 * Move, claim or attack. Mutates the draft state. Callers must already have
 * checked the move with `reachable`.
 */
export function executeMove(state: GameState, army: Army, to: HexRef, moving: UnitCounts, option: MoveOption, rng: Rng): void {
  const origin: HexRef = { c: army.c, r: army.r };
  const whole = UNIT_IDS.every((u) => moving[u] === army.units[u]);
  for (const u of UNIT_IDS) army.units[u] -= moving[u];
  let mover: Army;
  if (whole) {
    state.armies = state.armies.filter((a) => a !== army);
    mover = { ...army, units: { ...moving } };
  } else {
    mover = { id: state.nextArmyId++, owner: army.owner, c: army.c, r: army.r, units: { ...moving }, moved: army.moved };
  }
  const speed = armySpeed(moving);
  const target = hexAt(state, to);
  const me = state.nations[army.owner];

  if (option.kind === 'move') {
    mover.c = to.c; mover.r = to.r;
    mover.moved += option.cost;
    placeArmy(state, mover);
    return;
  }

  if (option.kind === 'claim') {
    target.owner = army.owner;
    mover.c = to.c; mover.r = to.r;
    mover.moved = speed;
    placeArmy(state, mover);
    if (me.seat) log(state, { kind: 'info', to: army.owner, at: to, text: `Your troops occupied unclaimed ${TERRAIN[target.terrain].name.toLowerCase()} at ${coord(to)}.` });
    checkOutcome(state);
    return;
  }

  // Attack.
  const defenderId = target.owner as NationId;
  const defender = state.nations[defenderId];
  const defArmy = armyAt(state, to);
  const attack = attackPower(moving, target) * rng.range(0.85, 1.15);
  const defence = defencePower(state, target, moving.artillery > 0);
  const ratio = attack / Math.max(0.1, defence);
  const sizeA = armySize(mover.units);
  const where = `${target.capitalOf === defenderId ? 'the capital of ' + defender.short : defender.short + ' land'} at ${coord(to)}`;

  if (ratio >= 1) {
    const lossA = Math.min(sizeA - 1, Math.round(sizeA * Math.min(0.45, 0.45 / ratio)));
    removeCasualties(mover.units, lossA, rng);
    let lossD = 0;
    if (defArmy) {
      const sizeD = armySize(defArmy.units);
      state.armies = state.armies.filter((a) => a !== defArmy);
      lossD = ratio >= 2 ? sizeD : Math.ceil(sizeD * 0.5);
      removeCasualties(defArmy.units, lossD, rng);
      if (armySize(defArmy.units) > 0) {
        const retreat = neighbourHexes(state, to).find((h) => {
          if (h.owner !== defenderId) return false;
          const there = armyAt(state, h);
          return !there || armySize(there.units) + armySize(defArmy.units) <= MAX_STACK;
        });
        if (retreat) {
          defArmy.c = retreat.c; defArmy.r = retreat.r;
          placeArmy(state, defArmy);
        } else {
          lossD = sizeD;
        }
      }
    }
    const wasCapital = target.capitalOf === defenderId;
    transferHex(target, army.owner);
    mover.c = to.c; mover.r = to.r;
    mover.moved = speed;
    placeArmy(state, mover);
    defender.stats.stability = Math.max(0, defender.stats.stability - 2);
    me.tally.battlesWon++;
    log(state, { kind: 'battle', important: true, about: [army.owner, defenderId], at: to,
      text: `${me.short} took ${where}. Losses: ${me.short} ${lossA}, ${defender.short} ${lossD}.` });
    if (wasCapital) collapse(state, defenderId, army.owner);
    else checkOutcome(state);
    return;
  }

  // Repulsed: the attackers fall back to where they started.
  const lossA = Math.min(sizeA, Math.max(1, Math.round(sizeA * Math.min(0.7, 0.3 + 0.4 * (1 - ratio)))));
  removeCasualties(mover.units, lossA, rng);
  let lossD = 0;
  if (defArmy) {
    lossD = Math.min(armySize(defArmy.units) - 1, Math.floor(armySize(defArmy.units) * 0.35 * ratio));
    removeCasualties(defArmy.units, Math.max(0, lossD), rng);
  }
  mover.c = origin.c; mover.r = origin.r;
  mover.moved = speed;
  if (armySize(mover.units) > 0) placeArmy(state, mover);
  log(state, { kind: 'battle', important: true, about: [army.owner, defenderId], at: to,
    text: `${me.short} attacked ${where} and was thrown back. Losses: ${me.short} ${lossA}, ${defender.short} ${Math.max(0, lossD)}.` });
}

/** True if any hex of `a` touches a hex of `b`. */
export function sharesBorder(state: GameState, a: NationId, b: NationId): boolean {
  return state.hexes.some((h) => h.owner === a && neighbourHexes(state, h).some((n) => n.owner === b));
}
