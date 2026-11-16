import type { AxisId, FactionId, Flag, Personality, Terrain, UnitId } from '../types';

// ---- Terrain -------------------------------------------------------------

export interface TerrainDef {
  name: string;
  /** Per-turn yields of an owned hex. */
  income: number;
  supply: number;
  /** Multiplier on the defender's strength. */
  defence: number;
  /** Armour fights at this multiplier when attacking into the hex. */
  armour: number;
}

export const TERRAIN: Record<Terrain, TerrainDef> = {
  plains: { name: 'Plains', income: 1, supply: 1, defence: 1, armour: 1 },
  farmland: { name: 'Farmland', income: 1, supply: 2, defence: 1, armour: 1 },
  forest: { name: 'Forest', income: 2, supply: 0, defence: 1.25, armour: 0.6 },
  hills: { name: 'Hills', income: 2, supply: 0, defence: 1.25, armour: 0.8 },
  highlands: { name: 'Highlands', income: 1, supply: 0, defence: 1.5, armour: 0.6 },
  coast: { name: 'Coast', income: 2, supply: 1, defence: 1, armour: 1 },
  river: { name: 'River', income: 1, supply: 2, defence: 1.15, armour: 0.8 },
  sea: { name: 'Sea', income: 0, supply: 0, defence: 1, armour: 1 },
};

// ---- Units ---------------------------------------------------------------

export interface UnitDef {
  id: UnitId;
  name: string;
  plural: string;
  cost: number;
  upkeep: number;
  attack: number;
  defence: number;
  /** Hexes per turn. An army moves at the pace of its slowest unit. */
  move: number;
  era: number;
  /** A finished building of this type must exist somewhere in the nation. */
  needsBuilding?: string;
  desc: string;
}

export const UNITS: UnitDef[] = [
  { id: 'infantry', name: 'Infantry', plural: 'infantry', cost: 60, upkeep: 4, attack: 3, defence: 3, move: 2, era: 0,
    desc: 'Cheap and steady. Holds ground anywhere.' },
  { id: 'armour', name: 'Armour', plural: 'armour', cost: 150, upkeep: 9, attack: 8, defence: 5, move: 3, era: 1, needsBuilding: 'factory',
    desc: 'Fast and hard-hitting on open ground. Weak in forest and highlands. Needs a factory.' },
  { id: 'artillery', name: 'Artillery', plural: 'artillery', cost: 120, upkeep: 7, attack: 6, defence: 1, move: 2, era: 2,
    desc: 'Halves the value of walls and garrisons. Helpless if caught alone.' },
];

export const UNIT_BY_ID = Object.fromEntries(UNITS.map((u) => [u.id, u])) as Record<UnitId, UnitDef>;
export const UNIT_IDS: UnitId[] = ['infantry', 'armour', 'artillery'];
export const MAX_STACK = 8;

// ---- Eras ----------------------------------------------------------------

export interface EraDef {
  name: string;
  short: string;
  note: string;
  /** Needed to enter this era. */
  hexes: number;
  population: number;
}

export const ERAS: EraDef[] = [
  { name: 'Founding', short: 'Founding', note: 'A capital, a flag, and a ring of land around it.', hexes: 0, population: 0 },
  { name: 'First Era · The Assembly', short: 'First Era', note: 'Factories, ports, banks and armour.', hexes: 22, population: 1_400_000 },
  { name: 'Second Era · Trade & Tension', short: 'Second Era', note: 'Power stations, broadcasting and artillery.', hexes: 26, population: 2_400_000 },
  { name: 'Third Era · Age of Empire', short: 'Third Era', note: 'A power that others must answer to.', hexes: 40, population: 4_000_000 },
];

// ---- Ideology ------------------------------------------------------------

export interface AxisDef {
  id: AxisId;
  low: string;
  high: string;
  lowEffect: string;
  highEffect: string;
}

export const AXES: AxisDef[] = [
  { id: 'liberty', low: 'Authority', high: 'Liberty',
    lowEffect: 'Army upkeep and recruitment cost less', highEffect: 'Higher approval and more influence' },
  { id: 'market', low: 'Collective', high: 'Market',
    lowEffect: 'More supply and higher approval', highEffect: 'Businesses earn more' },
  { id: 'reform', low: 'Tradition', high: 'Reform',
    lowEffect: 'A steadier, more stable state', highEffect: 'Buildings cost less' },
  { id: 'openness', low: 'Isolation', high: 'Openness',
    lowEffect: 'Your land is harder to invade', highEffect: 'Trade pacts pay more; more influence' },
];

export const AXIS_IDS: AxisId[] = ['liberty', 'market', 'reform', 'openness'];

/** Founding answers: option index → starting axis value. */
export const FOUNDING_VALUES = [22, 50, 78];

