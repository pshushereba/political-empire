import { BUILDING_BY_ID, LOTS_PER_HEX, type BuildingDef } from './content/buildings';
import { DILEMMA_BY_ID } from './content/dilemmas';
import { AXIS_IDS, BALANCE, FACTION_IDS, MAX_STACK, UNIT_BY_ID, UNIT_IDS, type UnitDef } from './content/world';
import { canDiplomacy, doDiplomacy, shiftRelation } from './diplomacy';
import { clamp, hasFinished, modifiers, ownedHexes } from './economy';
import { distance, hexAt, key, neighbourHexes, same } from './hex';
import { armyAt, armySize, checkOutcome, executeMove, noUnits, reachable } from './military';
import { atWar } from './relations';
import { Rng } from './rng';
import { endTurn } from './turn';
import type { Action, AxisId, Check, Effect, FactionId, GameState, Hex, HexRef, NationId, UnitCounts, UnitId } from './types';

const no = (reason: string): Check => ({ ok: false, reason });
const yes: Check = { ok: true };

// ---- Building --------------------------------------------------------------

export function buildCost(state: GameState, id: NationId, def: BuildingDef): number {
  let owned = 0;
  for (const h of state.hexes) if (h.owner === id) owned += h.buildings.length;
  return Math.round(def.cost * modifiers(state.nations[id]).buildCostMult * (1 + BALANCE.buildInflation * owned));
}

/** Does the land allow this building here, ignoring money? */
export function fitsHex(state: GameState, id: NationId, hex: Hex, def: BuildingDef): Check {
  if (hex.owner !== id) return no('Not your land');
  if (def.era > state.nations[id].era) return no('Unlocks in a later era');
  if (hex.buildings.length >= LOTS_PER_HEX) return no('Both lots are used');
  if (def.needs) {
    const ok = def.needs.some((n) => (n === 'capital' ? hex.capitalOf === id : hex.terrain === n));
    if (!ok) return no(`Needs ${def.needs.map((n) => (n === 'capital' ? 'the capital' : n)).join(' or ')}`);
  }
  if (def.unique && state.hexes.some((h) => h.owner === id && h.buildings.some((b) => b.type === def.id))) return no('Only one per nation');
  if (def.recruits && hex.buildings.some((b) => b.type === def.id)) return no('Already has one');
  return yes;
}

export function canBuild(state: GameState, id: NationId, hex: Hex, def: BuildingDef): Check {
  const fit = fitsHex(state, id, hex, def);
  if (!fit.ok) return fit;
  const cost = buildCost(state, id, def);
  if (state.nations[id].stats.treasury < cost) return no(`Needs ${cost} treasury`);
  return yes;
}

export function doBuild(state: GameState, id: NationId, hex: Hex, def: BuildingDef): void {
  state.nations[id].stats.treasury -= buildCost(state, id, def);
  hex.buildings.push({ type: def.id, turnsLeft: def.turns });
}

// ---- Recruiting ------------------------------------------------------------

export function recruitCost(state: GameState, id: NationId, def: UnitDef): number {
  return Math.round(def.cost * modifiers(state.nations[id]).recruitMult);
}

export function isRecruitSite(hex: Hex, id: NationId): boolean {
  if (hex.owner !== id) return false;
  return hex.capitalOf === id || hex.buildings.some((b) => b.turnsLeft === 0 && BUILDING_BY_ID[b.type].recruits);
}

export function unitUnlocked(state: GameState, id: NationId, def: UnitDef): Check {
  if (def.era > state.nations[id].era) return no('Unlocks in a later era');
  if (def.needsBuilding && !hasFinished(state, id, def.needsBuilding)) return no(`Needs a ${BUILDING_BY_ID[def.needsBuilding].name.toLowerCase()}`);
  return yes;
}

export function canRecruit(state: GameState, id: NationId, hex: Hex, def: UnitDef): Check {
  if (!isRecruitSite(hex, id)) return no('Troops are raised at the capital or a garrison');
  const unlocked = unitUnlocked(state, id, def);
  if (!unlocked.ok) return unlocked;
  const army = armyAt(state, hex);
  if (army && armySize(army.units) >= MAX_STACK) return no(`A hex holds at most ${MAX_STACK} units`);
  const cost = recruitCost(state, id, def);
  if (state.nations[id].stats.treasury < cost) return no(`Needs ${cost} treasury`);
  return yes;
}

