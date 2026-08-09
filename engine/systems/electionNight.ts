import type { SeededRng } from '../rng';
import { allocateSeatsDHondt, generateDistrictVotes, resolveFPTPElection } from './elections';
import type {
  Country,
  District,
  DistrictResult,
  ElectionNightState,
  Party,
  PartyVoteShare,
  Province,
} from '../models/types';

const DEFAULT_DISTRICTS_PER_PROVINCE = 6;
const DEFAULT_PR_PROVINCE_COUNT = 6;
const AUTO_PROVINCE_NAMES = ['Northern', 'Southern', 'Eastern', 'Western', 'Central', 'Capital', 'Highland', 'Coastal'];

/**
 * Every country reports election night province-by-province. A country
 * can hand-author real provinces/states via legislature.provinces;
 * otherwise this deterministically generates a reasonable fallback from
 * its districts (FPTP, chunked into groups) or a fixed count of
 * equal-weight reporting regions (PR). This is an abstraction, not real
 * subnational boundaries — same spirit as the rest of this project's
 * generated content.
 */
export function getProvinces(country: Country): Province[] {
  if (country.legislature.provinces && country.legislature.provinces.length > 0) {
    return country.legislature.provinces;
  }

  const { districts, electoralSystem } = country.legislature;

  if (electoralSystem === 'FPTP' && districts.length > 0) {
    const provinces: Province[] = [];
    for (let i = 0; i < districts.length; i += DEFAULT_DISTRICTS_PER_PROVINCE) {
      const chunk = districts.slice(i, i + DEFAULT_DISTRICTS_PER_PROVINCE);
      const name = AUTO_PROVINCE_NAMES[provinces.length % AUTO_PROVINCE_NAMES.length];
      provinces.push({
        id: `auto-province-${provinces.length + 1}`,
        name: `${name} Province`,
        districtIds: chunk.map((d) => d.id),
        weight: chunk.length,
      });
    }
    return provinces;
  }

  return Array.from({ length: DEFAULT_PR_PROVINCE_COUNT }, (_, i) => ({
    id: `auto-province-${i + 1}`,
    name: `${AUTO_PROVINCE_NAMES[i % AUTO_PROVINCE_NAMES.length]} Province`,
    districtIds: [],
    weight: 1,
  }));
}

function summarizeProvinceVotes(provinceVotes: Record<string, PartyVoteShare[]>, parties: Party[]): PartyVoteShare[] {
  const totals: Record<string, number> = {};
  for (const votes of Object.values(provinceVotes)) {
    for (const v of votes) totals[v.partyId] = (totals[v.partyId] ?? 0) + v.votes;
  }
  return parties.map((p) => ({ partyId: p.id, votes: totals[p.id] ?? 0 }));
}

/**
 * Precomputes the full election result up front (deterministic, same rng
 * usage as the instant runLegislativeElection) but doesn't reveal any of
 * it yet — reportNextProvince peels it off province by province. Smaller
 * provinces report first (ascending weight), same as real election nights
 * tend to call rural/small regions before dense urban ones finish
 * counting.
 */
export function startElectionNight(
  country: Country,
  parties: Party[],
  turnout: number,
  rng: SeededRng,
  momentum: Record<string, number> = {}
): ElectionNightState {
  const provinces = getProvinces(country);
  const system = country.legislature.electoralSystem;
  const reportingOrder = [...provinces].sort((a, b) => a.weight - b.weight).map((p) => p.id);

  let districtResults: DistrictResult[] = [];
  const provinceVotes: Record<string, PartyVoteShare[]> = {};

  if (system === 'FPTP') {
    const perDistrictTurnout = Math.round(turnout / Math.max(1, country.legislature.districts.length));
    districtResults = country.legislature.districts.map((d) =>
      generateDistrictVotes(d, parties, perDistrictTurnout, rng, momentum)
    );
  } else {
    const totalWeight = provinces.reduce((sum, p) => sum + p.weight, 0) || 1;
    for (const province of provinces) {
      const provinceTurnout = Math.round((province.weight / totalWeight) * turnout);
      const pseudoDistrict: District = { id: province.id, name: province.name };
      const result = generateDistrictVotes(pseudoDistrict, parties, provinceTurnout, rng, momentum);
      provinceVotes[province.id] = Object.entries(result.votesByParty).map(([partyId, votes]) => ({
        partyId,
        votes,
      }));
    }
  }

  return {
    status: 'reporting',
    system,
    reportingOrder,
    reportedProvinceIds: [],
    districtResults,
    provinceVotes,
  };
}

