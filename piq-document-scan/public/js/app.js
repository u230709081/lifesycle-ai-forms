/**
 * PIQ document scan: the page.
 *
 * Flow: the seller adds a photo or PDF → the server sends it to Claude → the
 * answers it finds are matched to PIQ fields → the seller confirms, changes or
 * rejects each one → confirmed answers are output as JSON for the form.
 */
import { SECTIONS, FACT, ORDER, factFor } from '/shared/fields.js';
import { norm, normalizeScanResult } from '/shared/scan.js';
import { SAMPLE_DOCS, drawSample } from './samples.js';

/** In Lifesycle this comes from the property record. */
const PROPERTY_ADDRESS = '22 East Hanningfield Road, Rettendon Common, Chelmsford, Essex, CM3 8EQ';
const STORE = 'piq-doc-scan-v1';
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const PDF_TYPE = 'application/pdf';
const MAX_PDF_BYTES = 7 * 1024 * 1024;   // ~10 MB once base64-encoded
const MAX_IMAGE_SIDE = 2000;             // photos are resized before upload

const HELPFUL = [
  ['Title register and title plan from HM Land Registry', 'owners, tenure, restrictions, boundaries and the lease end date'],
  ['Energy Performance Certificate', 'heating, construction and the EPC upload'],
  ['Planning permissions and Building Regulations completion certificates', 'extensions, conversions and other alterations'],
  ['FENSA, CERTASS or other competent person certificate', 'windows and doors replaced since April 2002'],
  ['Gas Safe or boiler installation certificate and the latest service record', 'when the heating was installed and serviced'],
  ['Electrical certificates', 'test reports and certificates for electrical work since January 2005'],
  ['Recent energy, water and council tax bills', 'suppliers, connected services and the council tax band'],
  ['Guarantees and warranties', 'NHBC or other new-build warranties, damp, timber, glazing and heating work'],
  ['Solar panel paperwork', 'the MCS certificate, FIT or SEG statements and any roof lease, if there are panels'],
  ['Lease and management pack (LPE1)', 'ground rent, service charge and managing agent, if the property is leasehold'],
  ['Septic tank or treatment plant records', 'type, location and when it was last emptied, if not on a mains sewer'],
  ['Notices and specialist reports', 'party wall notices, tree preservation orders, a Japanese knotweed management plan or a radon test']
];

const ERR = {
  no_api_key: 'The server has no Claude API key. Add ANTHROPIC_API_KEY to the .env file and restart it.',
  bad_api_key: 'The Claude API key was rejected. Check ANTHROPIC_API_KEY.',
  rate_limited: 'Too many requests right now. Wait a minute, then try again.',
  invalid_json: 'The result couldn’t be read. Try again.',
  unsupported_type: 'This file type can’t be read. Use a JPEG, PNG, WebP, GIF or PDF file.',
  too_large: 'This file is too large. Try a smaller one.',
  upstream_error: 'The Claude API returned an error. Try again.',
  network_error: 'The Claude API couldn’t be reached. Try again.'
};

const $ = s => document.querySelector(s);
function h(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
const byOrder = (a, b) => (ORDER.has(a.k) ? ORDER.get(a.k) : 0) - (ORDER.has(b.k) ? ORDER.get(b.k) : 0);

function fmt(v, f) {
  if (Array.isArray(v)) return v.join(', ');
  const kind = f && (f.kind || f.t);
  if (kind === 'money') { const n = Number(v); return '£' + (isFinite(n) ? n.toLocaleString('en-GB') : v); }
  if (kind === 'percent') return v + '%';
  if (kind === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(v)) { const d = new Date(v + 'T00:00:00'); if (!isNaN(d)) return d.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }); }
  return String(v);
}
function srcTag(src) {
  const t = h('span', 'src'); if (!src) return t;
  if (src === 'new') { t.textContent = 'New'; t.classList.add('src-new'); t.title = 'Not in the original form'; }
  else { t.textContent = src.split(',').map(s => s.trim()).join(' + '); t.title = 'Question number in the original PIQ'; }
  return t;
}

