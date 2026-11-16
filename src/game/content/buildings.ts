import type { BuildingCategory, BuildingId, Terrain } from '../types';
import type { GovernmentId } from './governments';

/** A gain or loss for each matching finished building on the same hex or a neighbouring one. */
export interface Synergy {
  near: BuildingId[];
  income?: number;
  supply?: number;
  security?: number;
  approval?: number;
  /** Counts at most this many neighbours. */
  max: number;
  why: string;
}

export interface BuildingDef {
  id: BuildingId;
  name: string;
  category: BuildingCategory;
  cost: number;
  turns: number;
  desc: string;
  /** Per-turn output once finished. */
  income?: number;
  supply?: number;
  /** Adds to the hex's defence in battle. */
  security?: number;
  approval?: number;
  influence?: number;
  /** Land the hex must have. 'capital' means the capital hex. */
  needs?: (Terrain | 'capital')[];
  /** Era index at which it unlocks. */
  era: number;
  /** At most one in the whole nation. */
  unique?: boolean;
  /** Units can be recruited on this hex. */
  recruits?: boolean;
  /** Placement bonuses and penalties. */
  synergies?: Synergy[];
  /** Only these forms of government may build it. Existing ones keep working after a change of government. */
  governments?: GovernmentId[];
}

export const LOTS_PER_HEX = 2;

