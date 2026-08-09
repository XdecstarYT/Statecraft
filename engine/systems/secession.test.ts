import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { Country, EconomyState, MilitaryProfile, Party, Province, SecessionistMovement } from '../models/types';
import {
  REFERENDUM_MIN_SENTIMENT,
  advanceMovementSentiment,
  computeNationalGrievance,
  grantAutonomy,
  resolveReferendum,
  resolveSuppression,
  rollForNewMovement,
  secedeProvince,
} from './secession';

const BASE_ECONOMY: EconomyState = { gdpGrowth: 2, inflation: 3, unemployment: 5, debtToGdp: 60, budgetBalance: -2, pendingEffects: [] };

function makeMovement(overrides: Partial<SecessionistMovement> & { provinceId: string }): SecessionistMovement {
  return { provinceName: overrides.provinceId, sentiment: 50, status: 'agitating', turnStarted: 1, ...overrides };
}

function makeProvince(overrides: Partial<Province> & { id: string }): Province {
  return { name: overrides.id, districtIds: [], weight: 0.25, ...overrides };
}

describe('computeNationalGrievance', () => {
  it('is low when unemployment is low and approval is high', () => {
    const g = computeNationalGrievance({ ...BASE_ECONOMY, unemployment: 2 }, 80);
    expect(g).toBeLessThan(0.2);
  });

  it('is high when unemployment is high and approval is low', () => {
    const g = computeNationalGrievance({ ...BASE_ECONOMY, unemployment: 15 }, 10);
    expect(g).toBeGreaterThan(0.8);
  });

  it('stays within [0, 1]', () => {
    expect(computeNationalGrievance({ ...BASE_ECONOMY, unemployment: 100 }, 0)).toBeLessThanOrEqual(1);
    expect(computeNationalGrievance({ ...BASE_ECONOMY, unemployment: 0 }, 100)).toBeGreaterThanOrEqual(0);
  });
});

describe('rollForNewMovement', () => {
  const provinces = [makeProvince({ id: 'p1' }), makeProvince({ id: 'p2' })];

  it('never picks a province that already has a movement', () => {
    const existing = [makeMovement({ provinceId: 'p1' })];
    const rng = new SeededRng(1);
    for (let i = 0; i < 100; i++) {
      const result = rollForNewMovement(provinces, existing, 1, i, rng);
      if (result) expect(result.provinceId).toBe('p2');
    }
  });

  it('returns null once every province already has a movement', () => {
    const existing = provinces.map((p) => makeMovement({ provinceId: p.id }));
    expect(rollForNewMovement(provinces, existing, 1, 1, new SeededRng(1))).toBeNull();
  });

  it('spawns more often at high grievance than low grievance over many trials', () => {
    const rngHigh = new SeededRng(5);
    const rngLow = new SeededRng(5);
    let highSpawns = 0;
    let lowSpawns = 0;
    for (let i = 0; i < 200; i++) {
      if (rollForNewMovement(provinces, [], 1, i, rngHigh)) highSpawns++;
      if (rollForNewMovement(provinces, [], 0, i, rngLow)) lowSpawns++;
    }
    expect(highSpawns).toBeGreaterThan(lowSpawns);
  });
});

describe('advanceMovementSentiment', () => {
  it('rises toward high grievance', () => {
    const movement = makeMovement({ provinceId: 'p1', sentiment: 20 });
    const next = advanceMovementSentiment(movement, 1);
    expect(next.sentiment).toBeGreaterThan(20);
  });

  it('falls toward low grievance', () => {
    const movement = makeMovement({ provinceId: 'p1', sentiment: 80 });
    const next = advanceMovementSentiment(movement, 0);
    expect(next.sentiment).toBeLessThan(80);
  });

  it('leaves a non-agitating movement untouched', () => {
    const movement = makeMovement({ provinceId: 'p1', sentiment: 80, status: 'suppressed' });
    const next = advanceMovementSentiment(movement, 1);
    expect(next.sentiment).toBe(80);
  });
});

describe('resolveReferendum', () => {
  it('is deterministic for a given rng state', () => {
    const movement = makeMovement({ provinceId: 'p1', sentiment: REFERENDUM_MIN_SENTIMENT });
    const a = resolveReferendum(movement, new SeededRng(3));
    const b = resolveReferendum(movement, new SeededRng(3));
    expect(a).toEqual(b);
  });

  it('a movement with near-zero sentiment almost never passes', () => {
    const movement = makeMovement({ provinceId: 'p1', sentiment: 5 });
    const rng = new SeededRng(1);
    let passes = 0;
    for (let i = 0; i < 100; i++) if (resolveReferendum(movement, rng).passed) passes++;
    expect(passes).toBeLessThan(10);
  });

  it('a movement with near-maximum sentiment almost always passes', () => {
    const movement = makeMovement({ provinceId: 'p1', sentiment: 95 });
    const rng = new SeededRng(1);
    let passes = 0;
    for (let i = 0; i < 100; i++) if (resolveReferendum(movement, rng).passed) passes++;
    expect(passes).toBeGreaterThan(90);
  });
});

