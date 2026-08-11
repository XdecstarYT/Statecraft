import { SeededRng } from './rng';
import type {
  Bill,
  CorruptionTier,
  Country,
  EconomyDelta,
  EconomyState,
  ElectoralSystem,
  ForeignCounterpart,
  GameState,
  IdeologyPosition,
  InterestGroup,
  MediaOutlet,
  MilitaryProfile,
  Party,
  Politician,
  PoliticianAttributes,
  Endorser,
  HouseRules,
  PollingFirm,
  PollResult,
  Protest,
  ScandalResponse,
  SecessionistMovement,
  VoterBloc,
  Factory,
  FacilityLocationType,
  FacilityOwnership,
  Mine,
  ProcessedGoodType,
  RawResourceType,
  Company,
  CompanySector,
} from './models/types';
import { DEFAULT_HOUSE_RULES } from './models/types';
import type { Difficulty } from './difficulty';
import { getDifficultySettings } from './difficulty';
import { advanceEconomy, applyImmediateEffect, queuePolicyEffect } from './systems/economy';
import {
  allocateSeatsDHondt,
  generateDistrictVotes,
  generateNationalVotes,
  resolveFPTPElection,
  type DistrictResult,
  type PartyVoteShare,
} from './systems/elections';
import { advanceApproval, pushApprovalEvent } from './systems/opinion';
import { generateCoverage, type CoverageEvent, type EventKind } from './systems/media';
import {
  DEFAULT_WHIP_WEIGHTS,
  MAX_FAVORS,
  advanceToCommittee,
  advanceToFloor,
  applyFloorVoteResult,
  computeBillDomainMagnitude,
  computeBillEconomyEffect,
  proposeBill,
  relationshipKey,
  resolveFloorVote,
} from './systems/legislative';
import { attemptCorruptionAction, computeScandalSeverity } from './systems/corruption';
import {
  applyBillOutcomeToGroups,
  applyCourtOutcome,
  computeLobbyingPressure,
  courtInterestGroup,
  decayGroupDispositions,
  type CourtGroupOutcome,
} from './systems/lobbying';
import {
  denounceChallenger,
  rallyPartySupport,
  resolveLeadershipVote,
  rollForLeadershipChallenge,
  type PartyActionOutcome,
} from './systems/leadership';
import { formCoalition, formGovernment, hasOutrightMajority } from './systems/coalition';
import {
  isTermLimited,
  recordTermServed,
  resolveImpeachmentVote,
  selectSuccessor,
  type ImpeachmentResult,
} from './systems/succession';
import type { CareerGraduationPayload } from './systems/career';
import { foundParty, mergeParties, rebrandParty, type FoundPartyResult } from './systems/partyManagement';
import {
  advanceMovementSentiment,
  computeNationalGrievance,
  grantAutonomy,
  resolveReferendum,
  resolveSuppression,
  rollForNewMovement,
  secedeProvince,
} from './systems/secession';
import { proposeBallotInitiative, resolveBallotInitiative, type BallotResult } from './systems/referendum';
import {
  RIOT_ECONOMY_EFFECT,
  advanceProtestIntensity,
  checkRiotEscalation,
  computeUnrestPressure,
  concedeToProtesters,
  disperseProtest,
  rollForProtest,
  type DispersalResult,
} from './systems/unrest';
import { PROTEST_CAUSES } from '../content/flavor/protestCauses';
import {
  attemptPressConference,
  attemptPressInterview,
  attemptRally,
  type CampaignActionOutcome,
  type PressTopic,
} from './systems/campaign';
import { resolveDebate, DEBATE_WINNER_APPROVAL_BONUS, DEBATE_LOSER_APPROVAL_PENALTY, type DebateResult } from './systems/debate';
import { attemptEndorsement, type EndorsementAttemptResult } from './systems/endorsements';
import { ENDORSERS } from '../content/endorsements/endorsers';
import { commissionApprovalPoll, commissionPartyPoll } from './systems/polling';
import { POLLING_FIRMS } from '../content/polling/firms';
import { BASE_PERSONAL_WEALTH, WEALTH_TIER_GAIN, rollForWealthScandal } from './systems/wealth';
import { rollForSummit, resolveSummit, type SummitOutcome } from './systems/summit';
import { SUMMIT_RESOLUTION_TEMPLATES } from '../content/summit/resolutions';
import { rollForEvent, applyCrisisEvent, DEFAULT_EVENT_CHANCE } from './systems/events';
import { rollForDilemma, DEFAULT_DILEMMA_CHANCE } from './systems/dilemmas';
import { DILEMMA_TABLE } from '../content/events/dilemmaTable';
import { adjustRelation } from './systems/diplomacy';
import {
  applyWarAttrition,
  computeEffectiveStrength,
  computeWarResolutionRelationDelta,
  resolveWarTurn,
} from './systems/military';
import { computeCabinetEffects } from './systems/cabinet';
import {
  MAX_MINE_TIER,
  MINE_BUILD_COST,
  MINE_UPGRADE_COST,
  buildMine,
  computeMineOperatingCost,
  extractFromMine,
  generateResourceDeposits,
  isDepositExhausted,
  upgradeMine,
} from './systems/mining';
import { computeShipmentEfficiency, shipResource } from './systems/logistics';
import {
  FACTORY_BUILD_COST,
  FACTORY_UPGRADE_COST,
  MAX_FACTORY_TIER,
  buildFactory,
  computeFactoryOperatingCost,
  processFactoryTurn,
  upgradeFactory,
} from './systems/manufacturing';
import { sellFromStockpile, updateAllMarketPrices, type SaleResult } from './systems/market';
import { RAW_RESOURCES } from '../content/resources/resourceTypes';
import { MANUFACTURING_RECIPES } from '../content/resources/recipes';
import { RAW_RESOURCE_BASE_PRICES, PROCESSED_GOOD_BASE_PRICES } from '../content/resources/market';
import {
  applyConfirmationResult,
  canHearCases,
  computeCourtIdeology,
  computeStrikeDownProbability,
  createEmptyCourt,
  nominateJustice,
  resolveConfirmationVote,
  resolveJudicialReview,
  rollForJudicialReviewChallenge,
  rollForJusticeRetirements,
  type ConfirmationVoteResult,
} from './systems/judiciary';
import { advanceResearchPoints, canAffordTech, isTechAvailable, unlockTech } from './systems/research';
import { TECH_TREE } from '../content/research/techTree';
import {
  advanceDemographicsTurn,
  applyDemographicChangeToBlocs,
  computeLaborForceEffect,
} from './systems/demographics';
import { advanceSocialIndicators, computeSocialPolicyApprovalImpact, computeSocialPolicyBudgetEffect } from './systems/socialPolicy';
import {
  COMPANY_FOUNDING_COST,
  buyShares,
  computeDividendPayout,
  foundCompany,
  ipoCompany,
  sellShares,
  advanceCompanyTurn,
} from './systems/enterprise';
import {
  advanceCrimeRate,
  advanceIncarcerationRate,
  advanceOrganizedCrimeInfluence,
  computeCrimeApprovalImpact,
  computeOrganizedCrimeEconomyEffect,
  computePolicingBudgetEffect,
} from './systems/publicSafety';
import {
  advancePollutionIndex,
  advanceRenewableShare,
  computeIndustrialEmissions,
  computePollutionEconomyEffect,
} from './systems/environment';
import {
  advanceInfrastructureDecay,
  computeInfrastructureApprovalImpact,
  computeInfrastructureEconomyEffect,
} from './systems/infrastructure';
import {
  MAX_FEED_POSTS,
  computeFollowerGrowth,
  computePassiveFollowerGrowth,
  computeTweetApprovalImpact,
  createPlayerPost,
  generateFeedPosts,
} from './systems/socialMedia';
import { PERSONAS } from '../content/socialMedia/personas';
import { POST_TEMPLATES } from '../content/socialMedia/postTemplates';
import {
  advanceMovementSize,
  computeAggregateMovementBillReaction,
  computeMovementApprovalPressure,
  computeMovementStance,
  isMovementActive,
  rollMovementProtest,
  trySpawnMovement,
} from './systems/movements';
import { MOVEMENT_NAME_TEMPLATES, MOVEMENT_MISSION_TEMPLATES } from '../content/movements/nameTemplates';
import { PLAYER_TWEET_OPTIONS } from '../content/socialMedia/playerTweetOptions';
import {
  computeVictoryMarginFraction,
  concludeElectionNight as concludeElectionNightState,
  getProvinces,
  reportNextProvince,
  startElectionNight,
} from './systems/electionNight';
import {
  applyNpcStances,
  attemptSmearCampaign,
  computeStrategicMomentum,
  decideNpcScandalResponse,
  selectNpcBillSponsor,
  selectNpcBillTemplate,
  selectNpcCampaigner,
  selectNpcCorruptionTier,
  selectSmearCampaigner,
  updateRelationshipsAfterVote,
} from './systems/npc';
import { clamp, clampAxis } from './ideology';
import { WEEKS_PER_YEAR } from './calendar';
import { STARTER_COUNTRY, STARTER_PARTIES } from '../content/countries/starter';
import { generateName } from '../content/names/pool';
import { STARTER_VOTER_BLOCS } from '../content/opinion/blocs';
import { STARTER_MEDIA_OUTLETS } from '../content/media/outlets';
import { HEADLINE_TEMPLATES } from '../content/flavor/headlines';
import { nationsExcluding, startingMilitaryProfile } from '../content/diplomacy/nations';
import { CRISIS_TABLE } from '../content/events/crisisTable';
import { BILL_TEMPLATES } from '../content/flavor/billTemplates';
import { pickVictorySpeech } from '../content/flavor/victorySpeeches';
import { STARTER_INTEREST_GROUPS } from '../content/lobbying/groups';

export * from './rng';
export * from './ideology';
export * from './calendar';
export * from './difficulty';
export * from './models/types';
export * from './systems/legislative';
export * from './systems/elections';
export * from './systems/economy';
export * from './systems/opinion';
export * from './systems/media';
export * from './systems/corruption';
export * from './systems/diplomacy';
export * from './systems/events';
export * from './systems/legacy';
export * from './systems/npc';
export * from './systems/campaign';
export * from './systems/military';
export * from './systems/trade';
export * from './systems/cabinet';
export * from './systems/electionNight';
export * from './systems/lobbying';
export * from './systems/leadership';
export * from './systems/espionage';
export * from './systems/coalition';
export * from './systems/career';
export * from './systems/partyManagement';
export * from './systems/nationBuilder';
export * from './systems/secession';
export * from './systems/referendum';
export * from './systems/succession';
export * from './systems/unrest';
export * from './systems/debate';
export * from './systems/endorsements';
export * from './systems/polling';
export * from './systems/wealth';
export * from './systems/summit';
export * from './systems/achievements';
export * from './systems/mining';
export * from './systems/logistics';
export * from './systems/manufacturing';
export * from './systems/market';
export * from './systems/judiciary';
export * from './systems/research';
export * from './systems/demographics';
export * from './systems/socialPolicy';
export * from './systems/enterprise';
export * from './systems/publicSafety';
export * from './systems/environment';
export * from './systems/infrastructure';
export * from './systems/socialMedia';
export * from './systems/movements';
export * from './systems/dilemmas';

/** A 4-year term at 48 weeks/year (see calendar.ts's WEEKS_PER_YEAR) — purely advisory, nothing auto-fires when it's reached. */
export const TERM_LENGTH_TURNS = WEEKS_PER_YEAR * 4;

/** Fixed bench size for the judiciary — see engine/systems/judiciary.ts. */
export const DEFAULT_COURT_SIZE = 5;

const STARTING_ECONOMY: EconomyState = {
  gdpGrowth: 2.1,
  inflation: 3.2,
  unemployment: 5.4,
  debtToGdp: 58,
  budgetBalance: -2.3,
  pendingEffects: [],
};

/**
 * Builds one politician per current party seat, with ideology jittered
 * around the party's position and randomized attributes — all driven by
 * the seeded RNG, so a given seed always produces the same legislature.
 */
function generatePoliticians(parties: Party[], rng: SeededRng): Politician[] {
  const politicians: Politician[] = [];
  for (const party of parties) {
    for (let i = 0; i < party.seats; i++) {
      const jitter = () => (rng.next() - 0.5) * 30;
      politicians.push({
        id: `${party.id}-m${i + 1}`,
        name: generateName(rng),
        isPlayer: false,
        ideology: {
          economic: clampAxis(party.ideology.economic + jitter()),
          social: clampAxis(party.ideology.social + jitter()),
        },
        attributes: {
          charisma: rng.nextInt(1, 10),
          intellect: rng.nextInt(1, 10),
          integrity: rng.nextInt(1, 10),
          network: rng.nextInt(1, 10),
          mediaSavvy: rng.nextInt(1, 10),
        },
        partyId: party.id,
        approval: { public: 50, base: 55, partyElite: 55 },
        approvalEvents: [],
      });
    }
  }
  return politicians;
}

export interface NewGameOptions {
  country?: Country;
  parties?: Party[];
  voterBlocs?: VoterBloc[];
  mediaOutlets?: MediaOutlet[];
  foreignCounterparts?: ForeignCounterpart[];
  playerMilitary?: MilitaryProfile;
  playerPartyId?: string;
  playerName?: string;
  difficulty?: Difficulty;
  interestGroups?: InterestGroup[];
  endorsers?: Endorser[];
  pollingFirms?: PollingFirm[];
  /** Overrides the default starting economy indicators — used by historical scenario presets. */
  startingEconomy?: Partial<EconomyState>;
  /** Optional gameplay toggles chosen at game creation — see HouseRules. Defaults to all-standard rules. */
  houseRules?: Partial<HouseRules>;
  /** Overrides the auto-generated jittered attributes — used by career mode to carry forward what was actually earned. */
  playerAttributes?: PoliticianAttributes;
  /** Overrides the party-jittered starting ideology — same purpose as playerAttributes. */
  playerIdeology?: IdeologyPosition;
  /** 0..1 — a warmer starting reception than the random default, scaled from career mode's final party standing. */
  playerApprovalBonus?: number;
}

