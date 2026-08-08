import { SeededRng } from './rng';
import type {
  Country,
  EconomyState,
  ElectoralSystem,
  GameState,
  Party,
  Politician,
} from './models/types';
import { advanceEconomy } from './systems/economy';
import {
  allocateSeatsDHondt,
  generateDistrictVotes,
  generateNationalVotes,
  resolveFPTPElection,
  type DistrictResult,
  type PartyVoteShare,
} from './systems/elections';
import { STARTER_COUNTRY, STARTER_PARTIES } from '../content/countries/starter';
import { generateName } from '../content/names/pool';

export * from './rng';
export * from './models/types';
export * from './systems/legislative';
export * from './systems/elections';
export * from './systems/economy';

function clampAxis(value: number): number {
  return Math.max(-100, Math.min(100, value));
}

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
      });
    }
  }
  return politicians;
}

export interface NewGameOptions {
  country?: Country;
  parties?: Party[];
  playerPartyId?: string;
  playerName?: string;
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

  return {
    seed,
    rngState: rng.getState(),
    turn: 1,
    country,
    politicians,
    parties,
    bills: [],
    economy: { ...STARTING_ECONOMY, pendingEffects: [] },
    relationships: {},
    favorBank: {},
  };
}

/** Advances the economy by one turn. Does not touch bills — call legislative actions separately. */
export function advanceTurn(state: GameState): GameState {
  const rng = SeededRng.fromState(state.rngState);
  const economy = advanceEconomy(state.economy, rng);
  return { ...state, economy, turn: state.turn + 1, rngState: rng.getState() };
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
 * the result.
 */
export function runLegislativeElection(
  state: GameState,
  turnout = 500_000
): { state: GameState; outcome: ElectionOutcome } {
  const rng = SeededRng.fromState(state.rngState);
  const { legislature } = state.country;
  let outcome: ElectionOutcome;

  if (legislature.electoralSystem === 'FPTP') {
    const perDistrictTurnout = Math.round(turnout / legislature.districts.length);
    const districtResults = legislature.districts.map((district) =>
      generateDistrictVotes(district, state.parties, perDistrictTurnout, rng)
    );
    const seatsWon = resolveFPTPElection(districtResults);
    outcome = { system: 'FPTP', seatsWon, districtResults };
  } else {
    const nationalVotes = generateNationalVotes(state.parties, turnout, rng);
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
