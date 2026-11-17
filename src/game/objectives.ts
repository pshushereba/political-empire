import { ACTIVE_OBJECTIVES, OBJECTIVE_BY_ID, OBJECTIVES, type ObjectiveDef } from './content/objectives';
import { economy, unitCount } from './economy';
import { pairKey } from './relations';
import type { GameState, NationId } from './types';
import { placementBonusCount } from './yields';

/** The player's current value for an objective's metric. */
export function metricValue(state: GameState, id: NationId, def: ObjectiveDef): number {
  const n = state.nations[id];
  const mine = state.hexes.filter((h) => h.owner === id);
  switch (def.metric) {
    case 'hexes': return mine.length;
    case 'population': return n.stats.population;
    case 'stability': return n.stats.stability;
    case 'netIncome': return economy(state, id).net;
    case 'units': return unitCount(state, id);
    case 'buildings': return mine.reduce((s, h) => s + h.buildings.filter((b) => b.turnsLeft === 0).length, 0);
    case 'building': return mine.reduce((s, h) => s + h.buildings.filter((b) => b.turnsLeft === 0 && b.type === def.arg).length, 0);
    case 'pacts': return state.order.filter((o) => o !== id).reduce((s, o) => { const r = state.relations[pairKey(id, o)]; return s + (r.tradePact ? 1 : 0) + (r.embassy.includes(id) ? 1 : 0); }, 0);
    case 'battlesWon': return n.tally.battlesWon;
    case 'capitalsTaken': return n.tally.capitalsTaken;
    case 'era': return n.era;
    case 'decisions': return n.decisions.length;
    case 'powersUsed': return n.tally.powersUsed;
    case 'placementBonuses': return placementBonusCount(state, id);
  }
}

export interface ObjectiveStatus {
  def: ObjectiveDef;
  value: number;
  /** 0–1 */
  progress: number;
}

export function activeObjectives(state: GameState, id: NationId): ObjectiveStatus[] {
  return (state.nations[id].seat?.objectives.active ?? []).map((oid) => {
    const def = OBJECTIVE_BY_ID[oid];
    const value = metricValue(state, id, def);
    return { def, value, progress: Math.max(0, Math.min(1, value / def.target)) };
  });
}

/** Active objectives that are now met. The caller pays the rewards. */
export function completedObjectives(state: GameState, id: NationId): ObjectiveDef[] {
  return (state.nations[id].seat?.objectives.active ?? []).map((oid) => OBJECTIVE_BY_ID[oid]).filter((def) => metricValue(state, id, def) >= def.target);
}

/** Retire `done` and bring in the next objectives from the list. */
export function advanceObjectives(state: GameState, id: NationId, done: ObjectiveDef[]): void {
  const o = state.nations[id].seat!.objectives;
  for (const d of done) {
    o.active = o.active.filter((x) => x !== d.id);
    o.done.push(d.id);
  }
  for (const def of OBJECTIVES) {
    if (o.active.length >= ACTIVE_OBJECTIVES) break;
    if (!o.done.includes(def.id) && !o.active.includes(def.id)) o.active.push(def.id);
  }
}
