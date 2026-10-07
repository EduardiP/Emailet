// Mjet zbulimi bizneseh — Exa API (zbulim) + OpenAI (filtrim AI) + Generect (email) + PostgreSQL.
// Variabla mjedisi te kerkuara ne Railway: EXA_API_KEY, OPENAI_API_KEY, GENERECT_API_KEY, DATABASE_URL, SERPER_API_KEY (per tab-in Bisedat), CRUSTDATA_API_KEY (per tab-in Kompani te reja), GOOGLE_ALERTS_FEEDS (per tab-in Alerte).

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
// Historiku i kompanive qe tab-i "Kompani te reja" ia ka treguar tashme perdoruesit, qe te mos i dale dy here.
pool.query(`CREATE TABLE IF NOT EXISTS kompani_pare (
  domain TEXT PRIMARY KEY,
  emri TEXT,
  gjetur_at TIMESTAMPTZ DEFAULT now()
)`).then(() => pool.query(`ALTER TABLE kompani_pare
  ADD COLUMN IF NOT EXISTS website TEXT, ADD COLUMN IF NOT EXISTS viti INTEGER, ADD COLUMN IF NOT EXISTS punonjes TEXT,
  ADD COLUMN IF NOT EXISTS shteti TEXT, ADD COLUMN IF NOT EXISTS qyteti TEXT, ADD COLUMN IF NOT EXISTS linkedin TEXT, ADD COLUMN IF NOT EXISTS twitter TEXT,
  ADD COLUMN IF NOT EXISTS fshih BOOLEAN DEFAULT true, ADD COLUMN IF NOT EXISTS email TEXT, ADD COLUMN IF NOT EXISTS email_lloji TEXT,
  ADD COLUMN IF NOT EXISTS email_mx BOOLEAN, ADD COLUMN IF NOT EXISTS email_burimi TEXT,
  ADD COLUMN IF NOT EXISTS email_gjendja TEXT DEFAULT 'pa-kerkuar', ADD COLUMN IF NOT EXISTS email_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS kategoria TEXT,
  ADD COLUMN IF NOT EXISTS statusi TEXT DEFAULT 'pa-perfunduar', ADD COLUMN IF NOT EXISTS statusi_at TIMESTAMPTZ`))
  .catch(e => console.error('migrim kompani_pare:', e.message));
// Kompanite qe Crustdata i ktheu PA domain (vetem me LinkedIn): ruhen ketu sipas ID-se se Crustdata, qe te kontaktohen manualisht.
// statusi: 'pa-perfunduar' (paracaktuar) ose 'perfunduar' (e shenuar nga perdoruesi pasi i ka dergar mesazhin). Te njejtin status e kane
// edhe kompanite me domain por pa email te gjetur (kolona statusi te kompani_pare).
pool.query(`CREATE TABLE IF NOT EXISTS kompani_pa_domain (
  crustdata_id BIGINT PRIMARY KEY,
  emri TEXT,
  gjetur_at TIMESTAMPTZ DEFAULT now()
)`).then(() => pool.query(`ALTER TABLE kompani_pa_domain
  ADD COLUMN IF NOT EXISTS website TEXT, ADD COLUMN IF NOT EXISTS viti INTEGER, ADD COLUMN IF NOT EXISTS punonjes TEXT,
  ADD COLUMN IF NOT EXISTS shteti TEXT, ADD COLUMN IF NOT EXISTS qyteti TEXT, ADD COLUMN IF NOT EXISTS linkedin TEXT, ADD COLUMN IF NOT EXISTS twitter TEXT,
  ADD COLUMN IF NOT EXISTS kategoria TEXT, ADD COLUMN IF NOT EXISTS fshih BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS statusi TEXT DEFAULT 'pa-perfunduar', ADD COLUMN IF NOT EXISTS statusi_at TIMESTAMPTZ`))
  .catch(e => console.error('migrim kompani_pa_domain:', e.message));
const KOMPANI_STATUSET = ['pa-perfunduar', 'perfunduar'];
// Njoftimet e Google Alerts (nga feed-et RSS), per tab-in "Alerte".
pool.query(`CREATE TABLE IF NOT EXISTS alerte_rezultate (
  id SERIAL PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  titulli TEXT,
  fragmenti TEXT,
  burimi TEXT,
  alerti TEXT,
  publikuar TIMESTAMPTZ,
  gjetur_at TIMESTAMPTZ DEFAULT now(),
  statusi TEXT DEFAULT 'i ri'
)`)
  // alertet = TE GJITHA alertet qe e kane gjetur kete lidhje (alerti = i pari qe e gjeti). Rreshtat e vjeter mbushen nga alerti.
  .then(() => pool.query(`ALTER TABLE alerte_rezultate ADD COLUMN IF NOT EXISTS alertet TEXT[] DEFAULT '{}'`))
  .then(() => pool.query(`UPDATE alerte_rezultate SET alertet = ARRAY[alerti] WHERE COALESCE(cardinality(alertet), 0) = 0 AND COALESCE(alerti, '') <> ''`))
  .catch(e => console.error('migrim alerte_rezultate:', e.message));

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

// AI-ja e shenon frazat kyce me <<...>> (pa thonjeza, qe JSON-i te mos prishet).
// Ketu kthehen ne thonjeza te sakta, qe Google te detyrohet t'i permbaje.
function kthejFrazatNeThonjeza(q) {
  return q.replace(/<<\s*([^<>]+?)\s*>>/g, '"$1"').replace(/\s+/g, ' ').trim();
}

