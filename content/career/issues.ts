import type { IdeologyPosition } from '../../engine/models/types';

/**
 * Pre-authored quick-pick issues for career mode's citizen petitions.
 * Purely a content convenience — attemptCitizenInitiative in career.ts
 * accepts any title/stance, including a fully custom one typed in the UI.
 */
export interface CitizenIssueTemplate {
  id: string;
  title: string;
  description: string;
  stance: IdeologyPosition;
}

export const CITIZEN_ISSUE_TEMPLATES: CitizenIssueTemplate[] = [
  {
    id: 'bike-lanes',
    title: 'Protected Bike Lanes Petition',
    description: 'Demand protected bike lanes along Main Street.',
    stance: { economic: -20, social: 30 },
  },
  {
    id: 'small-biz-relief',
    title: 'Small Business Fee Relief Petition',
    description: 'Push the town council to cut permit fees on small businesses.',
    stance: { economic: 45, social: -10 },
  },
  {
    id: 'rent-stabilization',
    title: 'Rent Stabilization Petition',
    description: 'Cap annual rent increases across the district.',
    stance: { economic: -55, social: 10 },
  },
  {
    id: 'neighborhood-policing',
    title: 'Neighborhood Policing Petition',
    description: 'Fund a dedicated foot-patrol for the district.',
    stance: { economic: 20, social: -35 },
  },
  {
    id: 'save-the-park',
    title: 'Save Riverside Park Petition',
    description: 'Block a proposed sell-off of parkland to developers.',
    stance: { economic: -15, social: 25 },
  },
  {
    id: 'school-levy',
    title: 'Fully Fund Local Schools Petition',
    description: 'Raise the local levy to cover a school budget shortfall.',
    stance: { economic: -35, social: 15 },
  },
  {
    id: 'zoning-reform',
    title: 'Zoning Reform Petition',
    description: 'Allow more housing density near the transit stop.',
    stance: { economic: 30, social: 25 },
  },
  {
    id: 'local-term-limits',
    title: 'Local Term Limits Petition',
    description: 'Cap how long council members can serve consecutively.',
    stance: { economic: 0, social: -20 },
  },
];
