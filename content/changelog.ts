/**
 * Player-facing patch notes — hand-authored, chronological (newest first),
 * summarizing what actually shipped in plain language. Purely a content
 * pool rendered by ChangelogPanel.tsx; nothing here drives gameplay.
 */
export interface ChangelogEntry {
  version: string;
  title: string;
  highlights: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.16',
    title: 'Optional AI Policy Advisor',
    highlights: [
      'Added an opt-in AI Policy Advisor (off by default, toggle in the Legislation panel): when enabled, each newly enacted law gets a short AI-written analysis and a small, tightly bounded nudge to the economy and your approval — layered on top of the game\'s real, deterministic bill effects, never in place of them.',
      'Runs through a secure server-side proxy so no API key is ever exposed to the browser; the game plays identically, seed-for-seed, whether this is on or off.',
    ],
  },
  {
    version: '0.15',
    title: 'Federalism, the Constitution & the Executive',
    highlights: [
      'Every state now runs its own small legislature alongside its governor, seated by real D\'Hondt math, plus a federal tension score that can flare into interstate disputes — mediate toward one side, or broker a neutral settlement.',
      'Added real constitutional amendments: propose a change to the electoral system, legislative term length, a house rule, or the regime type itself, and it lives or dies on a genuine two-thirds supermajority vote.',
      'Presidential and semi-presidential regimes now have a real executive: a bill that clears the floor vote awaits your signature or veto, a veto can be overridden by the legislature, and you can issue bounded executive orders with no vote at all — on a real cooldown.',
      'Added a Media & Culture Empire: found and grow your own press outlet, fund cultural institutions, and build a national soft-power score that gives your approval a small, sticky tailwind.',
    ],
  },
  {
    version: '0.14',
    title: 'Home Screen, Main Menu & State Governments',
    highlights: [
      'The country map is now the game\'s Home screen, front and center, alongside election results, the parliament hemicycle, campaign promises, and every province\'s own governor.',
      'Added a real main menu: New Game, Load Game, Changelog, and Settings, before you ever touch a save.',
      'Every province/state now elects its own governor on its own staggered schedule, with real approval and incumbency dynamics — independent of the national legislature.',
      'The 3D district map now visibly groups districts under their real province, with a background plate and floating name label per region, instead of one undifferentiated tile carpet.',
    ],
  },
  {
    version: '0.13',
    title: 'Realistic Electorates Worldwide',
    highlights: [
      'Every nation in the world — not just the player\'s own country — now holds genuine per-seat FPTP elections across its own real legislature size.',
      'The 3D globe renders every country subdivided into its own electorate cells, recolored live as elections resolve.',
      'Major performance pass on electorate rendering (native canvas rasterization) — first paint dropped from ~5.7s to ~1.7s.',
    ],
  },
  {
    version: '0.12',
    title: 'Electorate Maps for Every Country',
    highlights: [
      'The player\'s own country (and Australia, as a showcase) now subdivides into real electorate-shaped cells on the 3D globe.',
      'Election night now closes polls, counts results, and recolors the map by which party actually won each seat.',
    ],
  },
  {
    version: '0.11',
    title: 'The Political Update',
    highlights: [
      'Added campaign finance & donors, media ecosystem & disinformation, think tanks, whip discipline & backbench rebellions, international courts & sanctions, political dynasties, and coups/emergency powers.',
    ],
  },
  {
    version: '0.10',
    title: 'World Elections & Career Depth',
    highlights: [
      'Every foreign nation now runs its own scheduled elections.',
      'Career mode deepened: citizen lawmaking before office, a richer local-to-national ladder, and real campaign mechanics.',
    ],
  },
  {
    version: '0.1',
    title: 'Statecraft Launches',
    highlights: [
      'A full legislative engine (bills, whip counts, floor votes), FPTP + D\'Hondt elections, a deterministic economy model, and the core turn loop — the foundation everything since has built on.',
    ],
  },
];
