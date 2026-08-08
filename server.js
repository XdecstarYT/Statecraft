require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = process.env.STATECRAFT_MODEL || 'claude-opus-5';
const PORT = process.env.PORT || 3000;
const MAX_TOKENS = 8000;

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, 'system-prompt.md'),
  'utf8'
);

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return null;
  const cleaned = [];
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) return null;
    if (typeof m.content !== 'string' || !m.content.length) return null;
    cleaned.push({ role: m.role, content: m.content });
  }
  if (!cleaned.length || cleaned[0].role !== 'user') return null;
  return cleaned;
}

app.post('/api/chat', async (req, res) => {
  const messages = sanitizeMessages(req.body && req.body.messages);
  if (!messages) {
    res.status(400).json({ error: 'Invalid messages payload.' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    });

    stream.on('text', (delta) => {
      send('delta', { text: delta });
    });

    stream.on('error', (err) => {
      console.error('Stream error:', err);
      send('error', { message: err.message || 'Stream error.' });
    });

    const finalMessage = await stream.finalMessage();
    const stopReason = finalMessage.stop_reason;

    if (stopReason === 'refusal') {
      send('error', {
        message:
          'The model declined to continue this turn. Try rephrasing your action.',
      });
    }

    send('done', { stop_reason: stopReason });
  } catch (err) {
    console.error('Chat request failed:', err);
    send('error', { message: err.message || 'Request failed.' });
  } finally {
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Statecraft running at http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn(
      'Warning: ANTHROPIC_API_KEY is not set. Set it in your environment or a .env file before playing.'
    );
  }
});
