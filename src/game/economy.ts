import { BUILDING_BY_ID } from './content/buildings';
import { GOVERNMENT_BY_ID, type GovernmentDef, type GovernmentId } from './content/governments';
import { buildingYield } from './yields';
import { GOOD_BY_ID, GOOD_IDS, MARKET, type Good } from './content/market';
import { POLICY_IDS, policyLevel, policyTotals, type PolicyId } from './content/policies';
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
  // Each lean brings a benefit and a cost, both growing with how far the nation leans.
  if (L > 0) { m.approval += 4 * L; m.influence += 2 * L; m.upkeepMult = 1 + 0.1 * L; }
  else { m.upkeepMult = 1 + 0.3 * L; m.recruitMult = 1 + 0.2 * L; m.influence += 1.5 * L; }
  if (M > 0) { m.commerceMult = 1 + 0.3 * M; m.approval -= 3 * M; }
  else { m.supplyMult = 1 - 0.25 * M; m.approval += -2 * M; m.commerceMult = 1 + 0.2 * M; }
  if (R > 0) { m.buildCostMult = 1 - 0.2 * R; m.stability = -5 * R; }
  else { m.stability = -8 * R; m.buildCostMult = 1 - 0.1 * R; }
  if (O > 0) { m.tradeMult = 1 + 0.6 * O; m.influence += 2 * O; m.defenceMult = 1 - 0.1 * O; }
  else { m.defenceMult = 1 - 0.25 * O; m.tradeMult = 1 + 0.4 * O; m.influence += O; }
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

/** The share of the world's land that wins the game. Smaller in larger worlds, where 60% would mean beating everyone. */
export function hegemonyShare(state: GameState): number {
  return Math.max(BALANCE.hegemonyFloor, Math.min(BALANCE.hegemonyShare, BALANCE.hegemonyFairShares / state.order.length));
}

/** Hexes needed for a hegemony victory. */
export function hegemonyHexes(state: GameState): number {
  return Math.ceil(landCount(state) * hegemonyShare(state));
}

