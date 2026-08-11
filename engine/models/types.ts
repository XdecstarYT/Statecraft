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
  | 'vetoed'
  | 'struck_down';

/**
 * Which national system, if any, a passed bill nudges beyond the generic
 * budget/growth effect every bill already carries — see
 * engine/index.ts's applyBillCategoryEffect. 'economic' (and bills with no
 * category at all, e.g. saves from before this existed) only ever get the
 * generic effect.
 */
export type BillCategory =
  | 'economic'
  | 'healthcare'
  | 'education'
  | 'welfare'
  | 'defense'
  | 'environment'
  | 'justice_safety'
  | 'infrastructure'
  | 'research_technology';

export interface Bill {
  id: string;
  title: string;
  /** Optional so bills from saves predating this field, and tests that don't care about it, stay valid — treated the same as 'economic' (no domain effect) when absent. */
  category?: BillCategory;
  provisions: BillProvision[];
  sponsorId: string;
  status: BillStatus;
  whipCount: Record<string, WhipStance>;
  /** A minority bloc is holding the floor vote hostage — see engine/systems/legislative.ts's invokeFilibuster/attemptCloture. Floor votes cannot resolve while true. */
  filibustered?: boolean;
  /** Set once the bill clears (or dies in) committee — see engine/systems/committees.ts. Optional for saves predating this field. */
  committeeResult?: CommitteeVoteResult;
}

/**
 * A standing committee with real jurisdiction and real members — bills
 * must clear a committee vote (see engine/systems/committees.ts) before
 * reaching the floor, using the same whip-count math as a floor vote but
 * restricted to the committee's own membership.
 */
export interface Committee {
  id: string;
  name: string;
  /** Which bill categories fall under this committee's jurisdiction. */
  areas: BillCategory[];
  /** politicianIds assigned to this committee. */
  memberIds: string[];
  /** politicianId of the presiding chair — always one of memberIds. */
  chairId: string;
}

export interface CommitteeVoteResult {
  committeeId: string;
  committeeName: string;
  yes: number;
  no: number;
  passed: boolean;
}

/**
 * A national ballot initiative — puts an issue directly to the public
 * instead of the legislature. `ideologyStance` is the position the "yes"
 * side represents, scored against voter blocs the same way a politician's
 * own ideology is (see opinion.ts's computeWeightedPublicApproval).
 */
