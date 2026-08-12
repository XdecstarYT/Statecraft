import { create } from 'zustand';
import {
  MAX_FAVORS,
  SeededRng,
  WAR_DECLARATION_RELATION_PENALTY,
  addBillProvision,
  adjustRelation,
  advanceCareerTurn,
  advanceBillToFloor as engineAdvanceBillToFloor,
  advanceToCommittee,
  advanceTurn,
  amendBillProvision,
  attemptCloture,
  removeBillProvision,
  invokeFilibuster,
  proposeBallotInitiativeAction as engineProposeBallotInitiative,
  resolveBallotInitiativeAction as engineResolveBallotInitiative,
  attemptImpeachmentAction as engineAttemptImpeachment,
  concedeToProtestersAction as engineConcedeToProtesters,
  disperseProtestAction as engineDisperseProtest,
  holdDebateAction as engineHoldDebate,
  holdPressConference as engineHoldPressConference,
  seekEndorsementAction as engineSeekEndorsement,
  commissionApprovalPollAction as engineCommissionApprovalPoll,
  commissionPartyPollAction as engineCommissionPartyPoll,
  mergePartiesAction as engineMergeParties,
  rebrandPartyAction as engineRebrandParty,
  castSummitVoteAction as engineCastSummitVote,
  resolveDilemmaChoice,
  resolveCoalitionOfferAction as engineResolveCoalitionOffer,
  makePromise,
  buildMineAction as engineBuildMine,
  upgradeMineAction as engineUpgradeMine,
  buildFactoryAction as engineBuildFactory,
  upgradeFactoryAction as engineUpgradeFactory,
  sellRawResourceAction as engineSellRawResource,
  sellProcessedGoodAction as engineSellProcessedGood,
  investInLogistics,
  nominateJusticeAction as engineNominateJustice,
  confirmJusticeAction as engineConfirmJustice,
  investInResearch,
  unlockTechAction as engineUnlockTech,
  setImmigrationPolicy,
  setHealthcareFunding,
  setEducationFunding,
  setWelfareFunding,
  foundCompanyAction as engineFoundCompany,
  ipoCompanyAction as engineIpoCompany,
  buySharesAction as engineBuyShares,
  sellSharesAction as engineSellShares,
  setPolicingFunding,
  setEnergyPolicy,
  investInGreenInfrastructure,
  investInInfrastructure,
  postTweetAction as enginePostTweet,
  applyCovertMilitaryDelta,
  applyForJob as applyForCareerJob,
  attemptCitizenInitiative,
  attemptLocalRace,
  attemptNationalNomination,
  buildCustomNation,
  buildGraduationPayload,
  createCareer,
  doPartyWork,
  validateCustomNation,
  foundNewPartyAction as engineFoundNewParty,
  foundOwnParty as foundCareerParty,
  graduateFromCareer,
  isGraduated,
  joinParty as joinCareerParty,
  startEducation as startCareerEducation,
  appointToCabinet,
  attemptMinisterNoConfidenceAction as engineAttemptMinisterNoConfidence,
  reshuffleCabinet,
  resolveCollectiveResponsibility,
  computeFactionTerms,
  applyBillOutcomeToApproval,
  applyFloorVoteResult,
  applyImmediateEffect,
  attemptCovertOperation,
  callReferendumAction as engineCallReferendum,
  grantAutonomyAction as engineGrantAutonomy,
  suppressMovementAction as engineSuppressMovement,
  beginElectionNight,
  breakTreaty,
  cancelTradeDeal,
  commitCorruption,
  computeCabinetEffects,
  applyBillOutcomeToGroups,
  computeLobbyingPressure,
  concludeElectionNightAction as engineConcludeElectionNight,
  courtInterestGroupAction as engineCourtInterestGroup,
  createNewGame,
  declareWar,
  denounceChallengerAction as engineDenounceChallenger,
  dismissElectionNight,
  dismissLeadershipChallenge as engineDismissLeadershipChallenge,
  enactPassedBill,
  generateEventCoverage,
  generateNationalVotes,
  generateDistrictVotes,
  generatePrimaryVotes,
  generateRankedBallots,
  getMajorityWinner,
  getRunoffPair,
  holdPressInterview,
  holdRally,
  imposeEmbargo,
  imposeSanctions,
  investInIntelligence,
  investInMilitary,
  proposeBill,
  proposeTradeDeal,
  proposeTreaty,
  pushApprovalEvent,
  rallyPartySupportAction as engineRallyPartySupport,
  relationshipKey,
  removeFromCabinet,
  reportNextProvinceAction as engineReportNextProvince,
  resolveFloorVote,
  resolveMMP,
  resolvePrimary,
  resolveRunoffRound,
  resolveSTV,
  respondToScandal,
  runLegislativeElection,
  sendAid,
  setTariff,
  setWhipStance,
  signTradeDeal,
  signTreaty,
  type BallotResult,
  type CabinetPortfolio,
  type CabinetRank,
  type MinisterNoConfidenceOutcome,
  type CampaignActionOutcome,
  type CareerState,
  type ClotureResult,
  type DebateResult,
  type DispersalOutcome,
  type EndorsementAttemptResult,
  type HouseRules,
  type ImpeachmentOutcome,
  type PollResult,
  type PressTopic,
  type SummitOutcome,
  type CommodityType,
  type CorruptionAttemptOutcome,
  type CorruptionTier,
  type BillCategory,
  type PromiseMetric,
  type CourtGroupOutcome,
  type CoverageEvent,
  type CovertOperationOutcome,
  type CovertOperationType,
  type CustomNationInput,
  type Difficulty,
  type EducationTrack,
  type ElectionOutcome,
  type FacilityActionOutcome,
  type FacilityLocationType,
  type FacilityOwnership,
  type FloorVoteResult,
  type FoundPartyResult,
  type GameState,
  type IdeologyPosition,
  type ImmigrationPolicyLevel,
  type IntelligenceInvestmentTier,
  type JudiciaryActionOutcome,
  type ConfirmationVoteResult,
  type LocalRaceOutcome,
  type LogisticsInvestmentTier,
  type MilitaryInvestmentTier,
  type ProcessedGoodType,
  type RawResourceType,
  type ResearchInvestmentTier,
  type SaleResult,
  type SocialFundingTier,
  type TechActionOutcome,
  type CompanySector,
  type EnterpriseActionOutcome,
  type PolicingFundingTier,
  type EnergyPolicyLevel,
  type GreenInvestmentTier,
  type InfrastructureCategory,
  type InfrastructureInvestmentTier,
  type TweetActionOutcome,
  type CitizenInitiativeOutcome,
  type MmpResult,
  type NationBuilderError,
  type NominationOutcome,
  type PartyActionOutcome,
  type PartyVoteShare,
  type PartyWorkOutcome,
  type ReferendumOutcome,
  type ScandalResponse,
  type SuppressionOutcome,
  type WhipStance,
} from '../engine';
import { pickBillTemplate } from '../content/flavor/billTemplates';
import { SCENARIO_PRESETS } from '../content/scenarios/presets';
import { TREATY_TEMPLATES } from '../content/diplomacy/treatyTemplates';
import { STARTER_COUNTRY_OPTIONS } from '../content/countries/registry';
import { generateName } from '../content/names/pool';
import {
  clearSavedCareer,
  loadCareer as persistLoadCareer,
  loadGame as persistLoad,
  saveCareer as persistSaveCareer,
  saveGame as persistSave,
} from './persistence';