/** Assembles a fresh, fully-populated GameState from a seed and starter content. */
export function createNewGame(seed: number, options: NewGameOptions = {}): GameState {
  const rng = new SeededRng(seed);
  const country = options.country ?? STARTER_COUNTRY;
  let parties = (options.parties ?? STARTER_PARTIES).map((p) => ({
    ...p,
    factions: p.factions.map((f) => ({ ...f })),
  }));

  const politicians = generatePoliticians(parties, rng);

  const playerPartyId = options.playerPartyId ?? parties[parties.length - 1].id;
  let player = politicians.find((p) => p.partyId === playerPartyId);
  if (!player) {
    // The chosen party has no generated seats yet (e.g. a freshly founded party) — the player becomes its first member.
    player = {
      id: `${playerPartyId}-founder`,
      name: '',
      isPlayer: false,
      ideology: parties.find((p) => p.id === playerPartyId)?.ideology ?? { economic: 0, social: 0 },
      attributes: { charisma: 5, intellect: 5, integrity: 5, network: 5, mediaSavvy: 5 },
      partyId: playerPartyId,
      approval: { public: 50, base: 55, partyElite: 55 },
      approvalEvents: [],
    };
    politicians.push(player);
    parties = parties.map((p) => (p.id === playerPartyId ? { ...p, seats: p.seats + 1 } : p));
  }
  player.isPlayer = true;
  player.name = options.playerName ?? 'Alex Varga';
  if (options.playerAttributes) player.attributes = { ...options.playerAttributes };
  if (options.playerIdeology) player.ideology = { ...options.playerIdeology };
  if (options.playerApprovalBonus) {
    const boost = clamp(options.playerApprovalBonus, 0, 1) * 25;
    player.approval = {
      public: clamp(player.approval.public + boost, 0, 100),
      base: clamp(player.approval.base + boost, 0, 100),
      partyElite: clamp(player.approval.partyElite + boost * 1.4, 0, 100),
    };
  }

  const startingEconomy: EconomyState = { ...STARTING_ECONOMY, ...options.startingEconomy, pendingEffects: [] };

  const foreignCounterparts = options.foreignCounterparts ?? nationsExcluding(country.id);
  const resourceDeposits = generateResourceDeposits(
    getProvinces(country).map((p) => p.id),
    foreignCounterparts.map((c) => c.id),
    RAW_RESOURCES,
    rng
  );
  const rawResourceStockpile = Object.fromEntries(
    Object.keys(RAW_RESOURCE_BASE_PRICES).map((r) => [r, 0])
  ) as GameState['rawResourceStockpile'];
  const stateGoodsStockpile = Object.fromEntries(
    Object.keys(PROCESSED_GOOD_BASE_PRICES).map((g) => [g, 0])
  ) as GameState['stateGoodsStockpile'];
  const privateGoodsStockpile = Object.fromEntries(
    Object.keys(PROCESSED_GOOD_BASE_PRICES).map((g) => [g, 0])
  ) as GameState['privateGoodsStockpile'];
  const marketPrices = { ...RAW_RESOURCE_BASE_PRICES, ...PROCESSED_GOOD_BASE_PRICES } as GameState['marketPrices'];

  const partyLeaderId: Record<string, string> = {};
  for (const party of parties) {
    partyLeaderId[party.id] =
      party.id === playerPartyId ? player.id : (politicians.find((p) => p.partyId === party.id)?.id ?? player.id);
  }

  const baseState: GameState = {
    seed,
    rngState: rng.getState(),
    turn: 1,
    country,
    politicians,
    parties,
    bills: [],
    economy: { ...startingEconomy },
    relationships: {},
    favorBank: {},
    voterBlocs: options.voterBlocs ?? STARTER_VOTER_BLOCS,
    mediaOutlets: options.mediaOutlets ?? STARTER_MEDIA_OUTLETS,
    scandals: [],
    foreignCounterparts,
    foreignRelations: {},
    playerMilitary: options.playerMilitary ?? startingMilitaryProfile(country.id),
    treaties: [],
    tradeDeals: [],
    wars: [],
    electionNight: null,
    nextElectionTurn: 1 + TERM_LENGTH_TURNS,
    cabinet: [],
    interestGroups: options.interestGroups ?? STARTER_INTEREST_GROUPS.map((g) => ({ ...g })),
    partyLeaderId,
    leadershipChallenge: null,
    intelligenceCapability: 20,
    covertOperations: [],
    coalition: null,
    secessionistMovements: [],
    ballotInitiatives: [],
    termsServed: {},
    protests: [],
    endorsers: options.endorsers ?? ENDORSERS,
    endorsements: [],
    pollingFirms: options.pollingFirms ?? POLLING_FIRMS,
    polls: [],
    personalWealth: Object.fromEntries(politicians.map((p) => [p.id, BASE_PERSONAL_WEALTH])),
    activeSummit: null,
    activeDilemma: null,
    milestones: [],
    houseRules: { ...DEFAULT_HOUSE_RULES, ...options.houseRules },
    resourceDeposits,
    mines: [],
    factories: [],
    logisticsNetwork: { capability: 20 },
    rawResourceStockpile,
    stateGoodsStockpile,
    privateGoodsStockpile,
    marketPrices,
    court: createEmptyCourt(DEFAULT_COURT_SIZE),
    judicialReviewCases: [],
    research: { capability: 20, accumulatedPoints: 0, unlockedTechIds: [] },
    demographics: { population: 5000, naturalGrowthRate: 0.05, netMigrationRate: 0, policy: 'restricted' },
    socialPolicy: {
      healthcareFunding: 'standard',
      educationFunding: 'standard',
      welfareFunding: 'standard',
      lifeExpectancy: 75,
      literacyRate: 88,
      povertyRate: 14,
    },
    companies: [],
    crime: { crimeRate: 25, incarcerationRate: 12, policingFunding: 'standard', organizedCrimeInfluence: 5 },
    environment: { pollutionIndex: 15, renewableShare: 20, energyPolicy: 'balanced', greenInvestmentCapability: 20 },
    infrastructure: { transport: 55, power: 60, water: 65, digital: 45 },
    socialMedia: { posts: [], followerCount: 1000 },
    movements: [],
    eventLog: [],
    difficulty: options.difficulty ?? 'standard',
    startingEconomy,
  };

  return resolveGovernment(baseState, rng);
}

/**
 * Turns a graduated CareerState into a real GameState — the handoff point
 * between career mode and the main game. Carries forward everything the
 * player actually earned (attributes, ideology, party, a warmer starting
 * reception) via createNewGame's override options, rather than reinventing
 * game setup from scratch.
 */
export function graduateFromCareer(
  seed: number,
  payload: CareerGraduationPayload,
  country: Country,
  parties: Party[],
  difficulty: Difficulty = 'standard'
): GameState {
  const fullParties = payload.founderPartyDefinition
    ? [...parties, payload.founderPartyDefinition]
    : parties;
  return createNewGame(seed, {
    country,
    parties: fullParties,
    difficulty,
    playerPartyId: payload.playerPartyId,
    playerName: payload.playerName,
    playerAttributes: payload.playerAttributes,
    playerIdeology: payload.playerIdeology,
    playerApprovalBonus: payload.standingBonus,
  });
}

const COALITION_COLLAPSE_ECONOMY_EFFECT: EconomyDelta = { budgetBalance: -0.5, gdpGrowth: -0.3 };

/**
 * Recomputes who governs, given the legislature's current seat
 * distribution: null (single-party majority, no coalition drama needed)
 * when one party alone clears half the seats, otherwise a full
 * formGovernment pass — the resulting coalition's Prime Minister is the
 * formateur party's recorded leader (see partyLeaderId), and if the
 * confidence vote that comes with it fails, the collapse carries a real
 * cost: a real economic hit for the instability and an immediate snap
 * election (nextElectionTurn reset to right now) rather than waiting out
 * the rest of the term.
 */
/**
 * Applies term limits before a new government is formed: if the party
 * about to lead (the sole majority party, or the coalition formateur) is
 * still led by someone who's already served MAX_HEAD_OF_GOVERNMENT_TERMS,
 * that party succeeds its own leadership to its strongest remaining member
 * first — the term-limited politician never becomes head of government
 * again, but keeps their seat and party membership.
 */
function applyTermLimitSuccession(state: GameState, leadingPartyId: string): GameState {
  if (state.houseRules.disableTermLimits) return state;
  const currentLeaderId = state.partyLeaderId[leadingPartyId];
  if (!currentLeaderId || !isTermLimited(currentLeaderId, state.termsServed)) return state;

  const party = state.parties.find((p) => p.id === leadingPartyId);
  if (!party) return state;
  const successor = selectSuccessor(party, currentLeaderId, state.politicians, state.relationships);
  if (!successor) return state;

  return { ...state, partyLeaderId: { ...state.partyLeaderId, [leadingPartyId]: successor.id } };
}

function addMilestone(state: GameState, id: string): GameState {
  return state.milestones.includes(id) ? state : { ...state, milestones: [...state.milestones, id] };
}

function resolveGovernment(state: GameState, rng: SeededRng): GameState {
  const player = state.politicians.find((p) => p.isPlayer);

  if (hasOutrightMajority(state.parties)) {
    const majorityParty = state.parties.find((p) => p.seats > state.parties.reduce((s, x) => s + x.seats, 0) / 2)!;
    const succeeded = applyTermLimitSuccession(state, majorityParty.id);
    const headId = succeeded.partyLeaderId[majorityParty.id];
    const termsServed = headId ? recordTermServed(succeeded.termsServed, headId) : succeeded.termsServed;
    let next: GameState = { ...succeeded, coalition: null, termsServed, rngState: rng.getState() };
    if (player && player.partyId === majorityParty.id) next = addMilestone(next, 'landslide');
    return next;
  }

  const { formateurPartyId } = formCoalition(state.parties);
  const succeeded = applyTermLimitSuccession(state, formateurPartyId);

  const coalition = formGovernment(
    succeeded.parties,
    succeeded.politicians,
    succeeded.partyLeaderId,
    succeeded.relationships,
    succeeded.turn,
    rng
  );

  const termsServed = recordTermServed(succeeded.termsServed, coalition.primeMinisterId);

  if (coalition.status === 'collapsed') {
    return {
      ...succeeded,
      coalition,
      termsServed,
      economy: applyImmediateEffect(succeeded.economy, COALITION_COLLAPSE_ECONOMY_EFFECT),
      nextElectionTurn: succeeded.turn,
      rngState: rng.getState(),
    };
  }

  let next: GameState = { ...succeeded, coalition, termsServed, rngState: rng.getState() };
  if (player && coalition.memberPartyIds.length > 1 && coalition.memberPartyIds.includes(player.partyId)) {
    next = addMilestone(next, 'coalition_survivor');
  }
  return next;
}

const NPC_BILL_SPONSOR_CHANCE = 0.3;
const NPC_CAMPAIGN_CHANCE = 0.35;
const NPC_CORRUPTION_CHANCE = 0.2;
const NPC_SMEAR_CHANCE = 0.4;

/**
 * Runs one turn's worth of rule-based NPC behavior: existing NPC-sponsored
 * bills advance one stage through the pipeline (nobody else acts on them),
 * NPC members lock in clear-cut stances on whatever's now on the floor,
 * any NPC bill that reaches the floor is resolved immediately (updating
 * relationships from how the floor lined up), a new bill might get
 * sponsored if none is in flight, a rival might front a press interview
 * or rally of their own, an ideologically hostile rival might opportunistically
 * smear the player while they have a live scandal to point to, and a less
 * scrupulous rival might risk a corrupt act — resolved (and, if exposed,
 * responded to) entirely on their own, never as a player-facing choice.
 */
export function runNpcTurn(state: GameState, rng: SeededRng): GameState {
  const { politicians } = state;
  const player = politicians.find((p) => p.isPlayer);

  const isNpcBill = (bill: Bill): boolean => {
    const sponsor = politicians.find((p) => p.id === bill.sponsorId);
    return sponsor !== undefined && !sponsor.isPlayer;
  };

  let bills = state.bills.map((bill) => {
    if (!isNpcBill(bill)) return bill;
    if (bill.status === 'drafting') return advanceToCommittee(bill);
    if (bill.status === 'committee') return advanceToFloor(bill);
    return bill;
  });

  bills = bills.map((bill) => {
    if (bill.status !== 'floor') return bill;
    const sponsor = politicians.find((p) => p.id === bill.sponsorId);
    return sponsor ? applyNpcStances(bill, politicians, sponsor, state.relationships) : bill;
  });

  let relationships = state.relationships;
  let economy = state.economy;
  let interestGroups = state.interestGroups;
  let socialPolicy = state.socialPolicy;
  let crime = state.crime;
  let environment = state.environment;
  let infrastructure = state.infrastructure;
  let research = state.research;
  let playerMilitary = state.playerMilitary;
  bills = bills.map((bill) => {
    if (bill.status !== 'floor' || !isNpcBill(bill)) return bill;
    const sponsor = politicians.find((p) => p.id === bill.sponsorId)!;
    const lobbyingPressure = computeLobbyingPressure(interestGroups, bill, sponsor);
    const result = resolveFloorVote(
      bill,
      politicians,
      relationships,
      state.favorBank,
      rng,
      DEFAULT_WHIP_WEIGHTS,
      lobbyingPressure
    );
    if (player) {
      relationships = updateRelationshipsAfterVote(relationships, player.id, result.finalWhipCount);
    }
    const resolvedBill = applyFloorVoteResult(bill, result);
    if (resolvedBill.status === 'passed') {
      const enacted = enactPassedBill(
        { ...state, economy, socialPolicy, crime, environment, infrastructure, research, playerMilitary },
        resolvedBill
      );
      economy = enacted.economy;
      socialPolicy = enacted.socialPolicy;
      crime = enacted.crime;
      environment = enacted.environment;
      infrastructure = enacted.infrastructure;
      research = enacted.research;
      playerMilitary = enacted.playerMilitary;
    }
    interestGroups = applyBillOutcomeToGroups(interestGroups, resolvedBill, sponsor, resolvedBill.status === 'passed');
    return resolvedBill;
  });

  const npcBillInFlight = bills.some(
    (b) => isNpcBill(b) && (b.status === 'drafting' || b.status === 'committee' || b.status === 'floor')
  );
  if (!npcBillInFlight && rng.next() < NPC_BILL_SPONSOR_CHANCE) {
    const sponsor = selectNpcBillSponsor(politicians, rng);
    if (sponsor) {
      const template = selectNpcBillTemplate(sponsor, BILL_TEMPLATES, rng);
      bills = [
        ...bills,
        proposeBill({
          id: `npc-bill-${state.turn}-${bills.length + 1}`,
          title: template.title,
          category: template.category,
          provisions: template.provisions,
          sponsorId: sponsor.id,
        }),
      ];
    }
  }

  let nextPoliticians = politicians;
  let favorBank = state.favorBank;
  let scandals = state.scandals;
  let eventLog = state.eventLog;

  if (rng.next() < NPC_CAMPAIGN_CHANCE) {
    const campaigner = selectNpcCampaigner(nextPoliticians, rng);
    if (campaigner) {
      const isRally = rng.next() < 0.5;
      const outcome = isRally ? attemptRally(campaigner, rng) : attemptPressInterview(campaigner, rng);
      const audience = isRally ? 'base' : 'public';
      nextPoliticians = nextPoliticians.map((p) =>
        p.id === campaigner.id ? pushApprovalEvent(p, audience, outcome.approvalImpact, 4) : p
      );
    }
  }

  if (player) {
    const playerHasActiveScandal = scandals.some((s) => s.politicianId === player.id && s.status === 'unresolved');
    if (playerHasActiveScandal && rng.next() < NPC_SMEAR_CHANCE) {
      const attacker = selectSmearCampaigner(nextPoliticians, player, relationships, true, rng);
      if (attacker) {
        const outcome = attemptSmearCampaign(attacker, rng);
        nextPoliticians = nextPoliticians.map((p) => {
          if (p.id === attacker.id) return pushApprovalEvent(p, 'public', outcome.attackerApprovalImpact, 4);
          if (p.id === player.id) return pushApprovalEvent(p, 'public', outcome.targetApprovalImpact, 5);
          return p;
        });
        eventLog = [
          ...eventLog,
          outcome.outcome === 'landed'
            ? {
                turn: state.turn,
                category: 'scandal' as const,
                title: `${attacker.name} goes on the attack`,
                description: `${attacker.name} seizes on the ongoing scandal to publicly question ${player.name}'s fitness for office. The hit lands.`,
              }
            : {
                turn: state.turn,
                category: 'scandal' as const,
                title: `${attacker.name}'s attack backfires`,
                description: `${attacker.name} tries to make political hay out of ${player.name}'s scandal, but it reads as a cheap shot and draws sympathy the other way.`,
              },
        ];
      }
    }
  }

  if (!state.houseRules.noCorruption && rng.next() < NPC_CORRUPTION_CHANCE) {
    const actorCandidates = nextPoliticians.filter((p) => !p.isPlayer);
    const actor = actorCandidates.length > 0 ? rng.pick(actorCandidates) : null;
    const tier = actor ? selectNpcCorruptionTier(actor, rng) : null;
    const targetCandidates = actor ? nextPoliticians.filter((p) => p.id !== actor.id) : [];
    const target = actor && tier && targetCandidates.length > 0 ? rng.pick(targetCandidates) : null;

    if (actor && tier && target) {
      const settings = getDifficultySettings(state.difficulty);
      const cabinetEffects = computeCabinetEffects(state.cabinet, state.politicians);
      const result = attemptCorruptionAction(
        tier,
        actor.attributes.integrity,
        0,
        rng,
        settings.corruptionDetectionMultiplier * cabinetEffects.corruptionDetectionMultiplier
      );
      favorBank = {
        ...favorBank,
        [target.id]: Math.min(MAX_FAVORS, (favorBank[target.id] ?? 0) + result.favorGain),
      };
      economy = applyImmediateEffect(economy, { budgetBalance: result.budgetImpact });

      if (result.detected) {
        const response = decideNpcScandalResponse(actor);
        const severity = computeScandalSeverity(tier, response);
        scandals = [
          ...scandals,
          {
            id: `scandal-${state.turn}-npc-${scandals.length + 1}`,
            politicianId: actor.id,
            tier,
            turn: state.turn,
            status: 'resolved',
            response,
          },
        ];
        nextPoliticians = nextPoliticians.map((p) =>
          p.id === actor.id ? pushApprovalEvent(p, 'public', severity, 6) : p
        );
      }
    }
  }

  return {
    ...state,
    bills,
    relationships,
    economy,
    politicians: nextPoliticians,
    favorBank,
    scandals,
    interestGroups,
    eventLog,
    socialPolicy,
    crime,
    environment,
    infrastructure,
    research,
    playerMilitary,
  };
}

