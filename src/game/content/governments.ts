import type { AxisId, Effect, UnitId } from '../types';

// Forms of government. A nation's form follows from its ideology axes, so the
// daily question decides it. Each form changes the rules: standing modifiers,
// what going to war costs, which buildings may be built, and a set of powers
// (actions with a cooldown) that only that kind of state can use.

export type GovernmentId = 'dictatorship' | 'aristocracy' | 'oneparty' | 'council' | 'democracy' | 'merchant' | 'commune';

export interface PowerDef {
  id: string;
  name: string;
  desc: string;
  /** Turns before it can be used again. */
  cooldown: number;
  cost?: { treasury?: number; influence?: number };
  effects: Effect[];
  /** Things a plain stat change can't express. */
  special?: { kind: 'units'; unit: UnitId; count: number } | { kind: 'rush'; turns: number };
}

export interface GovernmentDef {
  id: GovernmentId;
  name: string;
  blurb: string;
  /** How to get here, in words. */
  path: string;
  /** Standing modifiers. `*Mult` keys multiply; the rest add. */
  mods: Partial<Record<'incomeMult' | 'commerceMult' | 'supplyMult' | 'upkeepMult' | 'recruitMult' | 'buildCostMult' | 'defenceMult' | 'tradeMult' | 'approval' | 'influence' | 'stability', number>>;
  /** Stability lost when declaring war. */
  warStability: number;
  /** Stability needed before war can be declared at all. */
  warNeedsStability: number;
  /** Border hexes start breaking away below this stability. */
  unrestBelow: number;
  /** Rules that aren't visible in `mods`, for the player to read. */
  notes: string[];
  powers: PowerDef[];
}

const DEFAULTS = { warStability: 4, warNeedsStability: 0, unrestBelow: 25 };

