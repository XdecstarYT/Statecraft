import type { SocialPostAuthorType } from '../../engine/models/types';

/**
 * Pre-authored Chirp personas — a fixed cast (like Endorsers/PollingFirms
 * elsewhere in /content) rather than randomly generated each game, so the
 * feed reads as a consistent recurring cast of characters run over run.
 */
export interface SocialPersona {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  authorType: SocialPostAuthorType;
}

export const PERSONAS: SocialPersona[] = [
  { id: 'pundit-1', name: 'Marcus Feld', handle: '@marcusfeld', avatar: '🎙️', authorType: 'pundit' },
  { id: 'pundit-2', name: 'Rosa Whitfield', handle: '@rosawhitfield', avatar: '📺', authorType: 'pundit' },
  { id: 'pundit-3', name: 'The Daily Take', handle: '@dailytake', avatar: '🗞️', authorType: 'pundit' },
  { id: 'journalist-1', name: 'Priya Nakamura', handle: '@pnakamura_news', avatar: '📰', authorType: 'journalist' },
  { id: 'journalist-2', name: 'Tomas Reyk', handle: '@tomasreyk', avatar: '🎥', authorType: 'journalist' },
  { id: 'journalist-3', name: 'Capital Wire', handle: '@capitalwire', avatar: '🏛️', authorType: 'journalist' },
  { id: 'citizen-1', name: 'Dana K.', handle: '@dana_speaks', avatar: '🙋', authorType: 'citizen' },
  { id: 'citizen-2', name: 'Old Man Torres', handle: '@torres_says', avatar: '👴', authorType: 'citizen' },
  { id: 'citizen-3', name: 'a concerned mom', handle: '@justamom4', avatar: '👩', authorType: 'citizen' },
  { id: 'citizen-4', name: 'econ_nerd', handle: '@econ_nerd', avatar: '🤓', authorType: 'citizen' },
  { id: 'citizen-5', name: 'Small Biz Sam', handle: '@smallbizsam', avatar: '🏪', authorType: 'citizen' },
  { id: 'rival-1', name: 'Opposition Whip', handle: '@oppositionwhip', avatar: '⚔️', authorType: 'rival' },
  { id: 'rival-2', name: 'Backbench Truth', handle: '@backbenchtruth', avatar: '🗳️', authorType: 'rival' },
  { id: 'meme-1', name: 'PoliticsMemesDaily', handle: '@polimemes', avatar: '😂', authorType: 'meme' },
  { id: 'meme-2', name: 'unserious poster', handle: '@unseriousposter', avatar: '🤡', authorType: 'meme' },
];

export function personasByType(authorType: SocialPostAuthorType): SocialPersona[] {
  return PERSONAS.filter((p) => p.authorType === authorType);
}
