import { AXIS_IDS, BALANCE } from './content/world';
import { clamp, landCount, militaryStrength, ownedHexes } from './economy';
import { hexAt } from './hex';
import { sharesBorder } from './military';
import { pairKey, relation } from './relations';
import type { Check, DiplomacyAct, GameState, NationId } from './types';

export interface DiplomacyActDef {
  id: DiplomacyAct;
  name: string;
  desc: string;
  cost: string;
  effect: string;
  /** Needs your envoy inside the nation's borders. */
  envoy: boolean;
}

export const DIPLOMACY_ACTS: DiplomacyActDef[] = [
  { id: 'trade', name: 'Propose a trade pact', desc: 'Open your markets to each other.', cost: '40 influence', effect: 'Relations +10; both treasuries earn more each turn', envoy: true },
  { id: 'embassy', name: 'Open an embassy', desc: 'A permanent mission in their capital.', cost: '200 treasury', effect: 'Reveals their treasury and army; relations improve over time; +1 influence per turn', envoy: true },
  { id: 'gift', name: 'Send a state gift', desc: 'Gold smooths most roads.', cost: '100 treasury', effect: 'Relations +12', envoy: true },
  { id: 'pact', name: 'Sign a non-aggression pact', desc: 'Neither side attacks for 12 turns.', cost: '30 influence', effect: 'No war for 12 turns; relations +5', envoy: true },
  { id: 'denounce', name: 'Denounce their government', desc: 'Say in public what you think of them.', cost: 'Free', effect: 'Relations −25; stability +3 at home', envoy: true },
  { id: 'war', name: 'Declare war', desc: 'Your armies may cross their border.', cost: 'Stability −4', effect: 'Ends all pacts. Breaking a non-aggression pact angers every nation.', envoy: false },
  { id: 'peace', name: 'Propose peace', desc: 'End the fighting where the lines now stand.', cost: 'Free', effect: 'Ends the war and starts a 6-turn truce, if they accept', envoy: false },
];

export const COSTS = { tradeInfluence: 40, embassyTreasury: 200, giftTreasury: 100, pactInfluence: 30, pactRelations: 20, pactTurns: 12, truceTurns: 6 };

/** Where relations settle with no pushing: like-minded nations get along. */
export function baseline(state: GameState, a: NationId, b: NationId): number {
  const A = state.nations[a];
  const B = state.nations[b];
  const diff = AXIS_IDS.reduce((s, x) => s + Math.abs(A.axes[x] - B.axes[x]), 0) / AXIS_IDS.length;
  const rel = relation(state, a, b);
  const calm = rel.tradePact || rel.napUntil >= state.turn;
  const friction = !calm && sharesBorder(state, a, b) ? BALANCE.borderFriction : 0;
  // Everyone fears a nation that is swallowing the map.
  const land = landCount(state) * BALANCE.threatShare;
  const fear = ownedHexes(state, a).length > land || ownedHexes(state, b).length > land ? 15 : 0;
  return Math.round(30 - diff * 1.4 + (rel.tradePact ? 15 : 0) + (rel.embassy ? 10 : 0) - friction - fear);
}

export function envoyIsIn(state: GameState, nation: NationId): boolean {
  return state.envoy.dest === null && hexAt(state, state.envoy).owner === nation;
}

export function wouldAcceptPeace(state: GameState, them: NationId): boolean {
  const rel = relation(state, state.playerId, them);
  const duration = state.turn - rel.warSince;
  if (duration < 3) return false;
  return duration >= 12 || militaryStrength(state, them) <= militaryStrength(state, state.playerId) * 1.3;
}

/** Can the player take this diplomatic action now? */
export function canDiplomacy(state: GameState, them: NationId, act: DiplomacyAct): Check {
  const me = state.nations[state.playerId];
  const other = state.nations[them];
  if (!other || them === state.playerId) return { ok: false, reason: 'Not a foreign nation' };
  if (!other.alive) return { ok: false, reason: `${other.short} has fallen` };
  const rel = relation(state, state.playerId, them);
  const def = DIPLOMACY_ACTS.find((d) => d.id === act)!;

  if (act === 'war') {
    if (rel.war) return { ok: false, reason: 'Already at war' };
    return { ok: true };
  }
  if (act === 'peace') {
    if (!rel.war) return { ok: false, reason: 'You are not at war' };
    if (rel.peaceRefusedTurn === state.turn) return { ok: false, reason: 'They refused this turn. Try again later.' };
    return { ok: true };
  }
  if (rel.war) return { ok: false, reason: 'You are at war' };
  if (def.envoy && !envoyIsIn(state, them)) return { ok: false, reason: `Your envoy must be in ${other.short}` };
  if (rel.lastActionTurn === state.turn) return { ok: false, reason: 'One envoy action per turn' };
  switch (act) {
    case 'trade':
      if (rel.tradePact) return { ok: false, reason: 'Pact already signed' };
      if (rel.value < 0) return { ok: false, reason: 'Needs relations of 0 or better' };
      if (me.stats.influence < COSTS.tradeInfluence) return { ok: false, reason: `Needs ${COSTS.tradeInfluence} influence` };
      break;
    case 'embassy':
      if (rel.embassy) return { ok: false, reason: 'Embassy already open' };
      if (me.stats.treasury < COSTS.embassyTreasury) return { ok: false, reason: `Needs ${COSTS.embassyTreasury} treasury` };
      break;
    case 'gift':
      if (me.stats.treasury < COSTS.giftTreasury) return { ok: false, reason: `Needs ${COSTS.giftTreasury} treasury` };
      break;
    case 'pact':
      if (rel.napUntil >= state.turn) return { ok: false, reason: `Pact holds until turn ${rel.napUntil}` };
      if (rel.value < COSTS.pactRelations) return { ok: false, reason: `Needs relations of ${COSTS.pactRelations} or better` };
      if (me.stats.influence < COSTS.pactInfluence) return { ok: false, reason: `Needs ${COSTS.pactInfluence} influence` };
      break;
    case 'denounce':
      break;
  }
  return { ok: true };
}

