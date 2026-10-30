/**
 * Minimal server for the PIQ document scan prototype.
 *
 * - Serves the page (public/) and the shared field model (shared/).
 * - POST /api/scan: sends one document to the Claude API and returns the parsed JSON.
 *   The API key stays on the server; the browser never sees it.
 */
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildScanPrompt, parseModelJson } from './shared/scan.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const API_URL = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com') + '/v1/messages';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const PDF_TYPE = 'application/pdf';
const MAX_BASE64_BYTES = 10 * 1024 * 1024; // per-file limit; keep well under the API request limit

const app = express();
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/shared', express.static(path.join(__dirname, 'shared')));

/** Lets the page know whether real reading is available. */
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ai: Boolean(API_KEY), model: API_KEY ? MODEL : null });
});

/**
 * Body: { data: base64 string, mediaType: "image/jpeg" | … | "application/pdf", address?: string }
 * Reply: { result: { doc_type, summary, facts, attach_to, notes } } or { error: { code, message } }
 */
app.post('/api/scan', async (req, res) => {
  const { data, mediaType, address } = req.body || {};
  if (!API_KEY) return fail(res, 503, 'no_api_key', 'The server has no ANTHROPIC_API_KEY.');
  if (typeof data !== 'string' || !data) return fail(res, 400, 'invalid_request', 'No file data.');
  if (![...IMAGE_TYPES, PDF_TYPE].includes(mediaType)) return fail(res, 415, 'unsupported_type', 'Use a JPEG, PNG, WebP, GIF or PDF file.');
  if (data.length > MAX_BASE64_BYTES) return fail(res, 413, 'too_large', 'The file is too large.');

  const fileBlock = mediaType === PDF_TYPE
    ? { type: 'document', source: { type: 'base64', media_type: PDF_TYPE, data } }
    : { type: 'image', source: { type: 'base64', media_type: mediaType, data } };

  try {
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        messages: [{ role: 'user', content: [fileBlock, { type: 'text', text: buildScanPrompt(typeof address === 'string' ? address.slice(0, 300) : '') }] }]
      })
    });
    const body = await r.json().catch(() => null);
    if (!r.ok) {
      const code = r.status === 429 ? 'rate_limited' : r.status === 401 ? 'bad_api_key' : 'upstream_error';
      return fail(res, 502, code, body && body.error && body.error.message ? body.error.message : 'The Claude API returned an error.');
    }
    const text = (body && Array.isArray(body.content) ? body.content : [])
      .filter(b => b.type === 'text').map(b => b.text).join('\n');
    let result;
    try { result = parseModelJson(text); }
    catch (e) { return fail(res, 502, 'invalid_json', 'The reply could not be read as JSON.'); }
    res.json({ result });
  } catch (e) {
    fail(res, 502, 'network_error', 'Could not reach the Claude API.');
  }
});

function fail(res, status, code, message) {
  res.status(status).json({ error: { code, message } });
}

app.listen(PORT, () => {
  console.log(`PIQ document scan running on http://localhost:${PORT}`);
  if (!API_KEY) console.log('No ANTHROPIC_API_KEY set: only the sample documents work, with prepared results.');
});
