// Mjet zbulimi bizneseh — Exa API + databazë PostgreSQL (dedup automatik).
// Variabla mjedisi te kerkuara ne Railway: EXA_API_KEY, DATABASE_URL (Railway e krijon vete kur shton PostgreSQL).

const express = require('express');
const { Pool } = require('pg');
const app = express();
app.use(express.json());

const EXA_KEY = process.env.EXA_API_KEY;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

pool.query(`CREATE TABLE IF NOT EXISTS bizneset_gjetur (
  id SERIAL PRIMARY KEY,
  domain TEXT UNIQUE NOT NULL,
  emri TEXT,
  url TEXT,
  pershkrimi TEXT,
  kategoria TEXT,
  gjetur_at TIMESTAMPTZ DEFAULT now()
)`).catch(e => console.error('migrim:', e.message));

function domainNga(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url; }
}
function esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

app.get('/', (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="sq"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Zbulim Bizneseh</title>
<style>
  body{ margin:0; font:15px/1.6 system-ui,sans-serif; background:#0b0f17; color:#e6edf3; }
  .wrap{ max-width:960px; margin:0 auto; padding:32px 20px; }
  h1{ font-size:22px; margin:0 0 6px; }
  p.mut{ color:#8b949e; font-size:13px; margin:0 0 24px; }
  .row{ display:flex; gap:10px; margin-bottom:12px; flex-wrap:wrap; }
  input{ padding:10px 12px; border:1px solid #2a313c; border-radius:8px; background:#141b26; color:#e6edf3; font-size:14px; }
  input[type=text]{ flex:1; min-width:240px; }
  button{ padding:10px 20px; border-radius:8px; border:none; background:#3b6ef0; color:#fff; font-weight:600; cursor:pointer; font-size:14px; }
  button.sec{ background:#2a313c; }
  button:disabled{ opacity:.5; cursor:default; }
  table{ width:100%; border-collapse:collapse; margin-top:16px; }
  th, td{ text-align:left; padding:8px 10px; border-bottom:1px solid #2a313c; font-size:13px; vertical-align:top; }
  th{ color:#8b949e; font-weight:600; }
  a{ color:#4a9eff; }
  #status{ font-size:13px; color:#8b949e; margin-top:10px; }
  #count{ font-size:13px; color:#3fb950; margin-top:6px; font-weight:600; }
  .badge{ font-size:11px; background:#2a313c; padding:2px 8px; border-radius:10px; color:#8b949e; }
</style></head>
<body><div class="wrap">
  <h1>Zbulim Bizneseh</h1>
  <p class="mut">Shkruaj kategorinë (p.sh. "Recruiting and ATS software companies") dhe kliko Kërko. Bizneset e gjetur ruhen automatikisht — kërkimet e radhës i përjashtojnë vetë, pa nevojë ta bësh manualisht.</p>

  <div class="row">
    <input type="text" id="query" placeholder="p.sh. Recruiting and ATS software companies" />
    <input type="text" id="kategoria" placeholder="Etiketë kategorie (p.sh. recruiting-ats)" style="max-width:220px;" />
    <button id="btn" onclick="kerko()">Kërko (të reja)</button>
    <button class="sec" onclick="shikoTeGjitha()">Shiko të ruajturat</button>
  </div>

  <div id="status"></div>
  <div id="count"></div>
  <table id="rez" style="display:none;">
    <thead><tr><th>Emri</th><th>Domain</th><th>Përshkrim</th><th>Kategori</th></tr></thead>
    <tbody id="rezBody"></tbody>
  </table>
</div>
<script>
async function kerko(){
  const query = document.getElementById('query').value.trim();
  const kategoria = document.getElementById('kategoria').value.trim() || 'pa-etiketë';
  const btn = document.getElementById('btn'), status = document.getElementById('status'), count = document.getElementById('count');
  const rez = document.getElementById('rez'), rezBody = document.getElementById('rezBody');
  if(!query){ status.textContent = 'Shkruaj një query fillimisht.'; return; }
  btn.disabled = true; btn.textContent = 'Duke kërkuar...'; status.textContent = ''; count.textContent = ''; rez.style.display = 'none'; rezBody.innerHTML = '';
  try{
    const r = await fetch('/api/kerko', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ query, kategoria }) });
    const d = await r.json();
    if(d.error){ status.textContent = 'Gabim: ' + d.error; btn.disabled=false; btn.textContent='Kërko (të reja)'; return; }
    count.textContent = d.reja.length + ' TË REJA gjetur dhe ruajtur (' + d.perjashtuar + ' domain-e ekzistuese u përjashtuan automatikisht nga kërkimi).';
    renderRreshta(d.reja);
  }catch(e){ status.textContent = 'Gabim rrjeti: ' + e.message; }
  btn.disabled = false; btn.textContent = 'Kërko (të reja)';
}
async function shikoTeGjitha(){
  const status = document.getElementById('status'), count = document.getElementById('count');
  const rez = document.getElementById('rez'), rezBody = document.getElementById('rezBody');
  status.textContent = 'Duke ngarkuar...'; rezBody.innerHTML = '';
  try{
    const r = await fetch('/api/te-gjitha');
    const d = await r.json();
    status.textContent = '';
    count.textContent = d.rows.length + ' total, të ruajtura deri tani.';
    renderRreshta(d.rows);
  }catch(e){ status.textContent = 'Gabim: ' + e.message; }
}
function renderRreshta(rows){
  const rez = document.getElementById('rez'), rezBody = document.getElementById('rezBody');
  if(rows.length){
    rez.style.display = 'table';
    rezBody.innerHTML = rows.map(x => '<tr><td>'+esc(x.emri||'')+'</td><td><a href="'+esc(x.url)+'" target="_blank">'+esc(x.domain)+'</a></td><td>'+esc(x.pershkrimi||'')+'</td><td><span class="badge">'+esc(x.kategoria||'')+'</span></td></tr>').join('');
  }
}
function esc(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
</script>
</body></html>`);
});

app.post('/api/kerko', async (req, res) => {
  if (!EXA_KEY) return res.status(500).json({ error: 'EXA_API_KEY s\'është konfiguruar.' });
  const { query, kategoria } = req.body || {};
  if (!query) return res.status(400).json({ error: 'Mungon query.' });
  try {
    // 1. Merr te GJITHA domain-et ekzistuese, per t'i perjashtuar automatikisht
    const ekzistuese = await pool.query('SELECT domain FROM bizneset_gjetur');
    const excludeDomains = ekzistuese.rows.map(r => r.domain);

    // 2. Therret Exa
    const body = { query, numResults: 100, category: 'company', contents: { highlights: { numSentences: 2 } } };
    if (excludeDomains.length) body.excludeDomains = excludeDomains.slice(0, 1000); // Exa ka kufi te vet per numrin e domain-eve ne filtër

    const r = await fetch('https://api.exa.ai/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + EXA_KEY }, body: JSON.stringify(body)
    });
    if (!r.ok) { const t = await r.text(); return res.status(500).json({ error: 'Exa ' + r.status + ': ' + t.slice(0, 300) }); }
    const data = await r.json();
    const gjetur = data.results || [];

    // 3. Ruaj ne databazë, duke shpërfillur automatikisht dublikatet (ON CONFLICT)
    const reja = [];
    for (const x of gjetur) {
      const domain = domainNga(x.url);
      const emri = x.title || domain;
      const pershkrimi = (x.highlights && x.highlights[0]) ? x.highlights[0].slice(0, 300) : '';
      const ins = await pool.query(
        'INSERT INTO bizneset_gjetur (domain, emri, url, pershkrimi, kategoria) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (domain) DO NOTHING RETURNING *',
        [domain, emri, x.url, pershkrimi, kategoria]
      );
      if (ins.rows.length) reja.push(ins.rows[0]);
    }
    res.json({ reja, perjashtuar: excludeDomains.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/te-gjitha', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM bizneset_gjetur ORDER BY gjetur_at DESC');
    res.json({ rows: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Zbulim Bizneseh po punon në portin ' + PORT));
