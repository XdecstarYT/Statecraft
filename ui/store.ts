import { create } from 'zustand';
import {
  MAX_FAVORS,
  SeededRng,
  advanceToCommittee,
  advanceToFloor,
  advanceTurn,
  applyBillOutcomeToApproval,
  applyFloorVoteResult,
  createNewGame,
  generateEventCoverage,
  generateNationalVotes,
  generateDistrictVotes,
  generatePrimaryVotes,
  generateRankedBallots,
  getMajorityWinner,
  getRunoffPair,
  proposeBill,
  pushApprovalEvent,
  relationshipKey,
  resolveFloorVote,
  resolveMMP,
  resolvePrimary,
  resolveRunoffRound,
  resolveSTV,
  runLegislativeElection,
  setWhipStance,
  type CoverageEvent,
  type ElectionOutcome,
  type FloorVoteResult,
  type GameState,
  type MmpResult,
  type PartyVoteShare,
  type WhipStance,
} from '../engine';
import { pickBillTemplate } from '../content/flavor/billTemplates';

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
  economyHistory: EconomySnapshot[];
  lastElection: ElectionOutcome | null;
  lastFloorResult: (FloorVoteResult & { billTitle: string }) | null;
  lastCoverage: CoverageEvent[];
  labResult: LabResult | null;

  newGame: (seed?: number) => void;
  proposeNewBill: () => void;
  sendToCommittee: (billId: string) => void;
  sendToFloor: (billId: string) => void;
  setStance: (billId: string, politicianId: string, stance: WhipStance) => void;
  holdFloorVote: (billId: string) => void;
  nudgeRelationship: (politicianId: string, delta: number) => void;
  addFavor: (politicianId: string) => void;
  giveSpeech: () => void;
  nextTurn: () => void;
  runElection: () => void;
  runElectoralLab: (system: LabResult['system']) => void;
}

export const useStatecraftStore = create<StatecraftStore>((set, get) => ({
  game: null,
  economyHistory: [],
  lastElection: null,
  lastFloorResult: null,
  lastCoverage: [],
  labResult: null,

  newGame: (seed = Math.floor(Math.random() * 1_000_000_000)) => {
    const game = createNewGame(seed);
    set({
      game,
      economyHistory: [snapshotEconomy(game)],
      lastElection: null,
      lastFloorResult: null,
      lastCoverage: [],
      labResult: null,
    });
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
    const result = resolveFloorVote(bill, game.politicians, game.relationships, game.favorBank, rng);
    const updatedBill = applyFloorVoteResult(bill, result);
    const bills = game.bills.map((b) => (b.id === billId ? updatedBill : b));

    let nextState: GameState = { ...game, bills, rngState: rng.getState() };
    nextState = applyBillOutcomeToApproval(nextState, sponsor.id, result.passed);
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
}));