export interface BallotInitiative {
  id: string;
  title: string;
  description: string;
  ideologyStance: IdeologyPosition;
  economyEffect: EconomyDelta;
  status: 'active' | 'passed' | 'failed';
  turnProposed: number;
  /** Set once resolved. */
  yesShare?: number;
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
  /** 0..100 — national social/cultural cohesion; lower values feed higher secessionist risk. Defaults to 70 when omitted. See engine/systems/secession.ts. */
  culturalCohesion?: number;
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

/**
 * INDUSTRY: MINING, MANUFACTURING, LOGISTICS & MARKET — a real production
 * chain layered on top of the abstract macro trade system above: named raw
 * resources are extracted from deposits (domestic provinces or foreign
 * nations you have relations with), shipped through the national logistics
 * network into factories, converted into named finished goods by recipe,
 * and sold on the market. See engine/systems/mining.ts, logistics.ts,
 * manufacturing.ts, market.ts.
 */

export type RawResourceType =
  | 'iron_ore'
  | 'coal'
  | 'crude_oil'
  | 'copper_ore'
  | 'timber'
  | 'bauxite'
  | 'natural_gas'
  | 'gold_ore'
  | 'grain'
  | 'rare_earth_minerals'
  | 'stone';

export type ProcessedGoodType =
  | 'steel'
  | 'refined_fuel'
  | 'copper_wire'
  | 'lumber'
  | 'aluminum'
  | 'electronics'
  | 'processed_food'
  | 'jewelry'
  | 'machinery'
  | 'chemicals';

/** Who funds and profits from a facility: the national budget, or the player's personal wealth. */
export type FacilityOwnership = 'state' | 'private';

/** Whether a facility's location is one of your own provinces, or a foreign nation you have relations with. */
export type FacilityLocationType = 'domestic' | 'foreign';

/**
 * A real, finite deposit of one raw resource at a specific location —
 * richness scales how much a mine there can extract per turn, and
 * remainingReserves depletes with extraction until the deposit runs dry.
 */
export interface ResourceDeposit {
  id: string;
  resource: RawResourceType;
  /** A provinceId (domestic) or a ForeignCounterpart id (foreign). */
  locationId: string;
  locationType: FacilityLocationType;
  /** 0..100 — scales extraction rate per mine tier. */
  richness: number;
  remainingReserves: number;
}

export interface Mine {
  id: string;
  depositId: string;
  ownership: FacilityOwnership;
  /** 1..3 — higher tiers extract faster but cost more to build and run. */
  tier: number;
  turnBuilt: number;
}

export interface ManufacturingRecipeInput {
  resource: RawResourceType;
  unitsPerBatch: number;
}

/** A pre-authored conversion recipe: raw resources in, one finished good out. See content/resources/recipes.ts. */
export interface ManufacturingRecipe {
  id: string;
  outputGood: ProcessedGoodType;
  outputUnitsPerBatch: number;
  inputs: ManufacturingRecipeInput[];
  /** Batches/turn a tier-1 factory running this recipe can process at full input supply. */
  batchesPerTurnAtTier1: number;
}

export interface Factory {
  id: string;
  /** A provinceId (domestic) or a ForeignCounterpart id (foreign). */
  locationId: string;
  locationType: FacilityLocationType;
  recipeId: string;
  ownership: FacilityOwnership;
  /** 1..3 — higher tiers process more batches/turn but cost more to build and run. */
  tier: number;
  turnBuilt: number;
}

/**
 * The national logistics network — a single investable capability (like
 * military or intelligence) that determines what fraction of extracted
 * resources actually reach factories instead of being lost in transit.
 * Foreign shipments are always less efficient than domestic ones, and are
 * further degraded by poor relations or an active war with the source
 * nation. See engine/systems/logistics.ts.
 */
export interface LogisticsNetwork {
  /** 0..100 — invested national logistics capability. */
  capability: number;
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

export type EndorserType = 'celebrity' | 'union' | 'newspaper';

/** A static endorser profile — a public figure, union, or newspaper whose backing swings approval. See engine/systems/endorsements.ts. */
export interface Endorser {
  id: string;
  name: string;
  type: EndorserType;
  ideology: IdeologyPosition;
  /** 0..100 — scales the approval impact of a won endorsement. */
  prominence: number;
}

/** A record of a successful endorsement. */
export interface EndorsementRecord {
  endorserId: string;
  politicianId: string;
  turn: number;
}

/** A static polling-firm profile. See engine/systems/polling.ts. */
export interface PollingFirm {
  id: string;
  name: string;
  sampleSize: number;
  /** Persistent house-effect lean in points, added to the true value before sampling. Small: -5..5. */
  houseBias: number;
  /** 0..1 — 1 is textbook-perfect execution; lower firms add extra noise beyond pure sampling error. */
  reliability: number;
}

export interface PollResult {
  id: string;
  firmId: string;
  turn: number;
  subjectId: string;
  subjectLabel: string;
  kind: 'approval' | 'party_support';
  sampledValue: number;
  marginOfError: number;
  trueValue: number;
}

export type ResolutionType = 'trade_pact' | 'human_rights' | 'climate_accord' | 'sanctions_regime';

/** A pre-authored summit resolution template. See engine/systems/summit.ts. */
export interface SummitResolutionTemplate {
  type: ResolutionType;
  title: string;
  description: string;
  stance: IdeologyPosition;
  economyEffect: EconomyDelta;
}

/** A convened international summit resolution, active until the player casts a vote. See engine/systems/summit.ts. */
export interface SummitResolution {
  id: string;
  type: ResolutionType;
  title: string;
  description: string;
  stance: IdeologyPosition;
  economyEffect: EconomyDelta;
  attendeeIds: string[];
  turnProposed: number;
}

/**
 * HOUSE RULES — optional, real gameplay toggles chosen at game creation.
 * Each one changes actual engine behavior (see engine/index.ts), not just
 * a label. All default to false (standard rules).
 */
export interface HouseRules {
  /** The head of government is never term-limited out of office. */
  disableTermLimits: boolean;
  /** Doubles the per-turn crisis event chance. */
  doubleEventFrequency: boolean;
  /** Corrupt acts are unavailable to the player and NPCs alike. */
  noCorruption: boolean;
}

export const DEFAULT_HOUSE_RULES: HouseRules = {
  disableTermLimits: false,
  doubleEventFrequency: false,
  noCorruption: false,
};

export type UnrestStatus = 'protesting' | 'riot' | 'quelled';

/** A nationwide civil-unrest event — see engine/systems/unrest.ts. */
export interface Protest {
  id: string;
  cause: string;
  /** 0..100. */
  intensity: number;
  status: UnrestStatus;
  turnStarted: number;
}

export type SecessionStatus = 'agitating' | 'suppressed' | 'independent';

/**
 * A region's independence movement — sentiment rises with national
 * grievance (unemployment, low approval) and can be resolved by autonomy
 * concessions, a referendum, or armed suppression. See
 * engine/systems/secession.ts.
 */
export interface SecessionistMovement {
  provinceId: string;
  provinceName: string;
  /** 0..100 — support for independence within the region. */
  sentiment: number;
  status: SecessionStatus;
  turnStarted: number;
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

/**
 * One option on a dilemma — a real, named response with its own bounded
 * consequences, not just a flavor label. Every field mirrors a channel a
 * crisis event can already move (see CrisisEventDef); delayedEconomyEffect
 * is the one genuinely new piece, letting a choice's real bite land a few
 * turns after the (possibly very different) immediate effect — same lag
 * queue applyBillCategoryEffect's economy sibling already uses.
 */
export interface DilemmaChoice {
  id: string;
  label: string;
  description: string;
  economyEffect?: EconomyDelta;
  playerApprovalEffect?: number;
  foreignRelationEffect?: { counterpartId: string; delta: number };
  delayedEconomyEffect?: { turnsRemaining: number; delta: EconomyDelta };
}

/** A pre-authored dilemma template — see content/events/dilemmaTable.ts and engine/systems/dilemmas.ts. */
export interface DilemmaDef {
  id: string;
  category: CrisisCategory;
  title: string;
  description: string;
  baseWeight: number;
  choices: DilemmaChoice[];
}

/** A dilemma currently awaiting the player's decision — at most one at a time. See engine/systems/dilemmas.ts's resolveDilemmaChoice. */
export interface ActiveDilemma {
  id: string;
  defId: string;
  category: CrisisCategory;
  title: string;
  description: string;
  choices: DilemmaChoice[];
  turnRaised: number;
}

/**
 * JUDICIARY — a real check-and-balance: the player nominates justices to a
 * fixed-size court, the legislature confirms (or rejects) them by vote, and
 * once seated the court can strike down a passed bill on judicial review —
 * likelier the further the bill's provisions sit from the median justice's
 * ideology. See engine/systems/judiciary.ts.
 */
export type CourtSeatStatus = 'nominated' | 'confirmed';

export interface Justice {
  id: string;
  name: string;
  ideology: IdeologyPosition;
  /** 1..10 — a principled justice is likelier to actually apply the law rather than vote along raw ideology alone. */
  integrity: number;
  status: CourtSeatStatus;
  turnAppointed?: number;
  /** Confirmation vote tally while status is 'nominated'; cleared once confirmed or rejected. */
  confirmationVotes?: Record<string, WhipStance>;
}

/** A fixed-size bench; a null entry is a vacant seat with no nominee at all. */
export interface Court {
  seats: (Justice | null)[];
}

export type JudicialReviewStatus = 'pending' | 'upheld' | 'struck_down';

/** One passed bill's judicial review, from filing to resolution. See engine/systems/judiciary.ts. */
export interface JudicialReviewCase {
  id: string;
  billId: string;
  billTitle: string;
  turnFiled: number;
  status: JudicialReviewStatus;
  turnResolved?: number;
}

/**
 * TECHNOLOGY & RESEARCH — a real R&D investment track: invested capability
 * (mirrors logisticsNetwork/intelligenceCapability's pattern) generates
 * research points each turn, which accumulate toward unlocking tech-tree
 * nodes gated by prerequisites. See engine/systems/research.ts and
 * content/research/techTree.ts for the pre-authored tree itself.
 */
export type TechCategory = 'industry' | 'military' | 'economy' | 'governance';

export interface TechNode {
  id: string;
  name: string;
  description: string;
  category: TechCategory;
  /** Accumulated research points required to unlock, once every prerequisite is already unlocked. */
  cost: number;
  prerequisites: string[];
  /** One-time economic payoff applied the moment this tech unlocks — a real, felt reward for research, not just a checkbox. */
  economyEffect: EconomyDelta;
}

export interface ResearchState {
  /** 0..100 — invested national R&D capability, grown via investInResearch. */
  capability: number;
  accumulatedPoints: number;
  unlockedTechIds: string[];
}

/**
 * IMMIGRATION & DEMOGRAPHICS — population as a real, moving number: natural
 * growth (births minus deaths) plus net migration, the latter driven by how
 * the country's economy compares to the wider world and by the player's own
 * openness policy. Feeds back into the labor force (economy) and voter bloc
 * sizes (opinion). See engine/systems/demographics.ts.
 */
export type ImmigrationPolicyLevel = 'closed' | 'restricted' | 'open';

export interface DemographicsState {
  /** Thousands of people. */
  population: number;
  /** Percent/turn — births minus deaths, before migration. */
  naturalGrowthRate: number;
  /** Percent/turn of population, positive net-in, negative net-out. */
  netMigrationRate: number;
  policy: ImmigrationPolicyLevel;
}

/**
 * HEALTHCARE, EDUCATION & WELFARE — three independently-set funding tiers,
 * each nudging a real outcome indicator toward a funding-implied target at
 * a decay rate (same "sticky, not instant" shape as economy/approval), which
 * in turn feed back into approval and the wider economy. See
 * engine/systems/socialPolicy.ts.
 */
export type SocialFundingTier = 'minimal' | 'standard' | 'generous';

export interface SocialPolicyState {
  healthcareFunding: SocialFundingTier;
  educationFunding: SocialFundingTier;
  welfareFunding: SocialFundingTier;
  /** Years. */
  lifeExpectancy: number;
  /** 0..100. */
  literacyRate: number;
  /** 0..100. */
  povertyRate: number;
}

/**
 * STOCK MARKET & PRIVATE ENTERPRISE — the player can found a private
 * company, grow it, and take it public; once public its shares trade on a
 * real (if abstracted) market, drifting with both the company's own
 * underlying fundamentals and the wider economy, and paying the player a
 * dividend each turn they hold shares. See engine/systems/enterprise.ts.
 */
export type CompanySector = 'industrial' | 'technology' | 'finance' | 'energy' | 'consumer' | 'agriculture';

export interface Company {
  id: string;
  name: string;
  sector: CompanySector;
  founderId: string;
  turnFounded: number;
  isPublic: boolean;
  totalShares: number;
  sharePrice: number;
  /** Shares the player personally holds — once public, the remaining float is assumed held by the wider market, not simulated per-holder. */
  playerShares: number;
  /** 0..100 — underlying business health/quality; drives price drift and dividend size. */
  fundamentals: number;
}

/**
 * CRIME & PUBLIC SAFETY — a real crime rate driven by poverty and
 * unemployment, pulled down by how much you fund policing (at a real
 * budget cost, and aggressive funding carries a felt approval friction of
 * its own). Organized crime entrenches itself when crime runs high and
 * scandals go unresolved, and once entrenched it quietly drags on the
 * budget. See engine/systems/publicSafety.ts.
 */
export type PolicingFundingTier = 'minimal' | 'standard' | 'aggressive';

export interface CrimeState {
  /** 0..100 — incidents per capita, abstracted. */
  crimeRate: number;
  /** 0..100 — share of the population currently incarcerated, abstracted. */
  incarcerationRate: number;
  policingFunding: PolicingFundingTier;
  /** 0..100 — how entrenched organized crime is; raises crime and quietly drags the budget once high. */
  organizedCrimeInfluence: number;
}

/**
 * ENVIRONMENT & CLIMATE — pollution generated by your actual mines and
 * factories (not an abstract slider) accumulates into a real index, offset
 * by however much of the energy mix is renewable. High pollution both taxes
 * growth directly and raises the odds of a natural-disaster crisis event
 * (see events.ts's computeEventWeight). See engine/systems/environment.ts.
 */
export type EnergyPolicyLevel = 'fossil_heavy' | 'balanced' | 'renewable_focus';

export interface EnvironmentState {
  /** 0..100 — cumulative pollution; higher is worse. */
  pollutionIndex: number;
  /** 0..100 — renewable share of the energy mix. */
  renewableShare: number;
  energyPolicy: EnergyPolicyLevel;
  /** 0..100 — invested green-infrastructure capability, grown via investInGreenInfrastructure. */
  greenInvestmentCapability: number;
}

/**
 * PUBLIC INFRASTRUCTURE — four independently-investable categories that
 * decay on their own without upkeep spending, and whose average quality is
 * a real, if modest, tailwind or drag on economic productivity and public
 * approval. See engine/systems/infrastructure.ts.
 */
export type InfrastructureCategory = 'transport' | 'power' | 'water' | 'digital';

export interface InfrastructureState {
  /** 0..100 each. */
  transport: number;
  power: number;
  water: number;
  digital: number;
}

/**
 * CHIRP — a fictional in-game social platform that reacts to what's
 * actually happening in the run: crises, scandals, wars, court rulings,
 * and the player's own approval trend all generate real posts from a pool
 * of pre-authored personas, and the player can post their own (a real,
 * consequence-bearing action — see engine/systems/socialMedia.ts).
 */
export type SocialPostAuthorType = 'player' | 'pundit' | 'citizen' | 'journalist' | 'rival' | 'meme';

export interface SocialPost {
  id: string;
  turn: number;
  authorType: SocialPostAuthorType;
  authorName: string;
  handle: string;
  /** A single emoji standing in for an avatar. */
  avatar: string;
  content: string;
  /** Abstracted engagement counts — cosmetic flavor, not simulated per-viewer. */
  likes: number;
  reposts: number;
  topic: string;
}

export interface SocialMediaState {
  posts: SocialPost[];
  /** A vanity number for the player specifically — grows passively with approval and jumps when a tweet lands well. */
  followerCount: number;
}

export type MovementStance = 'hostile' | 'neutral' | 'supportive';

/**
 * A grassroots movement that organizes out of a voter bloc's accumulated
 * grievance against how poorly the player's own ideology matches theirs.
 * Its stance toward the player is always derived fresh from current
 * ideology (see computeMovementStance in engine/systems/movements.ts),
 * never stored, so it can never go stale as the player's positions shift.
 */
export interface GrassrootsMovement {
  id: string;
  name: string;
  /** A one-line mission statement, assembled from pre-authored templates. */
  mission: string;
  ideology: IdeologyPosition;
  /** The voter bloc this movement organized out of. */
  originBlocId: string;
  /** 0..100 — how large/organized the movement currently is. */
  size: number;
  founded: number;
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
  secessionistMovements: SecessionistMovement[];
  ballotInitiatives: BallotInitiative[];
  /** politicianId -> number of terms served as head of government (Prime Minister or majority-party leader). See engine/systems/succession.ts. */
  termsServed: Record<string, number>;
  protests: Protest[];
  endorsers: Endorser[];
  endorsements: EndorsementRecord[];
  pollingFirms: PollingFirm[];
  polls: PollResult[];
  /** politicianId -> abstracted personal wealth accrued from corrupt acts. See engine/systems/wealth.ts. */
  personalWealth: Record<string, number>;
  /** At most one convened international summit resolution at a time, awaiting the player's vote. Null between summits. */
  activeSummit: SummitResolution | null;
  /** At most one dilemma awaiting the player's choice at a time. Null between dilemmas. See engine/systems/dilemmas.ts. */
  activeDilemma: ActiveDilemma | null;
  /** One-time milestone achievement ids recorded the moment they happen (can't be reconstructed from a state snapshot alone). See engine/systems/achievements.ts. */
  milestones: string[];
  houseRules: HouseRules;
  resourceDeposits: ResourceDeposit[];
  mines: Mine[];
  factories: Factory[];
  logisticsNetwork: LogisticsNetwork;
  /** National stockpile of extracted-and-shipped raw resources awaiting processing or direct export. */
  rawResourceStockpile: Record<RawResourceType, number>;
  /** Finished goods produced by state-owned factories, sellable for budget revenue. */
  stateGoodsStockpile: Record<ProcessedGoodType, number>;
  /** Finished goods produced by privately-owned factories, sellable for personal wealth. */
  privateGoodsStockpile: Record<ProcessedGoodType, number>;
  /** Current market price for every raw resource and processed good. See engine/systems/market.ts. */
  marketPrices: Record<RawResourceType | ProcessedGoodType, number>;
  court: Court;
  judicialReviewCases: JudicialReviewCase[];
  research: ResearchState;
  demographics: DemographicsState;
  socialPolicy: SocialPolicyState;
  companies: Company[];
  crime: CrimeState;
  environment: EnvironmentState;
  infrastructure: InfrastructureState;
  socialMedia: SocialMediaState;
  movements: GrassrootsMovement[];
  eventLog: EventLogEntry[];
  difficulty: Difficulty;
  /** Economy snapshot at game creation — the baseline legacy scoring measures change against. */
  startingEconomy: EconomyState;
  /** Campaign promises the player has made against a real, already-tracked stat. See engine/systems/promises.ts. */
  playerPromises: PlayerPromise[];
  /** Standing committees every bill must clear before reaching the floor. See engine/systems/committees.ts. */
  committees: Committee[];
}

/**
 * A campaign promise tied to one real, continuously-tracked stat (GDP
 * growth, crime rate, etc.) rather than free text — progress is derived
 * purely from how far that stat has moved in the promised direction since
 * the promise was made, never a fabricated number. See
 * engine/systems/promises.ts.
 */
export type PromiseMetric =
  | 'gdpGrowth'
  | 'unemployment'
  | 'inflation'
  | 'debtToGdp'
  | 'budgetBalance'
  | 'crimeRate'
  | 'pollutionIndex'
  | 'publicApproval';

export interface PlayerPromise {
  id: string;
  metric: PromiseMetric;
  madeTurn: number;
  /** The metric's real value at the moment the promise was made — progress is measured against this. */
  baselineValue: number;
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
