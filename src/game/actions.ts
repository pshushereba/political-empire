import { BUILDING_BY_ID, LOTS_PER_HEX, type BuildingDef } from './content/buildings';
import { DILEMMA_BY_ID } from './content/dilemmas';
import { GOVERNMENT_BY_ID, governmentFor, type PowerDef } from './content/governments';
import { advanceObjectives, completedObjectives } from './objectives';
import { AXIS_IDS, BALANCE, FACTION_IDS, MAX_STACK, UNIT_BY_ID, UNIT_IDS, type UnitDef } from './content/world';
import { canDiplomacy, canRespond, doDiplomacy, doRespond, shiftRelation } from './diplomacy';
import { clamp, governmentOf, hasFinished, modifiers, ownedHexes } from './economy';
import { distance, hexAt, key, neighbourHexes, same } from './hex';
import { armyAt, armySize, checkOutcome, executeMove, noUnits, reachable } from './military';
import { activeHumans, atWar } from './relations';
import { Rng } from './rng';
import { allReady, resolveTurn } from './turn';
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
  if (def.governments && !def.governments.includes(governmentOf(state.nations[id]).id)) return no(`Only for a ${def.governments.map((g) => GOVERNMENT_BY_ID[g].name.toLowerCase()).join(' or ')}`);
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

export function envoyTravelTurns(state: GameState, id: NationId, to: HexRef): number {
  const envoy = state.nations[id].seat?.envoy;
  return envoy ? Math.ceil(distance(envoy, to) / 2) : 0;
}

