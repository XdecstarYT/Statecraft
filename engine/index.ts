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
  MilitaryProfile,
  Party,
  Politician,
  ScandalResponse,
  VoterBloc,
} from './models/types';
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
  MAX_FAVORS,
  advanceToCommittee,
  advanceToFloor,
  applyFloorVoteResult,
  computeBillEconomyEffect,
  proposeBill,
  resolveFloorVote,
} from './systems/legislative';
import { attemptCorruptionAction, computeScandalSeverity } from './systems/corruption';
import { attemptPressInterview, attemptRally, type CampaignActionOutcome } from './systems/campaign';
import { rollForEvent, applyCrisisEvent, DEFAULT_EVENT_CHANCE } from './systems/events';
import { adjustRelation } from './systems/diplomacy';
import {
  applyWarAttrition,
  computeEffectiveStrength,
  computeWarResolutionRelationDelta,
  resolveWarTurn,
} from './systems/military';
import { computeCabinetEffects } from './systems/cabinet';
import {
  computeVictoryMarginFraction,
  concludeElectionNight as concludeElectionNightState,
  reportNextProvince,
  startElectionNight,
} from './systems/electionNight';
import {
  applyNpcStances,
  computeAllPartyMomentum,
  decideNpcScandalResponse,
  selectNpcBillSponsor,
  selectNpcBillTemplate,
  selectNpcCampaigner,
  selectNpcCorruptionTier,
  updateRelationshipsAfterVote,
} from './systems/npc';
import { clampAxis } from './ideology';
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

/** A 4-year term at 48 weeks/year (see calendar.ts's WEEKS_PER_YEAR) — purely advisory, nothing auto-fires when it's reached. */
export const TERM_LENGTH_TURNS = WEEKS_PER_YEAR * 4;

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
    foreignCounterparts: options.foreignCounterparts ?? nationsExcluding(country.id),
    foreignRelations: {},
    playerMilitary: options.playerMilitary ?? startingMilitaryProfile(country.id),
    treaties: [],
    tradeDeals: [],
    wars: [],
    electionNight: null,
    nextElectionTurn: 1 + TERM_LENGTH_TURNS,
    cabinet: [],
    eventLog: [],
    difficulty: options.difficulty ?? 'standard',
    startingEconomy,
  };
}

const NPC_BILL_SPONSOR_CHANCE = 0.3;
const NPC_CAMPAIGN_CHANCE = 0.35;
const NPC_CORRUPTION_CHANCE = 0.2;

/**
 * Runs one turn's worth of rule-based NPC behavior: existing NPC-sponsored
 * bills advance one stage through the pipeline (nobody else acts on them),
 * NPC members lock in clear-cut stances on whatever's now on the floor,
 * any NPC bill that reaches the floor is resolved immediately (updating
 * relationships from how the floor lined up), a new bill might get
 * sponsored if none is in flight, a rival might front a press interview
 * or rally of their own, and a less scrupulous rival might risk a corrupt
 * act — resolved (and, if exposed, responded to) entirely on their own,
 * never as a player-facing choice.
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
  bills = bills.map((bill) => {
    if (bill.status !== 'floor' || !isNpcBill(bill)) return bill;
    const result = resolveFloorVote(bill, politicians, relationships, state.favorBank, rng);
    if (player) {
      relationships = updateRelationshipsAfterVote(relationships, player.id, result.finalWhipCount);
    }
    const resolvedBill = applyFloorVoteResult(bill, result);
    if (resolvedBill.status === 'passed') {
      economy = enactPassedBill({ ...state, economy }, resolvedBill).economy;
    }
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
          provisions: template.provisions,
          sponsorId: sponsor.id,
        }),
      ];
    }
  }

  let nextPoliticians = politicians;
  let favorBank = state.favorBank;
  let scandals = state.scandals;

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

  if (rng.next() < NPC_CORRUPTION_CHANCE) {
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

  return { ...state, bills, relationships, economy, politicians: nextPoliticians, favorBank, scandals };
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
  const cabinetEffects = computeCabinetEffects(state.cabinet, state.politicians);
  const rng = SeededRng.fromState(state.rngState);
  const economy = advanceEconomy(
    state.economy,
    rng,
    settings.economyVolatilityMultiplier * cabinetEffects.economyVolatilityMultiplier
  );
  const politicians = state.politicians.map((p) => advanceApproval(p, state.voterBlocs));
  let next: GameState = { ...state, economy, politicians, turn: state.turn + 1 };

  next = runNpcTurn(next, rng);
  next = runWarTurns(next, rng);

  const eventChance = DEFAULT_EVENT_CHANCE * settings.eventChanceMultiplier;
  const eventDef = rollForEvent(CRISIS_TABLE, next, rng, eventChance);
  if (eventDef) {
    next = applyCrisisEvent(next, eventDef);
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

const BILL_ENACTMENT_DELAY_TURNS = 3;

/**
 * A passed bill is a law, and a law has real consequences: queues the
 * bill's net fiscal direction as a delayed economy effect (same lag
 * mechanism as any other policy) rather than leaving it as a cosmetic
 * number. A no-op for anything that isn't 'passed'.
 */
export function enactPassedBill(state: GameState, bill: Bill): GameState {
  if (bill.status !== 'passed') return state;
  const effect = computeBillEconomyEffect(bill);
  return { ...state, economy: queuePolicyEffect(state.economy, effect, BILL_ENACTMENT_DELAY_TURNS) };
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
 * the result. Every party's vote share is scaled by its own momentum —
 * the average public approval of its sitting members — so how each party
 * (not just the player's) governed feeds back into how it fares at the
 * ballot box.
 */
export function runLegislativeElection(
  state: GameState,
  turnout = 500_000
): { state: GameState; outcome: ElectionOutcome } {
  const rng = SeededRng.fromState(state.rngState);
  const { legislature } = state.country;
  const momentum = computeAllPartyMomentum(state.politicians, state.parties);
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
    state: { ...state, parties, nextElectionTurn: state.turn + TERM_LENGTH_TURNS, rngState: rng.getState() },
    outcome,
  };
}

/**
 * Starts a live, province-by-province election night instead of the
 * instant runLegislativeElection above — same underlying vote generation
 * and momentum, but revealed progressively via reportNextProvinceAction.
 */
export function beginElectionNight(state: GameState, turnout = 500_000): GameState {
  const rng = SeededRng.fromState(state.rngState);
  const momentum = computeAllPartyMomentum(state.politicians, state.parties);
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

  return {
    ...state,
    parties,
    electionNight,
    nextElectionTurn: state.turn + TERM_LENGTH_TURNS,
    rngState: rng.getState(),
  };
}

/** Dismisses a concluded election night, returning to normal play. A no-op unless it's actually concluded. */
export function dismissElectionNight(state: GameState): GameState {
  if (!state.electionNight || state.electionNight.status !== 'concluded') return state;
  return { ...state, electionNight: null };
}