export const BUILDINGS: BuildingDef[] = [
  // Security
  { id: 'checkpoint', name: 'Border checkpoint', category: 'security', cost: 70, turns: 1, security: 2, income: 1, era: 0,
    synergies: [{ near: ['garrison'], security: 1, max: 1, why: 'Backed by a garrison' }],
    desc: 'Controls who crosses. Collects tariffs on the way.' },
  { id: 'wall', name: 'Fortified wall', category: 'security', cost: 200, turns: 3, security: 6, approval: -1, era: 0,
    synergies: [{ near: ['garrison'], security: 2, max: 1, why: 'Manned by a garrison' }],
    desc: 'Reinforced concrete. Safe, but it makes neighbours nervous.' },
  { id: 'garrison', name: 'Garrison', category: 'security', cost: 220, turns: 2, security: 4, era: 0, recruits: true,
    desc: 'A standing post that answers to the capital. Troops can be raised here.' },

  // Utilities
  { id: 'farm', name: 'Farm co-operative', category: 'utilities', cost: 80, turns: 1, supply: 3, era: 0, needs: ['farmland', 'plains'],
    synergies: [{ near: ['water', 'granary'], supply: 1, max: 2, why: 'Irrigation and storage nearby' }],
    desc: 'Pooled land and shared machinery. Feeds the cities.' },
  { id: 'water', name: 'Water works', category: 'utilities', cost: 120, turns: 2, supply: 4, approval: 1, era: 0, needs: ['river', 'coast'],
    desc: 'Clean water lets the population grow.' },
  { id: 'power', name: 'Power station', category: 'utilities', cost: 220, turns: 3, supply: 6, approval: -1, era: 2,
    desc: 'Powers every business around it.' },

  // Commerce: the businesses that fund the state
  { id: 'shop', name: 'Market street', category: 'commerce', cost: 80, turns: 1, income: 7, era: 0,
    synergies: [{ near: ['clinic', 'school', 'transit'], income: 2, max: 3, why: 'Customers from nearby services' }],
    desc: 'Small businesses for the local population.' },
  { id: 'sawmill', name: 'Timber yard', category: 'commerce', cost: 100, turns: 2, income: 8, supply: 1, era: 0, needs: ['forest'],
    synergies: [{ near: ['factory'], income: 3, max: 1, why: 'Sells timber to a factory' }],
    desc: 'Timber for building and for export.' },
  { id: 'mine', name: 'Mine', category: 'commerce', cost: 140, turns: 2, income: 12, approval: -1, era: 0, needs: ['hills', 'highlands'],
    synergies: [{ near: ['factory', 'power'], income: 3, max: 2, why: 'Buyers for ore and coal' }],
    desc: 'Iron and coal. Hard work and good money.' },
  { id: 'factory', name: 'Factory', category: 'commerce', cost: 180, turns: 3, income: 13, supply: 2, approval: -1, era: 1,
    synergies: [{ near: ['mine', 'sawmill', 'power'], income: 3, max: 3, why: 'Raw materials and power nearby' }],
    desc: 'Jobs and goods. Needed to build armour.' },
  { id: 'port', name: 'Port terminal', category: 'commerce', cost: 240, turns: 3, income: 18, supply: 2, era: 1, needs: ['coast'],
    synergies: [{ near: ['factory', 'shop'], income: 2, max: 3, why: 'Goods to ship' }],
    desc: 'Ships from other nations dock here.' },
  { id: 'bank', name: 'Bank', category: 'commerce', cost: 300, turns: 3, income: 26, era: 1, needs: ['capital'], unique: true,
    synergies: [{ near: ['shop', 'port', 'exchange'], income: 3, max: 3, why: 'Businesses to lend to' }],
    desc: 'Loans for merchants. The Merchant Houses approve.' },

  // Services
  { id: 'clinic', name: 'Clinic', category: 'services', cost: 120, turns: 2, approval: 3, era: 0,
    synergies: [{ near: ['factory', 'mine', 'power'], approval: -1, max: 2, why: 'Smoke from heavy industry' }],
    desc: 'Fewer sick days, less unrest.' },
  { id: 'school', name: 'School', category: 'services', cost: 140, turns: 2, approval: 2, influence: 1, era: 0,
    synergies: [{ near: ['factory', 'mine', 'power'], approval: -1, max: 2, why: 'Smoke from heavy industry' }],
    desc: 'A literate people argues better, at home and abroad.' },
  { id: 'transit', name: 'Transit station', category: 'services', cost: 160, turns: 2, approval: 2, income: 3, era: 1,
    synergies: [{ near: ['shop', 'factory', 'port'], income: 1, max: 3, why: 'Commuters and freight' }],
    desc: 'Links this hex to the rest of the nation.' },
  { id: 'broadcast', name: 'Broadcast tower', category: 'services', cost: 240, turns: 3, influence: 3, approval: 1, era: 2,
    desc: 'Your nation’s voice, heard across every border.' },

  // Only certain forms of government can build these
  { id: 'police', name: 'Security bureau', category: 'security', cost: 160, turns: 2, security: 2, approval: 4, influence: -1, era: 0,
    governments: ['dictatorship', 'oneparty'],
    desc: 'Files on everyone. Order through watchfulness.' },
  { id: 'palace', name: 'Grand palace', category: 'services', cost: 260, turns: 3, approval: 2, influence: 3, era: 0, needs: ['capital'], unique: true,
    governments: ['dictatorship', 'aristocracy'],
    desc: 'Marble, mirrors and a very long staircase.' },
  { id: 'assembly', name: 'Assembly hall', category: 'services', cost: 200, turns: 3, approval: 3, influence: 2, era: 0, needs: ['capital'], unique: true,
    governments: ['council', 'democracy', 'commune'],
    desc: 'Where the nation argues with itself in public.' },
  { id: 'exchange', name: 'Stock exchange', category: 'commerce', cost: 280, turns: 3, income: 20, era: 1, unique: true,
    governments: ['merchant', 'democracy'],
    synergies: [{ near: ['bank', 'port', 'factory'], income: 3, max: 3, why: 'Companies to list' }],
    desc: 'Fortunes made and lost before lunch.' },
  { id: 'granary', name: 'People’s granary', category: 'utilities', cost: 140, turns: 2, supply: 6, approval: 1, era: 0,
    governments: ['commune', 'oneparty'],
    desc: 'Stores the harvest and shares it out by need.' },
];

export const BUILDING_BY_ID: Record<BuildingId, BuildingDef> = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));

export const CATEGORIES: { id: BuildingCategory; name: string }[] = [
  { id: 'commerce', name: 'Commerce' },
  { id: 'utilities', name: 'Utilities' },
  { id: 'security', name: 'Security' },
  { id: 'services', name: 'Services' },
];
