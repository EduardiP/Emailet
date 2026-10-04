// Mjet zbulimi bizneseh — Exa API (zbulim) + OpenAI (filtrim AI) + Generect (email) + PostgreSQL.
// Variabla mjedisi te kerkuara ne Railway: EXA_API_KEY, OPENAI_API_KEY, GENERECT_API_KEY, DATABASE_URL, SERPER_API_KEY (per tab-in Bisedat).

const express = require('express');
const { Pool } = require('pg');
const app = express();
app.use(express.json());

const EXA_KEY = process.env.EXA_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const GENERECT_KEY = process.env.GENERECT_API_KEY;
const SERPER_KEY = process.env.SERPER_API_KEY;
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
pool.query(`ALTER TABLE bizneset_gjetur ADD COLUMN IF NOT EXISTS email_statusi TEXT`).catch(e => console.error('migrim email_statusi:', e.message));

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
  // Generect e kthen email-in e verifikuar te "valid_email" (me "result":"valid").
  if (typeof d.valid_email === 'string' && d.valid_email && d.valid_email !== 'none' && (!d.result || d.result === 'valid')) return d.valid_email;
  if (typeof d.email === 'string' && d.email) return d.email;
  if (Array.isArray(d.emails) && d.emails.length) {
    const e = d.emails[0];
    return typeof e === 'string' ? e : ((e && e.email) || null);
  }
  return null;
}
// Zgjedh personin me rolin me vendimmarres: CEO, pastaj Founder, pastaj Owner, pastaj cilido tjeter.
function zgjidhPersonin(leads) {
  if (!Array.isArray(leads) || !leads.length) return null;
  const pike = l => {
    const t = String(l.job_title || l.raw_job_title || '');
    if (/chief executive|\bceo\b/i.test(t)) return 0;
    if (/founder/i.test(t)) return 1;
    if (/\bowner\b/i.test(t)) return 2;
    return 3;
  };
  return leads.slice().sort((a, b) => pike(a) - pike(b))[0];
}

async function gjejEmailPerDomain(domain) {
  // Kthen { email, arsyeja }. arsyeja: gjetur | pa_kompani | pa_person | pa_email | gabim
  if (!GENERECT_KEY) return { email: null, arsyeja: 'gabim' };
  const headers = { 'Content-Type': 'application/json', 'Authorization': 'Token ' + GENERECT_KEY };
  const baza = 'https://api.generect.com/api/v1';

  // Nje thirrje me nje riprovim, nese rrjeti deshton ose serveri kthen 429/5xx.
  async function thirr(rruga, trupi) {
    for (let prove = 0; prove < 2; prove++) {
      try {
        const r = await fetch(baza + rruga, { method: 'POST', headers, body: JSON.stringify(trupi) });
        if ((r.status === 429 || r.status >= 500) && prove === 0) {
          await new Promise(z => setTimeout(z, 2000));
          continue;
        }
        let d = null;
        try { d = await r.json(); } catch (e) { d = null; }
        return { ok: r.ok, status: r.status, d };
      } catch (e) {
        if (prove === 0) { await new Promise(z => setTimeout(z, 2000)); continue; }
        return { ok: false, status: 0, d: null };
      }
    }
    return { ok: false, status: 0, d: null };
  }

  const c = await thirr('/enrich/database/company/', { domain });
  if (c.status === 404) return { email: null, arsyeja: 'pa_kompani' };
  if (!c.ok) return { email: null, arsyeja: 'gabim' };
  const komp = c.d && c.d.data;
  const link = komp && (komp.linkedin_link || komp.linkedin_url || (komp.linkedin_urn ? ('https://www.linkedin.com/company/' + komp.linkedin_urn + '/') : null));
  if (!link) return { email: null, arsyeja: 'pa_kompani' };

  const s = await thirr('/search/database/leads/', { job_titles: ['CEO', 'Founder', 'Owner', 'Co-Founder'], company_link: link, limit_by: 3 });
  if (!s.ok) return { email: null, arsyeja: 'gabim' };
  const dd = s.d && s.d.data;
  const leads = (dd && dd.leads) || (Array.isArray(dd) ? dd : []);
  const identifikues = identifikuesPersoni(zgjidhPersonin(leads));
  if (!identifikues) return { email: null, arsyeja: 'pa_person' };

  const e = await thirr('/email/find/', identifikues);
  if (e.status === 404) return { email: null, arsyeja: 'pa_email' };
  if (!e.ok) return { email: null, arsyeja: 'gabim' };
  const email = nxjerrEmail(e.d && e.d.data);
  return email ? { email, arsyeja: 'gjetur' } : { email: null, arsyeja: 'pa_email' };
}

