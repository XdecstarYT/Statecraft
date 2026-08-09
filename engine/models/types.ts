/**
 * Core data models. Starting point from the project brief, extended where
 * the brief's algorithms need a field it didn't spell out (e.g. favorBank,
 * rngState — both noted inline below).
 */

import type { Difficulty } from '../difficulty';

export interface IdeologyPosition {
  /** -100 (fully state-directed) .. 100 (fully free-market) */
  economic: number;
  /** -100 (progressive) .. 100 (traditionalist) */
  social: number;
}

export interface Faction {
  name: string;
  /** Offset applied to the party's economic-axis position for this faction. */
  ideologyOffset: number;
  /** Number of seats/members belonging to this faction. */
  size: number;
}

export interface Party {
  id: string;
  name: string;
  ideology: IdeologyPosition;
  seats: number;
  factions: Faction[];
}

export interface PoliticianAttributes {
  charisma: number;
  intellect: number;
  integrity: number;
  network: number;
  mediaSavvy: number;
}

export interface PoliticianApproval {
  public: number;
  base: number;
  partyElite: number;
}

/**
 * A temporary, decaying nudge toward a new approval level for one audience —
 * how a single event's influence fades over a few turns instead of causing
 * an instant jump. See engine/systems/opinion.ts.
 */
export interface ApprovalEvent {
  audience: keyof PoliticianApproval;
  impact: number;
  turnsRemaining: number;
  initialTurns: number;
}

export interface Politician {
  id: string;
  name: string;
  isPlayer: boolean;
  ideology: IdeologyPosition;
  attributes: PoliticianAttributes;
  partyId: string;
  approval: PoliticianApproval;
  approvalEvents: ApprovalEvent[];
}

/**
 * A segment of the electorate, not a single approval number — voters are
 * modeled as blocs with their own size, ideology, and how easily events
 * move them. See engine/systems/opinion.ts.
 */
export interface VoterBloc {
  id: string;
  name: string;
  /** Fraction of the electorate, 0..1. Bloc sizes across a country should sum to ~1. */
  size: number;
  ideology: IdeologyPosition;
  /** 0 (locked-in, ignores events) .. 1 (swings easily). */
  persuadability: number;
  /** Ranked issues this bloc cares about most right now; weights should sum to ~1. */
  issueSalience: { issue: string; weight: number }[];
}

export type WhipStance = 'yes' | 'no' | 'undecided';

export interface BillProvision {
  id: string;
  description: string;
  budgetImpact: number;
}

export type BillStatus =
  | 'drafting'
  | 'committee'
  | 'floor'
  | 'passed'
  | 'failed'
  | 'vetoed';

export interface Bill {
  id: string;
  title: string;
  provisions: BillProvision[];
  sponsorId: string;
  status: BillStatus;
  whipCount: Record<string, WhipStance>;
}

export interface PendingEconomyEffect {
  turnsRemaining: number;
  delta: EconomyDelta;
}

export interface EconomyDelta {
  gdpGrowth?: number;
  inflation?: number;
  unemployment?: number;
  debtToGdp?: number;
  budgetBalance?: number;
}

export interface EconomyState {
  gdpGrowth: number;
  inflation: number;
  unemployment: number;
  debtToGdp: number;
  budgetBalance: number;
  pendingEffects: PendingEconomyEffect[];
}

export type ElectoralSystem = 'FPTP' | 'PR_DHONDT';

export interface District {
  id: string;
  name: string;
}

export interface Legislature {
  name: string;
  electoralSystem: ElectoralSystem;
  /** Used when electoralSystem === 'FPTP': one seat per district. */
  districts: District[];
  /** Used when electoralSystem === 'PR_DHONDT': total seats to allocate. */
  totalSeats: number;
  /** Minimum vote-share fraction (e.g. 0.05) a party needs to win PR seats. */
  prThreshold: number;
}

export interface Country {
  id: string;
  name: string;
  regimeType: 'parliamentary' | 'presidential' | 'semi-presidential';
  legislature: Legislature;
}

/** A static bias profile for a press outlet. See engine/systems/media.ts. */
export interface MediaOutlet {
  id: string;
  name: string;
  bias: IdeologyPosition;
  /** Fraction of the public this outlet reaches, 0..1. */
  reach: number;
}

