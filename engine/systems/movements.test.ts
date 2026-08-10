import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { GrassrootsMovement, IdeologyPosition, Protest, VoterBloc } from '../models/types';
import {
  advanceMovementSize,
  computeAggregateMovementBillReaction,
  computeBlocGrievance,
  computeMovementApprovalPressure,
  computeMovementBillReaction,
  computeMovementStance,
  isMovementActive,
  rollMovementProtest,
  trySpawnMovement,
} from './movements';

function makeBloc(overrides: Partial<VoterBloc> & { id: string }): VoterBloc {
  return {
    name: overrides.id,
    size: 0.2,
    ideology: { economic: 0, social: 0 },
    persuadability: 0.5,
    issueSalience: [],
    ...overrides,
  };
}

function makeMovement(overrides: Partial<GrassrootsMovement> & { id: string }): GrassrootsMovement {
  return {
    name: overrides.id,
    mission: 'Testing.',
    ideology: { economic: 0, social: 0 },
    originBlocId: 'bloc-a',
    size: 20,
    founded: 1,
    ...overrides,
  };
}

const CENTER: IdeologyPosition = { economic: 0, social: 0 };
// A non-centrist reference point: since ideologicalAlignment's floor against a
// perfectly centrist (0,0) position is 0.5 (the corner-to-origin distance is
// only half the corner-to-corner max), "aggrieved"/"hostile" scenarios below
// the 0.4 threshold are only reachable against an off-center player position.
const PLAYER: IdeologyPosition = { economic: 80, social: 80 };
const OPPOSED_TO_PLAYER: IdeologyPosition = { economic: -80, social: -80 };

describe('computeBlocGrievance', () => {
  it('is zero for a well-aligned bloc', () => {
    const bloc = makeBloc({ id: 'a', ideology: { economic: 5, social: 5 } });
    expect(computeBlocGrievance(bloc, CENTER)).toBe(0);
  });

  it('is positive and grows with distance for a poorly-aligned bloc', () => {
    const near = makeBloc({ id: 'a', ideology: { economic: 20, social: 20 } });
    const far = makeBloc({ id: 'b', ideology: OPPOSED_TO_PLAYER });
    expect(computeBlocGrievance(far, PLAYER)).toBeGreaterThan(computeBlocGrievance(near, PLAYER));
  });

  it('never exceeds 1', () => {
    const bloc = makeBloc({ id: 'a', ideology: { economic: 100, social: 100 } });
    expect(computeBlocGrievance(bloc, { economic: -100, social: -100 })).toBeLessThanOrEqual(1);
  });
});

describe('trySpawnMovement', () => {
  it('never spawns when no bloc is aggrieved', () => {
    const blocs = [makeBloc({ id: 'a', ideology: { economic: 5, social: 5 } })];
    const rng = new SeededRng(1);
    for (let i = 0; i < 50; i++) {
      expect(trySpawnMovement(blocs, [], CENTER, i, rng)).toBeNull();
    }
  });

  it('never spawns a second movement from a bloc that already has one', () => {
    const blocs = [makeBloc({ id: 'a', ideology: { economic: 90, social: 90 }, size: 0.9 })];
    const existing = [makeMovement({ id: 'existing', originBlocId: 'a' })];
    const rng = new SeededRng(2);
    for (let i = 0; i < 100; i++) {
      expect(trySpawnMovement(blocs, existing, CENTER, i, rng)).toBeNull();
    }
  });

  it('eventually spawns from a badly aggrieved, large bloc', () => {
    const blocs = [makeBloc({ id: 'a', ideology: OPPOSED_TO_PLAYER, size: 0.9 })];
    const rng = new SeededRng(3);
    let spawned = false;
    for (let i = 0; i < 200 && !spawned; i++) {
      if (trySpawnMovement(blocs, [], PLAYER, i, rng)) spawned = true;
    }
    expect(spawned).toBe(true);
  });

  it('the spawned movement carries the origin bloc\'s ideology', () => {
    const blocs = [makeBloc({ id: 'a', ideology: OPPOSED_TO_PLAYER, size: 0.9 })];
    const rng = new SeededRng(4);
    let movement: GrassrootsMovement | null = null;
    for (let i = 0; i < 200 && !movement; i++) {
      movement = trySpawnMovement(blocs, [], PLAYER, i, rng);
    }
    expect(movement?.originBlocId).toBe('a');
    expect(movement?.ideology).toEqual(OPPOSED_TO_PLAYER);
  });

  it('builds the name and mission from the given templates, slotting in the bloc name', () => {
    const blocs = [makeBloc({ id: 'a', name: 'Dockworkers', ideology: OPPOSED_TO_PLAYER, size: 0.9 })];
    const rng = new SeededRng(5);
    let movement: GrassrootsMovement | null = null;
    for (let i = 0; i < 200 && !movement; i++) {
      movement = trySpawnMovement(blocs, [], PLAYER, i, rng, ['The {blocName} Front'], ['{blocName} demand change.']);
    }
    expect(movement?.name).toBe('The Dockworkers Front');
    expect(movement?.mission).toBe('Dockworkers demand change.');
  });
});

