import type { GameState, LogEntry, NationId } from './types';

/** What nation `me` should be told about a turn: private notes for others are left out, and `important` is judged from its side. */
export function reportFor(state: GameState, me: NationId, turn: number): LogEntry[] {
  return state.log
    .filter((l) => l.turn === turn && (!l.to || l.to === me))
    .map((l) => ({ ...l, important: !!l.important && (!l.about || l.about.includes(me)) }));
}
