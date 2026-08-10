import type { SeededRng } from '../rng';
import { clamp, ideologicalAlignment } from '../ideology';
import { fillTemplate } from './socialMedia';
import type { GrassrootsMovement, IdeologyPosition, MovementStance, Protest, VoterBloc } from '../models/types';

/**
 * GRASSROOTS MOVEMENTS — a voter bloc whose grievance against the player's
 * own ideology goes unaddressed long enough organizes into a real, standing
 * political force: it grows or shrinks with that grievance, applies real
 * approval pressure of its own every turn, can stage a protest once it's
 * both hostile and large, and amplifies or punishes the outcome of bills
 * that touch its ground — a felt mechanical consequence of the player's
 * ideological choices, not just flavor text layered on top.
 */

/**
 * Below this alignment with the player, a bloc counts as "aggrieved".
 * Deliberately set just above 0.5: since ideologicalAlignment's floor
 * against a perfectly centrist (0,0) player is 0.5 (the origin-to-corner
 * distance is only half the corner-to-corner max), a threshold at or below
 * 0.5 would make grievance mathematically unreachable for any centrist
 * player — this keeps the mechanic alive (if muted) even then, while
 * off-center players still see much stronger grievance from blocs on their
 * far side.
 */
const GRIEVANCE_ALIGNMENT_THRESHOLD = 0.55;

/** How aggrieved a bloc currently is against the player's ideology: 0 (content) .. 1 (maximally aggrieved). */
export function computeBlocGrievance(bloc: VoterBloc, playerIdeology: IdeologyPosition): number {
  const alignment = ideologicalAlignment(bloc.ideology, playerIdeology);
  if (alignment >= GRIEVANCE_ALIGNMENT_THRESHOLD) return 0;
  return clamp((GRIEVANCE_ALIGNMENT_THRESHOLD - alignment) / GRIEVANCE_ALIGNMENT_THRESHOLD, 0, 1);
}

const MOVEMENT_SPAWN_BASE_CHANCE = 0.08;
const MOVEMENT_STARTING_SIZE = 10;

/**
 * Rolls whether a new movement organizes this turn. Only blocs without an
 * existing movement are eligible; the chance scales with the single most
 * aggrieved eligible bloc's grievance, and which bloc actually organizes
 * is a weighted pick across every aggrieved eligible bloc (weighted by
 * grievance * bloc size) — so movements aren't guaranteed to come from
 * whichever bloc happens to be worst-off, just more likely to.
 */
export function trySpawnMovement(
  blocs: VoterBloc[],
  existingMovements: GrassrootsMovement[],
  playerIdeology: IdeologyPosition,
  turn: number,
  rng: SeededRng,
  nameTemplates: string[] = ['{blocName} Movement'],
  missionTemplates: string[] = ['Organizing {blocName} around a shared grievance.']
): GrassrootsMovement | null {
  const representedBlocIds = new Set(existingMovements.map((m) => m.originBlocId));
  const candidates = blocs
    .filter((b) => !representedBlocIds.has(b.id))
    .map((bloc) => ({ bloc, grievance: computeBlocGrievance(bloc, playerIdeology) }))
    .filter((c) => c.grievance > 0);

  if (candidates.length === 0) return null;

  const maxGrievance = Math.max(...candidates.map((c) => c.grievance));
  if (rng.next() >= MOVEMENT_SPAWN_BASE_CHANCE * maxGrievance) return null;

  const chosen = rng.pickWeighted(candidates.map((c) => ({ item: c.bloc, weight: c.grievance * c.bloc.size })));
  const slots = { blocName: chosen.name };
  return {
    id: `movement-${turn}-${chosen.id}`,
    name: fillTemplate(rng.pick(nameTemplates), slots),
    mission: fillTemplate(rng.pick(missionTemplates), slots),
    ideology: chosen.ideology,
    originBlocId: chosen.id,
    size: MOVEMENT_STARTING_SIZE,
    founded: turn,
  };
}

const STANCE_SUPPORTIVE_THRESHOLD = 0.6;
const STANCE_HOSTILE_THRESHOLD = 0.4;

/** A movement's stance toward the player, always derived fresh from current ideology — never stored. */
export function computeMovementStance(movement: GrassrootsMovement, playerIdeology: IdeologyPosition): MovementStance {
  const alignment = ideologicalAlignment(movement.ideology, playerIdeology);
  if (alignment >= STANCE_SUPPORTIVE_THRESHOLD) return 'supportive';
  if (alignment <= STANCE_HOSTILE_THRESHOLD) return 'hostile';
  return 'neutral';
}