const LEADERSHIP_RELATIONSHIP_RIFT_PENALTY = 30;

/**
 * Runs one turn of the player's own party-leadership drama: if a challenge
 * is already brewing (announced last turn), the vote is held now — every
 * other party member casts a seeded ballot per resolveLeadershipVote,
 * losing and winning both leave a real, decaying approval mark rather than
 * an instant jump, the loser's relationship with the winner takes a
 * lasting hit, and the party's recorded leader updates on an upset. If
 * nothing is brewing and the player currently leads their own party, a new
 * challenge may spontaneously emerge — likelier the further their
 * partyElite approval has sunk below the threshold. At most one challenge
 * is ever in flight; a resolved one blocks new rolls until the player
 * dismisses it.
 */
export function runLeadershipChallengeTurn(state: GameState, rng: SeededRng): GameState {
  const player = state.politicians.find((p) => p.isPlayer);
  if (!player) return state;

  const challenge = state.leadershipChallenge;

  if (challenge && challenge.status === 'brewing') {
    const result = resolveLeadershipVote(challenge, state.politicians, state.relationships, rng);
    const winnerId = result.winnerId;
    const loserId = winnerId === challenge.incumbentId ? challenge.challengerId : challenge.incumbentId;

    const politicians = state.politicians.map((p) => {
      if (p.id === winnerId) return pushApprovalEvent(p, 'partyElite', 20, 6);
      if (p.id === loserId) return pushApprovalEvent(pushApprovalEvent(p, 'partyElite', -25, 6), 'public', -8, 6);
      return p;
    });

    const key = relationshipKey(challenge.incumbentId, challenge.challengerId);
    const relationships = {
      ...state.relationships,
      [key]: Math.max(-100, (state.relationships[key] ?? 0) - LEADERSHIP_RELATIONSHIP_RIFT_PENALTY),
    };

    const partyLeaderId = { ...state.partyLeaderId, [challenge.partyId]: winnerId };

    return {
      ...state,
      politicians,
      relationships,
      partyLeaderId,
      leadershipChallenge: {
        ...challenge,
        status: 'resolved',
        winnerId,
        incumbentVotes: result.incumbentVotes,
        challengerVotes: result.challengerVotes,
      },
    };
  }

  if (!challenge && state.partyLeaderId[player.partyId] === player.id) {
    const rolled = rollForLeadershipChallenge(player, state.politicians, state.turn, rng);
    if (rolled) return { ...state, leadershipChallenge: rolled };
  }

  return state;
}

/**
 * Advances the economy and every politician's multi-audience approval by
 * one turn, runs rule-based NPC legislative behavior, then rolls the
 * weighted crisis-event table against the new state. Both the economy's
 * volatility and the event chance are scaled by the game's difficulty
 * setting. Does not touch the player's own bills — call legislative
 * actions separately for those.
 */
/**
 * Runs one turn of separatist activity: every existing movement's
 * sentiment drifts toward what current national grievance (unemployment,
 * low public approval) implies, and — if no movement already exists for
 * every province — a new one may spontaneously emerge, likelier the more
 * aggrieved the nation is. Purely a background simulation; resolving a
 * movement (autonomy, referendum, suppression) is always a player action.
 */
export function runSecessionTurn(state: GameState, rng: SeededRng): GameState {
  const player = state.politicians.find((p) => p.isPlayer);
  const grievance = computeNationalGrievance(state.economy, player?.approval.public ?? 50, state.country.culturalCohesion);

  const secessionistMovements = state.secessionistMovements.map((m) => advanceMovementSentiment(m, grievance));

  const provinces = getProvinces(state.country);
  const newMovement = rollForNewMovement(provinces, secessionistMovements, grievance, state.turn, rng);

  return {
    ...state,
    secessionistMovements: newMovement ? [...secessionistMovements, newMovement] : secessionistMovements,
  };
}

/**
 * Runs one turn of nationwide civil unrest: any active protest's intensity
 * drifts toward what current unrest pressure (unemployment, inflation, low
 * public approval) implies and — left unresolved — can escalate into a
 * riot on its own, applying a real one-time economic hit exactly once at
 * the moment of escalation. If nothing is active, a new protest may
 * spontaneously break out. Resolving a protest (concession, dispersal) is
 * always a player action.
 */
export function runUnrestTurn(state: GameState, rng: SeededRng): GameState {
  const player = state.politicians.find((p) => p.isPlayer);
  const pressure = computeUnrestPressure(state.economy, player?.approval.public ?? 50);

  let economy = state.economy;
  const protests = state.protests.map((protest) => {
    const advanced = advanceProtestIntensity(protest, pressure);
    const afterEscalation = checkRiotEscalation(advanced);
    if (afterEscalation.status === 'riot' && advanced.status !== 'riot') {
      economy = applyImmediateEffect(economy, RIOT_ECONOMY_EFFECT);
    }
    return afterEscalation;
  });

  const newProtest = rollForProtest(protests, pressure, PROTEST_CAUSES, state.turn, rng);

  return {
    ...state,
    economy,
    protests: newProtest ? [...protests, newProtest] : protests,
  };
}

/**
 * Rolls, once per turn, whether any politician's standing personal wealth
 * alone triggers a conflict-of-interest scandal — independent of any
 * single corrupt act's own detection roll. Skips anyone who already has
 * an unresolved scandal, so this never piles up multiple simultaneous
 * scandals on the same target.
 */
export function runWealthScandalTurn(state: GameState, rng: SeededRng): GameState {
  let scandals = state.scandals;
  for (const politician of state.politicians) {
    const wealth = state.personalWealth[politician.id] ?? BASE_PERSONAL_WEALTH;
    const alreadyUnresolved = scandals.some((s) => s.politicianId === politician.id && s.status === 'unresolved');
    if (alreadyUnresolved) continue;
    if (rollForWealthScandal(wealth, rng)) {
      scandals = [
        ...scandals,
        { id: `wealth-scandal-${state.turn}-${politician.id}`, politicianId: politician.id, tier: 'hard', turn: state.turn, status: 'unresolved' },
      ];
    }
  }
  return { ...state, scandals };
}

/** Rolls, once per turn, whether a new international summit convenes — only when none is already awaiting the player's vote. */
export function runSummitTurn(state: GameState, rng: SeededRng): GameState {
  if (state.activeSummit) return state;
  const summit = rollForSummit(state.turn, SUMMIT_RESOLUTION_TEMPLATES, state.foreignCounterparts, rng);
  return summit ? { ...state, activeSummit: summit } : state;
}

/** Converts mining.ts/manufacturing.ts's wealth-scale facility costs into the small budgetBalance deltas the rest of the engine uses for one-time state spending (see military.ts/logistics.ts's investment tiers). */
const INDUSTRY_BUDGET_COST_SCALE = 100;

/**
 * Resolves one turn of the resource economy: every mine extracts from its
 * deposit and ships what survives transit into the shared national raw
 * stockpile (foreign shipments degrading with relations and cutting out
 * entirely during an active war with the source nation — see
 * logistics.ts); every factory then draws against that same stockpile in
 * array order, so earlier-built factories get first claim on a scarce
 * input; every facility's upkeep is billed to its owner (the budget for
 * state facilities, the player's personal wealth for private ones); and
 * market prices settle against the fresh stockpile levels. A no-op when
 * the player hasn't built anything yet — most turns of most games, since
 * industry is opt-in — so it costs nothing on the shared rng stream until
 * there's actually a mine or factory to resolve.
 */
export function runIndustryTurn(state: GameState, rng: SeededRng): GameState {
  if (state.mines.length === 0 && state.factories.length === 0) return state;

  const player = state.politicians.find((p) => p.isPlayer);
  const playerId = player?.id ?? '';

  let deposits = state.resourceDeposits;
  const rawResourceStockpile = { ...state.rawResourceStockpile };
  let economy = state.economy;
  let personalWealth = state.personalWealth;

  const atWarWith = (counterpartId: string) =>
    state.wars.some((w) => w.counterpartId === counterpartId && w.status === 'active');

  for (const mine of state.mines) {
    const depositIndex = deposits.findIndex((d) => d.id === mine.depositId);
    if (depositIndex === -1) continue;
    const deposit = deposits[depositIndex];
    if (isDepositExhausted(deposit)) continue;

    const { extracted, deposit: updatedDeposit } = extractFromMine(mine, deposit);
    deposits = deposits.map((d, i) => (i === depositIndex ? updatedDeposit : d));

    const efficiency = computeShipmentEfficiency(
      deposit.locationType,
      state.logisticsNetwork,
      state.foreignRelations[deposit.locationId] ?? 0,
      atWarWith(deposit.locationId)
    );
    const shipped = shipResource(extracted, efficiency);
    rawResourceStockpile[deposit.resource] = (rawResourceStockpile[deposit.resource] ?? 0) + shipped;

    const cost = computeMineOperatingCost(mine);
    if (mine.ownership === 'state') {
      economy = applyImmediateEffect(economy, { budgetBalance: -cost / INDUSTRY_BUDGET_COST_SCALE });
    } else {
      personalWealth = { ...personalWealth, [playerId]: (personalWealth[playerId] ?? BASE_PERSONAL_WEALTH) - cost };
    }
  }

  const stateGoodsStockpile = { ...state.stateGoodsStockpile };
  const privateGoodsStockpile = { ...state.privateGoodsStockpile };

  for (const factory of state.factories) {
    const recipe = MANUFACTURING_RECIPES.find((r) => r.id === factory.recipeId);
    if (!recipe) continue;
    const result = processFactoryTurn(factory, recipe, rawResourceStockpile);
    for (const [resource, amount] of Object.entries(result.consumed) as [RawResourceType, number | undefined][]) {
      rawResourceStockpile[resource] = (rawResourceStockpile[resource] ?? 0) - (amount ?? 0);
    }
    const goodsStockpile = factory.ownership === 'state' ? stateGoodsStockpile : privateGoodsStockpile;
    goodsStockpile[recipe.outputGood] = (goodsStockpile[recipe.outputGood] ?? 0) + result.outputProduced;

    const cost = computeFactoryOperatingCost(factory);
    if (factory.ownership === 'state') {
      economy = applyImmediateEffect(economy, { budgetBalance: -cost / INDUSTRY_BUDGET_COST_SCALE });
    } else {
      personalWealth = { ...personalWealth, [playerId]: (personalWealth[playerId] ?? BASE_PERSONAL_WEALTH) - cost };
    }
  }

  const combinedStockpileLevels: Partial<Record<RawResourceType | ProcessedGoodType, number>> = { ...rawResourceStockpile };
  for (const good of Object.keys(state.marketPrices) as (RawResourceType | ProcessedGoodType)[]) {
    if (good in stateGoodsStockpile || good in privateGoodsStockpile) {
      combinedStockpileLevels[good] =
        (stateGoodsStockpile[good as ProcessedGoodType] ?? 0) + (privateGoodsStockpile[good as ProcessedGoodType] ?? 0);
    }
  }
  const marketPrices = updateAllMarketPrices(state.marketPrices, combinedStockpileLevels, rng);

  return {
    ...state,
    resourceDeposits: deposits,
    rawResourceStockpile,
    stateGoodsStockpile,
    privateGoodsStockpile,
    marketPrices,
    economy,
    personalWealth,
  };
}

/**
 * Resolves one turn of the judiciary: any confirmed justice has a small
 * ongoing chance of retiring (vacating their seat), any review case still
 * 'pending' from last turn is resolved against the court's current
 * ideology, and — once the bench has a quorum — any newly-passed bill with
 * no review case on file yet has a real chance of being freshly
 * challenged (to be resolved next turn, giving the challenge one turn of
 * real suspense rather than an instant verdict).
 */