describe('computeMovementStance', () => {
  it('is supportive when closely aligned with the player', () => {
    const movement = makeMovement({ id: 'm', ideology: { economic: 10, social: 10 } });
    expect(computeMovementStance(movement, CENTER)).toBe('supportive');
  });

  it('is hostile when strongly opposed to the player', () => {
    const movement = makeMovement({ id: 'm', ideology: OPPOSED_TO_PLAYER });
    expect(computeMovementStance(movement, PLAYER)).toBe('hostile');
  });

  it('is neutral in between', () => {
    // Exactly half the corner-to-corner max distance from PLAYER puts alignment at 0.5.
    const movement = makeMovement({ id: 'm', ideology: { economic: -20, social: -20 } });
    expect(computeMovementStance(movement, PLAYER)).toBe('neutral');
  });
});

describe('advanceMovementSize', () => {
  it('grows a movement while its origin bloc stays aggrieved', () => {
    const blocs = [makeBloc({ id: 'bloc-a', ideology: OPPOSED_TO_PLAYER })];
    const movement = makeMovement({ id: 'm', originBlocId: 'bloc-a', size: 20 });
    const next = advanceMovementSize(movement, blocs, PLAYER);
    expect(next.size).toBeGreaterThan(20);
  });

  it('decays a movement once its origin bloc is no longer aggrieved', () => {
    const blocs = [makeBloc({ id: 'bloc-a', ideology: { economic: 5, social: 5 } })];
    const movement = makeMovement({ id: 'm', originBlocId: 'bloc-a', size: 20 });
    const next = advanceMovementSize(movement, blocs, CENTER);
    expect(next.size).toBeLessThan(20);
  });

  it('decays when the origin bloc no longer exists', () => {
    const movement = makeMovement({ id: 'm', originBlocId: 'missing', size: 20 });
    const next = advanceMovementSize(movement, [], CENTER);
    expect(next.size).toBeLessThan(20);
  });

  it('never goes below 0 or above 100', () => {
    const blocs = [makeBloc({ id: 'bloc-a', ideology: OPPOSED_TO_PLAYER })];
    const huge = makeMovement({ id: 'm', originBlocId: 'bloc-a', size: 99 });
    expect(advanceMovementSize(huge, blocs, PLAYER).size).toBeLessThanOrEqual(100);

    const tiny = makeMovement({ id: 'm2', originBlocId: 'missing', size: 1 });
    expect(advanceMovementSize(tiny, [], CENTER).size).toBeGreaterThanOrEqual(0);
  });
});

