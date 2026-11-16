import type { Effect } from '../types';

// Objectives give the player something to aim for in the next few turns.
// Three are active at a time, taken in order from this list. Each is a metric
// and a target; the metrics are computed in ../objectives.ts.

export type Metric =
  | 'hexes' | 'population' | 'stability' | 'netIncome' | 'units' | 'buildings' | 'building'
  | 'pacts' | 'battlesWon' | 'capitalsTaken' | 'era' | 'decisions' | 'powersUsed' | 'placementBonuses';

export interface ObjectiveDef {
  id: string;
  title: string;
  desc: string;
  metric: Metric;
  /** For metric 'building': the building id. */
  arg?: string;
  target: number;
  reward: Effect[];
}

export const ACTIVE_OBJECTIVES = 3;

export const OBJECTIVES: ObjectiveDef[] = [
  { id: 'first-works', title: 'First works', desc: 'Finish 3 buildings', metric: 'buildings', target: 3, reward: [{ target: 'treasury', delta: 60 }] },
  { id: 'standing-army', title: 'A standing army', desc: 'Have 6 units under arms', metric: 'units', target: 6, reward: [{ target: 'treasury', delta: 50 }] },
  { id: 'room-to-grow', title: 'Room to grow', desc: 'Hold 22 hexes', metric: 'hexes', target: 22, reward: [{ target: 'influence', delta: 15 }] },
  { id: 'good-neighbours', title: 'Good neighbours', desc: 'Earn a placement bonus by building next to something that helps', metric: 'placementBonuses', target: 1, reward: [{ target: 'treasury', delta: 60 }] },
  { id: 'voice', title: 'The council’s habit', desc: 'Answer 5 daily questions', metric: 'decisions', target: 5, reward: [{ target: 'influence', delta: 10 }] },
  { id: 'reach-out', title: 'A friend abroad', desc: 'Sign a trade pact or open an embassy', metric: 'pacts', target: 1, reward: [{ target: 'influence', delta: 20 }] },
  { id: 'use-power', title: 'Powers of the state', desc: 'Use one of your government’s powers', metric: 'powersUsed', target: 1, reward: [{ target: 'stability', delta: 4 }] },
  { id: 'era-1', title: 'The Assembly', desc: 'Reach the First Era', metric: 'era', target: 1, reward: [{ target: 'treasury', delta: 120 }] },
  { id: 'steady', title: 'A steady hand', desc: 'Reach 70% stability', metric: 'stability', target: 70, reward: [{ target: 'treasury', delta: 80 }] },
  { id: 'industry', title: 'Smoke on the horizon', desc: 'Finish a factory', metric: 'building', arg: 'factory', target: 1, reward: [{ target: 'treasury', delta: 80 }] },
  { id: 'income', title: 'In the black', desc: 'Earn 150 net income a turn', metric: 'netIncome', target: 150, reward: [{ target: 'influence', delta: 20 }] },
  { id: 'first-blood', title: 'Baptism of fire', desc: 'Win a battle', metric: 'battlesWon', target: 1, reward: [{ target: 'treasury', delta: 100 }] },
  { id: 'thirty', title: 'A wider map', desc: 'Hold 30 hexes', metric: 'hexes', target: 30, reward: [{ target: 'treasury', delta: 120 }] },
  { id: 'bank', title: 'Credit where due', desc: 'Finish a bank', metric: 'building', arg: 'bank', target: 1, reward: [{ target: 'treasury', delta: 100 }] },
  { id: 'people', title: 'A crowded country', desc: 'Reach 2.5 million people', metric: 'population', target: 2_500_000, reward: [{ target: 'influence', delta: 25 }] },
  { id: 'planner', title: 'Town planner', desc: 'Have 5 buildings earning a placement bonus', metric: 'placementBonuses', target: 5, reward: [{ target: 'treasury', delta: 140 }] },
  { id: 'era-2', title: 'Trade and tension', desc: 'Reach the Second Era', metric: 'era', target: 2, reward: [{ target: 'treasury', delta: 160 }] },
  { id: 'veterans', title: 'Veterans', desc: 'Win 8 battles', metric: 'battlesWon', target: 8, reward: [{ target: 'stability', delta: 6 }] },
  { id: 'conqueror', title: 'A capital falls', desc: 'Take a rival’s capital', metric: 'capitalsTaken', target: 1, reward: [{ target: 'treasury', delta: 300 }] },
  { id: 'forty-five', title: 'Great power', desc: 'Hold 45 hexes', metric: 'hexes', target: 45, reward: [{ target: 'treasury', delta: 220 }] },
  { id: 'era-3', title: 'Age of empire', desc: 'Reach the Third Era', metric: 'era', target: 3, reward: [{ target: 'treasury', delta: 300 }] },
];

export const OBJECTIVE_BY_ID: Record<string, ObjectiveDef> = Object.fromEntries(OBJECTIVES.map((o) => [o.id, o]));