// Mbrojtje ne kod (modeli i vogel nuk i ndjek gjithmone rregullat e prompt-it):
// 1) maksimumi 2 fraza me thonjeza per kerkese; me shume, Google kthen shume pak rezultate.
function limitoThonjezat(q, maks) {
  let i = 0;
  return q.replace(/"([^"]*)"/g, (m, fraza) => (++i <= maks ? m : fraza));
}
// 2) maksimumi 8 fjale; kerkesat e gjata japin pak rezultate. Nje fraze brenda thonjezave nuk ndahet kurre.
function shkurtoKerkesen(q, maksFjale) {
  const njesite = q.match(/"[^"]*"|\S+/g) || [];
  const dalja = [];
  let fjale = 0;
  for (const n of njesite) {
    const nr = n.replace(/"/g, ' ').trim().split(/\s+/).filter(Boolean).length || 1;
    if (dalja.length && fjale + nr > maksFjale) break;
    dalja.push(n); fjale += nr;
  }
  return dalja.join(' ');
}
function pergatitKerkesen(q) { return shkurtoKerkesen(limitoThonjezat(kthejFrazatNeThonjeza(q), 2), 8); }

const SHEMBULL_AI = JSON.stringify([
  '<<delivery apps>> fees restaurant owner <<any advice>>',
  'how do I lower <<delivery app>> commission restaurant',
  '<<delivery apps>> eating my margins restaurant',
  'restaurant owner dropping <<delivery apps>> worth it'
]);

async function formuloKerkesatMeAI(pershkrim, numri) {
  if (!OPENAI_KEY) throw new Error('OPENAI_API_KEY mungon te Railway → Variables.');
  const prompt =
    'You turn a business owner\'s plain-language description into Google search queries that find real people\'s posts ' +
    'in forums and communities (not articles, not marketing copy).\n\n' +
    'Rules:\n' +
    '1. Write the way a person writes when asking for help in first person: "I", "my", "how do I", "any advice", ' +
    '"anyone", "struggling". Marketers write sales copy ("costs keep rising", "frustrated that your..."): never write like that.\n' +
    '2. Every query includes the audience words from the description (for example SaaS, founder, startup, developer). ' +
    'Use the most specific audience in the description. Never broaden it (do not turn SaaS founders into small business owners).\n' +
    '3. Every query has at most 8 words in total.\n' +
    '4. Wrap 1 or 2 short key phrases (2-3 words each) in double angle brackets, like <<first users>>. ' +
    'Never wrap more than 2 phrases. Never use quotation marks. The brackets become exact-match phrases.\n' +
    '5. Do NOT write article-style queries. Avoid the words: best, top, guide, tips, strategies, tools, 2026.\n' +
    '6. Do not use operators (no site:, no minus signs).\n' +
    '7. Vary the angles: stating the problem, asking for help, looking for alternatives, sharing a failed attempt.\n' +
    '8. Write the queries in the language most likely used by the people posting (default: English).\n\n' +
    'Example. Description: restaurant owners frustrated with delivery app commissions\n' +
    'Output: ' + SHEMBULL_AI + '\n\n' +
    'Return ONLY a JSON array of ' + numri + ' strings: no prose, no code fences.\n\n' +
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
  const pastro = Array.from(new Set(lista.filter(x => typeof x === 'string').map(pergatitKerkesen).filter(Boolean)));
  if (!pastro.length) throw new Error('AI nuk ktheu asnje kerkese. Provo perseri me pershkrim me te qarte.');
  return pastro.slice(0, numri);
}

// Faqet opsionale: pranon domain-e ose URL-e, i pastron dhe mban maksimumi 6.
function pastroFaqet(lista) {
  const dalja = [];
  (Array.isArray(lista) ? lista : []).forEach(x => {
    if (typeof x !== 'string') return;
    const d = x.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('?')[0];
    if (/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(d) && !dalja.includes(d)) dalja.push(d);
  });
  return dalja.slice(0, 6);
}
function shtoFiltrinEFaqeve(q, faqet) {
  return faqet.length ? q + ' (' + faqet.map(f => 'site:' + f).join(' OR ') + ')' : q;
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

// ===== KOMPANI TE REJA: kerkim te Crustdata (kompani te themeluara rishtas) =====
// Variabel Railway: CRUSTDATA_API_KEY. Nuk ruan asgje dhe nuk gjen email; shfaq vetem cfare kthen Crustdata.
// Sipas dokumentimit zyrtar: POST https://api.crustdata.com/company/search, "authorization: Bearer <celesi>"
// dhe "x-api-version: 2025-11-01". Kerkimi kushton 0.03 kredite per rezultat + filtrat/fushat premium.
const CRUSTDATA_KEY = process.env.CRUSTDATA_API_KEY;
const CRUSTDATA_BAZA = 'https://api.crustdata.com';
// Vetem fusha baze (pa grupe premium), qe kostoja te mbetet 0.03 per rezultat.
const FUSHAT_KOMPANI = [
  'crustdata_company_id',
  'basic_info.name', 'basic_info.primary_domain', 'basic_info.website', 'basic_info.year_founded',
  'basic_info.employee_count_range', 'basic_info.professional_network_url',
  'locations.country', 'locations.headquarters',
  'social_profiles.twitter_url'
];

async function crustdataThirr(metoda, rruga, trupi) {
  const koka = { 'authorization': 'Bearer ' + CRUSTDATA_KEY, 'x-api-version': '2025-11-01' };
  const opsione = { method: metoda, headers: koka };
  if (trupi) { koka['content-type'] = 'application/json'; opsione.body = JSON.stringify(trupi); }
  const r = await fetchMeKohe(CRUSTDATA_BAZA + rruga, opsione, 30000);
  const data = await r.json().catch(() => ({}));
  const k = parseFloat(r.headers && r.headers.get ? r.headers.get('x-credits-used') : null);
  return { ok: r.ok, status: r.status, data, kredite: Number.isFinite(k) ? k : null };
}

function mesazhGabimiCrustdata(r) {
  const msg = (r.data && r.data.error && r.data.error.message) || (r.data && r.data.message) || '';
  if (r.status === 401) return 'Crustdata: celesi API mungon ose eshte i pavlefshem.';
  if (r.status === 403) return 'Crustdata: leje e mohuar ose kredite te pamjaftueshme' + (msg ? ' (' + msg + ')' : '') + '. Kontrollo balancen te app.crustdata.com; nese eshte per nje filter premium, hiqe filtrin e industrise ose te punonjesve.';
  if (r.status === 429) return 'Crustdata: shume kerkesa. Prit nje minute (kufiri per kerkimin e kompanive eshte 15 ne minute).';
  return 'Crustdata ' + r.status + (msg ? ': ' + msg : '');
}

// Operatoret sipas dokumentimit: "=>" eshte >= (jo ">="), "=<" eshte <=, "(.)" eshte perputhje e perafert e fjaleve.
function ndertoFiltratKompani(p) {
  // Kufi i siperm per vitin: pa te, vlera te pavlefshme ne bazen e Crustdata (p.sh. 3027, 4202) dalin te para ne renditjen
  // sipas vitit. Kerkimi kryesor kerkon nje domain (qe te gjendet email nga faqja); p.paDomain = true eshte kerkesa e dyte, e vecante,
  // qe kerkon pikerisht kompanite PA domain (is_null). Ato te pa-ruajtura perjashtohen sipas ID-se se Crustdata (fusha crustdata_company_id
  // eshte filtrueshme dhe kurre bosh), jo sipas domain-it: dokumentimi nuk thote si sillet "not_in" per fusha boshe.
  const kushte = [
    { field: 'basic_info.year_founded', type: '=>', value: p.viti },
    { field: 'basic_info.year_founded', type: '=<', value: p.vitiMax },
    { field: 'basic_info.primary_domain', type: p.paDomain ? 'is_null' : 'is_not_null', value: null }
  ];
  if (!p.paDomain && p.perjashto && p.perjashto.length) kushte.push({ field: 'basic_info.primary_domain', type: 'not_in', value: p.perjashto });
  if (p.perjashtoId && p.perjashtoId.length) kushte.push({ field: 'crustdata_company_id', type: 'not_in', value: p.perjashtoId });
  if (p.industria) kushte.push({ field: 'taxonomy.professional_network_industry', type: '(.)', value: p.industria });
  if (p.shteti) kushte.push({ field: 'locations.country', type: '=', value: p.shteti });
  if (p.maksPunonjes) kushte.push({ field: 'headcount.total', type: '=<', value: p.maksPunonjes });
  return kushte.length === 1 ? kushte[0] : { op: 'and', conditions: kushte };
}

function normalizoDomain(d) { return String(d || '').trim().toLowerCase().replace(/^www\./, ''); }

// Domain-et qe nuk duhet te dalin serish: ato qe ky tab ia ka treguar me pare perdoruesit + ato te ruajtura nga Exa ose manualisht.
// Kufi 5,000: sipas dokumentimit te Crustdata nje liste "not_in" deri ne ~5,000-10,000 vlera kthehet shpejt.
// Te vogla (lowercase) sepse per liste mbi 100 vlera krahasimi eshte i ndjeshem ndaj shkronjave.
async function merrDomainetePara() {
  const kufi = 5000;
  const teGjitha = new Set();
  // Ato te shenuara "perfunduar" perjashtohen gjithmone, edhe pas "Lejo rishfaqjen".
  const pare = await pool.query("SELECT domain FROM kompani_pare WHERE fshih = true OR statusi = 'perfunduar' ORDER BY gjetur_at DESC LIMIT " + kufi);
  pare.rows.forEach(r => { const d = normalizoDomain(r.domain); if (d) teGjitha.add(d); });
  const ruajtura = await pool.query('SELECT domain FROM bizneset_gjetur');
  ruajtura.rows.forEach(r => { const d = normalizoDomain(r.domain); if (d) teGjitha.add(d); });
  return Array.from(teGjitha).slice(0, kufi);
}

// ID-te e Crustdata te kompanive pa domain qe nuk duhet te dalin serish (te pare me pare, ose te shenuara "perfunduar").
async function merrIdetePaDomain() {
  const r = await pool.query("SELECT crustdata_id FROM kompani_pa_domain WHERE fshih = true OR statusi = 'perfunduar' ORDER BY gjetur_at DESC LIMIT 5000");
  return r.rows.map(x => Number(x.crustdata_id)).filter(n => Number.isSafeInteger(n) && n > 0);
}

// Ruan kompanite me te dhenat e plota. Nese ekzistojne (p.sh. ruajtur me pare me email), te dhenat e vjetra MBETEN dhe
// plotesohen vetem fushat bosh; "fshih" behet perseri true. Kthen gjendjen e email-it per secilen dhe e shton te objekti.
async function ruajKompaniteMeDomain(kompanite, kategoria) {
  const A = { d: [], emri: [], web: [], viti: [], pun: [], shteti: [], qyteti: [], li: [], tw: [] }, pare = new Set(), objekte = {};
  for (const k of kompanite) {
    const d = normalizoDomain(k.domain);
    if (!d || pare.has(d)) continue;
    pare.add(d); objekte[d] = k;
    A.d.push(d); A.emri.push(k.emri || ''); A.web.push(k.website || null); A.viti.push(Number.isInteger(k.viti) ? k.viti : null);
    A.pun.push(k.punonjes || null); A.shteti.push(k.shteti || null); A.qyteti.push(k.qyteti || null); A.li.push(k.linkedin || null); A.tw.push(k.twitter || null);
  }
  if (!A.d.length) return 0;
  const r = await pool.query(
    'INSERT INTO kompani_pare (domain, emri, website, viti, punonjes, shteti, qyteti, linkedin, twitter, kategoria) ' +
    'SELECT u.d, u.e, u.w, u.v, u.p, u.s, u.q, u.l, u.t, $10::text FROM UNNEST($1::text[], $2::text[], $3::text[], $4::int[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[]) AS u(d, e, w, v, p, s, q, l, t) ' +
    'ON CONFLICT (domain) DO UPDATE SET emri = COALESCE(NULLIF(kompani_pare.emri, \'\'), EXCLUDED.emri), website = COALESCE(kompani_pare.website, EXCLUDED.website), ' +
    'viti = COALESCE(kompani_pare.viti, EXCLUDED.viti), punonjes = COALESCE(kompani_pare.punonjes, EXCLUDED.punonjes), shteti = COALESCE(kompani_pare.shteti, EXCLUDED.shteti), ' +
    'qyteti = COALESCE(kompani_pare.qyteti, EXCLUDED.qyteti), linkedin = COALESCE(kompani_pare.linkedin, EXCLUDED.linkedin), twitter = COALESCE(kompani_pare.twitter, EXCLUDED.twitter), kategoria = COALESCE(kompani_pare.kategoria, EXCLUDED.kategoria), fshih = true ' +
    'RETURNING domain, email, email_lloji, email_mx, email_burimi, email_gjendja, kategoria, statusi',
    [A.d, A.emri, A.web, A.viti, A.pun, A.shteti, A.qyteti, A.li, A.tw, kategoria || null]);
  (r.rows || []).forEach(x => { const k = objekte[normalizoDomain(x.domain)]; if (k) Object.assign(k, { email: x.email || null, email_lloji: x.email_lloji || null, email_mx: x.email_mx == null ? null : x.email_mx, email_burimi: x.email_burimi || null, email_gjendja: x.email_gjendja || null, kategoria: x.kategoria || null, statusi: x.statusi || 'pa-perfunduar' }); });
  return A.d.length;
}

// Kompanite PA domain (vetem me LinkedIn): ruhen sipas ID-se se Crustdata (fusha qe kthehet gjithmone). Te dhenat e vjetra MBETEN (dhe statusi),
// plotesohen vetem fushat bosh; "fshih" behet perseri true. Pa ID nuk ka si identifikohet kompania, prandaj anashkalohet.
async function ruajKompanitePaDomain(kompanite, kategoria) {
  const A = { id: [], emri: [], web: [], viti: [], pun: [], shteti: [], qyteti: [], li: [], tw: [] }, pare = new Set(), objekte = {};
  for (const k of kompanite) {
    const id = Number(k.id);
    if (!Number.isSafeInteger(id) || id <= 0 || pare.has(id)) continue;
    pare.add(id); objekte[id] = k;
    A.id.push(id); A.emri.push(k.emri || ''); A.web.push(k.website || null); A.viti.push(Number.isInteger(k.viti) ? k.viti : null);
    A.pun.push(k.punonjes || null); A.shteti.push(k.shteti || null); A.qyteti.push(k.qyteti || null); A.li.push(k.linkedin || null); A.tw.push(k.twitter || null);
  }
  if (!A.id.length) return 0;
  const r = await pool.query(
    'INSERT INTO kompani_pa_domain (crustdata_id, emri, website, viti, punonjes, shteti, qyteti, linkedin, twitter, kategoria) ' +
    'SELECT u.i, u.e, u.w, u.v, u.p, u.s, u.q, u.l, u.t, $10::text FROM UNNEST($1::bigint[], $2::text[], $3::text[], $4::int[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[]) AS u(i, e, w, v, p, s, q, l, t) ' +
    'ON CONFLICT (crustdata_id) DO UPDATE SET emri = COALESCE(NULLIF(kompani_pa_domain.emri, \'\'), EXCLUDED.emri), website = COALESCE(kompani_pa_domain.website, EXCLUDED.website), ' +
    'viti = COALESCE(kompani_pa_domain.viti, EXCLUDED.viti), punonjes = COALESCE(kompani_pa_domain.punonjes, EXCLUDED.punonjes), shteti = COALESCE(kompani_pa_domain.shteti, EXCLUDED.shteti), ' +
    'qyteti = COALESCE(kompani_pa_domain.qyteti, EXCLUDED.qyteti), linkedin = COALESCE(kompani_pa_domain.linkedin, EXCLUDED.linkedin), twitter = COALESCE(kompani_pa_domain.twitter, EXCLUDED.twitter), kategoria = COALESCE(kompani_pa_domain.kategoria, EXCLUDED.kategoria), fshih = true ' +
    'RETURNING crustdata_id, kategoria, statusi',
    [A.id, A.emri, A.web, A.viti, A.pun, A.shteti, A.qyteti, A.li, A.tw, kategoria || null]);
  (r.rows || []).forEach(x => { const k = objekte[Number(x.crustdata_id)]; if (k) Object.assign(k, { pa_domain: true, kategoria: x.kategoria || null, statusi: x.statusi || 'pa-perfunduar' }); });
  return A.id.length;
}

// Ruan te gjitha kompanite e nje kerkimi: ato me domain te kompani_pare, ato pa domain te kompani_pa_domain.
async function ruajKompanite(kompanite, kategoria) {
  const paDomain = kompanite.filter(k => !normalizoDomain(k.domain));
  const meDomain = kompanite.filter(k => normalizoDomain(k.domain));
  const n = await ruajKompaniteMeDomain(meDomain, kategoria);
  return n + await ruajKompanitePaDomain(paDomain, kategoria);
}

// Kerkesa qe i kthehet faqes per shfaqje: lista e gjate e domain-eve te perjashtuara zevendesohet me nje permbledhje.
function kerkesePerShfaqje(trupi) {
  const kopje = JSON.parse(JSON.stringify(trupi));
  const trego = k => { if (k && k.type === 'not_in' && Array.isArray(k.value)) k.value = '[' + k.value.length + (k.field === 'crustdata_company_id' ? ' ID te perjashtuara]' : ' domain-e te perjashtuara]'); };
  if (kopje.filters) { trego(kopje.filters); (kopje.filters.conditions || []).forEach(trego); }
  return kopje;
}

// ===== GJETJA E EMAIL-IT NGA FAQJA E KOMPANISE (pa Generect) =====
// Lexon faqen kryesore + faqet e kontaktit/rreth nesh (maks. 4 faqe per kompani), nxjerr adresat qe jane SHKRUAR atje
// (mailto: dhe tekst) dhe zgjedh me te miren (AI kur ka disa). Nuk hamendeson kurre adresa: nje adrese pranohet vetem nese
// ndodhet fjale per fjale ne faqe. Faqet merren vetem per domain-e te ruajtura nga Crustdata, me mbrojtje SSRF.
const dnsP = require('dns').promises;
const net = require('net');

function ipPublike(ip) {
  if (net.isIPv4(ip)) {
    const [a, b, c] = ip.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 169 && b === 254) return false;                  // link-local (p.sh. 169.254.169.254, metadata cloud)
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;        // CGNAT
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    return true;
  }
  if (net.isIPv6(ip)) {
    const x = ip.toLowerCase();
    if (x === '::' || x === '::1') return false;
    if (x.startsWith('fc') || x.startsWith('fd')) return false;
    if (/^fe[89ab]/.test(x)) return false;
    const m = x.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (m) return ipPublike(m[1]);
    return true;
  }
  return false;
}

async function adreseESigurt(host) {
  const h = String(host).replace(/^\[|\]$/g, '');
  if (net.isIP(h)) { if (!ipPublike(h)) throw new Error('adrese e brendshme e bllokuar'); return; }
  let adresat;
  try { adresat = await dnsP.lookup(h, { all: true }); } catch (e) { throw new Error('domain-i nuk zgjidhet'); }
  if (!adresat.length || !adresat.every(a => ipPublike(a.address))) throw new Error('domain-i shpie te nje adrese e brendshme: bllokuar');
}

async function lexoTrupin(r, kufi) {
  if (r.body && typeof r.body.getReader === 'function') {
    const lexues = r.body.getReader(), dekoder = new TextDecoder('utf-8');
    let tekst = '', total = 0;
    while (total < kufi) {
      const { done, value } = await lexues.read();
      if (done) break;
      total += value.length; tekst += dekoder.decode(value, { stream: true });
    }
    try { await lexues.cancel(); } catch (e) { /* tashme e mbyllur */ }
    return tekst;
  }
  return String(await r.text()).slice(0, kufi);
}

// Merr nje faqe te sigurt: vetem http(s) ne portet 80/443, pa kredenciale, ridrejtimet ndiqen dorazi (maks. 3) dhe
// secili kalon perseri kontrollin e adreses; vetem HTML; maks. ~400 KB.
async function marrFaqen(url, afati) {
  let aktual = url;
  for (let hop = 0; hop < 4; hop++) {
    const u = new URL(aktual);
    if (!/^https?:$/.test(u.protocol) || u.username || u.password) throw new Error('adrese e palejuar');
    if (u.port && u.port !== '80' && u.port !== '443') throw new Error('port i palejuar');
    await adreseESigurt(u.hostname);
    const r = await fetchMeKohe(u.toString(), { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0 (compatible; emailet)', 'accept': 'text/html,application/xhtml+xml' } }, afati || 7000);
    const vendndodhja = r.headers && r.headers.get ? r.headers.get('location') : null;
    if (r.status >= 300 && r.status < 400 && vendndodhja) { aktual = new URL(vendndodhja, u).toString(); continue; }
    if (!r.ok) return { ok: false, status: r.status, html: '', url: u.toString() };
    const tipi = String((r.headers && r.headers.get && r.headers.get('content-type')) || '').toLowerCase();
    if (tipi && !/text\/html|application\/xhtml/.test(tipi)) return { ok: false, status: r.status, html: '', url: u.toString() };
    return { ok: true, status: r.status, html: await lexoTrupin(r, 400000), url: u.toString() };
  }
  throw new Error('shume ridrejtime');
}

function dekodoHtml(s) {
  return dekodoXml(String(s || '')
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch (e) { return ''; } })
    .replace(/&commat;/gi, '@').replace(/&nbsp;/gi, ' '));
}

// Lidhjet e brendshme drejt faqeve te kontaktit/rreth nesh/ekipit (maks. 3).
function gjejLidhjetKontakt(html, baza) {
  const dalja = [], pare = new Set();
  let b; try { b = new URL(baza); } catch (e) { return dalja; }
  const emriHost = h => h.replace(/^www\./, '');
  for (const m of String(html || '').matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi)) {
    const tekst = m[2].replace(/<[^>]+>/g, ' ');
    if (!/contact|about|team|impressum|partner|advertis|get-in-touch|reach-us/i.test(m[1] + ' ' + tekst)) continue;
    let u; try { u = new URL(dekodoXml(m[1]), b); } catch (e) { continue; }
    if (!/^https?:$/.test(u.protocol) || emriHost(u.hostname) !== emriHost(b.hostname)) continue;
    u.hash = '';
    const k = u.toString();
    if (k !== b.toString() && !pare.has(k)) { pare.add(k); dalja.push(k); }
  }
  return dalja.slice(0, 3);
}