/* ---------- state ---------- */
// RES: one entry per field: { k, v, conf, ev, doc, attach?, also?, conflict?, edited?, status: 'pending' | 'confirmed' }
let RES = [], NOTES = [], DOCS = [], docSeq = 0, docBusy = false;
try {
  const s = JSON.parse(localStorage.getItem(STORE) || 'null');
  if (s && typeof s === 'object') {
    RES = Array.isArray(s.RES) ? s.RES.filter(r => r && factFor(r.k)) : [];
    NOTES = Array.isArray(s.NOTES) ? s.NOTES : [];
    DOCS = Array.isArray(s.DOCS) ? s.DOCS.map(d => Object.assign({}, d, { id:++docSeq, file:null, url:null, status:d.status === 'done' ? 'done' : 'error', msg:d.status === 'done' ? d.msg : 'Interrupted. Add the file again.' })) : [];
  }
} catch (e) {}
function save() {
  try {
    localStorage.setItem(STORE, JSON.stringify({ RES, NOTES,
      DOCS:DOCS.map(d => ({ name:d.name, isPdf:d.isPdf, type:d.type, summary:d.summary, found:d.found, attached:d.attached, status:d.status, msg:d.msg, prepared:d.prepared })) }));
  } catch (e) {}
}

/* ---------- server ---------- */
let AI = false, aiChecked = false;
const S = {};
const aiInit = fetch('/api/health').then(r => r.json()).then(j => { AI = Boolean(j && j.ai); }).catch(() => { AI = false; })
  .finally(() => { aiChecked = true; renderAvail(); });

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
/** PDFs go as they are; photos are resized to a sensible size first. */
async function prepareUpload(file) {
  if (file.type === PDF_TYPE) return { data: await blobToBase64(file), mediaType: PDF_TYPE };
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return { data: await blobToBase64(file), mediaType: file.type };
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bmp.width, bmp.height));
  if (scale === 1 && file.size < 4 * 1024 * 1024) return { data: await blobToBase64(file), mediaType: file.type };
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.88));
  return { data: await blobToBase64(blob), mediaType: 'image/jpeg' };
}
async function scanOnServer(file, signal) {
  const body = Object.assign(await prepareUpload(file), { address: PROPERTY_ADDRESS });
  const r = await fetch('/api/scan', { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify(body), signal });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j || !j.result) throw { code: j && j.error ? j.error.code : 'upstream_error' };
  return j.result;
}

/* ---------- results ---------- */
const RANK = { low:0, medium:1, high:2 };
function addResult(p) {
  const ex = RES.find(r => r.k === p.k);
  if (!ex) { RES.push(Object.assign({ status:'pending' }, p)); return; }
  if (p.attach) { ex.v = [...new Set(ex.v.concat(p.v))]; return; }
  if (norm(ex.v) === norm(p.v)) {   // two documents agree
    if (ex.doc !== p.doc) ex.also = [...new Set((ex.also || []).concat(p.doc))];
    if (RANK[p.conf] > RANK[ex.conf] && ex.conflict == null) ex.conf = p.conf;
    return;
  }
  // two documents disagree: keep the new one, remember the old one
  RES[RES.indexOf(ex)] = Object.assign({ status:'pending' }, p, { conf:'low', conflict:{ v:ex.v, doc:ex.edited ? 'you' : ex.doc, prev:Object.assign({}, ex) } });
}

