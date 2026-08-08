import { create } from 'zustand';
import {
  MAX_FAVORS,
  SeededRng,
  advanceToCommittee,
  advanceToFloor,
  advanceTurn,
  applyFloorVoteResult,
  createNewGame,
  proposeBill,
  relationshipKey,
  resolveFloorVote,
  runLegislativeElection,
  setWhipStance,
  type ElectionOutcome,
  type FloorVoteResult,
  type GameState,
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

interface StatecraftStore {
  game: GameState | null;
  economyHistory: EconomySnapshot[];
  lastElection: ElectionOutcome | null;
  lastFloorResult: (FloorVoteResult & { billTitle: string }) | null;

  newGame: (seed?: number) => void;
  proposeNewBill: () => void;
  sendToCommittee: (billId: string) => void;
  sendToFloor: (billId: string) => void;
  setStance: (billId: string, politicianId: string, stance: WhipStance) => void;
  holdFloorVote: (billId: string) => void;
  nudgeRelationship: (politicianId: string, delta: number) => void;
  addFavor: (politicianId: string) => void;
  nextTurn: () => void;
  runElection: () => void;
}

export const useStatecraftStore = create<StatecraftStore>((set, get) => ({
  game: null,
  economyHistory: [],
  lastElection: null,
  lastFloorResult: null,

  newGame: (seed = Math.floor(Math.random() * 1_000_000_000)) => {
    const game = createNewGame(seed);
    set({
      game,
      economyHistory: [snapshotEconomy(game)],
      lastElection: null,
      lastFloorResult: null,
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

    const rng = SeededRng.fromState(game.rngState);
    const result = resolveFloorVote(bill, game.politicians, game.relationships, game.favorBank, rng);
    const updatedBill = applyFloorVoteResult(bill, result);
    const bills = game.bills.map((b) => (b.id === billId ? updatedBill : b));

    set({
      game: { ...game, bills, rngState: rng.getState() },
      lastFloorResult: { ...result, billTitle: bill.title },
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
    set({ game: state, lastElection: outcome });
  },
}));
