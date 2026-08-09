import type { CabinetAppointment, CabinetPortfolio, Politician } from '../models/types';

export const CABINET_PORTFOLIOS: CabinetPortfolio[] = ['finance', 'defense', 'foreignAffairs', 'justice'];

/** Appointing to an already-filled portfolio replaces the previous holder. */
export function appointToCabinet(
  cabinet: CabinetAppointment[],
  portfolio: CabinetPortfolio,
  politicianId: string
): CabinetAppointment[] {
  return [...cabinet.filter((c) => c.portfolio !== portfolio), { portfolio, politicianId }];
}

export function removeFromCabinet(cabinet: CabinetAppointment[], portfolio: CabinetPortfolio): CabinetAppointment[] {
  return cabinet.filter((c) => c.portfolio !== portfolio);
}

export interface CabinetEffects {
  /** Multiplies the difficulty's base economy volatility multiplier — a sharp Finance minister calms the numbers. */
  economyVolatilityMultiplier: number;
  /** Added directly to a war's effective-strength comparison — a sharp Defense minister is worth real strength. */
  warStrengthBonus: number;
  /** Multiplies the difficulty's base corruption detection multiplier — a principled Justice minister catches more, including the player's own. */
  corruptionDetectionMultiplier: number;
  /** 0..1 fraction shaved off the relation penalty for declaring war — a skilled Foreign Affairs minister softens the diplomatic fallout. */
  warDeclarationRelationSoftening: number;
}

const NEUTRAL_CABINET_EFFECTS: CabinetEffects = {
  economyVolatilityMultiplier: 1,
  warStrengthBonus: 0,
  corruptionDetectionMultiplier: 1,
  warDeclarationRelationSoftening: 0,
};

/**
 * A vacant portfolio contributes nothing; a filled one draws its effect
 * from that minister's relevant attribute (1..10 scale). Every effect
 * plugs into a multiplier or addend an existing system already accepts —
 * a cabinet appointment is real math, not flavor text.
 */
export function computeCabinetEffects(cabinet: CabinetAppointment[], politicians: Politician[]): CabinetEffects {
  const effects: CabinetEffects = { ...NEUTRAL_CABINET_EFFECTS };

  for (const appointment of cabinet) {
    const politician = politicians.find((p) => p.id === appointment.politicianId);
    if (!politician) continue;

    switch (appointment.portfolio) {
      case 'finance':
        effects.economyVolatilityMultiplier = 1 - (politician.attributes.intellect / 10) * 0.25;
        break;
      case 'defense':
        effects.warStrengthBonus = politician.attributes.intellect * 1.5;
        break;
      case 'justice':
        effects.corruptionDetectionMultiplier = 1 + (politician.attributes.integrity / 10) * 0.3;
        break;
      case 'foreignAffairs':
        effects.warDeclarationRelationSoftening = (politician.attributes.charisma / 10) * 0.4;
        break;
    }
  }

  return effects;
}
