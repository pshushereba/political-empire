import { BUILDING_BY_ID } from './content/buildings';
import { GOVERNMENT_BY_ID, type GovernmentDef, type GovernmentId } from './content/governments';
import { buildingYield } from './yields';
import { BALANCE, ERAS, FACTION_IDS, TERRAIN, UNIT_BY_ID, UNIT_IDS } from './content/world';
import { pairKey } from './relations';
import type { GameState, Hex, Nation, NationId } from './types';

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** −1 (fully the low end) … +1 (fully the high end). */
export const lean = (axisValue: number): number => (axisValue - 50) / 50;

export interface Modifiers {
  incomeMult: number;
  commerceMult: number;
  supplyMult: number;
  supplyFlat: number;
  upkeepMult: number;
  recruitMult: number;
  buildCostMult: number;
  defenceMult: number;
  tradeMult: number;
  approval: number;
  influence: number;
  stability: number;
}

export function governmentOf(n: Nation): GovernmentDef {
  return GOVERNMENT_BY_ID[n.government as GovernmentId];
}

/** How a nation's ideology, government and starting land change the rules for it. */
export function modifiers(n: Nation): Modifiers {
  const L = lean(n.axes.liberty);
  const M = lean(n.axes.market);
  const R = lean(n.axes.reform);
  const O = lean(n.axes.openness);
  const m: Modifiers = {
    incomeMult: 1, commerceMult: 1, supplyMult: 1, supplyFlat: 0, upkeepMult: 1, recruitMult: 1,
    buildCostMult: 1, defenceMult: 1, tradeMult: 1, approval: 0, influence: 0, stability: 0,
  };
  if (L > 0) { m.approval += 4 * L; m.influence += 2 * L; }
  else { m.upkeepMult = 1 + 0.3 * L; m.recruitMult = 1 + 0.2 * L; }
  if (M > 0) m.commerceMult = 1 + 0.3 * M;
  else { m.supplyMult = 1 - 0.25 * M; m.approval += -2 * M; }
  if (R > 0) m.buildCostMult = 1 - 0.2 * R;
  else m.stability = -8 * R;
  if (O > 0) { m.tradeMult = 1 + 0.6 * O; m.influence += 2 * O; }
  else m.defenceMult = 1 - 0.25 * O;
  if (n.startingLand === 'coast') m.incomeMult *= 1.1;
  if (n.startingLand === 'river') m.supplyFlat += 4;
  if (n.startingLand === 'highlands') { m.defenceMult *= 1.2; m.supplyFlat -= 2; }
  for (const [k, v] of Object.entries(governmentOf(n).mods) as [keyof Modifiers, number][]) {
    if (k.endsWith('Mult')) m[k] *= v;
    else m[k] += v;
  }
  return m;
}

export function ownedHexes(state: GameState, id: NationId): Hex[] {
  return state.hexes.filter((h) => h.owner === id);
}

export function landCount(state: GameState): number {
  return state.hexes.filter((h) => h.terrain !== 'sea').length;
}

export function unitCount(state: GameState, id: NationId): number {
  let n = 0;
  for (const a of state.armies) if (a.owner === id) for (const u of UNIT_IDS) n += a.units[u];
  return n;
}

/** Rough fighting power, used by the AI and shown to the player via an embassy. */
export function militaryStrength(state: GameState, id: NationId): number {
  let s = 0;
  for (const a of state.armies) {
    if (a.owner !== id) continue;
    for (const u of UNIT_IDS) s += a.units[u] * (UNIT_BY_ID[u].attack + UNIT_BY_ID[u].defence);
  }
  return s;
}

export function hasFinished(state: GameState, id: NationId, building: string): boolean {
  return state.hexes.some((h) => h.owner === id && h.buildings.some((b) => b.type === building && b.turnsLeft === 0));
}

export interface Economy {
  hexes: number;
  income: { base: number; land: number; population: number; businesses: number; trade: number; multiplier: number; gross: number };
  upkeep: number;
  net: number;
  supply: { produced: number; used: number; net: number };
  approval: number;
  security: number;
  influence: number;
  growthPct: number;
  stabilityTarget: number;
  units: number;
  wars: number;
}

