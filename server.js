// Mjet zbulimi bizneseh — Exa API (zbulim) + OpenAI (filtrim AI) + Generect (email) + PostgreSQL.
// Variabla mjedisi te kerkuara ne Railway: EXA_API_KEY, OPENAI_API_KEY, GENERECT_API_KEY, DATABASE_URL.

const express = require('express');
const { Pool } = require('pg');
const app = express();
app.use(express.json());

const EXA_KEY = process.env.EXA_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const GENERECT_KEY = process.env.GENERECT_API_KEY;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

pool.query(`CREATE TABLE IF NOT EXISTS bizneset_gjetur (
  id SERIAL PRIMARY KEY,
  domain TEXT UNIQUE NOT NULL,
  emri TEXT,
  url TEXT,
  pershkrimi TEXT,
  kategoria TEXT,
  email TEXT,
  gjetur_at TIMESTAMPTZ DEFAULT now()
)`).catch(e => console.error('migrim:', e.message));

function domainNga(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const pjeset = host.split('.');
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
  'softwareadvice.com', 'trustpilot.com', 'medium.com', 'drjobs.ae'
];
const SHABLLON_ARTIKULL = /\/(blog|news|resources|articles|guides?|insights?)\//i;
const FJALE_ARTIKULL = /\b(best|top|vs|review|comparison|guide to)\b.{0,40}\b20\d\d\b/i;

function eshteZhurme(url, title) {
  const domain = domainNga(url);
  if (DOMAIN_ZHURME.some(z => domain === z || domain.endsWith('.' + z))) return true;
  if (SHABLLON_ARTIKULL.test(url)) return true;
  if (FJALE_ARTIKULL.test(title || '')) return true;
  return false;
}

async function filtroMeAI(rezultate) {
  if (!OPENAI_KEY || !rezultate.length) return rezultate.map(() => true);
  const lista = rezultate.map((x, i) => (i+1) + '. Titulli: "' + (x.title||'') + '" | Fragment: "' + ((x.highlights&&x.highlights[0])||'').slice(0,200) + '"').join('\n');
  const prompt = 'Per secilen nga hyrjet e meposhtme (te numeruara 1 deri ' + rezultate.length + '), thuaj nese ESHTE vete faqja kryesore/produkti i nje kompanie/platforme reale (po), OSE nese eshte artikull lajmesh, blog, faqe krahasimi/review, forum, listim pune, ose profil individual (jo).\n\n' + lista + '\n\nPergjigju VETEM me nje objekt JSON ku cdo celes eshte NUMRI (si tekst) dhe vlera eshte "po" ose "jo" — perfshi TE GJITHE numrat 1 deri ' + rezultate.length + ', asnje te mos mungoje. Asgje tjeter, pa shpjegime. Shembull per 3 hyrje: {"1":"po","2":"jo","3":"po"}';
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OPENAI_KEY },
      body: JSON.stringify({ model: 'gpt-5-nano', messages: [{ role: 'user', content: prompt }] })
    });
    const data = await r.json();
    const tekst = data.choices[0].message.content.trim();
    const obj = JSON.parse(tekst.match(/\{.*\}/s)[0]);
    return rezultate.map((_, i) => {
      const vlera = obj[String(i + 1)];
      return vlera === undefined ? true : String(vlera).toLowerCase().startsWith('po');
    });
  } catch (e) {
    console.error('Gabim filtroMeAI:', e.message);
    return rezultate.map(() => true);
  }
}

// Kerkon person vendimmarres (CEO/Founder/Owner) ne kete domain, pastaj email-in e tij. Kthen null nese s'gjendet.
// Rrjedha (konfirmuar nga kodi burimor zyrtar i Generect):
//  1. enrich/database/company/  (domain -> linkedin_link)
//  2. search/database/leads/    (company_link + job_titles -> lead id)
//  3. email/find/               (lead_id -> email)
// Generect pranon lead_id OSE linkedin_url per te gjetur email-in. Rreshtat e kthyer shpesh s'kane "id", por kane linkedin_url.
function identifikuesPersoni(lead) {
  if (!lead) return null;
  if (lead.id) return { lead_id: String(lead.id) };
  if (lead.linkedin_url) return { linkedin_url: String(lead.linkedin_url) };
  return null;
}
function nxjerrEmail(d) {
  if (!d) return null;
  if (typeof d.email === 'string' && d.email) return d.email;
  if (Array.isArray(d.emails) && d.emails.length) {
    const e = d.emails[0];
    return typeof e === 'string' ? e : ((e && e.email) || null);
  }
  return null;
}

