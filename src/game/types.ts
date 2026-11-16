// Core data model. Everything in src/game is UI-free and pure:
// functions take a GameState and return a new one.

export type NationId = string;
export type AxisId = 'liberty' | 'market' | 'reform' | 'openness';
export type FactionId = 'merchants' | 'settlers' | 'clergy' | 'dockworkers';
export type StatId = 'population' | 'treasury' | 'stability' | 'influence';
export type Terrain =
  | 'plains'
  | 'forest'
  | 'hills'
  | 'highlands'
  | 'farmland'
  | 'coast'
  | 'river'
  | 'sea';
export type StartingLand = 'coast' | 'river' | 'highlands';
export type BuildingCategory = 'security' | 'utilities' | 'commerce' | 'services';
export type BuildingId = string;
export type UnitId = 'infantry' | 'armour' | 'artillery';

export interface HexRef {
  c: number;
  r: number;
}

export interface BuildingInstance {
  type: BuildingId;
  /** Turns of construction left. 0 means finished and producing. */
  turnsLeft: number;
}

export interface Hex extends HexRef {
  terrain: Terrain;
  owner: NationId | null;
  /** Set on a capital hex, and kept after the nation falls. */
  capitalOf?: NationId;
  buildings: BuildingInstance[];
}

export type UnitCounts = Record<UnitId, number>;

export interface Army extends HexRef {
  id: number;
  owner: NationId;
  units: UnitCounts;
  /** Movement points already spent this turn. */
  moved: number;
}

export interface Flag {
  pattern: 'tricolour' | 'bands' | 'canton';
  a: string;
  b: string;
}

export interface DecisionRecord {
  turn: number;
  dilemmaId: string;
  title: string;
  choice: string;
  effects: Effect[];
}

export interface Personality {
  /** 0–1. How readily the nation goes to war. */
  aggression: number;
  /** 0–1. How hard it pushes into unclaimed land. */
  expansion: number;
}

export interface Nation {
  id: NationId;
  name: string;
  short: string;
  motto: string;
  description: string;
  color: string;
  flag: Flag;
  capital: HexRef;
  startingLand: StartingLand;
  foundedTurn: number;
  alive: boolean;
  era: number;
  stats: Record<StatId, number>;
  axes: Record<AxisId, number>;
  axesAtFounding: Record<AxisId, number>;
  factions: Record<FactionId, number>;
  decisions: DecisionRecord[];
  personality: Personality;
  /** Form of government, derived from the axes. Stored so a change can be noticed. */
  government: string;
  /** Power id → first turn it can be used again. */
  powerReady: Record<string, number>;
  tally: { battlesWon: number; capitalsTaken: number; powersUsed: number };
  /** Present when a person runs this nation; null when the computer does. */
  seat: Seat | null;
}

/** Everything that belongs to the person playing a nation, rather than to the nation itself. */
export interface Seat {
  envoy: Envoy;
  /** Today's question. `choice` is null until the player decides. */
  dilemma: { id: string; choice: number | null; /** When the player unsealed it, if questions are timed. */ openedAt: number | null } | null;
  /** Dilemma ids not yet drawn in this cycle. */
  deck: string[];
  /** When this player's clock for the current turn started (ms). 0 if unknown. */
  turnStartedAt: number;
  objectives: { active: string[]; done: string[] };
  /** Real-world visits: the last calendar day played and the run of consecutive days. */
  checkIn: { day: string; streak: number };
  /** Has ended the current turn and is waiting for the other players. */
  ready: boolean;
}

/** An offer from one human-run nation to another, waiting for an answer. */
export interface Proposal {
  id: string;
  from: NationId;
  to: NationId;
  act: 'trade' | 'pact' | 'peace';
  turn: number;
}

export interface Relation {
  /** −100…+100 */
  value: number;
  war: boolean;
  warSince: number;
  tradePact: boolean;
  /** Nations of this pair that keep an embassy with the other. */
  embassy: NationId[];
  /** Non-aggression pact holds through this turn. 0 = none. */
  napUntil: number;
  /** Per nation: turn of its last envoy action toward the other (one per turn). */
  lastActionTurn: Record<NationId, number>;
  /** Per nation: turn its last peace offer was refused. */
  peaceRefusedTurn: Record<NationId, number>;
}

export interface Envoy extends HexRef {
  /** Set while travelling. */
  dest: HexRef | null;
  arrivesTurn: number;
}

export interface Effect {
  /** A stat, faction or axis id. Axis deltas are toward Liberty / Market / Reform / Openness. */
  target: StatId | FactionId | AxisId | 'relations';
  delta: number;
}