export function doRecruit(state: GameState, id: NationId, hex: Hex, def: UnitDef): void {
  state.nations[id].stats.treasury -= recruitCost(state, id, def);
  let army = armyAt(state, hex);
  if (!army) {
    army = { id: state.nextArmyId++, owner: id, c: hex.c, r: hex.r, units: noUnits(), moved: 0 };
    state.armies.push(army);
  }
  army.units[def.id]++;
  // New recruits spend the turn mustering.
  army.moved = 99;
}

// ---- Claiming land ---------------------------------------------------------

export function claimCost(state: GameState, id: NationId): number {
  return BALANCE.claimBase + Math.floor(ownedHexes(state, id).length / 4);
}

export function canClaim(state: GameState, id: NationId, hex: Hex): Check {
  if (hex.terrain === 'sea') return no('Open sea');
  if (hex.owner !== null) return no('Already claimed');
  if (!neighbourHexes(state, hex).some((n) => n.owner === id)) return no('Must border your land');
  const cost = claimCost(state, id);
  if (state.nations[id].stats.influence < cost) return no(`Needs ${cost} influence`);
  return yes;
}

export function doClaim(state: GameState, id: NationId, hex: Hex): void {
  state.nations[id].stats.influence -= claimCost(state, id);
  hex.owner = id;
  checkOutcome(state);
}

// ---- Envoy -----------------------------------------------------------------

export function envoyTravelTurns(state: GameState, to: HexRef): number {
  return Math.ceil(distance(state.envoy, to) / 2);
}

export function canMoveEnvoy(state: GameState, to: HexRef): Check {
  const hex = hexAt(state, to);
  if (hex.terrain === 'sea') return no('Envoys cannot cross open sea');
  if (state.envoy.dest) return no(`Your envoy is travelling (arrives turn ${state.envoy.arrivesTurn})`);
  if (same(state.envoy, to)) return no('Your envoy is here');
  if (hex.owner && atWar(state, state.playerId, hex.owner)) return no('You are at war with them');
  return yes;
}

// ---- Army orders -----------------------------------------------------------

export function movingUnits(army: { units: UnitCounts }, subset?: Partial<UnitCounts>): UnitCounts {
  if (!subset) return { ...army.units };
  const out = noUnits();
  for (const u of UNIT_IDS) out[u] = clamp(Math.floor(subset[u] ?? 0), 0, army.units[u]);
  return out;
}

export function canMoveArmy(state: GameState, id: NationId, armyId: number, to: HexRef, subset?: Partial<UnitCounts>): Check {
  const army = state.armies.find((a) => a.id === armyId);
  if (!army || army.owner !== id) return no('Not your army');
  const moving = movingUnits(army, subset);
  if (armySize(moving) === 0) return no('Choose at least one unit');
  if (!reachable(state, id, army, moving, army.moved).has(key(to))) return no('Out of reach this turn');
  return yes;
}

// ---- The daily question ----------------------------------------------------

export function requirementMet(state: GameState, req: NonNullable<import('./types').DilemmaChoice['requires']>): boolean {
  const n = state.nations[state.playerId];
  const value = (AXIS_IDS as string[]).includes(req.target) ? n.axes[req.target as AxisId] : n.stats[req.target as keyof typeof n.stats];
  return (req.min === undefined || value >= req.min) && (req.max === undefined || value <= req.max);
}

/** Treasury swings grow with the nation so they stay meaningful. */
export function scaledEffects(state: GameState, effects: Effect[]): Effect[] {
  const era = state.nations[state.playerId].era;
  return effects.map((e) => (e.target === 'treasury' ? { ...e, delta: Math.round(e.delta * (1 + 0.5 * era)) } : e));
}

export function applyEffects(state: GameState, effects: Effect[]): void {
  const n = state.nations[state.playerId];
  for (const e of effects) {
    if (e.target === 'relations') {
      for (const other of state.order) if (other !== n.id && state.nations[other].alive) shiftRelation(state, n.id, other, e.delta);
    } else if ((AXIS_IDS as string[]).includes(e.target)) {
      const a = e.target as AxisId;
      n.axes[a] = clamp(n.axes[a] + e.delta, 0, 100);
    } else if ((FACTION_IDS as string[]).includes(e.target)) {
      const f = e.target as FactionId;
      n.factions[f] = clamp(n.factions[f] + e.delta, 0, 100);
    } else if (e.target === 'population') {
      n.stats.population = Math.round(n.stats.population * (1 + e.delta / 100));
    } else if (e.target === 'stability') {
      n.stats.stability = clamp(n.stats.stability + e.delta, 0, 100);
    } else if (e.target === 'treasury') {
      n.stats.treasury += e.delta;
    } else if (e.target === 'influence') {
      n.stats.influence = Math.max(0, n.stats.influence + e.delta);
    }
  }
}

