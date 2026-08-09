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
  rng.ts        seeded PRNG (mulberry32) — the engine's only source of randomness
  calendar.ts   turn -> Year/Month/Week conversion
  difficulty.ts easy/standard/hard settings with real mechanical effects

/content    — pre-authored data: starter country/parties, voter blocs, media outlets,
              NPC name pools, bill/headline/corruption templates, treaty templates,
              foreign counterparts, the crisis-event table

/ui         — React app that reads engine state and dispatches actions; contains no
              game rules. ui/persistence.ts handles localStorage save/load (kept out
              of /engine, which stays framework/browser-free).
```

## Setup

```bash
npm install
npm run dev       # start the Vite dev server
npm test          # run the engine's Vitest suite
```

## Status

All four build phases from `CLAUDE.md` are implemented:

- **Phase 1** — legislative engine (bill lifecycle, whip counting, floor votes), FPTP + D'Hondt elections, a deterministic economy with delayed policy effects, and the core turn-loop UI.
- **Phase 2** — voter-bloc opinion modeling with sticky multi-audience approval, a media system with outlet bias framing, and STV/MMP/two-round-runoff/primary electoral systems.
- **Phase 3** — a corruption/patronage/favor-bank system, international relations with a treaty lifecycle, and a weighted crisis/event engine keyed to live game state.
- **Phase 4** — win-condition/legacy scoring (with a contemporary verdict that can diverge from the historians' verdict), an easy/standard/hard difficulty setting with real mechanical effects, localStorage save/load, and UI polish (a difficulty picker, save/load controls, an anchored nav bar).

167 Vitest tests cover the engine layer.