// Ekzekuton fn per cdo element, me maksimumi "kufi" njekohesisht.
async function punoMeKonkurrence(elementet, kufi, fn) {
  let i = 0;
  const punetoret = Array.from({ length: Math.min(kufi, elementet.length) }, async () => {
    while (i < elementet.length) {
      const idx = i++;
      await fn(elementet[idx], idx);
    }
  });
  await Promise.all(punetoret);
}

// ===== BISEDAT: gjetja e bisedave/temave ne internet =====
// Rrjedha: pershkrim nga ti -> OpenAI e kthen ne kerkesa Google -> dergohen te Serper.
// Variabla te nevojshme te Railway: SERPER_API_KEY (e re), OPENAI_API_KEY (ekziston tashme).
const OPENAI_MODELI = 'gpt-5-nano'; // i njejti model qe perdor tashme filtroMeAI
const KOHET_E_LEJUARA = ['h', 'd', 'w', 'm', 'y'];

async function fetchMeKohe(url, opsionet, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, Object.assign({}, opsionet, { signal: ctrl.signal })); }
  finally { clearTimeout(t); }
}

// Nxjerr listen JSON nga pergjigja e AI-se (edhe nese e rrethon me tekst apo ```).
function nxirrListeJSON(tekst) {
  const i = tekst.indexOf('['), j = tekst.lastIndexOf(']');
  if (i === -1 || j <= i) return null;
  try { const a = JSON.parse(tekst.slice(i, j + 1)); return Array.isArray(a) ? a : null; }
  catch (e) { return null; }
}

async function formuloKerkesatMeAI(pershkrim, numri) {
  if (!OPENAI_KEY) throw new Error('OPENAI_API_KEY mungon te Railway → Variables.');
  const prompt =
    'You convert a business owner\'s plain-language description of the online conversations they want to find ' +
    'into Google search queries.\n' +
    'Return ONLY a JSON array of ' + numri + ' strings: no prose, no code fences.\n' +
    'Each query is a short, natural Google search (3-10 words) likely to surface forum threads, community posts or ' +
    'discussions where real people express the need, problem, complaint or request that was described.\n' +
    'Vary the angles (stating the problem, asking for recommendations, complaining about alternatives).\n' +
    'Do not use quotes or the site: operator unless the description explicitly asks for specific sites.\n' +
    'Write the queries in the language most likely used by the people posting (default: English).\n\n' +
    'Description: ' + pershkrim;
  const r = await fetchMeKohe('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OPENAI_KEY },
    body: JSON.stringify({ model: OPENAI_MODELI, messages: [{ role: 'user', content: prompt }] })
  }, 60000);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('OpenAI: ' + ((data.error && data.error.message) || r.status));
  const tekst = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  const lista = nxirrListeJSON(tekst);
  if (!lista) throw new Error('AI nuk ktheu format te vlefshem. Provo perseri, ose shkruaj kerkesat vete.');
  const pastro = Array.from(new Set(lista.filter(x => typeof x === 'string').map(x => x.trim()).filter(Boolean)));
  if (!pastro.length) throw new Error('AI nuk ktheu asnje kerkese. Provo perseri me pershkrim me te qarte.');
  return pastro.slice(0, numri);
}

