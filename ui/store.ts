import { create } from 'zustand';
import {
  MAX_FAVORS,
  SeededRng,
  WAR_DECLARATION_RELATION_PENALTY,
  adjustRelation,
  advanceCareerTurn,
  advanceToCommittee,
  advanceToFloor,
  advanceTurn,
  applyCovertMilitaryDelta,
  applyForJob as applyForCareerJob,
  attemptLocalRace,
  attemptNationalNomination,
  buildGraduationPayload,
  createCareer,
  doPartyWork,
  graduateFromCareer,
  isGraduated,
  joinParty as joinCareerParty,
  startEducation as startCareerEducation,
  appointToCabinet,
  applyBillOutcomeToApproval,
  applyFloorVoteResult,
  applyImmediateEffect,
  attemptCovertOperation,
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
  type CabinetPortfolio,
  type CampaignActionOutcome,
  type CareerState,
  type CommodityType,
  type CorruptionAttemptOutcome,
  type CorruptionTier,
  type CourtGroupOutcome,
  type CoverageEvent,
  type CovertOperationOutcome,
  type CovertOperationType,
  type Difficulty,
  type EducationTrack,
  type ElectionOutcome,
  type FloorVoteResult,
  type GameState,
  type IntelligenceInvestmentTier,
  type LocalRaceOutcome,
  type MilitaryInvestmentTier,
  type MmpResult,
  type NominationOutcome,
  type PartyActionOutcome,
  type PartyVoteShare,
  type PartyWorkOutcome,
  type ScandalResponse,
  type WhipStance,
} from '../engine';
import { pickBillTemplate } from '../content/flavor/billTemplates';
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
  career: CareerState | null;
  lastCareerPartyWorkOutcome: PartyWorkOutcome | null;
  lastCareerLocalRaceOutcome: LocalRaceOutcome | null;
  lastCareerNominationOutcome: NominationOutcome | null;
  economyHistory: EconomySnapshot[];
  lastElection: ElectionOutcome | null;
  lastFloorResult: (FloorVoteResult & { billTitle: string }) | null;
  lastCoverage: CoverageEvent[];
  labResult: LabResult | null;
  lastCorruptionOutcome: CorruptionAttemptOutcome | null;
  lastCampaignOutcome: (CampaignActionOutcome & { action: 'interview' | 'rally' }) | null;
  lastLobbyingOutcome: (CourtGroupOutcome & { groupId: string }) | null;
  lastLeadershipActionOutcome: (PartyActionOutcome & { action: 'rally' | 'denounce' }) | null;
  lastCovertOperationOutcome: (CovertOperationOutcome & { counterpartId: string; type: CovertOperationType }) | null;

  newGame: (seed?: number, difficulty?: Difficulty, countryOptionId?: string) => void;
  saveGame: () => void;
  loadGame: () => boolean;
  startCareer: (name: string, countryOptionId: string, seed?: number) => void;
  abandonCareer: () => void;
  careerAdvanceTurnAction: () => void;
  careerStartEducationAction: (track: EducationTrack) => void;
  careerApplyForJobAction: (jobId: string) => void;
  careerJoinPartyAction: (partyId: string) => void;
  careerDoPartyWorkAction: () => void;
  careerAttemptLocalRaceAction: () => void;
  careerAttemptNominationAction: (seed?: number, difficulty?: Difficulty) => void;
  proposeNewBill: () => void;
  proposeCustomBill: (title: string, provisions: { description: string; budgetImpact: number }[]) => void;
  sendToCommittee: (billId: string) => void;
  sendToFloor: (billId: string) => void;
  setStance: (billId: string, politicianId: string, stance: WhipStance) => void;
  holdFloorVote: (billId: string) => void;
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
  appointToCabinetAction: (portfolio: CabinetPortfolio, politicianId: string) => void;
  removeFromCabinetAction: (portfolio: CabinetPortfolio) => void;
  courtInterestGroupAction: (groupId: string) => void;
  rallyPartySupportAction: () => void;
  denounceChallengerAction: () => void;
  dismissLeadershipChallengeAction: () => void;
  attemptCovertOperationAction: (counterpartId: string, type: CovertOperationType) => void;
  investInIntelligenceAction: (tier: IntelligenceInvestmentTier) => void;
}