/* ---------- page ---------- */
function build() {
  const root = $('#scan'); const wrap = h('div', 'narrow');
  const head = h('div', 'sec-head'); head.id = 'step-upload';
  head.append(h('h2', 'sec-title', 'Scan your documents'),
    h('p', 'sec-intro', 'Take a photo of a certificate, bill or letter, or add a PDF. We read it, find the answers it gives to the questionnaire and work out where the document itself should be attached. You check every answer before it goes into the form.'));
  wrap.append(head);
  const inp = h('input', 'drop-in'); inp.type = 'file'; inp.id = 'docIn'; inp.multiple = true; inp.accept = IMAGE_TYPES.concat(PDF_TYPE).join(',');
  const drop = h('label', 'drop'); drop.htmlFor = 'docIn';
  drop.append(h('strong', '', 'Take a photo or choose files'), h('span', '', 'JPEG, PNG, WebP, GIF or PDF.'));
  inp.addEventListener('change', () => { addFiles([...inp.files]); inp.value = ''; });
  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('is-over'); }));
  drop.addEventListener('drop', e => { if (e.dataTransfer && e.dataTransfer.files) addFiles([...e.dataTransfer.files]); });
  const acts = h('div', 'actions'); acts.append(h('span', 'q-hint', 'No documents to hand? Try a sample:'));
  SAMPLE_DOCS.forEach(sd => { const b = h('button', 'btn btn-quiet btn-sm', sd.label); b.type = 'button'; b.addEventListener('click', () => addSample(sd)); acts.append(b); });
  const avail = h('p', 'q-note');
  const list = h('div', 'doclist');
  const results = h('section', 'results'); results.id = 'step-check';
  const output = h('section', 'results'); output.id = 'step-ready';
  const help = h('div', 'helpful'); help.append(h('h3', '', 'Documents that answer the most questions'));
  const ul = h('ul'); HELPFUL.forEach(([d, what]) => { const li = h('li', '', d + ' '); li.append(h('span', '', 'for ' + what)); ul.append(li); });
  help.append(ul, h('p', 'q-note', 'Based on the Law Society’s guidance notes for sellers completing the TA6 Property Information Form.'));
  const reset = h('button', 'btn btn-quiet btn-sm reset', 'Start over'); reset.type = 'button';
  let armed = null;
  reset.addEventListener('click', () => {
    if (!armed) { reset.textContent = 'Click again to clear everything'; armed = setTimeout(() => { armed = null; reset.textContent = 'Start over'; }, 3000); return; }
    clearTimeout(armed); armed = null; reset.textContent = 'Start over';
    DOCS.forEach(d => { if (d.ctl) d.ctl.abort(); if (d.url) URL.revokeObjectURL(d.url); });
    DOCS = []; RES = []; NOTES = []; save(); renderAll();
  });
  wrap.append(inp, drop, acts, avail, list, results, output, help, reset);
  root.append(wrap);
  Object.assign(S, { avail, list, results, output });
  renderAvail(); renderAll();
}
function renderAvail() {
  if (!S.avail) return;
  S.avail.textContent = AI ? 'Documents are read by Claude through the server.'
    : !aiChecked ? '' : 'The server has no Claude API key, so only the sample documents work, with a prepared result.';
}
function renderAll() { renderDocs(); renderResults(); renderOutput(); renderSummary(); }

