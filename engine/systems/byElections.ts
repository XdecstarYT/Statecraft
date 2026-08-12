import type { SeededRng } from '../rng';
import { clampAxis } from '../ideology';
import { generateName } from '../../content/names/pool';
import type { ByElection, Party, Politician, Scandal } from '../models/types';

/**
 * BY-ELECTIONS — the legislature isn't just a static seat count between
 * general elections: a sitting (non-player) member with an unresolved hard
 * scandal carries a real, ongoing chance of resigning their seat outright,
 * which triggers a single-seat special election rather than leaving the
 * seat magically vacant until the next full term.
 */
export const BY_ELECTION_DELAY_TURNS = 6;
const RESIGNATION_BASE_PROBABILITY = 0.04;

/**
 * 0..1 — zero unless the member has an unresolved hard-tier scandal;
 * higher-integrity members are somewhat more likely to fall on their
 * sword, same design language as cabinet.ts's collective responsibility.
 */
export function computeSeatResignationProbability(politician: Politician, scandals: Scandal[]): number {
  const hasHardUnresolved = scandals.some(
    (s) => s.politicianId === politician.id && s.tier === 'hard' && s.status === 'unresolved'
  );
  if (!hasHardUnresolved) return 0;
  return RESIGNATION_BASE_PROBABILITY + (politician.attributes.integrity / 10) * 0.06;
}

/** The player never auto-resigns their own seat — that has to be a deliberate, player-facing choice elsewhere, not a background roll. */
export function rollForSeatVacancy(politician: Politician, scandals: Scandal[], rng: SeededRng): boolean {
  if (politician.isPlayer) return false;
  const probability = computeSeatResignationProbability(politician, scandals);
  return probability > 0 && rng.next() < probability;
}

export function scheduleByElection(vacatedPartyId: string, vacatedPoliticianId: string, turn: number, id: string): ByElection {
  return {
    id,
    vacatedPartyId,
    vacatedPoliticianId,
    vacatedTurn: turn,
    resolutionTurn: turn + BY_ELECTION_DELAY_TURNS,
    resolved: false,
  };
}

/**
 * A single-seat special election awarded by relative party strength (seat
 * share) with real seeded variance — not a guaranteed hold for whichever
 * party lost the seat, same as a real by-election can go either way.
 */
export function resolveByElection(parties: Party[], rng: SeededRng): string {
  const entries = parties.filter((p) => p.seats >= 0).map((p) => ({ item: p.id, weight: Math.max(1, p.seats) }));
  if (entries.length === 0) return parties[0]?.id ?? '';
  return rng.pickWeighted(entries);
}

/** Same jittered-ideology/random-attributes generation generatePoliticians uses for a fresh legislature, just for exactly one new seat. */
export function generateReplacementPolitician(party: Party, seatLabel: string, rng: SeededRng): Politician {
  const jitter = () => (rng.next() - 0.5) * 30;
  return {
    id: `${party.id}-by-${seatLabel}`,
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
  };
}

export function applyByElectionResult(
  politicians: Politician[],
  parties: Party[],
  byElection: ByElection,
  winnerPartyId: string,
  rng: SeededRng
): { politicians: Politician[]; parties: Party[] } {
  const nextParties = parties.map((p) => (p.id === winnerPartyId ? { ...p, seats: p.seats + 1 } : p));
  const winnerParty = nextParties.find((p) => p.id === winnerPartyId);
  if (!winnerParty) return { politicians, parties: nextParties };
  const replacement = generateReplacementPolitician(winnerParty, byElection.id, rng);
  return { politicians: [...politicians, replacement], parties: nextParties };
}
