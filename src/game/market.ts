import { BUILDINGS } from './content/buildings';
import { GOOD_IDS, GOODS, MARKET, type Good } from './content/market';
import type { Rng } from './rng';
import type { GameState } from './types';

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** How many finished buildings in the whole world make each good. */
export function worldProducers(state: GameState): Record<Good, number> {
  const out: Record<Good, number> = { grain: 0, timber: 0, ore: 0, goods: 0 };
  const makes = Object.fromEntries(BUILDINGS.filter((b) => b.produces).map((b) => [b.id, b.produces!]));
  for (const h of state.hexes) {
    if (!h.owner) continue;
    for (const b of h.buildings) if (b.turnsLeft === 0 && makes[b.type]) out[makes[b.type]]++;
  }
  return out;
}

/** Today's prices: base price, pushed up when few nations make a good and down when many do, times its drift. */
export function priceList(state: GameState, drift: Record<Good, number>): Record<Good, number> {
  const producers = worldProducers(state);
  const balanced = state.order.filter((id) => state.nations[id].alive).length * MARKET.balancedProducersPerNation;
  const out = {} as Record<Good, number>;
  for (const g of GOODS) {
    const glut = producers[g.id] / Math.max(1, balanced);
    const scarcity = Math.max(MARKET.scarcityMin, Math.min(MARKET.scarcityMax, MARKET.scarcityMax - (MARKET.scarcityMax - 1) * glut));
    out[g.id] = round1(g.base * scarcity * drift[g.id]);
  }
  return out;
}

export function newMarket(state: Omit<GameState, 'market'>): GameState['market'] {
  const drift = { grain: 1, timber: 1, ore: 1, goods: 1 };
  const prices = priceList(state as GameState, drift);
  return { drift, prices, previous: { ...prices } };
}

/** A new day on the market: each price wanders a little, then supply and demand are applied. */
export function updateMarket(state: GameState, rng: Rng): void {
  const m = state.market;
  m.previous = { ...m.prices };
  for (const g of GOOD_IDS) {
    m.drift[g] = Math.max(MARKET.driftMin, Math.min(MARKET.driftMax, m.drift[g] * (1 + rng.range(-MARKET.driftStep, MARKET.driftStep))));
  }
  m.prices = priceList(state, m.drift);
}