export interface EconomySnapshot {
  turn: number;
  gdpGrowth: number;
  inflation: number;
  unemployment: number;
  debtToGdp: number;
  budgetBalance: number;
}

function snapshotEconomy(game: GameState): EconomySnapshot {
  return { turn: game.turn, ...game.economy };
}

export type LabResult =
  | { system: 'STV'; elected: string[]; quota: number; seats: number }
  | { system: 'MMP'; result: MmpResult }
  | {
      system: 'RUNOFF';
      firstRound: PartyVoteShare[];
      wonOutright: string | null;
      secondRound?: PartyVoteShare[];
      winner: string;
    }
  | { system: 'PRIMARY'; partyId: string; votes: PartyVoteShare[]; winner: string };

const LAB_TURNOUT = 500_000;
const STV_SEATS = 5;
const STV_BALLOTS = 3000;

interface StatecraftStore {
  game: GameState | null;
  /** Turns the player flagged from the TurnMenu as "remind me" — client-side only, not part of GameState/save data. */
  flaggedTurns: number[];
  toggleTurnFlag: (turn: number) => void;
  career: CareerState | null;
  lastCareerPartyWorkOutcome: PartyWorkOutcome | null;
  lastCareerLocalRaceOutcome: LocalRaceOutcome | null;
  lastCareerNominationOutcome: NominationOutcome | null;
  lastCareerCitizenInitiativeOutcome: CitizenInitiativeOutcome | null;
  lastFoundPartyResult: FoundPartyResult | null;
  lastReferendumOutcome: (ReferendumOutcome & { provinceId: string }) | null;
  lastSuppressionOutcome: (SuppressionOutcome & { provinceId: string }) | null;
  economyHistory: EconomySnapshot[];
  lastElection: ElectionOutcome | null;
  /** Each party's seat count immediately before lastElection was run, so the UI can show seat deltas. */
  lastElectionPreviousSeats: Record<string, number> | null;
  lastFloorResult: (FloorVoteResult & { billTitle: string }) | null;
  lastCoverage: CoverageEvent[];
  labResult: LabResult | null;
  lastCorruptionOutcome: CorruptionAttemptOutcome | null;
  lastCampaignOutcome: (CampaignActionOutcome & { action: 'interview' | 'rally' | 'press_conference' }) | null;
  lastLobbyingOutcome: (CourtGroupOutcome & { groupId: string }) | null;
  lastLeadershipActionOutcome: (PartyActionOutcome & { action: 'rally' | 'denounce' }) | null;
  lastCovertOperationOutcome: (CovertOperationOutcome & { counterpartId: string; type: CovertOperationType }) | null;
  lastClotureResult: (ClotureResult & { billId: string }) | null;
  lastBallotResult: (BallotResult & { initiativeId: string }) | null;
  lastImpeachmentOutcome: ImpeachmentOutcome | null;
  lastMinisterNoConfidenceOutcome: MinisterNoConfidenceOutcome | null;
  lastDispersalOutcome: (DispersalOutcome & { protestId: string }) | null;
  lastDebateResult: DebateResult | null;
  lastEndorsementOutcome: (EndorsementAttemptResult & { endorserId: string }) | null;
  lastPollResult: PollResult | null;
  lastSummitOutcome: SummitOutcome | null;
  lastFacilityOutcome: FacilityActionOutcome | null;
  lastSale: (SaleResult & { good: string }) | null;
  lastJudiciaryOutcome: JudiciaryActionOutcome | null;
  lastConfirmationResult: ConfirmationVoteResult | null;
  lastTechOutcome: TechActionOutcome | null;
  lastTweetOutcome: TweetActionOutcome | null;
  lastEnterpriseOutcome: EnterpriseActionOutcome | null;
  lastIpoProceeds: number | null;