const MOVEMENT_GROWTH_RATE = 3;
const MOVEMENT_DECAY_RATE = 2;

/**
 * A movement grows while its origin bloc stays aggrieved (faster the more
 * aggrieved), and quietly decays back toward fading out once the player's
 * ideology stops giving it anything to organize around. If the origin bloc
 * no longer exists (e.g. a custom-nation edge case), it just decays.
 */
export function advanceMovementSize(
  movement: GrassrootsMovement,
  blocs: VoterBloc[],
  playerIdeology: IdeologyPosition
): GrassrootsMovement {
  const bloc = blocs.find((b) => b.id === movement.originBlocId);
  const grievance = bloc ? computeBlocGrievance(bloc, playerIdeology) : 0;
  const delta = grievance > 0 ? grievance * MOVEMENT_GROWTH_RATE : -MOVEMENT_DECAY_RATE;
  return { ...movement, size: clamp(movement.size + delta, 0, 100) };
}

const MOVEMENT_APPROVAL_PRESSURE_SCALE = 0.05;

/**
 * The net public-approval pressure every active movement is putting on the
 * player right now — supportive movements push it up, hostile movements
 * push it down, scaled by how large and organized each one currently is.
 * Neutral movements exert none.
 */
export function computeMovementApprovalPressure(
  movements: GrassrootsMovement[],
  playerIdeology: IdeologyPosition
): number {
  return movements.reduce((sum, movement) => {
    const stance = computeMovementStance(movement, playerIdeology);
    if (stance === 'neutral') return sum;
    const sign = stance === 'supportive' ? 1 : -1;
    return sum + sign * movement.size * MOVEMENT_APPROVAL_PRESSURE_SCALE;
  }, 0);
}

const MOVEMENT_PROTEST_SIZE_THRESHOLD = 50;
const MOVEMENT_PROTEST_BASE_CHANCE = 0.15;

/**
 * A hostile movement large enough to actually organize a crowd can stage
 * its own protest — but only when nothing is already active nationally,
 * same one-at-a-time invariant runUnrestTurn's spontaneous protests obey.
 */
export function rollMovementProtest(
  movement: GrassrootsMovement,
  stance: MovementStance,
  existingProtests: Protest[],
  turn: number,
  rng: SeededRng
): Protest | null {
  const active = existingProtests.some((p) => p.status === 'protesting' || p.status === 'riot');
  if (active || stance !== 'hostile' || movement.size < MOVEMENT_PROTEST_SIZE_THRESHOLD) return null;

  const chance = MOVEMENT_PROTEST_BASE_CHANCE * (movement.size / 100);
  if (rng.next() >= chance) return null;

  return {
    id: `protest-movement-${turn}`,
    cause: `${movement.name} demonstrations`,
    intensity: 20 + rng.next() * 20,
    status: 'protesting',
    turnStarted: turn,
  };
}

const MOVEMENT_BILL_REACTION_SCALE = 0.08;

/**
 * How much a single movement's reaction to a just-passed bill should
 * further shift the sponsor's public approval, on top of the bill's own
 * pass/fail swing — a supportive movement amplifies a sponsor whose stance
 * matches theirs, a hostile one punishes it. Zero for a failed bill (no
 * movement celebrates or protests something that never became law) and
 * zero for a neutral movement.
 */
export function computeMovementBillReaction(
  movement: GrassrootsMovement,
  sponsorIdeology: IdeologyPosition,
  billPassed: boolean
): number {
  if (!billPassed) return 0;
  const alignment = ideologicalAlignment(movement.ideology, sponsorIdeology);
  const signedAlignment = (alignment - 0.5) * 2;
  return signedAlignment * movement.size * MOVEMENT_BILL_REACTION_SCALE;
}

/** Sums every active movement's reaction to a just-resolved bill into a single approval delta for the sponsor. */
export function computeAggregateMovementBillReaction(
  movements: GrassrootsMovement[],
  sponsorIdeology: IdeologyPosition,
  billPassed: boolean
): number {
  return movements.reduce((sum, m) => sum + computeMovementBillReaction(m, sponsorIdeology, billPassed), 0);
}

/** A movement that's decayed all the way to nothing is no longer worth tracking. */
export function isMovementActive(movement: GrassrootsMovement): boolean {
  return movement.size > 0;
}