const STEPS = [
  { id:'step-upload', title:'1. Upload documents', sub:'Photos or PDFs of certificates, bills and letters' },
  { id:'step-check', title:'2. Check answers', sub:'Confirm, change or reject what we found' },
  { id:'step-ready', title:'3. Ready for the form', sub:'Confirmed answers for the questionnaire' }
];
const stepBtns = STEPS.map(st => {
  const b = h('button', 'step'); b.type = 'button';
  b.append(document.createTextNode(st.title), h('small', '', st.sub));
  b.addEventListener('click', () => { const el = document.getElementById(st.id); if (el) el.scrollIntoView({ behavior:'smooth', block:'start' }); });
  $('#steps').append(b); return b;
});
function renderSummary() {
  const found = RES.length, conf = RES.filter(r => r.status === 'confirmed').length;
  const stage = !found ? 0 : conf < found ? 1 : 2;
  stepBtns.forEach((b, i) => { if (i === stage) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
  $('#prog').style.width = (found ? conf / found * 100 : 0) + '%';
  $('#progWrap').setAttribute('aria-valuemax', String(found)); $('#progWrap').setAttribute('aria-valuenow', String(conf));
  $('#sumDocs').textContent = DOCS.filter(d => d.status === 'done').length;
  $('#sumFound').textContent = found; $('#sumConfirmed').textContent = conf;
}

/* ---------- documents ---------- */
function uniqueName(n) {
  const base = n || 'Document'; let name = base, i = 2;
  while (DOCS.some(d => d.name === name)) { const dot = base.lastIndexOf('.'); name = dot > 0 ? base.slice(0, dot) + ' (' + i + ')' + base.slice(dot) : base + ' (' + i + ')'; i++; }
  return name;
}
function addFiles(files) {
  files.forEach(f => {
    const isPdf = f.type === PDF_TYPE;
    const doc = { id:++docSeq, name:uniqueName(f.name), file:f, url:null, isPdf, status:'waiting', msg:'' };
    if (!isPdf && !IMAGE_TYPES.includes(f.type)) { doc.status = 'error'; doc.msg = ERR.unsupported_type; }
    else if (isPdf && f.size > MAX_PDF_BYTES) { doc.status = 'error'; doc.msg = ERR.too_large; }
    else if (!isPdf) doc.url = URL.createObjectURL(f);
    DOCS.push(doc);
  });
  save(); renderDocs(); pump();
}
async function addSample(sd) {
  const blob = await drawSample(sd); if (!blob) return;
  const name = uniqueName(sd.name);
  DOCS.push({ id:++docSeq, name, file:new File([blob], name, { type:'image/png' }), url:URL.createObjectURL(blob), status:'waiting', sample:sd, msg:'' });
  renderDocs(); pump();
}
/** Read documents one at a time. */
async function pump() {
  if (docBusy) return;
  const doc = DOCS.find(d => d.status === 'waiting'); if (!doc) return;
  docBusy = true; doc.status = 'reading'; renderDocs();
  try { await readDoc(doc); }
  finally { docBusy = false; save(); renderAll(); pump(); }
}
async function readDoc(doc) {
  await aiInit;
  if (!AI) {
    if (doc.sample) { doc.prepared = true; applyDoc(doc, doc.sample.canned); return; }
    doc.status = 'error'; doc.msg = ERR.no_api_key; return;
  }
  doc.ctl = new AbortController(); renderDocs();
  try { applyDoc(doc, await scanOnServer(doc.file, doc.ctl.signal)); }
  catch (e) {
    const cancelled = e && e.name === 'AbortError';
    doc.status = cancelled ? 'cancelled' : 'error';
    doc.msg = cancelled ? 'Stopped.' : (ERR[e && e.code] || 'Something went wrong while reading this document. Try again.');
  } finally { doc.ctl = null; }
}
function applyDoc(doc, res) {
  const r = normalizeScanResult(res, doc.name);
  r.facts.forEach(addResult); r.attach.forEach(addResult);
  r.notes.forEach(n => { if (!NOTES.some(x => x.text === n)) NOTES.push({ text:n, doc:doc.name }); });
  Object.assign(doc, { type:r.docType, summary:r.summary, found:r.facts.length, attached:r.attach.length, status:'done' });
}
function removeDoc(doc) {
  if (doc.ctl) doc.ctl.abort();
  if (doc.url) URL.revokeObjectURL(doc.url);
  RES = RES.map(r => {
    if (r.attach) { r.v = r.v.filter(n => n !== doc.name); return r.v.length ? r : null; }
    if (r.doc === doc.name && r.status !== 'confirmed') return r.conflict && r.conflict.prev ? r.conflict.prev : null;
    if (r.also) r.also = r.also.filter(n => n !== doc.name);
    return r;
  }).filter(Boolean);
  NOTES = NOTES.filter(n => n.doc !== doc.name);
  DOCS = DOCS.filter(d => d !== doc);
  save(); renderAll();
}
function renderDocs() {
  if (!S.list) return; S.list.innerHTML = '';
  DOCS.forEach(doc => {
    const card = h('div', 'doc');
    if (doc.url) { const img = h('img'); img.alt = ''; img.src = doc.url; card.append(img); }
    else card.append(h('div', 'doc-thumb', doc.isPdf ? 'PDF' : ''));
    const mid = h('div'); mid.append(h('p', 'doc-name', doc.name));
    let st, cls = 'doc-status';
    if (doc.status === 'waiting') st = 'Waiting to be read.';
    else if (doc.status === 'reading') st = 'Reading the document. This can take up to a minute.';
    else if (doc.status === 'done') {
      st = (doc.type ? doc.type + '. ' : '') + (doc.found ? doc.found + (doc.found === 1 ? ' answer found' : ' answers found') : 'No matching answers found') + (doc.attached ? ', and where to attach it' : '') + '.' + (doc.prepared ? ' This is a prepared result.' : '');
      cls += ' ok';
    } else { st = doc.msg || 'Couldn’t read this document.'; cls += ' err'; }
    mid.append(h('p', cls, st));
    if (doc.status === 'done' && doc.summary) mid.append(h('p', 'doc-status', doc.summary));
    const acts = h('div', 'rrow-acts');
    if (doc.status === 'reading' && doc.ctl) { const b = h('button', 'btn btn-quiet btn-sm', 'Stop'); b.type = 'button'; b.addEventListener('click', () => { if (doc.ctl) doc.ctl.abort(); }); acts.append(b); }
    if ((doc.status === 'error' || doc.status === 'cancelled') && doc.file && (doc.url || doc.isPdf)) { const b = h('button', 'btn btn-quiet btn-sm', 'Try again'); b.type = 'button'; b.addEventListener('click', () => { doc.status = 'waiting'; doc.msg = ''; renderDocs(); pump(); }); acts.append(b); }
    if (doc.status !== 'reading') { const b = h('button', 'btn btn-quiet btn-sm', 'Remove'); b.type = 'button'; b.setAttribute('aria-label', 'Remove ' + doc.name); b.addEventListener('click', () => removeDoc(doc)); acts.append(b); }
    card.append(mid, acts); S.list.append(card);
  });
}

/* ---------- checking answers ---------- */
function editor(r, onSave, onCancel) {
  const f = factFor(r.k); const kind = f.kind || f.t; const w = h('div', 'editor');
  let ctl;
  if (f.o && kind !== 'multi') { ctl = h('select', 'in'); f.o.forEach(o => { const op = h('option', '', o); op.value = o; ctl.append(op); }); ctl.value = r.v; }
  else { ctl = h('input', 'in'); ctl.type = kind === 'date' ? 'date' : 'text'; if (['money','number','percent','year'].includes(kind)) ctl.inputMode = 'decimal'; ctl.value = Array.isArray(r.v) ? r.v.join(', ') : r.v; }
  ctl.setAttribute('aria-label', 'New answer for ' + f.q);
  const ok = h('button', 'btn btn-sm', 'Save'); ok.type = 'button';
  const no = h('button', 'btn btn-quiet btn-sm', 'Cancel'); no.type = 'button';
  ok.addEventListener('click', () => {
    let v = String(ctl.value).trim(); if (!v) { ctl.focus(); return; }
    if (kind === 'multi') { const vs = v.split(',').map(x => f.o.find(o => norm(o) === norm(x))).filter(Boolean); if (!vs.length) { ctl.focus(); return; } v = vs; }
    else if (['money','number','percent'].includes(kind)) { const n = parseFloat(v.replace(/[^0-9.]/g, '')); if (!isFinite(n)) { ctl.focus(); return; } v = String(n); }
    else if (kind === 'year') { const m = v.match(/\d{4}/); if (!m) { ctl.focus(); return; } v = m[0]; }
    onSave(v);
  });
  no.addEventListener('click', onCancel);
  ctl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ok.click(); } if (e.key === 'Escape') no.click(); });
  w.append(ctl, ok, no); setTimeout(() => ctl.focus(), 0); return w;
}
function confirmRes(r) { r.status = 'confirmed'; delete r.conflict; }
function resRow(r) {
  const f = factFor(r.k);
  const row = h('div', 'rrow' + (r.status === 'confirmed' ? ' is-confirmed' : ''));
  const left = h('div');
  const sub = String(f.area || '').split(' › ').slice(1).join(' › ');
  if (sub) left.append(h('p', 'rrow-area', sub));
  const qh = h('div', 'q-head'); qh.append(h('p', 'rrow-q', f.q), srcTag(f.src)); left.append(qh);
  const val = h('p', 'rrow-v', fmt(r.v, f));
  if (r.status !== 'confirmed') {
    if (r.conflict) val.append(h('span', 'conf bad', 'Doesn’t match'));
    else if (r.conf !== 'high') val.append(h('span', 'conf', r.conf === 'medium' ? 'Likely' : 'Guess'));
  }
  left.append(val);
  let ev;
  if (r.edited) ev = 'Changed by you.';
  else if (r.attach) ev = 'Attach ' + r.v.map(n => '“' + n + '”').join(' and ') + ' here.';
  else ev = 'From “' + r.doc + '”' + (r.ev ? ': “' + r.ev + '”' : '') + (r.also && r.also.length ? '. Also on ' + r.also.map(n => '“' + n + '”').join(', ') + '.' : '');
  left.append(h('p', 'rrow-ev', ev));
  if (r.conflict) left.append(h('p', 'rrow-ev diff', (r.conflict.doc === 'you' ? 'You had entered ' : '“' + r.conflict.doc + '” says ') + fmt(r.conflict.v, f) + '. Check which is right.'));
  const acts = h('div', 'rrow-acts');
  if (r.status === 'confirmed') {
    acts.append(h('span', 'done-tag', 'Confirmed'));
    const u = h('button', 'btn btn-quiet btn-sm', 'Undo'); u.type = 'button'; u.setAttribute('aria-label', 'Undo: ' + f.q);
    u.addEventListener('click', () => { r.status = 'pending'; save(); renderAll(); }); acts.append(u);
  } else {
    const ok = h('button', 'btn btn-sm', 'Confirm'); ok.type = 'button'; ok.setAttribute('aria-label', 'Confirm: ' + f.q);
    ok.addEventListener('click', () => { confirmRes(r); save(); renderAll(); }); acts.append(ok);
    if (!r.attach) {
      const ch = h('button', 'btn btn-quiet btn-sm', 'Change'); ch.type = 'button'; ch.setAttribute('aria-label', 'Change: ' + f.q);
      ch.addEventListener('click', () => { acts.hidden = true; left.append(editor(r, v => { r.v = v; r.edited = true; confirmRes(r); save(); renderAll(); }, () => renderResults())); });
      acts.append(ch);
    }
    const no = h('button', 'btn btn-quiet btn-sm', 'Not right'); no.type = 'button'; no.setAttribute('aria-label', 'Not right: ' + f.q);
    no.addEventListener('click', () => { RES = RES.filter(x => x !== r); save(); renderAll(); }); acts.append(no);
  }
  row.append(left, acts);
  return row;
}
function renderResults() {
  const root = S.results; if (!root) return; root.innerHTML = '';
  if (!RES.length && !NOTES.length) return;
  const pending = RES.filter(r => r.status === 'pending');
  const clear = pending.filter(r => r.conf === 'high' && !r.conflict);
  const head = h('div', 'rgroup-head'); const t = h('div');
  t.append(h('h2', 'sec-title', 'What we found'),
    h('p', 'rgroup-sub', pending.length ? pending.length + (pending.length === 1 ? ' answer needs' : ' answers need') + ' your check. Answers marked “Likely”, “Guess” or “Doesn’t match” deserve a closer look.' : 'Every answer has been checked.'));
  head.append(t);
  if (clear.length > 1) {
    const b = h('button', 'btn btn-sm', 'Confirm all clear answers (' + clear.length + ')'); b.type = 'button';
    b.addEventListener('click', () => { clear.forEach(confirmRes); save(); renderAll(); }); head.append(b);
  }
  root.append(head);
  SECTIONS.forEach((s, si) => {
    const rows = RES.filter(r => factFor(r.k).si === si).sort(byOrder);
    if (!rows.length) return;
    const g = h('div', 'rgroup'); g.append(h('h3', 'rgroup-title', s.title));
    rows.forEach(r => g.append(resRow(r)));
    root.append(g);
  });
  if (NOTES.length) {
    const g = h('div', 'rgroup'); g.append(h('h3', 'rgroup-title', 'Worth knowing'));
    const ul = h('ul', 'notes'); NOTES.forEach(n => ul.append(h('li', '', n.text + ' (from “' + n.doc + '”)'))); g.append(ul);
    root.append(g);
  }
}