/**
 * A real spectrum of rising risk and reward, not a binary switch. See
 * engine/systems/corruption.ts.
 */
export type CorruptionTier = 'soft' | 'medium' | 'hard';

export type ScandalResponse = 'deny' | 'admit' | 'scapegoat';

export interface Scandal {
  id: string;
  politicianId: string;
  tier: CorruptionTier;
  turn: number;
  status: 'unresolved' | 'resolved';
  response?: ScandalResponse;
}

export type TreatyType = 'trade' | 'defense' | 'nonaggression' | 'aid';

export type TreatyStatus = 'proposed' | 'active' | 'broken';

export interface Treaty {
  id: string;
  counterpartId: string;
  type: TreatyType;
  title: string;
  status: TreatyStatus;
  economyEffect: EconomyDelta;
  /** Immediate relation-score bump on signing; a further penalty applies on breaking. */
  relationEffect: number;
}

export type CommodityType = 'energy' | 'food' | 'minerals' | 'manufactured' | 'technology';

/**
 * A composite, gameplay-abstracted strength index — not a real-world
 * military assessment. See engine/systems/military.ts.
 */
export interface MilitaryProfile {
  /** 0..100 composite strength index. */
  strength: number;
  /** Active personnel, thousands. */
  personnel: number;
  /** 0..100; scales effective strength in conflict resolution. */
  techLevel: number;
}

/** Units/turn, abstracted for gameplay. See engine/systems/trade.ts. */
export interface TradeProfile {
  production: Record<CommodityType, number>;
  consumption: Record<CommodityType, number>;
}

/** A foreign government the country has a relationship with. See engine/systems/diplomacy.ts. */
export interface ForeignCounterpart {
  id: string;
  name: string;
  region: string;
  ideology: IdeologyPosition;
  military: MilitaryProfile;
  trade: TradeProfile;
  /** Approximate capital-city coordinates, for the world map. */
  location: { lat: number; lng: number };
}

export type TradeDealStatus = 'proposed' | 'active' | 'cancelled';

export interface TradeDeal {
  id: string;
  counterpartId: string;
  commodity: CommodityType;
  /** Units/turn imported from the counterpart. Negative means the player's country exports instead. */
  volume: number;
  /** 0..1 fraction of the deal's value lost to tariffs. */
  tariff: number;
  status: TradeDealStatus;
}

export type WarStatus = 'active' | 'won' | 'lost' | 'stalemate';

export interface War {
  id: string;
  counterpartId: string;
  startTurn: number;
  status: WarStatus;
  /** Accumulated running advantage; positive favors the player, negative favors the counterpart. */
  advantage: number;
  endTurn?: number;
}

export type CrisisCategory =
  | 'scandal'
  | 'natural_disaster'
  | 'economic_shock'
  | 'international_incident'
  | 'civil_unrest'
  | 'public_health'
  | 'security_incident';

export interface EventLogEntry {
  turn: number;
  category: CrisisCategory;
  title: string;
  description: string;
}

export interface GameState {
  seed: number;
  /** Current mulberry32 state, so play is resumable and replay-exact. */
  rngState: number;
  turn: number;
  country: Country;
  politicians: Politician[];
  parties: Party[];
  bills: Bill[];
  economy: EconomyState;
  /** "idA:idB" (sorted) -> disposition -100..100. Symmetric. */
  relationships: Record<string, number>;
  /** politicianId -> favors owed to the player, 0..maxFavors. Used by the whip formula. */
  favorBank: Record<string, number>;
  voterBlocs: VoterBloc[];
  mediaOutlets: MediaOutlet[];
  scandals: Scandal[];
  foreignCounterparts: ForeignCounterpart[];
  /** counterpartId -> disposition -100..100. */
  foreignRelations: Record<string, number>;
  /** The player's own country's military profile — compared against a counterpart's in war resolution. */
  playerMilitary: MilitaryProfile;
  treaties: Treaty[];
  tradeDeals: TradeDeal[];
  wars: War[];
  eventLog: EventLogEntry[];
  difficulty: Difficulty;
  /** Economy snapshot at game creation — the baseline legacy scoring measures change against. */
  startingEconomy: EconomyState;
}