describe('grantAutonomy', () => {
  it('reduces sentiment by a real, fixed amount', () => {
    const movement = makeMovement({ provinceId: 'p1', sentiment: 70 });
    expect(grantAutonomy(movement).sentiment).toBe(40);
  });

  it('never goes below 0', () => {
    const movement = makeMovement({ provinceId: 'p1', sentiment: 10 });
    expect(grantAutonomy(movement).sentiment).toBe(0);
  });
});

describe('resolveSuppression', () => {
  const weakMilitary: MilitaryProfile = { strength: 5, personnel: 10, techLevel: 5 };
  const strongMilitary: MilitaryProfile = { strength: 95, personnel: 5000, techLevel: 95 };

  it('a strong military crushes a low-sentiment movement far more often than a weak one', () => {
    const movement = makeMovement({ provinceId: 'p1', sentiment: 30 });
    const rngStrong = new SeededRng(1);
    const rngWeak = new SeededRng(1);
    let strongWins = 0;
    let weakWins = 0;
    for (let i = 0; i < 100; i++) {
      if (resolveSuppression(movement, strongMilitary, rngStrong).success) strongWins++;
      if (resolveSuppression(movement, weakMilitary, rngWeak).success) weakWins++;
    }
    expect(strongWins).toBeGreaterThan(weakWins);
  });

  it('a failed suppression marks the movement independent', () => {
    const movement = makeMovement({ provinceId: 'p1', sentiment: 100 });
    const rng = new SeededRng(1);
    let sawFailure = false;
    for (let i = 0; i < 100 && !sawFailure; i++) {
      const result = resolveSuppression(movement, weakMilitary, rng);
      if (!result.success) {
        expect(result.movement.status).toBe('independent');
        sawFailure = true;
      }
    }
    expect(sawFailure).toBe(true);
  });

  it('a successful suppression marks the movement suppressed and cools sentiment', () => {
    const movement = makeMovement({ provinceId: 'p1', sentiment: 30 });
    const rng = new SeededRng(1);
    let sawSuccess = false;
    for (let i = 0; i < 100 && !sawSuccess; i++) {
      const result = resolveSuppression(movement, strongMilitary, rng);
      if (result.success) {
        expect(result.movement.status).toBe('suppressed');
        expect(result.movement.sentiment).toBeLessThan(30);
        sawSuccess = true;
      }
    }
    expect(sawSuccess).toBe(true);
  });
});

describe('secedeProvince', () => {
  const country: Country = {
    id: 'test-country',
    name: 'Testland',
    regimeType: 'parliamentary',
    legislature: {
      name: 'Assembly',
      electoralSystem: 'FPTP',
      districts: [
        { id: 'd1', name: 'D1' },
        { id: 'd2', name: 'D2' },
        { id: 'd3', name: 'D3' },
        { id: 'd4', name: 'D4' },
      ],
      totalSeats: 4,
      prThreshold: 0,
    },
  };
  const parties: Party[] = [
    { id: 'a', name: 'A', ideology: { economic: 0, social: 0 }, seats: 2, factions: [] },
    { id: 'b', name: 'B', ideology: { economic: 0, social: 0 }, seats: 2, factions: [] },
  ];
  const province: Province = { id: 'p1', name: 'Province One', districtIds: ['d1', 'd2'], weight: 0.5 };

  it('removes the province districts and shrinks totalSeats', () => {
    const { country: updated } = secedeProvince(country, parties, province);
    expect(updated.legislature.districts.map((d) => d.id)).toEqual(['d3', 'd4']);
    expect(updated.legislature.totalSeats).toBe(2);
  });

  it('shrinks each party proportionally to its seat share', () => {
    const { parties: updated } = secedeProvince(country, parties, province);
    expect(updated.find((p) => p.id === 'a')!.seats).toBe(1);
    expect(updated.find((p) => p.id === 'b')!.seats).toBe(1);
  });

  it('never leaves negative seats', () => {
    const smallParty: Party[] = [{ id: 'c', name: 'C', ideology: { economic: 0, social: 0 }, seats: 0, factions: [] }];
    const { parties: updated } = secedeProvince(country, smallParty, province);
    expect(updated[0].seats).toBeGreaterThanOrEqual(0);
  });
});
