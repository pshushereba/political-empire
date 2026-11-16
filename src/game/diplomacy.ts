import { AXIS_IDS, BALANCE } from './content/world';
import { clamp, governmentOf, landCount, militaryStrength, ownedHexes } from './economy';
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
  { id: 'war', name: 'Declare war', desc: 'Your armies may cross their border.', cost: 'Stability', effect: 'How much stability it costs depends on your form of government. Ends all pacts. Breaking a non-aggression pact angers every nation.', envoy: false },
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
  return Math.round(30 - diff * 1.4 + (rel.tradePact ? 15 : 0) + (rel.embassy.length ? 10 : 0) - friction - fear);
}

export function envoyIsIn(state: GameState, me: NationId, nation: NationId): boolean {
  const envoy = state.nations[me].seat?.envoy;
  return !!envoy && envoy.dest === null && hexAt(state, envoy).owner === nation;
}

/** Would a computer-run nation accept peace from `me`? */
export function wouldAcceptPeace(state: GameState, me: NationId, them: NationId): boolean {
  const rel = relation(state, me, them);
  const duration = state.turn - rel.warSince;
  if (duration < 3) return false;
  return duration >= 12 || militaryStrength(state, them) <= militaryStrength(state, me) * 1.3;
}

/** Deals that need the other side's agreement. A computer answers at once; a person gets a proposal. */
const BILATERAL: DiplomacyAct[] = ['trade', 'pact', 'peace'];
export const proposalId = (from: NationId, to: NationId, act: string): string => `${from}>${to}:${act}`;