async function gjejEmailPerDomain(domain) {
  if (!GENERECT_KEY) return null;
  const headers = { 'Content-Type': 'application/json', 'Authorization': 'Token ' + GENERECT_KEY };
  const baza = 'https://api.generect.com/api/v1';
  try {
    const rComp = await fetch(baza + '/enrich/database/company/', {
      method: 'POST', headers, body: JSON.stringify({ domain })
    });
    const dComp = await rComp.json();
    const komp = dComp.data;
    if (!komp) return null;
    const companyLink = komp.linkedin_link || komp.linkedin_url || (komp.linkedin_urn ? ('https://www.linkedin.com/company/' + komp.linkedin_urn + '/') : null);
    if (!companyLink) return null;

    const rSearch = await fetch(baza + '/search/database/leads/', {
      method: 'POST', headers,
      body: JSON.stringify({ job_titles: ['CEO', 'Founder', 'Owner', 'Co-Founder'], company_link: companyLink, limit_by: 3 })
    });
    const dSearch = await rSearch.json();
    const leads = (dSearch.data && dSearch.data.leads) || dSearch.data || [];
    const identifikues = identifikuesPersoni(leads[0]);
    if (!identifikues) return null;

    const rEmail = await fetch(baza + '/email/find/', {
      method: 'POST', headers, body: JSON.stringify(identifikues)
    });
    const dEmail = await rEmail.json();
    return nxjerrEmail(dEmail.data);
  } catch (e) { return null; }
}