describe('computeMovementApprovalPressure', () => {
  it('is negative when hostile movements dominate', () => {
    const hostile = makeMovement({ id: 'h', ideology: OPPOSED_TO_PLAYER, size: 60 });
    expect(computeMovementApprovalPressure([hostile], PLAYER)).toBeLessThan(0);
  });

  it('is positive when supportive movements dominate', () => {
    const supportive = makeMovement({ id: 's', ideology: { economic: 85, social: 85 }, size: 60 });
    expect(computeMovementApprovalPressure([supportive], PLAYER)).toBeGreaterThan(0);
  });

  it('ignores neutral movements', () => {
    const neutral = makeMovement({ id: 'n', ideology: { economic: -20, social: -20 }, size: 60 });
    expect(computeMovementApprovalPressure([neutral], PLAYER)).toBe(0);
  });

  it('is zero with no movements', () => {
    expect(computeMovementApprovalPressure([], CENTER)).toBe(0);
  });
});

describe('rollMovementProtest', () => {
  it('never fires for a small movement', () => {
    const movement = makeMovement({ id: 'm', size: 10 });
    const rng = new SeededRng(5);
    for (let i = 0; i < 50; i++) {
      expect(rollMovementProtest(movement, 'hostile', [], i, rng)).toBeNull();
    }
  });

  it('never fires for a non-hostile movement', () => {
    const movement = makeMovement({ id: 'm', size: 90 });
    const rng = new SeededRng(6);
    for (let i = 0; i < 50; i++) {
      expect(rollMovementProtest(movement, 'supportive', [], i, rng)).toBeNull();
      expect(rollMovementProtest(movement, 'neutral', [], i, rng)).toBeNull();
    }
  });

  it('never fires while another protest is already active', () => {
    const movement = makeMovement({ id: 'm', size: 90 });
    const active: Protest[] = [{ id: 'p1', cause: 'existing', intensity: 50, status: 'protesting', turnStarted: 1 }];
    const rng = new SeededRng(7);
    for (let i = 0; i < 50; i++) {
      expect(rollMovementProtest(movement, 'hostile', active, i, rng)).toBeNull();
    }
  });

  it('eventually fires for a large hostile movement with the field clear', () => {
    const movement = makeMovement({ id: 'm', name: 'Test Movement', size: 95 });
    const rng = new SeededRng(8);
    let protest: Protest | null = null;
    for (let i = 0; i < 100 && !protest; i++) {
      protest = rollMovementProtest(movement, 'hostile', [], i, rng);
    }
    expect(protest).not.toBeNull();
    expect(protest?.cause).toContain('Test Movement');
  });
});

describe('computeMovementBillReaction / computeAggregateMovementBillReaction', () => {
  it('is zero for a failed bill regardless of alignment', () => {
    const movement = makeMovement({ id: 'm', ideology: { economic: 10, social: 10 }, size: 80 });
    expect(computeMovementBillReaction(movement, CENTER, false)).toBe(0);
  });

  it('is positive for a passed bill from an aligned sponsor', () => {
    const movement = makeMovement({ id: 'm', ideology: { economic: 10, social: 10 }, size: 80 });
    expect(computeMovementBillReaction(movement, CENTER, true)).toBeGreaterThan(0);
  });

  it('is negative for a passed bill from an opposed sponsor', () => {
    const movement = makeMovement({ id: 'm', ideology: OPPOSED_TO_PLAYER, size: 80 });
    expect(computeMovementBillReaction(movement, PLAYER, true)).toBeLessThan(0);
  });

  it('aggregates across every movement', () => {
    const supportive = makeMovement({ id: 's', ideology: { economic: 10, social: 10 }, size: 50 });
    const hostile = makeMovement({ id: 'h', ideology: { economic: -90, social: -90 }, size: 50 });
    const total = computeAggregateMovementBillReaction([supportive, hostile], CENTER, true);
    const expected =
      computeMovementBillReaction(supportive, CENTER, true) + computeMovementBillReaction(hostile, CENTER, true);
    expect(total).toBeCloseTo(expected, 8);
  });
});

describe('isMovementActive', () => {
  it('is true for a movement with any size', () => {
    expect(isMovementActive(makeMovement({ id: 'm', size: 1 }))).toBe(true);
  });

  it('is false once a movement has fully decayed', () => {
    expect(isMovementActive(makeMovement({ id: 'm', size: 0 }))).toBe(false);
  });
});
