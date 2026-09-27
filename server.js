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
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const pjeset = host.split('.');
    // Merr vetem 2 pjeset e fundit (p.sh. "preview.eightfold.ai" -> "eightfold.ai")
    return pjeset.length > 2 ? pjeset.slice(-2).join('.') : host;
  } catch (e) { return url; }
}
function esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

const DOMAIN_ZHURME = [
  'quora.com', 'prnewswire.com', 'globenewswire.com', 'finance.yahoo.com', 'businesswire.com',
  'linkedin.com', 'glassdoor.com', 'indeed.com', 'grandresearchstore.com', 'reddit.com',
  'wikipedia.org', 'youtube.com', 'facebook.com', 'twitter.com', 'x.com', 'crunchbase.com',
  'techcrunch.com', 'wearetech.africa', 'techsoma.africa', 'techbuild.africa', 'forbes.com',
  'bloomberg.com', 'reuters.com', 'gartner.com', 'g2.com', 'capterra.com', 'getapp.com',
  'softwareadvice.com', 'trustpilot.com', 'medium.com'
];
const SHABLLON_ARTIKULL = /\/(blog|news|resources|articles|guides?|insights?)\//i;
const FJALE_ARTIKULL = /\b(best|top|vs|review|comparison|guide to)\b.{0,30}\b(20\d\d|software|systems?|platforms?|tools?)\b/i;

function eshteZhurme(url, title) {
  const domain = domainNga(url);
  if (DOMAIN_ZHURME.some(z => domain === z || domain.endsWith('.' + z))) return true;
  if (SHABLLON_ARTIKULL.test(url)) return true;
  if (FJALE_ARTIKULL.test(title || '')) return true;
  return false;
}

const OPENAI_KEY = process.env.OPENAI_API_KEY;

async function filtroMeAI(rezultate) {
  if (!OPENAI_KEY || !rezultate.length) return rezultate.map(() => true); // nese s'ka celes, kalo te gjitha (fallback)
  const lista = rezultate.map((x, i) => (i+1) + '. Titulli: "' + (x.title||'') + '" | Fragment: "' + ((x.highlights&&x.highlights[0])||'').slice(0,200) + '"').join('\n');
  const prompt = 'Për secilën nga hyrjet e mëposhtme (të numëruara 1 deri ' + rezultate.length + '), thuaj nëse ËSHTË vetë faqja kryesore/produkti i një kompanie/platforme reale (po), OSE nëse është artikull lajmesh, blog, faqe krahasimi/review, forum, listim pune, ose profil individual (jo).\n\n' + lista + '\n\nPërgjigju VETËM me një objekt JSON ku çdo çelës është NUMRI (si tekst) dhe vlera është "po" ose "jo" — përfshi TË GJITHË numrat 1 deri ' + rezultate.length + ', asnjë të mos mungojë. Asgjë tjetër, pa shpjegime. Shembull për 3 hyrje: {"1":"po","2":"jo","3":"po"}';
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OPENAI_KEY },
      body: JSON.stringify({ model: 'gpt-5-nano', messages: [{ role: 'user', content: prompt }] })
    });
    const data = await r.json();
    const tekst = data.choices[0].message.content.trim();
    const obj = JSON.parse(tekst.match(/\{.*\}/s)[0]);
    // Perputh SIPAS numrit eksplicit (jo pozicionit ne array) — mbron nga cdo gabim numerimi i AI-se.
    // Nese ndonje numer mungon nga pergjigja e AI-se, e trajtojme si "po" (fallback i sigurt, mos hidh poshte pa arsye).
    return rezultate.map((_, i) => {
      const vlera = obj[String(i + 1)];
      return vlera === undefined ? true : String(vlera).toLowerCase().startsWith('po');
    });
  } catch (e) {
    console.error('Gabim filtroMeAI:', e.message);
    return rezultate.map(() => true); // nese AI dështon, kalo te gjitha (mos e ndalo procesin)
  }
}

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
    <input type="number" id="qeVitiEkziston" placeholder="Që nga viti (p.sh. 2018)" style="max-width:170px;" min="2000" max="2026" />
    <button id="btn" onclick="kerko()">Kërko (të reja)</button>
    <button class="sec" onclick="shikoTeGjitha()">Shiko të ruajturat</button>
  </div>

  <div id="status"></div>
  <div id="count"></div>
  <table id="rez" style="display:none;">
    <thead><tr><th>#</th><th>Emri</th><th>Domain</th><th>Përshkrim</th><th>Kategori</th><th>Status</th></tr></thead>
    <tbody id="rezBody"></tbody>
  </table>
