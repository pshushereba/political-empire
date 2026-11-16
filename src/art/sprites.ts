// The sprite registry: the single place where game art lives.
//
// Every building, unit and piece of scenery is drawn through <Sprite id="…"/>,
// which looks the id up here. To upgrade the graphics, replace an entry:
//
//   bank: { image: '/art/bank.png' }          // a raster or SVG file
//   bank: { layers: [{ d: '…', fill: '…' }] }  // or new vector layers
//
// Nothing else in the app needs to change. All sprites share one frame:
// an 80 × 90 box with the ground line at y = 86, so art of any style lines up.

export const SPRITE_W = 80;
export const SPRITE_H = 90;
export const GROUND_Y = 86;

export interface Layer {
  d: string;
  fill: string;
}

export type SpriteDef = { layers: Layer[] } | { image: string };

const P = (d: string, fill: string): Layer => ({ d, fill });
const rect = (x: number, y: number, w: number, h: number, f: string): Layer => P(`M${x} ${y}h${w}v${h}h${-w}z`, f);
/** A box with a lit top and a shaded right side. */
const box = (x: number, y: number, w: number, h: number, front: string, side: string, top: string): Layer[] => [
  rect(x, y, w, h, front),
  P(`M${x + w} ${y}l7 -7v${h}l-7 7z`, side),
  P(`M${x} ${y}l7 -7h${w}l-7 7z`, top),
];
const circ = (cx: number, cy: number, r: number, f: string): Layer =>
  P(`M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`, f);
const shadow = P('M6 86a33 5 0 1 0 66 0a33 5 0 1 0 -66 0z', 'rgba(0,0,0,0.38)');

const C = {
  wall: '#D5DBE3', side: '#9AA5B3', top: '#EEF1F4', con: '#B7BFC9', cside: '#7F8A98', ctop: '#CDD3DA',
  roof: '#566577', win: '#F4C374', amber: '#E8A33D', teal: '#3FA7A0', dark: '#2B333D', white: '#F3F4F6',
  wood: '#8A6A4A', leaf: '#4E8B5A', leafDark: '#3F7349', olive: '#6F7D4F', oliveDark: '#55613B', steel: '#8793A1',
};

