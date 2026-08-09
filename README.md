# Statecraft

A deep political simulation game with a real, deterministic, testable engine — not a chat-driven one. See [`CLAUDE.md`](./CLAUDE.md) for the full project brief.

Every outcome (whip counts, elections, the economy, corruption, crises) is resolved by code — weighted math, seeded randomness, real seat-allocation formulas — never by a live model call. Given the same seed and the same player actions, a game replays identically.

## Architecture

```
/engine     — pure TypeScript, zero UI imports, fully unit tested
  /models       data types (Country, Party, Politician, Bill, GameState, ...)
  /systems
    legislative.ts   bill lifecycle, whip-count math, floor votes
    elections.ts     FPTP, D'Hondt PR, STV, MMP, two-round runoff, primaries
    economy.ts       per-turn macro indicators with delayed policy effects
    opinion.ts       voter blocs + sticky multi-audience approval
    media.ts         outlet bias -> favorable/neutral/critical framing
    corruption.ts    soft/medium/hard corruption spectrum + scandal severity
    diplomacy.ts     foreign relations + treaty lifecycle
    events.ts        weighted crisis-event tables keyed to live state
    legacy.ts        win-condition scoring + contemporary vs historians' verdict
    npc.ts           rule-based NPC decisions — bill sponsorship, whip stances,
                      relationship dynamics, election momentum (no LLM calls)
    campaign.ts      press interviews + rallies — gives charisma/mediaSavvy/
                      network real mechanical weight, with genuine gaffe risk
  rng.ts        seeded PRNG (mulberry32) — the engine's only source of randomness
  calendar.ts   turn -> Year/Month/Week conversion
  difficulty.ts easy/standard/hard settings with real mechanical effects

/content    — pre-authored data: two starter countries (parliamentary/FPTP and
              presidential/PR), voter blocs, media outlets, NPC name pools,
              bill/headline/corruption templates, treaty templates, foreign
              counterparts, the crisis-event table

/ui         — React app that reads engine state and dispatches actions; contains no
              game rules. ui/persistence.ts handles localStorage save/load (kept out
              of /engine, which stays framework/browser-free).
```

## Setup

```bash
npm install
npm run dev       # start the Vite dev server
npm test          # run the engine's Vitest suite
npm run build     # production build (code-split; recharts loads as its own chunk)
```

## Status

All of CLAUDE.md's four build phases are implemented, plus two more:

- **Phase 1** — legislative engine (bill lifecycle, whip counting, floor votes), FPTP + D'Hondt elections, a deterministic economy with delayed policy effects, and the core turn-loop UI.
- **Phase 2** — voter-bloc opinion modeling with sticky multi-audience approval, a media system with outlet bias framing, and STV/MMP/two-round-runoff/primary electoral systems.
- **Phase 3** — a corruption/patronage/favor-bank system, international relations with a treaty lifecycle, and a weighted crisis/event engine keyed to live game state.
- **Phase 4** — win-condition/legacy scoring (with a contemporary verdict that can diverge from the historians' verdict), an easy/standard/hard difficulty setting with real mechanical effects, localStorage save/load, and UI polish.
- **Phase 5** — rule-based NPC AI: rivals sponsor and whip their own bills, relationships shift from how the floor votes line up, and the player's own approval feeds back into their party's election performance.
- **Phase 6** — a second starter country (presidential regime, PR legislature), broader content pools, an onboarding banner, a mobile-responsive layout, and a code-split production build.

The UI was later reworked into a compact, dark, tab-based single-page app (Dashboard always visible, six switchable tabs beneath it instead of a long scroll), and campaign actions (press interviews, rallies) were added to give the charisma/mediaSavvy/network attributes real gameplay weight.

206 Vitest tests cover the engine layer.
