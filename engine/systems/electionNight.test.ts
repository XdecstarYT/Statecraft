import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { Country, Party } from '../models/types';
import {
  computeRunningTally,
  computeVictoryMarginFraction,
  concludeElectionNight,
  getProvinces,
  reportNextProvince,
  startElectionNight,
} from './electionNight';

const FPTP_DISTRICTS = Array.from({ length: 12 }, (_, i) => ({ id: `d${i + 1}`, name: `District ${i + 1}` }));

const FPTP_COUNTRY: Country = {
  id: 'testland',
  name: 'Testland',
  regimeType: 'parliamentary',
  legislature: {
    name: 'Assembly',
    electoralSystem: 'FPTP',
    districts: FPTP_DISTRICTS,
    totalSeats: FPTP_DISTRICTS.length,
    prThreshold: 0.05,
  },
};

const PR_COUNTRY: Country = {
  id: 'prland',
  name: 'PRland',
  regimeType: 'parliamentary',
  legislature: {
    name: 'Assembly',
    electoralSystem: 'PR_DHONDT',
    districts: [],
    totalSeats: 30,
    prThreshold: 0.04,
  },
};

const PARTIES: Party[] = [
  { id: 'party-a', name: 'Party A', ideology: { economic: 40, social: 20 }, seats: 8, factions: [] },
  { id: 'party-b', name: 'Party B', ideology: { economic: -40, social: -20 }, seats: 4, factions: [] },
];

function drive(country: Country, parties: Party[], seed: number) {
  const rng = new SeededRng(seed);
  let night = startElectionNight(country, parties, 100_000, rng);
  for (let i = 0; i < night.reportingOrder.length; i++) {
    night = reportNextProvince(night, country, parties);
  }
  return night;
}

describe('getProvinces', () => {
  it('auto-generates provinces from districts for an FPTP country with none defined', () => {
    const provinces = getProvinces(FPTP_COUNTRY);
    expect(provinces.length).toBeGreaterThan(0);
    const allDistrictIds = provinces.flatMap((p) => p.districtIds);
    expect(new Set(allDistrictIds).size).toBe(FPTP_DISTRICTS.length);
  });

  it('auto-generates a fixed set of reporting regions for a PR country with none defined', () => {
    const provinces = getProvinces(PR_COUNTRY);
    expect(provinces.length).toBeGreaterThan(0);
    expect(provinces.every((p) => p.districtIds.length === 0)).toBe(true);
  });

  it('uses hand-authored provinces when the country defines them', () => {
    const withProvinces: Country = {
      ...FPTP_COUNTRY,
      legislature: {
        ...FPTP_COUNTRY.legislature,
        provinces: [{ id: 'p1', name: 'Real Province', districtIds: ['d1'], weight: 1 }],
      },
    };
    expect(getProvinces(withProvinces)).toEqual(withProvinces.legislature.provinces);
  });
});

describe('startElectionNight', () => {
  it('starts in "reporting" with nothing reported yet', () => {
    const night = startElectionNight(FPTP_COUNTRY, PARTIES, 100_000, new SeededRng(1));
    expect(night.status).toBe('reporting');
    expect(night.reportedProvinceIds).toHaveLength(0);
    expect(night.reportingOrder.length).toBeGreaterThan(0);
  });

  it('precomputes full FPTP district results up front', () => {
    const night = startElectionNight(FPTP_COUNTRY, PARTIES, 100_000, new SeededRng(1));
    expect(night.districtResults).toHaveLength(FPTP_DISTRICTS.length);
  });

  it('precomputes per-province vote samples for a PR country', () => {
    const night = startElectionNight(PR_COUNTRY, PARTIES, 100_000, new SeededRng(1));
    const provinces = getProvinces(PR_COUNTRY);
    expect(Object.keys(night.provinceVotes)).toHaveLength(provinces.length);
  });

  it('is deterministic for the same rng seed', () => {
    const a = startElectionNight(FPTP_COUNTRY, PARTIES, 100_000, new SeededRng(7));
    const b = startElectionNight(FPTP_COUNTRY, PARTIES, 100_000, new SeededRng(7));
    expect(a).toEqual(b);
  });
});

