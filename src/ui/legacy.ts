import { GOVERNMENT_BY_ID, score, type GameState, type GovernmentId } from '../game';

// The hall of nations: a record of finished games, kept in this browser
// so there is something to beat and a reason to try another kind of state.

const KEY = 'political-empire.legacy';

export interface LegacyRecord {
  name: string;
  government: GovernmentId;
  turns: number;
  score: number;
  outcome: 'won' | 'lost' | 'abandoned';
  hexes: number;
  date: string;
}

export function loadLegacy(): LegacyRecord[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((r) => r && GOVERNMENT_BY_ID[r.government as GovernmentId]) : [];
  } catch {
    return [];
  }
}

/** Remember a game that is ending. Very short games aren't worth recording. */
export function recordLegacy(state: GameState): LegacyRecord | null {
  if (state.status === 'playing' && state.turn < 5) return null;
  const n = state.nations[state.playerId];
  const record: LegacyRecord = {
    name: n.name,
    government: n.government as GovernmentId,
    turns: state.turn,
    score: score(state),
    outcome: state.status === 'playing' ? 'abandoned' : state.status,
    hexes: state.hexes.filter((h) => h.owner === n.id).length,
    date: new Date().toISOString().slice(0, 10),
  };
  try {
    const list = [...loadLegacy(), record].sort((a, b) => b.score - a.score).slice(0, 30);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Best-effort, like the save itself.
  }
  return record;
}
