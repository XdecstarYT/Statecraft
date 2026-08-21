import type { EconomyDelta } from '../../engine';

/**
 * A pre-authored executive-order template — real, bounded effects, picked
 * by the player rather than typed freehand, so every order has a
 * consistent, sane magnitude. See engine/systems/executive.ts's
 * issueExecutiveOrder and ExecutivePanel.tsx.
 */
export interface ExecutiveOrderTemplate {
  id: string;
  title: string;
  description: string;
  economyEffect?: EconomyDelta;
  playerApprovalEffect?: number;
}

export const EXECUTIVE_ORDER_TEMPLATES: ExecutiveOrderTemplate[] = [
  {
    id: 'emergency-tariff',
    title: 'Emergency Tariff Order',
    description: 'Unilaterally raises tariffs on a category of imports to protect domestic industry.',
    economyEffect: { gdpGrowth: 0.15, inflation: 0.1 },
    playerApprovalEffect: 1.5,
  },
  {
    id: 'regulatory-freeze',
    title: 'Regulatory Freeze',
    description: 'Halts new business regulation for the remainder of the term, courting industry favor.',
    economyEffect: { gdpGrowth: 0.2, budgetBalance: -0.1 },
    playerApprovalEffect: 1,
  },
  {
    id: 'emergency-relief',
    title: 'Emergency Relief Order',
    description: 'Directs immediate federal relief funds to hard-hit communities without a legislative vote.',
    economyEffect: { budgetBalance: -0.3, unemployment: -0.1 },
    playerApprovalEffect: 3,
  },
  {
    id: 'hiring-freeze',
    title: 'Federal Hiring Freeze',
    description: 'Freezes federal hiring to signal fiscal discipline.',
    economyEffect: { budgetBalance: 0.25, unemployment: 0.05 },
    playerApprovalEffect: -0.5,
  },
  {
    id: 'clemency-order',
    title: 'Clemency Order',
    description: 'Grants clemency to a class of nonviolent offenders, a symbolic exercise of executive mercy.',
    playerApprovalEffect: 2,
  },
  {
    id: 'national-day',
    title: 'Declare a National Day',
    description: 'Declares a new national observance day, a low-stakes but genuine unilateral act.',
    playerApprovalEffect: 0.75,
  },
];