export function runJudiciaryTurn(state: GameState, rng: SeededRng): GameState {
  const court = rollForJusticeRetirements(state.court, rng);

  let bills = state.bills;
  const resolvedCases = state.judicialReviewCases.map((reviewCase) => {
    if (reviewCase.status !== 'pending') return reviewCase;
    const courtIdeology = computeCourtIdeology(court);
    if (!courtIdeology) return reviewCase;
    const bill = bills.find((b) => b.id === reviewCase.billId);
    const sponsor = bill ? state.politicians.find((p) => p.id === bill.sponsorId) : undefined;
    const strikeDownProbability = computeStrikeDownProbability(courtIdeology, sponsor?.ideology ?? { economic: 0, social: 0 });
    const resolved = resolveJudicialReview(reviewCase, strikeDownProbability, rng, state.turn);
    if (resolved.status === 'struck_down') {
      bills = bills.map((b) => (b.id === reviewCase.billId ? { ...b, status: 'struck_down' as const } : b));
    }
    return resolved;
  });

  let judicialReviewCases = resolvedCases;
  if (canHearCases(court)) {
    const alreadyFiledBillIds = new Set(judicialReviewCases.map((c) => c.billId));
    for (const bill of bills) {
      if (bill.status !== 'passed' || alreadyFiledBillIds.has(bill.id)) continue;
      if (rollForJudicialReviewChallenge(rng)) {
        judicialReviewCases = [
          ...judicialReviewCases,
          { id: `review-${bill.id}`, billId: bill.id, billTitle: bill.title, turnFiled: state.turn, status: 'pending' as const },
        ];
      }
    }
  }

  return { ...state, court, bills, judicialReviewCases };
}

/** Accumulates this turn's research points. Unlocking a tech is always a deliberate player action (see unlockTechAction), never automatic. */
export function runResearchTurn(state: GameState): GameState {
  return { ...state, research: advanceResearchPoints(state.research) };
}

/**
 * Advances population by natural growth plus net migration, then feeds
 * that migration back into the economy (a growing/shrinking labor force is
 * a real, if modest, tailwind or headwind) and into voter bloc
 * persuadability (rapid demographic change leaves more of the electorate
 * genuinely undecided, regardless of which direction it runs).
 */
export function runDemographicsTurn(state: GameState): GameState {
  const demographics = advanceDemographicsTurn(state.demographics, state.economy);
  const economy = applyImmediateEffect(state.economy, computeLaborForceEffect(demographics.netMigrationRate));
  const voterBlocs = applyDemographicChangeToBlocs(state.voterBlocs, demographics.netMigrationRate);
  return { ...state, demographics, economy, voterBlocs };
}

const SOCIAL_POLICY_APPROVAL_DECAY_TURNS = 6;

/** Nudges healthcare/education/welfare outcome indicators toward their funding-implied targets, bills the ongoing cost, and reflects the result back onto the player's public approval. */
export function runSocialPolicyTurn(state: GameState): GameState {
  const socialPolicy = advanceSocialIndicators(state.socialPolicy);
  const economy = applyImmediateEffect(state.economy, computeSocialPolicyBudgetEffect(socialPolicy));
  const player = state.politicians.find((p) => p.isPlayer);
  const politicians = player
    ? state.politicians.map((p) =>
        p.id === player.id
          ? pushApprovalEvent(p, 'public', computeSocialPolicyApprovalImpact(socialPolicy), SOCIAL_POLICY_APPROVAL_DECAY_TURNS)
          : p
      )
    : state.politicians;
  return { ...state, socialPolicy, economy, politicians };
}

/**
 * Resolves one turn for every founded company: fundamentals take a bounded
 * random walk and (once public) share price follows, then any public
 * company the player holds shares in pays out a real per-turn dividend
 * straight to personal wealth.
 */
export function runEnterpriseTurn(state: GameState, rng: SeededRng): GameState {
  if (state.companies.length === 0) return state;

  const player = state.politicians.find((p) => p.isPlayer);
  const playerId = player?.id ?? '';
  let personalWealth = state.personalWealth;

  const companies = state.companies.map((company) => {
    const advanced = advanceCompanyTurn(company, state.economy.gdpGrowth, rng);
    const dividend = computeDividendPayout(advanced);
    if (dividend > 0) {
      personalWealth = { ...personalWealth, [playerId]: (personalWealth[playerId] ?? BASE_PERSONAL_WEALTH) + dividend };
    }
    return advanced;
  });

  return { ...state, companies, personalWealth };
}

const CRIME_APPROVAL_DECAY_TURNS = 6;

/**
 * Resolves one turn of crime and public safety: the crime rate drifts
 * toward what real poverty and unemployment (plus the funded policing
 * tier) imply, incarceration follows crime, organized crime entrenches or
 * retreats, policing's ongoing cost and any organized-crime budget drag
 * both hit the budget, and the net change in public safety feeds back to
 * approval.
 */
export function runPublicSafetyTurn(state: GameState): GameState {
  const unresolvedScandalCount = state.scandals.filter((s) => s.status === 'unresolved').length;
  let crime = advanceCrimeRate(state.crime, state.socialPolicy.povertyRate, state.economy.unemployment);
  crime = advanceIncarcerationRate(crime);
  crime = advanceOrganizedCrimeInfluence(crime, unresolvedScandalCount);

  let economy = applyImmediateEffect(state.economy, computePolicingBudgetEffect(crime.policingFunding));
  economy = applyImmediateEffect(economy, computeOrganizedCrimeEconomyEffect(crime.organizedCrimeInfluence));

  const player = state.politicians.find((p) => p.isPlayer);
  const politicians = player
    ? state.politicians.map((p) =>
        p.id === player.id ? pushApprovalEvent(p, 'public', computeCrimeApprovalImpact(crime), CRIME_APPROVAL_DECAY_TURNS) : p
      )
    : state.politicians;

  return { ...state, crime, economy, politicians };
}

/**
 * Resolves one turn of environment and climate: real emissions from the
 * mines and factories actually built push pollution up (offset by
 * renewable share and natural absorption), renewable share drifts toward
 * whatever the energy policy implies, and pollution taxes growth directly
 * — its effect on disaster odds lives in events.ts's computeEventWeight.
 */
export function runEnvironmentTurn(state: GameState): GameState {
  const emissions = computeIndustrialEmissions(state.mines, state.factories);
  let environment = advancePollutionIndex(state.environment, emissions);
  environment = advanceRenewableShare(environment);
  const economy = applyImmediateEffect(state.economy, computePollutionEconomyEffect(environment.pollutionIndex));
  return { ...state, environment, economy };
}

const INFRASTRUCTURE_APPROVAL_DECAY_TURNS = 6;

/** Resolves one turn of infrastructure: every category decays a little without fresh investment, and average quality feeds both economic productivity and public approval. */
export function runInfrastructureTurn(state: GameState): GameState {
  const infrastructure = advanceInfrastructureDecay(state.infrastructure);
  const economy = applyImmediateEffect(state.economy, computeInfrastructureEconomyEffect(infrastructure));
  const player = state.politicians.find((p) => p.isPlayer);
  const politicians = player
    ? state.politicians.map((p) =>
        p.id === player.id
          ? pushApprovalEvent(p, 'public', computeInfrastructureApprovalImpact(infrastructure), INFRASTRUCTURE_APPROVAL_DECAY_TURNS)
          : p
      )
    : state.politicians;
  return { ...state, infrastructure, economy, politicians };
}

/**
 * Resolves one turn of Chirp: this turn's crisis events, fresh scandals,
 * newly-declared wars, judicial rulings just resolved, an approval-trend
 * reaction, and a little ambient chatter all generate real posts, and the
 * player passively gains (or stops gaining) followers depending on how
 * popular they currently are.
 */
export function runSocialMediaTurn(state: GameState, rng: SeededRng): GameState {
  const newPosts = generateFeedPosts(state, rng, PERSONAS, POST_TEMPLATES);
  const posts = [...state.socialMedia.posts, ...newPosts].slice(-MAX_FEED_POSTS);
  const player = state.politicians.find((p) => p.isPlayer);
  const passiveGrowth = player ? computePassiveFollowerGrowth(player.approval.public) : 0;
  return { ...state, socialMedia: { posts, followerCount: state.socialMedia.followerCount + passiveGrowth } };
}

/**
 * Resolves one turn of grassroots movement activity: every active movement
 * grows or decays with how aggrieved its origin bloc currently is (and
 * fully decayed ones are dropped), a fresh movement may organize out of
 * whichever bloc is worst-off, the first sufficiently large hostile
 * movement may stage its own protest (never stacking on an already-active
 * one), and the net approval pressure of every active movement — support
 * pulling the player's approval up, hostility pulling it down — lands as a
 * single real, decaying approval event.
 */
export function runMovementsTurn(state: GameState, rng: SeededRng): GameState {
  const player = state.politicians.find((p) => p.isPlayer);
  const playerIdeology = player?.ideology ?? { economic: 0, social: 0 };

  const advanced = state.movements
    .map((m) => advanceMovementSize(m, state.voterBlocs, playerIdeology))
    .filter(isMovementActive);

  const spawned = trySpawnMovement(
    state.voterBlocs,
    advanced,
    playerIdeology,
    state.turn,
    rng,
    MOVEMENT_NAME_TEMPLATES,
    MOVEMENT_MISSION_TEMPLATES
  );
  const movements = spawned ? [...advanced, spawned] : advanced;

  let protests = state.protests;
  for (const movement of movements) {
    const stance = computeMovementStance(movement, playerIdeology);
    const protest = rollMovementProtest(movement, stance, protests, state.turn, rng);
    if (protest) {
      protests = [...protests, protest];
      break;
    }
  }

  let politicians = state.politicians;
  if (player) {
    const pressure = computeMovementApprovalPressure(movements, playerIdeology);
    if (pressure !== 0) {
      politicians = politicians.map((p) => (p.id === player.id ? pushApprovalEvent(p, 'public', pressure, 4) : p));
    }
  }

  return { ...state, movements, protests, politicians };
}

export function advanceTurn(state: GameState): GameState {
  const settings = getDifficultySettings(state.difficulty);
  const cabinetEffects = computeCabinetEffects(state.cabinet, state.politicians);
  const rng = SeededRng.fromState(state.rngState);
  const economy = advanceEconomy(
    state.economy,
    rng,
    settings.economyVolatilityMultiplier * cabinetEffects.economyVolatilityMultiplier
  );
  const politicians = state.politicians.map((p) => advanceApproval(p, state.voterBlocs));
  const interestGroups = decayGroupDispositions(state.interestGroups);
  let next: GameState = { ...state, economy, politicians, interestGroups, turn: state.turn + 1 };

  next = runNpcTurn(next, rng);
  next = runWarTurns(next, rng);
  next = runLeadershipChallengeTurn(next, rng);
  next = runSecessionTurn(next, rng);
  next = runUnrestTurn(next, rng);
  next = runWealthScandalTurn(next, rng);
  next = runSummitTurn(next, rng);
  next = runIndustryTurn(next, rng);
  next = runJudiciaryTurn(next, rng);
  next = runResearchTurn(next);
  next = runDemographicsTurn(next);
  next = runSocialPolicyTurn(next);
  next = runEnterpriseTurn(next, rng);
  next = runPublicSafetyTurn(next);
  next = runEnvironmentTurn(next);
  next = runInfrastructureTurn(next);
  next = runSocialMediaTurn(next, rng);
  next = runMovementsTurn(next, rng);

  const eventChance = DEFAULT_EVENT_CHANCE * settings.eventChanceMultiplier * (next.houseRules.doubleEventFrequency ? 2 : 1);
  const eventDef = rollForEvent(CRISIS_TABLE, next, rng, eventChance);
  if (eventDef) {
    next = applyCrisisEvent(next, eventDef);
  }

  // Dilemmas are the interactive cousin of the crisis table above — at
  // most one awaiting the player's choice at a time, same guard shape as
  // runSummitTurn's activeSummit check.
  if (!next.activeDilemma) {
    const dilemmaChance = DEFAULT_DILEMMA_CHANCE * settings.eventChanceMultiplier * (next.houseRules.doubleEventFrequency ? 2 : 1);
    const dilemma = rollForDilemma(DILEMMA_TABLE, next, rng, dilemmaChance);
    if (dilemma) {
      next = { ...next, activeDilemma: dilemma };
    }
  }

  return { ...next, rngState: rng.getState() };
}

const ALLY_STRENGTH_CONTRIBUTION = 0.35;

/**
 * Active defense-treaty partners chip in a fraction of their own effective
 * military strength — a real, mechanical payoff for having allies, not
 * just flavor. A partner who happens to be the war's own counterpart
 * (shouldn't normally happen, but the state doesn't forbid it) contributes
 * nothing.
 */
function computeAllyStrengthBonus(state: GameState, warCounterpartId: string): number {
  let bonus = 0;
  for (const treaty of state.treaties) {
    if (treaty.type !== 'defense' || treaty.status !== 'active' || treaty.counterpartId === warCounterpartId) continue;
    const ally = state.foreignCounterparts.find((c) => c.id === treaty.counterpartId);
    if (ally) bonus += computeEffectiveStrength(ally.military) * ALLY_STRENGTH_CONTRIBUTION;
  }
  return bonus;
}

/**
 * Resolves one turn for every currently active war: compares the player's
 * military (plus any allied defense-treaty contribution) against each
 * counterpart's, applies the resulting economic effect, wears both
 * militaries down a little (attrition — a war leaves everyone weaker, win
 * or lose), and — if a war concludes this turn — applies the relation
 * penalty for how it ended. A no-op when no war is active, so most turns
 * don't touch the rng for this at all.
 */
export function runWarTurns(state: GameState, rng: SeededRng): GameState {
  if (!state.wars.some((w) => w.status === 'active')) return state;

  let economy = state.economy;
  let foreignRelations = state.foreignRelations;
  let playerMilitary = state.playerMilitary;
  let foreignCounterparts = state.foreignCounterparts;
  const cabinetWarBonus = computeCabinetEffects(state.cabinet, state.politicians).warStrengthBonus;

  const wars = state.wars.map((war) => {
    if (war.status !== 'active') return war;
    const counterpart = foreignCounterparts.find((c) => c.id === war.counterpartId);
    if (!counterpart) return war;

    const allyBonus = computeAllyStrengthBonus(state, war.counterpartId) + cabinetWarBonus;
    const result = resolveWarTurn(war, playerMilitary, counterpart.military, state.turn, rng, allyBonus);
    economy = applyImmediateEffect(economy, result.economyEffect);
    playerMilitary = applyWarAttrition(playerMilitary);
    foreignCounterparts = foreignCounterparts.map((c) =>
      c.id === counterpart.id ? { ...c, military: applyWarAttrition(c.military) } : c
    );
    if (result.war.status !== 'active') {
      const delta = computeWarResolutionRelationDelta(result.war.status);
      foreignRelations = adjustRelation(foreignRelations, war.counterpartId, delta);
    }
    return result.war;
  });

  return { ...state, wars, economy, foreignRelations, playerMilitary, foreignCounterparts };
}