export const SPRITES: Record<string, SpriteDef> = {
  // ---- Buildings ----
  checkpoint: { layers: [shadow, ...box(10, 58, 22, 28, C.wall, C.side, C.top), rect(13, 63, 16, 8, C.win), rect(32, 66, 42, 4, C.amber), rect(70, 62, 4, 24, C.dark), rect(8, 54, 26, 4, C.roof)] },
  wall: { layers: [shadow, ...box(4, 52, 62, 34, C.con, C.cside, C.ctop), rect(4, 44, 10, 8, C.con), rect(24, 44, 10, 8, C.con), rect(44, 44, 10, 8, C.con), rect(4, 70, 62, 3, C.cside)] },
  garrison: { layers: [shadow, ...box(10, 46, 52, 40, C.con, C.cside, C.ctop), rect(30, 66, 12, 20, C.dark), rect(35, 14, 2, 32, C.dark), P('M37 14h16l-4 5 4 5h-16z', C.amber), rect(16, 54, 40, 5, C.win)] },
  farm: { layers: [shadow, ...box(8, 56, 34, 30, '#C96A4A', '#9C4E36', '#E08A6C'), P('M6 56L25 40l19 16z', C.roof), rect(20, 68, 10, 18, C.dark), rect(52, 44, 14, 42, C.wall), P('M52 44a7 7 0 0 1 14 0z', C.amber), rect(52, 58, 14, 3, C.side), P('M46 82h28v4h-28z', '#C9A64B')] },
  water: { layers: [shadow, rect(16, 44, 40, 42, '#A9CBE6'), rect(48, 44, 8, 42, '#6E93B5'), P('M16 44a20 6 0 1 0 40 0a20 6 0 1 0 -40 0z', '#D3E5F3'), rect(16, 62, 40, 3, '#6E93B5'), rect(56, 74, 18, 5, C.dark), P('M36 50c4 5 5 7 5 9a5 5 0 0 1 -10 0c0-2 1-4 5-9z', '#3F7FB8')] },
  power: { layers: [shadow, ...box(4, 54, 40, 32, C.con, C.cside, C.ctop), rect(50, 20, 10, 66, '#C9CED5'), rect(50, 28, 10, 4, C.amber), rect(64, 36, 8, 50, '#C9CED5'), rect(10, 62, 28, 6, C.win)] },
  shop: { layers: [shadow, ...box(6, 52, 60, 34, C.wall, C.side, C.top), P('M4 52h64l-4 10h-56z', C.amber), P('M14 52l-2 10h6l2 -10zM30 52l-1 10h6l1 -10zM46 52v10h6v-10z', C.white), rect(12, 66, 22, 14, C.win), rect(42, 66, 12, 20, C.dark)] },
  sawmill: { layers: [shadow, ...box(6, 58, 40, 28, C.wood, '#6B5038', '#A5835F'), P('M4 58L26 44l22 14z', C.roof), circ(60, 70, 12, C.steel), circ(60, 70, 4, C.dark), rect(48, 80, 26, 6, '#C9A26B'), rect(14, 68, 12, 18, C.dark)] },
  mine: { layers: [shadow, P('M2 86L26 40l14 20 10-12 28 38z', '#6C7480'), P('M26 40l14 20-6 4-12-10z', '#8E97A3'), P('M30 86v-18a8 8 0 0 1 16 0v18z', C.dark), rect(28, 66, 20, 3, C.wood), rect(52, 78, 20, 8, C.amber), circ(57, 86, 3, C.dark), circ(67, 86, 3, C.dark)] },
  factory: { layers: [shadow, rect(6, 56, 62, 30, C.wall), P('M6 56l10 -14v14l10 -14v14l10 -14v14l10 -14v14l10 -14v14z', C.roof), P('M68 56l7 -7v30l-7 7z', C.side), rect(60, 22, 8, 34, '#C9CED5'), rect(60, 28, 8, 3, C.amber), rect(12, 66, 50, 6, C.win), rect(30, 74, 10, 12, C.dark)] },
  port: { layers: [shadow, rect(52, 14, 5, 72, C.amber), rect(20, 14, 54, 4, C.amber), rect(27, 18, 1.5, 32, C.dark), rect(6, 66, 26, 20, C.teal), rect(32, 70, 22, 16, '#C4607A'), rect(16, 50, 24, 14, '#8DB8E8')] },
  bank: { layers: [shadow, rect(10, 54, 56, 22, C.cside), rect(6, 76, 64, 10, C.con), rect(6, 48, 64, 6, C.con), P('M4 48L38 30l34 18z', C.ctop), P('M12 54h6v22h-6zM24 54h6v22h-6zM46 54h6v22h-6zM58 54h6v22h-6z', C.white), rect(33, 62, 10, 14, C.amber)] },
  school: { layers: [shadow, ...box(8, 52, 58, 34, '#E9D9C4', '#B8A68E', '#F3E8D8'), P('M4 52L37 30l33 22z', C.roof), circ(37, 44, 5, C.white), rect(14, 60, 46, 7, C.win), rect(32, 72, 10, 14, C.dark)] },
  clinic: { layers: [shadow, ...box(8, 46, 58, 40, C.white, '#B9C2CC', '#FFFFFF'), P('M33 52h8v6h6v8h-6v6h-8v-6h-6v-8h6z', C.teal), rect(14, 76, 46, 5, '#A9CBE6')] },
  transit: { layers: [shadow, P('M2 54h72l-6 8h-60z', C.roof), P('M12 62h3v24h-3zM60 62h3v24h-3z', C.dark), ...box(18, 66, 40, 16, C.teal, '#2C7A74', '#6CC4BD'), rect(4, 84, 70, 2, C.dark), rect(22, 70, 30, 5, C.white)] },
  broadcast: { layers: [shadow, P('M36 12h4l10 74h-5l-7-52-7 52h-5z', C.steel), rect(27, 40, 22, 3, C.steel), rect(24, 60, 28, 3, C.steel), circ(38, 10, 5, C.amber), ...box(50, 66, 20, 20, C.wall, C.side, C.top), rect(54, 72, 12, 5, C.win)] },

  // ---- Units ----
  infantry: { layers: [shadow, circ(40, 26, 9, '#E3C7A6'), P('M29 24a11 11 0 0 1 22 0z', C.oliveDark), P('M28 38h24l4 26h-8v22h-7v-18h-2v18h-7v-22h-8z', C.olive), rect(54, 20, 3, 46, C.dark), rect(26, 50, 28, 4, C.oliveDark)] },
  armour: { layers: [shadow, P('M6 66h68l-6 18h-56z', C.dark), circ(18, 76, 6, C.steel), circ(32, 76, 6, C.steel), circ(48, 76, 6, C.steel), circ(62, 76, 6, C.steel), P('M10 54h60l4 12h-68z', C.olive), ...box(26, 40, 26, 14, C.olive, C.oliveDark, '#8A9967'), rect(52, 44, 26, 4, C.oliveDark)] },
  artillery: { layers: [shadow, P('M18 58l44-30 5 7-44 30z', C.oliveDark), P('M58 30l12-8 3 5-12 8z', C.dark), circ(30, 72, 14, C.dark), circ(30, 72, 8, C.steel), circ(30, 72, 3, C.dark), P('M30 70l34 14h-10l-26-8z', C.olive)] },

  // ---- Scenery ----
  trees: { layers: [shadow, rect(23, 66, 4, 20, '#5B4636'), circ(25, 56, 13, C.leaf), rect(51, 70, 4, 16, '#5B4636'), circ(53, 62, 11, C.leafDark)] },
  lot: { layers: [P('M12 86a28 4 0 1 0 56 0a28 4 0 1 0 -56 0z', 'rgba(236,233,226,0.12)'), P('M38 60h4v10h10v4h-10v10h-4v-10h-10v-4h10z', 'rgba(236,233,226,0.35)')] },
  site: { layers: [shadow, P('M10 86L40 50l30 36z', '#3A4452'), P('M40 50l30 36h-12z', '#2C3642'), rect(20, 78, 40, 3, C.amber), rect(28, 68, 24, 3, C.amber), rect(38, 30, 3, 22, C.amber), rect(24, 30, 32, 3, C.amber), rect(27, 33, 1.5, 12, C.dark)] },
};

/**
 * Small marks drawn on world-map hexes to show the land type.
 * Each is a path in a 24 × 24 box. Replace with textures later the same way.
 */
export const TERRAIN_MARKS: Record<string, string> = {
  plains: 'M4 16h6M14 12h6M8 20h6',
  farmland: 'M4 10h16M4 14h16M4 18h16',
  forest: 'M7 18V15M7 15l-4 0 4-8 4 8zM16 20v-3M16 17l-4 0 4-8 4 8z',
  hills: 'M2 18c2-6 6-6 8 0M10 18c2-8 8-8 12 0',
  highlands: 'M2 19l6-11 4 6 3-4 7 9z',
  coast: 'M3 12c3-3 5 3 8 0s5 3 8 0M3 18c3-3 5 3 8 0s5 3 8 0',
  river: 'M8 3c6 4-6 8 0 12s2 5 2 6M14 3c6 4-6 8 0 12s2 5 2 6',
  sea: 'M3 12c3-3 5 3 8 0s5 3 8 0',
};
