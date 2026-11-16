import type { GameState } from './types';

/** One number for how well a game went, for the hall of nations. */
export function score(state: GameState): number {
  const n = state.nations[state.playerId];
  const hexes = state.hexes.filter((h) => h.owner === n.id).length;
  return Math.round(
    hexes * 10 + (n.stats.population / 1_000_000) * 20 + n.era * 100 + state.objectives.done.length * 25
      + n.tally.capitalsTaken * 150 + n.tally.battlesWon * 5 + (state.status === 'won' ? 500 : 0),
  );
}