/**
 * Holds a press interview for the player: charisma + media savvy driven,
 * with a real chance of a gaffe. Pushes a decaying public-approval event
 * rather than an instant jump.
 */
export function holdPressInterview(state: GameState): { state: GameState; outcome: CampaignActionOutcome } {
  const rng = SeededRng.fromState(state.rngState);
  const player = state.politicians.find((p) => p.isPlayer);
  if (!player) {
    return { state, outcome: { outcome: 'solid', approvalImpact: 0 } };
  }
  const outcome = attemptPressInterview(player, rng);
  const politicians = state.politicians.map((p) =>
    p.id === player.id ? pushApprovalEvent(p, 'public', outcome.approvalImpact, 4) : p
  );
  return { state: { ...state, politicians, rngState: rng.getState() }, outcome };
}

/**
 * Holds a campaign rally for the player: charisma + network driven, moving
 * the party base's approval rather than the general public's.
 */
export function holdRally(state: GameState): { state: GameState; outcome: CampaignActionOutcome } {
  const rng = SeededRng.fromState(state.rngState);
  const player = state.politicians.find((p) => p.isPlayer);
  if (!player) {
    return { state, outcome: { outcome: 'solid', approvalImpact: 0 } };
  }
  const outcome = attemptRally(player, rng);
  const politicians = state.politicians.map((p) =>
    p.id === player.id ? pushApprovalEvent(p, 'base', outcome.approvalImpact, 4) : p
  );
  return { state: { ...state, politicians, rngState: rng.getState() }, outcome };
}

/**
 * Holds a full press conference on a chosen topic — higher stakes than a
 * plain interview, and which attributes matter depends on the topic (see
 * campaign.ts's computeTopicSkill).
 */
export function holdPressConference(
  state: GameState,
  topic: PressTopic
): { state: GameState; outcome: CampaignActionOutcome } {
  const rng = SeededRng.fromState(state.rngState);
  const player = state.politicians.find((p) => p.isPlayer);
  if (!player) {
    return { state, outcome: { outcome: 'solid', approvalImpact: 0 } };
  }
  const outcome = attemptPressConference(player, topic, rng);
  const politicians = state.politicians.map((p) =>
    p.id === player.id ? pushApprovalEvent(p, 'public', outcome.approvalImpact, 5) : p
  );
  return { state: { ...state, politicians, rngState: rng.getState() }, outcome };
}

/**
 * Holds a debate between the player and a chosen rival. The winner gets a
 * real public-approval bump; everyone else takes a smaller hit. Defaults
 * to the player's highest-approval rival if no rivalId is given.
 */
export function holdDebateAction(
  state: GameState,
  rivalId?: string
): { state: GameState; outcome: DebateResult | null } {
  const player = state.politicians.find((p) => p.isPlayer);
  if (!player) return { state, outcome: null };

  const rival = rivalId
    ? state.politicians.find((p) => p.id === rivalId && !p.isPlayer)
    : state.politicians
        .filter((p) => !p.isPlayer)
        .reduce((best, p) => (!best || p.approval.public > best.approval.public ? p : best), undefined as Politician | undefined);
  if (!rival) return { state, outcome: null };

  const rng = SeededRng.fromState(state.rngState);
  const result = resolveDebate([player, rival], rng);

  const politicians = state.politicians.map((p) => {
    if (p.id !== player.id && p.id !== rival.id) return p;
    const impact = p.id === result.winnerId ? DEBATE_WINNER_APPROVAL_BONUS : DEBATE_LOSER_APPROVAL_PENALTY;
    return pushApprovalEvent(p, 'public', impact, 6);
  });

  return { state: { ...state, politicians, rngState: rng.getState() }, outcome: result };
}

/**
 * Seeks an endorsement from one of the country's celebrities, unions, or
 * newspapers. Success depends on real ideological alignment and carries a
 * prominence-scaled public-approval bump; a rejected pitch carries none —
 * only one endorsement per endorser is ever recorded.
 */
export function seekEndorsementAction(
  state: GameState,
  endorserId: string
): { state: GameState; outcome: EndorsementAttemptResult | null } {
  const player = state.politicians.find((p) => p.isPlayer);
  const endorser = state.endorsers.find((e) => e.id === endorserId);
  if (!player || !endorser) return { state, outcome: null };
  if (state.endorsements.some((e) => e.endorserId === endorserId)) return { state, outcome: null };

  const rng = SeededRng.fromState(state.rngState);
  const outcome = attemptEndorsement(endorser, player, rng);

  if (!outcome.success) {
    return { state: { ...state, rngState: rng.getState() }, outcome };
  }

  const politicians = state.politicians.map((p) =>
    p.id === player.id ? pushApprovalEvent(p, 'public', outcome.approvalImpact, 8) : p
  );
  const endorsements = [...state.endorsements, { endorserId, politicianId: player.id, turn: state.turn }];

  return { state: { ...state, politicians, endorsements, rngState: rng.getState() }, outcome };
}

/** Commissions a poll of the player's own public approval from the given firm. */
export function commissionApprovalPollAction(
  state: GameState,
  firmId: string
): { state: GameState; outcome: PollResult | null } {
  const firm = state.pollingFirms.find((f) => f.id === firmId);
  const player = state.politicians.find((p) => p.isPlayer);
  if (!firm || !player) return { state, outcome: null };

  const rng = SeededRng.fromState(state.rngState);
  const poll = commissionApprovalPoll(firm, player, state.turn, rng);
  return { state: { ...state, polls: [...state.polls, poll], rngState: rng.getState() }, outcome: poll };
}

/** Commissions a poll of a party's current support from the given firm. */
export function commissionPartyPollAction(
  state: GameState,
  firmId: string,
  partyId: string
): { state: GameState; outcome: PollResult | null } {
  const firm = state.pollingFirms.find((f) => f.id === firmId);
  const party = state.parties.find((p) => p.id === partyId);
  if (!firm || !party) return { state, outcome: null };

  const rng = SeededRng.fromState(state.rngState);
  const poll = commissionPartyPoll(firm, party, state.parties, state.turn, rng);
  return { state: { ...state, polls: [...state.polls, poll], rngState: rng.getState() }, outcome: poll };
}

export type FacilityActionFailureReason =
  | 'deposit_not_found'
  | 'deposit_claimed'
  | 'deposit_exhausted'
  | 'factory_not_found'
  | 'mine_not_found'
  | 'recipe_not_found'
  | 'max_tier'
  | 'insufficient_wealth';

export interface FacilityActionOutcome {
  success: boolean;
  reason?: FacilityActionFailureReason;
}

function debitFacilityCost(state: GameState, ownership: FacilityOwnership, cost: number, playerId: string): GameState {
  if (ownership === 'state') {
    return { ...state, economy: applyImmediateEffect(state.economy, { budgetBalance: -cost / INDUSTRY_BUDGET_COST_SCALE }) };
  }
  return {
    ...state,
    personalWealth: { ...state.personalWealth, [playerId]: (state.personalWealth[playerId] ?? BASE_PERSONAL_WEALTH) - cost },
  };
}

function hasSufficientWealth(state: GameState, ownership: FacilityOwnership, cost: number, playerId: string): boolean {
  return ownership !== 'private' || (state.personalWealth[playerId] ?? BASE_PERSONAL_WEALTH) >= cost;
}

/**
 * Claims an undeveloped deposit with a fresh tier-1 mine. Fails if the
 * deposit doesn't exist, is already exhausted, already has a mine on it
 * (one mine per deposit), or — for a privately-funded mine — the player
 * can't yet afford it out of personal wealth (a state-funded mine has no
 * such gate, matching how every other one-time state investment in this
 * engine works: it costs a budgetBalance hit, never an affordability check).
 */
export function buildMineAction(
  state: GameState,
  depositId: string,
  ownership: FacilityOwnership
): { state: GameState; outcome: FacilityActionOutcome; mine: Mine | null } {
  const deposit = state.resourceDeposits.find((d) => d.id === depositId);
  if (!deposit) return { state, outcome: { success: false, reason: 'deposit_not_found' }, mine: null };
  if (isDepositExhausted(deposit)) return { state, outcome: { success: false, reason: 'deposit_exhausted' }, mine: null };
  if (state.mines.some((m) => m.depositId === depositId)) {
    return { state, outcome: { success: false, reason: 'deposit_claimed' }, mine: null };
  }

  const playerId = state.politicians.find((p) => p.isPlayer)?.id ?? '';
  if (!hasSufficientWealth(state, ownership, MINE_BUILD_COST, playerId)) {
    return { state, outcome: { success: false, reason: 'insufficient_wealth' }, mine: null };
  }

  const mine = buildMine(`mine-${depositId}`, depositId, ownership, state.turn);
  const nextState = debitFacilityCost(
    { ...state, mines: [...state.mines, mine] },
    ownership,
    MINE_BUILD_COST,
    playerId
  );
  return { state: nextState, outcome: { success: true }, mine };
}

/** Upgrades an existing mine one tier, billed to whichever pool funds it (see buildMineAction). */
export function upgradeMineAction(state: GameState, mineId: string): { state: GameState; outcome: FacilityActionOutcome } {
  const mine = state.mines.find((m) => m.id === mineId);
  if (!mine) return { state, outcome: { success: false, reason: 'mine_not_found' } };
  if (mine.tier >= MAX_MINE_TIER) return { state, outcome: { success: false, reason: 'max_tier' } };

  const cost = MINE_UPGRADE_COST[mine.tier + 1];
  const playerId = state.politicians.find((p) => p.isPlayer)?.id ?? '';
  if (!hasSufficientWealth(state, mine.ownership, cost, playerId)) {
    return { state, outcome: { success: false, reason: 'insufficient_wealth' } };
  }

  const mines = state.mines.map((m) => (m.id === mineId ? upgradeMine(m) : m));
  const nextState = debitFacilityCost({ ...state, mines }, mine.ownership, cost, playerId);
  return { state: nextState, outcome: { success: true } };
}

/** Builds a fresh tier-1 factory at a location running the given recipe. See buildMineAction for the ownership/affordability rules this mirrors. */
export function buildFactoryAction(
  state: GameState,
  locationId: string,
  locationType: FacilityLocationType,
  recipeId: string,
  ownership: FacilityOwnership
): { state: GameState; outcome: FacilityActionOutcome; factory: Factory | null } {
  if (!MANUFACTURING_RECIPES.some((r) => r.id === recipeId)) {
    return { state, outcome: { success: false, reason: 'recipe_not_found' }, factory: null };
  }

  const playerId = state.politicians.find((p) => p.isPlayer)?.id ?? '';
  if (!hasSufficientWealth(state, ownership, FACTORY_BUILD_COST, playerId)) {
    return { state, outcome: { success: false, reason: 'insufficient_wealth' }, factory: null };
  }

  const factory = buildFactory(`factory-${state.factories.length}-${state.turn}`, locationId, locationType, recipeId, ownership, state.turn);
  const nextState = debitFacilityCost(
    { ...state, factories: [...state.factories, factory] },
    ownership,
    FACTORY_BUILD_COST,
    playerId
  );
  return { state: nextState, outcome: { success: true }, factory };
}

/** Upgrades an existing factory one tier, billed to whichever pool funds it (see buildFactoryAction). */
export function upgradeFactoryAction(state: GameState, factoryId: string): { state: GameState; outcome: FacilityActionOutcome } {
  const factory = state.factories.find((f) => f.id === factoryId);
  if (!factory) return { state, outcome: { success: false, reason: 'factory_not_found' } };
  if (factory.tier >= MAX_FACTORY_TIER) return { state, outcome: { success: false, reason: 'max_tier' } };

  const cost = FACTORY_UPGRADE_COST[factory.tier + 1];
  const playerId = state.politicians.find((p) => p.isPlayer)?.id ?? '';
  if (!hasSufficientWealth(state, factory.ownership, cost, playerId)) {
    return { state, outcome: { success: false, reason: 'insufficient_wealth' } };
  }

  const factories = state.factories.map((f) => (f.id === factoryId ? upgradeFactory(f) : f));
  const nextState = debitFacilityCost({ ...state, factories }, factory.ownership, cost, playerId);
  return { state: nextState, outcome: { success: true } };
}

/**
 * Sells raw resources straight off the shared national stockpile — since
 * that stockpile isn't itself split by ownership (any mine, state or
 * private, feeds the same pool), the seller explicitly chooses who profits
 * from this particular sale: the national budget or their own pocket.
 */
export function sellRawResourceAction(
  state: GameState,
  resource: RawResourceType,
  units: number,
  sellAs: FacilityOwnership
): { state: GameState; sale: SaleResult } {
  const available = state.rawResourceStockpile[resource] ?? 0;
  const price = state.marketPrices[resource] ?? 0;
  const sale = sellFromStockpile(units, available, price);
  if (sale.unitsSold <= 0) return { state, sale };

  const rawResourceStockpile = { ...state.rawResourceStockpile, [resource]: available - sale.unitsSold };
  const playerId = state.politicians.find((p) => p.isPlayer)?.id ?? '';
  const withStockpile: GameState = { ...state, rawResourceStockpile };

  const nextState =
    sellAs === 'state'
      ? { ...withStockpile, economy: applyImmediateEffect(withStockpile.economy, { budgetBalance: sale.revenue / INDUSTRY_BUDGET_COST_SCALE }) }
      : {
          ...withStockpile,
          personalWealth: {
            ...withStockpile.personalWealth,
            [playerId]: (withStockpile.personalWealth[playerId] ?? BASE_PERSONAL_WEALTH) + sale.revenue,
          },
        };

  return { state: nextState, sale };
}

/** Sells finished goods from whichever ownership's stockpile they're sitting in — unambiguous, since state and private goods are already tracked separately. */
export function sellProcessedGoodAction(
  state: GameState,
  good: ProcessedGoodType,
  units: number,
  ownership: FacilityOwnership
): { state: GameState; sale: SaleResult } {
  const stockpile = ownership === 'state' ? state.stateGoodsStockpile : state.privateGoodsStockpile;
  const available = stockpile[good] ?? 0;
  const price = state.marketPrices[good] ?? 0;
  const sale = sellFromStockpile(units, available, price);
  if (sale.unitsSold <= 0) return { state, sale };

  const updatedStockpile = { ...stockpile, [good]: available - sale.unitsSold };
  const playerId = state.politicians.find((p) => p.isPlayer)?.id ?? '';

  if (ownership === 'state') {
    return {
      state: {
        ...state,
        stateGoodsStockpile: updatedStockpile,
        economy: applyImmediateEffect(state.economy, { budgetBalance: sale.revenue / INDUSTRY_BUDGET_COST_SCALE }),
      },
      sale,
    };
  }
  return {
    state: {
      ...state,
      privateGoodsStockpile: updatedStockpile,
      personalWealth: { ...state.personalWealth, [playerId]: (state.personalWealth[playerId] ?? BASE_PERSONAL_WEALTH) + sale.revenue },
    },
    sale,
  };
}