export const GOVERNMENTS: GovernmentDef[] = [
  {
    id: 'dictatorship', name: 'Dictatorship', path: 'Authority at its extreme (Liberty 22 or below)',
    blurb: 'One will, obeyed. The state can do almost anything quickly, until the day it can do nothing at all.',
    mods: { upkeepMult: 0.85, influence: -1 }, ...DEFAULTS, warStability: 0, unrestBelow: 35,
    notes: ['War can be declared without asking anyone: no stability cost', 'Control is brittle: unrest starts below 35% stability instead of 25%', 'Can build the Security bureau and the Grand palace'],
    powers: [
      { id: 'conscript', name: 'Conscript the young', desc: 'Two infantry appear at the capital at once, unpaid for.', cooldown: 5,
        effects: [{ target: 'stability', delta: -6 }, { target: 'settlers', delta: -5 }], special: { kind: 'units', unit: 'infantry', count: 2 } },
      { id: 'crackdown', name: 'Crack down', desc: 'Curfews and arrests. Order returns today; resentment arrives later.', cooldown: 6,
        effects: [{ target: 'stability', delta: 14 }, { target: 'dockworkers', delta: -6 }, { target: 'settlers', delta: -6 }, { target: 'merchants', delta: -4 }] },
      { id: 'seize', name: 'Seize private assets', desc: 'The treasury takes what it needs from those who have it.', cooldown: 8,
        effects: [{ target: 'treasury', delta: 160 }, { target: 'merchants', delta: -15 }, { target: 'market', delta: -4 }] },
    ],
  },
  {
    id: 'aristocracy', name: 'Aristocracy', path: 'Authority with tradition (Liberty 23–42, Reform below 50)',
    blurb: 'Old families rule by right of birth. Slow to change, hard to shake.',
    mods: { stability: 5, buildCostMult: 1.1, defenceMult: 1.1 }, ...DEFAULTS, warStability: 2,
    notes: ['The estates fight for their own land: +10% defence', 'Nothing gets built without a family’s blessing: buildings cost 10% more', 'Can build the Grand palace'],
    powers: [
      { id: 'levy', name: 'Levy the estates', desc: 'Call in what the great families owe the crown.', cooldown: 6,
        effects: [{ target: 'treasury', delta: 110 }, { target: 'settlers', delta: -8 }] },
      { id: 'patronage', name: 'Court patronage', desc: 'Titles, feasts and favours for those who matter.', cooldown: 6, cost: { treasury: 80 },
        effects: [{ target: 'stability', delta: 6 }, { target: 'clergy', delta: 10 }, { target: 'merchants', delta: 6 }] },
      { id: 'marriage', name: 'Arrange a dynastic marriage', desc: 'Bind your house to the ruling houses abroad.', cooldown: 10, cost: { influence: 25 },
        effects: [{ target: 'relations', delta: 10 }] },
    ],
  },
  {
    id: 'oneparty', name: 'One-party state', path: 'Authority with reform (Liberty 23–42, Reform 50 or above)',
    blurb: 'The Party plans, the nation builds. Dissent is a scheduling problem.',
    mods: { buildCostMult: 0.9, approval: -2 }, ...DEFAULTS, warStability: 2, unrestBelow: 30,
    notes: ['The plan comes first: buildings cost 10% less', 'Can build the Security bureau and the People’s granary'],
    powers: [
      { id: 'plan', name: 'Launch a crash programme', desc: 'Every building site in the nation is finished overnight.', cooldown: 8, cost: { treasury: 60 },
        effects: [{ target: 'dockworkers', delta: -6 }], special: { kind: 'rush', turns: 99 } },
      { id: 'purge', name: 'Purge the ministries', desc: 'Remove the doubters. The survivors are very loyal.', cooldown: 8,
        effects: [{ target: 'stability', delta: 8 }, { target: 'influence', delta: -8 }, { target: 'clergy', delta: -6 }, { target: 'liberty', delta: -3 }] },
    ],
  },
  {
    id: 'council', name: 'Council republic', path: 'The middle road (Liberty 43–59)',
    blurb: 'An elected council that argues a great deal and offends no one for long.',
    mods: {}, ...DEFAULTS,
    notes: ['No strengths and no weaknesses', 'Can build the Assembly hall'],
    powers: [
      { id: 'assembly', name: 'Call a special assembly', desc: 'Let the council talk it out in public.', cooldown: 5, cost: { influence: 15 },
        effects: [{ target: 'stability', delta: 6 }] },
    ],
  },
  {
    id: 'democracy', name: 'Democracy', path: 'Liberty 60 or above, with a mixed economy',
    blurb: 'The people rule themselves. They are slow to anger and slower to march.',
    mods: { approval: 2, influence: 1 }, ...DEFAULTS, warStability: 8, warNeedsStability: 50,
    notes: ['The public must consent to war: needs 50% stability, and costs 8', 'Can build the Assembly hall and the Stock exchange'],
    powers: [
      { id: 'referendum', name: 'Hold a referendum', desc: 'Put the question to the people and abide by the answer.', cooldown: 6, cost: { influence: 20 },
        effects: [{ target: 'stability', delta: 9 }, { target: 'dockworkers', delta: 4 }, { target: 'settlers', delta: 4 }] },
      { id: 'campaign', name: 'Send a goodwill mission', desc: 'Writers, athletes and doctors, sent abroad under your flag.', cooldown: 8, cost: { treasury: 60 },
        effects: [{ target: 'influence', delta: 20 }, { target: 'relations', delta: 5 }] },
    ],
  },
  {
    id: 'merchant', name: 'Merchant republic', path: 'Liberty 60 or above and Market 65 or above',
    blurb: 'Government by those who can afford it. Everything has a price, including the army.',
    mods: { commerceMult: 1.1, tradeMult: 1.25, upkeepMult: 1.1 }, ...DEFAULTS, warStability: 6,
    notes: ['War is bad for business: declaring it costs 6 stability', 'Soldiers expect to be paid properly: upkeep +10%', 'Can build the Stock exchange'],
    powers: [
      { id: 'bonds', name: 'Issue war bonds', desc: 'Borrow from your own merchants against future goodwill.', cooldown: 8, cost: { influence: 10 },
        effects: [{ target: 'treasury', delta: 180 }, { target: 'merchants', delta: -6 }] },
      { id: 'mercenaries', name: 'Hire mercenaries', desc: 'Two infantry at the capital today, for cash.', cooldown: 5, cost: { treasury: 150 },
        effects: [], special: { kind: 'units', unit: 'infantry', count: 2 } },
    ],
  },
  {
    id: 'commune', name: 'Commune', path: 'Liberty 60 or above and Market 35 or below',
    blurb: 'Everything is shared, including the work. Nobody goes hungry and nobody gets rich.',
    mods: { supplyMult: 1.15, commerceMult: 0.9, approval: 1 }, ...DEFAULTS, warStability: 6,
    notes: ['Shared granaries: +15% supply', 'Private trade is frowned on: businesses earn 10% less', 'Can build the People’s granary and the Assembly hall'],
    powers: [
      { id: 'mobilise', name: 'Call a work brigade', desc: 'Volunteers take two turns off every building site.', cooldown: 6,
        effects: [{ target: 'merchants', delta: -4 }], special: { kind: 'rush', turns: 2 } },
      { id: 'solidarity', name: 'Declare a day of solidarity', desc: 'No work, shared tables, long speeches.', cooldown: 6, cost: { treasury: 40 },
        effects: [{ target: 'stability', delta: 7 }, { target: 'dockworkers', delta: 8 }] },
    ],
  },
];

export const GOVERNMENT_BY_ID = Object.fromEntries(GOVERNMENTS.map((g) => [g.id, g])) as Record<GovernmentId, GovernmentDef>;

/** The form of government a set of ideology axes produces. */
export function governmentFor(axes: Record<AxisId, number>): GovernmentId {
  const { liberty, market, reform } = axes;
  if (liberty <= 22) return 'dictatorship';
  if (liberty <= 42) return reform < 50 ? 'aristocracy' : 'oneparty';
  if (liberty < 60) return 'council';
  if (market >= 65) return 'merchant';
  if (market <= 35) return 'commune';
  return 'democracy';
}
