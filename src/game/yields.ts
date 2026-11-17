import { BUILDING_BY_ID, type BuildingDef } from './content/buildings';
import { hexAt, neighbours } from './hex';
import type { BuildingId, GameState, Hex, HexRef, NationId } from './types';

// What a building actually produces where it stands. Buildings gain (or lose)
// from what is on the same hex and the six hexes around it, which is what
// makes placement a decision.

export interface Yield {
  income: number;
  supply: number;
  security: number;
  approval: number;
  influence: number;
  /** The placement effects included above, for display. */
  bonuses: { why: string; count: number; income: number; supply: number; security: number; approval: number }[];
}

/** A building that doesn't exist yet, for "what if I built here?" questions. */
export interface Planned {
  at: HexRef;
  type: BuildingId;
}

/**
 * Finished buildings on a hex and its neighbours that share its owner,
 * leaving out the one at (hex, skipIndex). A planned building counts as finished.
 */
function nearbyTypes(state: GameState, owner: NationId, hex: HexRef, skipIndex: number, planned?: Planned): BuildingId[] {
  const out: BuildingId[] = [];
  const around = [hex, ...neighbours(hex, state.cols, state.rows)];
  around.forEach((ref, i) => {
    const h = hexAt(state, ref);
    if (h.owner !== owner) return;
    h.buildings.forEach((b, j) => {
      if (b.turnsLeft === 0 && !(i === 0 && j === skipIndex)) out.push(b.type);
    });
    if (planned && planned.at.c === ref.c && planned.at.r === ref.r) out.push(planned.type);
  });
  return out;
}

function compute(def: BuildingDef, near: BuildingId[]): Yield {
  const y: Yield = { income: def.income ?? 0, supply: def.supply ?? 0, security: def.security ?? 0, approval: def.approval ?? 0, influence: def.influence ?? 0, bonuses: [] };
  for (const s of def.synergies ?? []) {
    const count = Math.min(s.max, near.filter((t) => s.near.includes(t)).length);
    if (!count) continue;
    const b = { why: s.why, count, income: (s.income ?? 0) * count, supply: (s.supply ?? 0) * count, security: (s.security ?? 0) * count, approval: (s.approval ?? 0) * count };
    y.income += b.income; y.supply += b.supply; y.security += b.security; y.approval += b.approval;
    y.bonuses.push(b);
  }
  return y;
}

/** The yield of the finished building in lot `index` of `hex`. */
export function buildingYield(state: GameState, hex: Hex, index: number, planned?: Planned): Yield {
  return compute(BUILDING_BY_ID[hex.buildings[index].type], nearbyTypes(state, hex.owner as NationId, hex, index, planned));
}

/** What `def` would yield if it stood, finished, on `hex`. */
export function plannedYield(state: GameState, owner: NationId, hex: Hex, def: BuildingDef): Yield {
  return compute(def, nearbyTypes(state, owner, hex, -1));
}

export interface PlacementEffect {
  /** The new building's own yield here. */
  own: Yield;
  /** Change it causes to buildings already standing nearby. */
  others: { income: number; supply: number; security: number; approval: number };
}

/** The whole effect of building `def` on `hex`: its own yield, and what it does to its neighbours. */
export function placementEffect(state: GameState, owner: NationId, hex: Hex, def: BuildingDef): PlacementEffect {
  const planned: Planned = { at: hex, type: def.id };
  const others = { income: 0, supply: 0, security: 0, approval: 0 };
  for (const ref of [hex, ...neighbours(hex, state.cols, state.rows)]) {
    const h = hexAt(state, ref);
    if (h.owner !== owner) continue;
    h.buildings.forEach((b, i) => {
      if (b.turnsLeft > 0) return;
      const before = buildingYield(state, h, i);
      const after = buildingYield(state, h, i, planned);
      others.income += after.income - before.income;
      others.supply += after.supply - before.supply;
      others.security += after.security - before.security;
      others.approval += after.approval - before.approval;
    });
  }
  return { own: plannedYield(state, owner, hex, def), others };
}

/** How many of a nation's finished buildings are earning a positive placement bonus. */
export function placementBonusCount(state: GameState, id: NationId): number {
  let n = 0;
  for (const h of state.hexes) {
    if (h.owner !== id) continue;
    h.buildings.forEach((b, i) => {
      if (b.turnsLeft === 0 && buildingYield(state, h, i).bonuses.some((x) => x.income + x.supply + x.security + x.approval > 0)) n++;
    });
  }
  return n;
}