/**
 * Reveals the next province in the reporting order. Once every province
 * has reported, calls the race: FPTP tallies the (already fully
 * generated) district winners, PR sums every province's vote sample and
 * runs D'Hondt against the country's real seat/threshold rules.
 */
export function reportNextProvince(
  electionNight: ElectionNightState,
  country: Country,
  parties: Party[]
): ElectionNightState {
  if (electionNight.status !== 'reporting') return electionNight;
  const remaining = electionNight.reportingOrder.filter((id) => !electionNight.reportedProvinceIds.includes(id));
  if (remaining.length === 0) return electionNight;

  const reportedProvinceIds = [...electionNight.reportedProvinceIds, remaining[0]];
  const allReported = reportedProvinceIds.length === electionNight.reportingOrder.length;

  if (!allReported) {
    return { ...electionNight, reportedProvinceIds };
  }

  const finalSeats =
    electionNight.system === 'FPTP'
      ? resolveFPTPElection(electionNight.districtResults)
      : allocateSeatsDHondt(
          summarizeProvinceVotes(electionNight.provinceVotes, parties),
          country.legislature.totalSeats,
          country.legislature.prThreshold
        );

  const winnerPartyId = Object.entries(finalSeats).sort((a, b) => b[1] - a[1])[0]?.[0];

  return { ...electionNight, reportedProvinceIds, status: 'called', finalSeats, winnerPartyId };
}

/**
 * The running tally so far, built only from reported provinces. For FPTP
 * this is real seats called; for PR it's cumulative votes counted (D'Hondt
 * needs the full national total, so PR seats aren't final until every
 * province has reported and status becomes 'called') — callers should
 * label the two differently.
 */
export function computeRunningTally(electionNight: ElectionNightState, provinces: Province[]): Record<string, number> {
  if (electionNight.status !== 'reporting') {
    return electionNight.finalSeats ?? {};
  }

  const reportedSet = new Set(electionNight.reportedProvinceIds);

  if (electionNight.system === 'FPTP') {
    const reportedDistrictIds = new Set(
      provinces.filter((p) => reportedSet.has(p.id)).flatMap((p) => p.districtIds)
    );
    const reportedResults = electionNight.districtResults.filter((r) => reportedDistrictIds.has(r.districtId));
    return resolveFPTPElection(reportedResults);
  }

  const totals: Record<string, number> = {};
  for (const id of reportedSet) {
    for (const v of electionNight.provinceVotes[id] ?? []) {
      totals[v.partyId] = (totals[v.partyId] ?? 0) + v.votes;
    }
  }
  return totals;
}

/** Winner's seat share minus the runner-up's, as a fraction of total seats — landslide vs. squeaker. */
export function computeVictoryMarginFraction(finalSeats: Record<string, number>): number {
  const sorted = Object.values(finalSeats).sort((a, b) => b - a);
  const total = sorted.reduce((sum, s) => sum + s, 0);
  if (total === 0 || sorted.length === 0) return 0;
  return (sorted[0] - (sorted[1] ?? 0)) / total;
}

/** Attaches the victory speech and moves the night from 'called' to 'concluded'. A no-op before the race is called. */
export function concludeElectionNight(electionNight: ElectionNightState, victorySpeech: string): ElectionNightState {
  if (electionNight.status !== 'called') return electionNight;
  return { ...electionNight, status: 'concluded', victorySpeech };
}
