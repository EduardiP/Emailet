// TAB-I "AdSense": gjen cilat domaine shfaqin reklama Google (AdSense / Ad Manager) SOT, duke lexuar ads.txt te secilit.
// Burimet: Lancime (vetem B2B), Kompani te reja, Bizneset e ruajtura, dhe nje liste qe ngjitet me dore.
// Rezultati: tabele + buton "Kopjo per Google Ads" (domainet me Google DIRECT, nje per rresht, per Placements > Websites).
// Ne server.js ka vetem dy rreshta:  require('./adsense')(app, pool);   dhe   <script src="/adsense-client.js"></script>
module.exports = function (app, pool) {
  pool.query(`CREATE TABLE IF NOT EXISTS adsense_kontroll (
    domaini TEXT PRIMARY KEY,
    burimi TEXT,
    ka_ads_txt BOOLEAN,
    ka_google BOOLEAN,
    google_pub TEXT,
    direct BOOLEAN,
    rrjete TEXT,
    kontakt TEXT,
    kontrolluar_at TIMESTAMPTZ DEFAULT now()
  )`).catch(e => console.error('migrim adsense_kontroll:', e.message));

  const KOHA = 10000, PUNETORE = 15, RIKONTROLL_DITE = 7;
  let puna = null; // { bere, gjithsej, gjetur, statusi, gabim }

  const domainIVlefshem = d => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) && !/^\d+(\.\d+)+$/.test(d) && d.length < 200;
  function pastro(d) {
    return String(d || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[\/?#:].*$/, '');
  }

  async function lexo(url) {
    const ndal = new AbortController(); const ora = setTimeout(() => ndal.abort(), KOHA);
    try {
      const r = await fetch(url, { signal: ndal.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ads-txt-check/1.0)' } });
      if (!r.ok) return null;
      const lloji = (r.headers.get('content-type') || '').toLowerCase();
      const tekst = (await r.text()).slice(0, 300000);
      // ads.txt i vertete eshte tekst i thjeshte; shume faqe kthejne HTML (faqe gabimi) per kete adrese
      if (lloji.includes('html') || /<html/i.test(tekst.slice(0, 500))) return null;
      return tekst;
    } catch (e) { return null; } finally { clearTimeout(ora); }
  }

  function analizo(tekst) {
    const google = new Set(), rrjete = new Set(); let direct = false, kontakt = '';
    for (let rr of tekst.split(/\r?\n/)) {
      rr = rr.split('#')[0].trim(); if (!rr) continue;
      if (/^contact=/i.test(rr)) { kontakt = kontakt || rr.split('=').slice(1).join('=').trim(); continue; }
      const p = rr.split(',').map(x => x.trim()); if (p.length < 3) continue;
      const rrjeti = p[0].toLowerCase(); rrjete.add(rrjeti);
      if (rrjeti === 'google.com' && /^pub-\d{10,}$/.test(p[1])) { google.add(p[1]); if (p[2].toUpperCase() === 'DIRECT') direct = true; }
    }
    rrjete.delete('google.com');
    return { ka_google: google.size > 0, google_pub: [...google].join(' '), direct, rrjete: [...rrjete].join(' ').slice(0, 300), kontakt: kontakt.slice(0, 200) };
  }

  async function kontrollo(domaini, burimi) {
    let tekst = await lexo('https://' + domaini + '/ads.txt');
    if (tekst == null) tekst = await lexo('https://www.' + domaini + '/ads.txt');
    const a = tekst == null ? { ka_google: false, google_pub: '', direct: false, rrjete: '', kontakt: '' } : analizo(tekst);
    await pool.query(
      `INSERT INTO adsense_kontroll (domaini, burimi, ka_ads_txt, ka_google, google_pub, direct, rrjete, kontakt, kontrolluar_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())
       ON CONFLICT (domaini) DO UPDATE SET burimi = EXCLUDED.burimi, ka_ads_txt = EXCLUDED.ka_ads_txt, ka_google = EXCLUDED.ka_google,
         google_pub = EXCLUDED.google_pub, direct = EXCLUDED.direct, rrjete = EXCLUDED.rrjete, kontakt = EXCLUDED.kontakt, kontrolluar_at = now()`,
      [domaini, burimi, tekst != null, a.ka_google, a.google_pub, a.direct, a.rrjete, a.kontakt]);
    return a.ka_google;
  }

  async function mblidhDomainet(b) {
    const lista = new Map(); // domaini -> burimi
    const shto = (d, burimi) => { d = pastro(d); if (domainIVlefshem(d) && !lista.has(d)) lista.set(d, burimi); };
    if (b.lancime) (await pool.query(`SELECT domain FROM lancime_reja WHERE domain_vetjak IS NOT FALSE AND tipi ILIKE '%B2B%'`)).rows.forEach(r => shto(r.domain, 'Lancime (B2B)'));
    if (b.kompani) (await pool.query(`SELECT domain FROM kompani_pare`)).rows.forEach(r => shto(r.domain, 'Kompani te reja'));
    if (b.bizneset) (await pool.query(`SELECT domain FROM bizneset_gjetur`)).rows.forEach(r => shto(r.domain, 'Bizneset e ruajtura'));
    String(b.lista || '').split(/[\s,;]+/).slice(0, 20000).forEach(d => shto(d, 'Lista e ngjitur'));
    // mos rikontrollo ato te kontrolluara se fundmi
    const fundit = new Set((await pool.query(`SELECT domaini FROM adsense_kontroll WHERE kontrolluar_at > now() - ($1 || ' days')::interval`, [String(RIKONTROLL_DITE)])).rows.map(r => r.domaini));
    return [...lista].filter(([d]) => !fundit.has(d));
  }

  app.post('/api/adsense/kontrollo', async (req, res) => {
    if (puna && puna.statusi === 'duke-punuar') return res.status(409).json({ error: 'Nje kontroll eshte ende ne pune.' });
    try {
      const radha = await mblidhDomainet(req.body || {});
      puna = { bere: 0, gjithsej: radha.length, gjetur: 0, statusi: 'duke-punuar', gabim: null };
      res.json({ ok: true, gjithsej: radha.length });
      let i = 0;
      const punetor = async () => {
        while (i < radha.length) {
          const [d, burimi] = radha[i++];
          try { if (await kontrollo(d, burimi)) puna.gjetur++; } catch (e) { puna.gabim = String(e.message || e).slice(0, 200); }
          puna.bere++;
        }
      };
      Promise.all(Array.from({ length: PUNETORE }, punetor)).then(() => { puna.statusi = 'perfunduar'; });
    } catch (e) { res.status(500).json({ error: String(e.message || e).slice(0, 200) }); }
  });

  app.get('/api/adsense/statusi', (req, res) => res.json({ puna }));

  app.get('/api/adsense', async (req, res) => {
    try {
      const r = await pool.query(`SELECT domaini, burimi, google_pub, direct, rrjete, kontakt, kontrolluar_at FROM adsense_kontroll
        WHERE ka_google ORDER BY direct DESC, kontrolluar_at DESC LIMIT 5000`);
      const n = (await pool.query(`SELECT COUNT(*)::int AS gjithsej, COUNT(*) FILTER (WHERE ka_google)::int AS google FROM adsense_kontroll`)).rows[0];
      res.json({ rows: r.rows, numrat: n });
    } catch (e) { res.status(500).json({ error: String(e.message || e).slice(0, 200) }); }
  });

  app.get('/adsense-client.js', (req, res) => { res.type('application/javascript').send(KLIENTI); });

  const KLIENTI = `(function () {
  var tabs = document.querySelector('.tabs'), wrap = document.querySelector('.wrap');
  if (!tabs || !wrap || document.getElementById('tabAdsense')) return;
  var tab = document.createElement('div'); tab.className = 'tab'; tab.id = 'tabAdsense'; tab.textContent = 'AdSense';
  tab.onclick = function () { window.ndryshoTab('adsense'); }; tabs.appendChild(tab);
  var p = document.createElement('div'); p.className = 'sec-panel'; p.id = 'panelAdsense';
  p.innerHTML =
    '<p class="mut">Gjen cilat domaine shfaqin SOT reklama Google (AdSense / Ad Manager), duke lexuar ads.txt te secilit. ' +
    'Domainet e kontrolluara ne 7 ditet e fundit nuk rikontrollohen.</p>' +
    '<p><label><input type="checkbox" id="adsL" checked> Lancime (vetem B2B)</label> &nbsp; ' +
    '<label><input type="checkbox" id="adsK" checked> Kompani te reja</label> &nbsp; ' +
    '<label><input type="checkbox" id="adsB" checked> Bizneset e ruajtura</label></p>' +
    '<p><textarea id="adsLista" rows="4" style="width:100%" placeholder="Opsionale: ngjit domaine te tjera, nje per rresht (p.sh. lista saas_com.csv)"></textarea></p>' +
    '<p><button id="adsKontrollo">Kontrollo</button> <span id="adsStat" class="mut"></span></p>' +
    '<p><button id="adsKopjo">Kopjo per Google Ads (vetem DIRECT)</button> <span id="adsNum" class="mut"></span></p>' +
    '<div style="overflow:auto"><table id="adsTab" style="width:100%;border-collapse:collapse;font-size:13px"></table></div>';
  wrap.appendChild(p);
  var el = function (id) { return document.getElementById(id); };
  var rreshtat = [];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ngarko() {
    fetch('/api/adsense').then(function (r) { return r.json(); }).then(function (j) {
      rreshtat = j.rows || [];
      var d = rreshtat.filter(function (x) { return x.direct; }).length;
      el('adsNum').textContent = 'Me Google: ' + rreshtat.length + ' (DIRECT: ' + d + ') nga ' + ((j.numrat && j.numrat.gjithsej) || 0) + ' te kontrolluara';
      el('adsTab').innerHTML = '<tr><th align="left">Domaini</th><th align="left">Burimi</th><th align="left">Google pub</th><th>DIRECT</th><th align="left">Kontakt</th><th align="left">Rrjete te tjera</th></tr>' +
        rreshtat.map(function (x) {
          return '<tr style="border-top:1px solid #ddd"><td><a href="https://' + esc(x.domaini) + '" target="_blank" rel="noopener">' + esc(x.domaini) + '</a></td><td>' + esc(x.burimi) +
            '</td><td>' + esc(x.google_pub) + '</td><td align="center">' + (x.direct ? 'po' : 'jo') + '</td><td>' + esc(x.kontakt) + '</td><td>' + esc(x.rrjete) + '</td></tr>';
        }).join('');
    });
  }
  function ndiq() {
    fetch('/api/adsense/statusi').then(function (r) { return r.json(); }).then(function (j) {
      var w = j.puna; if (!w) return;
      el('adsStat').textContent = (w.statusi === 'perfunduar' ? 'Perfundoi: ' : 'Duke kontrolluar: ') + w.bere + ' / ' + w.gjithsej + ', me Google: ' + w.gjetur + (w.gabim ? ' (gabim: ' + w.gabim + ')' : '');
      if (w.statusi === 'duke-punuar') setTimeout(ndiq, 3000); else ngarko();
    });
  }
  el('adsKontrollo').onclick = function () {
    el('adsStat').textContent = 'Duke nisur...';
    fetch('/api/adsense/kontrollo', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lancime: el('adsL').checked, kompani: el('adsK').checked, bizneset: el('adsB').checked, lista: el('adsLista').value }) })
      .then(function (r) { return r.json(); }).then(function (j) {
        if (j.error) { el('adsStat').textContent = j.error; return; }
        el('adsStat').textContent = 'Per kontroll: ' + j.gjithsej + ' domaine';
        setTimeout(ndiq, 2000);
      });
  };
  el('adsKopjo').onclick = function () {
    var t = rreshtat.filter(function (x) { return x.direct; }).map(function (x) { return x.domaini; }).join('\\n');
    if (!t) { el('adsNum').textContent = 'Asnje domain me DIRECT ende.'; return; }
    navigator.clipboard.writeText(t).then(function () { el('adsNum').textContent = 'U kopjuan ' + t.split('\\n').length + ' domaine. Ngjiti te Google Ads > Placements > Websites.'; });
  };
  var origj = window.ndryshoTab;
  window.ndryshoTab = function (c) {
    if (typeof origj === 'function') origj(c);
    var a = c === 'adsense'; tab.className = a ? 'tab aktiv' : 'tab'; p.className = a ? 'sec-panel aktiv' : 'sec-panel';
    if (a) { ngarko(); ndiq(); }
  };
})();`;
};
