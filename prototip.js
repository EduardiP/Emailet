// SEKSIONI "Faqja publike" (prototip): Sinjalet + Dergimi i email-eve, si do te shfaqet ne phronexusai.com.
// I ndare plotesisht nga pjesa tjeter. Te gjitha ndryshimet per kete seksion behen VETEM ne:
//   prototip.js     (ky skedar: rruget dhe tab-i ne header)
//   prototip-px.js  (vete seksioni: dizajni, tekstet, sjellja; ky kalon me vone te phronexusai.com)
// Ne server.js ka vetem dy rreshta:  require('./prototip')(app);   dhe   <script src="/prototip-tab.js"></script>
const path = require('path');

const TAB_JS = `(function () {
  var tabs = document.querySelector('.tabs'), wrap = document.querySelector('.wrap');
  if (!tabs || !wrap || document.getElementById('tabFaqjaPublike')) { return; }

  var tab = document.createElement('div');
  tab.className = 'tab'; tab.id = 'tabFaqjaPublike'; tab.textContent = 'Faqja publike';
  tab.onclick = function () { window.ndryshoTab('faqjapublike'); };
  tabs.appendChild(tab);

  var panel = document.createElement('div');
  panel.className = 'sec-panel'; panel.id = 'panelFaqjaPublike';
  panel.innerHTML = '<p class="mut">Prototipi i seksionit publik per phronexusai.com (te dhena shembull, nuk dergon asgje). ' +
    'Gjuha: <a href="#" data-gj="en">English</a> · <a href="#" data-gj="sq">Shqip</a> · <a href="/prototip" target="_blank">hape ne faqe te plote</a></p>' +
    '<div style="background:#f3f4f8;padding:16px;border-radius:12px;"><px-sinjale-email lang="en"></px-sinjale-email></div>';
  wrap.appendChild(panel);

  panel.querySelectorAll('[data-gj]').forEach(function (a) {
    a.onclick = function (ev) { ev.preventDefault(); panel.querySelector('px-sinjale-email').setAttribute('lang', a.getAttribute('data-gj')); };
  });

  var ngarkuar = false;
  function ngarkoKomponentin() {
    if (ngarkuar) { return; } ngarkuar = true;
    var s = document.createElement('script'); s.src = '/prototip-px.js'; document.head.appendChild(s);
  }

  var origjinali = window.ndryshoTab;
  window.ndryshoTab = function (cila) {
    if (typeof origjinali === 'function') { origjinali(cila); }
    var aktiv = cila === 'faqjapublike';
    tab.className = aktiv ? 'tab aktiv' : 'tab';
    panel.className = aktiv ? 'sec-panel aktiv' : 'sec-panel';
    if (aktiv) { ngarkoKomponentin(); }
  };
})();`;

module.exports = function (app) {
  app.get('/prototip-px.js', (req, res) => {
    res.type('application/javascript').sendFile(path.join(__dirname, 'prototip-px.js'));
  });

  app.get('/prototip-tab.js', (req, res) => {
    res.type('application/javascript').send(TAB_JS);
  });

  // Faqe e plote me vetem kete seksion: /prototip  ose  /prototip?lang=sq
  app.get('/prototip', (req, res) => {
    const lang = req.query.lang === 'sq' ? 'sq' : 'en';
    res.type('html').send(`<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Faqja publike · prototip</title>
<style>
  body{margin:0;background:#f3f4f8;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  .faqja{max-width:1200px;margin:0 auto;padding:32px 16px}
  .gjuha{display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px;font-size:14px}
  .gjuha a{color:#4f46e5}
</style></head>
<body><div class="faqja">
  <div class="gjuha"><a href="?lang=en">English</a> · <a href="?lang=sq">Shqip</a></div>
  <px-sinjale-email lang="${lang}"></px-sinjale-email>
</div>
<script src="/prototip-px.js"></script>
</body></html>`);
  });
};