const EMAIL_RE = /[A-Za-z0-9][A-Za-z0-9._%+-]*@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const EMAIL_SKEDAR = /\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|json|woff2?|ttf|eot|pdf|zip|mp4|webm)$/i;
const DOMAIN_ANASHKALO = /(^|\.)(example\.(com|org|net)|domain\.com|yourdomain\.com|yourcompany\.com|email\.com|test\.com|sentry\.io|wixpress\.com|godaddy\.com|schema\.org|w3\.org|gravatar\.com|cloudflare\.com|googleusercontent\.com)$/i;
const LOCAL_ANASHKALO = /^(noreply|no-reply|donotreply|do-not-reply|mailer-daemon|postmaster|abuse|webmaster|hostmaster|privacy|legal|dpo|gdpr|unsubscribe|bounce|bounces|root|email|name|you|your|yourname|user|username|example|test)$/i;
function emailIVlefshem(e) {
  const [l, d] = e.split('@');
  if (!l || !d || EMAIL_SKEDAR.test(e) || DOMAIN_ANASHKALO.test(d) || LOCAL_ANASHKALO.test(l)) return false;
  if (/\dx$/.test(l) || l.length > 64 || e.length > 120) return false;
  return true;
}

// Nxjerr adresat e SHKRUARA ne faqe: mailto:, teksti i dukshem dhe JSON-LD. Kthen [{ email, kontekst }].
function nxirrEmailet(html) {
  let t = String(html || '');
  const ld = (t.match(/<script[^>]+application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi) || []).map(s => s.replace(/<[^>]+>/g, ' ')).join(' ');
  t = t.replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' ');
  const gjetur = new Map();
  const shto = (em, ktx) => {
    const e = String(em).trim().replace(/[.,;:)\]>]+$/, '').toLowerCase();
    if (/^[a-z0-9][a-z0-9._%+-]*@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(e) && !gjetur.has(e)) gjetur.set(e, ktx || '');
  };
  for (const m of t.matchAll(/href\s*=\s*["']mailto:([^"'?#\s>]+)/gi)) {
    let v = dekodoHtml(m[1]); try { v = decodeURIComponent(v); } catch (e) { /* mbetet siç eshte */ }
    shto(v, 'mailto');
  }
  const tekst = dekodoHtml(t.replace(/<[^>]+>/g, ' ') + ' ' + ld).replace(/\s+/g, ' ');
  for (const m of tekst.matchAll(EMAIL_RE)) shto(m[0], tekst.slice(Math.max(0, m.index - 50), m.index + m[0].length + 50).trim());
  return Array.from(gjetur.entries()).filter(([e]) => emailIVlefshem(e)).map(([email, kontekst]) => ({ email, kontekst }));
}

// Rangu per bashkepunim: person (0) > partner/marketing/founder (1) > hello/contact/info (2) > support/sales (3) > press/jobs (4).
const ROL_PRIORITET = [
  ['partner', 'partners', 'partnership', 'partnerships', 'marketing', 'growth', 'founder', 'founders', 'ceo', 'owner', 'bd', 'business'],
  ['hello', 'hi', 'hey', 'contact', 'info', 'team', 'mail', 'office', 'general', 'enquiries', 'inquiries', 'contacto'],
  ['support', 'help', 'sales', 'admin', 'billing', 'service', 'accounts'],
  ['press', 'media', 'pr', 'jobs', 'careers', 'hr', 'recruiting', 'recruitment']
];
function rangEmail(email) {
  const l = email.split('@')[0].toLowerCase().replace(/[^a-z]/g, '');
  const i = ROL_PRIORITET.findIndex(g => g.includes(l));
  return i === -1 ? { lloji: 'person', rang: 0 } : { lloji: 'role', rang: i + 1 };
}

// AI zgjedh VETEM nga lista e dhene (kthen numrin e kandidatit), keshtu nuk mund te shpik adrese.
async function zgjidhEmailMeAI(domain, kandidatet) {
  const lista = kandidatet.slice(0, 8).map((k, i) => (i + 1) + '. ' + k.email + (k.kontekst && k.kontekst !== 'mailto' ? ' — "' + k.kontekst.slice(0, 100) + '"' : '')).join('\n');
  const prompt =
    'You pick the best contact email address for a first outreach message to the owner or founder of a small software company, about a partnership (cross-promotion of each other\'s products).\n' +
    'Company website: ' + domain + '\nCandidate addresses found written on its website (with the text around each):\n' + lista + '\n\n' +
    'Rules: prefer a named person (founder, CEO, owner) over a shared mailbox; prefer partnerships, marketing, hello or contact over support, billing, jobs or press. Never invent an address. ' +
    'Answer ONLY with JSON: {"index": N} where N is the number of the best candidate, or {"index": null} if none is suitable.';
  const r = await fetchMeKohe('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OPENAI_KEY },
    body: JSON.stringify({ model: OPENAI_MODELI, messages: [{ role: 'user', content: prompt }] })
  }, 30000);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('OpenAI: ' + ((data.error && data.error.message) || r.status));
  const tekst = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  const m = tekst.match(/"index"\s*:\s*(null|\d+)/);
  if (!m) throw new Error('AI nuk ktheu format te vlefshem');
  if (m[1] === 'null') return null;
  const k = kandidatet.slice(0, 8)[Number(m[1]) - 1];
  if (!k) throw new Error('AI ktheu numer jashte liste');
  return k;
}

// Kthen { email, lloji, metoda } ose null (asnje adrese e pershtatshme).
async function zgjidhEmail(domain, kandidatet) {
  const me = kandidatet.map(k => {
    const d = k.email.split('@')[1];
    return Object.assign({}, k, rangEmail(k.email), { nedomain: d === domain || d.endsWith('.' + domain) });
  });
  const pool_ = me.some(k => k.nedomain) ? me.filter(k => k.nedomain) : me; // adresat e domain-it te kompanise kane perparesi
  if (pool_.length === 1) return { email: pool_[0].email, lloji: pool_[0].lloji, metoda: 'e vetme' };
  if (OPENAI_KEY) {
    try {
      const k = await zgjidhEmailMeAI(domain, pool_);
      return k ? { email: k.email, lloji: rangEmail(k.email).lloji, metoda: 'AI' } : null;
    } catch (e) { /* AI s'punoi: bie te rregulli i thjeshte */ }
  }
  const h = pool_.slice().sort((a, b) => a.rang - b.rang || a.email.localeCompare(b.email))[0];
  return { email: h.email, lloji: h.lloji, metoda: 'rregull' };
}

async function kontrolloMX(email) {
  try { const r = await dnsP.resolveMx(email.split('@')[1]); return Array.isArray(r) && r.length > 0; }
  catch (e) { return (e && (e.code === 'ENODATA' || e.code === 'ENOTFOUND')) ? false : null; } // null = e panjohur (p.sh. DNS i zene)
}

// Gjen email-in per nje domain. Kthen { gjendja: 'u-gjet'|'pa-email'|'gabim', email, lloji, mx, burimi, mesazh }.
async function gjejEmailPerKompani(domain) {
  const afati = Date.now() + 25000;
  const baza = 'https://' + domain + '/';
  const faqet = [], gabime = [];
  const merr = async u => {
    try { const f = await marrFaqen(u, 7000); if (f.ok) faqet.push(f); else gabime.push('HTTP ' + f.status); }
    catch (e) { gabime.push(String(e.message).replace(/https?:\/\/\S+/g, '[adrese]')); }
  };
  await merr(baza);
  if (!faqet.length) return { gjendja: 'gabim', mesazh: 'Faqja nuk u hap (' + (gabime[0] || 'pa pergjigje') + ')' };
  const planifikuar = gjejLidhjetKontakt(faqet[0].html, faqet[0].url).concat(['/contact', '/contact-us', '/about'].map(p => baza.replace(/\/$/, '') + p));
  for (const u of planifikuar) {
    if (faqet.length >= 4 || Date.now() > afati) break;
    if (faqet.some(f => f.url === u)) continue;
    await merr(u);
  }
  const kandidatet = [], pare = new Set();
  for (const f of faqet) for (const k of nxirrEmailet(f.html)) if (!pare.has(k.email)) { pare.add(k.email); kandidatet.push(Object.assign({ burimi: f.url }, k)); }
  if (!kandidatet.length) return { gjendja: 'pa-email', mesazh: 'Asnje email i shkruar ne ' + faqet.length + ' faqe te lexuara' };
  const zgj = await zgjidhEmail(domain, kandidatet);
  if (!zgj) return { gjendja: 'pa-email', mesazh: 'Asnje nga adresat e gjetura nuk duket e pershtatshme' };
  const burimi = (kandidatet.find(k => k.email === zgj.email) || {}).burimi || null;
  return { gjendja: 'u-gjet', email: zgj.email, lloji: zgj.lloji, mx: await kontrolloMX(zgj.email), burimi, mesazh: 'Zgjedhur me: ' + zgj.metoda + ' (nga ' + kandidatet.length + ' adresa)' };
}
let emailNeVazhdim = 0;

function sheshoKompanine(c) {
  const b = c.basic_info || {}, l = c.locations || {}, s = c.social_profiles || {};
  return {
    id: c.crustdata_company_id || null, emri: b.name || null, domain: b.primary_domain || null, website: b.website || null,
    viti: b.year_founded || null, punonjes: b.employee_count_range || null, shteti: l.country || null, qyteti: l.headquarters || null,
    linkedin: b.professional_network_url || null, twitter: s.twitter_url || null
  };
}

// Dokumentimi permend dy emra per celesin e renditjes ("column" ne shembuj, "field" ne nje shembull tjeter).
// Provohen me radhe; nje gabim 400 nuk kushton kredite. Gabimet e tjera ndalojne menjehere.
async function kerkoKompani(trupiBaze) {
  // Kerkim semantik (me pershkrim): renditja eshte sipas perputhjes dhe dokumentimi nuk lejon "sorts" bashke me "search".
  if (trupiBaze.search) {
    const r = await crustdataThirr('POST', '/company/search', trupiBaze);
    return { r, perdorur: { sorts: 'sipas pershtatshmerise me pershkrimin', trupi: trupiBaze } };
  }
  const variantet = [
    { emri: 'column', sorts: [{ column: 'basic_info.year_founded', order: 'desc' }] },
    { emri: 'field', sorts: [{ field: 'basic_info.year_founded', order: 'desc' }] },
    { emri: 'pa renditje', sorts: null }
  ];
  let r = null, perdorur = null;
  for (const v of variantet) {
    const trupi = Object.assign({}, trupiBaze);
    if (v.sorts) trupi.sorts = v.sorts;
    r = await crustdataThirr('POST', '/company/search', trupi);
    perdorur = { sorts: v.emri, trupi };
    if (r.status !== 400 || !/sort|order/i.test(JSON.stringify(r.data))) break;
  }
  return { r, perdorur };
}

// ===== ALERTE: Google Alerts te dorezuara si RSS (Atom) feed =====
// Variabel Railway: GOOGLE_ALERTS_FEEDS = adresat e feed-eve (https), te ndara me presje, pikepresje, hapesire ose rresht te ri.
// Ato jane sekrete (lidhen me llogarine Google) dhe nuk i kthehen kurre faqes. Ruhen vetem lidhja, titulli, copa e tekstit dhe data.
const ALERTE_STATUSET = ['i ri', 'u pergjigj', 'e lashe'];
const ALERTE_KOLONAT = 'id, url, titulli, fragmenti, burimi, alerti, alertet, publikuar, gjetur_at, statusi';
const alerteGjendja = { fundit: null, feedet: 0, te_reja: 0, gabime: [], detaje: [] };
let alertePoll = false;