describe('reportNextProvince', () => {
  it('reveals provinces one at a time', () => {
    let night = startElectionNight(FPTP_COUNTRY, PARTIES, 100_000, new SeededRng(1));
    const total = night.reportingOrder.length;
    night = reportNextProvince(night, FPTP_COUNTRY, PARTIES);
    expect(night.reportedProvinceIds).toHaveLength(1);
    expect(night.status).toBe(total === 1 ? 'called' : 'reporting');
  });

  it('calls the race once every province has reported (FPTP)', () => {
    const night = drive(FPTP_COUNTRY, PARTIES, 3);
    expect(night.status).toBe('called');
    expect(night.finalSeats).toBeDefined();
    expect(Object.values(night.finalSeats!).reduce((a, b) => a + b, 0)).toBe(FPTP_DISTRICTS.length);
    expect(night.winnerPartyId).toBeDefined();
  });

  it('calls the race once every province has reported (PR)', () => {
    const night = drive(PR_COUNTRY, PARTIES, 3);
    expect(night.status).toBe('called');
    expect(Object.values(night.finalSeats!).reduce((a, b) => a + b, 0)).toBe(PR_COUNTRY.legislature.totalSeats);
  });

  it('is a no-op once the race has already been called', () => {
    const night = drive(FPTP_COUNTRY, PARTIES, 3);
    expect(reportNextProvince(night, FPTP_COUNTRY, PARTIES)).toEqual(night);
  });
});

describe('computeRunningTally', () => {
  it('grows as more provinces report (FPTP)', () => {
    let night = startElectionNight(FPTP_COUNTRY, PARTIES, 100_000, new SeededRng(5));
    const provinces = getProvinces(FPTP_COUNTRY);
    const tallies: number[] = [];
    while (night.status === 'reporting') {
      night = reportNextProvince(night, FPTP_COUNTRY, PARTIES);
      const tally = computeRunningTally(night, provinces);
      tallies.push(Object.values(tally).reduce((a, b) => a + b, 0));
    }
    for (let i = 1; i < tallies.length; i++) {
      expect(tallies[i]).toBeGreaterThanOrEqual(tallies[i - 1]);
    }
    expect(tallies[tallies.length - 1]).toBe(FPTP_DISTRICTS.length);
  });

  it('returns the final seats once called', () => {
    const night = drive(FPTP_COUNTRY, PARTIES, 3);
    const provinces = getProvinces(FPTP_COUNTRY);
    expect(computeRunningTally(night, provinces)).toEqual(night.finalSeats);
  });
});

describe('computeVictoryMarginFraction', () => {
  it('is 0 for an exact tie', () => {
    expect(computeVictoryMarginFraction({ a: 5, b: 5 })).toBe(0);
  });

  it('is close to 1 for a near-total landslide', () => {
    expect(computeVictoryMarginFraction({ a: 29, b: 1 })).toBeGreaterThan(0.9);
  });

  it('is 0 for no seats at all', () => {
    expect(computeVictoryMarginFraction({})).toBe(0);
  });
});

describe('concludeElectionNight', () => {
  it('moves a called night to concluded with the given speech', () => {
    const night = drive(FPTP_COUNTRY, PARTIES, 3);
    const concluded = concludeElectionNight(night, 'A great victory.');
    expect(concluded.status).toBe('concluded');
    expect(concluded.victorySpeech).toBe('A great victory.');
  });

  it('is a no-op if the night has not been called yet', () => {
    const night = startElectionNight(FPTP_COUNTRY, PARTIES, 100_000, new SeededRng(1));
    expect(concludeElectionNight(night, 'Too soon')).toEqual(night);
  });
});