async function kerkoSerper(q, koha) {
  if (!SERPER_KEY) throw new Error('SERPER_API_KEY mungon te Railway → Variables.');
  const trupi = { q, num: 10 };
  if (KOHET_E_LEJUARA.includes(koha)) trupi.tbs = 'qdr:' + koha;
  const r = await fetchMeKohe('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(trupi)
  }, 30000);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Serper: ' + (data.message || r.status));
  return data;
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
  textarea{ width:100%; box-sizing:border-box; padding:10px 12px; border:1px solid #2a313c; border-radius:8px; background:#141b26; color:#e6edf3; font:14px/1.5 system-ui,sans-serif; resize:vertical; }
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
    <div class="tab" id="tabShkarko" onclick="ndryshoTab('shkarko')">Shkarko</div>
    <div class="tab" id="tabBisedat" onclick="ndryshoTab('bisedat')">Bisedat</div>
  </div>

  <div class="sec-panel aktiv" id="panelGjenerim">
    <p class="mut">Shkruaj kategorine dhe kliko Kerko. Kerkimi punon ne sfond dhe tregon progresin; rezultatet shfaqen kur perfundon (mund te marre 5-15 minuta). Nese e mbyll faqen, kerkimi vazhdon dhe e sheh rezultatin kur e hap sersish.</p>
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
    <div class="row" style="border:1px solid #2a313c; border-radius:8px; padding:10px; margin-bottom:16px;">
      <input type="text" id="manEmail" placeholder="Email (p.sh. test1@gmail.com)" style="max-width:220px;" />
      <input type="text" id="manEmri" placeholder="Emer (opsionale)" style="max-width:180px;" />
      <input type="text" id="manKategoria" placeholder="Kategori" value="emailet-e-proves" style="max-width:180px;" />
      <button onclick="shtoManualisht()">Shto manualisht</button>
    </div>
    <div id="statusManual" class="status"></div>
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

  <div class="sec-panel" id="panelShkarko">
    <p class="mut">Zgjidh kategorine, shkarko nje skedar CSV gati per t'u importuar te Mailmeteor (Contacts &gt; Import contacts &gt; Import a CSV). Perfshihen vetem bizneset qe kane email real.</p>
    <div class="row">
      <select id="shkarkoKategoria"><option value="">Te gjitha kategorite</option></select>
      <button onclick="shkarkoCSV()">Shkarko CSV</button>
    </div>
    <div id="statusShkarko"></div>
  </div>

  <div class="sec-panel" id="panelBisedat">
    <p class="mut">Pershkruaj cfare kerkon: nje propozim, shqetesim ose kerkese per nje sherbim si yti. AI e kthen ne kerkesa Google, ti i shikon ose i ndryshon, dhe pastaj dergohen te Serper. Ketu shfaqet vetem cfare kthen Serper, pa filtrim ende.</p>
    <p class="mut" style="margin-bottom:6px;">1. Pershkrimi: cfare kerkon</p>
    <textarea id="bisPer" rows="3" placeholder="p.sh. biznese te vogla qe ankohen se reklamat jane te shtrenjta dhe s'kane klientet, ose pyesin si t'i gjejne perdoruesit e pare"></textarea>
    <div class="row" style="margin-top:8px;">
      <button onclick="bisFormulo(this)">Formulo kerkesat me AI</button>
      <span id="bisFormStat" style="font-size:13px; color:#8b949e; align-self:center;"></span>
    </div>
    <p class="mut" style="margin:16px 0 6px;">2. Kerkesat qe dergohen te Serper (nje per rresht, maksimumi 8; mund t'i ndryshosh ose t'i shkruash vete)</p>
    <textarea id="bisKer" rows="5" placeholder="Nje kerkese per rresht"></textarea>
    <div class="row" style="margin-top:8px;">
      <select id="bisKoha">
        <option value="d">24 oret e fundit</option>
        <option value="w" selected>1 jave</option>
        <option value="m">1 muaj</option>
        <option value="">Cdo kohe</option>
      </select>
      <button onclick="bisKerko(this)">Kerko te Serper</button>
      <span id="bisKerStat" style="font-size:13px; color:#8b949e; align-self:center;"></span>
    </div>
    <p class="mut" style="margin-bottom:16px;">Cdo rresht eshte 1 kerkese, rreth 1 kredit Serper (10 rezultate).</p>
    <div id="bisRez"></div>
  </div>

</div>
<script>
var pollTimer = null;
function ndryshoTab(cila){
  document.getElementById('tabGjenerim').className = cila === 'gjenerim' ? 'tab aktiv' : 'tab';
  document.getElementById('tabRuajtura').className = cila === 'ruajtura' ? 'tab aktiv' : 'tab';
  document.getElementById('tabShkarko').className = cila === 'shkarko' ? 'tab aktiv' : 'tab';
  document.getElementById('tabBisedat').className = cila === 'bisedat' ? 'tab aktiv' : 'tab';
  document.getElementById('panelGjenerim').className = cila === 'gjenerim' ? 'sec-panel aktiv' : 'sec-panel';
  document.getElementById('panelRuajtura').className = cila === 'ruajtura' ? 'sec-panel aktiv' : 'sec-panel';
  document.getElementById('panelShkarko').className = cila === 'shkarko' ? 'sec-panel aktiv' : 'sec-panel';
  document.getElementById('panelBisedat').className = cila === 'bisedat' ? 'sec-panel aktiv' : 'sec-panel';
  if(cila === 'ruajtura'){ ngarkoKategorite('filterKategoria'); shikoTeGjitha(); }
  if(cila === 'shkarko'){ ngarkoKategorite('shkarkoKategoria'); }
}
function bisNje(stil, tekst){ var e = document.createElement('div'); e.style.cssText = stil; e.textContent = tekst; return e; }
async function bisFormulo(btn){
  var stat = document.getElementById('bisFormStat');
  var per = document.getElementById('bisPer').value.trim();
  if(!per){ stat.textContent = 'Shkruaj fillimisht pershkrimin.'; return; }
  btn.disabled = true; stat.textContent = 'AI po formulon...';
  try{
    var r = await fetch('/api/bisedat/formulo', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pershkrim: per, numri: 4 }) });
    var d = await r.json();
    if(d.error){ stat.textContent = 'Gabim: ' + d.error; }
    else {
      document.getElementById('bisKer').value = d.kerkesat.join(String.fromCharCode(10));
      stat.textContent = d.kerkesat.length + ' kerkesa u formuluan. Shikoji dhe ndryshoji nese duhet.';
    }
  }catch(e){ stat.textContent = 'Gabim rrjeti: ' + e.message; }
  btn.disabled = false;
}
async function bisKerko(btn){
  var stat = document.getElementById('bisKerStat'), rez = document.getElementById('bisRez');
  var kerkesat = document.getElementById('bisKer').value.split(String.fromCharCode(10)).map(function(x){ return x.trim(); }).filter(Boolean);
  if(!kerkesat.length){ stat.textContent = 'Shkruaj te pakten 1 kerkese.'; return; }
  if(kerkesat.length > 8){ stat.textContent = 'Maksimumi 8 kerkesa per here.'; return; }
  btn.disabled = true; stat.textContent = 'Po kerkoj...'; rez.innerHTML = '';
  try{
    var r = await fetch('/api/bisedat/kerko', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ kerkesat: kerkesat, koha: document.getElementById('bisKoha').value }) });
    var d = await r.json();
    if(d.error){ stat.textContent = 'Gabim: ' + d.error; }
    else {
      var ok = d.rezultatet.filter(function(x){ return x.ok; }).length;
      stat.textContent = d.rezultatet.length + ' kerkesa derguar, ' + ok + ' me sukses (rreth ' + ok + ' kredite).';
      bisShfaq(d.rezultatet);
    }
  }catch(e){ stat.textContent = 'Gabim rrjeti: ' + e.message; }
  btn.disabled = false;
}
function bisShfaq(lista){
  var rez = document.getElementById('bisRez'); rez.innerHTML = '';
  lista.forEach(function(x){
    var kuti = document.createElement('div');
    kuti.style.cssText = 'border:1px solid #2a313c;border-radius:10px;margin-bottom:16px;overflow:hidden;';
    kuti.appendChild(bisNje('padding:10px 14px;background:#161b22;font-size:13px;', 'Kerkesa: ' + x.q + (x.ok ? '  |  ' + x.organic.length + ' rezultate' : '')));
    if(!x.ok){ kuti.appendChild(bisNje('padding:12px 14px;color:#e5484d;font-size:13px;', 'Gabim: ' + x.error)); rez.appendChild(kuti); return; }
    if(!x.organic.length){ kuti.appendChild(bisNje('padding:12px 14px;font-size:13px;color:#8b949e;', 'Pa rezultate per kete kerkese.')); }
    x.organic.forEach(function(o){
      var rr = document.createElement('div'); rr.style.cssText = 'padding:10px 14px;border-top:1px solid #1c2230;';
      var a = document.createElement('a'); a.textContent = o.titulli || o.linku || '(pa titull)';
      var lnk = o.linku || '';
      if(lnk.indexOf('http://') === 0 || lnk.indexOf('https://') === 0){ a.href = lnk; a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      a.style.cssText = 'font-weight:600;font-size:14px;text-decoration:none;';
      rr.appendChild(a);
      rr.appendChild(bisNje('font-size:12px;color:#8b949e;margin:2px 0 4px;', [o.faqja, o.data].filter(Boolean).join('  |  ')));
      rr.appendChild(bisNje('font-size:13px;color:#c9d1d9;line-height:1.45;', o.fragmenti || ''));
      kuti.appendChild(rr);
    });
    var det = document.createElement('details'); det.style.cssText = 'border-top:1px solid #1c2230;padding:8px 14px;';
    var sum = document.createElement('summary'); sum.textContent = 'JSON i plote nga Serper (per te pare te gjitha fushat)'; sum.style.cssText = 'cursor:pointer;font-size:12px;color:#8b949e;';
    var pre = document.createElement('pre'); pre.style.cssText = 'max-height:320px;overflow:auto;font-size:11px;background:#0e1116;padding:10px;border-radius:6px;margin-top:8px;';
    pre.textContent = JSON.stringify(x.raw, null, 2);
    det.appendChild(sum); det.appendChild(pre); kuti.appendChild(det);
    rez.appendChild(kuti);
  });
}
function tekstArsyeja(a){
  if(a === 'pa_kompani') return 'nuk u gjet kompania te Generect';
  if(a === 'pa_person') return 'nuk u gjet CEO, Founder apo Owner';
  if(a === 'pa_email') return 'personi u gjet, por email nuk u verifikua';
  if(a === 'gabim') return 'gabim gjate kerkimit, kontrollo balancen';
  return '';
}
function qelizaEmail(email, arsyeja){
  if(email){ return esc(email); }
  return '<span style="color:#8b949e;">— ' + esc(tekstArsyeja(arsyeja)) + '</span>';
}
async function kerko(){
  var query = document.getElementById('query').value.trim();
  var kategoria = document.getElementById('kategoria').value.trim() || 'pa-etikete';
  var qeVitiEkziston = document.getElementById('qeVitiEkziston').value.trim();
  var status = document.getElementById('status'), count = document.getElementById('count');
  var btn = document.getElementById('btn');
  if(!query){ status.textContent = 'Shkruaj nje query fillimisht.'; return; }
  btn.disabled = true; count.textContent = ''; document.getElementById('rez').style.display = 'none';
  status.textContent = 'Duke filluar...';
  try{
    var r = await fetch('/api/kerko', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ query: query, kategoria: kategoria, qeVitiEkziston: qeVitiEkziston }) });
    var d = await r.json();
    if(r.status === 409){ filloPolling(); return; }
    if(!r.ok || d.error){ status.textContent = 'Gabim: ' + (d.error || 'kerkesa deshtoi'); btn.disabled = false; return; }
    filloPolling();
  }catch(e){ status.textContent = 'Gabim rrjeti: ' + e.message; btn.disabled = false; }
}
function filloPolling(){
  if(pollTimer){ clearInterval(pollTimer); }
  perditesoStatusin();
  pollTimer = setInterval(perditesoStatusin, 3000);
}
async function perditesoStatusin(){
  var status = document.getElementById('status'), count = document.getElementById('count'), btn = document.getElementById('btn');
  try{
    var r = await fetch('/api/statusi');
    var d = await r.json();
    var p = d.puna;
    if(!p){ btn.disabled = false; if(pollTimer){ clearInterval(pollTimer); pollTimer = null; } return; }
    if(p.statusi === 'duke_punuar'){ btn.disabled = true; status.textContent = p.mesazhi; return; }
    if(pollTimer){ clearInterval(pollTimer); pollTimer = null; }
    btn.disabled = false;
    if(p.statusi === 'gabim'){ status.textContent = 'Gabim: ' + p.gabim; return; }
    status.textContent = '';
    count.textContent = p.permbledhje;
    renderRreshtaMeStatus(p.teGjitha || []);
  }catch(e){ }
}
async function ngarkoKategorite(idSelect){
  try{
    var r = await fetch('/api/kategorite');
    var d = await r.json();
    var sel = document.getElementById(idSelect);
    var aktuale = sel.value;
    sel.innerHTML = '<option value="">Te gjitha kategorite</option>' + d.kategorite.map(function(k){ return '<option value="'+esc(k)+'">'+esc(k)+'</option>'; }).join('');
    sel.value = aktuale;
  }catch(e){}
}
function shkarkoCSV(){
  var kategoria = document.getElementById('shkarkoKategoria').value;
  var statusShkarko = document.getElementById('statusShkarko');
  statusShkarko.textContent = 'Duke pergatitur...';
  var url = '/api/eksporto-csv' + (kategoria ? ('?kategoria=' + encodeURIComponent(kategoria)) : '');
  window.location.href = url;
  setTimeout(function(){ statusShkarko.textContent = ''; }, 2000);
}
async function shtoManualisht(){
  var email = document.getElementById('manEmail').value.trim();
  var emri = document.getElementById('manEmri').value.trim();
  var kategoria = document.getElementById('manKategoria').value.trim() || 'emailet-e-proves';
  var statusManual = document.getElementById('statusManual');
  if(!email || !email.includes('@')){ statusManual.textContent = 'Shkruaj email te vlefshem.'; return; }
  statusManual.textContent = 'Duke shtuar...';
  try{
    var r = await fetch('/api/shto-manualisht', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: email, emri: emri, kategoria: kategoria }) });
    var d = await r.json();
    if(d.error){ statusManual.textContent = 'Gabim: ' + d.error; return; }
    statusManual.textContent = 'U shtua: ' + email;
    document.getElementById('manEmail').value = '';
    document.getElementById('manEmri').value = '';
    ngarkoKategorite('filterKategoria');
    shikoTeGjitha();
  }catch(e){ statusManual.textContent = 'Gabim: ' + e.message; }
}
async function shikoTeGjitha(){
  var status2 = document.getElementById('status2'), count2 = document.getElementById('count2');
  var rez2 = document.getElementById('rez2'), rez2Body = document.getElementById('rez2Body');
  var kategoria = document.getElementById('filterKategoria').value;
  status2.textContent = 'Duke ngarkuar...'; rez2Body.innerHTML = '';
  try{
    var r = await fetch('/api/te-gjitha' + (kategoria ? ('?kategoria=' + encodeURIComponent(kategoria)) : ''));
    var d = await r.json();
    status2.textContent = '';
    count2.textContent = d.rows.length + ' total.';
    if(d.rows.length){
      rez2.style.display = 'table';
      rez2Body.innerHTML = d.rows.map(function(x){ return '<tr><td>'+qelizaEmail(x.email, x.email_statusi)+'</td><td>'+esc(x.domain)+'</td><td>'+esc(x.emri||'')+'</td></tr>'; }).join('');
    } else { rez2.style.display = 'none'; }
  }catch(e){ status2.textContent = 'Gabim: ' + e.message; }
}
function renderRreshtaMeStatus(rows){
  var rez = document.getElementById('rez'), rezBody = document.getElementById('rezBody');
  if(rows.length){
    rez.style.display = 'table';
    rezBody.innerHTML = rows.map(function(x,i){
      var emailCell = x.pranuar ? qelizaEmail(x.email, x.arsyeja) : '—';
      return '<tr><td>'+(i+1)+'</td><td>'+esc(x.emri||'')+'</td><td><a href="'+esc(x.url)+'" target="_blank">'+esc(x.domain)+'</a></td><td>'+esc(x.pershkrimi||'')+'</td><td><span class="badge">'+esc(x.kategoria||'')+'</span></td><td>'+(x.pranuar?'🟢':'🔴')+'</td><td>'+emailCell+'</td></tr>';
    }).join('');
  }
}
function esc(s){ return String(s||'').replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
(async function(){
  try{
    var r = await fetch('/api/statusi');
    var d = await r.json();
    if(d.puna){ filloPolling(); }
  }catch(e){}
})();
</script>
</body></html>`);
});

// Gjendja e punes se fundit (ne memorie). Kerkimi punon ne sfond; faqja pyet /api/statusi per progresin.
let puna = null;

async function punoKerkimin(p, params) {
  const { query, kategoria, qeVitiEkziston } = params;
  p.mesazhi = 'Hapi 1 nga 3: kerkim te Exa...';
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
  if (!r.ok) { const t = await r.text(); throw new Error('Exa ' + r.status + ': ' + t.slice(0, 300)); }
  const data = await r.json();
  const gjetur = data.results || [];

  p.mesazhi = 'Hapi 2 nga 3: filtrim (rregulla + AI) i ' + gjetur.length + ' rezultateve...';
  const kaluaFiltrinFiks = gjetur.filter(x => !eshteZhurme(x.url, x.title));
  const vendimeAI = await filtroMeAI(kaluaFiltrinFiks);
  const vendimPerUrl = new Map();
  kaluaFiltrinFiks.forEach((x, i) => vendimPerUrl.set(x.url, vendimeAI[i]));

  // Bashko dublikatet: nje domain i pranuar = nje biznes = nje kerkim email-i.
  const teGjitha = [];
  const tashmeTeParaqitur = new Set();
  let dublikate = 0;
  for (const x of gjetur) {
    const domain = domainNga(x.url);
    const pranuar = !eshteZhurme(x.url, x.title) && vendimPerUrl.get(x.url) !== false;
    if (pranuar && tashmeTeParaqitur.has(domain)) { dublikate++; continue; }
    if (pranuar) tashmeTeParaqitur.add(domain);
    teGjitha.push({
      domain,
      emri: x.title || domain,
      url: x.url,
      pershkrimi: (x.highlights && x.highlights[0]) ? x.highlights[0].slice(0, 300) : '',
      kategoria,
      pranuar,
      email: null,
      arsyeja: null
    });
  }
  const perPunuar = teGjitha.filter(x => x.pranuar);
  const refuzuar = teGjitha.length - perPunuar.length;

  let bere = 0, gjeturEmail = 0, gabime = 0;
  p.mesazhi = 'Hapi 3 nga 3: kerkim email-esh (0 nga ' + perPunuar.length + ')...';
  await punoMeKonkurrence(perPunuar, 3, async (rreshti) => {
    const rez = await gjejEmailPerDomain(rreshti.domain);
    rreshti.email = rez.email;
    rreshti.arsyeja = rez.arsyeja;
    await pool.query(
      'INSERT INTO bizneset_gjetur (domain, emri, url, pershkrimi, kategoria, email, email_statusi) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (domain) DO NOTHING',
      [rreshti.domain, rreshti.emri, rreshti.url, rreshti.pershkrimi, kategoria, rez.email, rez.arsyeja]
    );
    bere++;
    if (rez.email) gjeturEmail++;
    if (rez.arsyeja === 'gabim') gabime++;
    p.mesazhi = 'Hapi 3 nga 3: kerkim email-esh (' + bere + ' nga ' + perPunuar.length + ', te gjetura: ' + gjeturEmail + ')...';
  });

  p.teGjitha = teGjitha;
  p.permbledhje = perPunuar.length + ' biznese te reja u ruajten (Exa ktheu ' + gjetur.length + ' rezultate; '
    + dublikate + ' faqe te tjera te te njejtit domain u bashkuan; ' + refuzuar + ' u perjashtuan nga filtri/AI). '
    + 'Email u gjet per ' + gjeturEmail + ' nga ' + perPunuar.length + (gabime ? ('; ' + gabime + ' me gabim, kontrollo balancen e Generect') : '') + '.';
  p.statusi = 'perfunduar';
}

app.post('/api/kerko', async (req, res) => {
  if (!EXA_KEY) return res.status(500).json({ error: 'EXA_API_KEY nuk eshte konfiguruar.' });
  const { query, kategoria, qeVitiEkziston } = req.body || {};
  if (!query) return res.status(400).json({ error: 'Mungon query.' });
  if (puna && puna.statusi === 'duke_punuar') return res.status(409).json({ error: 'Nje kerkim po punon ende. Prit sa te perfundoje.' });
  const kjo = { statusi: 'duke_punuar', mesazhi: 'Duke filluar...', filluar: Date.now() };
  puna = kjo;
  punoKerkimin(kjo, { query, kategoria, qeVitiEkziston }).catch(e => { kjo.statusi = 'gabim'; kjo.gabim = e.message; });
  res.json({ ok: true });
});

app.get('/api/statusi', (req, res) => {
  res.json({ puna });
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
    permbledhje.kostoja_hapi1 = dComp.meta ? dComp.meta.amount_charged : null;
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
    permbledhje.kostoja_hapi2 = dSearch.meta ? dSearch.meta.amount_charged : null;
    const leads = (dSearch.data && dSearch.data.leads) || dSearch.data || [];
    permbledhje.personat = leads.map(l => ({ emri: l.full_name, titulli: l.job_title, kompania: l.company_name, linkedin_url: l.linkedin_url, ka_id: !!l.id }));
    const identifikues = identifikuesPersoni(zgjidhPersonin(leads));
    const zgjedhur = zgjidhPersonin(leads);
    permbledhje.zgjedhur = zgjedhur ? { emri: zgjedhur.full_name, titulli: zgjedhur.job_title } : null;
    permbledhje.identifikuesiPerdorur = identifikues;
    if (!identifikues) return res.json(rezultat);

    const rEmail = await fetch(baza + '/email/find/', { method: 'POST', headers, body: JSON.stringify(identifikues) });
    permbledhje.hapi3_status = rEmail.status;
    const dEmail = await rEmail.json();
    permbledhje.email = nxjerrEmail(dEmail.data);
    permbledhje.verifikimi = dEmail.data ? { result: dEmail.data.result, catch_all: dEmail.data.catch_all } : null;
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

function arratisCSV(vlera) {
  const tekst = String(vlera == null ? '' : vlera);
  if (/[",\n]/.test(tekst)) return '"' + tekst.replace(/"/g, '""') + '"';
  return tekst;
}

app.get('/api/eksporto-csv', async (req, res) => {
  try {
    const { kategoria } = req.query;
    let r;
    if (kategoria) {
      r = await pool.query("SELECT email, domain, emri FROM bizneset_gjetur WHERE kategoria=$1 AND email IS NOT NULL AND email NOT LIKE '(%' ORDER BY gjetur_at DESC", [kategoria]);
    } else {
      r = await pool.query("SELECT email, domain, emri FROM bizneset_gjetur WHERE email IS NOT NULL AND email NOT LIKE '(%' ORDER BY gjetur_at DESC");
    }
    const rreshta = ['email,domain,emri'];
    for (const row of r.rows) {
      rreshta.push([arratisCSV(row.email), arratisCSV(row.domain), arratisCSV(row.emri)].join(','));
    }
    const csv = rreshta.join('\n');
    const emriSkedarit = 'bizneset' + (kategoria ? ('-' + kategoria) : '') + '.csv';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="' + emriSkedarit + '"');
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Shto kontakt manualisht (p.sh. per testim) — trajton rastin kur disa email-e ndajne te njejtin
// domain (si @gmail.com), duke shtuar nje suffix te vogel per te shmangur konfliktin e uniqitetit te domain-it.
app.post('/api/shto-manualisht', async (req, res) => {
  const { email, emri, kategoria } = req.body || {};
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Email i pavlefshem.' });
  try {
    let domainBaze = domainNga('http://' + email.split('@')[1]);
    let domainPerRuajtje = domainBaze;
    let provoi = 0;
    while (true) {
      const ekziston = await pool.query('SELECT 1 FROM bizneset_gjetur WHERE domain=$1', [domainPerRuajtje]);
      if (!ekziston.rows.length) break;
      provoi++;
      domainPerRuajtje = domainBaze + '-' + provoi;
      if (provoi > 50) return res.status(500).json({ error: 'Shume konflikte domain-i, provo tjeter email.' });
    }
    const ins = await pool.query(
      'INSERT INTO bizneset_gjetur (domain, emri, url, pershkrimi, kategoria, email) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [domainPerRuajtje, emri || email, 'mailto:' + email, 'Kontakt i shtuar manualisht.', kategoria || 'emailet-e-proves', email]
    );
    res.json({ ok: true, rreshti: ins.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/te-gjitha', async (req, res) => {
  try {
    const { kategoria } = req.query;
    let r;
    if (kategoria) {
      r = await pool.query('SELECT email, email_statusi, domain, emri, kategoria FROM bizneset_gjetur WHERE kategoria=$1 ORDER BY gjetur_at DESC', [kategoria]);
    } else {
      r = await pool.query('SELECT email, email_statusi, domain, emri, kategoria FROM bizneset_gjetur ORDER BY gjetur_at DESC');
    }
    res.json({ rows: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---- BISEDAT ----
app.post('/api/bisedat/formulo', async (req, res) => {
  const b = req.body || {};
  const pershkrim = String(b.pershkrim || '').trim();
  if (!pershkrim) return res.status(400).json({ error: 'Shkruaj nje pershkrim: cfare kerkon.' });
  if (pershkrim.length > 1500) return res.status(400).json({ error: 'Pershkrimi eshte shume i gjate (maks. 1500 shkronja).' });
  const numri = Math.min(8, Math.max(1, parseInt(b.numri, 10) || 4));
  try { res.json({ ok: true, kerkesat: await formuloKerkesatMeAI(pershkrim, numri) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/bisedat/kerko', async (req, res) => {
  const b = req.body || {};
  const kerkesat = (Array.isArray(b.kerkesat) ? b.kerkesat : [])
    .filter(x => typeof x === 'string').map(x => x.trim()).filter(Boolean)
    .map(x => x.slice(0, 300)).slice(0, 8);
  if (!kerkesat.length) return res.status(400).json({ error: 'Shkruaj te pakten 1 kerkese.' });
  if (!SERPER_KEY) return res.status(400).json({ error: 'SERPER_API_KEY mungon te Railway → Variables.' });
  const koha = KOHET_E_LEJUARA.includes(b.koha) ? b.koha : '';
  const rezultatet = await Promise.all(kerkesat.map(async q => {
    try {
      const raw = await kerkoSerper(q, koha);
      const organic = (raw.organic || []).map(o => {
        let faqja = ''; try { faqja = new URL(o.link).hostname.replace(/^www\./, ''); } catch (e) {}
        return { pozicioni: o.position, titulli: o.title, linku: o.link, fragmenti: o.snippet, data: o.date || '', faqja };
      });
      return { q, ok: true, organic, raw };
    } catch (e) { return { q, ok: false, error: e.message, organic: [] }; }
  }));
  res.json({ ok: true, koha, rezultatet });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Zbulim Bizneseh po punon ne portin ' + PORT));