export const useStatecraftStore = create<StatecraftStore>((set, get) => ({
  game: null,
  career: null,
  lastCareerPartyWorkOutcome: null,
  lastCareerLocalRaceOutcome: null,
  lastCareerNominationOutcome: null,
  economyHistory: [],
  lastElection: null,
  lastFloorResult: null,
  lastCoverage: [],
  labResult: null,
  lastCorruptionOutcome: null,
  lastCampaignOutcome: null,
  lastLobbyingOutcome: null,
  lastLeadershipActionOutcome: null,
  lastCovertOperationOutcome: null,

  newGame: (seed = Math.floor(Math.random() * 1_000_000_000), difficulty = 'standard', countryOptionId = 'kastoria') => {
    const option =
      STARTER_COUNTRY_OPTIONS.find((o) => o.id === countryOptionId) ?? STARTER_COUNTRY_OPTIONS[0];
    const game = createNewGame(seed, { difficulty, country: option.country, parties: option.parties });
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
      provisions: template.provisions,
      sponsorId: sponsor.id,
    });

    set({ game: { ...game, bills: [...game.bills, bill], rngState: rng.getState() } });
  },

  proposeCustomBill: (title, provisions) => {
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
    const bills = game.bills.map((b) => (b.id === billId ? advanceToFloor(b) : b));
    set({ game: { ...game, bills } });
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
    const result = resolveFloorVote(
      bill,
      game.politicians,
      game.relationships,
      game.favorBank,
      rng,
      undefined,
      lobbyingPressure
    );
    const updatedBill = applyFloorVoteResult(bill, result);
    const bills = game.bills.map((b) => (b.id === billId ? updatedBill : b));
    const interestGroups = applyBillOutcomeToGroups(game.interestGroups, updatedBill, sponsor, result.passed);

    let nextState: GameState = { ...game, bills, interestGroups, rngState: rng.getState() };
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

  nextTurn: () => {
    const game = get().game;
    if (!game) return;
    const next = advanceTurn(game);
    set({ game: next, economyHistory: [...get().economyHistory, snapshotEconomy(next)] });
  },

  runElection: () => {
    const game = get().game;
    if (!game) return;
    const { state, outcome } = runLegislativeElection(game);
    const player = state.politicians.find((p) => p.isPlayer);
    if (!player) {
      set({ game: state, lastElection: outcome });
      return;
    }
    const { state: coveredState, coverage } = generateEventCoverage(
      state,
      'election_result',
      player.name,
      player.ideology
    );
    set({ game: coveredState, lastElection: outcome, lastCoverage: coverage });
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
        generateDistrictVotes(d, game.parties, perDistrictTurnout, rng)
      );
      const listVotes = generateNationalVotes(game.parties, LAB_TURNOUT, rng);
      const result = resolveMMP(districtResults, listVotes, districts.length);
      labResult = { system: 'MMP', result };
    } else if (system === 'RUNOFF') {
      const firstRound = generateNationalVotes(game.parties, LAB_TURNOUT, rng);
      const wonOutright = getMajorityWinner(firstRound);
      if (wonOutright) {
        labResult = { system: 'RUNOFF', firstRound, wonOutright, winner: wonOutright };
      } else {
        const pair = getRunoffPair(firstRound)!;
        const runoffParties = game.parties.filter((p) => pair.includes(p.id));
        const secondRound = generateNationalVotes(runoffParties, LAB_TURNOUT, rng);
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

  appointToCabinetAction: (portfolio, politicianId) => {
    const game = get().game;
    if (!game) return;
    set({ game: { ...game, cabinet: appointToCabinet(game.cabinet, portfolio, politicianId) } });
  },

  removeFromCabinetAction: (portfolio) => {
    const game = get().game;
    if (!game) return;
    set({ game: { ...game, cabinet: removeFromCabinet(game.cabinet, portfolio) } });
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
}));