// ---- Reducer ---------------------------------------------------------------

/** Why the player can't do this right now, or ok. */
export function check(state: GameState, action: Action): Check {
  if (state.status !== 'playing') return no('The game is over');
  const id = state.playerId;
  switch (action.type) {
    case 'build': {
      const def = BUILDING_BY_ID[action.building];
      return def ? canBuild(state, id, hexAt(state, action.at), def) : no('Unknown building');
    }
    case 'demolish': {
      const hex = hexAt(state, action.at);
      return hex.owner === id && hex.buildings[action.slot] ? yes : no('Nothing to remove');
    }
    case 'recruit':
      return canRecruit(state, id, hexAt(state, action.at), UNIT_BY_ID[action.unit]);
    case 'moveArmy':
      return canMoveArmy(state, id, action.armyId, action.to, action.units);
    case 'disband': {
      const army = state.armies.find((a) => a.id === action.armyId);
      return army && army.owner === id && army.units[action.unit] > 0 ? yes : no('No such unit');
    }
    case 'claimHex':
      return canClaim(state, id, hexAt(state, action.at));
    case 'moveEnvoy':
      return canMoveEnvoy(state, action.to);
    case 'decide': {
      if (!state.dilemma) return no('Nothing to decide');
      if (state.dilemma.choice !== null) return no('Already decided today');
      const choice = DILEMMA_BY_ID[state.dilemma.id].choices[action.choice];
      if (!choice) return no('No such choice');
      if (choice.requires && !requirementMet(state, choice.requires)) return no(choice.requires.label);
      return yes;
    }
    case 'diplomacy':
      return canDiplomacy(state, action.nation, action.act);
    case 'endTurn':
      return state.dilemma && state.dilemma.choice === null ? no('Answer today’s question first') : yes;
  }
}

/** The one way state changes. Returns the same object if the action isn't allowed. */
export function applyAction(state: GameState, action: Action): GameState {
  if (!check(state, action).ok) return state;
  const s: GameState = structuredClone(state);
  const id = s.playerId;
  const rng = new Rng(s.rng);
  switch (action.type) {
    case 'build':
      doBuild(s, id, hexAt(s, action.at), BUILDING_BY_ID[action.building]);
      break;
    case 'demolish':
      hexAt(s, action.at).buildings.splice(action.slot, 1);
      break;
    case 'recruit':
      doRecruit(s, id, hexAt(s, action.at), UNIT_BY_ID[action.unit]);
      break;
    case 'moveArmy': {
      const army = s.armies.find((a) => a.id === action.armyId)!;
      const moving = movingUnits(army, action.units);
      const option = reachable(s, id, army, moving, army.moved).get(key(action.to))!;
      executeMove(s, army, action.to, moving, option, rng);
      break;
    }
    case 'disband': {
      const army = s.armies.find((a) => a.id === action.armyId)!;
      army.units[action.unit as UnitId]--;
      if (armySize(army.units) === 0) s.armies = s.armies.filter((a) => a !== army);
      break;
    }
    case 'claimHex':
      doClaim(s, id, hexAt(s, action.at));
      break;
    case 'moveEnvoy':
      s.envoy.dest = { c: action.to.c, r: action.to.r };
      s.envoy.arrivesTurn = s.turn + envoyTravelTurns(s, action.to);
      break;
    case 'decide': {
      const dilemma = DILEMMA_BY_ID[s.dilemma!.id];
      const choice = dilemma.choices[action.choice];
      const effects = scaledEffects(s, choice.effects);
      applyEffects(s, effects);
      s.dilemma!.choice = action.choice;
      s.nations[id].decisions.push({ turn: s.turn, dilemmaId: dilemma.id, title: dilemma.title, choice: choice.title, effects });
      break;
    }
    case 'diplomacy':
      doDiplomacy(s, action.nation, action.act);
      break;
    case 'endTurn':
      endTurn(s, rng);
      break;
  }
  s.rng = rng.seed;
  return s;
}
