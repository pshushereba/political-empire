import { runAi } from './ai';
import { BUILDING_BY_ID } from './content/buildings';
import { DILEMMAS, DILEMMA_BY_ID } from './content/dilemmas';
import { ERAS, UNIT_BY_ID, UNIT_IDS } from './content/world';
import { baseline } from './diplomacy';
import { clamp, economy, eraFor, governmentOf, ownedHexes } from './economy';
import { coord, hexAt, neighbourHexes } from './hex';
import { armyAt, armySize, checkOutcome, transferHex } from './military';
import { enemiesOf, pairKey } from './relations';
import type { Rng } from './rng';
import type { GameState, LogEntry, NationId } from './types';

function log(state: GameState, entry: Omit<LogEntry, 'turn'>): void {
  state.log.push({ turn: state.turn, ...entry });
}

/** Income, growth, construction and unrest for one nation. */
function runNation(state: GameState, id: NationId, rng: Rng): void {
  const n = state.nations[id];
  const isPlayer = id === state.playerId;
  const eco = economy(state, id);

  n.stats.treasury += eco.net;
  n.stats.influence += eco.influence;
  n.stats.population = Math.max(50_000, Math.round(n.stats.population * (1 + eco.growthPct / 100)));

  // Stability drifts a fifth of the way toward its target each turn.
  const gap = eco.stabilityTarget - n.stats.stability;
  if (gap !== 0) n.stats.stability = clamp(n.stats.stability + Math.sign(gap) * Math.max(1, Math.round(Math.abs(gap) / 5)), 0, 100);

  // An empty treasury means unpaid soldiers.
  if (n.stats.treasury < 0) {
    n.stats.treasury = 0;
    n.stats.stability = clamp(n.stats.stability - 4, 0, 100);
    const armies = state.armies.filter((a) => a.owner === id);
    if (armies.length) {
      const army = rng.pick(armies);
      const unit = UNIT_IDS.filter((u) => army.units[u] > 0).sort((a, b) => UNIT_BY_ID[b].upkeep - UNIT_BY_ID[a].upkeep)[0];
      army.units[unit]--;
      if (armySize(army.units) === 0) state.armies = state.armies.filter((a) => a !== army);
      if (isPlayer) log(state, { kind: 'economy', important: true, at: army, text: `The treasury is empty. Unpaid ${UNIT_BY_ID[unit].plural} at ${coord(army)} deserted.` });
    } else if (isPlayer) {
      log(state, { kind: 'economy', important: true, text: 'The treasury is empty. Stability is falling.' });
    }
  }

  for (const h of ownedHexes(state, id)) {
    for (const b of h.buildings) {
      if (b.turnsLeft === 0) continue;
      b.turnsLeft--;
      if (b.turnsLeft === 0 && isPlayer) log(state, { kind: 'build', at: h, text: `${BUILDING_BY_ID[b.type].name} finished at ${coord(h)}.` });
    }
  }

  const era = eraFor(n, eco.hexes);
  if (era > n.era) {
    n.era = era;
    log(state, { kind: 'era', important: isPlayer, text: `${n.name} entered the ${ERAS[era].name}.${isPlayer ? ' ' + ERAS[era].note : ''}` });
  }

  // Unrest: an unstable nation loses land at its edges.
  if (n.stats.stability < governmentOf(n).unrestBelow && rng.float() < 0.5) {
    const edge = ownedHexes(state, id).filter((h) => h.capitalOf !== id && !armyAt(state, h) && neighbourHexes(state, h).some((x) => x.owner !== id && x.terrain !== 'sea'));
    if (edge.length) {
      const lost = rng.pick(edge);
      transferHex(lost, null);
      log(state, { kind: 'unrest', important: isPlayer, at: lost, text: `Unrest in ${n.name}: the hex at ${coord(lost)} broke away.` });
    }
  }

  if (isPlayer && eco.supply.net < 0) log(state, { kind: 'economy', text: `Supply is short by ${-eco.supply.net}. Growth and stability are suffering.` });
}

function driftRelations(state: GameState): void {
  for (let i = 0; i < state.order.length; i++) {
    for (let j = i + 1; j < state.order.length; j++) {
      const a = state.order[i];
      const b = state.order[j];
      if (!state.nations[a].alive || !state.nations[b].alive) continue;
      const rel = state.relations[pairKey(a, b)];
      if (rel.war) continue;
      const target = baseline(state, a, b);
      if (rel.value !== target) rel.value += Math.sign(target - rel.value);
    }
  }
}

function drawDilemma(state: GameState, rng: Rng): void {
  const atWar = enemiesOf(state, state.playerId).length > 0;
  const fits = (id: string): boolean => {
    const when = DILEMMA_BY_ID[id].when;
    return !when || (when === 'war') === atWar;
  };
  if (!state.deck.some(fits)) {
    // Every question has been asked: reshuffle, avoiding an immediate repeat.
    const last = state.dilemma?.id;
    state.deck = rng.shuffle(DILEMMAS.map((d) => d.id).filter((id) => id !== last));
  }
  const index = state.deck.findIndex(fits);
  const [id] = state.deck.splice(index === -1 ? 0 : index, 1);
  state.dilemma = { id, choice: null };
}

/** Close the player's turn: rivals act, every nation's books are settled, a new day begins. */
export function endTurn(state: GameState, rng: Rng): void {
  for (const id of state.order) {
    if (id !== state.playerId && state.status === 'playing') runAi(state, id, rng);
  }
  for (const id of state.order) {
    if (state.nations[id].alive) runNation(state, id, rng);
  }
  driftRelations(state);

  if (state.envoy.dest && state.turn + 1 >= state.envoy.arrivesTurn) {
    const dest = state.envoy.dest;
    const owner = hexAt(state, dest).owner;
    const blocked = owner !== null && owner !== state.playerId && state.relations[pairKey(state.playerId, owner)].war;
    state.envoy = blocked ? { ...state.nations[state.playerId].capital, dest: null, arrivesTurn: 0 } : { ...dest, dest: null, arrivesTurn: 0 };
    if (!blocked && owner && owner !== state.playerId) log(state, { kind: 'diplomacy', at: dest, text: `Your envoy arrived in ${state.nations[owner].name}.` });
  }

  checkOutcome(state);
  if (state.status !== 'playing') return;

  state.turn++;
  for (const a of state.armies) a.moved = 0;
  drawDilemma(state, rng);
  if (state.log.length > 300) state.log = state.log.slice(-300);
}
