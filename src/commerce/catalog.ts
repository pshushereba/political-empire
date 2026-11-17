// What can be owned, and what owning it unlocks. Data only.
//
// THE WALL: nothing in src/game may import from here, and the rules never
// learn what a player owns. Purchases change how a nation looks and what
// conveniences an account has. They never change what a nation can do.

export type CosmeticKind = 'pattern' | 'emblem' | 'colours';

export interface Cosmetic {
  kind: CosmeticKind;
  /** Key into the matching table in src/art/flags.ts. */
  id: string;
  /** The product that unlocks it, or null if every player has it. */
  pack: ProductId | null;
}

export type ProductId = 'pack-heraldry' | 'pack-colours' | 'membership';

export interface Product {
  id: ProductId;
  name: string;
  kind: 'pack' | 'membership';
  blurb: string;
  /** Benefits beyond cosmetics. Listed for the player; each is granted elsewhere when it exists. */
  perks?: string[];
  /** Not purchasable until payments are connected. Prices live with the payment provider, not here. */
  onSale: boolean;
}

export const PRODUCTS: Product[] = [
  { id: 'pack-heraldry', name: 'Heraldry pack', kind: 'pack', onSale: false,
    blurb: 'Four classic flag designs and three emblems for a nation with a sense of history.' },
  { id: 'pack-colours', name: 'Colours of the world', kind: 'pack', onSale: false,
    blurb: 'Four new colour pairs, a bold centre stripe, and three more emblems.' },
  { id: 'membership', name: 'Supporter membership', kind: 'membership', onSale: false,
    blurb: 'Every flag design, emblem and colour, now and as more are added.',
    perks: ['Everything in every pack', 'Planned: host larger private worlds', 'Planned: match history and statistics', 'Planned: season rewards'] },
];

export const PRODUCT_BY_ID = Object.fromEntries(PRODUCTS.map((p) => [p.id, p])) as Record<ProductId, Product>;

const free = (kind: CosmeticKind, ...ids: string[]): Cosmetic[] => ids.map((id) => ({ kind, id, pack: null }));
const pack = (p: ProductId, kind: CosmeticKind, ...ids: string[]): Cosmetic[] => ids.map((id) => ({ kind, id, pack: p }));

export const COSMETICS: Cosmetic[] = [
  ...free('pattern', 'tricolour', 'bands', 'canton'),
  ...free('colours', 'amber-navy', 'teal-black', 'rose-ivory', 'sky-umber'),
  ...pack('pack-heraldry', 'pattern', 'cross', 'saltire', 'chevron', 'quarters'),
  ...pack('pack-heraldry', 'emblem', 'star', 'tower', 'crescent'),
  ...pack('pack-colours', 'pattern', 'pale'),
  ...pack('pack-colours', 'colours', 'violet-ivory', 'lime-navy', 'coral-black', 'cobalt-sand'),
  ...pack('pack-colours', 'emblem', 'diamond', 'ring', 'tree'),
];

export const cosmeticsOf = (kind: CosmeticKind): Cosmetic[] => COSMETICS.filter((c) => c.kind === kind);

/** Does an account holding these products have this cosmetic? A membership has everything. */
export function owns(owned: readonly string[], c: Cosmetic): boolean {
  return c.pack === null || owned.includes(c.pack) || owned.includes('membership');
}

/** Is every part of a flag something this account may use? Unknown parts count as not owned. */
export function ownsFlag(owned: readonly string[], flag: { pattern: string; a: string; b: string; emblem?: string }, colourId: string | null): boolean {
  const find = (kind: CosmeticKind, id: string) => COSMETICS.find((c) => c.kind === kind && c.id === id);
  const pattern = find('pattern', flag.pattern);
  const colours = colourId ? find('colours', colourId) : undefined;
  const emblem = flag.emblem ? find('emblem', flag.emblem) : null;
  return !!pattern && owns(owned, pattern) && !!colours && owns(owned, colours) && (emblem === null || (!!emblem && owns(owned, emblem)));
}
