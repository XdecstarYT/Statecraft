# Statecraft

A deep political simulation game with a real, deterministic, testable engine — not a chat-driven one. See [`CLAUDE.md`](./CLAUDE.md) for the full project brief.

Every outcome (whip counts, elections, the economy) is resolved by code — weighted math, seeded randomness, real seat-allocation formulas — never by a live model call. Given the same seed and the same player actions, a game replays identically.

## Architecture

```
/engine     — pure TypeScript, zero UI imports, fully unit tested
  /models       data types (Country, Party, Politician, Bill, GameState, ...)
  /systems
    legislative.ts   bill lifecycle, whip-count math, floor votes
    elections.ts     FPTP + party-list PR (D'Hondt) seat math
    economy.ts       per-turn macro indicators with delayed policy effects
  rng.ts        seeded PRNG (mulberry32) — the engine's only source of randomness

/content    — pre-authored data: starter country/parties, NPC name pools, bill templates

/ui         — React app that reads engine state and dispatches actions; contains no game rules
```

## Setup

```bash
npm install
npm run dev       # start the Vite dev server
npm test          # run the engine's Vitest suite
```

## Status

Phase 1 (MVP) is implemented: a starter country ("Republic of Kastoria"), bill drafting through committee/floor with seeded whip-count resolution, FPTP elections, and a turn loop that advances a small deterministic economy with delayed policy effects. See `CLAUDE.md` for the full phase roadmap.