/** A nation holding more than this many hexes frightens the rest. */
export function threatHexes(state: GameState): number {
  return landCount(state) * Math.min(BALANCE.threatShare, BALANCE.threatFairShares / state.order.length);
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
  income: { base: number; land: number; population: number; businesses: number; trade: number; exports: number; multiplier: number; gross: number };
  /** What the nation makes for sale abroad, how much it can ship, and what was sold at today's prices. */
  exports: { produced: Record<Good, number>; sold: Record<Good, number>; capacity: number; ports: number; pacts: number; income: number };
  /** Where each standing policy sits. */
  policies: Record<PolicyId, { level: number; name: string }>;
  /** What the policies cost the treasury each turn (negative is a saving). */
  spending: number;
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
  const made: Record<Good, number> = { grain: 0, timber: 0, ore: 0, goods: 0 };
  let portCapacity = 0;
  let ports = 0;
  for (const h of hexes) {
    const t = TERRAIN[h.terrain];
    land += t.income;
    supply += t.supply;
    h.buildings.forEach((b, i) => {
      if (b.turnsLeft > 0) return;
      const y = buildingYield(state, h, i);
      const def = BUILDING_BY_ID[b.type];
      if (def.produces) made[def.produces]++;
      if (def.exportCapacity) { portCapacity += def.exportCapacity; ports++; }
      if (def.category === 'commerce') commerce += y.income;
      else otherIncome += y.income;
      supply += y.supply;
      approval += y.approval;
      security += y.security;
      influence += y.influence;
    });
  }

  let trade = 0;
  let wars = 0;
  let pacts = 0;
  for (const other of state.order) {
    if (other === id || !state.nations[other].alive) continue;
    const rel = state.relations[pairKey(id, other)];
    if (rel.tradePact) { trade += BALANCE.tradePactIncome * m.tradeMult; pacts++; }
    if (rel.war) wars++;
    if (rel.embassy.includes(id)) influence += 1;
  }

  const millions = n.stats.population / 1_000_000;
  // Standing policies: taxes, schooling, health and workers' protections.
  const pol = policyTotals(n.policies);
  approval += pol.approval;
  influence += pol.influence;
  const population = millions * BALANCE.incomePerMillion * pol.wages;
  const businesses = (commerce * m.commerceMult + otherIncome) * pol.business;
  const spending = pol.spend * millions;

  // Exports: sell what the nation makes, dearest first, up to what it can ship.
  const capacity = MARKET.baseCapacity + portCapacity + pacts * MARKET.capacityPerPact;
  const sold: Record<Good, number> = { grain: 0, timber: 0, ore: 0, goods: 0 };
  let room = capacity;
  let exportIncome = 0;
  let grainSold = 0;
  for (const g of [...GOOD_IDS].sort((a, b) => state.market.prices[b] - state.market.prices[a])) {
    if (!n.exports[g]) continue;
    const units = Math.min(room, made[g]);
    sold[g] = units;
    room -= units;
    exportIncome += units * state.market.prices[g] * m.tradeMult;
    grainSold += units * GOOD_BY_ID[g].costsSupply;
  }

  const multiplier = (0.75 + n.stats.stability / 200) * (1 + (n.factions.merchants - 50) / 400) * m.incomeMult;
  const gross = (BALANCE.baseIncome + land + population + businesses + trade + exportIncome) * multiplier;

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
  const used = millions * BALANCE.supplyPerMillion + units + grainSold;
  const supplyNet = produced - used;

  const avgFaction = FACTION_IDS.reduce((s, f) => s + n.factions[f], 0) / FACTION_IDS.length;
  const stabilityTarget = clamp(
    55 + (avgFaction - 50) * 0.4 + approval * 1.5 + m.stability + pol.stability + (n.factions.clergy - 50) / 10
      - wars * 4 - Math.max(0, hexes.length - 20) * 0.5 - Math.min(20, Math.max(0, -supplyNet) * 2),
    0, 100,
  );
  const growthPct = clamp(1 + pol.growth + 0.3 * supplyNet + (n.factions.settlers - 50) / 50 - (n.stats.stability < governmentOf(n).unrestBelow ? 1 : 0), -6, 5);

  return {
    hexes: hexes.length,
    income: { base: BALANCE.baseIncome, land, population: Math.round(population), businesses: Math.round(businesses), trade: Math.round(trade), exports: Math.round(exportIncome), multiplier, gross: Math.round(gross) },
    exports: { produced: made, sold, capacity, ports, pacts, income: Math.round(exportIncome) },
    policies: Object.fromEntries(POLICY_IDS.map((p) => [p, { level: n.policies[p], name: policyLevel(p, n.policies[p]).name }])) as Economy['policies'],
    spending: Math.round(spending),
    upkeep: Math.round(upkeep),
    net: Math.round(gross) - Math.round(upkeep) - Math.round(spending),
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

/**
 * The chance, each turn, that an authoritarian nation is risen against.
 * It grows with how far the nation leans to authority and how unhappy its
 * people are, and shrinks with security bureaus. Zero for freer nations.
 */
export function revoltChance(state: GameState, id: NationId): number {
  const n = state.nations[id];
  if (n.axes.liberty >= BALANCE.revoltBelowLiberty) return 0;
  if (state.turn - n.lastRevolt < BALANCE.revoltCooldown) return 0;
  const pressure = (BALANCE.revoltBelowLiberty - n.axes.liberty) / BALANCE.revoltBelowLiberty;
  const avgFaction = FACTION_IDS.reduce((s, f) => s + n.factions[f], 0) / FACTION_IDS.length;
  const discontent = clamp((70 - n.stats.stability) / 70, 0, 1) * 0.7 + clamp((55 - avgFaction) / 55, 0, 1) * 0.3;
  let bureaus = 0;
  for (const h of state.hexes) if (h.owner === id) bureaus += h.buildings.filter((b) => b.type === 'police' && b.turnsLeft === 0).length;
  const watched = 1 - BALANCE.revoltBureauCut * Math.min(2, bureaus);
  return Math.round(BALANCE.revoltMaxChance * pressure * discontent * watched * 1000) / 1000;
}