export type JudiciaryActionFailureReason = 'invalid_seat' | 'no_nominee' | 'already_confirmed';

export interface JudiciaryActionOutcome {
  success: boolean;
  reason?: JudiciaryActionFailureReason;
}

/**
 * The player nominates a fresh candidate to a court seat — vacant, or
 * replacing whoever's currently sitting there awaiting confirmation (an
 * already-confirmed justice can't be un-nominated this way; they have to
 * retire on their own). The nominee's ideology jitters around the player's
 * own party — heads of government tend to nominate ideologically
 * sympathetic judges — and integrity is drawn fresh each time, so a "safe"
 * pick is never guaranteed.
 */
export function nominateJusticeAction(state: GameState, seatIndex: number): { state: GameState; outcome: JudiciaryActionOutcome } {
  if (seatIndex < 0 || seatIndex >= state.court.seats.length) {
    return { state, outcome: { success: false, reason: 'invalid_seat' } };
  }
  const existing = state.court.seats[seatIndex];
  if (existing && existing.status === 'confirmed') {
    return { state, outcome: { success: false, reason: 'already_confirmed' } };
  }

  const rng = SeededRng.fromState(state.rngState);
  const player = state.politicians.find((p) => p.isPlayer);
  const playerParty = state.parties.find((p) => p.id === player?.partyId);
  const baseIdeology = playerParty?.ideology ?? { economic: 0, social: 0 };
  const jitter = () => (rng.next() - 0.5) * 40;
  const nominee = {
    id: `justice-${state.turn}-${seatIndex}-${rng.nextInt(1000, 9999)}`,
    name: generateName(rng),
    ideology: { economic: clampAxis(baseIdeology.economic + jitter()), social: clampAxis(baseIdeology.social + jitter()) },
    integrity: rng.nextInt(3, 10),
  };

  const court = nominateJustice(state.court, seatIndex, nominee, state.turn);
  return { state: { ...state, court, rngState: rng.getState() }, outcome: { success: true } };
}

/** Puts the nominee currently sitting in `seatIndex` to a full-chamber confirmation vote. A simple majority confirms; a rejected nominee leaves the seat vacant again. */
export function confirmJusticeAction(
  state: GameState,
  seatIndex: number
): { state: GameState; outcome: JudiciaryActionOutcome; result: ConfirmationVoteResult | null } {
  const nominee = state.court.seats[seatIndex];
  if (!nominee || nominee.status !== 'nominated') {
    return { state, outcome: { success: false, reason: 'no_nominee' }, result: null };
  }
  const rng = SeededRng.fromState(state.rngState);
  const result = resolveConfirmationVote(nominee, state.politicians, rng);
  const court = applyConfirmationResult(state.court, seatIndex, result);
  return { state: { ...state, court, rngState: rng.getState() }, outcome: { success: true }, result };
}

export type TechActionFailureReason = 'tech_not_found' | 'already_unlocked' | 'prerequisites_not_met' | 'insufficient_points';

export interface TechActionOutcome {
  success: boolean;
  reason?: TechActionFailureReason;
}

/** Spends accumulated research points to unlock a tech-tree node, applying its one-time economic payoff immediately. */
export function unlockTechAction(state: GameState, techId: string): { state: GameState; outcome: TechActionOutcome } {
  const tech = TECH_TREE.find((t) => t.id === techId);
  if (!tech) return { state, outcome: { success: false, reason: 'tech_not_found' } };
  if (!isTechAvailable(tech, state.research.unlockedTechIds)) {
    const alreadyUnlocked = state.research.unlockedTechIds.includes(tech.id);
    return { state, outcome: { success: false, reason: alreadyUnlocked ? 'already_unlocked' : 'prerequisites_not_met' } };
  }
  if (!canAffordTech(tech, state.research.accumulatedPoints)) {
    return { state, outcome: { success: false, reason: 'insufficient_points' } };
  }
  const { research, economyEffect } = unlockTech(state.research, tech);
  const economy = applyImmediateEffect(state.economy, economyEffect);
  return { state: { ...state, research, economy }, outcome: { success: true } };
}

export type EnterpriseActionFailureReason = 'company_not_found' | 'already_public' | 'not_public' | 'insufficient_wealth';

export interface EnterpriseActionOutcome {
  success: boolean;
  reason?: EnterpriseActionFailureReason;
}

/** Founds a new, fully player-owned private company — always personally funded, never state-owned (this is entrepreneurship, not industrial policy; compare buildMineAction/buildFactoryAction). */
export function foundCompanyAction(
  state: GameState,
  name: string,
  sector: CompanySector
): { state: GameState; outcome: EnterpriseActionOutcome; company: Company | null } {
  const playerId = state.politicians.find((p) => p.isPlayer)?.id ?? '';
  if ((state.personalWealth[playerId] ?? BASE_PERSONAL_WEALTH) < COMPANY_FOUNDING_COST) {
    return { state, outcome: { success: false, reason: 'insufficient_wealth' }, company: null };
  }

  const rng = SeededRng.fromState(state.rngState);
  const company = foundCompany(`company-${state.companies.length}-${state.turn}`, name, sector, playerId, state.turn, rng);
  const personalWealth = { ...state.personalWealth, [playerId]: (state.personalWealth[playerId] ?? BASE_PERSONAL_WEALTH) - COMPANY_FOUNDING_COST };
  return {
    state: { ...state, companies: [...state.companies, company], personalWealth, rngState: rng.getState() },
    outcome: { success: true },
    company,
  };
}

/** Takes a private company public — a real IPO, cashing out a slice of the founder's own stake for immediate proceeds. */
export function ipoCompanyAction(state: GameState, companyId: string): { state: GameState; outcome: EnterpriseActionOutcome; proceeds: number } {
  const company = state.companies.find((c) => c.id === companyId);
  if (!company) return { state, outcome: { success: false, reason: 'company_not_found' }, proceeds: 0 };
  if (company.isPublic) return { state, outcome: { success: false, reason: 'already_public' }, proceeds: 0 };

  const { company: updated, proceeds } = ipoCompany(company);
  const playerId = state.politicians.find((p) => p.isPlayer)?.id ?? '';
  const companies = state.companies.map((c) => (c.id === companyId ? updated : c));
  const personalWealth = { ...state.personalWealth, [playerId]: (state.personalWealth[playerId] ?? BASE_PERSONAL_WEALTH) + proceeds };
  return { state: { ...state, companies, personalWealth }, outcome: { success: true }, proceeds };
}

/** Buys shares on the open market — only possible once a company is public. */
export function buySharesAction(
  state: GameState,
  companyId: string,
  budgetToSpend: number
): { state: GameState; outcome: EnterpriseActionOutcome } {
  const company = state.companies.find((c) => c.id === companyId);
  if (!company) return { state, outcome: { success: false, reason: 'company_not_found' } };
  if (!company.isPublic) return { state, outcome: { success: false, reason: 'not_public' } };
  const playerId = state.politicians.find((p) => p.isPlayer)?.id ?? '';
  if ((state.personalWealth[playerId] ?? BASE_PERSONAL_WEALTH) < budgetToSpend) {
    return { state, outcome: { success: false, reason: 'insufficient_wealth' } };
  }

  const { company: updated, cashDelta } = buyShares(company, budgetToSpend);
  const companies = state.companies.map((c) => (c.id === companyId ? updated : c));
  const personalWealth = { ...state.personalWealth, [playerId]: (state.personalWealth[playerId] ?? BASE_PERSONAL_WEALTH) - cashDelta };
  return { state: { ...state, companies, personalWealth }, outcome: { success: true } };
}

/** Sells shares on the open market, capped at whatever is actually held. */
export function sellSharesAction(
  state: GameState,
  companyId: string,
  shares: number
): { state: GameState; outcome: EnterpriseActionOutcome } {
  const company = state.companies.find((c) => c.id === companyId);
  if (!company) return { state, outcome: { success: false, reason: 'company_not_found' } };
  if (!company.isPublic) return { state, outcome: { success: false, reason: 'not_public' } };

  const { company: updated, cashDelta } = sellShares(company, shares);
  const playerId = state.politicians.find((p) => p.isPlayer)?.id ?? '';
  const companies = state.companies.map((c) => (c.id === companyId ? updated : c));
  const personalWealth = { ...state.personalWealth, [playerId]: (state.personalWealth[playerId] ?? BASE_PERSONAL_WEALTH) - cashDelta };
  return { state: { ...state, companies, personalWealth }, outcome: { success: true } };
}

export interface TweetActionOutcome {
  success: boolean;
  reason?: 'option_not_found';
}

const TWEET_APPROVAL_DECAY_TURNS = 5;

/**
 * Posts one of the player's pre-written Chirp options — scored against
 * voter blocs for a real, bounded approval impact (see
 * socialMedia.ts's computeTweetApprovalImpact), with a real chance of a
 * genuine follower spike when it lands especially well.
 */
export function postTweetAction(state: GameState, optionId: string): { state: GameState; outcome: TweetActionOutcome } {
  const option = PLAYER_TWEET_OPTIONS.find((o) => o.id === optionId);
  const player = state.politicians.find((p) => p.isPlayer);
  if (!option || !player) return { state, outcome: { success: false, reason: 'option_not_found' } };

  const rng = SeededRng.fromState(state.rngState);
  const handle = `@${player.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}`;
  const post = createPlayerPost(option, player.name, handle, state.turn, rng);
  const approvalImpact = computeTweetApprovalImpact(option.stance, state.voterBlocs);
  const followerGrowth = computeFollowerGrowth(approvalImpact, rng);

  const politicians = state.politicians.map((p) =>
    p.id === player.id ? pushApprovalEvent(p, 'public', approvalImpact, TWEET_APPROVAL_DECAY_TURNS) : p
  );
  const posts = [...state.socialMedia.posts, post].slice(-MAX_FEED_POSTS);
  const socialMedia = { posts, followerCount: state.socialMedia.followerCount + followerGrowth };

  return {
    state: { ...state, politicians, socialMedia, rngState: rng.getState() },
    outcome: { success: true },
  };
}

/**
 * The player directly courts one interest group — meetings, funding
 * pledges, an endorsement ask — driven by their network and charisma. A
 * no-op (identity outcome) if the group id doesn't exist, so callers don't
 * need to pre-validate.
 */
export function courtInterestGroupAction(
  state: GameState,
  groupId: string
): { state: GameState; outcome: CourtGroupOutcome } {
  const rng = SeededRng.fromState(state.rngState);
  const player = state.politicians.find((p) => p.isPlayer);
  const group = state.interestGroups.find((g) => g.id === groupId);
  if (!player || !group) {
    return { state, outcome: { success: false, dispositionDelta: 0 } };
  }
  const outcome = courtInterestGroup(player, rng);
  const interestGroups = state.interestGroups.map((g) =>
    g.id === groupId ? applyCourtOutcome(g, outcome) : g
  );
  return { state: { ...state, interestGroups, rngState: rng.getState() }, outcome };
}

/**
 * While a leadership challenge against the player is brewing, works the
 * party's phones to shore up support — a real chance to blunt or head off
 * the vote before it happens. A no-op outside that exact window (no active
 * challenge, the player isn't its incumbent, or it's already been
 * resolved) so callers don't need to pre-validate.
 */
export function rallyPartySupportAction(state: GameState): { state: GameState; outcome: PartyActionOutcome } {
  const rng = SeededRng.fromState(state.rngState);
  const player = state.politicians.find((p) => p.isPlayer);
  const challenge = state.leadershipChallenge;
  if (!player || !challenge || challenge.status !== 'brewing' || challenge.incumbentId !== player.id) {
    return { state, outcome: { outcome: 'solid', impact: 0 } };
  }
  const outcome = rallyPartySupport(player, rng);
  const politicians = state.politicians.map((p) =>
    p.id === player.id ? pushApprovalEvent(p, 'partyElite', outcome.impact, 4) : p
  );
  return { state: { ...state, politicians, rngState: rng.getState() }, outcome };
}

/**
 * While a leadership challenge against the player is brewing, goes on the
 * attack against the challenger directly — real chance to knock them down,
 * real risk of a sympathy backfire. Same no-op guard as
 * rallyPartySupportAction.
 */
export function denounceChallengerAction(state: GameState): { state: GameState; outcome: PartyActionOutcome } {
  const rng = SeededRng.fromState(state.rngState);
  const player = state.politicians.find((p) => p.isPlayer);
  const challenge = state.leadershipChallenge;
  if (!player || !challenge || challenge.status !== 'brewing' || challenge.incumbentId !== player.id) {
    return { state, outcome: { outcome: 'solid', impact: 0 } };
  }
  const outcome = denounceChallenger(player, rng);
  const politicians = state.politicians.map((p) =>
    p.id === challenge.challengerId ? pushApprovalEvent(p, 'partyElite', outcome.impact, 4) : p
  );
  return { state: { ...state, politicians, rngState: rng.getState() }, outcome };
}

/** Dismisses a resolved leadership challenge, clearing the way for a future one to emerge. A no-op unless it's actually resolved. */
export function dismissLeadershipChallenge(state: GameState): GameState {
  if (!state.leadershipChallenge || state.leadershipChallenge.status !== 'resolved') return state;
  return { ...state, leadershipChallenge: null };
}

/**
 * The player breaks away from their current party and founds a new one
 * around their own ideology — every other member of the old party then
 * makes an independent, seeded call on whether to follow (see foundParty
 * in partyManagement.ts). The player is always recorded as the new
 * party's leader; the old party keeps its previous leader unless that
 * leader was the player themselves, in which case whoever's left behind
 * inherits it.
 */
export function foundNewPartyAction(
  state: GameState,
  newPartyId: string,
  newPartyName: string,
  newPartyIdeology: IdeologyPosition
): { state: GameState; result: FoundPartyResult } | null {
  const player = state.politicians.find((p) => p.isPlayer);
  if (!player) return null;

  const rng = SeededRng.fromState(state.rngState);
  const result = foundParty(
    player,
    state.politicians,
    state.parties,
    newPartyId,
    newPartyName,
    newPartyIdeology,
    state.relationships,
    rng
  );

  let partyLeaderId = { ...state.partyLeaderId, [newPartyId]: player.id };
  const oldPartyId = player.partyId;
  if (partyLeaderId[oldPartyId] === player.id) {
    const remaining = result.updatedPoliticians.filter((p) => p.partyId === oldPartyId);
    partyLeaderId = { ...partyLeaderId, [oldPartyId]: remaining[0]?.id ?? player.id };
  }

  return {
    state: addMilestone(
      {
        ...state,
        politicians: result.updatedPoliticians,
        parties: result.updatedParties,
        partyLeaderId,
        rngState: rng.getState(),
      },
      'party_founder'
    ),
    result,
  };
}

