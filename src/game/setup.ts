import { DILEMMAS, FIRST_DILEMMA } from './content/dilemmas';
import { governmentFor } from './content/governments';
import { ACTIVE_OBJECTIVES, OBJECTIVES } from './content/objectives';
import { BALANCE, COLS, FOUNDING_VALUES, PLAYER_START, RIVALS, ROWS, START_RADIUS, isSea } from './content/world';
import { baseline } from './diplomacy';
import { distance, neighbours } from './hex';
import { noUnits } from './military';
import { newRelation, pairKey } from './relations';
import { Rng } from './rng';
import type { AxisId, FoundingChoices, GameState, Hex, Nation, Terrain } from './types';

export const SAVE_VERSION = 3;

const LAND: Terrain[] = ['plains', 'forest', 'hills', 'highlands', 'farmland'];
const hash = (c: number, r: number): number => ((c * 73856093) ^ (r * 19349663)) >>> 0;

/** The fixed world sea, plus a small inlet south of the player's capital. */
function sea(c: number, r: number): boolean {
  return isSea(c, r) || (r === 8 && (c === 4 || c === 5));
}

function makeHexes(): Hex[] {
  const hexes: Hex[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let terrain: Terrain = 'sea';
      if (!sea(c, r)) {
        const h = hash(c, r);
        terrain = LAND[h % 5];
        if ((h >>> 3) % 6 === 0) terrain = 'river';
        if (neighbours({ c, r }, COLS, ROWS).some((n) => sea(n.c, n.r))) terrain = 'coast';
      }
      hexes.push({ c, r, terrain, owner: null, buildings: [] });
    }
  }
  return hexes;
}

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
  };
}

/** Build the starting world from the founding screen's answers. */
export function createGame(choices: FoundingChoices): GameState {
  const rng = new Rng((choices.seed ?? Date.now()) | 0);
  const hexes = makeHexes();
  const at = (c: number, r: number): Hex => hexes[r * COLS + c];

  const axes = Object.fromEntries(
    (Object.keys(choices.answers) as AxisId[]).map((a) => [a, FOUNDING_VALUES[choices.answers[a]] ?? 50]),
  ) as Record<AxisId, number>;
  const name = choices.name.trim() || 'Republic of Veyra';
  const words = name.split(/\s+/);

  const player = baseNation({
    id: PLAYER_START.id, name, short: words[words.length - 1], motto: choices.motto.trim() || 'By our own hands',
    description: 'Your nation.', color: PLAYER_START.color, flag: choices.flag, capital: PLAYER_START.capital,
    startingLand: choices.startingLand, axes, personality: { aggression: 0, expansion: 0 },
  });
  const nations: Record<string, Nation> = { [player.id]: player };
  const order = [player.id];
  for (const r of RIVALS) {
    nations[r.id] = baseNation({
      id: r.id, name: r.name, short: r.short, motto: r.motto, description: r.description, color: r.color, flag: r.flag,
      capital: r.capital, startingLand: 'river', axes: { ...r.axes }, personality: r.personality,
    });
    nations[r.id].factions = { merchants: 50, settlers: 50, clergy: 50, dockworkers: 50 };
    nations[r.id].stats.treasury = 300;
    order.push(r.id);
  }

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

  // Starting land shapes the ring around the player's capital.
  const ring = neighbours(player.capital, COLS, ROWS).map((n) => at(n.c, n.r));
  if (choices.startingLand === 'river') [0, 2, 4].forEach((i) => { ring[i].terrain = 'river'; });
  if (choices.startingLand === 'highlands') [1, 3, 5].forEach((i) => { ring[i].terrain = i === 3 ? 'hills' : 'highlands'; });

  const state: GameState = {
    version: SAVE_VERSION, id: choices.id ?? `local-${(choices.seed ?? 0) >>> 0}`, turn: 1, rng: 0, playerId: player.id, cols: COLS, rows: ROWS, hexes, nations, order,
    armies: [], nextArmyId: 1, relations: {},
    envoy: { ...player.capital, dest: null, arrivesTurn: 0 },
    dilemma: { id: FIRST_DILEMMA, choice: null },
    deck: rng.shuffle(DILEMMAS.map((d) => d.id).filter((id) => id !== FIRST_DILEMMA)),
    objectives: { active: OBJECTIVES.slice(0, ACTIVE_OBJECTIVES).map((o) => o.id), done: [] },
    checkIn: { day: choices.day ?? '', streak: 1 },
    log: [], status: 'playing', outcome: '',
  };

  for (const id of order) {
    const n = nations[id];
    at(n.capital.c, n.capital.r).buildings.push({ type: 'shop', turnsLeft: 0 });
    const infantry = BALANCE.startInfantry + Math.round(n.personality.aggression * 2);
    state.armies.push({ id: state.nextArmyId++, owner: id, ...n.capital, units: { ...noUnits(), infantry }, moved: 0 });
  }

  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      const a = order[i];
      const b = order[j];
      const k = pairKey(a, b);
      state.relations[k] = newRelation(0);
      const rival = RIVALS.find((r) => r.id === b);
      state.relations[k].value = a === player.id && rival ? rival.stance : baseline(state, a, b);
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
