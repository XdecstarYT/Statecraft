import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { Bill, Politician, Scandal } from '../models/types';
import { proposeBill, advanceToCommittee, advanceToFloor, applyFloorVoteResult } from './legislative';
import {
  appointToCabinet,
  applyMinisterNoConfidenceResult,
  computeCabinetEffects,
  computeMinisterNoConfidenceSupportProbability,
  computeResignationProbability,
  computeScandalForcedExitProbability,
  removeFromCabinet,
  reshuffleCabinet,
  resolveCollectiveResponsibility,
  resolveMinisterNoConfidenceVote,
  resolveScandalForcedExit,
} from './cabinet';

function makePolitician(overrides: Partial<Politician> & { id: string }): Politician {
  return {
    name: overrides.id,
    isPlayer: false,
    ideology: { economic: 0, social: 0 },
    attributes: { charisma: 5, intellect: 5, integrity: 5, network: 5, mediaSavvy: 5 },
    partyId: 'party-a',
    approval: { public: 50, base: 50, partyElite: 50 },
    approvalEvents: [],
    ...overrides,
  };
}

function failedBill(category: Bill['category']): Bill {
  let bill = proposeBill({ id: 'b1', title: 'Test', provisions: [], sponsorId: 'sponsor', category });
  bill = advanceToCommittee(bill);
  bill = advanceToFloor(bill);
  return applyFloorVoteResult(bill, { yes: 1, no: 5, passed: false, finalWhipCount: {} });
}

describe('appointToCabinet', () => {
  it('adds a new appointment', () => {
    const cabinet = appointToCabinet([], 'finance', 'p1');
    expect(cabinet).toEqual([{ portfolio: 'finance', politicianId: 'p1', rank: 'senior' }]);
  });

  it('replaces whoever previously held that portfolio and rank', () => {
    const cabinet = appointToCabinet([{ portfolio: 'finance', politicianId: 'p1', rank: 'senior' }], 'finance', 'p2');
    expect(cabinet).toEqual([{ portfolio: 'finance', politicianId: 'p2', rank: 'senior' }]);
  });

  it('leaves other portfolios untouched', () => {
    const cabinet = appointToCabinet([{ portfolio: 'defense', politicianId: 'p1', rank: 'senior' }], 'finance', 'p2');
    expect(cabinet).toHaveLength(2);
  });

  it('a junior appointment does not replace the senior minister in the same portfolio', () => {
    const cabinet = appointToCabinet([{ portfolio: 'finance', politicianId: 'p1', rank: 'senior' }], 'finance', 'p2', 'junior');
    expect(cabinet).toHaveLength(2);
    expect(cabinet.find((c) => c.rank === 'senior')?.politicianId).toBe('p1');
    expect(cabinet.find((c) => c.rank === 'junior')?.politicianId).toBe('p2');
  });
});

describe('removeFromCabinet', () => {
  it('removes the senior appointment for that portfolio by default', () => {
    const cabinet = removeFromCabinet([{ portfolio: 'finance', politicianId: 'p1', rank: 'senior' }], 'finance');
    expect(cabinet).toHaveLength(0);
  });

  it('is a no-op for a vacant portfolio', () => {
    const cabinet = removeFromCabinet([{ portfolio: 'defense', politicianId: 'p1', rank: 'senior' }], 'finance');
    expect(cabinet).toHaveLength(1);
  });

  it('leaves a junior minister in place when only the senior seat is removed', () => {
    const cabinet = removeFromCabinet(
      [
        { portfolio: 'finance', politicianId: 'p1', rank: 'senior' },
        { portfolio: 'finance', politicianId: 'p2', rank: 'junior' },
      ],
      'finance',
      'senior'
    );
    expect(cabinet).toEqual([{ portfolio: 'finance', politicianId: 'p2', rank: 'junior' }]);
  });
});

