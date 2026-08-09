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

/**
 * A sub-national reporting region for election night — groups districts
 * under FPTP (results are just the sum of its own districts); under PR
 * there are no districts to group, so a province instead carries its own
 * relative turnout weight and reports a vote sample of its own. See
 * engine/systems/electionNight.ts.
 */
export interface Province {
  id: string;
  name: string;
  /** FPTP only: which districts belong to this province. */
  districtIds: string[];
  /** Relative population/turnout weight, used to size a PR province's vote sample. */
  weight: number;
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
  /** Optional hand-authored reporting regions; auto-generated when omitted. See getProvinces in electionNight.ts. */
  provinces?: Province[];
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

/** One FPTP district's vote tally. See engine/systems/elections.ts. */
export interface DistrictResult {
  districtId: string;
  votesByParty: Record<string, number>;
}

/** One party's vote total in a PR/national/runoff/primary tally. See engine/systems/elections.ts. */
export interface PartyVoteShare {
  partyId: string;
  votes: number;
}

export type ElectionNightStatus = 'reporting' | 'called' | 'concluded';

/**
 * A province-by-province live-reveal election, rather than the instant
 * one-shot result runLegislativeElection produces. See
 * engine/systems/electionNight.ts.
 */
export interface ElectionNightState {
  status: ElectionNightStatus;
  system: ElectoralSystem;
  /** Province ids in the order they'll report, precomputed and fixed for the whole night. */
  reportingOrder: string[];
  reportedProvinceIds: string[];
  /** FPTP: every district's full result, precomputed up front (not just the reported ones). */
  districtResults: DistrictResult[];
  /** PR: each province's own simulated vote sample; summed once every province has reported. */
  provinceVotes: Record<string, PartyVoteShare[]>;
  /** Final seats, populated once status is 'called'. */
  finalSeats?: Record<string, number>;
  winnerPartyId?: string;
  victorySpeech?: string;
}

export type CabinetPortfolio = 'finance' | 'defense' | 'foreignAffairs' | 'justice';

export interface CabinetAppointment {
  portfolio: CabinetPortfolio;
  politicianId: string;
}

export type InterestGroupFocus =
  | 'business'
  | 'labor'
  | 'environment'
  | 'social_conservative'
  | 'social_progressive'
  | 'civil_liberties'
  | 'healthcare'
  | 'defense'
  | 'agriculture'
  | 'seniors';

/**
 * An organized lobby with a real ideological stance and financial/organizing
 * clout — not just flavor text. See engine/systems/lobbying.ts for how a
 * group's stance on a bill and its disposition toward the player feed a real
 * term into the whip-count formula.
 */
export interface InterestGroup {
  id: string;
  name: string;
  focus: InterestGroupFocus;
  ideology: IdeologyPosition;
  /** 0..100 organizational/financial clout — scales how much this group's stance actually moves undecided legislators. */
  influence: number;
  /** -100 (openly hostile to the player) .. 100 (firmly in the player's camp). Drifts toward 0 each turn unless reinforced. */
  disposition: number;
}

export type LeadershipChallengeStatus = 'brewing' | 'resolved';

/**
 * A rival from within the incumbent's own party contesting party
 * leadership — a real "primary challenge" / leadership-spill mechanic, not
 * just a scandal variant. See engine/systems/leadership.ts. `status`
 * starts 'brewing' (the challenge has been announced but the vote hasn't
 * been held yet, giving the incumbent one turn to respond) and moves to
 * 'resolved' once resolveLeadershipVote has run.
 */
export interface LeadershipChallenge {
  id: string;
  partyId: string;
  incumbentId: string;
  challengerId: string;
  turnCalled: number;
  status: LeadershipChallengeStatus;
  winnerId?: string;
  incumbentVotes?: number;
  challengerVotes?: number;
}

export type CovertOperationType = 'espionage' | 'sabotage' | 'destabilize' | 'coup';

/**
 * A logged attempt at one covert operation against a foreign counterpart.
 * `success` and `detected` are independent — an op can be pulled off
 * cleanly, botched but never traced, executed and still traced, or simply
 * fail outright. See engine/systems/espionage.ts.
 */
export interface CovertOperationRecord {
  id: string;
  counterpartId: string;
  type: CovertOperationType;
  turn: number;
  success: boolean;
  detected: boolean;
}

export type CoalitionStatus = 'governing' | 'collapsed';

/**
 * The governing coalition assembled after an election where no single
 * party won an outright majority. See engine/systems/coalition.ts for how
 * membership, the Prime Minister, and the initial confidence vote are all
 * resolved deterministically. Null on GameState whenever a single party
 * holds a majority outright — no coalition was needed.
 */
export interface Coalition {
  id: string;
  memberPartyIds: string[];
  formateurPartyId: string;
  primeMinisterId: string;
  seatsHeld: number;
  totalSeats: number;
  status: CoalitionStatus;
  confidenceVotesFor: number;
  confidenceVotesAgainst: number;
  formedTurn: number;
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
  /** Live province-by-province election in progress, if any. Null between elections. */
  electionNight: ElectionNightState | null;
  /** The turn a new legislative election is next due — advisory (nothing auto-fires), reset whenever an election is held. */
  nextElectionTurn: number;
  cabinet: CabinetAppointment[];
  interestGroups: InterestGroup[];
  /** partyId -> the politician currently leading it. Used by leadership challenges and (later) coalition PM selection. */
  partyLeaderId: Record<string, string>;
  /** At most one leadership contest in flight at a time. Null between challenges. */
  leadershipChallenge: LeadershipChallenge | null;
  /** 0..100 — the player's own intelligence-agency strength, grown via investInIntelligence. Lowers detection risk and raises success odds on covert operations. */
  intelligenceCapability: number;
  covertOperations: CovertOperationRecord[];
  /** The current governing coalition, or null when a single party holds an outright majority and none was needed. */
  coalition: Coalition | null;
  eventLog: EventLogEntry[];
  difficulty: Difficulty;
  /** Economy snapshot at game creation — the baseline legacy scoring measures change against. */
  startingEconomy: EconomyState;
}

/**
 * CAREER MODE — an optional pre-game life sim: start at 17 with nothing and
 * build your way up to a national candidacy. Entirely separate from
 * GameState; see engine/systems/career.ts. A successful national
 * nomination "graduates" a CareerState into a real GameState via
 * createNewGame, carrying forward the attributes, ideology, and party
 * you actually earned instead of the random defaults an instant-start
 * game begins with.
 */

export type EducationTrack = 'community_college' | 'state_university' | 'law_school' | 'trade_apprenticeship';

export type CareerStage = 'student' | 'working' | 'party_volunteer' | 'local_officeholder' | 'graduated';

export interface CareerEventLogEntry {
  turn: number;
  title: string;
  description: string;
}

/** One attempt at a local council seat — a real, self-contained mini-election against 1-3 generated rivals. */
export interface CareerLocalRaceRecord {
  turn: number;
  won: boolean;
  playerShare: number;
  opponentNames: string[];
}

/** One attempt at national candidacy — a probabilistic gate, not a full vote, since this represents the party leadership's own decision. */
export interface CareerNominationRecord {
  turn: number;
  selected: boolean;
  probability: number;
}

export interface CareerState {
  seed: number;
  rngState: number;
  /** Career-mode turns are seasons (see CAREER_TURNS_PER_YEAR in career.ts), not the main game's weeks. */
  turn: number;
  name: string;
  /** Which STARTER_COUNTRY_OPTIONS entry this career is tied to — fixes which parties are available to join and, on graduation, which country the resulting GameState uses. */
  countryOptionId: string;
  stage: CareerStage;
  /** 1..10 scale, same as Politician.attributes — starts low and is earned through education/work/party organizing. */
  attributes: PoliticianAttributes;
  ideology: IdeologyPosition;
  money: number;
  educationTrack: EducationTrack | null;
  educationTurnsRemaining: number;
  completedEducationTracks: EducationTrack[];
  jobId: string | null;
  partyId: string | null;
  /** Set only when partyId refers to a brand-new party the player founded rather than an existing roster entry — see foundOwnParty in career.ts. */
  foundedParty: Party | null;
  /** 0..100 standing within the chosen party — the main gate on both the local race and the national nomination. */
  partyStanding: number;
  localSeatWon: boolean;
  localRaceHistory: CareerLocalRaceRecord[];
  nominationHistory: CareerNominationRecord[];
  eventLog: CareerEventLogEntry[];
}