/**
 * Merges one party into another: every member of the absorbed party
 * switches allegiance and the surviving party's seat count grows by the
 * absorbed party's real seat count — a real structural change, not a
 * cosmetic relabel. The absorbed party's leadership entry is dropped
 * since it no longer exists.
 */
export function mergePartiesAction(state: GameState, absorbedPartyId: string, survivingPartyId: string): GameState {
  if (absorbedPartyId === survivingPartyId) return state;
  const { updatedParties, updatedPoliticians } = mergeParties(
    state.politicians,
    state.parties,
    absorbedPartyId,
    survivingPartyId
  );
  const partyLeaderId = { ...state.partyLeaderId };
  delete partyLeaderId[absorbedPartyId];

  // The absorbed party no longer exists — if it was part of the sitting
  // coalition (or was the coalition's formateur), fold its membership
  // into the surviving party rather than leaving a dangling party id.
  let coalition = state.coalition;
  if (coalition && coalition.memberPartyIds.includes(absorbedPartyId)) {
    const memberPartyIds = Array.from(
      new Set(coalition.memberPartyIds.map((id) => (id === absorbedPartyId ? survivingPartyId : id)))
    );
    const formateurPartyId = coalition.formateurPartyId === absorbedPartyId ? survivingPartyId : coalition.formateurPartyId;
    const totalSeats = updatedParties.reduce((sum, p) => sum + p.seats, 0);
    const seatsHeld = updatedParties.filter((p) => memberPartyIds.includes(p.id)).reduce((sum, p) => sum + p.seats, 0);
    coalition = { ...coalition, memberPartyIds, formateurPartyId, totalSeats, seatsHeld };
  }

  return { ...state, parties: updatedParties, politicians: updatedPoliticians, partyLeaderId, coalition };
}

/** Rebrands a party's name and, optionally, its ideological position — every member keeps their seat and relationships intact. */
export function rebrandPartyAction(
  state: GameState,
  partyId: string,
  newName: string,
  newIdeology?: IdeologyPosition
): GameState {
  return { ...state, parties: rebrandParty(state.parties, partyId, newName, newIdeology) };
}

function replaceMovement(state: GameState, provinceId: string, updated: SecessionistMovement): GameState {
  return {
    ...state,
    secessionistMovements: state.secessionistMovements.map((m) => (m.provinceId === provinceId ? updated : m)),
  };
}

/** Concedes autonomy to a specific movement, cooling its sentiment by a real, fixed amount. A no-op if that province has no movement. */
export function grantAutonomyAction(state: GameState, provinceId: string): GameState {
  const movement = state.secessionistMovements.find((m) => m.provinceId === provinceId);
  if (!movement || movement.status !== 'agitating') return state;
  return replaceMovement(state, provinceId, grantAutonomy(movement));
}

export interface ReferendumOutcome {
  passed: boolean;
  yesShare: number;
  seceded: boolean;
}

/**
 * Puts a movement to an actual vote. A passed referendum immediately
 * secedes the province — the country's legislature and every party's
 * seat count shrink for real, not just a status flag. A failed one cools
 * the movement's momentum without fully resolving it.
 */
export function callReferendumAction(
  state: GameState,
  provinceId: string
): { state: GameState; outcome: ReferendumOutcome | null } {
  const movement = state.secessionistMovements.find((m) => m.provinceId === provinceId);
  if (!movement || movement.status !== 'agitating') return { state, outcome: null };

  const rng = SeededRng.fromState(state.rngState);
  const result = resolveReferendum(movement, rng);

  if (!result.passed) {
    const cooled = { ...movement, sentiment: Math.max(0, movement.sentiment - 15) };
    return {
      state: replaceMovement({ ...state, rngState: rng.getState() }, provinceId, cooled),
      outcome: { ...result, seceded: false },
    };
  }

  const provinces = getProvinces(state.country);
  const province = provinces.find((p) => p.id === provinceId);
  if (!province) return { state: { ...state, rngState: rng.getState() }, outcome: { ...result, seceded: false } };

  const { country, parties } = secedeProvince(state.country, state.parties, province);
  const independent = { ...movement, status: 'independent' as const };
  return {
    state: replaceMovement({ ...state, country, parties, rngState: rng.getState() }, provinceId, independent),
    outcome: { ...result, seceded: true },
  };
}

export interface SuppressionOutcome {
  success: boolean;
  seceded: boolean;
}

/**
 * Sends in the military. Success crushes the movement (a lasting
 * sentiment hit, not full resolution); failure means the rebels win
 * outright and the province secedes immediately, same territorial
 * consequences as a passed referendum. Costs the player's own public
 * approval and relations regardless of outcome — repression is never
 * free, win or lose.
 */
export function suppressMovementAction(
  state: GameState,
  provinceId: string
): { state: GameState; outcome: SuppressionOutcome | null } {
  const movement = state.secessionistMovements.find((m) => m.provinceId === provinceId);
  if (!movement || movement.status !== 'agitating') return { state, outcome: null };

  const rng = SeededRng.fromState(state.rngState);
  const result = resolveSuppression(movement, state.playerMilitary, rng);

  const player = state.politicians.find((p) => p.isPlayer);
  const politicians = player
    ? state.politicians.map((p) => (p.id === player.id ? pushApprovalEvent(p, 'public', -12, 6) : p))
    : state.politicians;

  if (!result.success) {
    const provinces = getProvinces(state.country);
    const province = provinces.find((p) => p.id === provinceId);
    if (!province) {
      return {
        state: replaceMovement({ ...state, politicians, rngState: rng.getState() }, provinceId, result.movement),
        outcome: { success: false, seceded: false },
      };
    }
    const { country, parties } = secedeProvince(state.country, state.parties, province);
    return {
      state: replaceMovement({ ...state, country, parties, politicians, rngState: rng.getState() }, provinceId, result.movement),
      outcome: { success: false, seceded: true },
    };
  }

  return {
    state: addMilestone(
      replaceMovement({ ...state, politicians, rngState: rng.getState() }, provinceId, result.movement),
      'unifier'
    ),
    outcome: { success: true, seceded: false },
  };
}

/** Puts a new national ballot initiative on the docket, active until resolveBallotInitiativeAction is called on it. */
export function proposeBallotInitiativeAction(
  state: GameState,
  id: string,
  title: string,
  description: string,
  ideologyStance: IdeologyPosition,
  economyEffect: EconomyDelta
): GameState {
  const initiative = proposeBallotInitiative(id, title, description, ideologyStance, economyEffect, state.turn);
  return { ...state, ballotInitiatives: [...state.ballotInitiatives, initiative] };
}

/**
 * Puts an active initiative to the national vote. A passed initiative's
 * economyEffect is applied immediately, same as a passed bill — a
 * referendum is a real policy lever, not a poll.
 */
export function resolveBallotInitiativeAction(
  state: GameState,
  initiativeId: string
): { state: GameState; outcome: BallotResult | null } {
  const initiative = state.ballotInitiatives.find((i) => i.id === initiativeId);
  if (!initiative || initiative.status !== 'active') return { state, outcome: null };

  const rng = SeededRng.fromState(state.rngState);
  const { initiative: resolved, result } = resolveBallotInitiative(initiative, state.voterBlocs, rng);
  const ballotInitiatives = state.ballotInitiatives.map((i) => (i.id === initiativeId ? resolved : i));

  let economy = state.economy;
  if (result.passed) {
    economy = applyImmediateEffect(economy, initiative.economyEffect);
  }

  return { state: { ...state, ballotInitiatives, economy, rngState: rng.getState() }, outcome: result };
}

/** The current head of government: a coalition's PM, or (in a single-party-majority government) that party's recorded leader. Null if no party holds a majority and no coalition has formed yet. */
export function getHeadOfGovernmentId(state: GameState): string | null {
  if (state.coalition) return state.coalition.primeMinisterId;
  const totalSeats = state.parties.reduce((sum, p) => sum + p.seats, 0);
  const majorityParty = state.parties.find((p) => p.seats > totalSeats / 2);
  return majorityParty ? state.partyLeaderId[majorityParty.id] ?? null : null;
}

export interface ImpeachmentOutcome {
  result: ImpeachmentResult;
  removed: boolean;
  newHeadOfGovernmentId: string | null;
}

/**
 * Puts the sitting head of government to a supermajority removal vote.
 * Only the actual head of government can be targeted — this isn't a
 * generic "remove any politician" tool. A passed vote hands the party's
 * leadership (and the coalition's PM slot, if applicable) to whoever
 * selectSuccessor ranks highest; the removed politician keeps their seat
 * but takes a real, lasting hit with their own party elites.
 */
export function attemptImpeachmentAction(
  state: GameState,
  targetId: string
): { state: GameState; outcome: ImpeachmentOutcome | null } {
  const target = state.politicians.find((p) => p.id === targetId);
  const headId = getHeadOfGovernmentId(state);
  if (!target || headId !== targetId) return { state, outcome: null };

  const rng = SeededRng.fromState(state.rngState);
  const result = resolveImpeachmentVote(target, state.politicians, state.relationships, state.scandals, rng);

  if (!result.passed) {
    return {
      state: { ...state, rngState: rng.getState() },
      outcome: { result, removed: false, newHeadOfGovernmentId: headId },
    };
  }

  const party = state.parties.find((p) => p.id === target.partyId);
  const successor = party ? selectSuccessor(party, target.id, state.politicians, state.relationships) : null;
  let partyLeaderId = state.partyLeaderId;
  let coalition = state.coalition;

  if (successor && party) {
    partyLeaderId = { ...partyLeaderId, [party.id]: successor.id };
    if (coalition && coalition.primeMinisterId === target.id) {
      coalition = { ...coalition, primeMinisterId: successor.id };
    }
  }

  const politicians = state.politicians.map((p) => (p.id === target.id ? pushApprovalEvent(p, 'partyElite', -25, 8) : p));

  return {
    state: { ...state, partyLeaderId, coalition, politicians, rngState: rng.getState() },
    outcome: { result, removed: true, newHeadOfGovernmentId: successor?.id ?? null },
  };
}

function replaceProtest(state: GameState, protestId: string, updated: Protest): GameState {
  return { ...state, protests: state.protests.map((p) => (p.id === protestId ? updated : p)) };
}

/** A real policy concession to an active protest — cools it by a fixed amount, at the cost of a small budget hit (the concession itself). */
export function concedeToProtestersAction(state: GameState, protestId: string): GameState {
  const protest = state.protests.find((p) => p.id === protestId);
  if (!protest || protest.status !== 'protesting') return state;
  const conceded = concedeToProtesters(protest);
  const economy = applyImmediateEffect(state.economy, { budgetBalance: -0.15 });
  return replaceProtest({ ...state, economy }, protestId, conceded);
}

export interface DispersalOutcome {
  success: boolean;
}

/**
 * Sends in the police/military to break up an active protest, using the
 * player's own military strength (scaled down — this is domestic policing,
 * not a war) as the policing force. Failure escalates the protest straight
 * into a riot, with the same real economic cost as organic escalation.
 * Costs the player's own public approval regardless of outcome — force
 * is never free, win or lose.
 */
export function disperseProtestAction(
  state: GameState,
  protestId: string
): { state: GameState; outcome: DispersalOutcome | null } {
  const protest = state.protests.find((p) => p.id === protestId);
  if (!protest || protest.status !== 'protesting') return { state, outcome: null };

  const rng = SeededRng.fromState(state.rngState);
  const policingStrength = state.playerMilitary.strength * 0.4;
  const result: DispersalResult = disperseProtest(protest, policingStrength, rng);

  const player = state.politicians.find((p) => p.isPlayer);
  const politicians = player
    ? state.politicians.map((p) => (p.id === player.id ? pushApprovalEvent(p, 'public', -8, 5) : p))
    : state.politicians;

  const economy = !result.success ? applyImmediateEffect(state.economy, RIOT_ECONOMY_EFFECT) : state.economy;

  return {
    state: replaceProtest({ ...state, economy, politicians, rngState: rng.getState() }, protestId, result.protest),
    outcome: { success: result.success },
  };
}

/**
 * Casts the player's vote on the active summit resolution and resolves
 * it immediately: every attendee votes yes with a probability equal to
 * their real ideological alignment with the resolution's stance. A
 * passed resolution applies its real economy effect. Every attendee who
 * voted the same way as the player warms toward them; everyone who voted
 * the opposite way cools — real, felt diplomatic consequences either way,
 * not just a pass/fail flag.
 */
export function castSummitVoteAction(
  state: GameState,
  vote: 'yes' | 'no'
): { state: GameState; outcome: SummitOutcome | null } {
  const summit = state.activeSummit;
  if (!summit) return { state, outcome: null };

  const attendees = state.foreignCounterparts.filter((c) => summit.attendeeIds.includes(c.id));
  const rng = SeededRng.fromState(state.rngState);
  const outcome = resolveSummit(summit, vote, attendees, rng);

  let foreignRelations = state.foreignRelations;
  for (const v of outcome.votes) {
    foreignRelations = adjustRelation(foreignRelations, v.counterpartId, v.vote === vote ? 5 : -3);
  }

  const economy = outcome.passed ? applyImmediateEffect(state.economy, summit.economyEffect) : state.economy;

  return {
    state: { ...state, activeSummit: null, foreignRelations, economy, rngState: rng.getState() },
    outcome,
  };
}

/**
 * Generates every media outlet's framing of one event (a bill's fate, an
 * election result, ...) about a given politician, using the game's seeded
 * RNG to pick among pre-authored headline variants.
 */
export function generateEventCoverage(
  state: GameState,
  eventKind: EventKind,
  subjectName: string,
  subjectIdeology: IdeologyPosition
): { state: GameState; coverage: CoverageEvent[] } {
  const rng = SeededRng.fromState(state.rngState);
  const coverage = generateCoverage(
    state.mediaOutlets,
    HEADLINE_TEMPLATES,
    subjectName,
    subjectIdeology,
    eventKind,
    rng
  );
  return { state: { ...state, rngState: rng.getState() }, coverage };
}

/**
 * Pushes a decaying public-approval nudge onto a bill's sponsor after a
 * floor vote — a win bumps them up, a loss knocks them down, but per the
 * approval-update rules in opinion.ts it fades in gradually rather than
 * jumping straight there. Any grassroots movement whose ground the bill
 * touches piles onto the same event: a supportive movement amplifies a win,
 * a hostile one punishes it (see computeAggregateMovementBillReaction).
 */
