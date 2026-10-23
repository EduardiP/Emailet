// PROTOTIP i seksionit publik "Sinjalet + Dergimi i email-eve". I ndare nga pjesa tjeter e projektit.
// Ne server.js shtohet vetem:  require('./prototip')(app);
// Hap ne shfletues:  /prototip   (ose /prototip?lang=sq)
const path = require('path');

module.exports = function (app) {
  app.get('/prototip-px.js', (req, res) => {
    res.type('application/javascript').sendFile(path.join(__dirname, 'prototip-px.js'));
  });

  app.get('/prototip', (req, res) => {
    const lang = req.query.lang === 'sq' ? 'sq' : 'en';
    res.type('html').send(`<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Prototip · Sinjalet + Email</title>
<style>
  body{margin:0;background:#f3f4f8;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  .faqja{max-width:1200px;margin:0 auto;padding:32px 16px}
  .gjuha{display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px;font-size:14px}
  .gjuha a{color:#4f46e5}
  /* Ketu vendosen ngjyrat e phronexusai.com, pa prekur komponentin: */
  px-sinjale-email{ /* --px-theks:#4f46e5; --px-theks-lehte:#eef0ff; */ }
</style></head>
<body><div class="faqja">
  <div class="gjuha"><a href="?lang=en">English</a> · <a href="?lang=sq">Shqip</a></div>
  <px-sinjale-email lang="${lang}"></px-sinjale-email>
</div>
<script src="/prototip-px.js"></script>
</body></html>`);
  });
};