function alerteFeedet() {
  return String(process.env.GOOGLE_ALERTS_FEEDS || '').split(/[\s,;]+/).map(s => s.trim()).filter(s => /^https:\/\//i.test(s));
}

function dekodoXml(s) {
  return String(s || '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (m, n) => { try { return String.fromCodePoint(parseInt(n, 10)); } catch (e) { return ''; } })
    .replace(/&amp;/g, '&');
}

// HTML i futur ne XML -> tekst i thjeshte. Etiketat hiqen pa hapesire, qe "I-<b>66</b>" te mbetet "I-66".
function pastroTekstinAlerte(s) {
  const pa = String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  return dekodoXml(dekodoXml(pa).replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

// Lidhjet ne feed jane te mbeshtjella nga Google (google.com/url?...&url=ADRESA_E_VERTETE). Kthen adresen e vertete.
function demaskoUrlGoogle(href) {
  try {
    const u = new URL(dekodoXml(href));
    if (/(^|\.)google\.[a-z.]+$/i.test(u.hostname) && u.pathname === '/url') {
      const real = u.searchParams.get('url') || u.searchParams.get('q');
      if (real && /^https?:\/\//i.test(real)) return real;
    }
    return /^https?:$/.test(u.protocol) ? u.toString() : null;
  } catch (e) { return null; }
}

// Per te shmangur dublikatat: pa fragment (#), pa parametra utm_, pa "/" ne fund.
function normalizoUrlAlerte(u) {
  try {
    const x = new URL(u);
    x.hash = '';
    Array.from(x.searchParams.keys()).forEach(k => { if (/^utm_/i.test(k)) x.searchParams.delete(k); });
    let s = x.toString();
    if (s.endsWith('/') && x.pathname !== '/') s = s.slice(0, -1);
    return s;
  } catch (e) { return null; }
}

// Lexon nje feed Atom te Google Alerts pa biblioteke XML (regex). Hyrjet pa lidhje te vlefshme anashkalohen.
function lexoAtom(xml) {
  const tekst = String(xml || '');
  const fillimi = tekst.search(/<entry[\s>]/i);
  const koka = fillimi === -1 ? tekst : tekst.slice(0, fillimi);
  const titulliFeed = pastroTekstinAlerte((koka.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  const alerti = titulliFeed.replace(/^Google Alert\s*-\s*/i, '');
  const hyrjet = [];
  (tekst.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || []).forEach(h => {
    const href = (h.match(/<link[^>]*\bhref=["']([^"']+)["']/i) || [])[1];
    const url = href ? demaskoUrlGoogle(href) : null;
    if (!url) return;
    const titulli = pastroTekstinAlerte((h.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
    const fragmenti = pastroTekstinAlerte((h.match(/<content[^>]*>([\s\S]*?)<\/content>/i) || [])[1] || '');
    const dataTekst = (h.match(/<published>\s*([^<]+?)\s*<\/published>/i) || h.match(/<updated>\s*([^<]+?)\s*<\/updated>/i) || [])[1];
    const d = dataTekst ? new Date(dataTekst) : null;
    let burimi = '';
    try { burimi = new URL(url).hostname.replace(/^www\./, ''); } catch (e) { burimi = ''; }
    hyrjet.push({ url, titulli, fragmenti, burimi, publikuar: d && !isNaN(d) ? d.toISOString() : null });
  });
  return { alerti, hyrjet, gjithsej: (tekst.match(/<entry[\s>]/gi) || []).length };
}

// Ruan hyrjet e reja (dublikatet sipas URL-se nuk shtohen dy here). Nese nje lidhje ekziston dhe e ka gjetur edhe nje alert tjeter,
// emri i atij alerti shtohet te "alertet" te rreshti ekzistues. Kthen sa ishin vertet te reja.
async function ruajHyrjetAlerte(hyrjet, alerti) {
  const pare = new Set(), urls = [], titujt = [], fragmentet = [], burimet = [], alertet = [], datat = [];
  for (const h of hyrjet) {
    const u = normalizoUrlAlerte(h.url);
    if (!u || pare.has(u)) continue;
    pare.add(u); urls.push(u); titujt.push(h.titulli || ''); fragmentet.push(h.fragmenti || ''); burimet.push(h.burimi || ''); alertet.push(alerti || ''); datat.push(h.publikuar || null);
  }
  if (!urls.length) return 0;
  const r = await pool.query(
    `WITH te_reja AS (
       INSERT INTO alerte_rezultate (url, titulli, fragmenti, burimi, alerti, alertet, publikuar)
       SELECT u, t, f, b, a, CASE WHEN a <> '' THEN ARRAY[a] ELSE '{}'::text[] END, p
       FROM UNNEST($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::timestamptz[]) AS x(u, t, f, b, a, p)
       ON CONFLICT (url) DO NOTHING
       RETURNING url
     ), shtuar AS (
       UPDATE alerte_rezultate r SET alertet = COALESCE(r.alertet, '{}'::text[]) || x.a
       FROM UNNEST($1::text[], $5::text[]) AS x(u, a)
       WHERE r.url = x.u AND x.a <> '' AND NOT (x.a = ANY(COALESCE(r.alertet, '{}'::text[])))
       RETURNING r.url
     )
     SELECT (SELECT COUNT(*) FROM te_reja)::int AS te_reja, (SELECT COUNT(*) FROM shtuar)::int AS shtuar`,
    [urls, titujt, fragmentet, burimet, alertet, datat]);
  return r.rows[0].te_reja;
}

async function lexoFeedetAlerte() {
  const feedet = alerteFeedet();
  const gjendje = { fundit: new Date().toISOString(), feedet: feedet.length, te_reja: 0, gabime: [], detaje: [] };
  for (let i = 0; i < feedet.length; i++) {
    try {
      const r = await fetchMeKohe(feedet[i], { headers: { 'user-agent': 'Mozilla/5.0 (compatible; emailet)' } }, 20000);
      if (!r.ok) {
        gjendje.gabime.push('Feed ' + (i + 1) + ': HTTP ' + r.status);
        gjendje.detaje.push({ nr: i + 1, alerti: null, gabim: 'HTTP ' + r.status });
        continue;
      }
      const { alerti, hyrjet, gjithsej } = lexoAtom(await r.text());
      const te_reja = await ruajHyrjetAlerte(hyrjet, alerti);
      gjendje.te_reja += te_reja;
      gjendje.detaje.push({ nr: i + 1, alerti, hyrje: hyrjet.length, gjithsej, te_reja });
    } catch (e) {
      // adresat e feed-eve jane sekrete: hiqen nga cdo mesazh gabimi
      const mesazhi = String(e.message).replace(/https?:\/\/\S+/g, '[adrese]');
      gjendje.gabime.push('Feed ' + (i + 1) + ': ' + mesazhi);
      gjendje.detaje.push({ nr: i + 1, alerti: null, gabim: mesazhi });
    }
  }
  Object.assign(alerteGjendja, gjendje);
  return gjendje;
}

// Leximi automatik: 30 sekonda pas nisjes, pastaj cdo ALERTS_POLL_MINUTES minuta (paracaktim 60, minimum 5).
function nisAlertePoll() {
  if (!alerteFeedet().length) return;
  const minuta = Math.max(5, parseInt(process.env.ALERTS_POLL_MINUTES, 10) || 60);
  const ekzekuto = async () => {
    if (alertePoll) return;
    alertePoll = true;
    try { await lexoFeedetAlerte(); }
    catch (e) { console.error('alerte:', String(e.message).replace(/https?:\/\/\S+/g, '[adrese]')); }
    finally { alertePoll = false; }
  };
  setTimeout(ekzekuto, 30 * 1000).unref();
  setInterval(ekzekuto, minuta * 60 * 1000).unref();
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
  .bisChk{ display:inline-flex; align-items:center; gap:6px; margin:0 16px 8px 0; font-size:13px; color:#c9d1d9; cursor:pointer; }
  .bisChk input{ width:16px; height:16px; padding:0; margin:0; accent-color:#3b6ef0; }
  .fusha{ display:flex; flex-direction:column; gap:4px; font-size:12px; color:#8b949e; }
  .kompChip{ padding:4px 10px; font-size:12px; font-weight:400; background:#1c2230; border:1px solid #2a313c; border-radius:14px; color:#c9d1d9; cursor:pointer; margin:0 4px 6px 0; }
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
    <div class="tab" id="tabKompani" onclick="ndryshoTab('kompani')">Kompani te reja</div>
    <div class="tab" id="tabAlerte" onclick="ndryshoTab('alerte')">Alerte</div>
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
      <input type="text" id="manEmail" placeholder="Email, ose gjithe lista (e ndare me ; ose ,)" style="max-width:320px;" />
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
    <p class="mut" style="margin:14px 0 6px;">3. Faqet (opsionale): zgjidh ku te kerkohet. Asnje e zgjedhur = gjithe interneti. Maksimumi 6.</p>
    <div>
      <label class="bisChk"><input type="checkbox" class="bisFaqe" value="reddit.com"> Reddit</label>
      <label class="bisChk"><input type="checkbox" class="bisFaqe" value="indiehackers.com"> Indie Hackers</label>
      <label class="bisChk"><input type="checkbox" class="bisFaqe" value="news.ycombinator.com"> Hacker News</label>
      <label class="bisChk"><input type="checkbox" class="bisFaqe" value="quora.com"> Quora</label>
      <label class="bisChk"><input type="checkbox" class="bisFaqe" value="facebook.com"> Facebook</label>
      <label class="bisChk"><input type="checkbox" class="bisFaqe" value="linkedin.com"> LinkedIn</label>
    </div>
    <input type="text" id="bisFaqeTjera" placeholder="Te tjera: domain-e te ndara me presje (p.sh. dev.to, lobste.rs)" style="width:100%; box-sizing:border-box; max-width:100%; margin-bottom:12px;" />
    <div class="row">
      <select id="bisKoha">
        <option value="" selected>Cdo kohe</option>
        <option value="m">1 muaj</option>
        <option value="w">1 jave</option>
        <option value="d">24 oret e fundit</option>
      </select>
      <button onclick="bisKerko(this)">Kerko te Serper</button>
      <span id="bisKerStat" style="font-size:13px; color:#8b949e; align-self:center;"></span>
    </div>
    <p class="mut" style="margin-bottom:16px;">Cdo rresht eshte 1 kerkese, rreth 1 kredit Serper (10 rezultate). Ne rezultate shihet kerkesa e sakte qe shkoi te Google.</p>
    <div id="bisRez"></div>
  </div>

  <div class="sec-panel" id="panelKompani">
    <p class="mut">Gjen kompani te themeluara rishtas permes Crustdata dhe i ruan te databaza (emri, faqja, viti, punonjes, shteti, LinkedIn). Sipas dokumentimit, kerkimi kushton 0.03 kredite per rezultat, plus rreth 0.1 per filtrin e industrise dhe 0.2 per filtrin e punonjesve; kostoja e sakte shfaqet pas cdo kerkese. Fusha Fjale kyce kerkon sipas kuptimit (jo vetem sipas etiketes se industrise) dhe, kur eshte e mbushur, i rendit rezultatet sipas perputhjes, jo sipas vitit; filtrat e tjere mbeten kushte te forta. Butoni Gjej email lexon faqen e kompanise (kryesore, kontakt, rreth nesh) dhe merr email-in qe eshte SHKRUAR atje; kur ka disa, AI zgjedh me te mirin. Asnje adrese nuk hamendesohet, dhe kjo nuk shpenzon kredite Crustdata. Te gjitha te ruajturat shfaq edhe ato te gjeneruara me pare. Kompanite qe Crustdata i kthen pa domain (vetem me LinkedIn) ruhen gjithashtu dhe dalin vetem te filtri Pa domain. Per kompanite pa domain, dhe per ato me domain ku nuk u gjet email, ka nje zgjedhes statusi ne te djathte (E paperfunduar / E perfunduar): shenoje E perfunduar pasi t'i kontaktosh vete, dhe ato nuk dalin me te kerkimet.</p>
    <div class="row">
      <div class="fusha"><span>Themeluar nga viti (perfshire)</span><input type="number" id="kompViti" value="2025" min="1990" max="2030" style="width:150px;" oninput="kompVleresim()" /></div>
      <div class="fusha"><span>Industria (opsionale)</span><input type="text" id="kompIndustria" value="Software Development" style="width:230px; flex:none; min-width:0;" oninput="kompVleresim()" /></div>
      <div class="fusha"><span>Fjale kyce / pershkrim (opsionale)</span><input type="text" id="kompPershkrim" placeholder="p.sh. B2B SaaS per ekipe marketingu" style="width:300px; flex:none; min-width:0;" /></div>
      <div class="fusha"><span>Emri i kategorise (ruhet me kompanite)</span><input type="text" id="kompKategoria" placeholder="p.sh. payroll-software" maxlength="60" style="width:230px; flex:none; min-width:0;" /></div>
      <div class="fusha"><span>Shteti (opsionale)</span><input type="text" id="kompShteti" placeholder="p.sh. USA" style="width:120px; flex:none; min-width:0;" /></div>
      <div class="fusha"><span>Maks. punonjes (opsionale)</span><input type="number" id="kompMaks" placeholder="p.sh. 50" min="1" style="width:150px;" oninput="kompVleresim()" /></div>
      <div class="fusha"><span>Sa rezultate</span><select id="kompLimit" onchange="kompVleresim()"><option value="5">5</option><option value="10" selected>10</option><option value="20">20</option><option value="50">50</option></select></div>
    </div>
    <div class="row">
      <button onclick="kompKerko(this)">Kerko te Crustdata</button>
      <button onclick="kompSugjerime(this)" style="background:#2a313c;">Sugjerime industrie (falas)</button>
      <button onclick="kompKredite(this)" style="background:#2a313c;">Kreditet e mbetura (falas)</button>
      <span id="kompKoste" style="font-size:13px; color:#8b949e; align-self:center;"></span>
    </div>
    <div class="row">
      <label class="bisChk"><input type="checkbox" id="kompFshih" checked /> Fshih kompanite qe te jane dhene me pare</label>
      <label class="bisChk"><input type="checkbox" id="kompPaDomain" checked onchange="kompVleresim()" /> Perfshi edhe pa domain (kerkese e dyte, kosto shtese)</label>
      <button onclick="kompPastro(this)" style="background:#2a313c;">Lejo rishfaqjen (te dhenat mbeten)</button>
    </div>
    <div class="row">
      <button onclick="kompRuajtura(this)" style="background:#2a313c;">Te gjitha te ruajturat</button>
      <select id="kompFiltri" onchange="kompRuajtura()"><option value="te-gjitha">Te gjitha</option><option value="me-email">Vetem me email</option><option value="pa-email">Vetem pa email</option><option value="pa-domain">Pa domain</option></select>
      <select id="kompStatFiltri" onchange="kompRuajtura()"><option value="">Te gjitha statuset</option><option value="pa-perfunduar">E paperfunduar</option><option value="perfunduar">E perfunduar</option></select>
      <button onclick="kompGjejTeGjitha(this)" style="background:#2a313c;">Gjej email-et per ato qe s'i kam kerkuar (maks. 20)</button>
    </div>
    <div id="kompSugj" style="margin-bottom:8px;"></div>
    <div id="kompStat" style="font-size:13px; color:#8b949e; margin-bottom:12px;"></div>
    <div id="kompRez"></div>
  </div>

  <div class="sec-panel" id="panelAlerte">
    <p class="mut">Njoftimet e Google Alerts (te dorezuara si RSS) shfaqen ketu. Aplikacioni i lexon vete rreth cdo ore; mund ta shtysh me butonin. Ruhen vetem lidhja, titulli, copa e tekstit dhe data. Hape lidhjen dhe lexo postimin vete; dhe shenoje qe te dihet ku je.</p>
    <div class="row">
      <button onclick="alerteRifresko(this)">Rifresko tani</button>
      <select id="alerteFiltri" onchange="alerteNgarko()">
        <option value="i ri">Te reja</option>
        <option value="u pergjigj">U pergjigj</option>
        <option value="e lashe">E lashe</option>
        <option value="">Te gjitha</option>
      </select>
      <select id="alerteAlerti" onchange="alerteNgarko()" style="max-width:100%;">
        <option value="">Te gjitha alertet</option>
      </select>
    </div>
    <div id="alerteInfo" style="font-size:13px; color:#8b949e; margin-bottom:8px;"></div>
    <div id="alerteDetaje" style="font-size:12px; color:#8b949e; margin-bottom:8px; word-break:break-word;"></div>
    <div id="alerteStat" style="font-size:13px; color:#8b949e; margin-bottom:12px;"></div>
    <div id="alerteRez"></div>
  </div>

</div>
<script>
var pollTimer = null;
function ndryshoTab(cila){
  document.getElementById('tabGjenerim').className = cila === 'gjenerim' ? 'tab aktiv' : 'tab';
  document.getElementById('tabRuajtura').className = cila === 'ruajtura' ? 'tab aktiv' : 'tab';
  document.getElementById('tabShkarko').className = cila === 'shkarko' ? 'tab aktiv' : 'tab';
  document.getElementById('tabBisedat').className = cila === 'bisedat' ? 'tab aktiv' : 'tab';
  document.getElementById('tabKompani').className = cila === 'kompani' ? 'tab aktiv' : 'tab';
  document.getElementById('tabAlerte').className = cila === 'alerte' ? 'tab aktiv' : 'tab';
  document.getElementById('panelGjenerim').className = cila === 'gjenerim' ? 'sec-panel aktiv' : 'sec-panel';
  document.getElementById('panelRuajtura').className = cila === 'ruajtura' ? 'sec-panel aktiv' : 'sec-panel';
  document.getElementById('panelShkarko').className = cila === 'shkarko' ? 'sec-panel aktiv' : 'sec-panel';
  document.getElementById('panelBisedat').className = cila === 'bisedat' ? 'sec-panel aktiv' : 'sec-panel';
  document.getElementById('panelKompani').className = cila === 'kompani' ? 'sec-panel aktiv' : 'sec-panel';
  if(cila === 'kompani'){ kompVleresim(); }
  document.getElementById('panelAlerte').className = cila === 'alerte' ? 'sec-panel aktiv' : 'sec-panel';
  if(cila === 'alerte'){ alerteNgarko(); }
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
  var faqet = Array.prototype.slice.call(document.querySelectorAll('input.bisFaqe')).filter(function(c){ return c.checked; }).map(function(c){ return c.value; });
  document.getElementById('bisFaqeTjera').value.split(',').forEach(function(x){ x = x.trim(); if(x){ faqet.push(x); } });
  if(faqet.length > 6){ stat.textContent = 'Maksimumi 6 faqe per here.'; return; }
  btn.disabled = true; stat.textContent = 'Po kerkoj...'; rez.innerHTML = '';
  try{
    var r = await fetch('/api/bisedat/kerko', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ kerkesat: kerkesat, koha: document.getElementById('bisKoha').value, faqet: faqet }) });
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
    kuti.appendChild(bisNje('padding:10px 14px;background:#161b22;font-size:13px;', 'Kerkesa: ' + (x.qFinal || x.q) + (x.ok ? '  |  ' + x.organic.length + ' rezultate' : '')));
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
function kompVleresim(){
  var lim = parseInt(document.getElementById('kompLimit').value, 10) || 10;
  var cmim = 0.03;
  if(document.getElementById('kompIndustria').value.trim()){ cmim += 0.1; }
  if(parseInt(document.getElementById('kompMaks').value, 10) > 0){ cmim += 0.2; }
  var dyfishi = !!(document.getElementById('kompPaDomain') && document.getElementById('kompPaDomain').checked);
  document.getElementById('kompKoste').textContent = 'Kosto maksimale e vleresuar: rreth ' + (lim * cmim * (dyfishi ? 2 : 1)).toFixed(2) + ' kredite' + (dyfishi ? ' (me kerkesen e dyte per pa domain)' : '') + ' (cmimet e listes ne dokumentim)';
}
async function kompKredite(btn){
  var stat = document.getElementById('kompStat');
  btn.disabled = true; stat.textContent = 'Po kontrolloj...';
  try{
    var r = await fetch('/api/kompani-reja/kredite');
    var d = await r.json();
    stat.textContent = d.error ? ('Gabim: ' + d.error) : ('Kredite te mbetura: ' + d.kredite);
  }catch(e){ stat.textContent = 'Gabim rrjeti: ' + e.message; }
  btn.disabled = false;
}
async function kompSugjerime(btn){
  var stat = document.getElementById('kompStat'), kuti = document.getElementById('kompSugj');
  btn.disabled = true; stat.textContent = 'Po kerkoj vlera te industrise...'; kuti.innerHTML = '';
  try{
    var r = await fetch('/api/kompani-reja/sugjerime', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ teksti: document.getElementById('kompIndustria').value }) });
    var d = await r.json();
    if(d.error){ stat.textContent = 'Gabim: ' + d.error; }
    else if(!d.sugjerime.length){ stat.textContent = 'Asnje sugjerim per kete tekst. Provo nje fjale me te shkurter.'; }
    else {
      stat.textContent = 'Kliko nje vlere per ta vendosur te Industria:';
      d.sugjerime.forEach(function(v){
        var chip = document.createElement('button'); chip.className = 'kompChip'; chip.textContent = v;
        chip.onclick = function(){ document.getElementById('kompIndustria').value = v; kompVleresim(); };
        kuti.appendChild(chip); kuti.appendChild(document.createTextNode(' '));
      });
    }
  }catch(e){ stat.textContent = 'Gabim rrjeti: ' + e.message; }
  btn.disabled = false;
}
async function kompKerko(btn){
  var stat = document.getElementById('kompStat'), rez = document.getElementById('kompRez');
  var trupi = {
    viti: document.getElementById('kompViti').value,
    industria: document.getElementById('kompIndustria').value.trim(),
    pershkrim: document.getElementById('kompPershkrim').value.trim(),
    kategoria: document.getElementById('kompKategoria').value.trim(),
    shteti: document.getElementById('kompShteti').value.trim(),
    maksPunonjes: document.getElementById('kompMaks').value,
    limit: document.getElementById('kompLimit').value,
    fshihTePara: document.getElementById('kompFshih').checked,
    perfshiPaDomain: document.getElementById('kompPaDomain').checked
  };
  btn.disabled = true; stat.textContent = 'Po kerkoj te Crustdata...'; rez.innerHTML = '';
  try{
    var r = await fetch('/api/kompani-reja/kerko', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(trupi) });
    var d = await r.json();
    if(d.error){ stat.textContent = 'Gabim: ' + d.error; }
    else { stat.textContent = d.paralajmerim ? ('Kujdes: ' + d.paralajmerim) : ''; kompShfaq(d); }
  }catch(e){ stat.textContent = 'Gabim rrjeti: ' + e.message; }
  btn.disabled = false;
}
async function kompPastro(btn){
  var stat = document.getElementById('kompStat');
  if(!confirm('Kompanite e ruajtura dhe email-et e tyre MBETEN. Vetem do te lejohet qe te shfaqen serish te kerkimet (edhe ato pa domain). Ato te shenuara E perfunduar nuk rishfaqen. Vazhdo?')){ return; }
  btn.disabled = true; stat.textContent = 'Po e lejoj...';
  try{
    var r = await fetch('/api/kompani-reja/pastro', { method:'POST' });
    var d = await r.json();
    stat.textContent = d.error ? ('Gabim: ' + d.error) : 'U lejuan te shfaqen serish; te dhenat mbeten te ruajtura.';
  }catch(e){ stat.textContent = 'Gabim rrjeti: ' + e.message; }
  btn.disabled = false;
}
function kompCel(tr, tekst, href){
  var td = document.createElement('td');
  if(href && (href.indexOf('http://') === 0 || href.indexOf('https://') === 0)){
    var a = document.createElement('a'); a.textContent = tekst; a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; td.appendChild(a);
  } else { td.textContent = tekst || ''; }
  tr.appendChild(td);
}
function kompEmailCel(td, k){
  td.innerHTML = '';
  if(k.email){
    var s = document.createElement('span'); s.textContent = k.email; s.style.cssText = 'font-weight:600;'; td.appendChild(s);
    var m = document.createElement('div'); m.style.cssText = 'font-size:11px; color:#8b949e;';
    m.textContent = (k.email_lloji === 'role' ? 'adrese roli' : 'person') + (k.email_mx === false ? ' | MX: jo' : (k.email_mx ? ' | MX ok' : ''));
    td.appendChild(m);
    if(k.email_burimi && (k.email_burimi.indexOf('http://') === 0 || k.email_burimi.indexOf('https://') === 0)){
      var a = document.createElement('a'); a.textContent = 'burimi'; a.href = k.email_burimi; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.style.cssText = 'font-size:11px;';
      td.appendChild(a);
    }
    return;
  }
  var tekst = k.email_gjendja === 'pa-email' ? 'pa email ne faqe ' : (k.email_gjendja === 'gabim' ? 'faqja nuk u hap ' : '');
  if(tekst){ var t = document.createElement('span'); t.textContent = tekst; t.style.cssText = 'font-size:12px; color:#8b949e;'; td.appendChild(t); }
  var b = document.createElement('button'); b.textContent = tekst ? 'Provo serish' : 'Gjej email'; b.style.cssText = 'padding:3px 9px; font-size:12px; background:#2a313c;';
  b.onclick = function(){ kompGjejEmail(k.domain, td, !!tekst); };
  td.appendChild(b);
}
async function kompGjejEmail(domain, td, rigjej){
  td.textContent = 'po kerkoj...';
  try{
    var r = await fetch('/api/kompani-reja/email', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ domain: domain, rigjej: !!rigjej }) });
    var d = await r.json();
    if(d.error){ td.textContent = 'Gabim: ' + d.error; return null; }
    kompEmailCel(td, { domain: domain, email: d.email, email_lloji: d.email_lloji, email_mx: d.email_mx, email_burimi: d.email_burimi, email_gjendja: d.email_gjendja });
    var tr = td.parentNode;
    if(tr && tr.setAttribute){ tr.setAttribute('data-gjendja', d.email_gjendja || ''); }
    // Pasi u provua gjetja dhe nuk u gjet email, del zgjedhesi i statusit ne te djathte te rreshtit.
    if(tr && tr.kompRifreskoStatusin){ tr.kompRifreskoStatusin({ email: d.email || null, email_gjendja: d.email_gjendja || null }); }
    return d;
  }catch(e){ td.textContent = 'Gabim rrjeti: ' + e.message; return null; }
}
async function kompGjejTeGjitha(btn){
  var stat = document.getElementById('kompStat');
  var rreshta = Array.prototype.slice.call(document.querySelectorAll('#kompRez tbody tr[data-domain]')).filter(function(tr){
    var g = tr.getAttribute('data-gjendja');
    return !g || g === 'pa-kerkuar';
  }).slice(0, 20);
  if(!rreshta.length){ stat.textContent = 'Asnje kompani pa email te pakerkuar ne tabelen qe po shfaqet.'; return; }
  btn.disabled = true;
  var gjetur = 0;
  for(var i = 0; i < rreshta.length; i++){
    stat.textContent = 'Po kerkoj email ' + (i + 1) + '/' + rreshta.length + '...';
    var d = await kompGjejEmail(rreshta[i].getAttribute('data-domain'), rreshta[i].querySelector('td.kompEmail'), false);
    if(d && d.email){ gjetur++; }
  }
  stat.textContent = 'U gjeten ' + gjetur + ' email nga ' + rreshta.length + ' faqe te lexuara.';
  btn.disabled = false;
}
var kompNeShfaqje = 'kerkim'; // 'kerkim' = rezultatet e nje kerkimi te ri; 'ruajtura' = lista e ruajtur (e filtruar)
// Zgjedhesi i statusit del per kompanite qe kontaktohen jashte email-it: ato pa domain, ato me domain por pa email pasi u provua gjetja
// (pa email ne faqe / faqja nuk u hap), dhe cdo e perfunduar (qe te mund te rikthehet).
function kompStatusiNevojitet(k){
  if(!k.domain){ return true; }
  if(k.statusi === 'perfunduar'){ return true; }
  return !k.email && (k.email_gjendja === 'pa-email' || k.email_gjendja === 'gabim');
}
function kompStatusiCel(td, tr, k){
  td.innerHTML = '';
  tr.style.opacity = k.statusi === 'perfunduar' ? '0.55' : '';
  if(!kompStatusiNevojitet(k)){ return; }
  var sel = document.createElement('select');
  [['pa-perfunduar', 'E paperfunduar'], ['perfunduar', 'E perfunduar']].forEach(function(o){
    var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; if(o[0] === (k.statusi || 'pa-perfunduar')){ op.selected = true; } sel.appendChild(op);
  });
  sel.onchange = function(){ kompStatusi(k, sel, tr); };
  td.appendChild(sel);
}
async function kompStatusi(k, sel, tr){
  var stat = document.getElementById('kompStat'), vjeter = k.statusi || 'pa-perfunduar', vlera = sel.value;
  sel.disabled = true;
  try{
    var r = await fetch('/api/kompani-reja/statusi', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(k.domain ? { domain: k.domain, statusi: vlera } : { id: k.id, statusi: vlera }) });
    var d = await r.json();
    if(d.error){ sel.value = vjeter; stat.textContent = 'Gabim: ' + d.error; sel.disabled = false; return; }
    k.statusi = vlera; stat.textContent = '';
    tr.style.opacity = vlera === 'perfunduar' ? '0.55' : '';
  }catch(e){ sel.value = vjeter; stat.textContent = 'Gabim rrjeti: ' + e.message; sel.disabled = false; return; }
  sel.disabled = false;
  // Nese lista e ruajtur eshte e filtruar sipas statusit, rreshti qe ndryshoi statusin duhet te largohet nga ajo liste.
  if(kompNeShfaqje === 'ruajtura' && document.getElementById('kompStatFiltri').value){ kompRuajtura(); }
}
function kompTabela(rreshta){
  var tbl = document.createElement('table');
  var thead = document.createElement('thead'), hr = document.createElement('tr');
  ['Emri', 'Domain', 'Viti', 'Punonjes', 'Shteti', 'Email', 'LinkedIn', 'X', 'Kategoria', 'Statusi'].forEach(function(t){ var th = document.createElement('th'); th.textContent = t; hr.appendChild(th); });
  thead.appendChild(hr); tbl.appendChild(thead);
  var tbody = document.createElement('tbody');
  rreshta.forEach(function(k){
    var tr = document.createElement('tr');
    if(k.domain){ tr.setAttribute('data-domain', k.domain); }
    tr.setAttribute('data-gjendja', !k.domain ? 'pa-domain' : (k.email ? 'u-gjet' : (k.email_gjendja || 'pa-kerkuar')));
    var sigurt = k.domain && /^[a-z0-9.-]+$/i.test(k.domain) ? ('https://' + k.domain) : null;
    kompCel(tr, k.emri || '(pa emer)', null);
    var webOk = k.website && (k.website.indexOf('http://') === 0 || k.website.indexOf('https://') === 0);
    kompCel(tr, k.domain || k.website || 'pa domain', webOk ? k.website : sigurt);
    kompCel(tr, k.viti != null ? String(k.viti) : '', null);
    kompCel(tr, k.punonjes || '', null);
    kompCel(tr, k.shteti || '', null);
    var tdE = document.createElement('td'); tdE.className = 'kompEmail';
    if(k.domain){ kompEmailCel(tdE, k); }
    else { tdE.textContent = 'pa domain'; tdE.style.cssText = 'font-size:12px; color:#8b949e;'; }
    tr.appendChild(tdE);
    var li = k.linkedin;
    if(li && li.indexOf('http://') !== 0 && li.indexOf('https://') !== 0 && li.indexOf('linkedin.com') !== -1){ li = 'https://' + li; }
    kompCel(tr, k.linkedin ? 'LinkedIn' : '', li);
    kompCel(tr, k.twitter ? 'X' : '', k.twitter);
    kompCel(tr, k.kategoria || '', null);
    var tdS = document.createElement('td'); tdS.className = 'kompStatusi';
    tr.appendChild(tdS);
    kompStatusiCel(tdS, tr, k);
    tr.kompRifreskoStatusin = function(ndryshime){ Object.keys(ndryshime).forEach(function(n){ k[n] = ndryshime[n]; }); kompStatusiCel(tdS, tr, k); };
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody);
  return tbl;
}
async function kompRuajtura(btn){
  var stat = document.getElementById('kompStat'), rez = document.getElementById('kompRez');
  var filtri = document.getElementById('kompFiltri').value, statusi = document.getElementById('kompStatFiltri').value;
  if(btn){ btn.disabled = true; }
  stat.textContent = 'Po ngarkoj te ruajturat...'; rez.innerHTML = '';
  try{
    var r = await fetch('/api/kompani-reja/ruajtura?filtri=' + encodeURIComponent(filtri) + '&statusi=' + encodeURIComponent(statusi) + '&limit=200');
    var d = await r.json();
    if(d.error){ stat.textContent = 'Gabim: ' + d.error; }
    else { stat.textContent = ''; kompNeShfaqje = 'ruajtura'; kompShfaqRuajtura(d); }
  }catch(e){ stat.textContent = 'Gabim rrjeti: ' + e.message; }
  if(btn){ btn.disabled = false; }
}
function kompShfaqRuajtura(d){
  var rez = document.getElementById('kompRez'); rez.innerHTML = '';
  var p = document.createElement('div');
  p.style.cssText = 'font-size:13px; color:#3fb950; font-weight:600; margin-bottom:6px;';
  var totali = d.totali != null ? d.totali : (d.filtri === 'me-email' ? d.me_email : (d.filtri === 'pa-email' ? d.pa_email : d.gjithsej));
  var shfaqen = ' | shfaqen ' + d.rows.length + (totali > d.rows.length ? (' nga ' + totali) : '');
  if(d.filtri === 'pa-domain'){
    p.textContent = d.gjithsej + ' kompani pa domain | te paperfunduara: ' + d.pa_perfunduar + ' | te perfunduara: ' + d.perfunduar + shfaqen;
  } else {
    p.textContent = d.gjithsej + ' kompani te ruajtura | me email: ' + d.me_email + ' | pa email: ' + d.pa_email + (d.pa_domain != null ? (' | pa domain: ' + d.pa_domain) : '') + shfaqen;
  }
  rez.appendChild(p);
  if(d.filtri === 'pa-domain'){
    var udh = document.createElement('div'); udh.style.cssText = 'font-size:12px; color:#8b949e; margin-bottom:8px;';
    udh.textContent = 'Keto kompani nuk kane faqe interneti te Crustdata, prandaj nuk kane email. Hape LinkedIn, dergo mesazhin vete, pastaj ndrysho statusin ne E perfunduar.';
    rez.appendChild(udh);
  }
  if(!d.rows.length){
    var bosh = document.createElement('div'); bosh.style.cssText = 'font-size:13px; color:#8b949e;';
    bosh.textContent = 'Asnje kompani ne kete filter.';
    rez.appendChild(bosh); return;
  }
  rez.appendChild(kompTabela(d.rows));
}
function kompShfaq(d){
  var rez = document.getElementById('kompRez'); rez.innerHTML = '';
  kompNeShfaqje = 'kerkim';
  var permbledhje = document.createElement('div');
  permbledhje.style.cssText = 'font-size:13px; color:#3fb950; font-weight:600; margin-bottom:6px;';
  permbledhje.textContent = d.kompanite.length + ' rezultate' + (d.total_count != null ? (' nga ' + d.total_count + ' qe perputhen gjithsej') : '') +
    (d.pa_domain_nr ? (' | pa domain: ' + d.pa_domain_nr + ' (ruhen te filtri Pa domain)') : '') +
    ' | kredite te shpenzuara: ' + (d.kredite_perdorur != null ? d.kredite_perdorur : 'e panjohur') + ' | renditja: ' + d.renditja + (d.te_pare ? ' | u perjashtuan ' + d.te_pare + ' te pare me pare' : '') + (d.kategoria ? ' | kategoria: ' + d.kategoria : '');
  rez.appendChild(permbledhje);
  if(!d.kompanite.length){
    var bosh = document.createElement('div'); bosh.style.cssText = 'font-size:13px; color:#8b949e;';
    bosh.textContent = 'Asnje rezultat. Provo pa industri, ose me nje vlere nga Sugjerime industrie.';
    rez.appendChild(bosh);
  }
  else { rez.appendChild(kompTabela(d.kompanite)); }
  [['Kerkesa e derguar te Crustdata', d.kerkesa], ['JSON i plote nga Crustdata', d.raw], ['Kerkesa e dyte (pa domain)', d.kerkesa_pa_domain], ['JSON i plote (pa domain)', d.raw_pa_domain]].forEach(function(p){
    if(!p[1]){ return; }
    var det = document.createElement('details'); det.style.cssText = 'margin-top:14px;';
    var sum = document.createElement('summary'); sum.textContent = p[0]; sum.style.cssText = 'cursor:pointer; font-size:12px; color:#8b949e;';
    var pre = document.createElement('pre'); pre.style.cssText = 'max-height:320px; overflow:auto; font-size:11px; background:#0e1116; padding:10px; border-radius:6px; margin-top:8px;';
    pre.textContent = JSON.stringify(p[1], null, 2);
    det.appendChild(sum); det.appendChild(pre); rez.appendChild(det);
  });
}
async function alerteNgarko(){
  var stat = document.getElementById('alerteStat');
  var filtri = document.getElementById('alerteFiltri').value;
  var alertiZgj = document.getElementById('alerteAlerti').value;
  stat.textContent = 'Po ngarkoj...';
  try{
    var r = await fetch('/api/alerte?statusi=' + encodeURIComponent(filtri) + '&alerti=' + encodeURIComponent(alertiZgj) + '&limit=200');
    var d = await r.json();
    if(d.error){ stat.textContent = 'Gabim: ' + d.error; return; }
    stat.textContent = '';
    alerteShfaq(d);
  }catch(e){ stat.textContent = 'Gabim rrjeti: ' + e.message; }
}
async function alerteRifresko(btn){
  var stat = document.getElementById('alerteStat');
  btn.disabled = true; stat.textContent = 'Po lexoj feed-et e Google Alerts...';
  try{
    var r = await fetch('/api/alerte/rifresko', { method:'POST' });
    var d = await r.json();
    if(d.error){ stat.textContent = 'Gabim: ' + d.error; }
    else {
      await alerteNgarko();
      document.getElementById('alerteStat').textContent = 'U lexuan ' + d.feedet + ' feed, ' + d.te_reja + ' njoftime te reja' + (d.gabime.length ? (' | gabime: ' + d.gabime.join('; ')) : '') + '.';
    }
  }catch(e){ stat.textContent = 'Gabim rrjeti: ' + e.message; }
  btn.disabled = false;
}
async function alerteStatusi(id, vlera){
  var stat = document.getElementById('alerteStat');
  try{
    var r = await fetch('/api/alerte/statusi', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: id, statusi: vlera }) });
    var d = await r.json();
    if(d.error){ stat.textContent = 'Gabim: ' + d.error; return; }
  }catch(e){ stat.textContent = 'Gabim rrjeti: ' + e.message; return; }
  alerteNgarko();
}
function alerteShfaq(d){
  var rez = document.getElementById('alerteRez'); rez.innerHTML = '';
  var g = d.gjendja || {};
  document.getElementById('alerteInfo').textContent = d.feedet + ' feed te konfiguruar | te reja: ' + d.numrat['i ri'] + ' | u pergjigj: ' + d.numrat['u pergjigj'] +
    ' | e lashe: ' + d.numrat['e lashe'] + ' | leximi i fundit: ' + (g.fundit ? g.fundit.slice(0, 16).replace('T', ' ') : 'ende jo');
  // Zgjedhesi i alertit: cdo alert me numrin e njoftimeve (sipas statusit te zgjedhur). Alerti i zgjedhur mbetet i zgjedhur.
  var sa = document.getElementById('alerteAlerti'), zgj = sa.value, lista = d.alertet_lista || [], gjetur = !zgj;
  sa.innerHTML = '';
  var o0 = document.createElement('option'); o0.value = ''; o0.textContent = 'Te gjitha alertet (' + lista.length + ')'; sa.appendChild(o0);
  lista.forEach(function(x){
    var op = document.createElement('option'); op.value = x.alerti; op.textContent = x.alerti + ' (' + x.n + ')'; sa.appendChild(op);
    if(x.alerti === zgj){ gjetur = true; }
  });
  if(!gjetur){ var oz = document.createElement('option'); oz.value = zgj; oz.textContent = zgj + ' (0)'; sa.appendChild(oz); }
  sa.value = zgj;
  // Leximi i fundit, feed pas feed-i: cili alert, sa hyrje kishte, sa ishin te reja ose gabimi.
  var det = document.getElementById('alerteDetaje'); det.innerHTML = '';
  if(g.detaje && g.detaje.length){
    var dt = document.createElement('div'); dt.textContent = 'Leximi i fundit, feed pas feed-i:'; det.appendChild(dt);
    g.detaje.forEach(function(x){
      var dv = document.createElement('div'); dv.style.cssText = 'margin-left:10px;';
      if(x.gabim){ dv.textContent = 'Feed ' + x.nr + ': nuk u lexua - ' + x.gabim; dv.style.color = '#f85149'; }
      else { dv.textContent = 'Feed ' + x.nr + ': ' + (x.alerti || '(pa emer)') + ' | ' + x.hyrje + ' hyrje' + (x.gjithsej > x.hyrje ? (' (' + (x.gjithsej - x.hyrje) + ' pa lidhje te vlefshme)') : '') + ' | ' + x.te_reja + ' te reja'; }
      det.appendChild(dv);
    });
  }
  if(!d.feedet){
    var pa = document.createElement('div'); pa.style.cssText = 'font-size:13px; color:#d29922;';
    pa.textContent = 'Asnje feed i konfiguruar. Vendos GOOGLE_ALERTS_FEEDS te Railway, Variables (adresa RSS e alertit).';
    rez.appendChild(pa); return;
  }
  if(g.gabime && g.gabime.length){
    var gb = document.createElement('div'); gb.style.cssText = 'font-size:13px; color:#f85149; margin-bottom:8px;';
    gb.textContent = 'Gabime gjate leximit: ' + g.gabime.join('; ');
    rez.appendChild(gb);
  }
  if(!d.rows.length){
    var bosh = document.createElement('div'); bosh.style.cssText = 'font-size:13px; color:#8b949e;';
    bosh.textContent = 'Asnje njoftim ketu. Nese sapo e ngrite, prit ose shtyp Rifresko tani.';
    rez.appendChild(bosh); return;
  }
  var tbl = document.createElement('table');
  var thead = document.createElement('thead'), hr = document.createElement('tr');
  ['Titulli', 'Burimi', 'Alerti', 'Copa e tekstit', 'Data', 'Statusi'].forEach(function(t){ var th = document.createElement('th'); th.textContent = t; hr.appendChild(th); });
  thead.appendChild(hr); tbl.appendChild(thead);
  var tbody = document.createElement('tbody');
  d.rows.forEach(function(k){
    var tr = document.createElement('tr');
    var tdT = document.createElement('td');
    if(k.url && (k.url.indexOf('http://') === 0 || k.url.indexOf('https://') === 0)){
      var a = document.createElement('a'); a.textContent = k.titulli || k.url; a.href = k.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; tdT.appendChild(a);
    } else { tdT.textContent = k.titulli || ''; }
    tr.appendChild(tdT);
    var tdB = document.createElement('td'); tdB.textContent = k.burimi || ''; tr.appendChild(tdB);
    // Alerti shfaqet i plote (pa prerje); nese postimin e gjeten disa alerte, secili del ne rresht te vet.
    var tdA = document.createElement('td');
    var alertetRreshtit = (k.alertet && k.alertet.length) ? k.alertet : (k.alerti ? [k.alerti] : []);
    alertetRreshtit.forEach(function(a){ var dv = document.createElement('div'); dv.textContent = a; dv.style.cssText = 'margin-bottom:4px;'; tdA.appendChild(dv); });
    tdA.style.cssText = 'font-size:12px; color:#8b949e; word-break:break-word; min-width:170px;';
    tr.appendChild(tdA);
    [(k.fragmenti || '').slice(0, 220), String(k.publikuar || k.gjetur_at || '').slice(0, 10)].forEach(function(t){
      var td = document.createElement('td'); td.textContent = t; tr.appendChild(td);
    });
    var tdS = document.createElement('td'), sel = document.createElement('select');
    [['i ri', 'I ri'], ['u pergjigj', 'U pergjigj'], ['e lashe', 'E lashe']].forEach(function(o){
      var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; if(o[0] === k.statusi){ op.selected = true; } sel.appendChild(op);
    });
    sel.onchange = function(){ alerteStatusi(k.id, sel.value); };
    tdS.appendChild(sel); tr.appendChild(tdS);
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody); rez.appendChild(tbl);
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
  var fusha = document.getElementById('manEmail').value.trim();
  var emri = document.getElementById('manEmri').value.trim();
  var kategoria = document.getElementById('manKategoria').value.trim() || 'emailet-e-proves';
  var statusManual = document.getElementById('statusManual');
  // Mund te ngjitesh nje adrese, ose gjithe nje liste te ndare me ; ose , ose hapesire.
  var adresat = fusha.split(/[; ,]+/).filter(function(x){ return x.indexOf('@') > 0; });
  if(!adresat.length){ statusManual.textContent = 'Shkruaj email te vlefshem.'; return; }
  var shume = adresat.length > 1, shtuar = 0, gabime = [], gabimiIFundit = '';
  for(var i = 0; i < adresat.length; i++){
    statusManual.textContent = 'Duke shtuar ' + (i + 1) + '/' + adresat.length + '...';
    try{
      var r = await fetch('/api/shto-manualisht', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: adresat[i], emri: shume ? adresat[i].split('@')[0] : emri, kategoria: kategoria }) });
      var d = await r.json();
      if(d.error){ gabimiIFundit = d.error; gabime.push(adresat[i] + ': ' + d.error); } else { shtuar++; }
    }catch(e){ gabimiIFundit = e.message; gabime.push(adresat[i] + ': ' + e.message); }
  }
  if(shume){ statusManual.textContent = 'U shtuan ' + shtuar + ' nga ' + adresat.length + (gabime.length ? (' | gabime: ' + gabime.slice(0, 3).join('; ')) : ''); }
  else { statusManual.textContent = shtuar ? ('U shtua: ' + adresat[0]) : ('Gabim: ' + gabimiIFundit); }
  if(shtuar){
    document.getElementById('manEmail').value = '';
    document.getElementById('manEmri').value = '';
    ngarkoKategorite('filterKategoria');
    shikoTeGjitha();
  }
}
async function shikoTeGjitha(){
  var status2 = document.getElementById('status2'), count2 = document.getElementById('count2');
  var rez2 = document.getElementById('rez2'), rez2Body = document.getElementById('rez2Body');
  var kategoria = document.getElementById('filterKategoria').value;
  status2.textContent = 'Duke ngarkuar...'; rez2Body.innerHTML = '';
  try{
    var r = await fetch('/api/te-gjitha?burimi=exa' + (kategoria ? ('&kategoria=' + encodeURIComponent(kategoria)) : ''));
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

// Perdoret nga admini i PhronexusAI (sinkronizimi i kontakteve) dhe nga tab-i "Ruajtura" (me ?burimi=exa, qe te mbetet si ishte).
// Pa ?burimi=exa kthen edhe kompanite e Crustdata qe kane email (jo me MX te pavlefshem), me kategorine "Crustdata: <emri>";
// keshtu admini i PhronexusAI i ndan ne seksione pa u ndryshuar kodi i tij i importit.
const KATEGORI_CRUSTDATA = 'Crustdata: ';
app.get('/api/te-gjitha', async (req, res) => {
  try {
    const kategoria = req.query.kategoria ? String(req.query.kategoria) : '';
    const vetemExa = req.query.burimi === 'exa';
    const eCrust = kategoria.startsWith(KATEGORI_CRUSTDATA);
    let rows = [];
    if (!eCrust) {
      const r = kategoria
        ? await pool.query('SELECT email, email_statusi, domain, emri, kategoria FROM bizneset_gjetur WHERE kategoria=$1 ORDER BY gjetur_at DESC', [kategoria])
        : await pool.query('SELECT email, email_statusi, domain, emri, kategoria FROM bizneset_gjetur ORDER BY gjetur_at DESC');
      rows = r.rows;
    }
    if (!vetemExa && (eCrust || !kategoria)) {
      try {
        const emriKat = eCrust ? kategoria.slice(KATEGORI_CRUSTDATA.length) : null;
        let sql = 'SELECT email, domain, emri, kategoria FROM kompani_pare WHERE email IS NOT NULL AND email_mx IS DISTINCT FROM false';
        const p = [];
        if (emriKat === 'pa-kategori') sql += " AND (kategoria IS NULL OR kategoria = '')";
        else if (emriKat) { p.push(emriKat); sql += ' AND kategoria = $1'; }
        const r = await pool.query(sql + ' ORDER BY gjetur_at DESC', p);
        rows = rows.concat(r.rows.map(x => ({ email: x.email, email_statusi: 'nga-faqja', domain: x.domain, emri: x.emri, kategoria: KATEGORI_CRUSTDATA + (x.kategoria || 'pa-kategori') })));
      } catch (e) { console.error('te-gjitha: pjesa e Crustdata nuk u lexua (Exa vazhdon):', e.message); }
    }
    res.json({ rows });
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
  const faqet = pastroFaqet(b.faqet);
  const rezultatet = await Promise.all(kerkesat.map(async q => {
    const qFinal = shtoFiltrinEFaqeve(q, faqet); // kerkesa e sakte qe shkon te Google
    try {
      const raw = await kerkoSerper(qFinal, koha);
      const organic = (raw.organic || []).map(o => {
        let faqja = ''; try { faqja = new URL(o.link).hostname.replace(/^www\./, ''); } catch (e) {}
        return { pozicioni: o.position, titulli: o.title, linku: o.link, fragmenti: o.snippet, data: o.date || '', faqja };
      });
      return { q, qFinal, ok: true, organic, raw };
    } catch (e) { return { q, qFinal, ok: false, error: e.message, organic: [] }; }
  }));
  res.json({ ok: true, koha, faqet, rezultatet });
});

// ---- KOMPANI TE REJA ----
app.post('/api/kompani-reja/kerko', async (req, res) => {
  if (!CRUSTDATA_KEY) return res.status(400).json({ error: 'CRUSTDATA_API_KEY mungon te Railway → Variables.' });
  const b = req.body || {};
  const vitiAkt = new Date().getFullYear();
  const viti = parseInt(b.viti, 10);
  if (!Number.isInteger(viti) || viti < 1990 || viti > vitiAkt) {
    return res.status(400).json({ error: 'Viti i themelimit duhet te jete nje numer midis 1990 dhe ' + vitiAkt + '.' });
  }
  const industria = String(b.industria || '').trim().slice(0, 100);
  const shteti = String(b.shteti || '').trim().slice(0, 60);
  const pershkrim = String(b.pershkrim || '').trim().slice(0, 200);
  const kategoria = String(b.kategoria || '').replace(/[<>\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) || null; // emri i grupit, ruhet me kompanite
  const maks = parseInt(b.maksPunonjes, 10);
  const maksPunonjes = Number.isInteger(maks) && maks > 0 && maks <= 1000000 ? maks : null;
  const limit = Math.min(50, Math.max(1, parseInt(b.limit, 10) || 10)); // kufi i fortë 50, per te mbrojtur kreditet
  const fshihTePara = b.fshihTePara !== false; // paracaktuar: po
  const perfshiPaDomain = b.perfshiPaDomain !== false; // paracaktuar: po (kerkese e dyte, vetem per kompani pa domain)
  let perjashto = [], perjashtoId = [], paralajmerim = null;
  const shtoParalajmerim = t => { paralajmerim = (paralajmerim ? paralajmerim + ' ' : '') + t; };
  if (fshihTePara) {
    try { perjashto = await merrDomainetePara(); }
    catch (e) { paralajmerim = 'Historiku nuk u lexua (' + e.message + '); kerkimi u be pa perjashtim.'; }
    try { perjashtoId = await merrIdetePaDomain(); }
    catch (e) { shtoParalajmerim('Historiku i kompanive pa domain nuk u lexua (' + e.message + ').'); }
  }
  const fushatKerkimit = { viti, vitiMax: vitiAkt, industria, shteti, maksPunonjes };
  // Trupi i kerkeses: paDomain = kerkesa e dyte (vetem kompani pa domain); ids = ID-te e perjashtuara (kompani pa domain te ruajtura).
  const ndertoTrupin = (paDomain, ids) => {
    const t = { filters: ndertoFiltratKompani(Object.assign({ perjashto, perjashtoId: ids, paDomain }, fushatKerkimit)), fields: FUSHAT_KOMPANI, limit };
    if (pershkrim) t.search = { query: pershkrim, mode: 'hybrid' }; // sipas dokumentimit: filtrat mbeten kushte te forta, renditja eshte sipas perputhjes
    return t;
  };
  // Perjashtimi sipas ID-se (not_in te crustdata_company_id) nuk ka shembull ne dokumentim. Nese Crustdata e refuzon (400, qe nuk kushton kredite),
  // kerkimi perseritet pa te: ai kryesor funksionon si me pare, ai pa domain filtrohet ketu (te ruajturat hiqen pasi vijne).
  const kerkoMeRezerve = async paDomain => {
    const rez = await kerkoKompani(ndertoTrupin(paDomain, perjashtoId));
    if (!rez.r.ok && rez.r.status === 400 && perjashtoId.length) {
      const prove = await kerkoKompani(ndertoTrupin(paDomain, []));
      if (prove.r.ok) { prove.rezerve = true; return prove; }
    }
    return rez;
  };
  try {
    const { r, perdorur, rezerve } = await kerkoMeRezerve(false);
    if (!r.ok) return res.status([400, 401, 403, 429].includes(r.status) ? r.status : 502).json({ error: mesazhGabimiCrustdata(r), kredite_perdorur: r.kredite });
    if (rezerve) shtoParalajmerim('Crustdata nuk e pranoi perjashtimin sipas ID; kerkimi u be pa te.');
    const kompanite = (Array.isArray(r.data.companies) ? r.data.companies : []).map(sheshoKompanine);
    // Kerkesa e dyte: vetem kompani PA domain (kane LinkedIn, por s'kane faqe ku te gjendet email). Nese ajo deshton, kerkimi kryesor mbetet.
    let pa = null;
    if (perfshiPaDomain) {
      try {
        const dyta = await kerkoMeRezerve(true);
        if (dyta.r.ok) {
          let lista = (Array.isArray(dyta.r.data.companies) ? dyta.r.data.companies : []).map(sheshoKompanine);
          if (dyta.rezerve) {
            const njohur = new Set(perjashtoId);
            lista = lista.filter(k => !njohur.has(Number(k.id)));
            shtoParalajmerim('Crustdata nuk e pranoi perjashtimin sipas ID per kompanite pa domain: te ruajturat u hoqen pasi erdhen, prandaj mund te dalin me pak se kerkove.');
          }
          pa = { kompanite: lista, kerkesa: kerkesePerShfaqje(dyta.perdorur.trupi), kredite: dyta.r.kredite, raw: dyta.r.data };
        } else { shtoParalajmerim('Kerkesa per kompani pa domain nuk u krye: ' + mesazhGabimiCrustdata(dyta.r)); }
      } catch (e) { shtoParalajmerim('Kerkesa per kompani pa domain nuk u krye (' + e.message + ').'); }
    }
    // Te dyja listat ruhen bashke: me domain te kompani_pare, pa domain te kompani_pa_domain (edhe rreshtat pa domain te kerkimit kryesor, nese Crustdata i ktheu).
    const teGjitha = kompanite.concat(pa ? pa.kompanite : []);
    try { await ruajKompanite(teGjitha, kategoria); } // ruhen gjithmone me te dhenat e plota (qe perjashtimi dhe "Te gjitha" te funksionojne)
    catch (e) { shtoParalajmerim('Historiku nuk u ruajt (' + e.message + ').'); }
    const krediteSecila = [r.kredite, pa ? pa.kredite : null];
    const krediteTotal = krediteSecila.every(x => x == null) ? null : krediteSecila.reduce((s, x) => s + (x || 0), 0);
    res.json({
      ok: true, kerkesa: kerkesePerShfaqje(perdorur.trupi), renditja: perdorur.sorts, kredite_perdorur: krediteTotal,
      total_count: r.data.total_count == null ? null : r.data.total_count, te_pare: fshihTePara ? perjashto.length + perjashtoId.length : null,
      pa_domain_nr: teGjitha.filter(k => !normalizoDomain(k.domain)).length,
      paralajmerim, kategoria, kompanite: teGjitha, raw: r.data,
      kerkesa_pa_domain: pa ? pa.kerkesa : null, raw_pa_domain: pa ? pa.raw : null
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/kompani-reja/pastro', async (req, res) => {
  try {
    // Nuk fshin asgje: vetem lejon qe kompanite e ruajtura (me email-et e tyre) te shfaqen serish te kerkimet.
    // Ato te shenuara "perfunduar" mbeten te perjashtuara (i ke kontaktuar tashme).
    const r = await pool.query('UPDATE kompani_pare SET fshih = false');
    let paDomain = 0;
    try { const r2 = await pool.query('UPDATE kompani_pa_domain SET fshih = false'); paDomain = r2.rowCount || 0; } catch (e) { /* tabela e re mund te mungoje nese migrimi deshtoi */ }
    res.json({ ok: true, liruar: r.rowCount == null ? null : r.rowCount, liruar_pa_domain: paDomain });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Statusi manual i nje kompanie qe kontaktohet jashte email-it (LinkedIn etj.): 'pa-perfunduar' ose 'perfunduar'.
// Kompanite me domain identifikohen me domain (duhet te jete ne databaze), ato pa domain me ID-ne e Crustdata.
app.post('/api/kompani-reja/statusi', async (req, res) => {
  const b = req.body || {};
  if (!KOMPANI_STATUSET.includes(b.statusi)) return res.status(400).json({ error: 'Statusi i pavlefshem.' });
  try {
    let r;
    if (b.domain) {
      const domain = normalizoDomain(b.domain);
      if (!domain) return res.status(400).json({ error: 'Domain i pavlefshem.' });
      r = await pool.query('UPDATE kompani_pare SET statusi = $2, statusi_at = now() WHERE domain = $1', [domain, b.statusi]);
    } else {
      const id = Number(b.id);
      if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: 'Id i pavlefshem.' });
      r = await pool.query('UPDATE kompani_pa_domain SET statusi = $2, statusi_at = now() WHERE crustdata_id = $1', [id, b.statusi]);
    }
    if (!r.rowCount) return res.status(404).json({ error: 'Kompania nuk u gjet ne databaze.' });
    res.json({ ok: true, statusi: b.statusi });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Te gjitha kompanite e ruajtura (edhe ato te gjeneruara me pare), me filtrin e email-it ose "pa-domain" (tabela e vecante), dhe filtrin e statusit.
app.get('/api/kompani-reja/ruajtura', async (req, res) => {
  try {
    const q = req.query || {};
    const filtri = ['me-email', 'pa-email', 'pa-domain'].includes(q.filtri) ? q.filtri : 'te-gjitha';
    const statusi = KOMPANI_STATUSET.includes(q.statusi) ? q.statusi : null;
    const limit = Math.min(500, Math.max(1, parseInt(q.limit, 10) || 100));
    const offset = Math.max(0, parseInt(q.offset, 10) || 0);
    const kStatusi = idx => "COALESCE(statusi, 'pa-perfunduar') = $" + idx; // idx = vendi i parametrit
    const paramet = statusi ? [limit, offset, statusi] : [limit, offset];
    if (filtri === 'pa-domain') {
      const rows = (await pool.query(
        "SELECT crustdata_id AS id, emri, website, viti, punonjes, shteti, qyteti, linkedin, twitter, kategoria, COALESCE(statusi, 'pa-perfunduar') AS statusi, gjetur_at " +
        'FROM kompani_pa_domain ' + (statusi ? 'WHERE ' + kStatusi(3) : '') + ' ORDER BY gjetur_at DESC, crustdata_id LIMIT $1 OFFSET $2', paramet)).rows
        .map(x => Object.assign(x, { id: Number(x.id), domain: null, pa_domain: true }));
      const n = (await pool.query("SELECT COUNT(*)::int AS gjithsej, COUNT(*) FILTER (WHERE statusi = 'perfunduar')::int AS perfunduar FROM kompani_pa_domain")).rows[0] || {};
      const gjithsej = n.gjithsej || 0, perfunduar = n.perfunduar || 0;
      const totali = statusi === 'perfunduar' ? perfunduar : (statusi === 'pa-perfunduar' ? gjithsej - perfunduar : gjithsej);
      return res.json({ ok: true, filtri, statusi, rows, gjithsej, perfunduar, pa_perfunduar: gjithsej - perfunduar, totali });
    }
    const kushte = [];
    if (filtri === 'me-email') kushte.push('email IS NOT NULL'); else if (filtri === 'pa-email') kushte.push('email IS NULL');
    const kushteRreshta = statusi ? kushte.concat([kStatusi(3)]) : kushte;
    const kushti = kushteRreshta.length ? 'WHERE ' + kushteRreshta.join(' AND ') : '';
    const rows = (await pool.query(
      "SELECT domain, emri, website, viti, punonjes, shteti, qyteti, linkedin, twitter, email, email_lloji, email_mx, email_burimi, email_gjendja, kategoria, COALESCE(statusi, 'pa-perfunduar') AS statusi, gjetur_at " +
      'FROM kompani_pare ' + kushti + ' ORDER BY gjetur_at DESC, domain LIMIT $1 OFFSET $2', paramet)).rows;
    const n = (await pool.query('SELECT COUNT(*)::int AS gjithsej, COUNT(email)::int AS me_email FROM kompani_pare')).rows[0] || {};
    const gjithsej = n.gjithsej || 0, meEmail = n.me_email || 0;
    let totali = filtri === 'me-email' ? meEmail : (filtri === 'pa-email' ? gjithsej - meEmail : gjithsej);
    if (statusi) {
      const kont = kushte.concat([kStatusi(1)]);
      totali = (await pool.query('SELECT COUNT(*)::int AS n FROM kompani_pare WHERE ' + kont.join(' AND '), [statusi])).rows[0].n;
    }
    let paDomain = null; // sa kompani pa domain ka te ruajtura (per permbledhjen); nuk e prish pergjigjen nese tabela mungon
    try { paDomain = (await pool.query('SELECT COUNT(*)::int AS n FROM kompani_pa_domain')).rows[0].n; } catch (e) { paDomain = null; }
    res.json({ ok: true, filtri, statusi, rows, gjithsej, me_email: meEmail, pa_email: gjithsej - meEmail, totali, pa_domain: paDomain });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Gjen email-in nga faqja e nje kompanie TE RUAJTUR (domain-i duhet te jete ne databaze, jo adrese e lire: shmang abuzimin).
app.post('/api/kompani-reja/email', async (req, res) => {
  const b = req.body || {};
  const domain = normalizoDomain(b.domain);
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain) || net.isIP(domain) || !/[a-z]/.test(domain.split('.').pop())) {
    return res.status(400).json({ error: 'Domain i pavlefshem.' }); // pa adresa IP dhe pa "domain" me TLD vetem numra
  }
  if (emailNeVazhdim >= 3) return res.status(429).json({ error: 'Po kerkohen tashme 3 faqe njekohesisht. Prit pak dhe provo serish.' });
  emailNeVazhdim++;
  try {
    const ekz = await pool.query('SELECT domain, email, email_lloji, email_mx, email_burimi, email_gjendja FROM kompani_pare WHERE domain = $1', [domain]);
    if (!ekz.rows.length) return res.status(404).json({ error: 'Kompania nuk eshte e ruajtur. Kerko fillimisht te Crustdata.' });
    const e0 = ekz.rows[0];
    if (e0.email && !b.rigjej) {
      return res.json({ ok: true, nga_kujtesa: true, domain, email: e0.email, email_lloji: e0.email_lloji || null, email_mx: e0.email_mx == null ? null : e0.email_mx, email_burimi: e0.email_burimi || null, email_gjendja: 'u-gjet', mesazh: 'E ruajtur me pare' });
    }
    const g = await gjejEmailPerKompani(domain);
    await pool.query('UPDATE kompani_pare SET email = $2, email_lloji = $3, email_mx = $4, email_burimi = $5, email_gjendja = $6, email_at = now() WHERE domain = $1',
      [domain, g.email || null, g.lloji || null, g.mx == null ? null : g.mx, g.burimi || null, g.gjendja]);
    res.json({ ok: true, domain, email: g.email || null, email_lloji: g.lloji || null, email_mx: g.mx == null ? null : g.mx, email_burimi: g.burimi || null, email_gjendja: g.gjendja, mesazh: g.mesazh || '' });
  } catch (e) { res.status(500).json({ error: String(e.message).replace(/https?:\/\/\S+/g, '[adrese]') }); }
  finally { emailNeVazhdim--; }
});

app.get('/api/kompani-reja/kredite', async (req, res) => {
  if (!CRUSTDATA_KEY) return res.status(400).json({ error: 'CRUSTDATA_API_KEY mungon te Railway → Variables.' });
  try {
    const r = await crustdataThirr('GET', '/user/credits', null); // falas, nuk shpenzon kredite
    if (!r.ok) return res.status([401, 403, 429].includes(r.status) ? r.status : 502).json({ error: mesazhGabimiCrustdata(r) });
    res.json({ ok: true, kredite: r.data.credits == null ? null : r.data.credits });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/kompani-reja/sugjerime', async (req, res) => {
  if (!CRUSTDATA_KEY) return res.status(400).json({ error: 'CRUSTDATA_API_KEY mungon te Railway → Variables.' });
  const teksti = String((req.body && req.body.teksti) || '').trim().slice(0, 60);
  try {
    // Autocomplete eshte falas; kthen vlerat e sakta te industrise, qe filtri te mos jape zero rezultate nga nje emer i gabuar.
    const r = await crustdataThirr('POST', '/company/search/autocomplete', { field: 'taxonomy.professional_network_industry', query: teksti, limit: 15 });
    if (!r.ok) return res.status([400, 401, 403, 429].includes(r.status) ? r.status : 502).json({ error: mesazhGabimiCrustdata(r) });
    const sugjerime = (Array.isArray(r.data.suggestions) ? r.data.suggestions : []).map(s => s && s.value).filter(v => typeof v === 'string');
    res.json({ ok: true, sugjerime });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---- ALERTE ----
app.get('/api/alerte', async (req, res) => {
  try {
    const q = req.query || {};
    const statusi = ALERTE_STATUSET.includes(q.statusi) ? q.statusi : null;
    const limit = Math.min(500, Math.max(1, parseInt(q.limit, 10) || 100));
    const alertiFiltri = String(q.alerti || '').slice(0, 1000);
    const kushte = [], par = [];
    if (statusi) { par.push(statusi); kushte.push('statusi = $' + par.length); }
    if (alertiFiltri) { par.push(alertiFiltri); kushte.push('$' + par.length + '::text = ANY(alertet)'); }
    par.push(limit);
    const rows = (await pool.query('SELECT ' + ALERTE_KOLONAT + ' FROM alerte_rezultate' + (kushte.length ? ' WHERE ' + kushte.join(' AND ') : '') +
      ' ORDER BY COALESCE(publikuar, gjetur_at) DESC, id DESC LIMIT $' + par.length, par)).rows;
    const numrimi = (await pool.query('SELECT statusi, COUNT(*)::int AS n FROM alerte_rezultate GROUP BY statusi')).rows;
    const numrat = { 'i ri': 0, 'u pergjigj': 0, 'e lashe': 0 };
    numrimi.forEach(r => { if (r.statusi in numrat) numrat[r.statusi] = r.n; });
    // Cilat alerte ekzistojne dhe sa njoftime ka secili (sipas statusit te zgjedhur), qe te zgjidhet nje per nje.
    const alertetLista = (await pool.query(
      'SELECT a AS alerti, COUNT(*)::int AS n FROM alerte_rezultate r, UNNEST(r.alertet) AS a' + (statusi ? ' WHERE r.statusi = $1' : '') + ' GROUP BY a ORDER BY n DESC, a ASC',
      statusi ? [statusi] : [])).rows;
    res.json({ ok: true, rows, numrat, alertet_lista: alertetLista, feedet: alerteFeedet().length, gjendja: alerteGjendja });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/alerte/rifresko', async (req, res) => {
  if (!alerteFeedet().length) return res.status(400).json({ error: 'GOOGLE_ALERTS_FEEDS mungon te Railway → Variables.' });
  try {
    const g = await lexoFeedetAlerte();
    res.json({ ok: true, feedet: g.feedet, te_reja: g.te_reja, gabime: g.gabime, detaje: g.detaje, fundit: g.fundit });
  } catch (e) { res.status(500).json({ error: String(e.message).replace(/https?:\/\/\S+/g, '[adrese]') }); }
});

app.post('/api/alerte/statusi', async (req, res) => {
  const b = req.body || {};
  const id = parseInt(b.id, 10);
  if (!Number.isInteger(id) || !ALERTE_STATUSET.includes(b.statusi)) return res.status(400).json({ error: 'Id ose status i pavlefshem.' });
  try {
    const r = await pool.query('UPDATE alerte_rezultate SET statusi = $1 WHERE id = $2', [b.statusi, id]);
    res.json({ ok: true, ndryshuar: r.rowCount || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log('Zbulim Bizneseh po punon ne portin ' + PORT); nisAlertePoll(); });
