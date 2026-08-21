import { describe, expect, it } from 'vitest';
import { ALL_NATIONS } from './nations';
import { findCountryGeoId, getCountrySilhouette } from './countryGeoIds';

describe('findCountryGeoId', () => {
  it('resolves major hand-authored powers with formal constitutional names', () => {
    expect(findCountryGeoId('united-states', 'United States')).toBeDefined();
    expect(findCountryGeoId('china', "People's Republic of China")).toBeDefined();
    expect(findCountryGeoId('russia', 'Russian Federation')).toBeDefined();
    expect(findCountryGeoId('south-korea', 'Republic of Korea')).toBeDefined();
    expect(findCountryGeoId('mexico', 'United Mexican States')).toBeDefined();
  });

  it('resolves generated nations via their plain display name', () => {
    expect(findCountryGeoId('kenya', 'Kenya')).toBeDefined();
    expect(findCountryGeoId('chad', 'Chad')).toBeDefined();
  });

  it('resolves known abbreviation mismatches against world-atlas', () => {
    expect(findCountryGeoId('congo-drc', 'Democratic Republic of the Congo')).toBeDefined();
    expect(findCountryGeoId('czech-republic', 'Czech Republic')).toBeDefined();
    expect(findCountryGeoId('south-sudan', 'South Sudan')).toBeDefined();
  });

  it('returns undefined for territories genuinely absent from the low-res dataset, rather than guessing', () => {
    expect(findCountryGeoId('singapore', 'Singapore')).toBeUndefined();
    expect(findCountryGeoId('monaco', 'Monaco')).toBeUndefined();
  });

  it('resolves a large majority of the full world roster', () => {
    const resolved = ALL_NATIONS.filter((n) => findCountryGeoId(n.id, n.name) !== undefined);
    expect(resolved.length / ALL_NATIONS.length).toBeGreaterThan(0.75);
  });

  it('never maps two different nations to the same geo id', () => {
    const seen = new Map<string, string>();
    for (const nation of ALL_NATIONS) {
      const geoId = findCountryGeoId(nation.id, nation.name);
      if (!geoId) continue;
      const existing = seen.get(geoId);
      expect(existing, `${geoId} claimed by both ${existing} and ${nation.id}`).toBeUndefined();
      seen.set(geoId, nation.id);
    }
  });
});

describe('getCountrySilhouette', () => {
  it('returns a closed-ish ring normalized to a unit half-extent for a mapped country', () => {
    const ring = getCountrySilhouette('united-states', 'United States');
    expect(ring).not.toBeNull();
    expect(ring!.length).toBeGreaterThan(3);
    const maxExtent = ring!.reduce((m, p) => Math.max(m, Math.abs(p.x), Math.abs(p.z)), 0);
    expect(maxExtent).toBeCloseTo(1, 5);
  });

  it('returns null for a country with no geometry in the low-res dataset', () => {
    expect(getCountrySilhouette('singapore', 'Singapore')).toBeNull();
  });

  it('returns null for an id not present in the roster at all', () => {
    expect(getCountrySilhouette('not-a-real-country', 'Not A Real Country')).toBeNull();
  });
});
