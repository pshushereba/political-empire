// The export market.

export type Good = 'grain' | 'timber' | 'ore' | 'goods';

export interface GoodDef {
  id: Good;
  name: string;
  /** Price per unit when supply and demand are in balance. */
  base: number;
  /** Supply the nation gives up for each unit sold abroad. */
  costsSupply: number;
  /** Exported unless the nation says otherwise. */
  exportedByDefault: boolean;
  madeBy: string;
}

export const GOODS: GoodDef[] = [
  { id: 'goods', name: 'Manufactured goods', base: 9, costsSupply: 0, exportedByDefault: true, madeBy: 'Factories' },
  { id: 'ore', name: 'Ore and coal', base: 7, costsSupply: 0, exportedByDefault: true, madeBy: 'Mines' },
  { id: 'timber', name: 'Timber', base: 5, costsSupply: 0, exportedByDefault: true, madeBy: 'Timber yards' },
  { id: 'grain', name: 'Grain', base: 4, costsSupply: 1, exportedByDefault: false, madeBy: 'Farm co-operatives' },
];

export const GOOD_IDS: Good[] = GOODS.map((g) => g.id);
export const GOOD_BY_ID = Object.fromEntries(GOODS.map((g) => [g.id, g])) as Record<Good, GoodDef>;

export const MARKET = {
  /** Units a nation can always sell abroad, by road. */
  baseCapacity: 1,
  /** Extra units per trade pact with a nation it is at peace with. */
  capacityPerPact: 2,
  /** A good is at its base price when the world has this many producers per nation. */
  balancedProducersPerNation: 1.5,
  /** Scarce goods rise to this multiple of base; glutted ones fall to the other. */
  scarcityMax: 1.6,
  scarcityMin: 0.6,
  /** Prices also wander by up to this much a turn, within the band below. */
  driftStep: 0.08,
  driftMin: 0.8,
  driftMax: 1.25,
};
