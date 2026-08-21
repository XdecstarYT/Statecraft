import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { Donor, PoliticianAttributes } from '../models/types';
import {
  acceptDarkMoneyOffer,
  applyCourtDonorOutcome,
  computeAdBlitzImpact,
  computeDonorAlignment,
  courtDonor,
  decayDonorDispositions,
  runAdBlitz,
  solicitDonation,
} from './campaignFinance';

function makeDonor(overrides: Partial<Donor> = {}): Donor {
  return {
    id: 'donor-1',
    name: 'Test Donor',
    type: 'individual',
    ideology: { economic: 50, social: 0 },
    wealth: 60,
    disposition: 0,
    ...overrides,
  };
}

const STRONG_ATTRS: PoliticianAttributes = { charisma: 10, intellect: 5, integrity: 5, network: 10, mediaSavvy: 5 };
const WEAK_ATTRS: PoliticianAttributes = { charisma: 1, intellect: 5, integrity: 5, network: 1, mediaSavvy: 5 };

describe('computeDonorAlignment', () => {
  it('is higher for an ideologically closer donor', () => {
    const close = makeDonor({ ideology: { economic: 10, social: 0 } });
    const far = makeDonor({ ideology: { economic: -90, social: -90 } });
    const subject = { economic: 0, social: 0 };
    expect(computeDonorAlignment(close, subject)).toBeGreaterThan(computeDonorAlignment(far, subject));
  });
});

describe('courtDonor', () => {
  it('is deterministic for a given rng state', () => {
    const donor = makeDonor();
    const a = courtDonor(donor, STRONG_ATTRS, new SeededRng(4));
    const b = courtDonor(donor, STRONG_ATTRS, new SeededRng(4));
    expect(a).toEqual(b);
  });

  it('a well-networked player succeeds far more often than a weak one over many trials', () => {
    const donor = makeDonor();
    const rngStrong = new SeededRng(3);
    const rngWeak = new SeededRng(3);
    let strongWins = 0;
    let weakWins = 0;
    for (let i = 0; i < 100; i++) {
      if (courtDonor(donor, STRONG_ATTRS, rngStrong).success) strongWins++;
      if (courtDonor(donor, WEAK_ATTRS, rngWeak).success) weakWins++;
    }
    expect(strongWins).toBeGreaterThan(weakWins);
  });

  it('applyCourtDonorOutcome clamps disposition to [-100, 100]', () => {
    const donor = makeDonor({ disposition: 95 });
    const after = applyCourtDonorOutcome(donor, { success: true, dispositionDelta: 20 });
    expect(after.disposition).toBeLessThanOrEqual(100);
  });
});

describe('decayDonorDispositions', () => {
  it('decays every donor toward zero', () => {
    const donors = [makeDonor({ disposition: 50 }), makeDonor({ id: 'donor-2', disposition: -50 })];
    const after = decayDonorDispositions(donors);
    expect(after[0].disposition).toBeLessThan(50);
    expect(after[1].disposition).toBeGreaterThan(-50);
  });
});

describe('solicitDonation', () => {
  it('gives nothing when disposition is too low', () => {
    const donor = makeDonor({ disposition: 0 });
    const outcome = solicitDonation(donor, { economic: 50, social: 0 }, new SeededRng(1));
    expect(outcome.amount).toBe(0);
  });

  it('a warm, aligned, wealthy donor gives more than a lukewarm one', () => {
    const warm = makeDonor({ disposition: 90, wealth: 90 });
    const lukewarm = makeDonor({ disposition: 15, wealth: 90 });
    const subject = { economic: 50, social: 0 };
    const rngA = new SeededRng(1);
    const rngB = new SeededRng(1);
    let warmTotal = 0;
    let lukewarmTotal = 0;
    for (let i = 0; i < 20; i++) {
      warmTotal += solicitDonation(warm, subject, rngA).amount;
      lukewarmTotal += solicitDonation(lukewarm, subject, rngB).amount;
    }
    expect(warmTotal).toBeGreaterThan(lukewarmTotal);
  });

  it('is deterministic for a given rng state', () => {
    const donor = makeDonor({ disposition: 60 });
    const subject = { economic: 50, social: 0 };
    const a = solicitDonation(donor, subject, new SeededRng(7));
    const b = solicitDonation(donor, subject, new SeededRng(7));
    expect(a).toEqual(b);
  });
});

describe('acceptDarkMoneyOffer', () => {
  it('returns null when disposition is below the trust threshold', () => {
    const donor = makeDonor({ disposition: 40 });
    expect(acceptDarkMoneyOffer(donor, { economic: 50, social: 0 }, 5, 0, new SeededRng(1))).toBeNull();
  });

  it('offers a substantially larger amount than a disclosed solicitation', () => {
    const donor = makeDonor({ disposition: 90, wealth: 60 });
    const subject = { economic: 50, social: 0 };
    const dark = acceptDarkMoneyOffer(donor, subject, 5, 0, new SeededRng(2));
    const disclosed = solicitDonation(donor, subject, new SeededRng(2));
    expect(dark).not.toBeNull();
    expect(dark!.amount).toBeGreaterThan(disclosed.amount);
  });

  it('higher investigative pressure and lower integrity raise detection risk', () => {
    const donor = makeDonor({ disposition: 90 });
    const subject = { economic: 50, social: 0 };
    let lowRiskDetections = 0;
    let highRiskDetections = 0;
    const rngLow = new SeededRng(11);
    const rngHigh = new SeededRng(11);
    for (let i = 0; i < 100; i++) {
      if (acceptDarkMoneyOffer(donor, subject, 10, 0, rngLow)?.detected) lowRiskDetections++;
      if (acceptDarkMoneyOffer(donor, subject, 1, 1, rngHigh)?.detected) highRiskDetections++;
    }
    expect(highRiskDetections).toBeGreaterThan(lowRiskDetections);
  });

  it('is deterministic for a given rng state', () => {
    const donor = makeDonor({ disposition: 90 });
    const subject = { economic: 50, social: 0 };
    const a = acceptDarkMoneyOffer(donor, subject, 5, 0.5, new SeededRng(9));
    const b = acceptDarkMoneyOffer(donor, subject, 5, 0.5, new SeededRng(9));
    expect(a).toEqual(b);
  });
});

describe('computeAdBlitzImpact / runAdBlitz', () => {
  it('is zero for zero spend', () => {
    expect(computeAdBlitzImpact(0)).toBe(0);
  });

  it('shows diminishing returns: doubling spend less than doubles impact', () => {
    const base = computeAdBlitzImpact(500);
    const doubled = computeAdBlitzImpact(1000);
    expect(doubled).toBeGreaterThan(base);
    expect(doubled).toBeLessThan(base * 2);
  });

  it('caps at AD_BLITZ_MAX_IMPACT for very large spends', () => {
    expect(computeAdBlitzImpact(1_000_000)).toBeLessThanOrEqual(18);
  });

  it('runAdBlitz never spends more than available funds', () => {
    const { fundsSpent } = runAdBlitz(100, 500);
    expect(fundsSpent).toBe(100);
  });

  it('runAdBlitz approval impact matches computeAdBlitzImpact for the actual spend', () => {
    const { fundsSpent, approvalImpact } = runAdBlitz(1000, 300);
    expect(approvalImpact).toBe(computeAdBlitzImpact(fundsSpent));
  });
});