describe('reshuffleCabinet', () => {
  it('reports the bumped minister when replacing an occupied seat', () => {
    const { cabinet, removedPoliticianId } = reshuffleCabinet(
      [{ portfolio: 'finance', politicianId: 'p1', rank: 'senior' }],
      'finance',
      'senior',
      'p2'
    );
    expect(removedPoliticianId).toBe('p1');
    expect(cabinet).toEqual([{ portfolio: 'finance', politicianId: 'p2', rank: 'senior' }]);
  });

  it('reports no removal when filling a vacant seat', () => {
    const { removedPoliticianId } = reshuffleCabinet([], 'finance', 'senior', 'p1');
    expect(removedPoliticianId).toBeNull();
  });

  it('reports no removal when re-appointing the same politician', () => {
    const { removedPoliticianId } = reshuffleCabinet(
      [{ portfolio: 'finance', politicianId: 'p1', rank: 'senior' }],
      'finance',
      'senior',
      'p1'
    );
    expect(removedPoliticianId).toBeNull();
  });
});

describe('computeCabinetEffects', () => {
  it('returns neutral effects for an empty cabinet', () => {
    const effects = computeCabinetEffects([], []);
    expect(effects.economyVolatilityMultiplier).toBe(1);
    expect(effects.warStrengthBonus).toBe(0);
    expect(effects.corruptionDetectionMultiplier).toBe(1);
    expect(effects.warDeclarationRelationSoftening).toBe(0);
  });

  it('a sharp Finance minister lowers the economy volatility multiplier', () => {
    const politicians = [makePolitician({ id: 'p1', attributes: { charisma: 5, intellect: 10, integrity: 5, network: 5, mediaSavvy: 5 } })];
    const effects = computeCabinetEffects([{ portfolio: 'finance', politicianId: 'p1', rank: 'senior' }], politicians);
    expect(effects.economyVolatilityMultiplier).toBeLessThan(1);
  });

  it('a sharp Defense minister grants a positive war strength bonus', () => {
    const politicians = [makePolitician({ id: 'p1', attributes: { charisma: 5, intellect: 9, integrity: 5, network: 5, mediaSavvy: 5 } })];
    const effects = computeCabinetEffects([{ portfolio: 'defense', politicianId: 'p1', rank: 'senior' }], politicians);
    expect(effects.warStrengthBonus).toBeGreaterThan(0);
  });

  it('a principled Justice minister raises the corruption detection multiplier', () => {
    const politicians = [makePolitician({ id: 'p1', attributes: { charisma: 5, intellect: 5, integrity: 10, network: 5, mediaSavvy: 5 } })];
    const effects = computeCabinetEffects([{ portfolio: 'justice', politicianId: 'p1', rank: 'senior' }], politicians);
    expect(effects.corruptionDetectionMultiplier).toBeGreaterThan(1);
  });

  it('a charismatic Foreign Affairs minister softens the war-declaration relation hit', () => {
    const politicians = [makePolitician({ id: 'p1', attributes: { charisma: 10, intellect: 5, integrity: 5, network: 5, mediaSavvy: 5 } })];
    const effects = computeCabinetEffects([{ portfolio: 'foreignAffairs', politicianId: 'p1', rank: 'senior' }], politicians);
    expect(effects.warDeclarationRelationSoftening).toBeGreaterThan(0);
    expect(effects.warDeclarationRelationSoftening).toBeLessThanOrEqual(1);
  });

  it('ignores an appointment whose politician no longer exists', () => {
    const effects = computeCabinetEffects([{ portfolio: 'finance', politicianId: 'ghost', rank: 'senior' }], []);
    expect(effects.economyVolatilityMultiplier).toBe(1);
  });

  it('combines effects across multiple simultaneous portfolios', () => {
    const politicians = [
      makePolitician({ id: 'p1', attributes: { charisma: 5, intellect: 10, integrity: 5, network: 5, mediaSavvy: 5 } }),
      makePolitician({ id: 'p2', attributes: { charisma: 5, intellect: 5, integrity: 10, network: 5, mediaSavvy: 5 } }),
    ];
    const effects = computeCabinetEffects(
      [
        { portfolio: 'finance', politicianId: 'p1', rank: 'senior' },
        { portfolio: 'justice', politicianId: 'p2', rank: 'senior' },
      ],
      politicians
    );
    expect(effects.economyVolatilityMultiplier).toBeLessThan(1);
    expect(effects.corruptionDetectionMultiplier).toBeGreaterThan(1);
  });

  it('a junior minister adds a smaller version of the same effect on top of the senior minister', () => {
    const politicians = [
      makePolitician({ id: 'senior', attributes: { charisma: 5, intellect: 10, integrity: 5, network: 5, mediaSavvy: 5 } }),
      makePolitician({ id: 'junior', attributes: { charisma: 5, intellect: 10, integrity: 5, network: 5, mediaSavvy: 5 } }),
    ];
    const seniorOnly = computeCabinetEffects([{ portfolio: 'finance', politicianId: 'senior', rank: 'senior' }], politicians);
    const seniorAndJunior = computeCabinetEffects(
      [
        { portfolio: 'finance', politicianId: 'senior', rank: 'senior' },
        { portfolio: 'finance', politicianId: 'junior', rank: 'junior' },
      ],
      politicians
    );
    expect(seniorAndJunior.economyVolatilityMultiplier).toBeLessThan(seniorOnly.economyVolatilityMultiplier);
  });
});

