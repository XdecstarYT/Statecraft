# Statecraft

A browser chat client for [The Statecraft Engine](system-prompt.md) — a deep political simulation run entirely by Claude acting as Game Master. The app is a thin shell: a Node/Express backend proxies chat requests to the Claude API (streaming responses back over SSE), and a single-page vanilla JS frontend handles the chat UI, multiple saved games, and quick-command shortcuts. All game state (message history) lives in your browser's `localStorage` — there is no database.

## Setup

```bash
npm install
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY=sk-ant-...
npm start
```

Then open http://localhost:3000.

## How it works

- `system-prompt.md` is sent as the system prompt on every request — it's the full Statecraft Engine master prompt, unmodified.
- `server.js` exposes `POST /api/chat`, which takes the full message history from the browser, calls the Claude API with streaming enabled, and streams text deltas back as Server-Sent Events.
- `public/index.html` is the entire frontend: sidebar for managing multiple games, a chat window, and quick-command buttons for the engine's built-in commands (`/status`, `/brief`, `/whip`, etc.).
- Nothing is persisted server-side. Each browser's `localStorage` holds its own saved games; clearing site data erases them.

## Notes

- The model defaults to `claude-opus-5`. Override with `STATECRAFT_MODEL` in `.env` if you want a different model.
- Since the API is stateless, the full conversation is resent on every turn — long-running games will eventually accumulate a large history. Anthropic's prompt caching is enabled on the system prompt to keep that affordable.
