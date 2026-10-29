// KONTEKSTI: plani i plote eshte te PLANI-STUDIMIT.md. Lexoje para se ta ndryshosh kete skedar.
// Seksioni "Studimi": makineria e kerkimit per marketing automatik. Nje peme qe AI e ndan logjikisht ne dege,
// kerkon vete ne internet (kerkimi i AI-se se OpenAI: kerkon, hap faqet, vazhdon kerkimin), vlereson gjetjet sipas kushteve dhe meson nga vendimet e mia. Asgje nuk vazhdon pa miratimin tim.
// Lidhja me server.js: require('./studimi')(app, pool); dhe <script src="/studimi-client.js"></script> ne faqe.
const path = require('path');

module.exports = function (app, pool) {
  const numri = (v, def, min, maks) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(maks, Math.max(min, n)) : def; };
  const OPENAI_KEY = String(process.env.OPENAI_API_KEY || '').trim();
  const ANTHROPIC_KEY = String(process.env.ANTHROPIC_API_KEY || '').trim();
  // Modeli per te gjitha fazat, logjiken dhe kerkimin: gpt-6.1-terra (OpenAI). Ndryshohet vetem nese vendoset STUDIMI_MODELI ne Railway.
  const MODELI_PARAZGJEDHUR = 'gpt-6.1-terra';
  const MODELI = String(process.env.STUDIMI_MODELI || MODELI_PARAZGJEDHUR).trim();
  const ARSYETIMI = ['low', 'medium', 'high'].includes(process.env.STUDIMI_ARSYETIMI) ? process.env.STUDIMI_ARSYETIMI : 'high';
  const FJALEKALIMI = String(process.env.STUDIMI_FJALEKALIMI || '').trim();
  // Sa kerkime ne internet mund te beje AI ne nje hap (cdo kerkim ka koston e vet te OpenAI).
  const KERKIME_PER_HAP = numri(process.env.STUDIMI_KERKIME_PER_HAP, 10, 1, 30);
  const MAKS_TERMA = 6; // termat e nje dege: pikenisja e kerkimit, AI mund te kerkoje edhe te tjera
  const THELLESIA_MAKS = numri(process.env.STUDIMI_THELLESIA_MAKS, 5, 1, 10);
  // Sa kerkime ne internet mund te beje AI gjithsej ne nje projekt.
  const KREDITE_PER_PROJEKT = numri(process.env.STUDIMI_KERKIME_PER_PROJEKT || process.env.STUDIMI_KREDITE_PER_PROJEKT, 200, 1, 100000);
  // Adresat mund te ndryshohen vetem per testim lokal.
  const URL_OPENAI_KERKIMI = process.env.STUDIMI_OPENAI_RESPONSES_URL || 'https://api.openai.com/v1/responses';
  const URL_OPENAI = process.env.STUDIMI_OPENAI_URL || 'https://api.openai.com/v1/chat/completions';
  const URL_ANTHROPIC = process.env.STUDIMI_ANTHROPIC_URL || 'https://api.anthropic.com/v1/messages';
  const FAZAT = ['analiza', 'ndarja', 'kerkimi', 'vleresimi'];
  const STATUSET_OPSIONI = ['i ri', 'miratuar', 'refuzuar'];

  const gati = (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS studimi_projektet (
      id SERIAL PRIMARY KEY,
      emri TEXT NOT NULL,
      qellimi TEXT NOT NULL,
      kushti_kryesor TEXT NOT NULL,
      profili TEXT DEFAULT '',
      kredite INTEGER DEFAULT 0,
      krijuar TIMESTAMPTZ DEFAULT now()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS studimi_nyjet (
      id SERIAL PRIMARY KEY,
      projekti_id INTEGER NOT NULL REFERENCES studimi_projektet(id) ON DELETE CASCADE,
      prindi_id INTEGER REFERENCES studimi_nyjet(id) ON DELETE CASCADE,
      niveli INTEGER NOT NULL DEFAULT 0,
      dega TEXT DEFAULT '',
      titulli TEXT NOT NULL,
      pyetja TEXT DEFAULT '',
      arsyeja TEXT DEFAULT '',
      kushtet TEXT[] DEFAULT '{}',
      termat TEXT[] DEFAULT '{}',
      termat_perdorur TEXT[] DEFAULT '{}',
      statusi TEXT DEFAULT 'propozuar',
      permbledhja TEXT DEFAULT '',
      pengesat TEXT[] DEFAULT '{}',
      pyetje_alternative TEXT[] DEFAULT '{}',
      perjashtuar TEXT DEFAULT '',
      gabimi TEXT DEFAULT '',
      krijuar TIMESTAMPTZ DEFAULT now(),
      perditesuar TIMESTAMPTZ DEFAULT now()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS studimi_opsionet (
      id SERIAL PRIMARY KEY,
      projekti_id INTEGER NOT NULL REFERENCES studimi_projektet(id) ON DELETE CASCADE,
      nyja_id INTEGER NOT NULL REFERENCES studimi_nyjet(id) ON DELETE CASCADE,
      emri TEXT NOT NULL,
      pershkrimi TEXT DEFAULT '',
      si_lidhet TEXT DEFAULT '',
      kostoja TEXT DEFAULT '',
      pike INTEGER DEFAULT 0,
      arsye TEXT DEFAULT '',
      burimet TEXT[] DEFAULT '{}',
      statusi TEXT DEFAULT 'i ri',
      krijuar TIMESTAMPTZ DEFAULT now()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS studimi_lidhjet_pare (
      projekti_id INTEGER NOT NULL REFERENCES studimi_projektet(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      PRIMARY KEY (projekti_id, url)
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS studimi_vendimet (
      id SERIAL PRIMARY KEY,
      projekti_id INTEGER REFERENCES studimi_projektet(id) ON DELETE CASCADE,
      nyja_id INTEGER REFERENCES studimi_nyjet(id) ON DELETE SET NULL,
      faza TEXT NOT NULL,
      veprimi TEXT NOT NULL,
      propozimi TEXT DEFAULT '',
      zgjedhja TEXT DEFAULT '',
      arsyeja TEXT DEFAULT '',
      krijuar TIMESTAMPTZ DEFAULT now()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS studimi_rregullat (
      id SERIAL PRIMARY KEY,
      faza TEXT NOT NULL,
      teksti TEXT NOT NULL,
      baza TEXT DEFAULT '',
      statusi TEXT DEFAULT 'propozuar',
      krijuar TIMESTAMPTZ DEFAULT now()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS studimi_versionet (
      id SERIAL PRIMARY KEY,
      aktive INTEGER[] DEFAULT '{}',
      shenim TEXT DEFAULT '',
      krijuar TIMESTAMPTZ DEFAULT now()
    )`);
    await pool.query('CREATE INDEX IF NOT EXISTS studimi_nyjet_projekti_idx ON studimi_nyjet (projekti_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS studimi_opsionet_nyja_idx ON studimi_opsionet (nyja_id)');
    // Nyjet qe mbeten "duke punuar" nga nje nisje e meparshme e serverit nuk do te mbarojne kurre: shenohen si gabim.
    await pool.query(`UPDATE studimi_nyjet SET statusi = 'gabim', gabimi = 'Serveri u rinis gjate punes. Provo perseri.'
      WHERE statusi IN ('duke kerkuar', 'duke ndare', 'ne radhe')`);
    return true;
  })().catch(e => { console.error('migrim studimi:', e.message); return false; });

  // ---------- ndihmesa ----------
  const pastroGabimin = e => String((e && e.message) || e || 'gabim').replace(/https?:\/\/\S+/g, '[adrese]').slice(0, 300);
  const tekst = (v, maks) => String(v == null ? '' : v).replace(/\u0000/g, '').trim().slice(0, maks || 2000);
  const id = v => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : null; };
  function liste(v, maksGjatesi, maksSasi) {
    const dalja = [];
    (Array.isArray(v) ? v : String(v || '').split('\n')).forEach(x => {
      if (typeof x !== 'string') return;
      const t = x.replace(/\u0000/g, '').replace(/\s+/g, ' ').trim().slice(0, maksGjatesi);
      if (t && !dalja.some(y => y.toLowerCase() === t.toLowerCase())) dalja.push(t);
    });
    return dalja.slice(0, maksSasi);
  }
  async function fetchKohe(url, opsione, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try { return await fetch(url, Object.assign({}, opsione, { signal: ctrl.signal })); }
    finally { clearTimeout(t); }
  }
  function objektNgaTeksti(t) {
    const s = String(t || ''), i = s.indexOf('{'), j = s.lastIndexOf('}');
    if (i < 0 || j <= i) return null;
    try { return JSON.parse(s.slice(i, j + 1)); } catch (e) { return null; }
  }


  // ---------- AI: OpenAI (parazgjedhur) ose Anthropic (kur modeli fillon me "claude") ----------
  async function pyetAI(prompt, modeli) {
    modeli = modeli || MODELI;
    if (/^claude/i.test(modeli)) {
      if (!ANTHROPIC_KEY) throw new Error('Mungon ANTHROPIC_API_KEY ne Railway (modeli eshte ' + modeli + ').');
      const r = await fetchKohe(URL_ANTHROPIC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: modeli, max_tokens: 16000, messages: [{ role: 'user', content: prompt }] })
      }, 180000);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error('Anthropic: ' + ((d.error && d.error.message) || r.status));
      return (Array.isArray(d.content) ? d.content : []).filter(c => c && c.type === 'text').map(c => c.text).join('\n');
    }
    if (!OPENAI_KEY) throw new Error('Mungon OPENAI_API_KEY ne Railway.');
    const thirr = async meArsyetim => {
      const trupi = { model: modeli, messages: [{ role: 'user', content: prompt }] };
      if (meArsyetim) trupi.reasoning_effort = ARSYETIMI;
      const r = await fetchKohe(URL_OPENAI, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OPENAI_KEY }, body: JSON.stringify(trupi)
      }, 300000);
      return { r, data: await r.json().catch(() => ({})) };
    };
    let { r, data } = await thirr(true);
    if (r.status === 400 && /reasoning/i.test(JSON.stringify(data))) ({ r, data } = await thirr(false));
    if (!r.ok) throw new Error('OpenAI: ' + ((data.error && data.error.message) || r.status));
    return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  }
  // Pyet AI-ne dhe kerkon JSON; nese pergjigjja nuk lexohet, pyet edhe nje here.
  async function pyetAIJson(prompt, modeli) {
    for (let i = 0; i < 2; i++) {
      const o = objektNgaTeksti(await pyetAI(prompt + (i ? '\n\nKUJDES: pergjigju VETEM me nje objekt JSON te vlefshem, pa tekst tjeter.' : ''), modeli));
      if (o && typeof o === 'object') return o;
    }
    throw new Error('AI nuk ktheu JSON te lexueshem.');
  }

  // ---------- Kerkimi i AI-se ne internet (OpenAI Responses API, mjeti web_search) ----------
  // Modeli kerkon si pjese e arsyetimit: kerkon, hap faqet, lexon dhe vendos vete kerkimin tjeter, pastaj kthen pergjigjen.
  // Kthen: teksti (pergjigjja), burimet (te gjitha lidhjet qe pa), kerkimet (cfare kerkoi) dhe numri i kerkimeve.
  async function kerkoMeAI(prompt) {
    if (!OPENAI_KEY) throw new Error('Mungon OPENAI_API_KEY ne Railway.');
    const modeli = /^claude/i.test(MODELI) ? MODELI_PARAZGJEDHUR : MODELI; // kerkimi ne internet behet vetem me OpenAI
    const thirr = async opsione => {
      const trupi = { model: modeli, input: prompt, tools: [{ type: 'web_search' }], include: ['web_search_call.action.sources'] };
      if (opsione.arsyetim) trupi.reasoning = { effort: ARSYETIMI };
      if (opsione.kufi) trupi.max_tool_calls = KERKIME_PER_HAP;
      const r = await fetchKohe(URL_OPENAI_KERKIMI, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OPENAI_KEY }, body: JSON.stringify(trupi)
      }, 900000);
      return { r, data: await r.json().catch(() => ({})) };
    };
    const opsione = { arsyetim: true, kufi: true };
    let { r, data } = await thirr(opsione);
    // Nese OpenAI nuk pranon nje parameter, provo pa te (njehere per secilin).
    for (const [celesi, fjala] of [['kufi', /max_tool_calls/i], ['arsyetim', /reasoning/i]]) {
      if (r.status === 400 && fjala.test(JSON.stringify(data))) { opsione[celesi] = false; ({ r, data } = await thirr(opsione)); }
    }
    if (!r.ok) throw new Error('OpenAI (kerkimi): ' + ((data.error && data.error.message) || r.status));
    const teksti = [], burimet = [], kerkimet = [];
    let numriKerkimeve = 0;
    const shtoUrl = u => { if (typeof u === 'string' && /^https?:\/\//i.test(u) && !burimet.includes(u)) burimet.push(u); };
    (Array.isArray(data.output) ? data.output : []).forEach(item => {
      if (!item) return;
      if (item.type === 'web_search_call') {
        const a = item.action || {};
        if (a.type === 'search' || !a.type) numriKerkimeve++;
        [a.query].concat(Array.isArray(a.queries) ? a.queries : []).forEach(q => { if (typeof q === 'string' && q.trim()) kerkimet.push(q.trim().slice(0, 150)); });
        (Array.isArray(a.sources) ? a.sources : []).forEach(x => shtoUrl(x && x.url));
        shtoUrl(a.url);
      } else if (item.type === 'message') {
        (Array.isArray(item.content) ? item.content : []).forEach(c => {
          if (c && c.type === 'output_text') {
            teksti.push(c.text || '');
            (Array.isArray(c.annotations) ? c.annotations : []).forEach(an => { if (an && an.type === 'url_citation') shtoUrl(an.url); });
          }
        });
      }
    });
    return { teksti: teksti.join('\n'), burimet, kerkimet: liste(kerkimet, 150, 50), numriKerkimeve };
  }


  // ---------- rregullat e mesuara dhe vendimet ----------
  async function rregullatAktive(fazat) {
    const r = await pool.query(`SELECT faza, teksti FROM studimi_rregullat WHERE statusi = 'aktiv' AND faza = ANY($1) ORDER BY id`, [fazat]);
    if (!r.rows.length) return '';
    return '\nRREGULLAT E MESUARA NGA VENDIMET E PERDORUESIT (ndiqi, jane miratuar prej tij):\n' +
      r.rows.map(x => '- [' + x.faza + '] ' + x.teksti).join('\n') + '\n';
  }
  async function ruajVendimin(projektiId, nyjaId, faza, veprimi, propozimi, zgjedhja, arsyeja) {
    await pool.query(`INSERT INTO studimi_vendimet (projekti_id, nyja_id, faza, veprimi, propozimi, zgjedhja, arsyeja) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [projektiId, nyjaId, faza, veprimi, tekst(propozimi, 4000), tekst(zgjedhja, 4000), tekst(arsyeja, 1000)]).catch(e => console.error('vendimi studimi:', e.message));
  }
  async function ruajVersionin(shenim) {
    await pool.query(`INSERT INTO studimi_versionet (aktive, shenim)
      SELECT COALESCE(array_agg(id ORDER BY id), '{}'), $1 FROM studimi_rregullat WHERE statusi = 'aktiv'`, [tekst(shenim, 200)]);
  }

  // ---------- konteksti i nje nyjeje ----------
  async function merrProjektin(pid) {
    const r = await pool.query('SELECT * FROM studimi_projektet WHERE id = $1', [pid]);
    return r.rows[0] || null;
  }
  async function merrNyjen(nid) {
    const r = await pool.query('SELECT * FROM studimi_nyjet WHERE id = $1', [nid]);
    return r.rows[0] || null;
  }
  async function rrugaDeriTe(nid) {
    const r = await pool.query(`WITH RECURSIVE r AS (
        SELECT * FROM studimi_nyjet WHERE id = $1
        UNION ALL SELECT n.* FROM studimi_nyjet n JOIN r ON n.id = r.prindi_id)
      SELECT * FROM r ORDER BY niveli`, [nid]);
    return r.rows;
  }
  function kushtetERruges(rruga) {
    const k = [];
    rruga.forEach(n => (n.kushtet || []).forEach(x => k.push(x + ' (nga niveli ' + n.niveli + ': ' + n.titulli + ')')));
    return k;
  }
  async function konteksti(projekti, rruga) {
    const kushtet = kushtetERruges(rruga);
    return [
      'QELLIMI I PROJEKTIT: ' + projekti.qellimi,
      'KUSHTI KRYESOR (i detyrueshem per cdo gje, nuk shkelet kurre): ' + projekti.kushti_kryesor,
      projekti.profili ? 'PROFILI / KUFIZIMET E PERDORUESIT: ' + projekti.profili : '',
      'RRUGA NE PEME (nga rrenja te nyja aktuale):',
      rruga.map(n => '  niveli ' + n.niveli + (n.dega ? ' [dega ' + n.dega + ']' : '') + ': ' + n.titulli + (n.pyetja ? ' | pyetja: ' + n.pyetja : '')).join('\n'),
      kushtet.length ? 'KUSHTET E NIVELEVE (te detyrueshme ne kete dege):\n' + kushtet.map(x => '  - ' + x).join('\n') : ''
    ].filter(Boolean).join('\n');
  }
  async function opsionetEProjektit(pid) {
    const r = await pool.query(`SELECT emri, statusi FROM studimi_opsionet WHERE projekti_id = $1 ORDER BY id`, [pid]);
    return r.rows;
  }

  // ---------- puna ne sfond: nje dege ne nje kohe per projekt (studimi nuk shkon paralelisht) ----------
  const neProces = new Set(), projektetNeProces = new Map();
  const MESAZHI_ZENE = 'Nje dege tjeter e ketij projekti po studiohet. Studimi behet nje dege ne nje kohe: prit sa te mbaroje.';
  function rezervo(nid, pid) {
    if (neProces.has(nid) || projektetNeProces.has(pid)) return false;
    neProces.add(nid); projektetNeProces.set(pid, nid);
    return true;
  }
  function liro(nid, pid) {
    neProces.delete(nid);
    if (projektetNeProces.get(pid) === nid) projektetNeProces.delete(pid);
  }
  // Nis punen per nje nyje te rezervuar me rezervo(); e liron vete kur mbaron.
  function nisPunen(nid, pid, puna) {
    puna().catch(async e => {
      console.error('studimi nyja ' + nid + ':', e.message);
      await pool.query(`UPDATE studimi_nyjet SET statusi = 'gabim', gabimi = $2, perditesuar = now() WHERE id = $1`, [nid, pastroGabimin(e)]).catch(() => {});
    }).finally(() => liro(nid, pid));
  }

  // ---------- FAZA: ndarja (analiza logjike + nendeget) ----------
  async function ndaj(nyja, udhezim) {
    const projekti = await merrProjektin(nyja.projekti_id);
    const rruga = await rrugaDeriTe(nyja.id);
    const femijet = (await pool.query('SELECT titulli, statusi FROM studimi_nyjet WHERE prindi_id = $1 ORDER BY id', [nyja.id])).rows;
    const opsionet = (await pool.query(`SELECT emri, pike, statusi FROM studimi_opsionet WHERE nyja_id = $1 ORDER BY pike DESC LIMIT 40`, [nyja.id])).rows;
    const eshteRrenje = nyja.niveli === 0;
    const prompt = [
      'Ti je motori logjik i nje studimi qe kerkon menyrat me efikase per te gjetur kliente AUTOMATIKISHT per biznese online.',
      'Mendon si nje strateg kreativ: kur has nje pengese nuk ndalon, por pyet: Pse ekziston pengesa? Cfare dua realisht pas saj?',
      'Ku tjeter shfaqet e njejta gje pa ate pengese? A eshte e hapur dhe falas? Si lidhet me nje sistem (API, RSS, webhook, eksport)?',
      '',
      await konteksti(projekti, rruga),
      await rregullatAktive(['analiza', 'ndarja']),
      eshteRrenje
        ? ['DETYRA: kjo eshte rrenja. Analizo qellimin dhe ndaje ne nendege. Si baze merr dy drejtimet:',
          '  A) MJETI: biznesi online ekziston; si automatizohet marketingu dhe gjetja e klienteve per te.',
          '  B) BIZNESI: produkti nuk eshte vendosur; cfare produkti ose sherbimi online duhet ndertuar qe klientet te vijne vete (shperndarja e ndertuar brenda produktit). Je i lire te zgjedhesh llojin e produktit.',
          'Mund te ndash ndryshe ose te shtosh dege te tjera vetem nese ka arsye te forte; shpjegoje te "analiza".'].join('\n')
        : ['DETYRA: nyja aktuale u kerkua. Perdor rezultatet, pengesat dhe pyetjet alternative me poshte per ta ndare ne nendege',
          'qe shkojne me thelle ose hapin nje drejtim alternativ. Cdo nendege eshte nje pyetje logjike me e ngushte.',
          'PERMBLEDHJA E NYJES: ' + (nyja.permbledhja || '(asnje)'),
          'PENGESAT: ' + ((nyja.pengesat || []).join(' | ') || '(asnje)'),
          'PYETJET ALTERNATIVE: ' + ((nyja.pyetje_alternative || []).join(' | ') || '(asnje)'),
          'OPSIONET E GJETURA KETU: ' + (opsionet.map(o => o.emri + ' (' + o.pike + ', ' + o.statusi + ')').join('; ') || '(asnje)')].join('\n'),
      femijet.length ? 'NENDEGET QE EKZISTOJNE TASHME (mos i perserit): ' + femijet.map(f => f.titulli + ' [' + f.statusi + ']').join('; ') : '',
      udhezim ? 'UDHEZIMI I PERDORUESIT PER KETE NDARJE (ka perparesi): ' + udhezim : '',
      '',
      'Per cdo nendege jep 3 deri ' + MAKS_TERMA + ' terma kerkimi (pikenisja e kerkimit ne internet): te ndryshem nga njeri-tjetri',
      '(sinonime, kende te ndryshme, emra mjetesh, "alternative to", "free api", "how to automate"), te shkurter, ne anglisht pervec kur tregu eshte lokal.',
      'Asnje nendege nuk mund te shkele kushtin kryesor ose kushtet e niveleve.',
      'Shkruaj tekstet ne shqip (termat jo domosdoshmerisht). Pergjigju VETEM me JSON:',
      '{"analiza":"2-5 fjali: logjika e ndarjes","pengesat":["..."],"nendeget":[{"dega":"A|B|tjeter","titulli":"i shkurter","pyetja":"pyetja logjike","arsyeja":"pse kjo dege","termat":["..."]}]}',
      'Jep 2 deri 4 nendege.'
    ].filter(Boolean).join('\n');
    const o = await pyetAIJson(prompt);
    const nendeget = (Array.isArray(o.nendeget) ? o.nendeget : []).slice(0, 4).map(n => ({
      dega: tekst(n && n.dega, 20), titulli: tekst(n && n.titulli, 160), pyetja: tekst(n && n.pyetja, 600), arsyeja: tekst(n && n.arsyeja, 800),
      termat: liste(n && n.termat, 150, MAKS_TERMA)
    })).filter(n => n.titulli && n.termat.length);
    if (!nendeget.length) throw new Error('AI nuk propozoi asnje nendege te vlefshme.');
    for (const n of nendeget) {
      await pool.query(`INSERT INTO studimi_nyjet (projekti_id, prindi_id, niveli, dega, titulli, pyetja, arsyeja, termat)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [nyja.projekti_id, nyja.id, nyja.niveli + 1, n.dega, n.titulli, n.pyetja, n.arsyeja, n.termat]);
    }
    const analiza = tekst(o.analiza, 3000);
    const pengesat = liste(o.pengesat, 300, 8);
    await pool.query(`UPDATE studimi_nyjet SET statusi = 'ndare', gabimi = '', perditesuar = now(),
        permbledhja = CASE WHEN niveli = 0 THEN $2 ELSE permbledhja END,
        pengesat = CASE WHEN niveli = 0 THEN $3 ELSE pengesat END
      WHERE id = $1`, [nyja.id, analiza, pengesat]);
    await ruajVendimin(nyja.projekti_id, nyja.id, 'ndarja', 'ai_propozoi_nendege', udhezim ? 'udhezimi: ' + udhezim : '',
      nendeget.map(n => n.titulli + ' [' + n.termat.join(', ') + ']').join(' | '), '');
  }

  // ---------- FAZA: kerkimi + vleresimi (AI kerkon vete ne internet dhe vlereson ne te njejten kohe) ----------
  async function kerkoDheVlereso(nyja) {
    const projekti = await merrProjektin(nyja.projekti_id);
    const termat = (nyja.termat || []).slice(0, MAKS_TERMA);
    if (!termat.length) throw new Error('Nyja nuk ka terma.');
    if ((projekti.kredite || 0) >= KREDITE_PER_PROJEKT) {
      throw new Error('U arrit kufiri i kerkimeve te AI-se per kete projekt (' + KREDITE_PER_PROJEKT + '). Ndrysho STUDIMI_KERKIME_PER_PROJEKT ne Railway.');
    }
    const rruga = await rrugaDeriTe(nyja.id);
    const teGjetura = await opsionetEProjektit(projekti.id);
    const pare = (await pool.query('SELECT url FROM studimi_lidhjet_pare WHERE projekti_id = $1 ORDER BY url LIMIT 150', [projekti.id])).rows.map(x => x.url);
    const prompt = [
      'Ti je motori logjik i nje studimi per gjetjen automatike te klienteve per biznese online.',
      'Ke mjetin e kerkimit ne internet: perdore ashtu si do ta perdorte nje studiues i mire. Kerko, hap faqet qe duken te vlefshme,',
      'lexo detajet (si funksionon, a ka API, sa kushton, cfare lejojne kushtet e perdorimit), dhe nga ajo qe gjen vendos kerkimin tjeter.',
      'Kur has nje pengese, pyet: pse ekziston, cfare dua realisht pas saj, ku tjeter shfaqet e njejta gje pa pengesen, dhe kerko edhe aty.',
      'Ke te drejte per deri ne ' + KERKIME_PER_HAP + ' kerkime ne kete hap.',
      '',
      await konteksti(projekti, rruga),
      await rregullatAktive(['kerkimi', 'vleresimi']),
      'NYJA AKTUALE: ' + nyja.titulli + ' | pyetja: ' + nyja.pyetja,
      'TERMAT E PIKENISJES (fillo prej tyre, pastaj ndiq ate qe gjen): ' + termat.join(' | '),
      teGjetura.length ? 'OPSIONE TE GJETURA ME PARE NE PROJEKT (mos i perserit; ato te refuzuara jane te padeshiruara, kerko te tjera): ' +
        teGjetura.map(x => x.emri + ' [' + x.statusi + ']').join('; ') : '',
      pare.length ? 'FAQE QE PROJEKTI I KA PARE (perdori vetem nese sjellin dicka te re): ' + pare.join(' ') : '',
      '',
      'DETYRA: gjej OPSIONE konkrete (nje metode, teknike, mjet, burim te dhenash, sherbim ose model biznesi) qe i pergjigjen pyetjes se nyjes.',
      'Per cdo opsion: si funksionon, si lidhet me nje sistem automatik (API, RSS, webhook, eksport, manual), kostoja',
      '("falas", "pjeserisht falas", "me pagese", "e panjohur"), pike 0-100 sipas kushteve dhe efikasitetit, arsyeja e pikeve,',
      'dhe lidhjet (URL te plota) e faqeve ku e verifikove. Mos shpik asgje qe nuk e gjete.',
      'Opsionet qe shkelin kushtin kryesor ose kushtet e niveleve MOS i fut te "opsionet"; shkruaji te "perjashtuar" me arsyen.',
      'Ne fund: cilat jane pengesat qe dolen, dhe 2-4 pyetje logjike alternative per te kaluar pengesat.',
      '',
      'Pergjigjja jote perfundimtare duhet te jete VETEM nje objekt JSON (tekstet ne shqip), pa tekst tjeter:',
      '{"permbledhja":"3-6 fjali","opsionet":[{"emri":"","pershkrimi":"","si_lidhet":"","kostoja":"","pike":0,"arsye":"","burimet":["https://..."]}],',
      '"perjashtuar":"opsionet e perjashtuara me arsyen, ose bosh","pengesat":["..."],"pyetje_alternative":["..."]}',
      'Maksimumi 10 opsione, te renditura nga me i miri.'
    ].filter(Boolean).join('\n');
    const k = await kerkoMeAI(prompt);
    await pool.query('UPDATE studimi_projektet SET kredite = kredite + $2 WHERE id = $1', [projekti.id, k.numriKerkimeve]);
    // Cfare kerkoi AI ruhet si "terma te perdorur", qe "Rikerko" te mos i perserise.
    const perdorur = liste(termat.concat(k.kerkimet), 150, 60);
    await pool.query(`UPDATE studimi_nyjet SET termat_perdorur = (SELECT ARRAY(SELECT DISTINCT unnest(termat_perdorur || $2::text[]))) WHERE id = $1`, [nyja.id, perdorur]);
    for (const u of k.burimet.slice(0, 200)) {
      await pool.query('INSERT INTO studimi_lidhjet_pare (projekti_id, url) VALUES ($1,$2) ON CONFLICT DO NOTHING', [projekti.id, u.replace(/#.*$/, '').replace(/\/+$/, '').slice(0, 1000)]);
    }
    let o = objektNgaTeksti(k.teksti);
    if (!o) {
      // Pergjigjja nuk ishte JSON: AI e kthen ne JSON pa kerkuar perseri.
      o = await pyetAIJson('Ktheje kete pergjigje ne objektin JSON qe kerkohet, pa shtuar asgje qe nuk eshte ne te:\n' +
        '{"permbledhja":"","opsionet":[{"emri":"","pershkrimi":"","si_lidhet":"","kostoja":"","pike":0,"arsye":"","burimet":["https://..."]}],"perjashtuar":"","pengesat":[],"pyetje_alternative":[]}\n\nPERGJIGJJA:\n' + k.teksti.slice(0, 20000));
    }
    const opsionet = (Array.isArray(o.opsionet) ? o.opsionet : []).slice(0, 10);
    for (const x of opsionet) {
      const emri = tekst(x && x.emri, 200);
      if (!emri) continue;
      const burimet = (Array.isArray(x.burimet) ? x.burimet : []).filter(u => typeof u === 'string' && /^https?:\/\//i.test(u)).map(u => u.slice(0, 1000)).slice(0, 6);
      await pool.query(`INSERT INTO studimi_opsionet (projekti_id, nyja_id, emri, pershkrimi, si_lidhet, kostoja, pike, arsye, burimet)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [projekti.id, nyja.id, emri, tekst(x.pershkrimi, 1500), tekst(x.si_lidhet, 800), tekst(x.kostoja, 60),
        numri(x.pike, 0, 0, 100), tekst(x.arsye, 800), burimet]);
    }
    const shenim = k.numriKerkimeve + ' kerkime ne internet, ' + k.burimet.length + ' faqe te para.';
    await pool.query(`UPDATE studimi_nyjet SET statusi = 'vleresuar', perditesuar = now(), gabimi = '',
        permbledhja = $2, pengesat = $3, pyetje_alternative = $4, perjashtuar = $5 WHERE id = $1`,
    [nyja.id, (tekst(o.permbledhja, 3000) + '\n(' + shenim + ')').trim(), liste(o.pengesat, 300, 8), liste(o.pyetje_alternative, 300, 6), tekst(o.perjashtuar, 2000)]);
  }

  // Rikerkimi: AI krijon terma te rinj, duke perjashtuar termat e perdorur dhe opsionet e gjetura.
  async function termaTeRinj(nyja, udhezim) {
    const projekti = await merrProjektin(nyja.projekti_id);
    const rruga = await rrugaDeriTe(nyja.id);
    const teGjetura = await opsionetEProjektit(projekti.id);
    const o = await pyetAIJson([
      'Ti je motori logjik i nje studimi per gjetjen automatike te klienteve per biznese online.',
      '',
      await konteksti(projekti, rruga),
      await rregullatAktive(['kerkimi']),
      'NYJA AKTUALE: ' + nyja.titulli + ' | pyetja: ' + nyja.pyetja,
      'TERMAT E PERDORUR TASHME (mos i perserit as me sinonime shume te aferta): ' + ((nyja.termat_perdorur || []).join('; ') || '(asnje)'),
      'OPSIONET E GJETURA TASHME (kerko te tjera, jo keto): ' + (teGjetura.map(x => x.emri).join('; ') || '(asnje)'),
      'PENGESAT: ' + ((nyja.pengesat || []).join(' | ') || '(asnje)'),
      udhezim ? 'UDHEZIMI I PERDORUESIT (ka perparesi): ' + udhezim : '',
      '',
      'DETYRA: krijo ' + MAKS_TERMA + ' terma te rinj (pikenisje per kerkimin ne internet) qe sjellin opsione TE REJA per kete pyetje: kende te tjera, burime te tjera,',
      'industri te ngjashme, fjale qe perdorin zhvilluesit ose marketeret, gjuhe/tregje te tjera nese ka kuptim.',
      'Pergjigju VETEM me JSON: {"arsyeja":"1-2 fjali ne shqip","termat":["..."]}'
    ].filter(Boolean).join('\n'));
    const perdorur = new Set((nyja.termat_perdorur || []).map(x => x.toLowerCase()));
    const termat = liste(o.termat, 150, MAKS_TERMA).filter(t => !perdorur.has(t.toLowerCase()));
    if (!termat.length) throw new Error('AI nuk gjeti terma te rinj.');
    return { termat, arsyeja: tekst(o.arsyeja, 500) };
  }

  // ---------- FAZA: mesimi (rregulla nga vendimet) ----------
  async function nxirrRregulla() {
    const v = (await pool.query(`SELECT v.id, v.faza, v.veprimi, v.propozimi, v.zgjedhja, v.arsyeja, n.titulli
      FROM studimi_vendimet v LEFT JOIN studimi_nyjet n ON n.id = v.nyja_id
      WHERE v.veprimi <> 'ai_propozoi_nendege' ORDER BY v.id DESC LIMIT 80`)).rows;
    if (v.length < 3) throw new Error('Duhen te pakten 3 vendime te tuat para se te nxirren rregulla.');
    const ekzistuese = (await pool.query(`SELECT faza, teksti, statusi FROM studimi_rregullat WHERE statusi IN ('aktiv','propozuar') ORDER BY id`)).rows;
    const o = await pyetAIJson([
      'Je asistenti qe meson menyren e te menduarit te nje perdoruesi. Me poshte jane vendimet e tij ne nje studim qe kerkon menyra',
      'per te gjetur kliente automatikisht: cfare propozoi AI, cfare zgjodhi ai (miratoi, refuzoi, ndryshoi termat, shtoi kushte), dhe arsyet.',
      '',
      'VENDIMET (me te rejat te parat):',
      v.map(x => '#' + x.id + ' [' + x.faza + '] ' + x.veprimi + (x.titulli ? ' | nyja: ' + x.titulli : '') +
        (x.propozimi ? ' | AI propozoi: ' + x.propozimi.slice(0, 400) : '') + (x.zgjedhja ? ' | perdoruesi zgjodhi: ' + x.zgjedhja.slice(0, 400) : '') +
        (x.arsyeja ? ' | arsyeja: ' + x.arsyeja : '')).join('\n'),
      '',
      ekzistuese.length ? 'RREGULLAT QE EKZISTOJNE (mos i perserit): ' + ekzistuese.map(x => '[' + x.faza + '] ' + x.teksti).join('; ') : '',
      'DETYRA: nxirr deri ne 6 rregulla te reja, konkrete dhe te zbatueshme, qe pershkruajne si mendon dhe ndan perdoruesi.',
      'Cdo rregull i perket nje faze: "analiza", "ndarja", "kerkimi" ose "vleresimi". Mos nxirr rregull nga nje vendim i vetem i rastesishem;',
      'te "baza" shkruaj numrat e vendimeve qe e mbeshtesin. Shkruaj ne shqip.',
      'Pergjigju VETEM me JSON: {"rregullat":[{"faza":"","teksti":"","baza":"#12, #15"}]}'
    ].filter(Boolean).join('\n'));
    let n = 0;
    for (const x of (Array.isArray(o.rregullat) ? o.rregullat : []).slice(0, 6)) {
      const faza = FAZAT.includes(x && x.faza) ? x.faza : null, t = tekst(x && x.teksti, 500);
      if (!faza || !t) continue;
      await pool.query(`INSERT INTO studimi_rregullat (faza, teksti, baza) VALUES ($1,$2,$3)`, [faza, t, tekst(x.baza, 200)]);
      n++;
    }
    return n;
  }

  // ---------- mbrojtja (opsionale) ----------
  app.use('/api/studimi', (req, res, next) => {
    if (!FJALEKALIMI || req.get('x-studimi-fjalekalimi') === FJALEKALIMI) return next();
    res.status(401).json({ error: 'fjalekalimi', mesazhi: 'Seksioni Studimi kerkon fjalekalimin (STUDIMI_FJALEKALIMI).' });
  });
  async function prit(res) {
    if (await gati) return true;
    res.status(503).json({ error: 'Tabelat e Studimit nuk u krijuan (shih logjet e serverit).' });
    return false;
  }
  const rrugaAPI = fn => async (req, res) => {
    if (!(await prit(res))) return;
    try { await fn(req, res); } catch (e) { console.error('studimi API:', e.message); res.status(500).json({ error: pastroGabimin(e) }); }
  };

  app.get('/studimi-client.js', (req, res) => {
    res.type('application/javascript').sendFile(path.join(__dirname, 'studimi-client.js'));
  });

  // ---------- projektet ----------
  app.get('/api/studimi/gjendja', rrugaAPI(async (req, res) => {
    res.json({ modeli: MODELI, arsyetimi: ARSYETIMI, maksTerma: MAKS_TERMA, kerkimePerHap: KERKIME_PER_HAP, thellesiaMaks: THELLESIA_MAKS, kreditePerProjekt: KREDITE_PER_PROJEKT,
      kaOpenAI: !!OPENAI_KEY, kaAnthropic: !!ANTHROPIC_KEY });
  }));
  app.get('/api/studimi/projektet', rrugaAPI(async (req, res) => {
    const r = await pool.query('SELECT id, emri, kredite, krijuar FROM studimi_projektet ORDER BY id DESC');
    res.json({ projektet: r.rows });
  }));
  app.post('/api/studimi/projekti', rrugaAPI(async (req, res) => {
    const b = req.body || {};
    const emri = tekst(b.emri, 120), qellimi = tekst(b.qellimi, 2000), kushti = tekst(b.kushti_kryesor, 2000), profili = tekst(b.profili, 3000);
    if (!emri || !qellimi || !kushti) return res.status(400).json({ error: 'Emri, qellimi dhe kushti kryesor jane te detyrueshem.' });
    const p = (await pool.query('INSERT INTO studimi_projektet (emri, qellimi, kushti_kryesor, profili) VALUES ($1,$2,$3,$4) RETURNING *',
      [emri, qellimi, kushti, profili])).rows[0];
    await pool.query(`INSERT INTO studimi_nyjet (projekti_id, niveli, titulli, pyetja, statusi) VALUES ($1, 0, 'Qellimi', $2, 'rrenje')`, [p.id, qellimi]);
    res.json({ projekti: p });
  }));
  app.post('/api/studimi/projekti/:id/fshij', rrugaAPI(async (req, res) => {
    const pid = id(req.params.id);
    if (!pid) return res.status(400).json({ error: 'ID e gabuar.' });
    await pool.query('DELETE FROM studimi_projektet WHERE id = $1', [pid]);
    res.json({ ok: true });
  }));
  app.get('/api/studimi/projekti/:id', rrugaAPI(async (req, res) => {
    const pid = id(req.params.id);
    const p = pid && await merrProjektin(pid);
    if (!p) return res.status(404).json({ error: 'Projekti nuk u gjet.' });
    const nyjet = (await pool.query(`SELECT n.id, n.prindi_id, n.niveli, n.dega, n.titulli, n.statusi,
        (SELECT count(*)::int FROM studimi_opsionet o WHERE o.nyja_id = n.id) AS opsione,
        (SELECT count(*)::int FROM studimi_opsionet o WHERE o.nyja_id = n.id AND o.statusi = 'miratuar') AS miratuar
      FROM studimi_nyjet n WHERE n.projekti_id = $1 ORDER BY n.niveli, n.id`, [pid])).rows;
    res.json({ projekti: p, nyjet, kreditePerProjekt: KREDITE_PER_PROJEKT });
  }));

  // ---------- nyjet ----------
  app.get('/api/studimi/nyja/:id', rrugaAPI(async (req, res) => {
    const nid = id(req.params.id);
    const n = nid && await merrNyjen(nid);
    if (!n) return res.status(404).json({ error: 'Nyja nuk u gjet.' });
    const rruga = await rrugaDeriTe(nid);
    const opsionet = (await pool.query('SELECT * FROM studimi_opsionet WHERE nyja_id = $1 ORDER BY pike DESC, id', [nid])).rows;
    const femijet = (await pool.query('SELECT id, titulli, statusi FROM studimi_nyjet WHERE prindi_id = $1 ORDER BY id', [nid])).rows;
    res.json({ nyja: n, rruga: rruga.map(x => ({ id: x.id, niveli: x.niveli, titulli: x.titulli })), kushtetTrasheguara: kushtetERruges(rruga.slice(0, -1)),
      opsionet, femijet, neProces: neProces.has(nid), thellesiaMaks: THELLESIA_MAKS });
  }));

  // Ndaj ne nendege (rrenja ose nje nyje e vleresuar).
  app.post('/api/studimi/nyja/:id/ndaj', rrugaAPI(async (req, res) => {
    const n = await merrNyjen(id(req.params.id));
    if (!n) return res.status(404).json({ error: 'Nyja nuk u gjet.' });
    if (n.niveli + 1 > THELLESIA_MAKS) return res.status(400).json({ error: 'U arrit thellesia maksimale e pemes (' + THELLESIA_MAKS + ').' });
    if (!['rrenje', 'vleresuar', 'ndare', 'gabim'].includes(n.statusi)) return res.status(400).json({ error: 'Kjo nyje duhet te kerkohet para se te ndahet.' });
    const udhezim = tekst((req.body || {}).udhezim, 1000), arsyeja = tekst((req.body || {}).arsyeja, 1000);
    if (!rezervo(n.id, n.projekti_id)) return res.status(409).json({ error: MESAZHI_ZENE });
    const statusiPara = n.statusi;
    try { await pool.query(`UPDATE studimi_nyjet SET statusi = 'duke ndare', gabimi = '', perditesuar = now() WHERE id = $1`, [n.id]); }
    catch (e) { liro(n.id, n.projekti_id); throw e; }
    await ruajVendimin(n.projekti_id, n.id, 'ndarja', 'perdoruesi_kerkoi_ndarje', '', udhezim, arsyeja);
    nisPunen(n.id, n.projekti_id, async () => {
      try { await ndaj(n, udhezim); }
      catch (e) { await pool.query('UPDATE studimi_nyjet SET statusi = $2, gabimi = $3 WHERE id = $1', [n.id, statusiPara, pastroGabimin(e)]); }
    });
    res.json({ ok: true });
  }));

  // Ndrysho termat me dore.
  app.post('/api/studimi/nyja/:id/termat', rrugaAPI(async (req, res) => {
    const n = await merrNyjen(id(req.params.id));
    if (!n) return res.status(404).json({ error: 'Nyja nuk u gjet.' });
    if (n.niveli === 0) return res.status(400).json({ error: 'Rrenja nuk ka terma.' });
    const termat = liste((req.body || {}).termat, 150, MAKS_TERMA);
    if (!termat.length) return res.status(400).json({ error: 'Shkruaj te pakten nje term.' });
    await pool.query('UPDATE studimi_nyjet SET termat = $2, perditesuar = now() WHERE id = $1', [n.id, termat]);
    await ruajVendimin(n.projekti_id, n.id, 'kerkimi', 'ndryshoi_termat', (n.termat || []).join(' | '), termat.join(' | '), (req.body || {}).arsyeja);
    res.json({ ok: true, termat });
  }));

  // Shto ose hiq nje kusht ne kete nivel (kushti kryesor i projektit nuk preket kurre).
  app.post('/api/studimi/nyja/:id/kusht', rrugaAPI(async (req, res) => {
    const n = await merrNyjen(id(req.params.id));
    if (!n) return res.status(404).json({ error: 'Nyja nuk u gjet.' });
    const b = req.body || {};
    let kushtet = (n.kushtet || []).slice();
    if (b.fshij != null) {
      const i = parseInt(b.fshij, 10);
      if (!(i >= 0 && i < kushtet.length)) return res.status(400).json({ error: 'Kushti nuk u gjet.' });
      const hequr = kushtet.splice(i, 1)[0];
      await ruajVendimin(n.projekti_id, n.id, 'vleresimi', 'hoqi_kusht', '', hequr, b.arsyeja);
    } else {
      const k = tekst(b.kushti, 400);
      if (!k) return res.status(400).json({ error: 'Shkruaj kushtin.' });
      if (kushtet.length >= 10) return res.status(400).json({ error: 'Maksimumi 10 kushte per nivel.' });
      kushtet.push(k);
      await ruajVendimin(n.projekti_id, n.id, 'vleresimi', 'shtoi_kusht', '', k, b.arsyeja);
    }
    await pool.query('UPDATE studimi_nyjet SET kushtet = $2, perditesuar = now() WHERE id = $1', [n.id, kushtet]);
    res.json({ ok: true, kushtet });
  }));

  // Mirato dhe kerko (me termat qe ka nyja tani).
  async function niseKerkimin(n, res, veprimi, arsyeja) {
    if (n.niveli === 0) return res.status(400).json({ error: 'Rrenja nuk kerkohet; ndaje ne dege.' });
    const p = await merrProjektin(n.projekti_id);
    if ((p.kredite || 0) >= KREDITE_PER_PROJEKT) {
      return res.status(400).json({ error: 'U arrit kufiri i kerkimeve te AI-se per kete projekt (' + KREDITE_PER_PROJEKT + ').' });
    }
    if (!rezervo(n.id, n.projekti_id)) return res.status(409).json({ error: MESAZHI_ZENE });
    try { await pool.query(`UPDATE studimi_nyjet SET statusi = 'duke kerkuar', gabimi = '', perditesuar = now() WHERE id = $1`, [n.id]); }
    catch (e) { liro(n.id, n.projekti_id); throw e; }
    await ruajVendimin(n.projekti_id, n.id, 'kerkimi', veprimi, '', (n.termat || []).join(' | '), arsyeja);
    nisPunen(n.id, n.projekti_id, async () => kerkoDheVlereso(await merrNyjen(n.id)));
    res.json({ ok: true });
  }
  app.post('/api/studimi/nyja/:id/mirato', rrugaAPI(async (req, res) => {
    const n = await merrNyjen(id(req.params.id));
    if (!n) return res.status(404).json({ error: 'Nyja nuk u gjet.' });
    if (!['propozuar', 'gabim', 'refuzuar', 'vleresuar', 'ndare'].includes(n.statusi)) return res.status(400).json({ error: 'Kjo nyje nuk mund te kerkohet tani.' });
    await niseKerkimin(n, res, ['vleresuar', 'ndare'].includes(n.statusi) ? 'kerkoi_perseri' : 'miratoi_kerkimin', (req.body || {}).arsyeja);
  }));
  // Shto nje nendege me dore nen nyjen e zgjedhur (statusi "propozuar": kerkohet vetem kur ta miratosh).
  app.post('/api/studimi/nyja/:id/shto', rrugaAPI(async (req, res) => {
    const n = await merrNyjen(id(req.params.id));
    if (!n) return res.status(404).json({ error: 'Nyja nuk u gjet.' });
    if (n.niveli + 1 > THELLESIA_MAKS) return res.status(400).json({ error: 'U arrit thellesia maksimale e pemes (' + THELLESIA_MAKS + ').' });
    if (n.statusi === 'refuzuar') return res.status(400).json({ error: 'Kjo dege eshte refuzuar.' });
    const b = req.body || {};
    const titulli = tekst(b.titulli, 160), pyetja = tekst(b.pyetja, 600), termat = liste(b.termat, 150, MAKS_TERMA);
    if (!titulli || !termat.length) return res.status(400).json({ error: 'Shkruaj titullin dhe te pakten nje term.' });
    const r = await pool.query(`INSERT INTO studimi_nyjet (projekti_id, prindi_id, niveli, titulli, pyetja, arsyeja, termat)
      VALUES ($1,$2,$3,$4,$5,'Shtuar me dore',$6) RETURNING id`, [n.projekti_id, n.id, n.niveli + 1, titulli, pyetja, termat]);
    await ruajVendimin(n.projekti_id, r.rows[0].id, 'ndarja', 'shtoi_dege_me_dore', '', titulli + (pyetja ? ' | ' + pyetja : '') + ' [' + termat.join(', ') + ']', b.arsyeja);
    res.json({ ok: true, id: r.rows[0].id });
  }));
  // Rikerko: terma te rinj nga AI (pa termat e perdorur dhe pa opsionet e gjetura), pastaj kerkim.
  app.post('/api/studimi/nyja/:id/rikerko', rrugaAPI(async (req, res) => {
    const n = await merrNyjen(id(req.params.id));
    if (!n) return res.status(404).json({ error: 'Nyja nuk u gjet.' });
    if (!['vleresuar', 'ndare', 'gabim'].includes(n.statusi) || n.niveli === 0 || !(n.termat_perdorur || []).length) return res.status(400).json({ error: 'Rikerkimi behet pas nje kerkimi.' });
    const udhezim = tekst((req.body || {}).udhezim, 1000), arsyeja = tekst((req.body || {}).arsyeja, 1000);
    if (!rezervo(n.id, n.projekti_id)) return res.status(409).json({ error: MESAZHI_ZENE });
    try { await pool.query(`UPDATE studimi_nyjet SET statusi = 'duke kerkuar', gabimi = '', perditesuar = now() WHERE id = $1`, [n.id]); }
    catch (e) { liro(n.id, n.projekti_id); throw e; }
    nisPunen(n.id, n.projekti_id, async () => {
      const t = await termaTeRinj(n, udhezim);
      await pool.query('UPDATE studimi_nyjet SET termat = $2 WHERE id = $1', [n.id, t.termat]);
      await ruajVendimin(n.projekti_id, n.id, 'kerkimi', 'rikerkoi', (n.termat || []).join(' | '), t.termat.join(' | ') + (udhezim ? ' (udhezimi: ' + udhezim + ')' : ''), arsyeja);
      await kerkoDheVlereso(await merrNyjen(n.id));
    });
    res.json({ ok: true });
  }));
  app.post('/api/studimi/nyja/:id/refuzo', rrugaAPI(async (req, res) => {
    const n = await merrNyjen(id(req.params.id));
    if (!n) return res.status(404).json({ error: 'Nyja nuk u gjet.' });
    if (n.niveli === 0 || neProces.has(n.id)) return res.status(400).json({ error: 'Kjo nyje nuk mund te refuzohet tani.' });
    await pool.query(`UPDATE studimi_nyjet SET statusi = 'refuzuar', perditesuar = now() WHERE id = $1`, [n.id]);
    await ruajVendimin(n.projekti_id, n.id, 'ndarja', 'refuzoi_degen', n.titulli + ' | ' + n.pyetja, '', (req.body || {}).arsyeja);
    res.json({ ok: true });
  }));

  // ---------- opsionet ----------
  app.post('/api/studimi/opsioni/:id/statusi', rrugaAPI(async (req, res) => {
    const oid = id(req.params.id), statusi = (req.body || {}).statusi;
    if (!oid || !STATUSET_OPSIONI.includes(statusi)) return res.status(400).json({ error: 'Te dhena te gabuara.' });
    const o = (await pool.query('UPDATE studimi_opsionet SET statusi = $2 WHERE id = $1 RETURNING *', [oid, statusi])).rows[0];
    if (!o) return res.status(404).json({ error: 'Opsioni nuk u gjet.' });
    await ruajVendimin(o.projekti_id, o.nyja_id, 'vleresimi', statusi === 'miratuar' ? 'miratoi_opsionin' : (statusi === 'refuzuar' ? 'refuzoi_opsionin' : 'riktheu_opsionin'),
      o.emri + ' (pike ' + o.pike + ', kostoja ' + o.kostoja + '): ' + o.arsye, statusi, (req.body || {}).arsyeja);
    res.json({ ok: true });
  }));

  // ---------- vendimet dhe rregullat ----------
  app.get('/api/studimi/vendimet', rrugaAPI(async (req, res) => {
    const r = await pool.query(`SELECT v.id, v.faza, v.veprimi, v.zgjedhja, v.arsyeja, v.krijuar, n.titulli FROM studimi_vendimet v
      LEFT JOIN studimi_nyjet n ON n.id = v.nyja_id WHERE v.veprimi <> 'ai_propozoi_nendege' ORDER BY v.id DESC LIMIT 50`);
    res.json({ vendimet: r.rows });
  }));
  app.get('/api/studimi/rregullat', rrugaAPI(async (req, res) => {
    const r = await pool.query(`SELECT * FROM studimi_rregullat WHERE statusi <> 'fshire' ORDER BY faza, id`);
    const v = await pool.query('SELECT count(*)::int AS n FROM studimi_versionet');
    res.json({ rregullat: r.rows, versione: v.rows[0].n });
  }));
  let nxjerrjaNeProces = false;
  app.post('/api/studimi/rregullat/nxirr', rrugaAPI(async (req, res) => {
    if (nxjerrjaNeProces) return res.status(409).json({ error: 'Nxjerrja e rregullave po punon tashme.' });
    nxjerrjaNeProces = true;
    try { res.json({ ok: true, teReja: await nxirrRregulla() }); } finally { nxjerrjaNeProces = false; }
  }));
  app.post('/api/studimi/rregulli/:id', rrugaAPI(async (req, res) => {
    const rid = id(req.params.id), statusi = (req.body || {}).statusi;
    if (!rid || !['aktiv', 'joaktiv', 'fshire'].includes(statusi)) return res.status(400).json({ error: 'Te dhena te gabuara.' });
    const r = (await pool.query('UPDATE studimi_rregullat SET statusi = $2 WHERE id = $1 RETURNING *', [rid, statusi])).rows[0];
    if (!r) return res.status(404).json({ error: 'Rregulli nuk u gjet.' });
    await ruajVersionin(statusi + ' #' + rid);
    res.json({ ok: true });
  }));
  // Kthehu te grupi i rregullave aktive para ndryshimit te fundit.
  app.post('/api/studimi/rregullat/kthe', rrugaAPI(async (req, res) => {
    const v = (await pool.query('SELECT * FROM studimi_versionet ORDER BY id DESC LIMIT 2')).rows;
    if (v.length < 1) return res.status(400).json({ error: 'Nuk ka version te meparshem.' });
    const aktive = v.length === 2 ? (v[1].aktive || []) : [];
    await pool.query(`UPDATE studimi_rregullat SET statusi = CASE WHEN id = ANY($1) THEN 'aktiv' ELSE 'joaktiv' END
      WHERE statusi IN ('aktiv', 'joaktiv')`, [aktive]);
    await pool.query('DELETE FROM studimi_versionet WHERE id = $1', [v[0].id]);
    res.json({ ok: true, aktive: aktive.length });
  }));
};