export const FOUNDING_QUESTIONS: { axis: AxisId; question: string; options: string[] }[] = [
  { axis: 'liberty', question: 'Who should hold power?', options: ['One strong leader', 'A council of elders', 'The people, by vote'] },
  { axis: 'market', question: 'Who owns the harvest?', options: ['The state shares it', 'Guilds and towns', 'Whoever grows it'] },
  { axis: 'reform', question: 'What of the old ways?', options: ['Keep them', 'Adapt them', 'Replace them'] },
  { axis: 'openness', question: 'Strangers at the border?', options: ['Close the gates', 'Trade only', 'Welcome them'] },
];

export const STARTING_LANDS = [
  { id: 'coast' as const, name: 'Coast', tradeoff: 'Trade comes easily: +10% income. Open to the sea, and to visitors.' },
  { id: 'river' as const, name: 'River valley', tradeoff: 'Rich soil: +4 supply, so the population grows faster.' },
  { id: 'highlands' as const, name: 'Highlands', tradeoff: 'Hard to invade: +20% defence. Thin soil: −2 supply.' },
];

export const FLAG_PAIRS = [
  { name: 'Amber and navy', a: '#E8A33D', b: '#1F3A5F' },
  { name: 'Teal and black', a: '#3FA7A0', b: '#0E1217' },
  { name: 'Rose and ivory', a: '#C4607A', b: '#ECE9E2' },
  { name: 'Sky and umber', a: '#8DB8E8', b: '#5B3A1E' },
];

// ---- Factions ------------------------------------------------------------

export const FACTIONS: { id: FactionId; name: string; color: string; effect: string }[] = [
  { id: 'merchants', name: 'Merchant Houses', color: '#7FD1A8', effect: 'income' },
  { id: 'settlers', name: 'Frontier Settlers', color: '#8DB8E8', effect: 'population growth' },
  { id: 'clergy', name: 'Old Clergy', color: '#B9A6E0', effect: 'stability' },
  { id: 'dockworkers', name: 'Dockworkers’ Guild', color: '#F0A07A', effect: 'supply' },
];

export const FACTION_IDS: FactionId[] = ['merchants', 'settlers', 'clergy', 'dockworkers'];

// ---- The starting world --------------------------------------------------

/** Every nation starts with the land hexes within this distance of its capital. */
export const START_RADIUS = 2;

/**
 * Nation colours, in the order nations are seated. The first player is always
 * amber. Chosen to stay apart in both hue and lightness on the dark map, where
 * rivals are drawn at reduced opacity. Mirrors `color.nation` in docs/design-tokens.json.
 */
export const NATION_COLORS: { name: string; hex: string }[] = [
  { name: 'Amber', hex: '#E8A33D' },
  { name: 'Teal', hex: '#3FA7A0' },
  { name: 'Rose', hex: '#C4607A' },
  { name: 'Sky', hex: '#8DB8E8' },
  { name: 'Violet', hex: '#9B8AE0' },
  { name: 'Lime', hex: '#A7C957' },
  { name: 'Coral', hex: '#E36F4C' },
  { name: 'Sand', hex: '#D9C9A3' },
  { name: 'Orchid', hex: '#C567C9' },
  { name: 'Cobalt', hex: '#5878D8' },
  { name: 'Fern', hex: '#4E9B63' },
  { name: 'Copper', hex: '#B5784A' },
];

/** Names for nations whose player leaves the name blank, by seat. */
export const DEFAULT_NAMES = [
  'Republic of Veyra', 'Commonwealth of Arden', 'Union of Sorrel', 'League of Thane', 'Realm of Calder', 'Free State of Wren',
  'Dominion of Isk', 'Federation of Marrow', 'Principality of Oriel', 'Assembly of Pell', 'Kingdom of Rook', 'Provinces of Senn',
];

export interface RivalDef {
  id: string;
  name: string;
  short: string;
  motto: string;
  description: string;
  flag: Flag['pattern'];
  axes: Record<AxisId, number>;
  personality: Personality;
  /** How it regards players when the game begins. */
  stance: number;
}

/**
 * Computer-run nations. A world takes as many as it has empty seats, from the
 * top of this list, so the first three appear in every solo game.
 */
