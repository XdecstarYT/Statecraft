/**
 * Core data models. Starting point from the project brief, extended where
 * the brief's algorithms need a field it didn't spell out (e.g. favorBank,
 * rngState — both noted inline below).
 */

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
}