/* ---------- output for the form ---------- */
/** Confirmed answers keyed by PIQ field, ready to be written into the questionnaire. */
function collect() {
  const answers = {}, attachments = {};
  RES.filter(r => r.status === 'confirmed').sort(byOrder).forEach(r => {
    const f = factFor(r.k);
    if (r.attach) { attachments[r.k] = { files:r.v, question:f.q, original_question:f.src || null }; return; }
    answers[r.k] = { value:r.v, question:f.q, original_question:f.src || null, document:r.doc, evidence:r.ev || null, changed_by_seller:!!r.edited };
  });
  return { property:PROPERTY_ADDRESS, answers, attachments, notes:NOTES.map(n => n.text) };
}
function renderOutput() {
  const root = S.output; if (!root) return; root.innerHTML = '';
  const n = RES.filter(r => r.status === 'confirmed').length; if (!n) return;
  root.append(h('h2', 'sec-title', 'Ready for the form'),
    h('p', 'sec-intro', n + (n === 1 ? ' confirmed answer' : ' confirmed answers') + ', in a shape the questionnaire can take in. Each one keeps its field key, the original question number, the document it came from and the words it was read from.'));
  const pre = h('pre', 'json'); pre.textContent = JSON.stringify(collect(), null, 2);
  const btn = h('button', 'btn', 'Copy JSON'); btn.type = 'button';
  btn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(pre.textContent); btn.textContent = 'Copied'; }
    catch (e) { btn.textContent = 'Copy failed. Select the text instead.'; }
    setTimeout(() => { btn.textContent = 'Copy JSON'; }, 2200);
  });
  root.append(btn, pre);
}

build();