describe('collective responsibility', () => {
  it('has zero resignation probability for a passed bill', () => {
    const minister = makePolitician({ id: 'm1', attributes: { charisma: 5, intellect: 5, integrity: 8, network: 5, mediaSavvy: 5 } });
    let bill = proposeBill({ id: 'b1', title: 'Test', provisions: [], sponsorId: 'sponsor', category: 'economic' });
    bill = advanceToCommittee(bill);
    bill = advanceToFloor(bill);
    bill = applyFloorVoteResult(bill, { yes: 5, no: 1, passed: true, finalWhipCount: {} });
    expect(computeResignationProbability(minister, bill)).toBe(0);
  });

  it('a higher-integrity minister carries more resignation risk than a lower-integrity one, over a failed bill in their portfolio', () => {
    const bill = failedBill('economic');
    const principled = makePolitician({ id: 'p1', attributes: { charisma: 5, intellect: 5, integrity: 10, network: 5, mediaSavvy: 5 } });
    const shameless = makePolitician({ id: 'p2', attributes: { charisma: 5, intellect: 5, integrity: 1, network: 5, mediaSavvy: 5 } });
    expect(computeResignationProbability(principled, bill)).toBeGreaterThan(computeResignationProbability(shameless, bill));
  });

  it('is a no-op for a bill category with no cabinet portfolio', () => {
    const bill = failedBill('healthcare');
    const cabinet = [{ portfolio: 'finance' as const, politicianId: 'm1', rank: 'senior' as const }];
    const politicians = [makePolitician({ id: 'm1' })];
    const result = resolveCollectiveResponsibility(cabinet, politicians, bill, new SeededRng(1));
    expect(result.resignedPoliticianId).toBeNull();
    expect(result.cabinet).toBe(cabinet);
  });

  it('removes the resigning minister from the cabinet when the roll lands', () => {
    const bill = failedBill('economic');
    const minister = makePolitician({ id: 'm1', attributes: { charisma: 5, intellect: 5, integrity: 10, network: 5, mediaSavvy: 5 } });
    const cabinet = [{ portfolio: 'finance' as const, politicianId: 'm1', rank: 'senior' as const }];
    let resigned = false;
    for (let seed = 0; seed < 200 && !resigned; seed++) {
      const result = resolveCollectiveResponsibility(cabinet, [minister], bill, new SeededRng(seed));
      if (result.resignedPoliticianId === 'm1') {
        resigned = true;
        expect(result.cabinet).toHaveLength(0);
      }
    }
    expect(resigned).toBe(true);
  });
});