export interface Requirement {
  target: StatId | AxisId;
  min?: number;
  max?: number;
  label: string;
}

export interface DilemmaChoice {
  title: string;
  desc: string;
  outcome: string;
  effects: Effect[];
  requires?: Requirement;
}

export interface Dilemma {
  id: string;
  title: string;
  category: string;
  body: string;
  voices: { faction: FactionId; name: string; quote: string }[];
  choices: DilemmaChoice[];
  /** Only drawn in this situation. Default: any. */
  when?: 'war' | 'peace';
}

export type LogKind = 'objective' | 'government' | 'battle' | 'war' | 'peace' | 'build' | 'economy' | 'diplomacy' | 'unrest' | 'era' | 'info';

export interface LogEntry {
  turn: number;
  kind: LogKind;
  text: string;
  /** Shown more prominently in the turn report, to the nations it concerns. */
  important?: boolean;
  /** Private: only this nation sees it. */
  to?: NationId;
  /** The nations it concerns. If set, it is only `important` to them. */
  about?: NationId[];
  at?: HexRef;
}

export interface GameState {
  version: number;
  /** Identifies this game across devices and in the hall of nations. */
  id: string;
  turn: number;
  /** Seeded RNG state, so the rules stay pure. */
  rng: number;
  /** Nations run by people, in turn order. Every other nation is run by the computer. */
  humans: NationId[];
  settings: GameSettings;
  cols: number;
  rows: number;
  /** Row-major: index = r * cols + c. */
  hexes: Hex[];
  nations: Record<NationId, Nation>;
  order: NationId[];
  armies: Army[];
  nextArmyId: number;
  /** Keyed by pairKey(a, b). */
  relations: Record<string, Relation>;
  /** Offers between human-run nations that are waiting for an answer. */
  proposals: Proposal[];
  log: LogEntry[];
  status: 'playing' | 'over';
  /** Set when the game is over. Null if every human-run nation fell. */
  winner: NationId | null;
  outcome: string;
}

export interface FoundingChoices {
  name: string;
  motto: string;
  /** Option index 0/1/2 per axis. */
  answers: Record<AxisId, number>;
  startingLand: StartingLand;
  flag: Flag;
}

/** How fast a world moves. Chosen when the game is created. */
export interface GameSettings {
  /** Seconds to answer the daily question once it is opened. 0 = no limit. */
  questionSeconds: number;
  /** Seconds each turn lasts before it is ended for you. 0 = no limit. A day is 86400. */
  turnSeconds: number;
  /** 'together': everyone's turn clock starts when the turn begins (online). 'inTurn': yours starts when you take the device (pass-and-play). */
  clock: 'together' | 'inTurn';
}

export interface GameSetup {
  settings?: Partial<GameSettings>;
  /** The time the game is created (ms), for the first turn's clock. */
  now?: number;
  /** One entry per human-run nation, in turn order (1–4). The rest are run by the computer. */
  players: FoundingChoices[];
  seed?: number;
  /** A unique id for the game. The caller supplies one; the rules never invent randomness. */
  id?: string;
  /** Today's date, YYYY-MM-DD, for the daily run. */
  day?: string;
}

export type Action =
  | { type: 'build'; at: HexRef; building: BuildingId }
  | { type: 'demolish'; at: HexRef; slot: number }
  | { type: 'recruit'; at: HexRef; unit: UnitId }
  | { type: 'moveArmy'; armyId: number; to: HexRef; units?: Partial<UnitCounts> }
  | { type: 'disband'; armyId: number; unit: UnitId }
  | { type: 'claimHex'; at: HexRef }
  | { type: 'moveEnvoy'; to: HexRef }
  | { type: 'decide'; choice: number }
  | { type: 'diplomacy'; nation: NationId; act: DiplomacyAct }
  | { type: 'power'; power: string }
  | { type: 'respond'; proposal: string; accept: boolean }
  /** Unseal a timed question and start its clock. */
  | { type: 'openQuestion' }
  /** Pass-and-play: this player has taken the device. */
  | { type: 'startClock' }
  /** A clock has run out: the council answers for you, or your turn is ended. */
  | { type: 'expire' }
  | { type: 'checkIn'; day: string }
  | { type: 'endTurn' };

export type DiplomacyAct = 'trade' | 'embassy' | 'gift' | 'pact' | 'denounce' | 'war' | 'peace';

/** Result of trying an action: the new state, or why it isn't allowed. */
export type Check = { ok: true } | { ok: false; reason: string };
