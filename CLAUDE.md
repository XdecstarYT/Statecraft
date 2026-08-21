# STATECRAFT — Claude Code Project Brief

**How to use this:** Save this file as `CLAUDE.md` in your project root — Claude Code reads it automatically at the start of every session. Or just paste it as your first message in a new Claude Code session.

This is the build spec for **Statecraft**, a deep political simulation web game. This is a coded implementation, not a chat-driven one.

---

## 0. NON-NEGOTIABLES — read before writing any code

- **No runtime LLM/AI API calls in gameplay logic.** Every outcome — whip counts, elections, economic shifts, events, NPC decisions — must be resolved by real code: math, weighted tables, deterministic rules, seeded randomness. Nothing gets "decided" by prompting a model mid-game.
  - **One deliberate, narrow exception:** the optional AI Bill Analysis feature (see `engine/systems/aiPolicyAnalysis.ts`, `netlify/functions/ai-bill-analysis.mts`, `ui/ai/policyAdvisor.ts`). When enabled by the player (off by default, a per-browser `localStorage` toggle in `ui/persistence.ts`, never part of `GameState`), an already-enacted law gets one Groq LLM call — proxied server-side through a Netlify Function so the API key never reaches the client — for a short narrative and a small numeric nudge to the economy/approval. That nudge is clamped to a tight bound (`AI_ECONOMY_ADJUSTMENT_BOUND`, `AI_APPROVAL_ADJUSTMENT_BOUND` in `aiPolicyAnalysis.ts`) and applied **on top of** the bill's already-computed deterministic effect, never in place of it. Because it's a real network call, it is **not** part of the seeded-replay guarantee below — the deterministic core is unaffected and remains the sole path when the feature is off, unreachable, or fails. Do not let this exception creep: no other system may make a runtime AI call without the same explicit flagging and the same "off by default, additive-only, clamped, replay-independent" treatment.
- **Pre-authored content is fine and expected.** NPC name pools, flavor text banks, event description templates, press quote templates — write these as data files and assemble them with code (string templating, weighted selection). This is how you get variety without a live model call.
- **Every random outcome must be reproducible.** Use a single seeded PRNG for the whole game session (e.g., mulberry32 or xorshift — do NOT use `Math.random()` anywhere in game logic). Given the same seed and the same player actions, the game must replay identically. This is essential for debugging and for testing.
- **Game logic and UI are strictly separated.** The engine must be plain, framework-free TypeScript that could theoretically run in a Node script with zero UI. The UI layer only reads engine state and dispatches player actions — it never contains rules.
- **Single-player, local-first for now.** No auth, no multiplayer, no server-required save system for the MVP. Get it fully playable in a browser tab first.

---

## 1. RECOMMENDED STACK