  newGame: (seed?: number, difficulty?: Difficulty, countryOptionId?: string, houseRules?: Partial<HouseRules>) => void;
  newGameFromScenario: (
    scenarioId: string,
    countryOptionId: string,
    seed?: number,
    houseRules?: Partial<HouseRules>
  ) => void;
  newGameFromCustomNation: (
    input: CustomNationInput,
    playerPartyIndex: number,
    difficulty?: Difficulty,
    seed?: number
  ) => NationBuilderError[];
  saveGame: () => void;
  loadGame: () => boolean;
  startCareer: (name: string, countryOptionId: string, seed?: number) => void;
  abandonCareer: () => void;
  careerAdvanceTurnAction: () => void;
  careerStartEducationAction: (track: EducationTrack) => void;
  careerApplyForJobAction: (jobId: string) => void;
  careerJoinPartyAction: (partyId: string) => void;
  careerFoundOwnPartyAction: (partyId: string, name: string) => void;
  careerDoPartyWorkAction: () => void;
  careerAttemptLocalRaceAction: () => void;
  careerAttemptNominationAction: (seed?: number, difficulty?: Difficulty) => void;
  careerAttemptCitizenInitiativeAction: (title: string, stance: IdeologyPosition) => void;
  proposeNewBill: () => void;
  proposeCustomBill: (
    title: string,
    category: BillCategory,
    provisions: { description: string; budgetImpact: number }[]
  ) => void;
  sendToCommittee: (billId: string) => void;
  sendToFloor: (billId: string) => void;
  setStance: (billId: string, politicianId: string, stance: WhipStance) => void;
  holdFloorVote: (billId: string) => void;
  addProvisionAction: (billId: string, description: string, budgetImpact: number) => void;
  removeProvisionAction: (billId: string, provisionId: string) => void;
  amendProvisionAction: (billId: string, provisionId: string, description: string, budgetImpact: number) => void;
  invokeFilibusterAction: (billId: string) => void;
  attemptClotureAction: (billId: string) => void;
  proposeBallotInitiativeAction: (
    title: string,
    description: string,
    ideologyStance: IdeologyPosition,
    budgetImpact: number
  ) => void;
  resolveBallotInitiativeAction: (initiativeId: string) => void;
  attemptImpeachmentAction: (targetId: string) => void;
  concedeToProtestersAction: (protestId: string) => void;
  disperseProtestAction: (protestId: string) => void;
  holdPressConferenceAction: (topic: PressTopic) => void;
  holdDebateAction: (rivalId?: string) => void;
  seekEndorsementAction: (endorserId: string) => void;
  commissionApprovalPollAction: (firmId: string) => void;
  commissionPartyPollAction: (firmId: string, partyId: string) => void;
  mergePartiesAction: (absorbedPartyId: string, survivingPartyId: string) => void;
  rebrandPartyAction: (partyId: string, newName: string, newIdeology?: { economic: number; social: number }) => void;
  castSummitVoteAction: (vote: 'yes' | 'no') => void;
  resolveDilemmaAction: (choiceId: string) => void;
  makePromiseAction: (metric: PromiseMetric) => void;
  nudgeRelationship: (politicianId: string, delta: number) => void;
  addFavor: (politicianId: string) => void;
  giveSpeech: () => void;
  holdPressInterviewAction: () => void;
  holdRallyAction: () => void;
  nextTurn: () => void;
  runElection: () => void;
  runElectoralLab: (system: LabResult['system']) => void;
  attemptCorruption: (targetId: string, tier: CorruptionTier) => void;
  respondToScandalAction: (scandalId: string, response: ScandalResponse) => void;
  signTreatyAction: (counterpartId: string, templateIndex: number) => void;
  breakTreatyAction: (treatyId: string) => void;
  sendAidAction: (counterpartId: string) => void;
  imposeSanctionsAction: (counterpartId: string) => void;
  declareWarAction: (counterpartId: string) => void;
  proposeTradeDealAction: (counterpartId: string, commodity: CommodityType, volume: number, tariff: number) => void;
  signTradeDealAction: (dealId: string) => void;
  setTariffAction: (dealId: string, tariff: number) => void;
  cancelTradeDealAction: (dealId: string) => void;
  imposeEmbargoAction: (counterpartId: string) => void;
  investInMilitaryAction: (tier: MilitaryInvestmentTier) => void;
  startElectionNightAction: () => void;
  reportNextProvinceAction: () => void;
  concludeElectionNightAction: () => void;
  dismissElectionNightAction: () => void;
  appointToCabinetAction: (portfolio: CabinetPortfolio, politicianId: string, rank?: CabinetRank) => void;
  removeFromCabinetAction: (portfolio: CabinetPortfolio, rank?: CabinetRank) => void;
  reshuffleCabinetAction: (portfolio: CabinetPortfolio, rank: CabinetRank, politicianId: string) => void;
  attemptMinisterNoConfidenceAction: (targetId: string) => void;
  courtInterestGroupAction: (groupId: string) => void;
  rallyPartySupportAction: () => void;
  denounceChallengerAction: () => void;
  dismissLeadershipChallengeAction: () => void;
  resolveCoalitionOfferAction: (offerId: 'join' | 'opposition') => void;
  attemptCovertOperationAction: (counterpartId: string, type: CovertOperationType) => void;
  investInIntelligenceAction: (tier: IntelligenceInvestmentTier) => void;
  foundNewPartyAction: (partyId: string, name: string, ideology: IdeologyPosition) => void;
  grantAutonomyAction: (provinceId: string) => void;
  callReferendumAction: (provinceId: string) => void;
  suppressMovementAction: (provinceId: string) => void;
  nominateJusticeAction: (seatIndex: number) => void;
  confirmJusticeAction: (seatIndex: number) => void;
  investInResearchAction: (tier: ResearchInvestmentTier) => void;
  unlockTechAction: (techId: string) => void;
  setImmigrationPolicyAction: (policy: ImmigrationPolicyLevel) => void;
  setHealthcareFundingAction: (tier: SocialFundingTier) => void;
  setEducationFundingAction: (tier: SocialFundingTier) => void;
  setWelfareFundingAction: (tier: SocialFundingTier) => void;
  foundCompanyAction: (name: string, sector: CompanySector) => void;
  ipoCompanyAction: (companyId: string) => void;
  buySharesAction: (companyId: string, budgetToSpend: number) => void;
  sellSharesAction: (companyId: string, shares: number) => void;
  setPolicingFundingAction: (tier: PolicingFundingTier) => void;
  setEnergyPolicyAction: (policy: EnergyPolicyLevel) => void;
  investInGreenInfrastructureAction: (tier: GreenInvestmentTier) => void;
  investInInfrastructureAction: (category: InfrastructureCategory, tier: InfrastructureInvestmentTier) => void;
  postTweetAction: (optionId: string) => void;
  buildMineAction: (depositId: string, ownership: FacilityOwnership) => void;
  upgradeMineAction: (mineId: string) => void;
  buildFactoryAction: (
    locationId: string,
    locationType: FacilityLocationType,
    recipeId: string,
    ownership: FacilityOwnership
  ) => void;
  upgradeFactoryAction: (factoryId: string) => void;
  sellRawResourceAction: (resource: RawResourceType, units: number, sellAs: FacilityOwnership) => void;
  sellProcessedGoodAction: (good: ProcessedGoodType, units: number, ownership: FacilityOwnership) => void;
  investInLogisticsAction: (tier: LogisticsInvestmentTier) => void;
}

