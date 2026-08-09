import { SeededRng } from './rng';
import type {
  Bill,
  CorruptionTier,
  Country,
  EconomyState,
  ElectoralSystem,
  ForeignCounterpart,
  GameState,
  IdeologyPosition,
  MediaOutlet,
  Party,
  Politician,
  ScandalResponse,
  VoterBloc,
} from './models/types';
import type { Difficulty } from './difficulty';
import { getDifficultySettings } from './difficulty';
import { advanceEconomy, applyImmediateEffect } from './systems/economy';
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
  MAX_FAVORS,
  advanceToCommittee,
  advanceToFloor,
  applyFloorVoteResult,
  proposeBill,
  resolveFloorVote,
} from './systems/legislative';
import { attemptCorruptionAction, computeScandalSeverity } from './systems/corruption';
import { rollForEvent, applyCrisisEvent, DEFAULT_EVENT_CHANCE } from './systems/events';
import {
  applyNpcStances,
  computePartyMomentum,
  selectNpcBillSponsor,
  selectNpcBillTemplate,
  updateRelationshipsAfterVote,
} from './systems/npc';
import { clampAxis } from './ideology';
import { STARTER_COUNTRY, STARTER_PARTIES } from '../content/countries/starter';
import { generateName } from '../content/names/pool';
import { STARTER_VOTER_BLOCS } from '../content/opinion/blocs';
import { STARTER_MEDIA_OUTLETS } from '../content/media/outlets';
import { HEADLINE_TEMPLATES } from '../content/flavor/headlines';
import { STARTER_FOREIGN_COUNTERPARTS } from '../content/diplomacy/counterparts';
import { CRISIS_TABLE } from '../content/events/crisisTable';
import { BILL_TEMPLATES } from '../content/flavor/billTemplates';

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
  playerPartyId?: string;
  playerName?: string;
  difficulty?: Difficulty;
}

/** Assembles a fresh, fully-populated GameState from a seed and starter content. */
export function createNewGame(seed: number, options: NewGameOptions = {}): GameState {
  const rng = new SeededRng(seed);
  const country = options.country ?? STARTER_COUNTRY;
  const parties = (options.parties ?? STARTER_PARTIES).map((p) => ({
    ...p,
    factions: p.factions.map((f) => ({ ...f })),
  }));

  const politicians = generatePoliticians(parties, rng);

  const playerPartyId = options.playerPartyId ?? parties[parties.length - 1].id;
  const player = politicians.find((p) => p.partyId === playerPartyId) ?? politicians[0];
  player.isPlayer = true;
  player.name = options.playerName ?? 'Alex Varga';

  const startingEconomy: EconomyState = { ...STARTING_ECONOMY, pendingEffects: [] };

  return {
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
    foreignCounterparts: options.foreignCounterparts ?? STARTER_FOREIGN_COUNTERPARTS,
    foreignRelations: {},
    treaties: [],
    eventLog: [],
    difficulty: options.difficulty ?? 'standard',
    startingEconomy,
  };
}

const NPC_BILL_SPONSOR_CHANCE = 0.3;

/**
 * Runs one turn's worth of rule-based NPC behavior: existing NPC-sponsored
 * bills advance one stage through the pipeline (nobody else acts on them),
 * NPC members lock in clear-cut stances on whatever's now on the floor,
 * any NPC bill that reaches the floor is resolved immediately (updating
 * relationships from how the floor lined up), and — if no NPC bill is
 * currently in flight — a new one might get sponsored.
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
  bills = bills.map((bill) => {
    if (bill.status !== 'floor' || !isNpcBill(bill)) return bill;
    const result = resolveFloorVote(bill, politicians, relationships, state.favorBank, rng);
    if (player) {
      relationships = updateRelationshipsAfterVote(relationships, player.id, result.finalWhipCount);
    }
    return applyFloorVoteResult(bill, result);
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
          provisions: template.provisions,
          sponsorId: sponsor.id,
        }),
      ];
    }
  }

  return { ...state, bills, relationships };
}

/**
 * Advances the economy and every politician's multi-audience approval by
 * one turn, runs rule-based NPC legislative behavior, then rolls the
 * weighted crisis-event table against the new state. Both the economy's
 * volatility and the event chance are scaled by the game's difficulty
 * setting. Does not touch the player's own bills — call legislative
 * actions separately for those.
 */
export function advanceTurn(state: GameState): GameState {
  const settings = getDifficultySettings(state.difficulty);
  const rng = SeededRng.fromState(state.rngState);
  const economy = advanceEconomy(state.economy, rng, settings.economyVolatilityMultiplier);
  const politicians = state.politicians.map((p) => advanceApproval(p, state.voterBlocs));
  let next: GameState = { ...state, economy, politicians, turn: state.turn + 1 };

  next = runNpcTurn(next, rng);

  const eventChance = DEFAULT_EVENT_CHANCE * settings.eventChanceMultiplier;
  const eventDef = rollForEvent(CRISIS_TABLE, next, rng, eventChance);
  if (eventDef) {
    next = applyCrisisEvent(next, eventDef);
  }

  return { ...next, rngState: rng.getState() };
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
 * jumping straight there.
 */
export function applyBillOutcomeToApproval(
  state: GameState,
  sponsorId: string,
  passed: boolean
): GameState {
  const politicians = state.politicians.map((p) =>
    p.id === sponsorId ? pushApprovalEvent(p, 'public', passed ? 15 : -15, 6) : p
  );
  return { ...state, politicians };
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
  const rng = SeededRng.fromState(state.rngState);
  const actor = state.politicians.find((p) => p.id === actorId);
  if (!actor) {
    return { state, outcome: { detected: false, favorGain: 0, budgetImpact: 0 } };
  }

  const settings = getDifficultySettings(state.difficulty);
  const result = attemptCorruptionAction(
    tier,
    actor.attributes.integrity,
    investigativePressure,
    rng,
    settings.corruptionDetectionMultiplier
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

  return {
    state: { ...state, favorBank, economy, scandals, rngState: rng.getState() },
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
 * the result. The player's own party's vote share is scaled by their
 * current approval — how they governed feeds back into how their party
 * fares at the ballot box.
 */
export function runLegislativeElection(
  state: GameState,
  turnout = 500_000
): { state: GameState; outcome: ElectionOutcome } {
  const rng = SeededRng.fromState(state.rngState);
  const { legislature } = state.country;
  const player = state.politicians.find((p) => p.isPlayer);
  const momentum: Record<string, number> = player
    ? { [player.partyId]: computePartyMomentum(player.approval.public) }
    : {};
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

  return {
    state: { ...state, parties, rngState: rng.getState() },
    outcome,
  };
}
