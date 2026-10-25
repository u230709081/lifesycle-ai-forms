/**
 * Document scan logic shared by the server and the browser:
 * the prompt sent with each document, and the cleaning of what comes back.
 */
import { CAT, FACT, FILE_FIELDS } from './fields.js';

/** Compare two answers loosely (case, apostrophes, spacing, arrays). */
export const norm = v => (Array.isArray(v) ? v.join(',') : String(v == null ? '' : v))
  .toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();

/** One line per fillable field: key | where it sits › question | type | options | condition. */
export function catalogue() {
  return [...CAT.values()].map(f => {
    const opts = f.o && (f.kind === 'choice' || f.kind === 'multi') ? ' | options: ' + f.o.join(' / ') : '';
    const cond = f.ws.length ? ' | only if ' + f.ws.map(w => w.text).filter(Boolean).join(' and ') : '';
    return f.k + ' | ' + f.ctx + ' › ' + f.q + ' | ' + f.kind + opts + cond;
  }).join('\n');
}

/** The instruction sent alongside one document (image or PDF). */
export function buildScanPrompt(address) {
  const files = FILE_FIELDS.map(f => f.k + ' | ' + f.ctx + ' › ' + f.q).join('\n');
  return [
    'The attached file is a photo, scan or PDF of a document that a UK home seller uploaded while filling in a Property Information Questionnaire' + (address ? ' for: ' + address : '') + '.',
    '',
    'Tasks:',
    '1. doc_type: what the document is, in a few words. summary: one sentence with its key dates and details.',
    '2. facts: answers to the fields below that the document clearly supports.',
    '3. attach_to: keys of the upload fields where this document belongs (can be empty).',
    '4. notes: up to 2 short sentences about anything important that fits no field.',
    '',
    'Rules:',
    '- Use only what is printed on the document. If it is unreadable or about a different property, say so in notes and give facts only with confidence "low".',
    '- choice: the value must be exactly one of the listed options. multi: a JSON array of listed options.',
    '- year: 4 digits. date: YYYY-MM-DD. money and percent: a number only. text: a short plain-English answer.',
    '- confidence: "high" if printed clearly, "medium" if it follows from what is printed, "low" if unsure.',
    '- evidence: the words on the document that support the answer, at most 12 words.',
    '',
    'Fields (key | where it sits › question | type | options | condition):',
    catalogue(),
    '',
    'Upload fields (key | where it sits › question):',
    files,
    '',
    'Reply with only a JSON object in this shape, and nothing else:',
    '{"doc_type":"…","summary":"…","facts":[{"k":"heating_installed_year","v":"2016","confidence":"high","evidence":"Date of installation: 14 June 2016"}],"attach_to":["gas_safe_certificate"],"notes":[]}'
  ].join('\n');
}

/** Pull the JSON object out of the model's reply (tolerates code fences or stray text). */
export function parseModelJson(text) {
  const t = String(text || '').replace(/```(?:json)?/gi, '').trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('No JSON object in the reply');
  return JSON.parse(t.slice(a, b + 1));
}

/**
 * Keep only valid answers: known field keys, option values that exist,
 * well-formed years, dates and numbers. Returns facts, attachments and notes.
 */
export function normalizeScanResult(res, docName) {
  const arr = res && Array.isArray(res.facts) ? res.facts : [];
  const facts = [];
  arr.forEach(x => {
    if (!x || typeof x !== 'object') return;
    const f = CAT.get(String(x.k)); if (!f) return;
    let v = x.v; if (v == null) return;
    if (f.kind === 'choice') { v = f.o.find(o => norm(o) === norm(v)); if (!v) return; }
    else if (f.kind === 'multi') { const vs = (Array.isArray(v) ? v : [v]).map(y => f.o.find(o => norm(o) === norm(y))).filter(Boolean); if (!vs.length) return; v = [...new Set(vs)]; }
    else if (f.kind === 'year') { const m = String(v).match(/\d{4}/); if (!m) return; v = m[0]; }
    else if (f.kind === 'date') { v = String(v).trim(); if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return; }
    else if (f.kind === 'money' || f.kind === 'percent' || f.kind === 'number') { const n = parseFloat(String(v).replace(/[^0-9.]/g, '')); if (!isFinite(n)) return; v = String(n); }
    else { v = String(v).trim().slice(0, 600); if (!v) return; }
    const conf = ['high','medium','low'].includes(x.confidence) ? x.confidence : 'medium';
    facts.push({ k:f.k, v, conf, ev:String(x.evidence || '').trim().slice(0, 160), doc:docName });
  });
  const attach = (res && Array.isArray(res.attach_to) ? res.attach_to : [])
    .map(k => FACT.get(String(k))).filter(f => f && f.t === 'file')
    .map(f => ({ k:f.k, v:[docName], conf:'high', ev:'', doc:docName, attach:true }));
  const notes = res && Array.isArray(res.notes) ? res.notes.map(n => String(n).trim()).filter(Boolean).slice(0, 3) : [];
  return {
    docType: res && res.doc_type ? String(res.doc_type).slice(0, 80) : '',
    summary: res && res.summary ? String(res.summary).slice(0, 240) : '',
    facts, attach, notes
  };
}
