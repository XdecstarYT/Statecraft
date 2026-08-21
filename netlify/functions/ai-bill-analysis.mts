// Netlify serverless function: proxies a single Groq chat-completion request
// server-side so the Groq API key never reaches the browser bundle.
//
// This is the one deliberate, flagged exception to Statecraft's "no runtime
// LLM calls in gameplay logic" rule (see CLAUDE.md). It ONLY produces a
// narrative + a small suggested numeric adjustment for an already-passed
// bill; the deterministic engine (engine/systems/aiPolicyAnalysis.ts) clamps
// and applies that adjustment on top of the bill's real, already-computed
// effect. The game is fully playable with this disabled or failing.

interface RequestBody {
  billTitle?: string;
  billDescription?: string;
  provisions?: string[];
  countryName?: string;
}

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `You are a nonpartisan legislative policy analyst for a political simulation game. Given a bill's title, description, and provisions, respond ONLY with a JSON object with these exact fields:
{
  "narrative": "2-4 sentence plain-language analysis of likely real-world effects (string, max ~500 characters)",
  "gdpGrowth": number (small, between -1.5 and 1.5, percentage-point nudge),
  "inflation": number (small, between -1.5 and 1.5),
  "unemployment": number (small, between -1.5 and 1.5),
  "debtToGdp": number (small, between -1.5 and 1.5),
  "budgetBalance": number (small, between -1.5 and 1.5),
  "playerApprovalEffect": number (small, between -5 and 5)
}
Keep every numeric field small and realistic — these are minor nudges on top of a simulation that already computed the bill's primary effects, not the whole effect. Do not include any text outside the JSON object.`;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return jsonResponse(503, { error: 'AI analysis is not configured on this deployment.' });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const billTitle = typeof body.billTitle === 'string' ? body.billTitle.slice(0, 200) : '';
  const billDescription = typeof body.billDescription === 'string' ? body.billDescription.slice(0, 500) : '';
  const provisions = Array.isArray(body.provisions)
    ? body.provisions.filter((p): p is string => typeof p === 'string').slice(0, 20).map((p) => p.slice(0, 300))
    : [];
  const countryName = typeof body.countryName === 'string' ? body.countryName.slice(0, 100) : 'the country';

  if (!billTitle) {
    return jsonResponse(400, { error: 'billTitle is required' });
  }

  const userPrompt = `Country: ${countryName}
Bill title: ${billTitle}
Description: ${billDescription || '(none provided)'}
Provisions:
${provisions.length > 0 ? provisions.map((p) => `- ${p}`).join('\n') : '(none listed)'}`;

  let groqResponse: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      groqResponse = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 500,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    return jsonResponse(502, { error: 'Failed to reach AI provider', detail: err instanceof Error ? err.message : String(err) });
  }

  if (!groqResponse.ok) {
    return jsonResponse(502, { error: `AI provider returned ${groqResponse.status}` });
  }

  let groqData: any;
  try {
    groqData = await groqResponse.json();
  } catch {
    return jsonResponse(502, { error: 'AI provider returned invalid JSON' });
  }

  const content = groqData?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    return jsonResponse(502, { error: 'AI provider response missing content' });
  }

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    return jsonResponse(502, { error: 'AI provider content was not valid JSON' });
  }

  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

  return jsonResponse(200, {
    narrative: typeof parsed.narrative === 'string' ? parsed.narrative : '',
    economyEffect: {
      gdpGrowth: num(parsed.gdpGrowth),
      inflation: num(parsed.inflation),
      unemployment: num(parsed.unemployment),
      debtToGdp: num(parsed.debtToGdp),
      budgetBalance: num(parsed.budgetBalance),
    },
    playerApprovalEffect: num(parsed.playerApprovalEffect),
  });
};
