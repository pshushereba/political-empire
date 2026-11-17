// Flag art: patterns, emblems and colour pairs. Like sprites, this is drawing
// data only. Which of these a player may use is decided in src/commerce.
// Everything is drawn in a 60 × 40 box.

export interface FlagLayer {
  d: string;
  /** 'a' and 'b' are the flag's two colours. */
  fill: 'a' | 'b' | 'ivory';
}

const FULL = 'M0 0h60v40h-60z';

export const FLAG_PATTERNS: Record<string, { name: string; layers: FlagLayer[] }> = {
  tricolour: { name: 'Tricolour', layers: [{ d: 'M0 0h20v40h-20z', fill: 'a' }, { d: 'M20 0h20v40h-20z', fill: 'ivory' }, { d: 'M40 0h20v40h-20z', fill: 'b' }] },
  bands: { name: 'Bands', layers: [{ d: FULL, fill: 'a' }, { d: 'M0 13h60v14h-60z', fill: 'b' }] },
  canton: { name: 'Canton', layers: [{ d: FULL, fill: 'b' }, { d: 'M0 0h28v20h-28z', fill: 'a' }] },
  cross: { name: 'Cross', layers: [{ d: FULL, fill: 'a' }, { d: 'M0 16h60v8h-60zM18 0h8v40h-8z', fill: 'b' }] },
  saltire: { name: 'Saltire', layers: [{ d: FULL, fill: 'a' }, { d: 'M0 0h7l53 35v5h-7L0 5zM60 0v5L7 40H0v-5L53 0z', fill: 'b' }] },
  chevron: { name: 'Chevron', layers: [{ d: FULL, fill: 'a' }, { d: 'M0 0l28 20-28 20z', fill: 'b' }] },
  quarters: { name: 'Quarters', layers: [{ d: FULL, fill: 'a' }, { d: 'M30 0h30v20h-30zM0 20h30v20h-30z', fill: 'b' }] },
  pale: { name: 'Pale', layers: [{ d: FULL, fill: 'a' }, { d: 'M21 0h18v40h-18z', fill: 'b' }] },
};

/** Emblems are drawn in a 24 × 24 box and placed at the centre of the flag. */
export const FLAG_EMBLEMS: Record<string, { name: string; d: string }> = {
  star: { name: 'Star', d: 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z' },
  tower: { name: 'Tower', d: 'M6 21V10H4V3h3v3h3V3h4v3h3V3h3v7h-2v11z' },
  crescent: { name: 'Crescent', d: 'M16.1 4.6A9 9 0 1 0 16.1 19.4A7.5 7.5 0 1 1 16.1 4.6z' },
  diamond: { name: 'Diamond', d: 'M12 2l8 10-8 10-8-10z' },
  ring: { name: 'Ring', d: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 8a4 4 0 1 1 0 8a4 4 0 1 1 0-8z' },
  tree: { name: 'Tree', d: 'M12 2l6 9h-3l4 6h-5v5h-4v-5H5l4-6H6z' },
};

/** Colour pairs, all drawn from the nation palette and neutrals in docs/design-tokens.json. */
export const FLAG_COLOURS: Record<string, { name: string; a: string; b: string }> = {
  'amber-navy': { name: 'Amber and navy', a: '#E8A33D', b: '#1F3A5F' },
  'teal-black': { name: 'Teal and black', a: '#3FA7A0', b: '#0E1217' },
  'rose-ivory': { name: 'Rose and ivory', a: '#C4607A', b: '#ECE9E2' },
  'sky-umber': { name: 'Sky and umber', a: '#8DB8E8', b: '#5B3A1E' },
  'violet-ivory': { name: 'Violet and ivory', a: '#9B8AE0', b: '#ECE9E2' },
  'lime-navy': { name: 'Lime and navy', a: '#A7C957', b: '#1F3A5F' },
  'coral-black': { name: 'Coral and black', a: '#E36F4C', b: '#0E1217' },
  'cobalt-sand': { name: 'Cobalt and sand', a: '#5878D8', b: '#D9C9A3' },
};

export const IVORY = '#ECE9E2';
