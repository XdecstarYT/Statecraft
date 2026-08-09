import { describe, expect, it } from 'vitest';
import { buildCustomNation, distributeSeatsEvenly, validateCustomNation, type CustomNationInput } from './nationBuilder';

function baseInput(overrides: Partial<CustomNationInput> = {}): CustomNationInput {
  return {
    countryName: 'New Republic',
    regimeType: 'parliamentary',
    electoralSystem: 'FPTP',
    totalSeats: 10,
    prThreshold: 0.05,
    parties: [
      { name: 'Left Bloc', ideology: { economic: -50, social: -50 } },
      { name: 'Right Bloc', ideology: { economic: 50, social: 50 } },
    ],
    ...overrides,
  };
}

describe('distributeSeatsEvenly', () => {
  it('splits evenly when seats divide cleanly', () => {
    expect(distributeSeatsEvenly(2, 10)).toEqual([5, 5]);
  });

  it('gives the remainder to the earliest parties', () => {
    expect(distributeSeatsEvenly(3, 10)).toEqual([4, 3, 3]);
  });

  it('returns an empty array for zero parties', () => {
    expect(distributeSeatsEvenly(0, 10)).toEqual([]);
  });

  it('sums to the total seat count', () => {
    const result = distributeSeatsEvenly(7, 101);
    expect(result.reduce((a, b) => a + b, 0)).toBe(101);
  });
});

describe('validateCustomNation', () => {
  it('accepts a well-formed input', () => {
    expect(validateCustomNation(baseInput())).toEqual([]);
  });

  it('rejects an empty country name', () => {
    const errors = validateCustomNation(baseInput({ countryName: '  ' }));
    expect(errors.some((e) => e.field === 'countryName')).toBe(true);
  });

  it('rejects fewer than two parties', () => {
    const errors = validateCustomNation(baseInput({ parties: [{ name: 'Only Party', ideology: { economic: 0, social: 0 } }] }));
    expect(errors.some((e) => e.field === 'parties')).toBe(true);
  });

  it('rejects a party with no name', () => {
    const errors = validateCustomNation(
      baseInput({ parties: [{ name: '', ideology: { economic: 0, social: 0 } }, { name: 'B', ideology: { economic: 0, social: 0 } }] })
    );
    expect(errors.some((e) => e.field === 'parties')).toBe(true);
  });

  it('rejects fewer seats than parties', () => {
    const errors = validateCustomNation(baseInput({ totalSeats: 1 }));
    expect(errors.some((e) => e.field === 'totalSeats')).toBe(true);
  });

  it('rejects an absurdly large seat count', () => {
    const errors = validateCustomNation(baseInput({ totalSeats: 5000 }));
    expect(errors.some((e) => e.field === 'totalSeats')).toBe(true);
  });
});

describe('buildCustomNation', () => {
  it('produces a country with one district per seat under FPTP', () => {
    const { country } = buildCustomNation(baseInput({ totalSeats: 12 }));
    expect(country.legislature.electoralSystem).toBe('FPTP');
    expect(country.legislature.districts.length).toBe(12);
    expect(country.legislature.totalSeats).toBe(12);
  });

  it('produces no districts under PR', () => {
    const { country } = buildCustomNation(baseInput({ electoralSystem: 'PR_DHONDT', totalSeats: 40 }));
    expect(country.legislature.districts.length).toBe(0);
    expect(country.legislature.totalSeats).toBe(40);
  });

  it('distributes seats across parties summing to the total', () => {
    const { parties } = buildCustomNation(baseInput({ totalSeats: 11 }));
    expect(parties.reduce((sum, p) => sum + p.seats, 0)).toBe(11);
  });

  it('clamps ideology into [-100, 100]', () => {
    const { parties } = buildCustomNation(
      baseInput({ parties: [{ name: 'A', ideology: { economic: 500, social: -500 } }, { name: 'B', ideology: { economic: 0, social: 0 } }] })
    );
    expect(parties[0].ideology.economic).toBe(100);
    expect(parties[0].ideology.social).toBe(-100);
  });

  it('generates a stable, unique-looking country id from the name', () => {
    const { country } = buildCustomNation(baseInput({ countryName: "Ranovia's Union" }));
    expect(country.id).toMatch(/^custom-[a-z0-9-]+$/);
  });

  it('never produces fewer seats than parties, even if totalSeats is too low', () => {
    const { country, parties } = buildCustomNation(baseInput({ totalSeats: 1 }));
    expect(country.legislature.totalSeats).toBeGreaterThanOrEqual(parties.length);
    expect(parties.every((p) => p.seats >= 1)).toBe(true);
  });
});
