import { clamp } from '../ideology';
import type { Country, District, ElectoralSystem, IdeologyPosition, Party } from '../models/types';

/**
 * NATION BUILDER — assembles a fully-valid Country + starting Party
 * roster from player input at New Game time, the same shape createNewGame
 * already expects from any of the preset STARTER_COUNTRY_OPTIONS. Pure
 * and content-free like every other engine system.
 */

export type RegimeType = Country['regimeType'];

export interface CustomPartyInput {
  name: string;
  ideology: IdeologyPosition;
}

export interface CustomNationInput {
  countryName: string;
  regimeType: RegimeType;
  electoralSystem: ElectoralSystem;
  /** Desired legislature size. Also becomes the district count under FPTP (one seat per district). */
  totalSeats: number;
  /** Only meaningful under PR_DHONDT. Clamped to [0, 0.5]. */
  prThreshold: number;
  parties: CustomPartyInput[];
}

export interface NationBuilderError {
  field: string;
  message: string;
}

/** Real validation, not just type-checking — a nation needs at least two parties and enough seats to go around. */
export function validateCustomNation(input: CustomNationInput): NationBuilderError[] {
  const errors: NationBuilderError[] = [];
  if (!input.countryName.trim()) errors.push({ field: 'countryName', message: 'Give the nation a name.' });
  if (input.parties.length < 2) errors.push({ field: 'parties', message: 'At least two parties are required.' });
  if (input.parties.some((p) => !p.name.trim())) errors.push({ field: 'parties', message: 'Every party needs a name.' });
  const totalSeats = Math.round(input.totalSeats);
  if (totalSeats < input.parties.length) {
    errors.push({ field: 'totalSeats', message: 'There must be at least as many seats as parties.' });
  }
  if (totalSeats < 1 || totalSeats > 1000) {
    errors.push({ field: 'totalSeats', message: 'Seats must be between 1 and 1000.' });
  }
  return errors;
}

function slugify(text: string): string {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'nation';
}

/** Splits totalSeats as evenly as possible across the parties, in the order given — remainder goes to the earliest parties. */
export function distributeSeatsEvenly(partyCount: number, totalSeats: number): number[] {
  if (partyCount <= 0) return [];
  const base = Math.floor(totalSeats / partyCount);
  const remainder = totalSeats % partyCount;
  return Array.from({ length: partyCount }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * Builds a real Country + Party[] from validated input. Callers should run
 * validateCustomNation first — this does not re-validate, it assumes a
 * clean input and always produces a usable result.
 */
export function buildCustomNation(input: CustomNationInput): { country: Country; parties: Party[] } {
  const countryId = `custom-${slugify(input.countryName)}`;
  const totalSeats = Math.max(input.parties.length, Math.round(input.totalSeats));

  const districts: District[] =
    input.electoralSystem === 'FPTP'
      ? Array.from({ length: totalSeats }, (_, i) => ({ id: `${countryId}-d${i + 1}`, name: `District ${i + 1}` }))
      : [];

  const country: Country = {
    id: countryId,
    name: input.countryName.trim(),
    regimeType: input.regimeType,
    legislature: {
      name: `${input.countryName.trim()} National Assembly`,
      electoralSystem: input.electoralSystem,
      districts,
      totalSeats,
      prThreshold: clamp(input.prThreshold, 0, 0.5),
    },
  };

  const seatCounts = distributeSeatsEvenly(input.parties.length, totalSeats);
  const parties: Party[] = input.parties.map((p, i) => ({
    id: `${countryId}-party-${i + 1}`,
    name: p.name.trim(),
    ideology: { economic: clamp(p.ideology.economic, -100, 100), social: clamp(p.ideology.social, -100, 100) },
    seats: seatCounts[i],
    factions: [],
  }));

  return { country, parties };
}