export function applyBillOutcomeToApproval(
  state: GameState,
  sponsorId: string,
  passed: boolean
): GameState {
  const sponsor = state.politicians.find((p) => p.id === sponsorId);
  const movementReaction = sponsor
    ? computeAggregateMovementBillReaction(state.movements, sponsor.ideology, passed)
    : 0;
  const impact = (passed ? 15 : -15) + movementReaction;
  const politicians = state.politicians.map((p) =>
    p.id === sponsorId ? pushApprovalEvent(p, 'public', impact, 6) : p
  );
  return { ...state, politicians };
}

/**
 * Advances a bill from committee to the floor — and, exactly like an
 * NPC-sponsored bill already does when runNpcTurn moves it along, locks in
 * any NPC member's clear-cut stance immediately (strongly aligned allies,
 * clearly hostile opponents, coalition-partner discipline, and coordinated
 * opposition-party discipline against a player-sponsored bill). This makes
 * the whip count the player sees reflect real strategic behavior the moment
 * the bill hits the floor, instead of a wall of "undecided" that only
 * resolves once the vote is actually called.
 */
export function advanceBillToFloor(state: GameState, billId: string): GameState {
  const bill = state.bills.find((b) => b.id === billId);
  if (!bill) return state;
  const sponsor = state.politicians.find((p) => p.id === bill.sponsorId);
  let nextBill = advanceToFloor(bill);
  if (sponsor) {
    nextBill = applyNpcStances(nextBill, state.politicians, sponsor, state.relationships, state.coalition);
  }
  return { ...state, bills: state.bills.map((b) => (b.id === billId ? nextBill : b)) };
}

const BILL_ENACTMENT_DELAY_TURNS = 3;

const BILL_CATEGORY_EFFECT_SCALE = 15;
const BILL_CATEGORY_EFFECT_SCALE_MILITARY = 4;
const MAX_BILL_CATEGORY_EFFECT = 10;
const MAX_BILL_CATEGORY_EFFECT_MILITARY = 3;

/**
 * A law isn't just a budget line — depending on what it's actually about,
 * passing it gives a real, bounded nudge to the specific national
 * indicator its category implies (healthcare bills move life expectancy,
 * environmental bills move pollution, and so on), on top of the generic
 * economy effect every bill already carries. Same no-free-lunch shape as
 * that economy effect: a net-spending bill in a category helps its
 * indicator, a net-savings/austerity one hurts it. Applied immediately
 * (not delayed like the economy effect) — same as every other direct
 * investment action in these systems (investInResearch, setPolicingFunding,
 * ...), and it's the *outcome indicators* being nudged, not the underlying
 * funding-tier levers, so each system's own per-turn drift toward its
 * funding-implied target still governs the long run. A bill with no
 * category (or 'economic') only ever gets the economy effect.
 */
export function applyBillCategoryEffect(state: GameState, bill: Bill): GameState {
  if (!bill.category || bill.category === 'economic') return state;

  const magnitude = computeBillDomainMagnitude(bill);

  switch (bill.category) {
    case 'healthcare': {
      const delta = clamp(magnitude * BILL_CATEGORY_EFFECT_SCALE, -MAX_BILL_CATEGORY_EFFECT, MAX_BILL_CATEGORY_EFFECT);
      return {
        ...state,
        socialPolicy: {
          ...state.socialPolicy,
          lifeExpectancy: clamp(state.socialPolicy.lifeExpectancy + delta / 2, 0, 120),
          povertyRate: clamp(state.socialPolicy.povertyRate - delta / 2, 0, 100),
        },
      };
    }
    case 'education': {
      const delta = clamp(magnitude * BILL_CATEGORY_EFFECT_SCALE, -MAX_BILL_CATEGORY_EFFECT, MAX_BILL_CATEGORY_EFFECT);
      return {
        ...state,
        socialPolicy: { ...state.socialPolicy, literacyRate: clamp(state.socialPolicy.literacyRate + delta, 0, 100) },
      };
    }
    case 'welfare': {
      const delta = clamp(magnitude * BILL_CATEGORY_EFFECT_SCALE, -MAX_BILL_CATEGORY_EFFECT, MAX_BILL_CATEGORY_EFFECT);
      return {
        ...state,
        socialPolicy: { ...state.socialPolicy, povertyRate: clamp(state.socialPolicy.povertyRate - delta, 0, 100) },
      };
    }
    case 'justice_safety': {
      const delta = clamp(magnitude * BILL_CATEGORY_EFFECT_SCALE, -MAX_BILL_CATEGORY_EFFECT, MAX_BILL_CATEGORY_EFFECT);
      return { ...state, crime: { ...state.crime, crimeRate: clamp(state.crime.crimeRate - delta, 0, 100) } };
    }
    case 'environment': {
      const delta = clamp(magnitude * BILL_CATEGORY_EFFECT_SCALE, -MAX_BILL_CATEGORY_EFFECT, MAX_BILL_CATEGORY_EFFECT);
      return {
        ...state,
        environment: {
          ...state.environment,
          pollutionIndex: clamp(state.environment.pollutionIndex - delta, 0, 100),
          renewableShare: clamp(state.environment.renewableShare + delta / 2, 0, 100),
        },
      };
    }
    case 'infrastructure': {
      const delta = clamp(magnitude * BILL_CATEGORY_EFFECT_SCALE, -MAX_BILL_CATEGORY_EFFECT, MAX_BILL_CATEGORY_EFFECT) / 4;
      return {
        ...state,
        infrastructure: {
          transport: clamp(state.infrastructure.transport + delta, 0, 100),
          power: clamp(state.infrastructure.power + delta, 0, 100),
          water: clamp(state.infrastructure.water + delta, 0, 100),
          digital: clamp(state.infrastructure.digital + delta, 0, 100),
        },
      };
    }
    case 'research_technology': {
      const delta = clamp(magnitude * BILL_CATEGORY_EFFECT_SCALE, -MAX_BILL_CATEGORY_EFFECT, MAX_BILL_CATEGORY_EFFECT);
      return { ...state, research: { ...state.research, capability: clamp(state.research.capability + delta, 0, 100) } };
    }
    case 'defense': {
      const delta = clamp(
        magnitude * BILL_CATEGORY_EFFECT_SCALE_MILITARY,
        -MAX_BILL_CATEGORY_EFFECT_MILITARY,
        MAX_BILL_CATEGORY_EFFECT_MILITARY
      );
      return { ...state, playerMilitary: { ...state.playerMilitary, strength: clamp(state.playerMilitary.strength + delta, 0, 100) } };
    }
    default:
      return state;
  }
}

/**
 * A passed bill is a law, and a law has real consequences: queues the
 * bill's net fiscal direction as a delayed economy effect (same lag
 * mechanism as any other policy) rather than leaving it as a cosmetic
 * number, and — if it's tagged with a category — applies that category's
 * real, immediate effect on the specific system it's actually about (see
 * applyBillCategoryEffect). A no-op for anything that isn't 'passed'.
 */
export function enactPassedBill(state: GameState, bill: Bill): GameState {
  if (bill.status !== 'passed') return state;
  const effect = computeBillEconomyEffect(bill);
  const withEconomy = { ...state, economy: queuePolicyEffect(state.economy, effect, BILL_ENACTMENT_DELAY_TURNS) };
  return applyBillCategoryEffect(withEconomy, bill);
}

export interface CorruptionAttemptOutcome {
  detected: boolean;
  favorGain: number;
  budgetImpact: number;
  scandalId?: string;
}

/**
 * Attempts a corrupt act on the actor's behalf, banking favor with the
 * target and skimming the budget. Rolls detection against the actor's
 * integrity and any active scrutiny; a detected act opens an unresolved
 * Scandal but does not hit approval yet — that happens once the player
 * responds, via respondToScandal.
 */
export function commitCorruption(
  state: GameState,
  actorId: string,
  targetId: string,
  tier: CorruptionTier,
  investigativePressure = 0
): { state: GameState; outcome: CorruptionAttemptOutcome } {
  if (state.houseRules.noCorruption) {
    return { state, outcome: { detected: false, favorGain: 0, budgetImpact: 0 } };
  }
  const rng = SeededRng.fromState(state.rngState);
  const actor = state.politicians.find((p) => p.id === actorId);
  if (!actor) {
    return { state, outcome: { detected: false, favorGain: 0, budgetImpact: 0 } };
  }

  const settings = getDifficultySettings(state.difficulty);
  const cabinetEffects = computeCabinetEffects(state.cabinet, state.politicians);
  const result = attemptCorruptionAction(
    tier,
    actor.attributes.integrity,
    investigativePressure,
    rng,
    settings.corruptionDetectionMultiplier * cabinetEffects.corruptionDetectionMultiplier
  );

  const favorBank = {
    ...state.favorBank,
    [targetId]: Math.min(MAX_FAVORS, (state.favorBank[targetId] ?? 0) + result.favorGain),
  };
  const economy = applyImmediateEffect(state.economy, { budgetBalance: result.budgetImpact });

  let scandals = state.scandals;
  let scandalId: string | undefined;
  if (result.detected) {
    scandalId = `scandal-${state.turn}-${state.scandals.length + 1}`;
    scandals = [
      ...scandals,
      { id: scandalId, politicianId: actorId, tier, turn: state.turn, status: 'unresolved' },
    ];
  }

  const personalWealth = {
    ...state.personalWealth,
    [actorId]: (state.personalWealth[actorId] ?? BASE_PERSONAL_WEALTH) + WEALTH_TIER_GAIN[tier],
  };

  return {
    state: { ...state, favorBank, economy, scandals, personalWealth, rngState: rng.getState() },
    outcome: { detected: result.detected, favorGain: result.favorGain, budgetImpact: result.budgetImpact, scandalId },
  };
}

/**
 * Resolves an unresolved scandal with the player's chosen response —
 * admitting fault draws a smaller hit than denying and later being proven
 * wrong. Applies the approval hit as a decaying event, not an instant drop.
 */
export function respondToScandal(
  state: GameState,
  scandalId: string,
  response: ScandalResponse
): GameState {
  const scandal = state.scandals.find((s) => s.id === scandalId);
  if (!scandal || scandal.status !== 'unresolved') return state;

  const severity = computeScandalSeverity(scandal.tier, response);
  const politicians = state.politicians.map((p) =>
    p.id === scandal.politicianId ? pushApprovalEvent(p, 'public', severity, 6) : p
  );
  const scandals = state.scandals.map((s) =>
    s.id === scandalId ? { ...s, status: 'resolved' as const, response } : s
  );

  return { ...state, politicians, scandals };
}

export interface ElectionOutcome {
  system: ElectoralSystem;
  seatsWon: Record<string, number>;
  districtResults?: DistrictResult[];
  nationalVotes?: PartyVoteShare[];
}

/**
 * Runs a legislative election using whichever system the country's
 * legislature is configured for, and updates each party's seat count from
 * the result. Every party's vote share is scaled by its own strategic
 * momentum — the average public approval of its sitting members, further
 * nudged by whether it's actually in real contention for the lead — so how
 * each party (not just the player's) governed and where it chose to fight
 * both feed back into how it fares at the ballot box.
 */
export function runLegislativeElection(
  state: GameState,
  turnout = 500_000
): { state: GameState; outcome: ElectionOutcome } {
  const rng = SeededRng.fromState(state.rngState);
  const { legislature } = state.country;
  const momentum = computeStrategicMomentum(state.politicians, state.parties);
  let outcome: ElectionOutcome;

  if (legislature.electoralSystem === 'FPTP') {
    const perDistrictTurnout = Math.round(turnout / legislature.districts.length);
    const districtResults = legislature.districts.map((district) =>
      generateDistrictVotes(district, state.parties, perDistrictTurnout, rng, momentum)
    );
    const seatsWon = resolveFPTPElection(districtResults);
    outcome = { system: 'FPTP', seatsWon, districtResults };
  } else {
    const nationalVotes = generateNationalVotes(state.parties, turnout, rng, momentum);
    const seatsWon = allocateSeatsDHondt(
      nationalVotes,
      legislature.totalSeats,
      legislature.prThreshold
    );
    outcome = { system: 'PR_DHONDT', seatsWon, nationalVotes };
  }

  const parties = state.parties.map((party) => ({
    ...party,
    seats: outcome.seatsWon[party.id] ?? 0,
  }));

  const afterVote: GameState = {
    ...state,
    parties,
    nextElectionTurn: state.turn + TERM_LENGTH_TURNS,
    rngState: rng.getState(),
  };

  return { state: resolveGovernment(afterVote, rng), outcome };
}

/**
 * Starts a live, province-by-province election night instead of the
 * instant runLegislativeElection above — same underlying vote generation
 * and momentum, but revealed progressively via reportNextProvinceAction.
 */
export function beginElectionNight(state: GameState, turnout = 500_000): GameState {
  const rng = SeededRng.fromState(state.rngState);
  const momentum = computeStrategicMomentum(state.politicians, state.parties);
  const electionNight = startElectionNight(state.country, state.parties, turnout, rng, momentum);
  return { ...state, electionNight, rngState: rng.getState() };
}

/** Reveals the next province's results. Once every province has reported, the race is called. */
export function reportNextProvinceAction(state: GameState): GameState {
  if (!state.electionNight) return state;
  const electionNight = reportNextProvince(state.electionNight, state.country, state.parties);
  return { ...state, electionNight };
}

/**
 * Once the race is called, applies the final seats to the parties (the
 * same mutation runLegislativeElection makes), picks a victory speech for
 * the winner, and marks the night 'concluded' so the UI can show the
 * result before returning to normal play.
 */
export function concludeElectionNightAction(state: GameState): GameState {
  if (!state.electionNight || state.electionNight.status !== 'called' || !state.electionNight.finalSeats) {
    return state;
  }
  const rng = SeededRng.fromState(state.rngState);
  const finalSeats = state.electionNight.finalSeats;
  const winner = state.parties.find((p) => p.id === state.electionNight!.winnerPartyId);
  const marginFraction = computeVictoryMarginFraction(finalSeats);
  const speech = winner ? pickVictorySpeech(winner.name, winner.ideology, marginFraction, rng) : '';

  const parties = state.parties.map((party) => ({ ...party, seats: finalSeats[party.id] ?? 0 }));
  const electionNight = concludeElectionNightState(state.electionNight, speech);

  const afterVote: GameState = {
    ...state,
    parties,
    electionNight,
    nextElectionTurn: state.turn + TERM_LENGTH_TURNS,
    rngState: rng.getState(),
  };

  return resolveGovernment(afterVote, rng);
}

/** Dismisses a concluded election night, returning to normal play. A no-op unless it's actually concluded. */
export function dismissElectionNight(state: GameState): GameState {
  if (!state.electionNight || state.electionNight.status !== 'concluded') return state;
  return { ...state, electionNight: null };
}