/** Everything a nation earns and spends per turn, derived from the map. */
export function economy(state: GameState, id: NationId): Economy {
  const n = state.nations[id];
  const m = modifiers(n);
  const hexes = ownedHexes(state, id);

  let land = 0;
  let commerce = 0;
  let otherIncome = 0;
  let supply = 0;
  let approval = m.approval;
  let security = 0;
  let influence = BALANCE.baseInfluence + m.influence;
  for (const h of hexes) {
    const t = TERRAIN[h.terrain];
    land += t.income;
    supply += t.supply;
    h.buildings.forEach((b, i) => {
      if (b.turnsLeft > 0) return;
      const y = buildingYield(state, h, i);
      if (BUILDING_BY_ID[b.type].category === 'commerce') commerce += y.income;
      else otherIncome += y.income;
      supply += y.supply;
      approval += y.approval;
      security += y.security;
      influence += y.influence;
    });
  }

  let trade = 0;
  let wars = 0;
  for (const other of state.order) {
    if (other === id || !state.nations[other].alive) continue;
    const rel = state.relations[pairKey(id, other)];
    if (rel.tradePact) trade += BALANCE.tradePactIncome * m.tradeMult;
    if (rel.war) wars++;
    if (rel.embassy && id === state.playerId) influence += 1;
  }

  const millions = n.stats.population / 1_000_000;
  const population = millions * BALANCE.incomePerMillion;
  const businesses = commerce * m.commerceMult + otherIncome;
  const multiplier = (0.75 + n.stats.stability / 200) * (1 + (n.factions.merchants - 50) / 400) * m.incomeMult;
  const gross = (BALANCE.baseIncome + land + population + businesses + trade) * multiplier;

  let upkeep = 0;
  let units = 0;
  for (const a of state.armies) {
    if (a.owner !== id) continue;
    for (const u of UNIT_IDS) {
      upkeep += a.units[u] * UNIT_BY_ID[u].upkeep;
      units += a.units[u];
    }
  }
  upkeep *= m.upkeepMult;

  const produced = supply * m.supplyMult * (1 + (n.factions.dockworkers - 50) / 400) + m.supplyFlat + BALANCE.baseSupply;
  const used = millions * BALANCE.supplyPerMillion + units;
  const supplyNet = produced - used;

  const avgFaction = FACTION_IDS.reduce((s, f) => s + n.factions[f], 0) / FACTION_IDS.length;
  const stabilityTarget = clamp(
    55 + (avgFaction - 50) * 0.4 + approval * 1.5 + m.stability + (n.factions.clergy - 50) / 10
      - wars * 4 - Math.max(0, hexes.length - 20) * 0.5 - Math.min(20, Math.max(0, -supplyNet) * 2),
    0, 100,
  );
  const growthPct = clamp(1 + 0.3 * supplyNet + (n.factions.settlers - 50) / 50 - (n.stats.stability < governmentOf(n).unrestBelow ? 1 : 0), -6, 5);

  return {
    hexes: hexes.length,
    income: { base: BALANCE.baseIncome, land, population: Math.round(population), businesses: Math.round(businesses), trade: Math.round(trade), multiplier, gross: Math.round(gross) },
    upkeep: Math.round(upkeep),
    net: Math.round(gross) - Math.round(upkeep),
    supply: { produced: Math.round(produced), used: Math.round(used), net: Math.round(supplyNet) },
    approval: Math.round(approval),
    security,
    influence: Math.round(influence),
    growthPct: Math.round(growthPct * 10) / 10,
    stabilityTarget: Math.round(stabilityTarget),
    units,
    wars,
  };
}

/** The highest era whose thresholds the nation meets. Eras never go backwards. */
export function eraFor(n: Nation, hexes: number): number {
  let era = n.era;
  while (era + 1 < ERAS.length && hexes >= ERAS[era + 1].hexes && n.stats.population >= ERAS[era + 1].population) era++;
  return era;
}

/** 0–1 progress toward the next era: the lower of land and population progress. */
export function eraProgress(n: Nation, hexes: number): number {
  const next = ERAS[n.era + 1];
  if (!next) return 1;
  return clamp(Math.min(hexes / next.hexes, n.stats.population / next.population), 0, 1);
}

export function formatPopulation(p: number): string {
  return p >= 1_000_000 ? `${(p / 1_000_000).toFixed(2)}M` : `${Math.round(p / 1000)}k`;
}