app.get('/', (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="sq"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Zbulim Bizneseh</title>
<style>
  body{ margin:0; font:15px/1.6 system-ui,sans-serif; background:#0b0f17; color:#e6edf3; }
  .wrap{ max-width:1000px; margin:0 auto; padding:24px 20px; }
  h1{ font-size:20px; margin:0 0 16px; }
  .tabs{ display:flex; gap:4px; margin-bottom:20px; border-bottom:1px solid #2a313c; }
  .tab{ padding:10px 18px; cursor:pointer; color:#8b949e; font-size:14px; font-weight:600; border-bottom:2px solid transparent; }
  .tab.aktiv{ color:#e6edf3; border-bottom:2px solid #3b6ef0; }
  .sec-panel{ display:none; }
  .sec-panel.aktiv{ display:block; }
  p.mut{ color:#8b949e; font-size:13px; margin:0 0 20px; }
  .row{ display:flex; gap:10px; margin-bottom:12px; flex-wrap:wrap; }
  input, select{ padding:10px 12px; border:1px solid #2a313c; border-radius:8px; background:#141b26; color:#e6edf3; font-size:14px; }
  input[type=text]{ flex:1; min-width:240px; }
  button{ padding:10px 20px; border-radius:8px; border:none; background:#3b6ef0; color:#fff; font-weight:600; cursor:pointer; font-size:14px; }
  button:disabled{ opacity:.5; cursor:default; }
  table{ width:100%; border-collapse:collapse; margin-top:16px; }
  th, td{ text-align:left; padding:8px 10px; border-bottom:1px solid #2a313c; font-size:13px; vertical-align:top; }
  th{ color:#8b949e; font-weight:600; }
  a{ color:#4a9eff; }
  #status{ font-size:13px; color:#8b949e; margin-top:10px; }
  #count{ font-size:13px; color:#3fb950; margin-top:6px; font-weight:600; }
  #status2{ font-size:13px; color:#8b949e; margin-top:10px; }
  #count2{ font-size:13px; color:#3fb950; margin-top:6px; font-weight:600; }
  .badge{ font-size:11px; background:#2a313c; padding:2px 8px; border-radius:10px; color:#8b949e; }
</style></head>
<body><div class="wrap">
  <h1>Zbulim Bizneseh</h1>
  <div class="tabs">
    <div class="tab aktiv" id="tabGjenerim" onclick="ndryshoTab('gjenerim')">Gjenerim</div>
    <div class="tab" id="tabRuajtura" onclick="ndryshoTab('ruajtura')">Bizneset e ruajtura</div>
  </div>

  <div class="sec-panel aktiv" id="panelGjenerim">
    <p class="mut">Shkruaj kategorine, kliko Kerko. Per cdo biznes te ri, te pranuar nga filtri, kerkohet automatikisht edhe email-i (Generect) para se te shfaqen rezultatet — kjo mund te marre disa minuta.</p>
    <div class="row">
      <input type="text" id="query" placeholder='p.sh. Recruiting and ATS software companies' />
      <input type="text" id="kategoria" placeholder="Etikete kategorie (p.sh. recruiting-ats)" style="max-width:220px;" />
      <input type="number" id="qeVitiEkziston" placeholder="Qe nga viti (p.sh. 2018)" style="max-width:170px;" min="2000" max="2026" />
      <button id="btn" onclick="kerko()">Kerko (te reja)</button>
    </div>
    <div id="status"></div>
    <div id="count"></div>
    <table id="rez" style="display:none;">
      <thead><tr><th>#</th><th>Emri</th><th>Domain</th><th>Pershkrim</th><th>Kategori</th><th>Status</th><th>Email</th></tr></thead>
      <tbody id="rezBody"></tbody>
    </table>
  </div>

  <div class="sec-panel" id="panelRuajtura">
    <p class="mut">Vetem bizneset e pranuara (te reja), sipas kategorise se zgjedhur me poshte.</p>
    <div class="row">
      <select id="filterKategoria" onchange="shikoTeGjitha()"><option value="">Te gjitha kategorite</option></select>
    </div>
    <div id="status2"></div>
    <div id="count2"></div>
    <table id="rez2" style="display:none;">
      <thead><tr><th>Email</th><th>Domain</th><th>Emri</th></tr></thead>
      <tbody id="rez2Body"></tbody>
    </table>
  </div>
</div>
<script>
function ndryshoTab(cila){
  document.getElementById('tabGjenerim').className = cila === 'gjenerim' ? 'tab aktiv' : 'tab';
  document.getElementById('tabRuajtura').className = cila === 'ruajtura' ? 'tab aktiv' : 'tab';
  document.getElementById('panelGjenerim').className = cila === 'gjenerim' ? 'sec-panel aktiv' : 'sec-panel';
  document.getElementById('panelRuajtura').className = cila === 'ruajtura' ? 'sec-panel aktiv' : 'sec-panel';
  if(cila === 'ruajtura'){ ngarkoKategorite(); shikoTeGjitha(); }
}
async function kerko(){
  const query = document.getElementById('query').value.trim();
  const kategoria = document.getElementById('kategoria').value.trim() || 'pa-etikete';
  const qeVitiEkziston = document.getElementById('qeVitiEkziston').value.trim();
  const btn = document.getElementById('btn'), status = document.getElementById('status'), count = document.getElementById('count');
  const rez = document.getElementById('rez'), rezBody = document.getElementById('rezBody');
  if(!query){ status.textContent = 'Shkruaj nje query fillimisht.'; return; }
  btn.disabled = true; btn.textContent = 'Duke punuar (Exa + filtrim + email)...'; status.textContent = 'Kjo mund te marre disa minuta, sepse kerkohet email per cdo biznes te ri, para se te shfaqen rezultatet.'; count.textContent = ''; rez.style.display = 'none'; rezBody.innerHTML = '';
  try{
    const r = await fetch('/api/kerko', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ query, kategoria, qeVitiEkziston }) });
    const d = await r.json();
    if(d.error){ status.textContent = 'Gabim: ' + d.error; btn.disabled=false; btn.textContent='Kerko (te reja)'; return; }
    status.textContent = '';
    count.textContent = d.reja.length + ' TE REJA u ruajten (Exa ktheu ' + d.gjithsejKthyerNgaExa + ' gjithsej, ' + d.perjashtuar + ' ishin tashme te njohura, ' + d.zhurmeHequr + ' u perjashtuan nga filtri/AI).';
    renderRreshtaMeStatus(d.teGjitha);
  }catch(e){ status.textContent = 'Gabim rrjeti: ' + e.message; }
  btn.disabled = false; btn.textContent = 'Kerko (te reja)';
}
async function ngarkoKategorite(){
  try{
    const r = await fetch('/api/kategorite');
    const d = await r.json();
    const sel = document.getElementById('filterKategoria');
    const aktuale = sel.value;
    sel.innerHTML = '<option value="">Te gjitha kategorite</option>' + d.kategorite.map(k => '<option value="'+esc(k)+'">'+esc(k)+'</option>').join('');
    sel.value = aktuale;
  }catch(e){}
}
async function shikoTeGjitha(){
  const status2 = document.getElementById('status2'), count2 = document.getElementById('count2');
  const rez2 = document.getElementById('rez2'), rez2Body = document.getElementById('rez2Body');
  const kategoria = document.getElementById('filterKategoria').value;
  status2.textContent = 'Duke ngarkuar...'; rez2Body.innerHTML = '';
  try{
    const r = await fetch('/api/te-gjitha' + (kategoria ? ('?kategoria=' + encodeURIComponent(kategoria)) : ''));
    const d = await r.json();
    status2.textContent = '';
    count2.textContent = d.rows.length + ' total.';
    if(d.rows.length){
      rez2.style.display = 'table';
      rez2Body.innerHTML = d.rows.map(x => '<tr><td>'+esc(x.email||'—')+'</td><td>'+esc(x.domain)+'</td><td>'+esc(x.emri||'')+'</td></tr>').join('');
    } else { rez2.style.display = 'none'; }
  }catch(e){ status2.textContent = 'Gabim: ' + e.message; }
}
function renderRreshtaMeStatus(rows){
  const rez = document.getElementById('rez'), rezBody = document.getElementById('rezBody');
  if(rows.length){
    rez.style.display = 'table';
    rezBody.innerHTML = rows.map((x,i) => '<tr><td>'+(i+1)+'</td><td>'+esc(x.emri||'')+'</td><td><a href="'+esc(x.url)+'" target="_blank">'+esc(x.domain)+'</a></td><td>'+esc(x.pershkrimi||'')+'</td><td><span class="badge">'+esc(x.kategoria||'')+'</span></td><td>'+(x.pranuar?'green':'red')+'</td><td>'+esc(x.email||'—')+'</td></tr>').join('');
  }
}
function esc(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
</script>
</body></html>`);
});

app.post('/api/kerko', async (req, res) => {
  if (!EXA_KEY) return res.status(500).json({ error: 'EXA_API_KEY nuk eshte konfiguruar.' });
  const { query, kategoria, qeVitiEkziston } = req.body || {};
  if (!query) return res.status(400).json({ error: 'Mungon query.' });
  try {
    const ekzistuese = await pool.query('SELECT domain FROM bizneset_gjetur');
    const excludeDomains = ekzistuese.rows.map(r => r.domain);

    const body = { query, numResults: 100, contents: { highlights: { numSentences: 2 } } };
    if (excludeDomains.length) body.excludeDomains = excludeDomains.slice(0, 1200);
    if (qeVitiEkziston && /^\d{4}$/.test(String(qeVitiEkziston))) {
      body.startPublishedDate = qeVitiEkziston + '-01-01T00:00:00.000Z';
    }

    const r = await fetch('https://api.exa.ai/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + EXA_KEY }, body: JSON.stringify(body)
    });
    if (!r.ok) { const t = await r.text(); return res.status(500).json({ error: 'Exa ' + r.status + ': ' + t.slice(0, 300) }); }
    const data = await r.json();
    const gjetur = data.results || [];

    const kaluaFiltrinFiks = gjetur.filter(x => !eshteZhurme(x.url, x.title));
    const vendimeAI = await filtroMeAI(kaluaFiltrinFiks);
    const vendimAIPerDomain = {};
    kaluaFiltrinFiks.forEach((x, i) => { vendimAIPerDomain[domainNga(x.url)] = vendimeAI[i]; });

    const teGjitha = [];
    for (const x of gjetur) {
      const domain = domainNga(x.url);
      const emri = x.title || domain;
      const pershkrimi = (x.highlights && x.highlights[0]) ? x.highlights[0].slice(0, 300) : '';
      const eshteZhurmeFikse = eshteZhurme(x.url, x.title);
      const pranuar = !eshteZhurmeFikse && (vendimAIPerDomain[domain] !== false);
      let email = null;
      if (pranuar) {
        // Kerkohet email-i TANI, brenda te njejtit proces, para se te ruajme/shfaqim rezultatin.
        email = await gjejEmailPerDomain(domain);
        await pool.query(
          'INSERT INTO bizneset_gjetur (domain, emri, url, pershkrimi, kategoria, email) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (domain) DO NOTHING',
          [domain, emri, x.url, pershkrimi, kategoria, email]
        );
      }
      teGjitha.push({ domain, emri, url: x.url, pershkrimi, kategoria, pranuar, email });
    }
    const reja = teGjitha.filter(x => x.pranuar);
    res.json({ reja, teGjitha, perjashtuar: excludeDomains.length, gjithsejKthyerNgaExa: gjetur.length, zhurmeHequr: teGjitha.length - reja.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/test-email', async (req, res) => {
  const domain = req.query.domain;
  if (!domain) return res.status(400).json({ error: 'Shto ?domain=example.com ne URL.' });
  if (!GENERECT_KEY) return res.status(500).json({ error: 'GENERECT_API_KEY nuk eshte konfiguruar.' });
  const headers = { 'Content-Type': 'application/json', 'Authorization': 'Token ' + GENERECT_KEY };
  const baza = 'https://api.generect.com/api/v1';
  const permbledhje = { domain };
  const detaje = {};
  const rezultat = { permbledhje, detaje };
  try {
    const rComp = await fetch(baza + '/enrich/database/company/', { method: 'POST', headers, body: JSON.stringify({ domain }) });
    permbledhje.hapi1_status = rComp.status;
    const dComp = await rComp.json();
    const komp = dComp.data;
    permbledhje.kompania = komp ? { emri: komp.name, domain: komp.domain, punonjes: komp.headcount_exact, linkedin_urn: komp.linkedin_urn } : null;
    const companyLink = komp && (komp.linkedin_link || komp.linkedin_url || (komp.linkedin_urn ? ('https://www.linkedin.com/company/' + komp.linkedin_urn + '/') : null));
    permbledhje.companyLink = companyLink || null;
    if (!companyLink) return res.json(rezultat);

    const rSearch = await fetch(baza + '/search/database/leads/', {
      method: 'POST', headers, body: JSON.stringify({ job_titles: ['CEO', 'Founder', 'Owner', 'Co-Founder'], company_link: companyLink, limit_by: 3 })
    });
    permbledhje.hapi2_status = rSearch.status;
    const dSearch = await rSearch.json();
    const leads = (dSearch.data && dSearch.data.leads) || dSearch.data || [];
    permbledhje.personat = leads.map(l => ({ emri: l.full_name, titulli: l.job_title, kompania: l.company_name, linkedin_url: l.linkedin_url, ka_id: !!l.id }));
    const identifikues = identifikuesPersoni(leads[0]);
    permbledhje.identifikuesiPerdorur = identifikues;
    if (!identifikues) return res.json(rezultat);

    const rEmail = await fetch(baza + '/email/find/', { method: 'POST', headers, body: JSON.stringify(identifikues) });
    permbledhje.hapi3_status = rEmail.status;
    const dEmail = await rEmail.json();
    permbledhje.email = nxjerrEmail(dEmail.data);
    permbledhje.kostoja_hapi3 = dEmail.meta ? dEmail.meta.amount_charged : null;
    detaje.hapi3_email_body = dEmail;
  } catch (e) { permbledhje.gabim = e.message; }
  res.json(rezultat);
});

app.get('/api/kategorite', async (req, res) => {
  try {
    const r = await pool.query('SELECT DISTINCT kategoria FROM bizneset_gjetur WHERE kategoria IS NOT NULL ORDER BY kategoria ASC');
    res.json({ kategorite: r.rows.map(x => x.kategoria) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/te-gjitha', async (req, res) => {
  try {
    const { kategoria } = req.query;
    let r;
    if (kategoria) {
      r = await pool.query('SELECT email, domain, emri FROM bizneset_gjetur WHERE kategoria=$1 ORDER BY gjetur_at DESC', [kategoria]);
    } else {
      r = await pool.query('SELECT email, domain, emri FROM bizneset_gjetur ORDER BY gjetur_at DESC');
    }
    res.json({ rows: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Zbulim Bizneseh po punon ne portin ' + PORT));