export const RIVAL_POOL: RivalDef[] = [
  { id: 'ostmark', name: 'Ostmark Union', short: 'Ostmark', motto: 'Many hands, one hammer', flag: 'bands',
    description: 'A federation of mining towns ruled by a federal council. Exports iron and timber.',
    axes: { liberty: 34, market: 40, reform: 30, openness: 58 }, personality: { aggression: 0.35, expansion: 0.6 }, stance: 30 },
  { id: 'kesh', name: 'Kesh Directorate', short: 'Kesh', motto: 'Order is mercy', flag: 'canton',
    description: 'A disciplined state run by five Directors. It keeps a large army and few friends.',
    axes: { liberty: 16, market: 30, reform: 55, openness: 20 }, personality: { aggression: 0.7, expansion: 0.5 }, stance: -45 },
  { id: 'lune', name: 'Free Cities of Lune', short: 'Lune', motto: 'Every harbour its own master', flag: 'tricolour',
    description: 'A league of merchant cities. Rich, proud, and slow to trust anyone.',
    axes: { liberty: 72, market: 80, reform: 62, openness: 66 }, personality: { aggression: 0.2, expansion: 0.8 }, stance: -5 },
  { id: 'varn', name: 'Varn Compact', short: 'Varn', motto: 'What is grown is shared', flag: 'bands',
    description: 'Farming communes bound by a single charter. Generous to friends, stubborn with everyone.',
    axes: { liberty: 70, market: 20, reform: 58, openness: 44 }, personality: { aggression: 0.25, expansion: 0.45 }, stance: 10 },
  { id: 'thessaly', name: 'Crown of Thessaly', short: 'Thessaly', motto: 'As it was, so it shall be', flag: 'canton',
    description: 'Seven old families and a crown that passes between them. Patient, proud, and long in memory.',
    axes: { liberty: 30, market: 55, reform: 18, openness: 40 }, personality: { aggression: 0.4, expansion: 0.4 }, stance: 0 },
  { id: 'azhar', name: 'Dominion of Azhar', short: 'Azhar', motto: 'The strong hand feeds', flag: 'tricolour',
    description: 'One marshal, one army, one answer to every question. It respects only what it cannot take.',
    axes: { liberty: 10, market: 45, reform: 35, openness: 28 }, personality: { aggression: 0.85, expansion: 0.7 }, stance: -35 },
  { id: 'halden', name: 'Halden Confederacy', short: 'Halden', motto: 'Slowly, and together', flag: 'bands',
    description: 'A dozen cantons that vote on everything, twice. Hard to provoke and harder to rush.',
    axes: { liberty: 76, market: 52, reform: 48, openness: 60 }, personality: { aggression: 0.15, expansion: 0.5 }, stance: 20 },
  { id: 'orrin', name: 'Order of Saint Orrin', short: 'Orrin', motto: 'Keep the lamp', flag: 'canton',
    description: 'A monastic state behind high walls. It wants nothing from the world except to be left out of it.',
    axes: { liberty: 26, market: 35, reform: 10, openness: 12 }, personality: { aggression: 0.3, expansion: 0.25 }, stance: -15 },
  { id: 'meridian', name: 'Meridian Syndicate', short: 'Meridian', motto: 'Everything has a price', flag: 'tricolour',
    description: 'A trading company that outgrew its charter and bought a country. Friendly while the ledgers agree.',
    axes: { liberty: 64, market: 90, reform: 70, openness: 82 }, personality: { aggression: 0.45, expansion: 0.75 }, stance: 15 },
  { id: 'brakka', name: 'People’s State of Brakka', short: 'Brakka', motto: 'The plan provides', flag: 'bands',
    description: 'One party, one plan, and a great many chimneys. Suspicious of anyone it cannot count.',
    axes: { liberty: 30, market: 18, reform: 76, openness: 30 }, personality: { aggression: 0.55, expansion: 0.6 }, stance: -20 },
  { id: 'tov', name: 'Marches of Tov', short: 'Tov', motto: 'Hold the line', flag: 'canton',
    description: 'Border lords who have been invaded from every direction and intend never to be again.',
    axes: { liberty: 48, market: 46, reform: 32, openness: 22 }, personality: { aggression: 0.3, expansion: 0.3 }, stance: -5 },
];

// ---- Balance numbers -----------------------------------------------------

export const BALANCE = {
  startTreasury: 350,
  startInfluence: 20,
  startPopulation: 1_000_000,
  startStability: 60,
  startInfantry: 3,
  baseIncome: 15,
  incomePerMillion: 12,
  tradePactIncome: 10,
  supplyPerMillion: 8,
  /** Supply every capital produces on its own. */
  baseSupply: 4,
  baseInfluence: 2,
  militia: 3,
  capitalMilitia: 10,
  capitalDefence: 1.25,
  /** Defence multiplier for a hex with no friendly land beside it. */
  cutOffDefence: 0.6,
  /** A nation holding this share of the land frightens everyone else. */
  threatShare: 0.35,
  /** …or, in a larger world, this many times its fair share. The smaller of the two applies. */
  threatFairShares: 1.4,
  /** Share of land hexes needed for a hegemony victory. */
  hegemonyShare: 0.6,
  /** In a larger world: this many times a fair share of the land, but never less than `hegemonyFloor`. */
  hegemonyFairShares: 2.4,
  hegemonyFloor: 0.3,
  unrestBelow: 25,
  claimBase: 8,
  /** Stability lost when a timed question runs out and the council answers for you. */
  indecision: 3,
  /** Turns an unanswered proposal between players stays open. */
  proposalTurns: 2,
  /** Stability lost when the form of government changes. */
  upheaval: 5,
  /** Daily return bonus: per day of the run, up to the cap. */
  streakTreasury: 30,
  streakInfluence: 4,
  streakCap: 5,
  /** Rivals won't declare war on the player before this turn. */
  playerGraceTurns: 20,
  /** Each building a nation owns makes the next one this much dearer. */
  buildInflation: 0.04,
  /** Relations sour by this much between neighbours with no pact. */
  borderFriction: 8,
};