- **Frontend:** React + TypeScript, built with Vite
- **State:** engine state lives in a plain TS object/class tree; React just subscribes to it (Zustand or plain Context is enough — don't reach for Redux)
- **Persistence:** `localStorage` save/load of a serialized `GameState` JSON blob is sufficient for MVP. No backend needed yet.
- **Charts:** Recharts for the economy/approval trend lines; plain HTML tables for whip counts and seat allocations (numbers need to be exact and readable, not stylized)
- **Testing:** Vitest for the `/engine` layer — this project lives or dies on whether the election math and whip logic are actually correct, so these get unit tests, not just eyeballing

If you (Claude Code) think a different stack serves this better, propose it and explain the tradeoff before switching — don't silently deviate from this without flagging it.

---

## 2. ARCHITECTURE

```
/engine              — pure TypeScript, zero UI imports. THE core deliverable.
  /models             — data types (Country, Party, Politician, Bill, GameState, etc.)
  /systems
    legislative.ts    — bill lifecycle, whip counting, floor votes
    elections.ts      — FPTP, D'Hondt, STV, MMP, two-round math
    economy.ts        — macro indicators, lag queue, policy effects
    opinion.ts        — voter blocs, multi-audience approval
    npc.ts            — NPC decision-making (rule-based, not LLM)
    events.ts         — weighted random event tables
  rng.ts              — seeded PRNG, single source of randomness
  engine.test.ts      — Vitest suite

/content              — data, not code
  countries/           — starter country templates
  names/                — NPC name pools by locale
  flavor/               — event/press text templates with slot variables

/ui                   — React app; reads /engine state, renders it, sends actions back
```

---

## 3. BUILD PHASES — ship playable slices, don't build all 15 systems at once

### Phase 1 (MVP — build this first, all the way to playable)
- **Legislative engine:** bill data model with provisions; whip-count algorithm (see §5); floor vote resolution against a regime's actual threshold rules (simple majority to start)
- **Elections engine:** FPTP districts + party-list PR via D'Hondt — both with real, correct seat math
- **Economy model:** a small deterministic system (§5) — a handful of indicators, policies push delayed effects, some exogenous drift/noise
- **Minimal UI:** turn loop, an action panel, a state dashboard showing the numbers live
- **Definition of done:** starting a new game, proposing and whipping a bill to a real pass/fail floor vote, running an election with correct seat allocation, and watching the economy dashboard move plausibly turn over turn — all with zero placeholder/fake numbers.

### Phase 2
- Voter bloc opinion model + multi-audience approval tracking
- Media system: static outlet bias profiles + templated framing text per event
- Additional electoral systems: STV, MMP, two-round runoff, primaries

### Phase 3
- Corruption/patronage/favor-bank system
- International relations (simple relation scores + treaty effects)
- Crisis/event engine — weighted random tables keyed to current state (fragile economy → higher recession-event weight, etc.)

### Phase 4
- Win conditions and legacy scoring
- Save/load polish, a realism/difficulty setting, UI polish

**Stop and check in with the user at the end of each phase before starting the next one.**

---

## 4. CORE DATA MODELS (starting point — refine as needed)

```typescript
interface Politician {
  id: string;
  name: string;
  isPlayer: boolean;
  ideology: { economic: number; social: number; }; // -100 to 100 axes
  attributes: { charisma: number; intellect: number; integrity: number;
                network: number; mediaSavvy: number; };
  partyId: string;
  approval: { public: number; base: number; partyElite: number; };
}

interface Party {
  id: string;
  name: string;
  ideology: { economic: number; social: number; };
  seats: number;
  factions: { name: string; ideologyOffset: number; size: number; }[];
}

interface Bill {
  id: string;
  title: string;
  provisions: { id: string; description: string; budgetImpact: number; }[];
  sponsorId: string;
  status: 'drafting' | 'committee' | 'floor' | 'passed' | 'failed' | 'vetoed';
  whipCount: Record<string, 'yes' | 'no' | 'undecided'>; // politicianId -> stance
}

interface EconomyState {
  gdpGrowth: number; inflation: number; unemployment: number;
  debtToGdp: number; budgetBalance: number;
  pendingEffects: { turnsRemaining: number; delta: Partial<EconomyState> }[];
}

interface GameState {
  seed: number;
  turn: number;
  country: Country;
  politicians: Politician[];
  parties: Party[];
  bills: Bill[];
  economy: EconomyState;
  relationships: Record<string, number>; // "idA:idB" -> disposition -100..100
}
```

---

## 5. CORE ALGORITHMS — implement these as real math, not vibes

**Whip count resolution** — for each undecided member on a bill:
```
supportScore = w1 * (1 - ideologicalDistance(member, bill) / maxDistance)
             + w2 * (relationship[player][member] / 100)
             + w3 * partyLineBonus(member.party, bill.sponsorParty)
             + w4 * (favorBank[member] / maxFavors)
probability = sigmoid(supportScore)
vote = seededRandom() < probability ? 'yes' : 'no'
```
Tune weights so relationship and favors matter but can't fully override deep ideological opposition.

**D'Hondt seat allocation** (party-list PR):
```
for each seat to allocate:
  for each party: quotient = votes[party] / (seatsWonSoFar[party] + 1)
  award seat to party with highest quotient
```

**FPTP**: per district, highest vote count wins the seat. Simple, but get turnout/vote-share generation right per district before aggregating.

**Economy update per turn**:
```
baseline = smallExogenousDrift(seed, turn)
appliedEffects = sum of pendingEffects where turnsRemaining == 0
economy = economy + baseline + appliedEffects + noise(seed)
newPolicyEffects get pushed onto pendingEffects with a 2-6 turn delay, not applied immediately
```

**Approval update**: move current approval toward a "target" implied by recent weighted events, at a decay rate — don't let single events cause instant large jumps; approval should feel sticky.

---

## 6. EXPLICIT NON-GOALS FOR MVP

- No multiplayer, no accounts/auth
- No live LLM calls anywhere in the play loop
- No real-money mechanics
- No mobile app packaging — responsive web is enough

---

## 7. INSTRUCTIONS TO CLAUDE CODE

1. Read this entire file before writing code.
2. Build `/engine` first, with tests, before touching `/ui`. A correct engine with no UI is a real milestone; a pretty UI over broken math is not.
3. Get Phase 1's definition of done fully working and tested before starting Phase 2.
4. If a spec here is ambiguous or you think a different approach is meaningfully better, say so and propose the alternative — don't just silently pick one.
5. Commit in small, working increments rather than one giant unreviewable dump.