describe('scandal forced exit', () => {
  const scandal: Scandal = { id: 's1', politicianId: 'm1', tier: 'hard', turn: 1, status: 'unresolved' };

  it('probability rises with scandal tier', () => {
    expect(computeScandalForcedExitProbability('hard')).toBeGreaterThan(computeScandalForcedExitProbability('medium'));
    expect(computeScandalForcedExitProbability('medium')).toBeGreaterThan(computeScandalForcedExitProbability('soft'));
  });

  it('is a no-op when the scandalized politician holds no cabinet seat', () => {
    const result = resolveScandalForcedExit([], scandal, new SeededRng(1));
    expect(result.removedPoliticianId).toBeNull();
  });

  it('removes every seat the scandalized minister holds when the roll lands', () => {
    const cabinet = [
      { portfolio: 'finance' as const, politicianId: 'm1', rank: 'senior' as const },
      { portfolio: 'defense' as const, politicianId: 'other', rank: 'senior' as const },
    ];
    let removed = false;
    for (let seed = 0; seed < 100 && !removed; seed++) {
      const result = resolveScandalForcedExit(cabinet, scandal, new SeededRng(seed));
      if (result.removedPoliticianId === 'm1') {
        removed = true;
        expect(result.cabinet).toEqual([{ portfolio: 'defense', politicianId: 'other', rank: 'senior' }]);
      }
    }
    expect(removed).toBe(true);
  });
});

describe('minister no-confidence motions', () => {
  it('an unpopular, low-integrity, hostile-relationship minister draws far more support than a clean, well-liked one', () => {
    const member = makePolitician({ id: 'voter' });
    const clean = makePolitician({ id: 'clean', attributes: { charisma: 5, intellect: 5, integrity: 10, network: 5, mediaSavvy: 5 } });
    const tainted = makePolitician({ id: 'tainted', attributes: { charisma: 5, intellect: 5, integrity: 1, network: 5, mediaSavvy: 5 } });
    const hostileRelationships = { [[member.id, tainted.id].sort().join(':')]: -80 };
    const cleanProb = computeMinisterNoConfidenceSupportProbability(member, clean, {}, 0);
    const taintedProb = computeMinisterNoConfidenceSupportProbability(member, tainted, hostileRelationships, 1);
    expect(taintedProb).toBeGreaterThan(cleanProb);
  });

  it('passes on majority support and removes every cabinet seat the minister holds', () => {
    const minister = makePolitician({ id: 'm1', attributes: { charisma: 1, intellect: 1, integrity: 1, network: 1, mediaSavvy: 1 } });
    const scandals: Scandal[] = [{ id: 's1', politicianId: 'm1', tier: 'hard', turn: 1, status: 'unresolved' }];
    const hostileMembers = Array.from({ length: 10 }, (_, i) => makePolitician({ id: `v${i}` }));
    const relationships: Record<string, number> = {};
    for (const m of hostileMembers) relationships[[m.id, minister.id].sort().join(':')] = -90;

    const result = resolveMinisterNoConfidenceVote(minister, [minister, ...hostileMembers], relationships, scandals, new SeededRng(3));
    expect(result.passed).toBe(true);

    const cabinet = [{ portfolio: 'finance' as const, politicianId: 'm1', rank: 'senior' as const }];
    const nextCabinet = applyMinisterNoConfidenceResult(cabinet, minister, result);
    expect(nextCabinet).toHaveLength(0);
  });

  it('leaves the cabinet untouched when the motion fails', () => {
    const minister = makePolitician({ id: 'm1', attributes: { charisma: 10, intellect: 10, integrity: 10, network: 10, mediaSavvy: 10 } });
    const cabinet = [{ portfolio: 'finance' as const, politicianId: 'm1', rank: 'senior' as const }];
    const result = resolveMinisterNoConfidenceVote(minister, [minister, makePolitician({ id: 'v1' })], {}, [], new SeededRng(1));
    expect(result.passed).toBe(false);
    const nextCabinet = applyMinisterNoConfidenceResult(cabinet, minister, result);
    expect(nextCabinet).toEqual(cabinet);
  });
});
