import { DILEMMAS, FIRST_DILEMMA } from './content/dilemmas';
import { governmentFor } from './content/governments';
import { ACTIVE_OBJECTIVES, OBJECTIVES } from './content/objectives';
import { BALANCE, DEFAULT_NAMES, FOUNDING_VALUES, NATION_COLORS, RIVAL_POOL, START_RADIUS } from './content/world';
import { baseline } from './diplomacy';
import { distance, neighbours } from './hex';
import { GOODS } from './content/market';
import { newMarket } from './market';
import { noUnits } from './military';
import { newRelation, pairKey } from './relations';
import { Rng } from './rng';
import type { AxisId, FoundingChoices, GameSetup, GameState, Hex, HexRef, Nation } from './types';
import { MAX_NATIONS, MIN_NATIONS, generateWorld } from './worldgen';

export const SAVE_VERSION = 8;

function baseNation(partial: Pick<Nation, 'id' | 'name' | 'short' | 'motto' | 'description' | 'color' | 'flag' | 'capital' | 'startingLand' | 'axes' | 'personality'>): Nation {
  return {
    ...partial,
    foundedTurn: 1,
    alive: true,
    era: 0,
    stats: { population: BALANCE.startPopulation, treasury: BALANCE.startTreasury, stability: BALANCE.startStability, influence: BALANCE.startInfluence },
    axesAtFounding: { ...partial.axes },
    factions: { merchants: 55, settlers: 55, clergy: 50, dockworkers: 45 },
    decisions: [],
    government: governmentFor(partial.axes),
    powerReady: {},
    tally: { battlesWon: 0, capitalsTaken: 0, powersUsed: 0 },
    policies: { tax: 0, education: 0, health: 0, welfare: 0 },
    lastRevolt: -99,
    exports: Object.fromEntries(GOODS.map((g) => [g.id, g.exportedByDefault])) as Nation['exports'],
    seat: null,
  };
}

export const MAX_PLAYERS = MAX_NATIONS;

/**
 * Build the starting world. Each player's founding answers shape one nation;
 * the computer runs the rest. The map is generated for the number of nations.
 */