function log(state: GameState, entry: Omit<GameState['log'][number], 'turn'>): void {
  state.log.push({ turn: state.turn, ...entry });
}

export function shiftRelation(state: GameState, a: NationId, b: NationId, delta: number): void {
  const rel = state.relations[pairKey(a, b)];
  rel.value = clamp(rel.value + delta, -100, 100);
}

export function declareWar(state: GameState, aggressor: NationId, target: NationId): void {
  const rel = relation(state, aggressor, target);
  if (rel.war) return;
  const A = state.nations[aggressor];
  const T = state.nations[target];
  const brokePact = rel.napUntil >= state.turn;
  rel.war = true;
  rel.warSince = state.turn;
  rel.tradePact = false;
  rel.napUntil = 0;
  rel.value = Math.min(rel.value - 40, -60);
  A.stats.stability = clamp(A.stats.stability - (brokePact ? 10 : 4), 0, 100);
  for (const other of state.order) {
    if (other === aggressor || other === target || !state.nations[other].alive) continue;
    // Friends of the victim, and everyone if a pact was broken, think less of the aggressor.
    if (brokePact) shiftRelation(state, aggressor, other, -15);
    else if (relation(state, target, other).value > 30) shiftRelation(state, aggressor, other, -10);
  }
  // Envoys are sent home when war breaks out.
  const player = state.nations[state.playerId];
  const host = hexAt(state, state.envoy).owner;
  const other = aggressor === state.playerId ? target : target === state.playerId ? aggressor : null;
  if (other && (host === other || (state.envoy.dest && hexAt(state, state.envoy.dest).owner === other))) {
    state.envoy = { ...player.capital, dest: null, arrivesTurn: 0 };
  }
  log(state, { kind: 'war', important: true, at: T.capital,
    text: `${A.name} declared war on ${T.name}${brokePact ? ', breaking their non-aggression pact' : ''}.` });
}

export function makePeace(state: GameState, a: NationId, b: NationId): void {
  const rel = relation(state, a, b);
  if (!rel.war) return;
  rel.war = false;
  rel.value = Math.max(rel.value, -35);
  rel.napUntil = state.turn + COSTS.truceTurns;
  log(state, { kind: 'peace', important: true, text: `${state.nations[a].name} and ${state.nations[b].name} made peace.` });
}

/** Apply a player's diplomatic action. Callers check `canDiplomacy` first. */
export function doDiplomacy(state: GameState, them: NationId, act: DiplomacyAct): void {
  const me = state.nations[state.playerId];
  const other = state.nations[them];
  const rel = relation(state, state.playerId, them);
  switch (act) {
    case 'trade':
      me.stats.influence -= COSTS.tradeInfluence;
      rel.tradePact = true;
      shiftRelation(state, me.id, them, 10);
      log(state, { kind: 'diplomacy', text: `Trade pact signed with ${other.name}.` });
      break;
    case 'embassy':
      me.stats.treasury -= COSTS.embassyTreasury;
      rel.embassy = true;
      shiftRelation(state, me.id, them, 5);
      log(state, { kind: 'diplomacy', text: `Embassy opened in ${other.name}.` });
      break;
    case 'gift':
      me.stats.treasury -= COSTS.giftTreasury;
      shiftRelation(state, me.id, them, 12);
      log(state, { kind: 'diplomacy', text: `${other.name} accepted your gift.` });
      break;
    case 'pact':
      me.stats.influence -= COSTS.pactInfluence;
      rel.napUntil = state.turn + COSTS.pactTurns;
      shiftRelation(state, me.id, them, 5);
      log(state, { kind: 'diplomacy', text: `Non-aggression pact with ${other.name} until turn ${rel.napUntil}.` });
      break;
    case 'denounce':
      shiftRelation(state, me.id, them, -25);
      me.stats.stability = clamp(me.stats.stability + 3, 0, 100);
      log(state, { kind: 'diplomacy', text: `You denounced the government of ${other.name}.` });
      break;
    case 'war':
      declareWar(state, me.id, them);
      return;
    case 'peace':
      if (wouldAcceptPeace(state, them)) makePeace(state, me.id, them);
      else {
        rel.peaceRefusedTurn = state.turn;
        log(state, { kind: 'diplomacy', text: `${other.name} refused your offer of peace.` });
      }
      return;
  }
  rel.lastActionTurn = state.turn;
}