export function canMoveEnvoy(state: GameState, id: NationId, to: HexRef): Check {
  const envoy = state.nations[id].seat?.envoy;
  if (!envoy) return no('No envoy');
  const hex = hexAt(state, to);
  if (hex.terrain === 'sea') return no('Envoys cannot cross open sea');
  if (envoy.dest) return no(`Your envoy is travelling (arrives turn ${envoy.arrivesTurn})`);
  if (same(envoy, to)) return no('Your envoy is here');
  if (hex.owner && atWar(state, id, hex.owner)) return no('You are at war with them');
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

export function requirementMet(state: GameState, id: NationId, req: NonNullable<import('./types').DilemmaChoice['requires']>): boolean {
  const n = state.nations[id];
  const value = (AXIS_IDS as string[]).includes(req.target) ? n.axes[req.target as AxisId] : n.stats[req.target as keyof typeof n.stats];
  return (req.min === undefined || value >= req.min) && (req.max === undefined || value <= req.max);
}

/** Treasury swings grow with the nation so they stay meaningful. */
export function scaledEffects(state: GameState, effects: Effect[], id: NationId): Effect[] {
  const era = state.nations[id].era;
  return effects.map((e) => (e.target === 'treasury' ? { ...e, delta: Math.round(e.delta * (1 + 0.5 * era)) } : e));
}

export function applyEffects(state: GameState, effects: Effect[], id: NationId): void {
  const n = state.nations[id];
  for (const e of effects) {
    if (e.target === 'relations') {
      for (const other of state.order) if (other !== n.id && state.nations[other].alive) shiftRelation(state, n.id, other, e.delta);
    } else if ((AXIS_IDS as string[]).includes(e.target)) {
      const a = e.target as AxisId;
      n.axes[a] = clamp(n.axes[a] + e.delta, 0, 100);
    } else if ((FACTION_IDS as string[]).includes(e.target)) {
      const f = e.target as FactionId;
      n.factions[f] = clamp(n.factions[f] + e.delta, 0, 100);
    } else if (e.target === 'tax') {
      n.tax = clamp(n.tax + e.delta, -2, 2);
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

// ---- Government and its powers ---------------------------------------------

/** The government a set of effects would leave the player with. */
export function governmentAfter(state: GameState, id: NationId, effects: Effect[]): string {
  const axes = { ...state.nations[id].axes };
  for (const e of effects) if ((AXIS_IDS as string[]).includes(e.target)) axes[e.target as AxisId] = clamp(axes[e.target as AxisId] + e.delta, 0, 100);
  return governmentFor(axes);
}

/** Ideology moved: see whether the form of government moved with it. */
export function refreshGovernment(state: GameState, id: NationId): void {
  const n = state.nations[id];
  const next = governmentFor(n.axes);
  if (next === n.government) return;
  const before = GOVERNMENT_BY_ID[n.government as keyof typeof GOVERNMENT_BY_ID].name;
  n.government = next;
  n.stats.stability = clamp(n.stats.stability - BALANCE.upheaval, 0, 100);
  state.log.push({ turn: state.turn, kind: 'government', important: true, about: [id],
    text: `${n.name} is no longer a ${before.toLowerCase()}. It is now a ${GOVERNMENT_BY_ID[next].name.toLowerCase()}: new powers, new limits. The upheaval cost ${BALANCE.upheaval} stability.` });
}

export function canUsePower(state: GameState, id: NationId, powerId: string): Check {
  const n = state.nations[id];
  const power = governmentOf(n).powers.find((p) => p.id === powerId);
  if (!power) return no('Your form of government cannot do this');
  const ready = n.powerReady[powerId] ?? 0;
  if (ready > state.turn) return no(`Ready again on turn ${ready}`);
  if ((power.cost?.treasury ?? 0) > n.stats.treasury) return no(`Needs ${power.cost!.treasury} treasury`);
  if ((power.cost?.influence ?? 0) > n.stats.influence) return no(`Needs ${power.cost!.influence} influence`);
  if (power.special?.kind === 'units') {
    const army = armyAt(state, n.capital);
    if (army && armySize(army.units) + power.special.count > MAX_STACK) return no('No room at the capital');
  }
  if (power.special?.kind === 'rush' && !ownedHexes(state, id).some((h) => h.buildings.some((b) => b.turnsLeft > 0))) return no('Nothing is under construction');
  return yes;
}

export function doPower(state: GameState, id: NationId, power: PowerDef): void {
  const n = state.nations[id];
  n.stats.treasury -= power.cost?.treasury ?? 0;
  n.stats.influence -= power.cost?.influence ?? 0;
  applyEffects(state, scaledEffects(state, power.effects, id), id);
  if (power.special?.kind === 'units') {
    let army = armyAt(state, n.capital);
    if (!army) {
      army = { id: state.nextArmyId++, owner: id, ...n.capital, units: noUnits(), moved: 0 };
      state.armies.push(army);
    }
    army.units[power.special.unit] += power.special.count;
    army.moved = 99;
  }
  if (power.special?.kind === 'rush') {
    for (const h of ownedHexes(state, id)) for (const b of h.buildings) b.turnsLeft = Math.max(0, b.turnsLeft - power.special.turns);
  }
  n.powerReady[power.id] = state.turn + power.cooldown;
  n.tally.powersUsed++;
  if (n.seat) state.log.push({ turn: state.turn, kind: 'government', to: id, text: `You used a power of the state: ${power.name}.` });
  refreshGovernment(state, id);
}

// ---- Coming back -----------------------------------------------------------

const dayNumber = (day: string): number => {
  const [y, m, d] = day.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};

/** What a player gets for returning on a new calendar day. Grows over a five-day run. */
export function checkInBonus(state: GameState, id: NationId, streak: number): Effect[] {
  const tier = Math.min(streak, BALANCE.streakCap);
  return scaledEffects(state, [{ target: 'treasury', delta: BALANCE.streakTreasury * tier }, { target: 'influence', delta: BALANCE.streakInfluence * tier }], id);
}

function payObjectives(state: GameState): void {
  for (const id of activeHumans(state)) {
    // Paying a reward can complete another objective, so repeat until nothing changes.
    for (let guard = 0; guard < 10; guard++) {
      const done = completedObjectives(state, id);
      if (!done.length) break;
      for (const d of done) {
        applyEffects(state, d.reward, id);
        state.log.push({ turn: state.turn, kind: 'objective', to: id, important: true, text: `Objective complete: ${d.title}.` });
      }
      advanceObjectives(state, id, done);
    }
  }
}

// ---- Clocks ----------------------------------------------------------------
// The rules never read the time. Whoever calls them (the browser, or a server)
// passes `now`, so the same code enforces a deadline wherever it runs.

/** When a nation's opened, unanswered question runs out (ms), or null if it isn't on a clock. */
export function questionDeadline(state: GameState, id: NationId): number | null {
  const d = state.nations[id].seat?.dilemma;
  if (!d || d.choice !== null || d.openedAt === null || state.settings.questionSeconds <= 0) return null;
  return d.openedAt + state.settings.questionSeconds * 1000;
}

/** When a nation's turn is ended for it (ms), or null if turns aren't timed or it has already ended its turn. */
export function turnDeadline(state: GameState, id: NationId): number | null {
  const seat = state.nations[id].seat;
  if (!seat || seat.ready || !seat.turnStartedAt || state.settings.turnSeconds <= 0) return null;
  return seat.turnStartedAt + state.settings.turnSeconds * 1000;
}

/** A timed question that hasn't been unsealed yet. */
export function questionSealed(state: GameState, id: NationId): boolean {
  const d = state.nations[id].seat?.dilemma;
  return !!d && d.choice === null && d.openedAt === null && state.settings.questionSeconds > 0;
}

function decide(state: GameState, id: NationId, index: number): void {
  const seat = state.nations[id].seat!;
  const dilemma = DILEMMA_BY_ID[seat.dilemma!.id];
  const choice = dilemma.choices[index];
  const effects = scaledEffects(state, choice.effects, id);
  applyEffects(state, effects, id);
  seat.dilemma!.choice = index;
  state.nations[id].decisions.push({ turn: state.turn, dilemmaId: dilemma.id, title: dilemma.title, choice: choice.title, effects });
  refreshGovernment(state, id);
}

/** Time ran out: the council picks for the player, and the nation pays for the dithering. */
function decideByDefault(state: GameState, id: NationId, rng: Rng): void {
  const seat = state.nations[id].seat!;
  const dilemma = DILEMMA_BY_ID[seat.dilemma!.id];
  const open = dilemma.choices.map((c, i) => ({ c, i })).filter(({ c }) => !c.requires || requirementMet(state, id, c.requires));
  const pick = open[rng.int(open.length)];
  decide(state, id, pick.i);
  const n = state.nations[id];
  n.stats.stability = clamp(n.stats.stability - BALANCE.indecision, 0, 100);
  state.log.push({ turn: state.turn, kind: 'info', to: id, important: true,
    text: `Time ran out on “${dilemma.title}”. The council decided without you: ${pick.c.title}. The dithering cost ${BALANCE.indecision} stability.` });
}

// ---- Reducer ---------------------------------------------------------------

/** Why the nation `id` can't do this right now, or ok. `id` must be run by a person. */
export function check(state: GameState, action: Action, id: NationId, now = 0): Check {
  if (state.status !== 'playing') return no('The game is over');
  const seat = state.nations[id]?.seat;
  if (!seat) return no('Not a player’s nation');
  if (!state.nations[id].alive) return no('Your nation has fallen');
  if (seat.ready) return no('You have ended your turn. Waiting for the other players');
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
      return canMoveEnvoy(state, id, action.to);
    case 'decide': {
      if (!seat.dilemma) return no('Nothing to decide');
      if (seat.dilemma.choice !== null) return no('Already decided today');
      if (questionSealed(state, id)) return no('Open the question first');
      const choice = DILEMMA_BY_ID[seat.dilemma.id].choices[action.choice];
      if (!choice) return no('No such choice');
      if (choice.requires && !requirementMet(state, id, choice.requires)) return no(choice.requires.label);
      return yes;
    }
    case 'diplomacy':
      return canDiplomacy(state, id, action.nation, action.act);
    case 'respond':
      return canRespond(state, id, action.proposal, action.accept);
    case 'power':
      return canUsePower(state, id, action.power);
    case 'setExport':
      return action.good in state.nations[id].exports ? yes : no('No such good');
    case 'checkIn':
      return /^\d{4}-\d{2}-\d{2}$/.test(action.day) && (!seat.checkIn.day || dayNumber(action.day) > dayNumber(seat.checkIn.day)) ? yes : no('Already checked in today');
    case 'openQuestion':
      return seat.dilemma && seat.dilemma.choice === null && seat.dilemma.openedAt === null ? yes : no('Nothing to open');
    case 'startClock':
      return state.settings.clock === 'inTurn' ? yes : no('Clocks start together in this game');
    case 'expire': {
      const q = questionDeadline(state, id);
      const t = turnDeadline(state, id);
      return (q !== null && now >= q) || (t !== null && now >= t) ? yes : no('Nothing has run out');
    }
    case 'endTurn':
      return seat.dilemma && seat.dilemma.choice === null ? no('Answer today’s question first') : yes;
  }
}

/**
 * The one way state changes: nation `id` takes an action. Returns the same
 * object if the action isn't allowed. The same function serves a solo game in
 * the browser and a shared game on a server, where `id` comes from the session.
 */
export function applyAction(state: GameState, action: Action, id: NationId, now = 0): GameState {
  if (!check(state, action, id, now).ok) return state;
  const s: GameState = structuredClone(state);
  const seat = s.nations[id].seat!;
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
      seat.envoy.arrivesTurn = s.turn + envoyTravelTurns(s, id, action.to);
      seat.envoy.dest = { c: action.to.c, r: action.to.r };
      break;
    case 'decide':
      decide(s, id, action.choice);
      break;
    case 'openQuestion':
      seat.dilemma!.openedAt = now;
      break;
    case 'startClock':
      seat.turnStartedAt = now;
      break;
    case 'expire': {
      const t = turnDeadline(s, id);
      const turnOver = t !== null && now >= t;
      if (seat.dilemma && seat.dilemma.choice === null) decideByDefault(s, id, rng);
      if (turnOver) {
        seat.ready = true;
        s.log.push({ turn: s.turn, kind: 'info', to: id, text: 'Your time for the turn ran out.' });
        if (allReady(s)) resolveTurn(s, rng, now);
      }
      break;
    }
    case 'diplomacy':
      doDiplomacy(s, id, action.nation, action.act);
      break;
    case 'respond':
      doRespond(s, id, action.proposal, action.accept);
      break;
    case 'setExport':
      s.nations[id].exports[action.good] = action.on;
      break;
    case 'power':
      doPower(s, id, governmentOf(s.nations[id]).powers.find((p) => p.id === action.power)!);
      break;
    case 'checkIn': {
      const first = !seat.checkIn.day;
      const streak = !first && dayNumber(action.day) - dayNumber(seat.checkIn.day) === 1 ? seat.checkIn.streak + 1 : 1;
      seat.checkIn = { day: action.day, streak };
      if (!first) {
        applyEffects(s, checkInBonus(s, id, streak), id);
        s.log.push({ turn: s.turn, kind: 'info', to: id, text: `Welcome back: day ${streak} of your run.` });
      }
      break;
    }
    case 'endTurn':
      // The world moves on only when everyone still playing is ready.
      seat.ready = true;
      if (allReady(s)) resolveTurn(s, rng, now);
      break;
  }
  if (s.status === 'playing') payObjectives(s);
  s.rng = rng.seed;
  return s;
}
