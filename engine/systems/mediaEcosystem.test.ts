import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { Journalist, PoliticianAttributes } from '../models/types';
import {
  applyCourtJournalistOutcome,
  computeJournalistAlignment,
  courtJournalist,
  decayJournalistDispositions,
  driftJournalistScrutiny,
  launchDisinformationCampaign,
  rollInvestigation,
} from './mediaEcosystem';

function makeJournalist(overrides: Partial<Journalist> = {}): Journalist {
  return {
    id: 'journalist-1',
    name: 'Test Journalist',
    outletId: 'outlet-1',
    ideology: { economic: 0, social: 0 },
    credibility: 60,
    disposition: 0,
    scrutiny: 0.2,
    ...overrides,
  };
}

const STRONG_ATTRS: PoliticianAttributes = { charisma: 10, intellect: 5, integrity: 5, network: 5, mediaSavvy: 10 };
const WEAK_ATTRS: PoliticianAttributes = { charisma: 1, intellect: 5, integrity: 5, network: 5, mediaSavvy: 1 };

describe('computeJournalistAlignment', () => {
  it('is higher for an ideologically closer journalist', () => {
    const close = makeJournalist({ ideology: { economic: 5, social: 0 } });
    const far = makeJournalist({ ideology: { economic: -95, social: -95 } });
    const subject = { economic: 0, social: 0 };
    expect(computeJournalistAlignment(close, subject)).toBeGreaterThan(computeJournalistAlignment(far, subject));
  });
});

describe('courtJournalist', () => {
  it('is deterministic for a given rng state', () => {
    const journalist = makeJournalist();
    const a = courtJournalist(journalist, STRONG_ATTRS, new SeededRng(3));
    const b = courtJournalist(journalist, STRONG_ATTRS, new SeededRng(3));
    expect(a).toEqual(b);
  });

  it('a media-savvy, charismatic player succeeds far more often over many trials', () => {
    const journalist = makeJournalist();
    const rngStrong = new SeededRng(6);
    const rngWeak = new SeededRng(6);
    let strongWins = 0;
    let weakWins = 0;
    for (let i = 0; i < 100; i++) {
      if (courtJournalist(journalist, STRONG_ATTRS, rngStrong).success) strongWins++;
      if (courtJournalist(journalist, WEAK_ATTRS, rngWeak).success) weakWins++;
    }
    expect(strongWins).toBeGreaterThan(weakWins);
  });

  it('applyCourtJournalistOutcome clamps disposition to [-100, 100]', () => {
    const journalist = makeJournalist({ disposition: -95 });
    const after = applyCourtJournalistOutcome(journalist, { success: false, dispositionDelta: -10 });
    expect(after.disposition).toBeGreaterThanOrEqual(-100);
  });
});

describe('decayJournalistDispositions', () => {
  it('decays every journalist toward zero', () => {
    const journalists = [makeJournalist({ disposition: 40 }), makeJournalist({ id: 'j2', disposition: -40 })];
    const after = decayJournalistDispositions(journalists);
    expect(after[0].disposition).toBeLessThan(40);
    expect(after[1].disposition).toBeGreaterThan(-40);
  });
});

describe('driftJournalistScrutiny', () => {
  it('rises toward a high pressure ceiling', () => {
    const journalist = makeJournalist({ scrutiny: 0.1, disposition: 0 });
    const after = driftJournalistScrutiny(journalist, 1);
    expect(after.scrutiny).toBeGreaterThan(0.1);
  });

  it('decays toward a low pressure ceiling', () => {
    const journalist = makeJournalist({ scrutiny: 0.8, disposition: 0 });
    const after = driftJournalistScrutiny(journalist, 0);
    expect(after.scrutiny).toBeLessThan(0.8);
  });

  it('a friendly disposition damps how fast scrutiny can rise', () => {
    const neutral = makeJournalist({ scrutiny: 0.1, disposition: 0 });
    const friendly = makeJournalist({ scrutiny: 0.1, disposition: 100 });
    const afterNeutral = driftJournalistScrutiny(neutral, 1);
    const afterFriendly = driftJournalistScrutiny(friendly, 1);
    expect(afterFriendly.scrutiny).toBeLessThan(afterNeutral.scrutiny);
  });

  it('stays within [0, 1]', () => {
    const journalist = makeJournalist({ scrutiny: 0.99 });
    for (let i = 0; i < 20; i++) {
      const after = driftJournalistScrutiny(journalist, 1);
      expect(after.scrutiny).toBeLessThanOrEqual(1);
    }
  });
});

describe('rollInvestigation', () => {
  it('never finds anything when scrutiny is zero', () => {
    const journalist = makeJournalist({ scrutiny: 0 });
    for (let seed = 0; seed < 30; seed++) {
      expect(rollInvestigation(journalist, 1, new SeededRng(seed)).found).toBe(false);
    }
  });

  it('a low-integrity target is found more often than a high-integrity one over many trials', () => {
    const journalist = makeJournalist({ scrutiny: 0.9, credibility: 90 });
    const rngLow = new SeededRng(2);
    const rngHigh = new SeededRng(2);
    let lowFinds = 0;
    let highFinds = 0;
    for (let i = 0; i < 100; i++) {
      if (rollInvestigation(journalist, 1, rngLow).found) lowFinds++;
      if (rollInvestigation(journalist, 10, rngHigh).found) highFinds++;
    }
    expect(lowFinds).toBeGreaterThan(highFinds);
  });

  it('is deterministic for a given rng state', () => {
    const journalist = makeJournalist({ scrutiny: 0.5 });
    const a = rollInvestigation(journalist, 5, new SeededRng(8));
    const b = rollInvestigation(journalist, 5, new SeededRng(8));
    expect(a).toEqual(b);
  });
});

describe('launchDisinformationCampaign', () => {
  it('is deterministic for a given rng state', () => {
    const journalists = [makeJournalist({ scrutiny: 0.3 })];
    const a = launchDisinformationCampaign(STRONG_ATTRS, journalists, new SeededRng(4));
    const b = launchDisinformationCampaign(STRONG_ATTRS, journalists, new SeededRng(4));
    expect(a).toEqual(b);
  });

  it('a quiet press landscape lands campaigns far more often than a highly scrutinous one', () => {
    const quiet = [makeJournalist({ scrutiny: 0 })];
    const alert = [makeJournalist({ scrutiny: 1 })];
    const rngQuiet = new SeededRng(9);
    const rngAlert = new SeededRng(9);
    let quietLands = 0;
    let alertLands = 0;
    for (let i = 0; i < 100; i++) {
      if (launchDisinformationCampaign(WEAK_ATTRS, quiet, rngQuiet).outcome === 'landed') quietLands++;
      if (launchDisinformationCampaign(WEAK_ATTRS, alert, rngAlert).outcome === 'landed') alertLands++;
    }
    expect(quietLands).toBeGreaterThan(alertLands);
  });

  it('handles an empty journalist list without throwing', () => {
    expect(() => launchDisinformationCampaign(STRONG_ATTRS, [], new SeededRng(1))).not.toThrow();
  });

  it('a backfired outcome carries a negative approval impact', () => {
    const alert = [makeJournalist({ scrutiny: 1 })];
    let sawBackfire = false;
    const rng = new SeededRng(5);
    for (let i = 0; i < 50 && !sawBackfire; i++) {
      const result = launchDisinformationCampaign(WEAK_ATTRS, alert, rng);
      if (result.outcome === 'backfired') {
        sawBackfire = true;
        expect(result.approvalImpact).toBeLessThan(0);
      }
    }
    expect(sawBackfire).toBe(true);
  });
});