</div>
<script>
async function kerko(){
  const query = document.getElementById('query').value.trim();
  const kategoria = document.getElementById('kategoria').value.trim() || 'pa-etiketë';
  const qeVitiEkziston = document.getElementById('qeVitiEkziston').value.trim();
  const btn = document.getElementById('btn'), status = document.getElementById('status'), count = document.getElementById('count');
  const rez = document.getElementById('rez'), rezBody = document.getElementById('rezBody');
  if(!query){ status.textContent = 'Shkruaj një query fillimisht.'; return; }
  btn.disabled = true; btn.textContent = 'Duke kërkuar...'; status.textContent = ''; count.textContent = ''; rez.style.display = 'none'; rezBody.innerHTML = '';
  try{
    const r = await fetch('/api/kerko', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ query, kategoria, qeVitiEkziston }) });
    const d = await r.json();
    if(d.error){ status.textContent = 'Gabim: ' + d.error; btn.disabled=false; btn.textContent='Kërko (të reja)'; return; }
    count.textContent = d.reja.length + ' TË REJA u ruajtën (Exa ktheu ' + d.gjithsejKthyerNgaExa + ' gjithsej, ' + d.perjashtuar + ' ishin tashmë të njohura, ' + d.zhurmeHequr + ' u përjashtuan nga filtri/AI — shënuar poshtë me pikë të kuqe).';
    renderRreshtaMeStatus(d.teGjitha);
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
    rezBody.innerHTML = rows.map((x,i) => '<tr><td>'+(i+1)+'</td><td>'+esc(x.emri||'')+'</td><td><a href="'+esc(x.url)+'" target="_blank">'+esc(x.domain)+'</a></td><td>'+esc(x.pershkrimi||'')+'</td><td><span class="badge">'+esc(x.kategoria||'')+'</span></td><td>🟢</td></tr>').join('');
  }
}
function renderRreshtaMeStatus(rows){
  const rez = document.getElementById('rez'), rezBody = document.getElementById('rezBody');
  if(rows.length){
    rez.style.display = 'table';
    rezBody.innerHTML = rows.map((x,i) => '<tr><td>'+(i+1)+'</td><td>'+esc(x.emri||'')+'</td><td><a href="'+esc(x.url)+'" target="_blank">'+esc(x.domain)+'</a></td><td>'+esc(x.pershkrimi||'')+'</td><td><span class="badge">'+esc(x.kategoria||'')+'</span></td><td>'+(x.pranuar?'🟢':'🔴')+'</td></tr>').join('');
  }
}
function esc(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
</script>
</body></html>`);
});

app.post('/api/kerko', async (req, res) => {
  if (!EXA_KEY) return res.status(500).json({ error: 'EXA_API_KEY s\'është konfiguruar.' });
  const { query, kategoria, qeVitiEkziston } = req.body || {};
  if (!query) return res.status(400).json({ error: 'Mungon query.' });
  try {
    // 1. Merr te GJITHA domain-et ekzistuese, per t'i derguar VET Exa-s si perjashtim real
    const ekzistuese = await pool.query('SELECT domain FROM bizneset_gjetur');
    const excludeDomains = ekzistuese.rows.map(r => r.domain);

    // 2. Therret Exa
    const body = { query, numResults: 100, contents: { highlights: { numSentences: 2 } } };
    if (excludeDomains.length) body.excludeDomains = excludeDomains.slice(0, 1200);
    if (qeVitiEkziston && /^\d{4}$/.test(String(qeVitiEkziston))) {
      body.startPublishedDate = qeVitiEkziston + '-01-01T00:00:00.000Z'; // qe nga fillimi i atij viti deri sot (pa endPublishedDate)
    }

    const r = await fetch('https://api.exa.ai/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + EXA_KEY }, body: JSON.stringify(body)
    });
    if (!r.ok) { const t = await r.text(); return res.status(500).json({ error: 'Exa ' + r.status + ': ' + t.slice(0, 300) }); }
    const data = await r.json();
    const gjetur = data.results || [];

    // 3. Filtro me AI (gpt-5-nano) ato qe kaluan filtrin fiks — 1 thirrje e vetme, per te gjitha bashke
    const kaluaFiltrinFiks = gjetur.filter(x => !eshteZhurme(x.url, x.title));
    const vendimeAI = await filtroMeAI(kaluaFiltrinFiks);
    const vendimAIPerDomain = {}; // domain -> pranuar (true/false), per t'i lidhur poshte
    kaluaFiltrinFiks.forEach((x, i) => { vendimAIPerDomain[domainNga(x.url)] = vendimeAI[i]; });

    // 4. Ruaj ne databazë VETEM ato te pranuara (ON CONFLICT mbron nga cdo dublikatë)
    const teGjitha = []; // per UI: te GJITHA, secili me "pranuar" true/false
    for (const x of gjetur) {
      const domain = domainNga(x.url);
      const emri = x.title || domain;
      const pershkrimi = (x.highlights && x.highlights[0]) ? x.highlights[0].slice(0, 300) : '';
      const eshteZhurmeFikse = eshteZhurme(x.url, x.title);
      const pranuar = !eshteZhurmeFikse && (vendimAIPerDomain[domain] !== false);
      if (pranuar) {
        await pool.query(
          'INSERT INTO bizneset_gjetur (domain, emri, url, pershkrimi, kategoria) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (domain) DO NOTHING',
          [domain, emri, x.url, pershkrimi, kategoria]
        );
      }
      teGjitha.push({ domain, emri, url: x.url, pershkrimi, kategoria, pranuar });
    }
    const reja = teGjitha.filter(x => x.pranuar);
    res.json({ reja, teGjitha, perjashtuar: excludeDomains.length, gjithsejKthyerNgaExa: gjetur.length, zhurmeHequr: teGjitha.length - reja.length });
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
