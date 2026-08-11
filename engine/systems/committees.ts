import type { SeededRng } from '../rng';
import type { Bill, BillCategory, Committee, CommitteeVoteResult, Party, Politician } from '../models/types';
import {
  DEFAULT_WHIP_WEIGHTS,
  MAX_FAVORS,
  computeSupportProbability,
  relationshipKey,
  resolveVote,
  type WhipWeights,
} from './legislative';

/** One standing committee per major bill category — real jurisdiction a bill's category routes it to, not a cosmetic label. */
export const STANDING_COMMITTEE_DEFS: { id: string; name: string; areas: BillCategory[] }[] = [
  { id: 'ways-and-means', name: 'Ways & Means Committee', areas: ['economic'] },
  { id: 'health', name: 'Health Committee', areas: ['healthcare'] },
  { id: 'education', name: 'Education Committee', areas: ['education'] },
  { id: 'welfare', name: 'Welfare Committee', areas: ['welfare'] },
  { id: 'armed-services', name: 'Armed Services Committee', areas: ['defense'] },
  { id: 'environment', name: 'Environment Committee', areas: ['environment'] },
  { id: 'judiciary', name: 'Judiciary Committee', areas: ['justice_safety'] },
  { id: 'infrastructure', name: 'Infrastructure Committee', areas: ['infrastructure'] },
  { id: 'science-technology', name: 'Science & Technology Committee', areas: ['research_technology'] },
];

/** Fraction of the full chamber each committee seats, subject to MIN_COMMITTEE_SIZE. */
const COMMITTEE_SIZE_FRACTION = 0.25;
const MIN_COMMITTEE_SIZE = 5;

function seededShuffle<T>(items: T[], rng: SeededRng): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Allocates `total` seats across parties proportional to seat share, via
 * largest-remainder rounding so the allocation always sums to exactly
 * `total` — the same integer-apportionment shape the engine already uses
 * for PR seat math, just applied to committee seats instead of
 * legislative ones.
 */
function apportionByPartyShare(parties: Party[], total: number): Record<string, number> {
  const totalSeats = parties.reduce((sum, p) => sum + Math.max(0, p.seats), 0);
  const allocation: Record<string, number> = {};
  if (totalSeats <= 0 || total <= 0) {
    for (const p of parties) allocation[p.id] = 0;
    return allocation;
  }
  const raw = parties.map((p) => ({ id: p.id, exact: (Math.max(0, p.seats) / totalSeats) * total }));
  let allocated = 0;
  for (const r of raw) {
    allocation[r.id] = Math.floor(r.exact);
    allocated += allocation[r.id];
  }
  let remaining = total - allocated;
  const byRemainder = [...raw].sort((a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)));
  for (let i = 0; remaining > 0 && i < byRemainder.length; i++, remaining--) {
    allocation[byRemainder[i].id] += 1;
  }
  return allocation;
}

/**
 * Deterministically assigns real committee membership, proportional to
 * each party's seat share (the same convention real legislatures use),
 * via a seeded shuffle within each party for exactly which members land
 * where — the same politician can sit on multiple committees, same as
 * real legislators serving on several. The chair is drawn from whichever
 * party holds the most seats on that specific committee.
 */
export function assignCommittees(politicians: Politician[], parties: Party[], rng: SeededRng): Committee[] {
  const chamberSize = politicians.length;
  const committeeSize = Math.max(
    MIN_COMMITTEE_SIZE,
    Math.min(chamberSize, Math.round(chamberSize * COMMITTEE_SIZE_FRACTION))
  );

  return STANDING_COMMITTEE_DEFS.map((def) => {
    const allocation = apportionByPartyShare(parties, committeeSize);
    const memberIds: string[] = [];
    const countsByParty: Record<string, number> = {};
    for (const party of parties) {
      const seatsWanted = allocation[party.id] ?? 0;
      if (seatsWanted <= 0) continue;
      const partyMembers = seededShuffle(
        politicians.filter((p) => p.partyId === party.id),
        rng
      );
      const picked = partyMembers.slice(0, seatsWanted);
      memberIds.push(...picked.map((p) => p.id));
      countsByParty[party.id] = picked.length;
    }
    // A tiny party's own roster can be smaller than its proportional
    // allocation — top up from whoever's left over so the committee still
    // reaches its intended size, still fully deterministic.
    if (memberIds.length < committeeSize) {
      const remaining = seededShuffle(
        politicians.filter((p) => !memberIds.includes(p.id)),
        rng
      );
      for (const p of remaining) {
        if (memberIds.length >= committeeSize) break;
        memberIds.push(p.id);
        countsByParty[p.partyId] = (countsByParty[p.partyId] ?? 0) + 1;
      }
    }

    const largestPartyId = Object.entries(countsByParty).sort((a, b) => b[1] - a[1])[0]?.[0];
    const chairCandidates = memberIds.filter(
      (id) => politicians.find((p) => p.id === id)?.partyId === largestPartyId
    );
    const chairId = chairCandidates[0] ?? memberIds[0];

    return { id: def.id, name: def.name, areas: def.areas, memberIds, chairId };
  });
}

/** The committee with jurisdiction over a bill's category — an absent category falls back to the same generic (Ways & Means) treatment applyBillCategoryEffect already gives uncategorized bills elsewhere. */
export function findCommitteeForBill(committees: Committee[], bill: Bill): Committee | undefined {
  const category = bill.category ?? 'economic';
  return committees.find((c) => c.areas.includes(category));
}

/**
 * Resolves a committee vote with the exact same support-probability model
 * a floor vote uses (see legislative.ts's computeSupportProbability), just
 * restricted to the committee's own membership — a real, RNG-consuming
 * vote, not a formality a bill automatically clears. The sponsor votes yes
 * automatically only if they actually sit on this committee.
 */
export function resolveCommitteeVote(
  bill: Bill,
  committee: Committee,
  politicians: Politician[],
  relationships: Record<string, number>,
  favorBank: Record<string, number>,
  rng: SeededRng,
  weights: WhipWeights = DEFAULT_WHIP_WEIGHTS,
  lobbyingPressure = 0,
  factionTerms: Record<string, number> = {}
): CommitteeVoteResult {
  const sponsor = politicians.find((p) => p.id === bill.sponsorId);
  if (!sponsor) {
    throw new Error(`Sponsor "${bill.sponsorId}" not found among politicians`);
  }
  const members = politicians.filter((p) => committee.memberIds.includes(p.id));

  let yes = 0;
  let no = 0;
  for (const member of members) {
    let vote: 'yes' | 'no';
    if (member.id === sponsor.id) {
      vote = 'yes';
    } else {
      const relationshipScore = relationships[relationshipKey(sponsor.id, member.id)] ?? 0;
      const favorBankScore = favorBank[member.id] ?? 0;
      const probability = computeSupportProbability(
        member,
        sponsor,
        relationshipScore,
        favorBankScore,
        weights,
        MAX_FAVORS,
        lobbyingPressure,
        factionTerms[member.id] ?? 0
      );
      vote = resolveVote(probability, rng);
    }
    if (vote === 'yes') yes++;
    else no++;
  }

  return { committeeId: committee.id, committeeName: committee.name, yes, no, passed: yes > no };
}

/** Advances the bill to the floor on a committee pass, or kills it in committee on a fail — the same terminal 'failed' status a lost floor vote gets. */
export function applyCommitteeVoteResult(bill: Bill, result: CommitteeVoteResult): Bill {
  return {
    ...bill,
    status: result.passed ? 'floor' : 'failed',
    committeeResult: result,
  };
}
