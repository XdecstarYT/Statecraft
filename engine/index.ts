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
  ScandalResponse,
  SecessionistMovement,
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
  DEFAULT_WHIP_WEIGHTS,
  MAX_FAVORS,
  advanceToCommittee,
  advanceToFloor,
  applyFloorVoteResult,
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
import { formGovernment, hasOutrightMajority } from './systems/coalition';
import type { CareerGraduationPayload } from './systems/career';
import { foundParty, type FoundPartyResult } from './systems/partyManagement';
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
  getProvinces,
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
  interestGroups?: InterestGroup[];
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

  const startingEconomy: EconomyState = { ...STARTING_ECONOMY, pendingEffects: [] };

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
    foreignCounterparts: options.foreignCounterparts ?? nationsExcluding(country.id),
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
function resolveGovernment(state: GameState, rng: SeededRng): GameState {
  if (hasOutrightMajority(state.parties)) {
    return { ...state, coalition: null, rngState: rng.getState() };
  }

  const coalition = formGovernment(
    state.parties,
    state.politicians,
    state.partyLeaderId,
    state.relationships,
    state.turn,
    rng
  );

  if (coalition.status === 'collapsed') {
    return {
      ...state,
      coalition,
      economy: applyImmediateEffect(state.economy, COALITION_COLLAPSE_ECONOMY_EFFECT),
      nextElectionTurn: state.turn,
      rngState: rng.getState(),
    };
  }

  return { ...state, coalition, rngState: rng.getState() };
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
  let interestGroups = state.interestGroups;
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
      economy = enactPassedBill({ ...state, economy }, resolvedBill).economy;
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

  return {
    ...state,
    bills,
    relationships,
    economy,
    politicians: nextPoliticians,
    favorBank,
    scandals,
    interestGroups,
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
  const grievance = computeNationalGrievance(state.economy, player?.approval.public ?? 50);

  const secessionistMovements = state.secessionistMovements.map((m) => advanceMovementSentiment(m, grievance));

  const provinces = getProvinces(state.country);
  const newMovement = rollForNewMovement(provinces, secessionistMovements, grievance, state.turn, rng);

  return {
    ...state,
    secessionistMovements: newMovement ? [...secessionistMovements, newMovement] : secessionistMovements,
  };
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
    state: {
      ...state,
      politicians: result.updatedPoliticians,
      parties: result.updatedParties,
      partyLeaderId,
      rngState: rng.getState(),
    },
    result,
  };
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
    state: replaceMovement({ ...state, politicians, rngState: rng.getState() }, provinceId, result.movement),
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
