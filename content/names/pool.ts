import { SeededRng } from '../../engine/rng';

/**
 * Pre-authored name pools, assembled at random by seeded code — not
 * generated at runtime by a model. This is what gives NPC variety without
 * a live LLM call.
 */
export const FIRST_NAMES = [
  'Adrian', 'Beata', 'Corin', 'Dalia', 'Emeric', 'Farrah', 'Godric', 'Halina',
  'Ivo', 'Jolanta', 'Kasimir', 'Liora', 'Marek', 'Nadia', 'Oskar', 'Petra',
  'Quintus', 'Rosalind', 'Stellan', 'Talia', 'Ulric', 'Vesna', 'Wojciech',
  'Xenia', 'Yannick', 'Zora',
];

export const LAST_NAMES = [
  'Bardach', 'Corvane', 'Delacroix', 'Ehren', 'Falk', 'Gorecki', 'Hollende',
  'Ionescu', 'Jarrow', 'Kessler', 'Lindqvist', 'Moreno', 'Novak', 'Ostrowski',
  'Petrov', 'Radu', 'Sable', 'Thorne', 'Ustinov', 'Vance', 'Weiss', 'Yilmaz',
  'Zeleny',
];

export function generateName(rng: SeededRng): string {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
}
