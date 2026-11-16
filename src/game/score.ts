import type { GameState, NationId } from './types';

/** One number for how well a nation's game went, for the hall of nations. */
export function score(state: GameState, id: NationId): number {
  const n = state.nations[id];
  const hexes = state.hexes.filter((h) => h.owner === id).length;
  return Math.round(
    hexes * 10 + (n.stats.population / 1_000_000) * 20 + n.era * 100 + (n.seat?.objectives.done.length ?? 0) * 25
      + n.tally.capitalsTaken * 150 + n.tally.battlesWon * 5 + (state.winner === id ? 500 : 0),
  );
}