export function createGame(setup: GameSetup): GameState {
  const players = setup.players.slice(0, MAX_PLAYERS);
  if (!players.length) throw new Error('A game needs at least one player');
  const seed = (setup.seed ?? 1) | 0;
  const count = Math.max(MIN_NATIONS, players.length, Math.min(MAX_NATIONS, Math.floor(setup.nations ?? MIN_NATIONS)));
  const rng = new Rng(seed);
  const world = generateWorld(seed, count);
  const { cols, rows, hexes } = world;
  const at = (h: HexRef): Hex => hexes[h.r * cols + h.c];
  // Who gets which capital is drawn by lot, so no seat is reliably the good one.
  const capitals = rng.shuffle(world.capitals);

  const nations: Record<string, Nation> = {};
  const order: string[] = [];
  const humans: string[] = [];
  const stance: Record<string, number> = {};

  players.forEach((choices, i) => {
    const id = `p${i + 1}`;
    const axes = Object.fromEntries(
      (Object.keys(choices.answers) as AxisId[]).map((a) => [a, FOUNDING_VALUES[choices.answers[a]] ?? 50]),
    ) as Record<AxisId, number>;
    const name = choices.name.trim() || DEFAULT_NAMES[i];
    const words = name.split(/\s+/);
    const n = baseNation({
      id, name, short: words[words.length - 1], motto: choices.motto.trim() || 'By our own hands',
      description: 'A nation run by a player.', color: NATION_COLORS[i].hex, flag: choices.flag, capital: capitals[i],
      startingLand: choices.startingLand, axes, personality: { aggression: 0, expansion: 0 },
    });
    n.seat = {
      envoy: { ...capitals[i], dest: null, arrivesTurn: 0 },
      dilemma: { id: FIRST_DILEMMA, choice: null, openedAt: null },
      turnStartedAt: setup.now ?? 0,
      deck: rng.shuffle(DILEMMAS.map((d) => d.id).filter((d) => d !== FIRST_DILEMMA)),
      objectives: { active: OBJECTIVES.slice(0, ACTIVE_OBJECTIVES).map((o) => o.id), done: [] },
      checkIn: { day: setup.day ?? '', streak: 1 },
      ready: false,
    };
    nations[id] = n;
    order.push(id);
    humans.push(id);
  });

  RIVAL_POOL.slice(0, count - players.length).forEach((r, k) => {
    const i = players.length + k;
    const color = NATION_COLORS[i].hex;
    const n = baseNation({
      id: r.id, name: r.name, short: r.short, motto: r.motto, description: r.description, color,
      flag: { pattern: r.flag, a: color, b: r.flag === 'canton' ? '#ECE9E2' : '#0E1217' },
      capital: capitals[i], startingLand: 'river', axes: { ...r.axes }, personality: r.personality,
    });
    n.factions = { merchants: 50, settlers: 50, clergy: 50, dockworkers: 50 };
    n.stats.treasury = 300;
    nations[r.id] = n;
    order.push(r.id);
    stance[r.id] = r.stance;
  });

  // Each nation claims every land hex within its radius; ties go to the nearer capital.
  for (const h of hexes) {
    if (h.terrain === 'sea') continue;
    let best: { id: string; d: number } | null = null;
    for (const id of order) {
      const d = distance(h, nations[id].capital);
      if (d <= START_RADIUS && (!best || d < best.d)) best = { id, d };
    }
    if (best) {
      h.owner = best.id;
      if (best.d === 0) { h.capitalOf = best.id; h.terrain = 'plains'; }
    }
  }

  // Starting land shapes the ring around each player's capital.
  for (const id of humans) {
    const n = nations[id];
    const ring = neighbours(n.capital, cols, rows).map(at);
    if (n.startingLand === 'river') [0, 2, 4].forEach((i) => { ring[i].terrain = 'river'; });
    if (n.startingLand === 'highlands') [1, 3, 5].forEach((i) => { ring[i].terrain = i === 3 ? 'hills' : 'highlands'; });
  }

  const bare: Omit<GameState, 'market'> = {
    version: SAVE_VERSION, id: setup.id ?? `local-${seed >>> 0}`, turn: 1, rng: 0, humans,
    settings: { questionSeconds: 0, turnSeconds: 0, clock: 'together', ...setup.settings }, cols, rows, hexes, nations, order,
    armies: [], nextArmyId: 1, relations: {}, proposals: [],
    log: [], status: 'playing', winner: null, outcome: '',
  };
  const state: GameState = { ...bare, market: newMarket(bare) };

  for (const id of order) {
    const n = nations[id];
    at(n.capital).buildings.push({ type: 'shop', turnsLeft: 0 });
    const infantry = BALANCE.startInfantry + Math.round(n.personality.aggression * 2);
    state.armies.push({ id: state.nextArmyId++, owner: id, ...n.capital, units: { ...noUnits(), infantry }, moved: 0 });
  }

  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      const a = order[i];
      const b = order[j];
      const k = pairKey(a, b);
      state.relations[k] = newRelation(0);
      // Computer nations begin with a set opinion of players; between themselves, ideology decides. Players start neutral with each other.
      const human = [a, b].filter((x) => nations[x].seat).length;
      state.relations[k].value = human === 2 ? 0 : human === 1 ? stance[nations[a].seat ? b : a] : baseline(state, a, b);
    }
  }

  state.rng = rng.seed;
  return state;
}

export const DEFAULT_FOUNDING: FoundingChoices = {
  name: '', motto: '',
  answers: { liberty: 1, market: 1, reform: 1, openness: 1 },
  startingLand: 'coast',
  flag: { pattern: 'tricolour', a: '#E8A33D', b: '#1F3A5F' },
};