/** Can `meId` take this diplomatic action toward `them` now? */
export function canDiplomacy(state: GameState, meId: NationId, them: NationId, act: DiplomacyAct): Check {
  const me = state.nations[meId];
  const other = state.nations[them];
  if (!other || them === meId) return { ok: false, reason: 'Not a foreign nation' };
  if (!other.alive) return { ok: false, reason: `${other.short} has fallen` };
  const rel = relation(state, meId, them);
  const def = DIPLOMACY_ACTS.find((d) => d.id === act)!;
  const pending = BILATERAL.includes(act) && state.proposals.some((p) => p.id === proposalId(meId, them, act));
  if (pending) return { ok: false, reason: 'Proposed. Waiting for their answer' };

  if (act === 'war') {
    if (rel.war) return { ok: false, reason: 'Already at war' };
    const gov = governmentOf(me);
    if (me.stats.stability < gov.warNeedsStability) return { ok: false, reason: `A ${gov.name.toLowerCase()} needs ${gov.warNeedsStability}% stability to go to war` };
    return { ok: true };
  }
  if (act === 'peace') {
    if (!rel.war) return { ok: false, reason: 'You are not at war' };
    if (rel.peaceRefusedTurn[meId] === state.turn) return { ok: false, reason: 'They refused this turn. Try again later.' };
    return { ok: true };
  }
  if (rel.war) return { ok: false, reason: 'You are at war' };
  if (def.envoy && !envoyIsIn(state, meId, them)) return { ok: false, reason: `Your envoy must be in ${other.short}` };
  if (rel.lastActionTurn[meId] === state.turn) return { ok: false, reason: 'One envoy action per turn' };
  switch (act) {
    case 'trade':
      if (rel.tradePact) return { ok: false, reason: 'Pact already signed' };
      if (rel.value < 0 && !other.seat) return { ok: false, reason: 'Needs relations of 0 or better' };
      if (me.stats.influence < COSTS.tradeInfluence) return { ok: false, reason: `Needs ${COSTS.tradeInfluence} influence` };
      break;
    case 'embassy':
      if (rel.embassy.includes(meId)) return { ok: false, reason: 'Embassy already open' };
      if (me.stats.treasury < COSTS.embassyTreasury) return { ok: false, reason: `Needs ${COSTS.embassyTreasury} treasury` };
      break;
    case 'gift':
      if (me.stats.treasury < COSTS.giftTreasury) return { ok: false, reason: `Needs ${COSTS.giftTreasury} treasury` };
      break;
    case 'pact':
      if (rel.napUntil >= state.turn) return { ok: false, reason: `Pact holds until turn ${rel.napUntil}` };
      if (rel.value < COSTS.pactRelations && !other.seat) return { ok: false, reason: `Needs relations of ${COSTS.pactRelations} or better` };
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
  A.stats.stability = clamp(A.stats.stability - governmentOf(A).warStability - (brokePact ? 6 : 0), 0, 100);
  for (const other of state.order) {
    if (other === aggressor || other === target || !state.nations[other].alive) continue;
    // Friends of the victim, and everyone if a pact was broken, think less of the aggressor.
    if (brokePact) shiftRelation(state, aggressor, other, -15);
    else if (relation(state, target, other).value > 30) shiftRelation(state, aggressor, other, -10);
  }
  // Envoys are sent home when war breaks out, and offers between the two are withdrawn.
  for (const [mine, theirs] of [[aggressor, target], [target, aggressor]]) {
    const seat = state.nations[mine].seat;
    if (!seat) continue;
    const e = seat.envoy;
    if (hexAt(state, e).owner === theirs || (e.dest && hexAt(state, e.dest).owner === theirs)) {
      seat.envoy = { ...state.nations[mine].capital, dest: null, arrivesTurn: 0 };
    }
  }
  state.proposals = state.proposals.filter((p) => p.act === 'peace' || !((p.from === aggressor && p.to === target) || (p.from === target && p.to === aggressor)));
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

/** Put a two-sided deal into force. `from` is the nation that proposed it and pays for it. */
function conclude(state: GameState, from: NationId, to: NationId, act: DiplomacyAct): void {
  const me = state.nations[from];
  const other = state.nations[to];
  const rel = relation(state, from, to);
  if (act === 'trade') {
    me.stats.influence -= COSTS.tradeInfluence;
    rel.tradePact = true;
    shiftRelation(state, from, to, 10);
    log(state, { kind: 'diplomacy', about: [from, to], text: `${me.name} and ${other.name} signed a trade pact.` });
  } else if (act === 'pact') {
    me.stats.influence -= COSTS.pactInfluence;
    rel.napUntil = state.turn + COSTS.pactTurns;
    shiftRelation(state, from, to, 5);
    log(state, { kind: 'diplomacy', about: [from, to], text: `${me.name} and ${other.name} signed a non-aggression pact until turn ${rel.napUntil}.` });
  } else if (act === 'peace') {
    makePeace(state, from, to);
  }
}

/** Apply a diplomatic action by `meId`. Callers check `canDiplomacy` first. */
export function doDiplomacy(state: GameState, meId: NationId, them: NationId, act: DiplomacyAct): void {
  const me = state.nations[meId];
  const other = state.nations[them];
  const rel = relation(state, meId, them);
  if (act !== 'war' && act !== 'peace') rel.lastActionTurn[meId] = state.turn;

  if (BILATERAL.includes(act)) {
    if (other.seat) {
      // Another person decides. The offer waits for them.
      state.proposals.push({ id: proposalId(meId, them, act), from: meId, to: them, act: act as 'trade' | 'pact' | 'peace', turn: state.turn });
      log(state, { kind: 'diplomacy', to: them, important: true, text: `${me.name} proposes ${PROPOSAL_WORDS[act]}. Answer on the Diplomacy screen.` });
      return;
    }
    if (act === 'peace' && !wouldAcceptPeace(state, meId, them)) {
      rel.peaceRefusedTurn[meId] = state.turn;
      log(state, { kind: 'diplomacy', to: meId, text: `${other.name} refused your offer of peace.` });
      return;
    }
    conclude(state, meId, them, act);
    return;
  }
  switch (act) {
    case 'embassy':
      me.stats.treasury -= COSTS.embassyTreasury;
      rel.embassy.push(meId);
      shiftRelation(state, meId, them, 5);
      log(state, { kind: 'diplomacy', to: meId, text: `Embassy opened in ${other.name}.` });
      break;
    case 'gift':
      me.stats.treasury -= COSTS.giftTreasury;
      if (other.seat) other.stats.treasury += COSTS.giftTreasury;
      shiftRelation(state, meId, them, 12);
      log(state, { kind: 'diplomacy', about: [meId, them], text: `${other.name} accepted a gift from ${me.name}.` });
      break;
    case 'denounce':
      shiftRelation(state, meId, them, -25);
      me.stats.stability = clamp(me.stats.stability + 3, 0, 100);
      log(state, { kind: 'diplomacy', about: [meId, them], important: !!other.seat, text: `${me.name} denounced the government of ${other.name}.` });
      break;
    case 'war':
      declareWar(state, meId, them);
      break;
  }
}

export const PROPOSAL_WORDS: Record<string, string> = { trade: 'a trade pact', pact: 'a non-aggression pact', peace: 'peace' };

/** Can `meId` answer this proposal? Accepting needs the proposer to still be able to pay. */
export function canRespond(state: GameState, meId: NationId, id: string, accept: boolean): Check {
  const p = state.proposals.find((x) => x.id === id && x.to === meId);
  if (!p) return { ok: false, reason: 'No such proposal' };
  if (!accept) return { ok: true };
  const from = state.nations[p.from];
  const rel = relation(state, p.from, p.to);
  if (p.act === 'peace') return rel.war ? { ok: true } : { ok: false, reason: 'You are no longer at war' };
  if (rel.war) return { ok: false, reason: 'You are at war' };
  const cost = p.act === 'trade' ? COSTS.tradeInfluence : COSTS.pactInfluence;
  if (from.stats.influence < cost) return { ok: false, reason: `${from.short} can no longer afford it` };
  return { ok: true };
}

export function doRespond(state: GameState, meId: NationId, id: string, accept: boolean): void {
  const p = state.proposals.find((x) => x.id === id && x.to === meId)!;
  state.proposals = state.proposals.filter((x) => x !== p);
  if (accept) conclude(state, p.from, p.to, p.act);
  else log(state, { kind: 'diplomacy', to: p.from, important: true, text: `${state.nations[meId].name} turned down your offer of ${PROPOSAL_WORDS[p.act]}.` });
}
