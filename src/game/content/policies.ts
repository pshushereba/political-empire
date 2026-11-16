import type { FactionId } from '../types';

// Standing policies. Each is a dial with five levels, −2 … +2, that only the
// daily question can move. Unlike the one-off effects of an answer, a policy
// keeps acting every turn until another answer moves it again.

export type PolicyId = 'tax' | 'education' | 'health' | 'welfare';

export interface PolicyLevel {
  name: string;
  /** Multiplier on income from businesses. */
  business?: number;
  /** Multiplier on taxes from wages. */
  wages?: number;
  approval?: number;
  /** Added to the level stability settles at. */
  stability?: number;
  /** Percentage points of population growth per turn. */
  growth?: number;
  /** Influence per turn. */
  influence?: number;
  /** Multiplier on the cost of buildings. */
  buildCost?: number;
  /** Treasury per turn for each million people. Negative is a saving. */
  spend?: number;
  /** A faction whose approval moves one point a turn toward a value while the policy stands. */
  drift?: { faction: FactionId; toward: number };
}

export interface PolicyDef {
  id: PolicyId;
  name: string;
  /** What moving it up or down a level is called, for effect chips. */
  up: string;
  down: string;
  blurb: string;
  /** Index 0 is level −2; index 2 is the neutral starting level. */
  levels: [PolicyLevel, PolicyLevel, PolicyLevel, PolicyLevel, PolicyLevel];
}

export const POLICIES: PolicyDef[] = [
  {
    id: 'tax', name: 'Taxes', up: 'Taxes raised a level', down: 'Taxes cut a level',
    blurb: 'How much the state takes from businesses and wages. More businesses make each step worth more.',
    levels: [
      { name: 'Tax haven', business: 0.7, wages: 0.7, approval: 3, drift: { faction: 'merchants', toward: 80 } },
      { name: 'Low taxes', business: 0.85, wages: 0.85, approval: 1.5, drift: { faction: 'merchants', toward: 65 } },
      { name: 'Moderate taxes' },
      { name: 'High taxes', business: 1.15, wages: 1.15, approval: -1.5, drift: { faction: 'merchants', toward: 35 } },
      { name: 'Punishing taxes', business: 1.3, wages: 1.3, approval: -3, drift: { faction: 'merchants', toward: 20 } },
    ],
  },
  {
    id: 'education', name: 'Schooling', up: 'Schooling improved a level', down: 'Schooling cut a level',
    blurb: 'How well the population is taught. An unschooled people runs poorer businesses, builds badly and carries no weight abroad.',
    levels: [
      { name: 'Unschooled', business: 0.82, influence: -2, buildCost: 1.15, spend: -3 },
      { name: 'Poorly schooled', business: 0.92, influence: -1, buildCost: 1.06, spend: -1.5 },
      { name: 'Basic schooling' },
      { name: 'Well schooled', business: 1.07, influence: 1, buildCost: 0.96, spend: 3 },
      { name: 'Learned', business: 1.15, influence: 2, buildCost: 0.92, spend: 7 },
    ],
  },
  {
    id: 'health', name: 'Public health', up: 'Public health improved a level', down: 'Public health cut a level',
    blurb: 'Doctors, clean water and hospitals. A sick nation grows slowly and is quick to anger.',
    levels: [
      { name: 'No public health', growth: -1.5, stability: -5, spend: -3 },
      { name: 'Neglected', growth: -0.7, stability: -2, spend: -1.5 },
      { name: 'Basic care' },
      { name: 'Good care', growth: 0.5, approval: 1, spend: 3 },
      { name: 'Care for all', growth: 1, approval: 2, spend: 7 },
    ],
  },
  {
    id: 'welfare', name: 'Workers’ protections', up: 'Workers’ protections strengthened a level', down: 'Workers’ protections weakened a level',
    blurb: 'Wages, hours and pensions. Protections cost businesses money and buy peace on the docks.',
    levels: [
      { name: 'Sink or swim', business: 1.1, approval: -3, drift: { faction: 'dockworkers', toward: 20 } },
      { name: 'Few protections', business: 1.05, approval: -1.5, drift: { faction: 'dockworkers', toward: 35 } },
      { name: 'Some protections' },
      { name: 'Strong protections', business: 0.95, approval: 1.5, spend: 2, drift: { faction: 'dockworkers', toward: 65 } },
      { name: 'Cradle to grave', business: 0.9, approval: 3, spend: 5, drift: { faction: 'dockworkers', toward: 80 } },
    ],
  },
];

export const POLICY_IDS: PolicyId[] = POLICIES.map((p) => p.id);
export const POLICY_BY_ID = Object.fromEntries(POLICIES.map((p) => [p.id, p])) as Record<PolicyId, PolicyDef>;

export const policyLevel = (id: PolicyId, level: number): PolicyLevel => POLICY_BY_ID[id].levels[Math.max(-2, Math.min(2, Math.round(level))) + 2];

export interface PolicyTotals {
  business: number;
  wages: number;
  approval: number;
  stability: number;
  growth: number;
  influence: number;
  buildCost: number;
  /** Treasury per million people per turn. */
  spend: number;
}

/** Everything a nation's standing policies add up to. */
export function policyTotals(policies: Record<PolicyId, number>): PolicyTotals {
  const t: PolicyTotals = { business: 1, wages: 1, approval: 0, stability: 0, growth: 0, influence: 0, buildCost: 1, spend: 0 };
  for (const id of POLICY_IDS) {
    const l = policyLevel(id, policies[id]);
    t.business *= l.business ?? 1;
    t.wages *= l.wages ?? 1;
    t.buildCost *= l.buildCost ?? 1;
    t.approval += l.approval ?? 0;
    t.stability += l.stability ?? 0;
    t.growth += l.growth ?? 0;
    t.influence += l.influence ?? 0;
    t.spend += l.spend ?? 0;
  }
  return t;
}