export const useStatecraftStore = create<StatecraftStore>((set, get) => ({
  game: null,
  flaggedTurns: [],
  toggleTurnFlag: (turn) => {
    const { flaggedTurns } = get();
    set({
      flaggedTurns: flaggedTurns.includes(turn) ? flaggedTurns.filter((t) => t !== turn) : [...flaggedTurns, turn],
    });
  },
  career: null,
  lastCareerPartyWorkOutcome: null,
  lastCareerLocalRaceOutcome: null,
  lastCareerNominationOutcome: null,
  lastCareerCitizenInitiativeOutcome: null,
  lastFoundPartyResult: null,
  lastReferendumOutcome: null,
  lastSuppressionOutcome: null,
  economyHistory: [],
  lastElection: null,
  lastElectionPreviousSeats: null,
  lastFloorResult: null,
  lastCoverage: [],
  labResult: null,
  lastCorruptionOutcome: null,
  lastCampaignOutcome: null,
  lastLobbyingOutcome: null,
  lastLeadershipActionOutcome: null,
  lastCovertOperationOutcome: null,
  lastClotureResult: null,
  lastBallotResult: null,
  lastImpeachmentOutcome: null,
  lastMinisterNoConfidenceOutcome: null,
  lastDispersalOutcome: null,
  lastDebateResult: null,
  lastEndorsementOutcome: null,
  lastPollResult: null,
  lastSummitOutcome: null,
  lastFacilityOutcome: null,
  lastSale: null,
  lastJudiciaryOutcome: null,
  lastConfirmationResult: null,
  lastTechOutcome: null,
  lastTweetOutcome: null,
  lastEnterpriseOutcome: null,
  lastIpoProceeds: null,

  newGame: (seed = Math.floor(Math.random() * 1_000_000_000), difficulty = 'standard', countryOptionId = 'kastoria', houseRules) => {
    const option =
      STARTER_COUNTRY_OPTIONS.find((o) => o.id === countryOptionId) ?? STARTER_COUNTRY_OPTIONS[0];
    const game = createNewGame(seed, { difficulty, country: option.country, parties: option.parties, houseRules });
    clearSavedCareer();
    set({
      game,
      career: null,
      economyHistory: [snapshotEconomy(game)],
      lastElection: null,
      lastElectionPreviousSeats: null,
      lastFloorResult: null,
      lastCoverage: [],
      labResult: null,
      lastCorruptionOutcome: null,
      lastCampaignOutcome: null,
      lastLobbyingOutcome: null,
      lastLeadershipActionOutcome: null,
      lastCovertOperationOutcome: null,
    });
  },

  newGameFromScenario: (scenarioId, countryOptionId, seed = Math.floor(Math.random() * 1_000_000_000), houseRules) => {
    const option = STARTER_COUNTRY_OPTIONS.find((o) => o.id === countryOptionId) ?? STARTER_COUNTRY_OPTIONS[0];
    const scenario = SCENARIO_PRESETS.find((s) => s.id === scenarioId) ?? SCENARIO_PRESETS[0];
    const game = createNewGame(seed, {
      difficulty: scenario.difficulty,
      country: option.country,
      parties: option.parties,
      startingEconomy: scenario.economyOverrides,
      houseRules,
    });
    clearSavedCareer();
    set({
      game,
      career: null,
      economyHistory: [snapshotEconomy(game)],
      lastElection: null,
      lastElectionPreviousSeats: null,
      lastFloorResult: null,
      lastCoverage: [],
      labResult: null,
      lastCorruptionOutcome: null,
      lastCampaignOutcome: null,
      lastLobbyingOutcome: null,
      lastLeadershipActionOutcome: null,
      lastCovertOperationOutcome: null,
    });
  },

  newGameFromCustomNation: (input, playerPartyIndex, difficulty = 'standard', seed = Math.floor(Math.random() * 1_000_000_000)) => {
    const errors = validateCustomNation(input);
    if (errors.length > 0) return errors;

    const { country, parties } = buildCustomNation(input);
    const index = Math.min(Math.max(playerPartyIndex, 0), parties.length - 1);
    const game = createNewGame(seed, { difficulty, country, parties, playerPartyId: parties[index].id });
    clearSavedCareer();
    set({
      game,
      career: null,
      economyHistory: [snapshotEconomy(game)],
      lastElection: null,
      lastElectionPreviousSeats: null,
      lastFloorResult: null,
      lastCoverage: [],
      labResult: null,
      lastCorruptionOutcome: null,
      lastCampaignOutcome: null,
      lastLobbyingOutcome: null,
      lastLeadershipActionOutcome: null,
      lastCovertOperationOutcome: null,
    });
    return [];
  },

  saveGame: () => {
    const { game, career, economyHistory } = get();
    if (game) {
      persistSave(game, economyHistory);
    } else if (career) {
      persistSaveCareer(career);
    }
  },

  loadGame: () => {
    const save = persistLoad();
    if (save) {
      set({
        game: save.game,
        career: null,
        economyHistory: save.economyHistory,
        lastElection: null,
        lastElectionPreviousSeats: null,
        lastFloorResult: null,
        lastCoverage: [],
        labResult: null,
        lastCorruptionOutcome: null,
        lastCampaignOutcome: null,
        lastLobbyingOutcome: null,
        lastLeadershipActionOutcome: null,
        lastCovertOperationOutcome: null,
      });
      return true;
    }
    const careerSave = persistLoadCareer();
    if (careerSave) {
      set({
        game: null,
        career: careerSave.career,
        lastCareerPartyWorkOutcome: null,
        lastCareerLocalRaceOutcome: null,
        lastCareerNominationOutcome: null,
        lastCareerCitizenInitiativeOutcome: null,
      });
      return true;
    }
    return false;
  },

  startCareer: (name, countryOptionId, seed = Math.floor(Math.random() * 1_000_000_000)) => {
    const rng = new SeededRng(seed);
    const career = createCareer(seed, rng, name.trim() || 'A Nobody From Nowhere', countryOptionId);
    set({
      game: null,
      career,
      lastCareerPartyWorkOutcome: null,
      lastCareerLocalRaceOutcome: null,
      lastCareerNominationOutcome: null,
      lastCareerCitizenInitiativeOutcome: null,
    });
  },

  abandonCareer: () => {
    clearSavedCareer();
    set({ career: null });
  },

  careerAdvanceTurnAction: () => {
    const career = get().career;
    if (!career) return;
    const option = STARTER_COUNTRY_OPTIONS.find((o) => o.id === career.countryOptionId) ?? STARTER_COUNTRY_OPTIONS[0];
    set({ career: advanceCareerTurn(career, option.parties) });
  },

  careerStartEducationAction: (track) => {
    const career = get().career;
    if (!career) return;
    set({ career: startCareerEducation(career, track) });
  },

  careerApplyForJobAction: (jobId) => {
    const career = get().career;
    if (!career) return;
    set({ career: applyForCareerJob(career, jobId) });
  },

  careerJoinPartyAction: (partyId) => {
    const career = get().career;
    if (!career) return;
    set({ career: joinCareerParty(career, partyId) });
  },

  careerFoundOwnPartyAction: (partyId, name) => {
    const career = get().career;
    if (!career) return;
    set({ career: foundCareerParty(career, partyId, name.trim() || 'New Party') });
  },

  careerDoPartyWorkAction: () => {
    const career = get().career;
    if (!career) return;
    const rng = SeededRng.fromState(career.rngState);
    const { state, outcome } = doPartyWork(career, rng);
    set({ career: state, lastCareerPartyWorkOutcome: outcome });
  },

  careerAttemptLocalRaceAction: () => {
    const career = get().career;
    if (!career) return;
    const rng = SeededRng.fromState(career.rngState);
    const rivalCount = rng.nextInt(1, 3);
    const rivalNames = Array.from({ length: rivalCount }, () => generateName(rng));
    const { state, outcome } = attemptLocalRace(career, rivalNames, rng);
    set({ career: state, lastCareerLocalRaceOutcome: outcome });
  },

  careerAttemptNominationAction: (seed = Math.floor(Math.random() * 1_000_000_000), difficulty = 'standard') => {
    const career = get().career;
    if (!career) return;
    const rng = SeededRng.fromState(career.rngState);
    const { state, outcome } = attemptNationalNomination(career, rng);
    set({ career: state, lastCareerNominationOutcome: outcome });

    if (isGraduated(state)) {
      const payload = buildGraduationPayload(state);
      const option = STARTER_COUNTRY_OPTIONS.find((o) => o.id === state.countryOptionId) ?? STARTER_COUNTRY_OPTIONS[0];
      if (payload) {
        const game = graduateFromCareer(seed, payload, option.country, option.parties, difficulty);
        clearSavedCareer();
        set({
          game,
          career: null,
          economyHistory: [snapshotEconomy(game)],
          lastElection: null,
          lastFloorResult: null,
          lastCoverage: [],
          labResult: null,
          lastCorruptionOutcome: null,
          lastCampaignOutcome: null,
          lastLobbyingOutcome: null,
          lastLeadershipActionOutcome: null,
          lastCovertOperationOutcome: null,
        });
      }
    }
  },

  careerAttemptCitizenInitiativeAction: (title, stance) => {
    const career = get().career;
    if (!career) return;
    const trimmed = title.trim();
    if (!trimmed) return;
    const rng = SeededRng.fromState(career.rngState);
    const { state, outcome } = attemptCitizenInitiative(career, trimmed, stance, rng);
    if (outcome) set({ career: state, lastCareerCitizenInitiativeOutcome: outcome });
  },

  proposeNewBill: () => {
    const game = get().game;
    if (!game) return;
    const rng = SeededRng.fromState(game.rngState);
    const template = pickBillTemplate(rng);
    const sponsor = game.politicians.find((p) => p.isPlayer);
    if (!sponsor) return;

    const bill = proposeBill({
      id: `bill-${game.turn}-${game.bills.length + 1}`,
      title: template.title,
      category: template.category,
      provisions: template.provisions,
      sponsorId: sponsor.id,
    });

    set({ game: { ...game, bills: [...game.bills, bill], rngState: rng.getState() } });
  },

  proposeCustomBill: (title, category, provisions) => {
    const game = get().game;
    if (!game) return;
    const trimmedTitle = title.trim();
    const cleanedProvisions = provisions
      .map((p) => ({ description: p.description.trim(), budgetImpact: p.budgetImpact }))
      .filter((p) => p.description.length > 0);
    if (!trimmedTitle || cleanedProvisions.length === 0) return;
    const sponsor = game.politicians.find((p) => p.isPlayer);
    if (!sponsor) return;

    const bill = proposeBill({
      id: `bill-${game.turn}-${game.bills.length + 1}`,
      title: trimmedTitle,
      category,
      provisions: cleanedProvisions.map((p, i) => ({
        id: `custom-${game.turn}-${game.bills.length + 1}-${i}`,
        description: p.description,
        budgetImpact: p.budgetImpact,
      })),
      sponsorId: sponsor.id,
    });

    set({ game: { ...game, bills: [...game.bills, bill] } });
  },

  sendToCommittee: (billId) => {
    const game = get().game;
    if (!game) return;
    const bills = game.bills.map((b) => (b.id === billId ? advanceToCommittee(b) : b));
    set({ game: { ...game, bills } });
  },

  sendToFloor: (billId) => {
    const game = get().game;
    if (!game) return;
    const rng = SeededRng.fromState(game.rngState);
    set({ game: engineAdvanceBillToFloor(game, billId, rng) });
  },

  setStance: (billId, politicianId, stance) => {
    const game = get().game;
    if (!game) return;
    const bills = game.bills.map((b) =>
      b.id === billId ? setWhipStance(b, politicianId, stance) : b
    );
    set({ game: { ...game, bills } });
  },

  holdFloorVote: (billId) => {
    const game = get().game;
    if (!game) return;
    const bill = game.bills.find((b) => b.id === billId);
    if (!bill) return;
    const sponsor = game.politicians.find((p) => p.id === bill.sponsorId);
    if (!sponsor) return;

    const rng = SeededRng.fromState(game.rngState);
    const lobbyingPressure = computeLobbyingPressure(game.interestGroups, bill, sponsor);
    const factionTerms = computeFactionTerms(
      game.politicians,
      sponsor,
      game.parties,
      game.relationships,
      game.favorBank,
      game.factionLeaderId
    );
    const result = resolveFloorVote(
      bill,
      game.politicians,
      game.relationships,
      game.favorBank,
      rng,
      undefined,
      lobbyingPressure,
      factionTerms
    );
    const updatedBill = applyFloorVoteResult(bill, result);
    const bills = game.bills.map((b) => (b.id === billId ? updatedBill : b));
    const interestGroups = applyBillOutcomeToGroups(game.interestGroups, updatedBill, sponsor, result.passed);
    const cabinet = result.passed
      ? game.cabinet
      : resolveCollectiveResponsibility(game.cabinet, game.politicians, updatedBill, rng).cabinet;

    let nextState: GameState = { ...game, bills, interestGroups, cabinet, rngState: rng.getState() };
    nextState = applyBillOutcomeToApproval(nextState, sponsor.id, result.passed);
    nextState = enactPassedBill(nextState, updatedBill);
    const { state: coveredState, coverage } = generateEventCoverage(
      nextState,
      result.passed ? 'bill_passed' : 'bill_failed',
      sponsor.name,
      sponsor.ideology
    );

    set({
      game: coveredState,
      lastFloorResult: { ...result, billTitle: bill.title },
      lastCoverage: coverage,
    });
  },

  addProvisionAction: (billId, description, budgetImpact) => {
    const game = get().game;
    if (!game) return;
    const trimmed = description.trim();
    if (!trimmed) return;
    const bills = game.bills.map((b) =>
      b.id === billId
        ? addBillProvision(b, { id: `${billId}-p${b.provisions.length + 1}`, description: trimmed, budgetImpact })
        : b
    );
    set({ game: { ...game, bills } });
  },

  removeProvisionAction: (billId, provisionId) => {
    const game = get().game;
    if (!game) return;
    const bills = game.bills.map((b) => (b.id === billId ? removeBillProvision(b, provisionId) : b));
    set({ game: { ...game, bills } });
  },

  amendProvisionAction: (billId, provisionId, description, budgetImpact) => {
    const game = get().game;
    if (!game) return;
    const trimmed = description.trim();
    if (!trimmed) return;
    const bills = game.bills.map((b) =>
      b.id === billId ? amendBillProvision(b, provisionId, { description: trimmed, budgetImpact }) : b
    );
    set({ game: { ...game, bills } });
  },

  invokeFilibusterAction: (billId) => {
    const game = get().game;
    if (!game) return;
    const bills = game.bills.map((b) => (b.id === billId ? invokeFilibuster(b) : b));
    set({ game: { ...game, bills } });
  },

  attemptClotureAction: (billId) => {
    const game = get().game;
    if (!game) return;
    const bill = game.bills.find((b) => b.id === billId);
    if (!bill) return;
    const sponsor = game.politicians.find((p) => p.id === bill.sponsorId);
    const rng = SeededRng.fromState(game.rngState);
    const factionTerms = sponsor
      ? computeFactionTerms(game.politicians, sponsor, game.parties, game.relationships, game.favorBank, game.factionLeaderId)
      : {};
    const { bill: updatedBill, result } = attemptCloture(
      bill,
      game.politicians,
      game.relationships,
      game.favorBank,
      rng,
      undefined,
      0,
      undefined,
      factionTerms
    );
    const bills = game.bills.map((b) => (b.id === billId ? updatedBill : b));
    set({ game: { ...game, bills, rngState: rng.getState() }, lastClotureResult: { ...result, billId } });
  },

  proposeBallotInitiativeAction: (title, description, ideologyStance, budgetImpact) => {
    const game = get().game;
    if (!game) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    const id = `initiative-${game.turn}-${game.ballotInitiatives.length + 1}`;
    const economyEffect = { budgetBalance: budgetImpact / 10_000, gdpGrowth: -budgetImpact / 40_000 };
    const nextState = engineProposeBallotInitiative(game, id, trimmedTitle, description.trim(), ideologyStance, economyEffect);
    set({ game: nextState });
  },

  resolveBallotInitiativeAction: (initiativeId) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineResolveBallotInitiative(game, initiativeId);
    if (!outcome) return;
    set({ game: state, lastBallotResult: { ...outcome, initiativeId } });
  },

  attemptImpeachmentAction: (targetId) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineAttemptImpeachment(game, targetId);
    if (!outcome) return;
    set({ game: state, lastImpeachmentOutcome: outcome });
  },

  concedeToProtestersAction: (protestId) => {
    const game = get().game;
    if (!game) return;
    set({ game: engineConcedeToProtesters(game, protestId) });
  },

  disperseProtestAction: (protestId) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineDisperseProtest(game, protestId);
    if (!outcome) return;
    set({ game: state, lastDispersalOutcome: { ...outcome, protestId } });
  },

  nudgeRelationship: (politicianId, delta) => {
    const game = get().game;
    if (!game) return;
    const player = game.politicians.find((p) => p.isPlayer);
    if (!player) return;
    const key = relationshipKey(player.id, politicianId);
    const current = game.relationships[key] ?? 0;
    const next = Math.max(-100, Math.min(100, current + delta));
    set({ game: { ...game, relationships: { ...game.relationships, [key]: next } } });
  },

  addFavor: (politicianId) => {
    const game = get().game;
    if (!game) return;
    const current = game.favorBank[politicianId] ?? 0;
    const next = Math.min(MAX_FAVORS, current + 1);
    set({ game: { ...game, favorBank: { ...game.favorBank, [politicianId]: next } } });
  },

  giveSpeech: () => {
    const game = get().game;
    if (!game) return;
    const player = game.politicians.find((p) => p.isPlayer);
    if (!player) return;
    const politicians = game.politicians.map((p) =>
      p.id === player.id ? pushApprovalEvent(p, 'public', 20, 5) : p
    );
    set({ game: { ...game, politicians } });
  },

  holdPressInterviewAction: () => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = holdPressInterview(game);
    set({ game: state, lastCampaignOutcome: { ...outcome, action: 'interview' } });
  },

  holdRallyAction: () => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = holdRally(game);
    set({ game: state, lastCampaignOutcome: { ...outcome, action: 'rally' } });
  },

  holdPressConferenceAction: (topic) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineHoldPressConference(game, topic);
    set({ game: state, lastCampaignOutcome: { ...outcome, action: 'press_conference' } });
  },

  holdDebateAction: (rivalId) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineHoldDebate(game, rivalId);
    if (!outcome) return;
    set({ game: state, lastDebateResult: outcome });
  },

  seekEndorsementAction: (endorserId) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineSeekEndorsement(game, endorserId);
    if (!outcome) return;
    set({ game: state, lastEndorsementOutcome: { ...outcome, endorserId } });
  },

  commissionApprovalPollAction: (firmId) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineCommissionApprovalPoll(game, firmId);
    if (!outcome) return;
    set({ game: state, lastPollResult: outcome });
  },

  commissionPartyPollAction: (firmId, partyId) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineCommissionPartyPoll(game, firmId, partyId);
    if (!outcome) return;
    set({ game: state, lastPollResult: outcome });
  },

  mergePartiesAction: (absorbedPartyId, survivingPartyId) => {
    const game = get().game;
    if (!game) return;
    set({ game: engineMergeParties(game, absorbedPartyId, survivingPartyId) });
  },

  rebrandPartyAction: (partyId, newName, newIdeology) => {
    const game = get().game;
    if (!game) return;
    const trimmed = newName.trim();
    if (!trimmed) return;
    set({ game: engineRebrandParty(game, partyId, trimmed, newIdeology) });
  },

  castSummitVoteAction: (vote) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineCastSummitVote(game, vote);
    if (!outcome) return;
    set({ game: state, lastSummitOutcome: outcome });
  },

  resolveDilemmaAction: (choiceId) => {
    const game = get().game;
    if (!game) return;
    set({ game: resolveDilemmaChoice(game, choiceId) });
  },

  makePromiseAction: (metric) => {
    const game = get().game;
    if (!game) return;
    if (game.playerPromises.some((p) => p.metric === metric)) return;
    const promise = makePromise(game, metric);
    set({ game: { ...game, playerPromises: [...game.playerPromises, promise] } });
  },

  nextTurn: () => {
    const game = get().game;
    if (!game) return;
    const next = advanceTurn(game);
    set({ game: next, economyHistory: [...get().economyHistory, snapshotEconomy(next)] });
  },

  runElection: () => {
    const game = get().game;
    if (!game) return;
    const previousSeats = Object.fromEntries(game.parties.map((p) => [p.id, p.seats]));
    const { state, outcome } = runLegislativeElection(game);
    const player = state.politicians.find((p) => p.isPlayer);
    if (!player) {
      set({ game: state, lastElection: outcome, lastElectionPreviousSeats: previousSeats });
      return;
    }
    const { state: coveredState, coverage } = generateEventCoverage(
      state,
      'election_result',
      player.name,
      player.ideology
    );
    set({
      game: coveredState,
      lastElection: outcome,
      lastElectionPreviousSeats: previousSeats,
      lastCoverage: coverage,
    });
  },

  runElectoralLab: (system) => {
    const game = get().game;
    if (!game) return;
    const rng = SeededRng.fromState(game.rngState);

    let labResult: LabResult;

    if (system === 'STV') {
      const candidateIds = game.parties.map((p) => p.id);
      const candidateIdeology = Object.fromEntries(game.parties.map((p) => [p.id, p.ideology]));
      const voters = game.voterBlocs.map((b) => ({ ideology: b.ideology, weight: b.size }));
      const ballots = generateRankedBallots(voters, candidateIds, candidateIdeology, STV_BALLOTS, rng);
      const stv = resolveSTV(ballots, candidateIds, STV_SEATS);
      labResult = { system: 'STV', elected: stv.elected, quota: stv.quota, seats: STV_SEATS };
    } else if (system === 'MMP') {
      const { districts } = game.country.legislature;
      const perDistrictTurnout = Math.round(LAB_TURNOUT / districts.length);
      const districtResults = districts.map((d) =>
        generateDistrictVotes(d, game.parties, perDistrictTurnout, rng, {}, game.voterBlocs, game.districtLeanDrift)
      );
      const listVotes = generateNationalVotes(game.parties, LAB_TURNOUT, rng, {}, game.voterBlocs);
      const result = resolveMMP(districtResults, listVotes, districts.length);
      labResult = { system: 'MMP', result };
    } else if (system === 'RUNOFF') {
      const firstRound = generateNationalVotes(game.parties, LAB_TURNOUT, rng, {}, game.voterBlocs);
      const wonOutright = getMajorityWinner(firstRound);
      if (wonOutright) {
        labResult = { system: 'RUNOFF', firstRound, wonOutright, winner: wonOutright };
      } else {
        const pair = getRunoffPair(firstRound)!;
        const runoffParties = game.parties.filter((p) => pair.includes(p.id));
        const secondRound = generateNationalVotes(runoffParties, LAB_TURNOUT, rng, {}, game.voterBlocs);
        const winner = resolveRunoffRound(secondRound);
        labResult = { system: 'RUNOFF', firstRound, wonOutright: null, secondRound, winner };
      }
    } else {
      const targetParty = [...game.parties].sort((a, b) => b.seats - a.seats)[0];
      const candidates = game.politicians
        .filter((p) => p.partyId === targetParty.id)
        .slice(0, 4)
        .map((p) => ({ id: p.id, ideology: p.ideology }));
      const votes = generatePrimaryVotes(candidates, targetParty.ideology, 100_000, rng);
      const winner = resolvePrimary(votes);
      labResult = { system: 'PRIMARY', partyId: targetParty.id, votes, winner };
    }

    set({ game: { ...game, rngState: rng.getState() }, labResult });
  },

  attemptCorruption: (targetId, tier) => {
    const game = get().game;
    if (!game) return;
    const player = game.politicians.find((p) => p.isPlayer);
    if (!player) return;
    const { state, outcome } = commitCorruption(game, player.id, targetId, tier, 0);
    set({ game: state, lastCorruptionOutcome: outcome });
  },

  respondToScandalAction: (scandalId, response) => {
    const game = get().game;
    if (!game) return;
    set({ game: respondToScandal(game, scandalId, response) });
  },

  signTreatyAction: (counterpartId, templateIndex) => {
    const game = get().game;
    if (!game) return;
    const template = TREATY_TEMPLATES[templateIndex];
    const counterpart = game.foreignCounterparts.find((c) => c.id === counterpartId);
    if (!template || !counterpart) return;

    const treaty = proposeTreaty({
      id: `treaty-${game.turn}-${game.treaties.length + 1}`,
      counterpartId,
      type: template.type,
      title: `${template.title} — ${counterpart.name}`,
      economyEffect: template.economyEffect,
      relationEffect: template.relationEffect,
    });
    const { treaty: signed, economy, relations } = signTreaty(treaty, game.economy, game.foreignRelations);
    set({
      game: { ...game, treaties: [...game.treaties, signed], economy, foreignRelations: relations },
    });
  },

  breakTreatyAction: (treatyId) => {
    const game = get().game;
    if (!game) return;
    const treaty = game.treaties.find((t) => t.id === treatyId);
    if (!treaty) return;
    const { treaty: broken, relations } = breakTreaty(treaty, game.foreignRelations);
    const treaties = game.treaties.map((t) => (t.id === treatyId ? broken : t));
    set({ game: { ...game, treaties, foreignRelations: relations } });
  },

  sendAidAction: (counterpartId) => {
    const game = get().game;
    if (!game) return;
    const { economy, relations } = sendAid(counterpartId, game.economy, game.foreignRelations);
    set({ game: { ...game, economy, foreignRelations: relations } });
  },

  imposeSanctionsAction: (counterpartId) => {
    const game = get().game;
    if (!game) return;
    const { economy, relations } = imposeSanctions(counterpartId, game.economy, game.foreignRelations);
    set({ game: { ...game, economy, foreignRelations: relations } });
  },

  declareWarAction: (counterpartId) => {
    const game = get().game;
    if (!game) return;
    if (game.wars.some((w) => w.counterpartId === counterpartId && w.status === 'active')) return;
    const war = declareWar(counterpartId, game.turn);
    const softening = computeCabinetEffects(game.cabinet, game.politicians).warDeclarationRelationSoftening;
    const penalty = WAR_DECLARATION_RELATION_PENALTY * (1 - softening);
    const foreignRelations = adjustRelation(game.foreignRelations, counterpartId, penalty);
    set({ game: { ...game, wars: [...game.wars, war], foreignRelations } });
  },

  proposeTradeDealAction: (counterpartId, commodity, volume, tariff) => {
    const game = get().game;
    if (!game) return;
    const deal = proposeTradeDeal(
      `trade-${game.turn}-${game.tradeDeals.length + 1}`,
      counterpartId,
      commodity,
      volume,
      tariff
    );
    set({ game: { ...game, tradeDeals: [...game.tradeDeals, deal] } });
  },

  signTradeDealAction: (dealId) => {
    const game = get().game;
    if (!game) return;
    const deal = game.tradeDeals.find((d) => d.id === dealId);
    if (!deal) return;
    const { deal: signed, economy, relations } = signTradeDeal(deal, game.economy, game.foreignRelations);
    const tradeDeals = game.tradeDeals.map((d) => (d.id === dealId ? signed : d));
    set({ game: { ...game, tradeDeals, economy, foreignRelations: relations } });
  },

  setTariffAction: (dealId, tariff) => {
    const game = get().game;
    if (!game) return;
    const tradeDeals = game.tradeDeals.map((d) => (d.id === dealId ? setTariff(d, tariff) : d));
    set({ game: { ...game, tradeDeals } });
  },

  cancelTradeDealAction: (dealId) => {
    const game = get().game;
    if (!game) return;
    const tradeDeals = game.tradeDeals.map((d) => (d.id === dealId ? cancelTradeDeal(d) : d));
    set({ game: { ...game, tradeDeals } });
  },

  imposeEmbargoAction: (counterpartId) => {
    const game = get().game;
    if (!game) return;
    const { tradeDeals, economy, relations } = imposeEmbargo(
      counterpartId,
      game.tradeDeals,
      game.economy,
      game.foreignRelations
    );
    set({ game: { ...game, tradeDeals, economy, foreignRelations: relations } });
  },

  investInMilitaryAction: (tier) => {
    const game = get().game;
    if (!game) return;
    const { military, economyEffect } = investInMilitary(game.playerMilitary, tier);
    const economy = applyImmediateEffect(game.economy, economyEffect);
    set({ game: { ...game, playerMilitary: military, economy } });
  },

  startElectionNightAction: () => {
    const game = get().game;
    if (!game) return;
    set({ game: beginElectionNight(game), lastElection: null });
  },

  reportNextProvinceAction: () => {
    const game = get().game;
    if (!game) return;
    set({ game: engineReportNextProvince(game) });
  },

  concludeElectionNightAction: () => {
    const game = get().game;
    if (!game) return;
    set({ game: engineConcludeElectionNight(game) });
  },

  dismissElectionNightAction: () => {
    const game = get().game;
    if (!game) return;
    set({ game: dismissElectionNight(game) });
  },

  appointToCabinetAction: (portfolio, politicianId, rank = 'senior') => {
    const game = get().game;
    if (!game) return;
    set({ game: { ...game, cabinet: appointToCabinet(game.cabinet, portfolio, politicianId, rank) } });
  },

  removeFromCabinetAction: (portfolio, rank = 'senior') => {
    const game = get().game;
    if (!game) return;
    set({ game: { ...game, cabinet: removeFromCabinet(game.cabinet, portfolio, rank) } });
  },

  reshuffleCabinetAction: (portfolio, rank, politicianId) => {
    const game = get().game;
    if (!game) return;
    const { cabinet, removedPoliticianId } = reshuffleCabinet(game.cabinet, portfolio, rank, politicianId);
    let relationships = game.relationships;
    if (removedPoliticianId) {
      const player = game.politicians.find((p) => p.isPlayer);
      if (player) {
        const key = relationshipKey(player.id, removedPoliticianId);
        relationships = { ...relationships, [key]: (relationships[key] ?? 0) - 15 };
      }
    }
    set({ game: { ...game, cabinet, relationships } });
  },

  attemptMinisterNoConfidenceAction: (targetId) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineAttemptMinisterNoConfidence(game, targetId);
    set({ game: state, lastMinisterNoConfidenceOutcome: outcome });
  },

  courtInterestGroupAction: (groupId) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineCourtInterestGroup(game, groupId);
    set({ game: state, lastLobbyingOutcome: { ...outcome, groupId } });
  },

  rallyPartySupportAction: () => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineRallyPartySupport(game);
    set({ game: state, lastLeadershipActionOutcome: { ...outcome, action: 'rally' } });
  },

  denounceChallengerAction: () => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineDenounceChallenger(game);
    set({ game: state, lastLeadershipActionOutcome: { ...outcome, action: 'denounce' } });
  },

  dismissLeadershipChallengeAction: () => {
    const game = get().game;
    if (!game) return;
    set({ game: engineDismissLeadershipChallenge(game), lastLeadershipActionOutcome: null });
  },

  resolveCoalitionOfferAction: (offerId) => {
    const game = get().game;
    if (!game) return;
    set({ game: engineResolveCoalitionOffer(game, offerId) });
  },

  attemptCovertOperationAction: (counterpartId, type) => {
    const game = get().game;
    if (!game) return;
    const counterpart = game.foreignCounterparts.find((c) => c.id === counterpartId);
    if (!counterpart) return;

    const rng = SeededRng.fromState(game.rngState);
    const outcome = attemptCovertOperation(type, game.intelligenceCapability, counterpart.military, rng);

    const foreignCounterparts = game.foreignCounterparts.map((c) =>
      c.id === counterpartId ? { ...c, military: applyCovertMilitaryDelta(c.military, outcome.counterpartMilitaryDelta) } : c
    );
    const foreignRelations = outcome.relationDelta
      ? adjustRelation(game.foreignRelations, counterpartId, outcome.relationDelta)
      : game.foreignRelations;
    const economy = applyImmediateEffect(game.economy, outcome.economyEffect);
    const playerMilitary = outcome.techGain
      ? { ...game.playerMilitary, techLevel: Math.min(100, game.playerMilitary.techLevel + outcome.techGain) }
      : game.playerMilitary;
    const covertOperations = [
      ...game.covertOperations,
      {
        id: `covert-${game.turn}-${game.covertOperations.length + 1}`,
        counterpartId,
        type,
        turn: game.turn,
        success: outcome.success,
        detected: outcome.detected,
      },
    ];

    set({
      game: {
        ...game,
        foreignCounterparts,
        foreignRelations,
        economy,
        playerMilitary,
        covertOperations,
        rngState: rng.getState(),
      },
      lastCovertOperationOutcome: { ...outcome, counterpartId, type },
    });
  },

  investInIntelligenceAction: (tier) => {
    const game = get().game;
    if (!game) return;
    const { capability, economyEffect } = investInIntelligence(game.intelligenceCapability, tier);
    const economy = applyImmediateEffect(game.economy, economyEffect);
    set({ game: { ...game, intelligenceCapability: capability, economy } });
  },

  foundNewPartyAction: (partyId, name, ideology) => {
    const game = get().game;
    if (!game) return;
    const outcome = engineFoundNewParty(game, partyId, name.trim() || 'New Party', ideology);
    if (!outcome) return;
    set({ game: outcome.state, lastFoundPartyResult: outcome.result });
  },

  grantAutonomyAction: (provinceId) => {
    const game = get().game;
    if (!game) return;
    set({ game: engineGrantAutonomy(game, provinceId) });
  },

  callReferendumAction: (provinceId) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineCallReferendum(game, provinceId);
    if (!outcome) return;
    set({ game: state, lastReferendumOutcome: { ...outcome, provinceId } });
  },

  suppressMovementAction: (provinceId) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineSuppressMovement(game, provinceId);
    if (!outcome) return;
    set({ game: state, lastSuppressionOutcome: { ...outcome, provinceId } });
  },

  buildMineAction: (depositId, ownership) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineBuildMine(game, depositId, ownership);
    set({ game: state, lastFacilityOutcome: outcome });
  },

  upgradeMineAction: (mineId) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineUpgradeMine(game, mineId);
    set({ game: state, lastFacilityOutcome: outcome });
  },

  buildFactoryAction: (locationId, locationType, recipeId, ownership) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineBuildFactory(game, locationId, locationType, recipeId, ownership);
    set({ game: state, lastFacilityOutcome: outcome });
  },

  upgradeFactoryAction: (factoryId) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineUpgradeFactory(game, factoryId);
    set({ game: state, lastFacilityOutcome: outcome });
  },

  sellRawResourceAction: (resource, units, sellAs) => {
    const game = get().game;
    if (!game) return;
    const { state, sale } = engineSellRawResource(game, resource, units, sellAs);
    set({ game: state, lastSale: { ...sale, good: resource } });
  },

  sellProcessedGoodAction: (good, units, ownership) => {
    const game = get().game;
    if (!game) return;
    const { state, sale } = engineSellProcessedGood(game, good, units, ownership);
    set({ game: state, lastSale: { ...sale, good } });
  },

  investInLogisticsAction: (tier) => {
    const game = get().game;
    if (!game) return;
    const { network, economyEffect } = investInLogistics(game.logisticsNetwork, tier);
    const economy = applyImmediateEffect(game.economy, economyEffect);
    set({ game: { ...game, logisticsNetwork: network, economy } });
  },

  nominateJusticeAction: (seatIndex) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineNominateJustice(game, seatIndex);
    set({ game: state, lastJudiciaryOutcome: outcome });
  },

  confirmJusticeAction: (seatIndex) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome, result } = engineConfirmJustice(game, seatIndex);
    set({ game: state, lastJudiciaryOutcome: outcome, lastConfirmationResult: result });
  },

  investInResearchAction: (tier) => {
    const game = get().game;
    if (!game) return;
    const { research, economyEffect } = investInResearch(game.research, tier);
    const economy = applyImmediateEffect(game.economy, economyEffect);
    set({ game: { ...game, research, economy } });
  },

  unlockTechAction: (techId) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineUnlockTech(game, techId);
    set({ game: state, lastTechOutcome: outcome });
  },

  setImmigrationPolicyAction: (policy) => {
    const game = get().game;
    if (!game) return;
    set({ game: { ...game, demographics: setImmigrationPolicy(game.demographics, policy) } });
  },

  setHealthcareFundingAction: (tier) => {
    const game = get().game;
    if (!game) return;
    set({ game: { ...game, socialPolicy: setHealthcareFunding(game.socialPolicy, tier) } });
  },

  setEducationFundingAction: (tier) => {
    const game = get().game;
    if (!game) return;
    set({ game: { ...game, socialPolicy: setEducationFunding(game.socialPolicy, tier) } });
  },

  setWelfareFundingAction: (tier) => {
    const game = get().game;
    if (!game) return;
    set({ game: { ...game, socialPolicy: setWelfareFunding(game.socialPolicy, tier) } });
  },

  foundCompanyAction: (name, sector) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineFoundCompany(game, name, sector);
    set({ game: state, lastEnterpriseOutcome: outcome });
  },

  ipoCompanyAction: (companyId) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome, proceeds } = engineIpoCompany(game, companyId);
    set({ game: state, lastEnterpriseOutcome: outcome, lastIpoProceeds: outcome.success ? proceeds : null });
  },

  buySharesAction: (companyId, budgetToSpend) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineBuyShares(game, companyId, budgetToSpend);
    set({ game: state, lastEnterpriseOutcome: outcome });
  },

  sellSharesAction: (companyId, shares) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = engineSellShares(game, companyId, shares);
    set({ game: state, lastEnterpriseOutcome: outcome });
  },

  setPolicingFundingAction: (tier) => {
    const game = get().game;
    if (!game) return;
    set({ game: { ...game, crime: setPolicingFunding(game.crime, tier) } });
  },

  setEnergyPolicyAction: (policy) => {
    const game = get().game;
    if (!game) return;
    set({ game: { ...game, environment: setEnergyPolicy(game.environment, policy) } });
  },

  investInGreenInfrastructureAction: (tier) => {
    const game = get().game;
    if (!game) return;
    const { environment, economyEffect } = investInGreenInfrastructure(game.environment, tier);
    const economy = applyImmediateEffect(game.economy, economyEffect);
    set({ game: { ...game, environment, economy } });
  },

  investInInfrastructureAction: (category, tier) => {
    const game = get().game;
    if (!game) return;
    const { infrastructure, economyEffect } = investInInfrastructure(game.infrastructure, category, tier);
    const economy = applyImmediateEffect(game.economy, economyEffect);
    set({ game: { ...game, infrastructure, economy } });
  },

  postTweetAction: (optionId) => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = enginePostTweet(game, optionId);
    set({ game: state, lastTweetOutcome: outcome });
  },
}));
