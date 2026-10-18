// Seksioni "Komunitete" ne faqe. Krijon vete tab-in dhe panelin, keshtu server.js ka nevoje vetem per nje rresht <script>.
(function () {
  var tabs = document.querySelector('.tabs'), wrap = document.querySelector('.wrap');
  if (!tabs || !wrap || document.getElementById('tabKomunitete')) { return; }

  var tab = document.createElement('div');
  tab.className = 'tab'; tab.id = 'tabKomunitete'; tab.textContent = 'Komunitete';
  tab.onclick = function () { window.ndryshoTab('komunitete'); };
  tabs.appendChild(tab);

  var panel = document.createElement('div');
  panel.className = 'sec-panel'; panel.id = 'panelKomunitete';
  panel.innerHTML = [
    '<p class="mut">Kerkon termat ne Hacker News (postime dhe komente) dhe ne faqet e Stack Exchange (pyetje). Te dyja jane publike dhe falas. ',
    'Postimet ruhen dhe AI i vlereson: a i ka shkruar nje individ apo nje biznes, dhe sa ia vlen te pergjigjesh (0 deri 100). ',
    'Asgje nuk i dergohet askujt: ti hap postimin dhe pergjigjesh vete.</p>',
    '<div style="font-size:13px; margin-bottom:6px;">1. Produkti (AI e perdor per vleresimin)</div>',
    '<textarea id="komProfili" rows="3" placeholder="p.sh. Mjet online qe u dergon automatikisht kujtesa klienteve te parukerive per takimet"></textarea>',
    '<div style="font-size:13px; margin:14px 0 6px;">2. Termat: nje per rresht, maksimumi 8. Fraza te shkurtra, si i shkruajne njerezit (2 deri 4 fjale jep me shume rezultate).</div>',
    '<textarea id="komTerma" rows="4" placeholder="appointment reminder app&#10;clients forget appointments&#10;alternative to calendly"></textarea>',
    '<div style="font-size:13px; margin:14px 0 6px;">3. Ku te kerkohet</div>',
    '<label class="bisChk"><input type="checkbox" id="komHN" checked> Hacker News</label>',
    '<label class="bisChk"><input type="checkbox" id="komSE" checked> Stack Exchange</label>',
    '<label class="bisChk"><input type="checkbox" id="komSETeGjitha" checked> Stack Exchange: merr te gjitha pyetjet e reja te faqeve, pa terma (AI zgjedh cilat ia vlejne)</label>',
    '<input type="text" id="komVendet" placeholder="Faqet e Stack Exchange, te ndara me presje (maks. 5), p.sh. softwarerecs, webapps, superuser" style="width:100%; box-sizing:border-box; margin:6px 0;">',
    '<div class="row"><button id="komVendetBtn" class="njBtnGri">Shfaq te gjitha faqet e Stack Exchange</button></div>',
    '<div id="komVendetLista" style="margin-bottom:10px;"></div>',
    '<div class="row" style="align-items:center;">',
    '<select id="komDite"><option value="1">24 oret e fundit</option><option value="7" selected>7 ditet e fundit</option><option value="30">30 ditet e fundit</option></select>',
    '<button id="komKerkoBtn">Kerko</button>',
    '<span id="komStat" style="font-size:13px; color:#8b949e;"></span>',
    '</div>',
    '<div id="komKuota" style="font-size:12px; color:#8b949e; margin-bottom:6px;"></div>',
    '<div id="komGabime" style="font-size:12px; color:#f85149; margin-bottom:6px;"></div>',
    '<div style="border-top:1px solid #2a313c; margin:16px 0;"></div>',
    '<div class="row" style="align-items:center;">',
    '<select id="komFStatusi"><option value="i ri">Te reja</option><option value="u pergjigj">U pergjigj</option><option value="e lashe">E lashe</option><option value="">Te gjitha</option></select>',
    '<select id="komFBurimi"><option value="">Te gjitha burimet</option><option value="hn">Hacker News</option><option value="se">Stack Exchange</option></select>',
    '<select id="komFMin"><option value="0">Cdo pike</option><option value="40">Pike 40+</option><option value="60">Pike 60+</option><option value="80">Pike 80+</option></select>',
    '<select id="komFRendi"><option value="pike">Sipas pikeve te AI</option><option value="">Me te rejat fillimisht</option></select>',
    '<label class="bisChk"><input type="checkbox" id="komFPaBiznes" checked> Fshih bizneset (sipas AI)</label>',
    '<button id="komRifreskoBtn" class="njBtnGri">Rifresko</button>',
    '<button id="komVleresoBtn" class="njBtnGri">Vlereso te pavleresuarat</button>',
    '<button id="komRivleresoBtn" class="njBtnGri">Rivlereso te gjitha</button>',
    '</div>',
    '<div id="komInfo" style="font-size:13px; color:#8b949e; margin-bottom:8px;"></div>',
    '<div id="komRez"></div>'
  ].join('');
  wrap.appendChild(panel);

  function el(id) { return document.getElementById(id); }
  function nje(tag, tekst, stil) {
    var e = document.createElement(tag);
    if (tekst !== undefined && tekst !== null) { e.textContent = tekst; }
    if (stil) { e.style.cssText = stil; }
    return e;
  }
  async function json(r) {
    var t = '';
    try { t = await r.text(); } catch (e) { return { error: 'Lidhja u nderpre. Provo serish.' }; }
    try { var d = JSON.parse(t); if (d && typeof d === 'object') { return d; } } catch (e2) { /* jo JSON */ }
    return { error: 'Serveri nuk u pergjigj si duhet (HTTP ' + r.status + '). Provo serish pas pak.' };
  }
  function post(url, trupi) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(trupi || {}) }).then(json);
  }
  function para(iso) {
    if (!iso) { return ''; }
    var t = new Date(iso).getTime();
    if (isNaN(t)) { return ''; }
    var s = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (s < 3600) { return 'para ' + Math.max(1, Math.round(s / 60)) + ' min'; }
    if (s < 86400) { return 'para ' + Math.round(s / 3600) + ' ore'; }
    return 'para ' + Math.round(s / 86400) + ' dite';
  }
  function shfaqKuoten(k, kaCeles) {
    var e = el('komKuota');
    if (k) { e.textContent = 'Stack Exchange: ' + k.mbetur + ' kerkesa te mbetura sot nga ' + k.max + (kaCeles === false ? ' (pa celes; shto STACKEXCHANGE_KEY per 10,000)' : '') + '.'; }
    else if (kaCeles === false) { e.textContent = 'Stack Exchange pa celes: 300 kerkesa ne dite. Shto STACKEXCHANGE_KEY te Railway per 10,000.'; }
  }

  var ngarkuar = false, seq = 0, kaCelesSE = null;

  async function ngarkoCilesimet() {
    if (ngarkuar) { return; }
    var d = await fetch('/api/komunitete/cilesimet').then(json).catch(function (e) { return { error: e.message }; });
    if (d.error) { el('komStat').textContent = 'Gabim: ' + d.error; return; }
    el('komProfili').value = d.profili || '';
    el('komTerma').value = (d.terma || []).join('\n');
    el('komVendet').value = (d.vendet || []).join(', ');
    el('komDite').value = String(d.dite || 7);
    kaCelesSE = !!d.ka_celes_se;
    shfaqKuoten(d.kuota, kaCelesSE);
    if (!d.ka_openai) { el('komInfo').textContent = 'OPENAI_API_KEY mungon: postimet ruhen, por nuk vleresohen.'; }
    ngarkuar = true;
  }

  async function shfaqVendet() {
    var vend = el('komVendetLista'), btn = el('komVendetBtn');
    btn.disabled = true; vend.textContent = 'Po ngarkoj faqet...';
    var d = await fetch('/api/komunitete/vendet').then(json).catch(function (e) { return { error: e.message }; });
    btn.disabled = false; vend.innerHTML = '';
    if (d.error) { vend.textContent = 'Gabim: ' + d.error; return; }
    shfaqKuoten(d.kuota, kaCelesSE);
    vend.appendChild(nje('div', 'Kliko nje faqe per ta shtuar (' + d.vendet.length + ' faqe):', 'font-size:12px; color:#8b949e; margin-bottom:6px;'));
    var kuti = nje('div', null, 'max-height:200px; overflow:auto;');
    d.vendet.forEach(function (v) {
      var c = nje('button', v.emri); c.className = 'kompChip'; c.title = v.kodi;
      c.onclick = function () {
        var lista = el('komVendet').value.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
        if (lista.indexOf(v.kodi) === -1) { lista.push(v.kodi); }
        el('komVendet').value = lista.join(', ');
      };
      kuti.appendChild(c);
    });
    vend.appendChild(kuti);
  }

  // Vlereson ne grupe (20 per thirrje) derisa te mos mbetet asnje, maks. 25 thirrje; lista rifreskohet pas cdo thirrjeje.
  async function vleresoTeGjitha() {
    var stat = el('komStat'), btn = el('komVleresoBtn'), gjithsej = 0, fillimi = Date.now();
    btn.disabled = true;
    // Kohezgjatja shfaqet cdo sekonde, qe te duket qe vleresimi po punon.
    var ora = setInterval(function () {
      stat.textContent = 'AI po vlereson postimet: ' + gjithsej + ' te vleresuara deri tani (' + Math.round((Date.now() - fillimi) / 1000) + ' s)...';
    }, 1000);
    for (var i = 0; i < 25; i++) {
      var d = await post('/api/komunitete/vlereso').catch(function (e) { return { error: e.message }; });
      if (d.error) { clearInterval(ora); stat.textContent = 'Vleresimi: ' + d.error; break; }
      if (d.duke) { clearInterval(ora); stat.textContent = 'Nje vleresim po behet tashme ne sfond. Prit pak dhe shtyp Rifresko.'; break; }
      ngarkoListen();
      gjithsej += d.vleresuar || 0;
      if (!d.vleresuar || !d.mbetur) { clearInterval(ora); stat.textContent = 'U vleresuan ' + gjithsej + ' postime.' + (d.mbetur ? ' Mbeten ' + d.mbetur + '.' : '') + (d.gabim ? ' Disa deshtuan: ' + d.gabim : ''); break; }
    }
    clearInterval(ora);
    btn.disabled = false;
    await ngarkoListen();
  }

  async function kerko() {
    var stat = el('komStat'), btn = el('komKerkoBtn');
    var terma = el('komTerma').value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
    if (!terma.length) { stat.textContent = 'Shkruaj te pakten nje term.'; return; }
    if (terma.length > 8) { stat.textContent = 'Maksimumi 8 terma per kerkim.'; return; }
    var vendet = el('komVendet').value.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    btn.disabled = true; el('komGabime').textContent = ''; stat.textContent = 'Po kerkoj (mund te marre disa sekonda)...';
    var d = await post('/api/komunitete/kerko', {
      profili: el('komProfili').value, terma: terma, vendet: vendet, dite: Number(el('komDite').value),
      hn: el('komHN').checked, se: el('komSE').checked, se_te_gjitha: el('komSETeGjitha').checked
    }).catch(function (e) { return { error: e.message }; });
    btn.disabled = false;
    if (d.error) { stat.textContent = 'Gabim: ' + d.error; return; }
    shfaqKuoten(d.kuota, kaCelesSE);
    stat.textContent = d.kerkesa + ' kerkesa | u gjeten ' + d.gjetur + ' postime (Hacker News: ' + d.hn + ', Stack Exchange: ' + d.se + ') | te reja: ' + d.te_reja + '.';
    if (d.gabime && d.gabime.length) { el('komGabime').textContent = 'Disa kerkesa deshtuan: ' + d.gabime.join(' | '); }
    el('komFStatusi').value = 'i ri';
    await ngarkoListen();
    if (d.te_reja && d.ka_openai) { await vleresoTeGjitha(); }
  }

  async function ndryshoStatusin(id, vlera) {
    var d = await post('/api/komunitete/statusi', { id: id, statusi: vlera }).catch(function (e) { return { error: e.message }; });
    if (d.error) { el('komInfo').textContent = 'Gabim: ' + d.error; return; }
    ngarkoListen();
  }

  async function ngarkoListen() {
    var nr = ++seq, info = el('komInfo');
    var url = '/api/komunitete?limit=200';
    if (el('komFStatusi').value) { url += '&statusi=' + encodeURIComponent(el('komFStatusi').value); }
    if (el('komFBurimi').value) { url += '&burimi=' + encodeURIComponent(el('komFBurimi').value); }
    if (el('komFMin').value !== '0') { url += '&min=' + encodeURIComponent(el('komFMin').value); }
    if (el('komFRendi').value) { url += '&rendit=' + encodeURIComponent(el('komFRendi').value); }
    if (el('komFPaBiznes').checked) { url += '&pa_biznes=1'; }
    var d = await fetch(url).then(json).catch(function (e) { return { error: e.message }; });
    if (nr !== seq) { return; }
    if (d.error) { info.textContent = 'Gabim: ' + d.error; return; }
    var n = d.numrat || {};
    info.textContent = 'Te reja: ' + (n['i ri'] || 0) + ' | u pergjigj: ' + (n['u pergjigj'] || 0) + ' | e lashe: ' + (n['e lashe'] || 0) +
      ' | pa vleresuar nga AI: ' + (d.pa_vleresuar || 0) + ' | shfaqen: ' + d.rows.length;
    shfaqListen(d.rows);
  }

  function shfaqListen(rows) {
    var rez = el('komRez'); rez.innerHTML = '';
    if (!rows.length) { rez.appendChild(nje('div', 'Asnje postim me kete filter.', 'font-size:13px; color:#8b949e;')); return; }
    var tbl = document.createElement('table'), thead = document.createElement('thead'), hr = document.createElement('tr');
    ['Burimi', 'Postimi', 'Autori', 'AI', 'Koha', 'Statusi'].forEach(function (t) { hr.appendChild(nje('th', t)); });
    thead.appendChild(hr); tbl.appendChild(thead);
    var tbody = document.createElement('tbody');
    rows.forEach(function (k) {
      var tr = document.createElement('tr');
      var tdB = nje('td', null, 'font-size:12px; white-space:nowrap;');
      tdB.appendChild(nje('div', k.burimi === 'hn' ? 'Hacker News' : 'Stack Exchange'));
      if (k.vendi) { tdB.appendChild(nje('div', k.vendi, 'color:#8b949e;')); }
      tr.appendChild(tdB);
      var tdP = nje('td', null, 'max-width:560px;');
      if (k.titulli) { tdP.appendChild(nje('div', k.titulli, 'font-weight:600; margin-bottom:3px; word-break:break-word;')); }
      if (k.teksti && k.teksti !== k.titulli) { tdP.appendChild(nje('div', String(k.teksti).slice(0, 500) + (k.teksti.length > 500 ? '...' : ''), 'white-space:pre-wrap; word-break:break-word; color:#c9d1d9;')); }
      if (k.url && k.url.indexOf('https://') === 0) {
        var a = nje('a', 'Hape postimin'); a.href = k.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.style.cssText = 'font-size:12px;';
        tdP.appendChild(a);
      }
      if (k.terma && k.terma.length) { tdP.appendChild(nje('div', 'Termat: ' + k.terma.join(', '), 'font-size:11px; color:#6e7681; margin-top:3px;')); }
      tr.appendChild(tdP);
      tr.appendChild(nje('td', k.autori || '', 'font-size:12px; word-break:break-all; max-width:130px;'));
      var tdA = nje('td', null, 'min-width:120px;');
      if (k.ai_at) {
        var et = nje('span', k.ai_biznes === true ? 'Biznes' : (k.ai_biznes === false ? 'Individ' : '?'));
        et.className = 'njAI ' + (k.ai_biznes === true ? 'l4' : (k.ai_pike >= 60 ? 'l1' : (k.ai_pike >= 40 ? 'l2' : 'l5')));
        tdA.appendChild(et);
        if (k.ai_pike !== null && k.ai_pike !== undefined) { tdA.appendChild(nje('div', k.ai_pike + ' / 100', 'font-size:12px; color:#8b949e;')); }
        if (k.ai_arsye) { tdA.appendChild(nje('div', k.ai_arsye, 'font-size:11px; color:#8b949e; max-width:200px; margin-top:3px;')); }
      } else { tdA.appendChild(nje('span', '-', 'color:#6e7681;')); }
      tr.appendChild(tdA);
      var tdT = nje('td', para(k.publikuar || k.gjetur_at), 'white-space:nowrap; font-size:12px;');
      tdT.title = String(k.publikuar || k.gjetur_at || '').slice(0, 16).replace('T', ' ');
      tr.appendChild(tdT);
      var tdS = document.createElement('td'), sel = document.createElement('select');
      [['i ri', 'I ri'], ['u pergjigj', 'U pergjigj'], ['e lashe', 'E lashe']].forEach(function (o) {
        var op = nje('option', o[1]); op.value = o[0]; if (o[0] === k.statusi) { op.selected = true; } sel.appendChild(op);
      });
      sel.onchange = function () { ndryshoStatusin(k.id, sel.value); };
      tdS.appendChild(sel); tr.appendChild(tdS);
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody); rez.appendChild(tbl);
  }

  el('komKerkoBtn').onclick = kerko;
  el('komVendetBtn').onclick = shfaqVendet;
  el('komRifreskoBtn').onclick = ngarkoListen;
  el('komVleresoBtn').onclick = vleresoTeGjitha;
  // Rivleresimi: per postimet "Te reja" fshin pikët e vjetra dhe i vlereson serish me pershkrimin aktual te produktit.
  el('komRivleresoBtn').onclick = async function () {
    if (!window.confirm('Te vleresohen serish te gjitha postimet "Te reja"? Pikët e vjetra zevendesohen.')) { return; }
    var d = await post('/api/komunitete/rivlereso', { profili: el('komProfili').value }).catch(function (e) { return { error: e.message }; });
    if (d.error) { el('komStat').textContent = 'Gabim: ' + d.error; return; }
    el('komStat').textContent = d.rivendosur + ' postime do te vleresohen serish...';
    await vleresoTeGjitha();
  };
  ['komFStatusi', 'komFBurimi', 'komFMin', 'komFRendi', 'komFPaBiznes'].forEach(function (id) { el(id).onchange = ngarkoListen; });

  // Lidhja me tab-et ekzistuese: funksioni i vjeter ndryshoTab fsheh/shfaq tab-et e tjera; ky shton tab-in Komunitete.
  var origjinali = window.ndryshoTab;
  window.ndryshoTab = function (cila) {
    if (typeof origjinali === 'function') { origjinali(cila); }
    var aktiv = cila === 'komunitete';
    tab.className = aktiv ? 'tab aktiv' : 'tab';
    panel.className = aktiv ? 'sec-panel aktiv' : 'sec-panel';
    if (aktiv) { ngarkoCilesimet().then(ngarkoListen); }
  };
})();
