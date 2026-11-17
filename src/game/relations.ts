import type { GameState, NationId, Relation } from './types';

export const pairKey = (a: NationId, b: NationId): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function relation(state: GameState, a: NationId, b: NationId): Relation {
  return state.relations[pairKey(a, b)];
}

export function atWar(state: GameState, a: NationId, b: NationId): boolean {
  return a !== b && !!state.relations[pairKey(a, b)]?.war;
}

export function enemiesOf(state: GameState, id: NationId): NationId[] {
  return state.order.filter((o) => o !== id && state.nations[o].alive && atWar(state, id, o));
}

export type Stance = 'At war' | 'Hostile' | 'Wary' | 'Cordial' | 'Allied';

/** Relations buckets: < −40 Hostile, −40…10 Wary, 10…60 Cordial, > 60 Allied. */
export function stance(rel: Relation): Stance {
  if (rel.war) return 'At war';
  if (rel.value < -40) return 'Hostile';
  if (rel.value < 10) return 'Wary';
  if (rel.value <= 60) return 'Cordial';
  return 'Allied';
}

export function newRelation(value: number): Relation {
  return { value, war: false, warSince: 0, tradePact: false, embassy: [], napUntil: 0, lastActionTurn: {}, peaceRefusedTurn: {} };
}

/** Nations run by people that are still in the game. */
export function activeHumans(state: GameState): NationId[] {
  return state.humans.filter((id) => state.nations[id].alive);
}

export const isHuman = (state: GameState, id: NationId): boolean => state.nations[id]?.seat != null;
