import type { EconomyDelta } from '../../engine';

/**
 * Client-side wrapper around the /.netlify/functions/ai-bill-analysis proxy.
 * Lives in /ui, not /engine, because it does real network I/O — the engine
 * stays framework/network-free per CLAUDE.md. Never talks to Groq directly:
 * the API key only ever lives server-side in the Netlify function.
 */

export interface AiBillAnalysisRequest {
  billTitle: string;
  billDescription?: string;
  provisions?: string[];
  countryName?: string;
}

export interface AiBillAnalysisResponse {
  narrative: string;
  economyEffect: EconomyDelta;
  playerApprovalEffect: number;
}

export interface AiBillAnalysisResult {
  ok: boolean;
  data?: AiBillAnalysisResponse;
  error?: string;
}

const ENDPOINT = '/.netlify/functions/ai-bill-analysis';
const REQUEST_TIMEOUT_MS = 20000;

export async function requestAiBillAnalysis(req: AiBillAnalysisRequest): Promise<AiBillAnalysisResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
    if (!response.ok) {
      let message = `AI analysis unavailable (${response.status})`;
      try {
        const body = await response.json();
        if (typeof body?.error === 'string') message = body.error;
      } catch {
        // ignore — use the generic message above
      }
      return { ok: false, error: message };
    }
    const data = (await response.json()) as AiBillAnalysisResponse;
    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error && err.name === 'AbortError' ? 'AI analysis timed out' : 'AI analysis request failed';
    return { ok: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}
