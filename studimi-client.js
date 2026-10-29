// Seksioni "Studimi" ne faqe. Krijon vete tab-in dhe panelin, keshtu server.js ka nevoje vetem per nje rresht <script>.
// Plani: PLANI-STUDIMIT.md. Te gjitha tekstet nga AI dhe nga interneti futen me textContent (asnjehere si HTML).
(function () {
  var tabs = document.querySelector('.tabs'), wrap = document.querySelector('.wrap');
  if (!tabs || !wrap || document.getElementById('tabStudimi')) { return; }

  var tab = document.createElement('div');
  tab.className = 'tab'; tab.id = 'tabStudimi'; tab.textContent = 'Studimi';
  tab.onclick = function () { window.ndryshoTab('studimi'); };
  tabs.appendChild(tab);

  var st = document.createElement('style');
  st.textContent = [
    '.stPema{flex:1 1 260px;min-width:240px;max-height:640px;overflow:auto;background:#10151f;border:1px solid #2a313c;border-radius:10px;padding:8px}',
    '.stNyja{flex:2 1 460px;min-width:300px}',
    '.stItem{padding:6px 8px;border-radius:6px;cursor:pointer;font-size:13px;line-height:1.4;border-left:2px solid #2a313c;margin:2px 0}',
    '.stItem:hover{background:#141b26}',
    '.stItem.zgjedhur{background:#1c2230;border-left-color:#3b6ef0}',
    '.stItem .mut{color:#8b949e;font-size:11px}',
    '.stSt{display:inline-block;font-size:11px;padding:1px 7px;border-radius:9px;background:#2a313c;color:#c9d1d9;margin-left:6px;white-space:nowrap}',
    '.stSt.punon{background:#1f4fb4;color:#fff}.stSt.mire{background:#1f6f43;color:#fff}.stSt.keq{background:#6e2b2b;color:#fff}.stSt.pret{background:#9a6700;color:#fff}',
    '.stKart{background:#141b26;border:1px solid #2a313c;border-radius:10px;padding:12px 14px;margin-bottom:12px}',
    '.stKart h3{margin:0 0 6px;font-size:16px}',
    '.stEt{font-size:12px;color:#8b949e;margin:10px 0 4px;font-weight:600}',
    '.stKusht{font-size:13px;margin:2px 0}',
    '.stKusht a{font-size:12px;margin-left:6px}',
    '.stOps{border-top:1px solid #2a313c;padding:10px 0}',
    '.stOps:first-child{border-top:none}',
    '.stOps.refuzuar{opacity:.5}',
    '.stOps .rr{font-size:12px;color:#c9d1d9;margin:3px 0}',
    '.stOps .rr b{color:#8b949e;font-weight:600}',
    '.stBtns{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}',
    '.stBtns button{padding:8px 14px;font-size:13px}',
    '.stGabim{font-size:12px;color:#f85149;margin:6px 0;white-space:pre-wrap}',
    '.stRreg{display:flex;gap:10px;align-items:flex-start;border-top:1px solid #2a313c;padding:8px 0;font-size:13px}',
    '.stRreg:first-child{border-top:none}'
  ].join('');
  document.head.appendChild(st);

  var panel = document.createElement('div');
  panel.className = 'sec-panel'; panel.id = 'panelStudimi';
  panel.innerHTML = [
    '<p class="mut">Makineria e kerkimit per marketing automatik. AI e ndan qellimin ne dege logjike, kerkon vete ne internet (kerkon, hap faqet dhe vendos kerkimin tjeter) ',
    'dhe i kthen rezultatet ne opsione te vleresuara sipas kushteve te tua. Asgje nuk vazhdon pa miratimin tend, dhe cdo vendim yt ruhet qe makineria te mesoje si mendon.</p>',
    '<div class="row" style="align-items:center;">',
    '<select id="stProjektet" style="flex:1;min-width:220px;"></select>',
    '<button id="stRiBtn" class="njBtnGri">Projekt i ri</button>',
    '<button id="stFshijBtn" class="njBtnGri">Fshij projektin</button>',
    '</div>',
    '<div id="stForma" class="stKart" hidden>',
    '<div class="stEt">Emri</div><input type="text" id="stEmri" placeholder="p.sh. Marketing automatik per biznese online" style="width:100%;box-sizing:border-box;">',
    '<div class="stEt">Qellimi</div><textarea id="stQellimi" rows="2">Gjej menyrat me efikase per marketing automatik dhe gjetje automatike te klienteve per biznese online (dyqane, platforma, sherbime).</textarea>',
    '<div class="stEt">Kushti kryesor (vlen per cdo dege dhe nuk fshihet)</div>',
    '<textarea id="stKushti" rows="2">Pa shkelur kushtet e perdorimit te platformave dhe ligjet e privatesise (pa scraping te ndaluar, pa te dhena private). Falas ose me kosto te ulet. I automatizueshem (API, RSS, webhook ose eksport).</textarea>',
    '<div class="stEt">Profili / kufizimet e tua (opsionale): per degen A biznesi ekzistues, per degen B aftesite, buxheti, koha, tregu</div>',
    '<textarea id="stProfili" rows="3" placeholder="p.sh. Programoj ne Node.js me ndihmen e AI, kam nje platforme ne Railway me Postgres, buxhet i vogel, tregu: global ne anglisht."></textarea>',
    '<div class="stBtns"><button id="stKrijoBtn">Krijo projektin</button><span id="stFormaStat" style="font-size:13px;color:#8b949e;align-self:center;"></span></div>',
    '</div>',
    '<div id="stInfo" style="font-size:12px;color:#8b949e;margin-bottom:10px;"></div>',
    '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;">',
    '<div id="stPema" class="stPema"></div>',
    '<div id="stNyja" class="stNyja"></div>',
    '</div>',
    '<details class="njSeksion" id="stMesimi" style="margin-top:16px;"><summary>Mesimi: rregullat qe makineria nxjerr nga vendimet e tua</summary>',
    '<p class="mut" style="margin:8px 0;">Rregullat aktive futen ne promptin e fazes se tyre per te gjitha projektet. Asnje rregull nuk perdoret pa miratimin tend.</p>',
    '<div class="stBtns"><button id="stNxirrBtn" class="njBtnGri">Nxirr rregulla nga vendimet</button><button id="stKtheBtn" class="njBtnGri">Kthehu te versioni i meparshem</button>',
    '<span id="stMesStat" style="font-size:13px;color:#8b949e;align-self:center;"></span></div>',
    '<div id="stRregullat"></div>',
    '<div class="stEt">Vendimet e fundit</div><div id="stVendimet" style="font-size:12px;color:#8b949e;"></div>',
    '</details>'
  ].join('');
  wrap.appendChild(panel);

  var $ = function (i) { return document.getElementById(i); };
  var gjendja = { projekti: null, nyjet: [], zgjedhur: null, timer: null, kufiri: 0, konfig: null };
  var PUNON = ['duke kerkuar', 'duke ndare', 'ne radhe'];
  var EMRAT = { 'rrenje': 'rrenja', 'propozuar': 'propozuar', 'ne radhe': 'ne radhe', 'duke kerkuar': 'duke kerkuar...', 'duke ndare': 'duke ndare...',
    'vleresuar': 'vleresuar', 'ndare': 'ndare', 'refuzuar': 'refuzuar', 'gabim': 'gabim' };

  function el(tag, stil, tekst, klasa) {
    var e = document.createElement(tag);
    if (stil) { e.style.cssText = stil; }
    if (tekst != null) { e.textContent = tekst; }
    if (klasa) { e.className = klasa; }
    return e;
  }
  function etiketaStatusi(s) {
    var k = PUNON.indexOf(s) >= 0 ? 'punon' : (s === 'vleresuar' || s === 'ndare' ? 'mire' : (s === 'refuzuar' || s === 'gabim' ? 'keq' : (s === 'propozuar' ? 'pret' : '')));
    return el('span', '', EMRAT[s] || s, 'stSt ' + k);
  }

  // Thirrje API me fjalekalimin opsional (STUDIMI_FJALEKALIMI). Fjalekalimi ruhet vetem ne kete shfletues.
  function fjalekalimi() { try { return localStorage.getItem('studimiFjalekalimi') || ''; } catch (e) { return ''; } }
  async function api(metoda, url, trupi) {
    var r = await fetch(url, { method: metoda, headers: { 'Content-Type': 'application/json', 'x-studimi-fjalekalimi': fjalekalimi() },
      body: trupi ? JSON.stringify(trupi) : undefined });
    var d = await r.json().catch(function () { return {}; });
    if (r.status === 401 && d.error === 'fjalekalimi') {
      var f = window.prompt('Fjalekalimi i seksionit Studimi:');
      if (f) { try { localStorage.setItem('studimiFjalekalimi', f); } catch (e) {} return api(metoda, url, trupi); }
    }
    if (!r.ok) { throw new Error(d.error || ('HTTP ' + r.status)); }
    return d;
  }
  function pyetPse(pyetja) {
    var a = window.prompt(pyetja || 'Pse? (opsionale: ndihmon makinerine te mesoje si mendon)');
    return a ? a.trim() : '';
  }

  // ---------- projektet ----------
  async function ngarkoProjektet(zgjidh) {
    var d = await api('GET', '/api/studimi/projektet');
    var s = $('stProjektet');
    s.innerHTML = '';
    if (!d.projektet.length) { s.appendChild(el('option', '', 'Nuk ka projekte: krijo nje te ri')); $('stForma').hidden = false; }
    d.projektet.forEach(function (p) {
      var o = el('option', '', p.emri + ' (' + p.kredite + ' kerkime)'); o.value = p.id; s.appendChild(o);
    });
    var id = zgjidh || (gjendja.projekti && gjendja.projekti.id) || (d.projektet[0] && d.projektet[0].id);
    if (id) { s.value = String(id); await ngarkoProjektin(id); }
    else { $('stPema').textContent = ''; $('stNyja').textContent = ''; $('stInfo').textContent = ''; }
  }
  async function ngarkoProjektin(id, ruajZgjedhjen) {
    var d = await api('GET', '/api/studimi/projekti/' + id);
    gjendja.projekti = d.projekti; gjendja.nyjet = d.nyjet; gjendja.kufiri = d.kreditePerProjekt;
    if (!ruajZgjedhjen || !d.nyjet.some(function (n) { return n.id === gjendja.zgjedhur; })) {
      gjendja.zgjedhur = d.nyjet.length ? d.nyjet[0].id : null;
    }
    var k = gjendja.konfig;
    $('stInfo').textContent = 'Kerkime te AI-se ne internet ne kete projekt: ' + d.projekti.kredite + ' / ' + d.kreditePerProjekt +
      (k ? ' · Modeli: ' + k.modeli + ' (arsyetim ' + k.arsyetimi + ') · deri ' + k.kerkimePerHap + ' kerkime per hap · thellesia maks. ' + k.thellesiaMaks +
        (!k.kaOpenAI ? ' · MUNGON OPENAI_API_KEY' : '') : '');
    vizatoPemen();
    if (gjendja.zgjedhur) { await ngarkoNyjen(gjendja.zgjedhur); }
    planifikoRifreskim();
  }

  // ---------- pema ----------
  function vizatoPemen() {
    var pema = $('stPema'); pema.innerHTML = '';
    var sipasPrindit = {};
    gjendja.nyjet.forEach(function (n) { var k = n.prindi_id || 0; (sipasPrindit[k] = sipasPrindit[k] || []).push(n); });
    function shto(prindi) {
      (sipasPrindit[prindi] || []).forEach(function (n) {
        var it = el('div', 'margin-left:' + (n.niveli * 14) + 'px', null, 'stItem' + (n.id === gjendja.zgjedhur ? ' zgjedhur' : ''));
        if (n.dega && n.niveli === 1) { it.appendChild(el('span', 'color:#4a9eff;font-weight:600;margin-right:4px', n.dega)); }
        it.appendChild(document.createTextNode(n.titulli));
        it.appendChild(etiketaStatusi(n.statusi));
        if (n.opsione) { it.appendChild(el('div', '', n.opsione + ' opsione' + (n.miratuar ? ', ' + n.miratuar + ' te miratuara' : ''), 'mut')); }
        it.onclick = function () { gjendja.zgjedhur = n.id; vizatoPemen(); ngarkoNyjen(n.id); };
        pema.appendChild(it);
        shto(n.id);
      });
    }
    shto(0);
  }

  // ---------- nyja ----------
  async function ngarkoNyjen(id) {
    try { vizatoNyjen(await api('GET', '/api/studimi/nyja/' + id)); }
    catch (e) { $('stNyja').textContent = 'Gabim: ' + e.message; }
  }
  function buton(tekst, gri, fn) {
    var b = el('button', '', tekst, gri ? 'njBtnGri' : '');
    b.onclick = async function () {
      b.disabled = true;
      try { await fn(); } catch (e) { window.alert(e.message); } finally { b.disabled = false; }
    };
    return b;
  }
  function vizatoNyjen(d) {
    var n = d.nyja, kut = $('stNyja'), punon = PUNON.indexOf(n.statusi) >= 0 || d.neProces;
    kut.innerHTML = '';
    var k = el('div', '', null, 'stKart');
    kut.appendChild(k);

    k.appendChild(el('div', 'font-size:12px;color:#8b949e;margin-bottom:4px', d.rruga.map(function (x) { return x.titulli; }).join('  ›  ')));
    var h = el('h3', '', (n.dega && n.niveli === 1 ? 'Dega ' + n.dega + ': ' : '') + n.titulli);
    h.appendChild(etiketaStatusi(n.statusi));
    k.appendChild(h);
    if (n.pyetja) { k.appendChild(el('div', 'font-size:14px;margin-bottom:4px', n.pyetja)); }
    if (n.arsyeja) { k.appendChild(el('div', 'font-size:12px;color:#8b949e', 'Pse kjo dege: ' + n.arsyeja)); }
    if (n.gabimi) { k.appendChild(el('div', '', n.gabimi, 'stGabim')); }

    // Kushtet
    k.appendChild(el('div', '', 'Kushtet', 'stEt'));
    k.appendChild(el('div', '', 'Kushti kryesor (nuk fshihet): ' + gjendja.projekti.kushti_kryesor, 'stKusht'));
    (d.kushtetTrasheguara || []).forEach(function (x) { k.appendChild(el('div', 'color:#8b949e', 'Nga niveli me lart: ' + x, 'stKusht')); });
    (n.kushtet || []).forEach(function (x, i) {
      var r = el('div', '', 'Ky nivel: ' + x, 'stKusht');
      var a = el('a', '', 'hiq'); a.href = '#';
      a.onclick = async function (ev) {
        ev.preventDefault();
        try { await api('POST', '/api/studimi/nyja/' + n.id + '/kusht', { fshij: i, arsyeja: $('stArsyeja').value }); await ngarkoNyjen(n.id); }
        catch (e) { window.alert(e.message); }
      };
      r.appendChild(a); k.appendChild(r);
    });
    var rk = el('div', 'margin-top:6px', null, 'row');
    var inK = el('input'); inK.type = 'text'; inK.placeholder = 'Shto kusht per kete nivel dhe nendeget e tij';
    rk.appendChild(inK);
    rk.appendChild(buton('Shto kusht', true, async function () {
      await api('POST', '/api/studimi/nyja/' + n.id + '/kusht', { kushti: inK.value, arsyeja: $('stArsyeja').value });
      await ngarkoNyjen(n.id);
    }));
    k.appendChild(rk);

    // Termat
    var taT = null;
    if (n.niveli > 0) {
      k.appendChild(el('div', '', 'Termat e pikenisjes (nje per rresht, maksimumi ' + (gjendja.konfig ? gjendja.konfig.maksTerma : 6) + '): AI fillon prej tyre dhe pastaj kerkon vete ate qe i duhet', 'stEt'));
      taT = el('textarea'); taT.rows = 4; taT.value = (n.termat || []).join('\n');
      k.appendChild(taT);
      if ((n.termat_perdorur || []).length) { k.appendChild(el('div', 'font-size:11px;color:#8b949e;margin-top:4px', 'Te perdorur tashme: ' + n.termat_perdorur.join(' · '))); }
    }

    // Arsyeja dhe udhezimi
    k.appendChild(el('div', '', 'Arsyeja e vendimit tend (opsionale: ruhet qe makineria te mesoje si mendon)', 'stEt'));
    var inA = el('input'); inA.type = 'text'; inA.id = 'stArsyeja'; inA.style.cssText = 'width:100%;box-sizing:border-box';
    k.appendChild(inA);
    k.appendChild(el('div', '', 'Udhezim per AI (opsional, per "Ndaj" dhe "Rikerko"): p.sh. "ndaj sipas ku ndodhet klienti" ose "kerko vetem burime me API falas"', 'stEt'));
    var inU = el('input'); inU.type = 'text'; inU.style.cssText = 'width:100%;box-sizing:border-box';
    k.appendChild(inU);

    // Butonat sipas statusit
    var btns = el('div', '', null, 'stBtns');
    k.appendChild(btns);
    var termatNdryshuar = function () {
      return taT && taT.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean).join('\n') !== (n.termat || []).join('\n');
    };
    var ruajTermatNeseDuhet = async function () {
      if (!termatNdryshuar()) { return; }
      var arsye = inA.value || pyetPse('Pse i ndryshove termat? (opsionale)');
      await api('POST', '/api/studimi/nyja/' + n.id + '/termat', { termat: taT.value.split('\n'), arsyeja: arsye });
    };
    var propozuarFemije = (d.femijet || []).filter(function (f) { return f.statusi === 'propozuar'; }).length;
    var rifresko = async function () { await ngarkoProjektin(gjendja.projekti.id, true); };

    if (punon) {
      btns.appendChild(el('span', 'font-size:13px;color:#4a9eff', n.statusi === 'duke ndare' ? 'AI po analizon dhe po ndan...' : 'AI po kerkon ne internet dhe po lexon faqet... (mund te zgjase disa minuta; rifreskohet vete)'));
    } else {
      if (n.niveli === 0 || ['vleresuar', 'ndare', 'gabim'].indexOf(n.statusi) >= 0) {
        if (n.niveli < d.thellesiaMaks && (n.niveli === 0 || n.statusi !== 'propozuar')) {
          btns.appendChild(buton(n.niveli === 0 ? 'Analizo dhe ndaj ne dege' : 'Ndaj ne nendege (AI)', n.niveli !== 0, async function () {
            await api('POST', '/api/studimi/nyja/' + n.id + '/ndaj', { udhezim: inU.value, arsyeja: inA.value }); await rifresko();
          }));
        }
      }
      if (propozuarFemije) {
        btns.appendChild(buton('Mirato dhe kerko te ' + propozuarFemije + ' nendeget e propozuara', false, async function () {
          await api('POST', '/api/studimi/nyja/' + n.id + '/mirato-nendeget', { arsyeja: inA.value }); await rifresko();
        }));
      }
      if (n.niveli > 0 && ['propozuar', 'gabim', 'refuzuar'].indexOf(n.statusi) >= 0) {
        btns.appendChild(buton('Mirato dhe kerko', false, async function () {
          await ruajTermatNeseDuhet();
          await api('POST', '/api/studimi/nyja/' + n.id + '/mirato', { arsyeja: inA.value }); await rifresko();
        }));
      }
      if (n.niveli > 0 && ['vleresuar', 'ndare', 'gabim'].indexOf(n.statusi) >= 0 && (n.termat_perdorur || []).length) {
        btns.appendChild(buton('Rikerko per me shume opsione (terma te rinj nga AI)', true, async function () {
          await api('POST', '/api/studimi/nyja/' + n.id + '/rikerko', { udhezim: inU.value, arsyeja: inA.value }); await rifresko();
        }));
      }
      if (n.niveli > 0 && ['vleresuar', 'ndare'].indexOf(n.statusi) >= 0) {
        btns.appendChild(buton('Kerko me termat e mi', true, async function () {
          if (!termatNdryshuar()) { throw new Error('Ndrysho fillimisht termat (termat e njejta nuk sjellin lidhje te reja).'); }
          await ruajTermatNeseDuhet();
          await api('POST', '/api/studimi/nyja/' + n.id + '/mirato', { arsyeja: inA.value }); await rifresko();
        }));
      }
      if (n.niveli > 0 && taT) {
        btns.appendChild(buton('Ruaj termat', true, async function () {
          if (!termatNdryshuar()) { return; }
          await ruajTermatNeseDuhet(); await ngarkoNyjen(n.id);
        }));
      }
      if (n.niveli > 0 && n.statusi !== 'refuzuar') {
        btns.appendChild(buton('Refuzo degen', true, async function () {
          var arsye = inA.value || pyetPse('Pse e refuzon kete dege? (opsionale)');
          await api('POST', '/api/studimi/nyja/' + n.id + '/refuzo', { arsyeja: arsye }); await rifresko();
        }));
      }
    }

    // Analiza, pengesat, pyetjet alternative
    if (n.permbledhja) { k.appendChild(el('div', '', n.niveli === 0 ? 'Analiza logjike' : 'Permbledhja', 'stEt')); k.appendChild(el('div', 'font-size:13px;white-space:pre-wrap', n.permbledhja)); }
    if ((n.pengesat || []).length) {
      k.appendChild(el('div', '', 'Pengesat', 'stEt'));
      n.pengesat.forEach(function (x) { k.appendChild(el('div', 'font-size:13px', '• ' + x)); });
    }
    if ((n.pyetje_alternative || []).length) {
      k.appendChild(el('div', '', 'Pyetje alternative (perdoren nga "Ndaj ne nendege")', 'stEt'));
      n.pyetje_alternative.forEach(function (x) { k.appendChild(el('div', 'font-size:13px', '• ' + x)); });
    }
    if (n.perjashtuar) { k.appendChild(el('div', '', 'Te perjashtuara (shkelin kushtet)', 'stEt')); k.appendChild(el('div', 'font-size:12px;color:#8b949e;white-space:pre-wrap', n.perjashtuar)); }

    // Opsionet
    if (d.opsionet.length) {
      var ko = el('div', '', null, 'stKart');
      ko.appendChild(el('h3', '', 'Opsionet e gjetura (' + d.opsionet.length + ')'));
      d.opsionet.forEach(function (o) { ko.appendChild(vizatoOpsionin(o, n.id)); });
      kut.appendChild(ko);
    }
  }
  function vizatoOpsionin(o, nyjaId) {
    var r = el('div', '', null, 'stOps' + (o.statusi === 'refuzuar' ? ' refuzuar' : ''));
    var kr = el('div', 'display:flex;gap:8px;align-items:center;flex-wrap:wrap');
    kr.appendChild(el('span', '', o.pike + ' pike', 'njAI ' + (o.pike >= 80 ? 'l1' : (o.pike >= 60 ? 'l2' : 'l4'))));
    kr.appendChild(el('b', 'font-size:14px', o.emri));
    if (o.statusi === 'miratuar') { kr.appendChild(el('span', '', 'miratuar', 'stSt mire')); }
    r.appendChild(kr);
    if (o.pershkrimi) { r.appendChild(el('div', 'font-size:13px;margin:4px 0', o.pershkrimi)); }
    [['Si lidhet', o.si_lidhet], ['Kostoja', o.kostoja], ['Pse keto pike', o.arsye]].forEach(function (p) {
      if (!p[1]) { return; }
      var d = el('div', '', null, 'rr'); d.appendChild(el('b', '', p[0] + ': ')); d.appendChild(document.createTextNode(p[1])); r.appendChild(d);
    });
    if ((o.burimet || []).length) {
      var b = el('div', '', null, 'rr'); b.appendChild(el('b', '', 'Burimet: '));
      o.burimet.forEach(function (u, i) {
        if (!/^https?:\/\//i.test(u)) { return; }
        var a = el('a', 'margin-right:8px', (function () { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return 'lidhja ' + (i + 1); } })());
        a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer';
        b.appendChild(a);
      });
      r.appendChild(b);
    }
    var bt = el('div', '', null, 'stBtns');
    var vendos = function (statusi, pyet) {
      return buton(statusi === 'miratuar' ? 'Mirato' : (statusi === 'refuzuar' ? 'Refuzo' : 'Rikthe'), statusi !== 'miratuar', async function () {
        var arsye = $('stArsyeja') ? $('stArsyeja').value : '';
        if (!arsye && pyet) { arsye = pyetPse(pyet); }
        await api('POST', '/api/studimi/opsioni/' + o.id + '/statusi', { statusi: statusi, arsyeja: arsye });
        await ngarkoProjektin(gjendja.projekti.id, true);
      });
    };
    if (o.statusi !== 'miratuar') { bt.appendChild(vendos('miratuar', '')); }
    if (o.statusi !== 'refuzuar') { bt.appendChild(vendos('refuzuar', o.pike >= 60 ? 'AI i dha ' + o.pike + ' pike. Pse e refuzon? (opsionale)' : '')); }
    if (o.statusi !== 'i ri') { bt.appendChild(vendos('i ri', '')); }
    r.appendChild(bt);
    return r;
  }

  // Rifreskim automatik sa kohe ka nyje qe punojne.
  function planifikoRifreskim() {
    clearTimeout(gjendja.timer);
    var kaPune = gjendja.nyjet.some(function (n) { return PUNON.indexOf(n.statusi) >= 0; });
    if (!kaPune || !panel.classList.contains('aktiv')) { return; }
    gjendja.timer = setTimeout(function () {
      if (gjendja.projekti) { ngarkoProjektin(gjendja.projekti.id, true).catch(function () {}); }
    }, 3000);
  }

  // ---------- rregullat ----------
  var FAZAT = { analiza: 'Analiza', ndarja: 'Ndarja', kerkimi: 'Kerkimi', vleresimi: 'Vleresimi' };
  async function ngarkoMesimin() {
    var d = await api('GET', '/api/studimi/rregullat');
    var kut = $('stRregullat'); kut.innerHTML = '';
    if (!d.rregullat.length) { kut.appendChild(el('div', 'font-size:13px;color:#8b949e', 'Ende nuk ka rregulla. Merr disa vendime ne peme, pastaj shtyp "Nxirr rregulla nga vendimet".')); }
    d.rregullat.forEach(function (r) {
      var rr = el('div', '', null, 'stRreg');
      var txt = el('div', 'flex:1');
      txt.appendChild(el('span', '', FAZAT[r.faza] || r.faza, 'stSt'));
      txt.appendChild(el('span', '', r.statusi, 'stSt ' + (r.statusi === 'aktiv' ? 'mire' : (r.statusi === 'propozuar' ? 'pret' : ''))));
      txt.appendChild(el('div', 'margin-top:4px', r.teksti));
      if (r.baza) { txt.appendChild(el('div', 'font-size:11px;color:#8b949e', 'Bazuar te vendimet: ' + r.baza)); }
      rr.appendChild(txt);
      var vendos = function (s, t, gri) {
        return buton(t, gri, async function () { await api('POST', '/api/studimi/rregulli/' + r.id, { statusi: s }); await ngarkoMesimin(); });
      };
      if (r.statusi !== 'aktiv') { rr.appendChild(vendos('aktiv', 'Mirato', false)); }
      if (r.statusi === 'aktiv') { rr.appendChild(vendos('joaktiv', 'Caktivizo', true)); }
      rr.appendChild(vendos('fshire', 'Fshij', true));
      kut.appendChild(rr);
    });
    var v = await api('GET', '/api/studimi/vendimet');
    var kv = $('stVendimet'); kv.innerHTML = '';
    if (!v.vendimet.length) { kv.textContent = 'Asnje vendim ende.'; }
    v.vendimet.slice(0, 20).forEach(function (x) {
      kv.appendChild(el('div', '', '#' + x.id + ' [' + x.faza + '] ' + x.veprimi.replace(/_/g, ' ') + (x.titulli ? ' · ' + x.titulli : '') +
        (x.zgjedhja ? ' · ' + x.zgjedhja.slice(0, 140) : '') + (x.arsyeja ? ' · arsyeja: ' + x.arsyeja : '')));
    });
  }

  // ---------- ngjarjet ----------
  $('stRiBtn').onclick = function () { $('stForma').hidden = !$('stForma').hidden; };
  $('stKrijoBtn').onclick = async function () {
    var b = this; b.disabled = true; $('stFormaStat').textContent = '';
    try {
      var d = await api('POST', '/api/studimi/projekti', { emri: $('stEmri').value, qellimi: $('stQellimi').value, kushti_kryesor: $('stKushti').value, profili: $('stProfili').value });
      $('stForma').hidden = true; gjendja.zgjedhur = null;
      await ngarkoProjektet(d.projekti.id);
    } catch (e) { $('stFormaStat').textContent = e.message; } finally { b.disabled = false; }
  };
  $('stProjektet').onchange = function () { if (this.value) { gjendja.zgjedhur = null; ngarkoProjektin(this.value).catch(function (e) { window.alert(e.message); }); } };
  $('stFshijBtn').onclick = async function () {
    if (!gjendja.projekti || !window.confirm('Ta fshij projektin "' + gjendja.projekti.emri + '" me gjithe pemen dhe opsionet? (Vendimet per mesimin mbeten.)')) { return; }
    try { await api('POST', '/api/studimi/projekti/' + gjendja.projekti.id + '/fshij'); gjendja.projekti = null; await ngarkoProjektet(); }
    catch (e) { window.alert(e.message); }
  };
  $('stNxirrBtn').onclick = async function () {
    var b = this; b.disabled = true; $('stMesStat').textContent = 'AI po lexon vendimet...';
    try { var d = await api('POST', '/api/studimi/rregullat/nxirr'); $('stMesStat').textContent = d.teReja + ' rregulla te reja per miratim.'; await ngarkoMesimin(); }
    catch (e) { $('stMesStat').textContent = e.message; } finally { b.disabled = false; }
  };
  $('stKtheBtn').onclick = async function () {
    try { var d = await api('POST', '/api/studimi/rregullat/kthe'); $('stMesStat').textContent = 'U rikthye versioni i meparshem (' + d.aktive + ' rregulla aktive).'; await ngarkoMesimin(); }
    catch (e) { $('stMesStat').textContent = e.message; }
  };
  $('stMesimi').addEventListener('toggle', function () { if (this.open) { ngarkoMesimin().catch(function (e) { $('stMesStat').textContent = e.message; }); } });

  var hapur = false;
  var origjinali = window.ndryshoTab;
  window.ndryshoTab = function (cila) {
    if (typeof origjinali === 'function') { origjinali(cila); }
    var aktiv = cila === 'studimi';
    tab.className = aktiv ? 'tab aktiv' : 'tab';
    panel.className = aktiv ? 'sec-panel aktiv' : 'sec-panel';
    if (aktiv) {
      (async function () {
        if (!gjendja.konfig) { gjendja.konfig = await api('GET', '/api/studimi/gjendja'); }
        if (!hapur) { hapur = true; await ngarkoProjektet(); } else if (gjendja.projekti) { await ngarkoProjektin(gjendja.projekti.id, true); }
      })().catch(function (e) { $('stInfo').textContent = 'Gabim: ' + e.message; });
    } else { clearTimeout(gjendja.timer); }
  };
})();
