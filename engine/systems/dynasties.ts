import type { SeededRng } from '../rng';
import { clamp, clampAxis } from '../ideology';
import { generateName } from '../../content/names/pool';
import type { IdeologyPosition, PoliticalDynasty, Politician } from '../models/types';

/**
 * POLITICAL DYNASTIES & SUCCESSION — a founding politician's family name
 * accumulates prestige as they hold office, and a high-prestige dynasty's
 * heirs (spawned to fill a vacated seat — see engine/index.ts's
 * runByElectionsTurn) start with a real, earned head start: better
 * attributes and an ideology anchored close to the family's own, not a
 * decorative label.
 */

export function foundDynasty(founder: Politician, familyName: string, id: string): PoliticalDynasty {
  return { id, familyName, founderPoliticianId: founder.id, memberIds: [founder.id], prestige: 20 };
}

export function isDynastyMember(dynasty: PoliticalDynasty, politicianId: string): boolean {
  return dynasty.memberIds.includes(politicianId);
}

export function applyDynastyPrestigeDelta(dynasty: PoliticalDynasty, delta: number): PoliticalDynasty {
  return { ...dynasty, prestige: clamp(dynasty.prestige + delta, 0, 100) };
}

export function addDynastyMember(dynasty: PoliticalDynasty, politicianId: string): PoliticalDynasty {
  if (dynasty.memberIds.includes(politicianId)) return dynasty;
  return { ...dynasty, memberIds: [...dynasty.memberIds, politicianId] };
}

const HEIR_ATTRIBUTE_FLOOR_SCALE = 0.06;
const HEIR_IDEOLOGY_JITTER = 15;

/**
 * A new generation: attributes roll on the usual 1..10 range but with a
 * prestige-scaled floor (a high-prestige dynasty's heir is never a total
 * unknown), and ideology anchors close to the family's own position rather
 * than the party's, with a modest jitter — descendants drift, they don't
 * clone.
 */
export function spawnHeir(
  dynasty: PoliticalDynasty,
  familyIdeology: IdeologyPosition,
  partyId: string,
  seatLabel: string,
  rng: SeededRng
): Politician {
  const floor = 1 + Math.round(dynasty.prestige * HEIR_ATTRIBUTE_FLOOR_SCALE);
  const rollAttribute = () => rng.nextInt(Math.min(floor, 9), 10);
  const jitter = () => (rng.next() - 0.5) * 2 * HEIR_IDEOLOGY_JITTER;

  return {
    id: `${dynasty.id}-heir-${seatLabel}`,
    name: `${generateName(rng).split(' ')[0]} ${dynasty.familyName}`,
    isPlayer: false,
    ideology: {
      economic: clampAxis(familyIdeology.economic + jitter()),
      social: clampAxis(familyIdeology.social + jitter()),
    },
    attributes: {
      charisma: rollAttribute(),
      intellect: rollAttribute(),
      integrity: rollAttribute(),
      network: rollAttribute(),
      mediaSavvy: rollAttribute(),
    },
    partyId,
    approval: { public: 50, base: 55, partyElite: 55 },
    approvalEvents: [],
  };
}
