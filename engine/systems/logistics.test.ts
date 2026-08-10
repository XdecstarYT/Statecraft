import { describe, expect, it } from 'vitest';
import {
  LOGISTICS_INVESTMENT_TIERS,
  computeDomesticEfficiency,
  computeForeignEfficiency,
  computeShipmentEfficiency,
  investInLogistics,
  shipResource,
} from './logistics';

describe('investInLogistics', () => {
  it('major tier costs more and gains more than modest', () => {
    expect(LOGISTICS_INVESTMENT_TIERS.major.budgetCost).toBeLessThan(LOGISTICS_INVESTMENT_TIERS.modest.budgetCost);
    expect(LOGISTICS_INVESTMENT_TIERS.major.capabilityGain).toBeGreaterThan(LOGISTICS_INVESTMENT_TIERS.modest.capabilityGain);
  });

  it('raises capability and carries a real budget cost', () => {
    const { network, economyEffect } = investInLogistics({ capability: 20 }, 'modest');
    expect(network.capability).toBeGreaterThan(20);
    expect(economyEffect.budgetBalance).toBeLessThan(0);
  });

  it('caps capability at 100', () => {
    const { network } = investInLogistics({ capability: 95 }, 'major');
    expect(network.capability).toBeLessThanOrEqual(100);
  });
});

describe('computeDomesticEfficiency', () => {
  it('is at its floor at zero capability', () => {
    expect(computeDomesticEfficiency({ capability: 0 })).toBeCloseTo(0.5, 5);
  });

  it('approaches 1.0 at full capability', () => {
    expect(computeDomesticEfficiency({ capability: 100 })).toBeCloseTo(1.0, 5);
  });

  it('increases monotonically with capability', () => {
    const low = computeDomesticEfficiency({ capability: 10 });
    const high = computeDomesticEfficiency({ capability: 80 });
    expect(high).toBeGreaterThan(low);
  });
});

describe('computeForeignEfficiency', () => {
  const network = { capability: 100 };

  it('is always at or below the domestic efficiency, even at perfect relations', () => {
    const foreign = computeForeignEfficiency(network, 100, false);
    const domestic = computeDomesticEfficiency(network);
    expect(foreign).toBeLessThan(domestic);
  });

  it('is zero during an active war regardless of relations', () => {
    expect(computeForeignEfficiency(network, 100, true)).toBe(0);
  });

  it('drops with worse relations but never hits an exact zero from relations alone', () => {
    const good = computeForeignEfficiency(network, 80, false);
    const bad = computeForeignEfficiency(network, -80, false);
    expect(bad).toBeLessThan(good);
    expect(bad).toBeGreaterThan(0);
  });

  it('is worse than domestic even at zero capability', () => {
    const zeroCapNetwork = { capability: 0 };
    const foreign = computeForeignEfficiency(zeroCapNetwork, 100, false);
    const domestic = computeDomesticEfficiency(zeroCapNetwork);
    expect(foreign).toBeLessThan(domestic);
  });
});

describe('computeShipmentEfficiency', () => {
  it('routes to the domestic formula for domestic shipments', () => {
    const network = { capability: 50 };
    expect(computeShipmentEfficiency('domestic', network, -100, true)).toBe(computeDomesticEfficiency(network));
  });

  it('routes to the foreign formula for foreign shipments', () => {
    const network = { capability: 50 };
    expect(computeShipmentEfficiency('foreign', network, 50, false)).toBe(computeForeignEfficiency(network, 50, false));
  });
});

describe('shipResource', () => {
  it('scales the extracted amount by efficiency', () => {
    expect(shipResource(100, 0.75)).toBe(75);
  });

  it('yields nothing at zero efficiency', () => {
    expect(shipResource(100, 0)).toBe(0);
  });
});
