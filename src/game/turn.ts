import { runAi } from './ai';
import { BUILDING_BY_ID } from './content/buildings';
import { DILEMMAS, DILEMMA_BY_ID } from './content/dilemmas';
import { BALANCE, ERAS, UNIT_BY_ID, UNIT_IDS } from './content/world';
import { baseline } from './diplomacy';
import { clamp, economy, eraFor, governmentOf, ownedHexes } from './economy';
import { coord, hexAt, neighbourHexes } from './hex';
import { armyAt, armySize, checkOutcome, transferHex } from './military';
import { activeHumans, enemiesOf, pairKey } from './relations';
import type { Rng } from './rng';
import type { GameState, LogEntry, NationId } from './types';

function log(state: GameState, entry: Omit<LogEntry, 'turn'>): void {
  state.log.push({ turn: state.turn, ...entry });
}

/** Income, growth, construction and unrest for one nation. */
function runNation(state: GameState, id: NationId, rng: Rng): void {
  const n = state.nations[id];
  const human = n.seat !== null;
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
      if (human) log(state, { kind: 'economy', to: id, important: true, at: army, text: `The treasury is empty. Unpaid ${UNIT_BY_ID[unit].plural} at ${coord(army)} deserted.` });
    } else if (human) {
      log(state, { kind: 'economy', to: id, important: true, text: 'The treasury is empty. Stability is falling.' });
    }
  }

  for (const h of ownedHexes(state, id)) {
    for (const b of h.buildings) {
      if (b.turnsLeft === 0) continue;
      b.turnsLeft--;
      if (b.turnsLeft === 0 && human) log(state, { kind: 'build', to: id, at: h, text: `${BUILDING_BY_ID[b.type].name} finished at ${coord(h)}.` });
    }
  }

  const era = eraFor(n, eco.hexes);
  if (era > n.era) {
    n.era = era;
    log(state, { kind: 'era', important: true, about: [id], text: `${n.name} entered the ${ERAS[era].name}. ${ERAS[era].note}` });
  }

  // Unrest: an unstable nation loses land at its edges.
  if (n.stats.stability < governmentOf(n).unrestBelow && rng.float() < 0.5) {
    const edge = ownedHexes(state, id).filter((h) => h.capitalOf !== id && !armyAt(state, h) && neighbourHexes(state, h).some((x) => x.owner !== id && x.terrain !== 'sea'));
    if (edge.length) {
      const lost = rng.pick(edge);
      transferHex(lost, null);
      log(state, { kind: 'unrest', important: true, about: [id], at: lost, text: `Unrest in ${n.name}: the hex at ${coord(lost)} broke away.` });
    }
  }

  if (human && eco.supply.net < 0) log(state, { kind: 'economy', to: id, text: `Supply is short by ${-eco.supply.net}. Growth and stability are suffering.` });
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

/** Each human-run nation gets its own question from its own deck. */
function drawDilemma(state: GameState, id: NationId, rng: Rng): void {
  const seat = state.nations[id].seat!;
  const atWar = enemiesOf(state, id).length > 0;
  const fits = (d: string): boolean => {
    const when = DILEMMA_BY_ID[d].when;
    return !when || (when === 'war') === atWar;
  };
  if (!seat.deck.some(fits)) {
    // Every question has been asked: reshuffle, avoiding an immediate repeat.
    const last = seat.dilemma?.id;
    seat.deck = rng.shuffle(DILEMMAS.map((d) => d.id).filter((d) => d !== last));
  }
  const index = seat.deck.findIndex(fits);
  const [next] = seat.deck.splice(index === -1 ? 0 : index, 1);
  seat.dilemma = { id: next, choice: null, openedAt: null };
}

function moveEnvoy(state: GameState, id: NationId): void {
  const seat = state.nations[id].seat!;
  const dest = seat.envoy.dest;
  if (!dest || state.turn + 1 < seat.envoy.arrivesTurn) return;
  const owner = hexAt(state, dest).owner;
  const blocked = owner !== null && owner !== id && state.relations[pairKey(id, owner)].war;
  seat.envoy = blocked ? { ...state.nations[id].capital, dest: null, arrivesTurn: 0 } : { ...dest, dest: null, arrivesTurn: 0 };
  if (!blocked && owner && owner !== id) log(state, { kind: 'diplomacy', to: id, at: dest, text: `Your envoy arrived in ${state.nations[owner].name}.` });
}

/** True once every person still in the game has ended their turn. */
export function allReady(state: GameState): boolean {
  return activeHumans(state).every((id) => state.nations[id].seat!.ready);
}

/**
 * Close the world's turn: computer-run nations act, every nation's books are
 * settled, and a new day begins for everyone. Runs when all players are ready.
 */
export function resolveTurn(state: GameState, rng: Rng, now: number): void {
  for (const id of state.order) {
    if (!state.nations[id].seat && state.status === 'playing') runAi(state, id, rng);
  }
  for (const id of state.order) {
    if (state.nations[id].alive) runNation(state, id, rng);
  }
  driftRelations(state);
  for (const id of activeHumans(state)) moveEnvoy(state, id);
  // Offers left unanswered for a full turn lapse.
  state.proposals = state.proposals.filter((p) => state.turn - p.turn < BALANCE.proposalTurns);

  checkOutcome(state);
  if (state.status !== 'playing') return;

  state.turn++;
  for (const a of state.armies) a.moved = 0;
  for (const id of activeHumans(state)) {
    state.nations[id].seat!.ready = false;
    state.nations[id].seat!.turnStartedAt = now;
    drawDilemma(state, id, rng);
  }
  if (state.log.length > 400) state.log = state.log.slice(-400);
}
