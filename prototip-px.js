/*
 * PROTOTIP: seksioni publik "Sinjalet + Dergimi i email-eve" per phronexusai.com.
 *
 * Izolimi (qe te mos prishe asgje kur kalohet te projekti real):
 *  - Eshte nje "Web Component" me Shadow DOM: <px-sinjale-email>. CSS-ja e tij nuk prek faqen, dhe CSS-ja e faqes nuk e prek ate.
 *  - I gjithe JavaScript-i eshte brenda nje funksioni te mbyllur (IIFE). I vetmi emer global eshte elementi "px-sinjale-email".
 *  - Nuk perdor databaze, variabla mjedisi apo rruge API. Te dhenat jane shembuj (prototip).
 *
 * Ngjyrat: te gjitha jane variabla CSS (--px-...) me vlera paresore me poshte, te seksioni ":host".
 * Per t'i bere si phronexusai.com, mjafton te ndryshohen ketu, ose nga faqja:  px-sinjale-email { --px-theks: #xxxxxx; }
 *
 * Perdorimi:  <script src="/prototip-px.js"></script>  <px-sinjale-email lang="en"></px-sinjale-email>   (lang: "en" ose "sq")
 *
 * Ndarja horizontale: dy pjese te barabarta, ne mes  ‹ | ›  (vija ndarese me nje shigjete ne secilen ane).
 *  - "›" zgjeron pjesen e majte ne gjithe gjeresine (mbetet "‹" ne skajin e djathte).
 *  - "‹" zgjeron pjesen e djathte ne gjithe gjeresine (mbetet "›" ne skajin e majte).
 *  - Pas zgjerimit te pare nuk kthehet me ne ndarjen 50/50: shigjeta kalon nga njera pjese e plote te tjetra.
 *  - Permbajtja pershtatet me gjeresine (container queries): kur pjesa zgjerohet, shfaqen opsione shtese.
 */
(function () {
  'use strict';
  if (window.customElements.get('px-sinjale-email')) return;

  var TEKSTET = {
    en: {
      shembull: 'Example data',
      shigjetaMajtas: 'Show sending in full width',
      shigjetaDjathtas: 'Show signals in full width',
      sEyebrow: 'Free · no sign-up',
      sTitulli: 'Who is looking for what you sell',
      sNen: 'We scan public conversations on Reddit, Hacker News, Indie Hackers and more, and AI shows you the people who need your product right now.',
      sDomain: 'yourcompany.com',
      sGjej: 'Find signals',
      sDukeKerkuar: 'Scanning conversations…',
      sRezultatetPer: 'Results for',
      sShembullTitulli: 'Example results',
      sLloji: 'determined by AI',
      sStatJava: 'signals this week',
      sStatTeMira: 'with score 80+',
      sStatBurime: 'sources',
      sFiltri: 'Filters',
      sBurimi: 'Source',
      sTeGjitha: 'All sources',
      sPikeMin: 'Min. score',
      sCdoPike: 'Any score',
      sPeriudha: 'Period',
      sJava: 'Last 7 days',
      sMuaji: 'Last 30 days',
      sHape: 'Open post',
      sArsye: 'Why it fits',
      sTermat: 'Matched terms',
      sMbyllur: 'Sign up free to see all {n} signals and get new ones every day',
      sRegjistrohu: 'Sign up free',
      sAsnje: 'No signals match these filters.',
      eEyebrow: 'Email outreach',
      eTitulli: 'Send from your own address, on schedule',
      eNen: 'Pick businesses from our directory, write once, and let it send at the right time. Emails go out from your own mailbox.',
      eHapi1: 'Connect your email',
      eHapi1Nen: 'Emails are sent from your address, never from ours.',
      eTjeter: 'Other (SMTP)',
      eLidhur: 'Connected:',
      eHapi2: 'Choose recipients',
      eKategoria: 'Category',
      eVendi: 'Country',
      eTipi: 'Business type',
      eVetemVerifikuar: 'Only businesses with a verified email',
      eGjetur: 'businesses match',
      eHapi3: 'Write your message',
      eSubjekti: 'Subject',
      eSubjektiVlera: 'Quick idea for {company}',
      eTrupi: 'Message',
      eTrupiVlera: 'Hi {company} team,\n\nI noticed {domain} helps … and thought this could be useful for you.\n\nBest,\nYour name',
      eFusha: 'Insert field:',
      eVazhdime: 'Follow-ups',
      eDita: 'Day',
      eVazhdimiTekst: 'Short follow-up if there is no reply',
      eShtoVazhdim: '+ Add follow-up',
      eHapi4: 'Schedule',
      eData: 'Start date',
      eOra: 'Time',
      eLimiti: 'Max. per day',
      eZonaKohore: "Send in each recipient's time zone",
      ePlanifiko: 'Schedule sending',
      eToast: 'Prototype: nothing was sent.',
      eLigjore: 'One-click unsubscribe and a shared do-not-contact list are included in every email.',
      eStatistikat: 'This campaign',
      eDerguar: 'Sent',
      ePergjigje: 'Replies',
      eCregjistruar: 'Unsubscribed',
      eFalas: 'Included in the free plan'
    },
    sq: {
      shembull: 'Të dhëna shembull',
      shigjetaMajtas: 'Shfaq dërgimin në gjithë gjerësinë',
      shigjetaDjathtas: 'Shfaq sinjalet në gjithë gjerësinë',
      sEyebrow: 'Falas · pa regjistrim',
      sTitulli: 'Kush po kërkon atë që shet ti',
      sNen: 'Skanojmë bisedat publike në Reddit, Hacker News, Indie Hackers e të tjera, dhe AI të tregon njerëzit që kanë nevojë për produktin tënd tani.',
      sDomain: 'kompaniajote.com',
      sGjej: 'Gjej sinjalet',
      sDukeKerkuar: 'Po skanojmë bisedat…',
      sRezultatetPer: 'Rezultatet për',
      sShembullTitulli: 'Rezultate shembull',
      sLloji: 'vendosur nga AI',
      sStatJava: 'sinjale këtë javë',
      sStatTeMira: 'me 80+ pikë',
      sStatBurime: 'burime',
      sFiltri: 'Filtrat',
      sBurimi: 'Burimi',
      sTeGjitha: 'Të gjitha burimet',
      sPikeMin: 'Pikë min.',
      sCdoPike: 'Çdo pikë',
      sPeriudha: 'Periudha',
      sJava: '7 ditët e fundit',
      sMuaji: '30 ditët e fundit',
      sHape: 'Hape postimin',
      sArsye: 'Pse përputhet',
      sTermat: 'Termat',
      sMbyllur: 'Regjistrohu falas për të parë të {n} sinjalet dhe për të marrë të reja çdo ditë',
      sRegjistrohu: 'Regjistrohu falas',
      sAsnje: 'Asnjë sinjal me këta filtra.',
      eEyebrow: 'Dërgimi i email-eve',
      eTitulli: 'Dërgo nga adresa jote, në kohën e duhur',
      eNen: 'Zgjidh bizneset nga direktoria jonë, shkruaj një herë, dhe lëre të dërgohet në kohën e duhur. Email-et dalin nga adresa jote.',
      eHapi1: 'Lidh email-in tënd',
      eHapi1Nen: 'Email-et dërgohen nga adresa jote, kurrë nga e jona.',
      eTjeter: 'Tjetër (SMTP)',
      eLidhur: 'I lidhur:',
      eHapi2: 'Zgjidh marrësit',
      eKategoria: 'Kategoria',
      eVendi: 'Vendi',
      eTipi: 'Lloji i biznesit',
      eVetemVerifikuar: 'Vetëm biznese me email të verifikuar',
      eGjetur: 'biznese përputhen',
      eHapi3: 'Shkruaj mesazhin',
      eSubjekti: 'Subjekti',
      eSubjektiVlera: 'Një ide e shpejtë për {company}',
      eTrupi: 'Mesazhi',
      eTrupiVlera: 'Përshëndetje ekipi i {company},\n\nPashë që {domain} ndihmon… dhe mendova se kjo mund t\'ju vlejë.\n\nMe respekt,\nEmri yt',
      eFusha: 'Shto fushë:',
      eVazhdime: 'Vazhdimet',
      eDita: 'Dita',
      eVazhdimiTekst: 'Rikujtim i shkurtër nëse nuk ka përgjigje',
      eShtoVazhdim: '+ Shto vazhdim',
      eHapi4: 'Planifikimi',
      eData: 'Data e nisjes',
      eOra: 'Ora',
      eLimiti: 'Maks. në ditë',
      eZonaKohore: 'Dërgo sipas orës së çdo marrësi',
      ePlanifiko: 'Planifiko dërgimin',
      eToast: 'Prototip: nuk u dërgua asgjë.',
      eLigjore: 'Çdo email ka çregjistrim me një klik dhe listë të përbashkët "mos më kontakto".',
      eStatistikat: 'Kjo fushatë',
      eDerguar: 'Dërguar',
      ePergjigje: 'Përgjigje',
      eCregjistruar: 'Çregjistruar',
      eFalas: 'Përfshihet në planin falas'
    }
  };

  // Te dhena shembull per prototipin (jo reale).
  var SINJALE = [
    { burimi: 'Reddit', vendi: 'r/SaaS', pike: 92, dite: 1, termat: ['first users', 'cross promotion'],
      titulli: 'Launched my SaaS 3 weeks ago, 0 paying users. How did you get your first 100?',
      teksti: 'Tried posting on Product Hunt and a couple of directories, got some visits but nobody converts. Budget for ads is basically zero. Any tactics that actually worked for you?',
      arsye: { en: 'Founder with no marketing budget asking how to get first users.', sq: 'Themelues pa buxhet marketingu që pyet si të gjejë përdoruesit e parë.' } },
    { burimi: 'Indie Hackers', vendi: 'Indie Hackers', pike: 86, dite: 2, termat: ['marketing my SaaS'],
      titulli: 'Is there a way to promote my app together with other small SaaS?',
      teksti: 'Looking for something like a partner network where small products promote each other instead of everyone paying for ads separately.',
      arsye: { en: 'Explicitly looking for a cross-promotion network between small SaaS.', sq: 'Kërkon qartë një rrjet promovimi të ndërsjellë mes SaaS-eve të vogla.' } },
    { burimi: 'Hacker News', vendi: 'Ask HN', pike: 81, dite: 3, termat: ['first customers SaaS'],
      titulli: 'Ask HN: What channels brought your first B2B customers?',
      teksti: 'We are two founders with a B2B tool, decent product, but distribution is our weak point.',
      arsye: { en: 'B2B founders looking for distribution channels.', sq: 'Themelues B2B që kërkojnë kanale shpërndarjeje.' } },
    { burimi: 'Reddit', vendi: 'r/startups', pike: 74, dite: 4, termat: ['promote my startup'],
      titulli: 'Paid ads are eating our runway. Alternatives?',
      teksti: 'CAC on Google Ads is way above what we can afford at this stage.',
      arsye: { en: 'Startup looking for cheaper alternatives to paid ads.', sq: 'Startup që kërkon alternativa më të lira se reklamat me pagesë.' } },
    { burimi: 'Reddit', vendi: 'r/smallbusiness', pike: 68, dite: 5, termat: ['get more customers'],
      titulli: 'How do small software companies get noticed?',
      teksti: 'We have a niche scheduling tool and almost no visibility outside our local market.',
      arsye: { en: 'Small software company with a visibility problem.', sq: 'Kompani e vogël softueri me problem dukshmërie.' } },
    { burimi: 'Indie Hackers', vendi: 'Indie Hackers', pike: 63, dite: 9, termat: ['growth'],
      titulli: 'Month 4 update: 12 customers, growth stalled',
      teksti: 'Organic is slow, cold email got us 2 customers. Thinking about partnerships next.',
      arsye: { en: 'Growth stalled, considering partnerships.', sq: 'Rritja ka ngecur dhe po mendon për partneritete.' } },
    { burimi: 'Hacker News', vendi: 'Show HN', pike: 58, dite: 12, termat: ['launch'],
      titulli: 'Show HN: A simple invoicing tool for freelancers',
      teksti: 'Just launched, looking for feedback and first users.',
      arsye: { en: 'Fresh launch looking for first users.', sq: 'Lançim i ri që kërkon përdoruesit e parë.' } }
  ];
  var KATEGORITE = [
    { v: 'saas-marketing', en: 'SaaS · Marketing & sales', sq: 'SaaS · Marketing dhe shitje', n: 1284 },
    { v: 'saas-fin', en: 'SaaS · Finance & invoicing', sq: 'SaaS · Financa dhe faturim', n: 612 },
    { v: 'saas-dev', en: 'SaaS · Developer tools', sq: 'SaaS · Mjete për zhvillues', n: 947 },
    { v: 'saas-ai', en: 'SaaS · AI tools', sq: 'SaaS · Mjete AI', n: 1530 },
    { v: 'agency', en: 'Agencies', sq: 'Agjenci', n: 408 }
  ];
  // Shigjetat (ikona vektoriale, te mprehta ne cdo madhesi ekrani)
  var SVG_MAJTAS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
  var SVG_DJATHTAS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  var VISIBLE_FALAS = 3; // sa sinjale shihen pa regjistrim

  var CSS = [
    ':host{',
    // ---- Ngjyrat dhe stili (ndryshoji ketu, ose nga jashte me --px-... ) ----
    '  --px-sfondi:#ffffff; --px-siperfaqja:#f6f7fb; --px-kufiri:#e4e6ef; --px-teksti:#141625; --px-zbehur:#62667a;',
    '  --px-theks:#4f46e5; --px-theks-teksti:#ffffff; --px-theks-lehte:#eef0ff; --px-sukses:#0f9d6b; --px-paralajmerim:#c27803;',
    '  --px-rrezja:14px; --px-rrezja-vogel:9px; --px-hija:0 1px 2px rgba(20,22,37,.06),0 8px 24px rgba(20,22,37,.06);',
    '  --px-font:inherit; --px-lartesia:620px;',
    '  display:block; color:var(--px-teksti); font-family:var(--px-font); font-size:15px; line-height:1.5;',
    '}',
    '*,*::before,*::after{box-sizing:border-box}',
    'button,input,select,textarea{font:inherit;color:inherit}',
    '.px{position:relative;background:var(--px-sfondi);border:1px solid var(--px-kufiri);border-radius:var(--px-rrezja);box-shadow:var(--px-hija);overflow:clip}',
    '.px-korniza{display:flex;min-height:var(--px-lartesia)}',
    '.px-pjesa{flex:0 0 calc(50% - 36px);min-width:0;overflow:hidden;container-type:inline-size;transition:flex-basis .45s cubic-bezier(.4,0,.2,1),opacity .3s ease}',
    '.px[data-gjendja="majte"] .px-pjesa-majte,.px[data-gjendja="djathte"] .px-pjesa-djathte{flex-basis:calc(100% - 72px)}',
    '.px[data-gjendja="majte"] .px-pjesa-djathte,.px[data-gjendja="djathte"] .px-pjesa-majte{flex-basis:0;opacity:0}',
    '.px-brenda{padding:28px;min-width:300px;height:100%;overflow-y:auto}',
    // ndaresi me shigjeta
    // pamja:  ‹ | ›   (vija ndarese ne mes, nje shigjete ne secilen ane; mbeten ne mes te ekranit kur faqja leviz)
    '.px-ndaresi{position:relative;flex:0 0 72px;display:flex;flex-direction:column;justify-content:flex-start;align-items:center}',
    '.px-ndaresi::before{content:"";position:absolute;top:0;bottom:0;left:50%;width:1px;transform:translateX(-50%);background:var(--px-kufiri)}',
    '.px-shigjetat{position:sticky;top:calc(50vh - 15px);margin-top:calc(var(--px-lartesia) / 2 - 15px);display:flex;align-items:center;gap:16px}',
    '.px-shigjeta{width:30px;height:30px;padding:0;border-radius:50%;border:1px solid var(--px-kufiri);background:var(--px-sfondi);color:var(--px-zbehur);cursor:pointer;display:grid;place-items:center;box-shadow:0 1px 2px rgba(20,22,37,.08),0 2px 8px rgba(20,22,37,.06);transition:color .15s,border-color .15s,box-shadow .15s,transform .15s}',
    '.px-shigjeta svg{width:16px;height:16px;display:block}',
    '.px-shigjeta:hover{color:var(--px-theks);border-color:var(--px-theks);box-shadow:0 0 0 3px var(--px-theks-lehte)}',
    '.px-shigjeta:active{transform:scale(.94)}',
    '.px-shigjeta:focus-visible{outline:2px solid var(--px-theks);outline-offset:2px}',
    '.px-shigjeta[hidden]{display:grid;visibility:hidden}',
    // tipografia
    '.px-eyebrow{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--px-theks);background:var(--px-theks-lehte);padding:4px 10px;border-radius:999px}',
    'h2{font-size:24px;line-height:1.25;margin:12px 0 6px;letter-spacing:-.01em}',
    '.px-nen{color:var(--px-zbehur);margin:0 0 18px;max-width:60ch}',
    '.px-shembull{font-size:11px;color:var(--px-zbehur);border:1px dashed var(--px-kufiri);border-radius:999px;padding:2px 8px;margin-left:6px;text-transform:none;letter-spacing:0;font-weight:500;background:transparent}',
    // forma
    '.px-rresht{display:flex;gap:8px;flex-wrap:wrap}',
    '.px-input,.px-select,.px-textarea{background:var(--px-sfondi);border:1px solid var(--px-kufiri);border-radius:var(--px-rrezja-vogel);padding:10px 12px;min-width:0}',
    '.px-input:focus,.px-select:focus,.px-textarea:focus{outline:none;border-color:var(--px-theks);box-shadow:0 0 0 3px var(--px-theks-lehte)}',
    '.px-input{flex:1 1 200px}',
    '.px-textarea{width:100%;min-height:120px;resize:vertical}',
    '.px-buton{background:var(--px-theks);color:var(--px-theks-teksti);border:0;border-radius:var(--px-rrezja-vogel);padding:10px 16px;font-weight:600;cursor:pointer;transition:filter .15s}',
    '.px-buton:hover{filter:brightness(1.08)}',
    '.px-buton:focus-visible{outline:2px solid var(--px-theks);outline-offset:2px}',
    '.px-buton-dyte{background:var(--px-sfondi);color:var(--px-teksti);border:1px solid var(--px-kufiri)}',
    '.px-buton-dyte:hover{border-color:var(--px-theks);filter:none}',
    '.px-buton-dyte[aria-pressed="true"]{border-color:var(--px-theks);background:var(--px-theks-lehte)}',
    'label.px-etiketa{display:block;font-size:12px;font-weight:600;color:var(--px-zbehur);margin:0 0 4px}',
    '.px-kontroll{display:flex;align-items:center;gap:8px;font-size:14px;margin-top:10px}',
    // sinjalet
    '.px-info{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin:18px 0 10px}',
    '.px-info strong{font-size:14px}',
    '.px-lloji{font-size:12px;border:1px solid var(--px-kufiri);border-radius:999px;padding:3px 10px;color:var(--px-zbehur)}',
    '.px-lloji b{color:var(--px-teksti)}',
    '.px-stat{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}',
    '.px-stat div{background:var(--px-siperfaqja);border-radius:var(--px-rrezja-vogel);padding:10px 12px}',
    '.px-stat b{display:block;font-size:20px;line-height:1.1}',
    '.px-stat span{font-size:12px;color:var(--px-zbehur)}',
    '.px-filtrat{display:none;gap:8px;margin-bottom:12px;flex-wrap:wrap}',
    '.px-filtrat > div{flex:1 1 150px}',
    '.px-filtrat .px-select{width:100%}',
    '.px-lista{display:grid;gap:10px}',
    '.px-karta{border:1px solid var(--px-kufiri);border-radius:var(--px-rrezja-vogel);padding:14px;background:var(--px-sfondi)}',
    '.px-karta-koka{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;color:var(--px-zbehur);margin-bottom:6px}',
    '.px-pike{font-weight:700;font-size:12px;border-radius:999px;padding:2px 9px;white-space:nowrap}',
    '.px-pike-larte{background:#e7f7f0;color:var(--px-sukses)}',
    '.px-pike-mesme{background:#fff4e0;color:var(--px-paralajmerim)}',
    '.px-pike-ulet{background:var(--px-siperfaqja);color:var(--px-zbehur)}',
    '.px-karta h3{font-size:15px;line-height:1.35;margin:0 0 6px}',
    '.px-karta p{margin:0 0 8px;color:var(--px-zbehur);font-size:14px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
    '.px-arsye{font-size:13px;background:var(--px-theks-lehte);border-radius:8px;padding:6px 10px;margin-bottom:8px}',
    '.px-termat{display:none;gap:6px;flex-wrap:wrap;margin-bottom:8px}',
    '.px-termat span{font-size:12px;border:1px solid var(--px-kufiri);border-radius:999px;padding:1px 8px;color:var(--px-zbehur)}',
    '.px-lidhje{font-size:13px;font-weight:600;color:var(--px-theks);text-decoration:none}',
    '.px-lidhje:hover{text-decoration:underline}',
    '.px-mbyllur{position:relative}',
    '.px-mbyllur .px-lista{filter:blur(5px);pointer-events:none;user-select:none}',
    '.px-mbyllur-cta{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:16px;background:linear-gradient(to bottom,rgba(255,255,255,0),var(--px-sfondi) 40%)}',
    '.px-mbyllur-cta p{margin:0;font-weight:600;max-width:42ch}',
    '.px-bosh{color:var(--px-zbehur);font-size:14px;padding:12px 0}',
    '.px-ngarkim{color:var(--px-zbehur);font-size:14px;padding:16px 0}',
    // email-et
    '.px-hapat{display:grid;gap:12px}',
    '.px-hapi{border:1px solid var(--px-kufiri);border-radius:var(--px-rrezja-vogel);padding:16px;background:var(--px-sfondi)}',
    '.px-hapi-koka{display:flex;align-items:center;gap:10px;margin-bottom:10px}',
    '.px-nr{width:24px;height:24px;border-radius:50%;background:var(--px-theks);color:var(--px-theks-teksti);display:grid;place-items:center;font-size:12px;font-weight:700;flex:0 0 auto}',
    '.px-hapi-koka h3{margin:0;font-size:15px}',
    '.px-hapi-nen{font-size:13px;color:var(--px-zbehur);margin:-4px 0 10px 34px}',
    '.px-lidhur{font-size:13px;color:var(--px-sukses);margin-top:8px}',
    '.px-numri{font-size:13px;margin-top:10px}',
    '.px-numri b{font-size:18px}',
    '.px-fushat{display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:12px;color:var(--px-zbehur);margin:8px 0}',
    '.px-fusha{border:1px dashed var(--px-kufiri);background:var(--px-siperfaqja);border-radius:6px;padding:2px 8px;cursor:pointer;font-size:12px}',
    '.px-fusha:hover{border-color:var(--px-theks)}',
    '.px-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.px-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}',
    '.px-grid-2 .px-input,.px-grid-3 .px-input,.px-grid-2 .px-select,.px-grid-3 .px-select{width:100%}',
    '.px-zgjeruar{display:none}',
    '.px-vazhdim{display:flex;gap:8px;align-items:center;font-size:13px;border-top:1px dashed var(--px-kufiri);padding-top:8px;margin-top:8px}',
    '.px-vazhdim b{white-space:nowrap}',
    '.px-veprimi{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:14px}',
    '.px-shenim{font-size:12px;color:var(--px-zbehur);margin-top:10px}',
    '.px-falas{font-size:12px;color:var(--px-sukses);font-weight:600}',
    '.px-toast{position:absolute;left:50%;bottom:18px;transform:translateX(-50%) translateY(10px);background:var(--px-teksti);color:var(--px-sfondi);padding:10px 16px;border-radius:999px;font-size:14px;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s}',
    '.px-toast.px-shfaq{opacity:1;transform:translateX(-50%) translateY(0)}',
    '.px-statistika{display:none;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}',
    '.px-statistika div{background:var(--px-siperfaqja);border-radius:var(--px-rrezja-vogel);padding:10px 12px}',
    '.px-statistika b{display:block;font-size:20px}',
    '.px-statistika span{font-size:12px;color:var(--px-zbehur)}',
    // pershtatja me gjeresine e pjeses (opsionet shtese kur zgjerohet)
    '@container (min-width: 700px){',
    '  .px-filtrat{display:flex}',
    '  .px-termat{display:flex}',
    '  .px-karta p{-webkit-line-clamp:4}',
    '  .px-zgjeruar{display:block}',
    '  .px-statistika{display:grid}',
    '  .px-brenda{padding:32px 40px}',
    '}',
    '@container (min-width: 980px){',
    '  .px-lista{grid-template-columns:1fr 1fr}',
    '  .px-hapat{grid-template-columns:1fr 1fr}',
    '  .px-hapi-gjere{grid-column:1 / -1}',
    '}',
    '@container (max-width: 420px){',
    '  .px-stat{grid-template-columns:1fr 1fr}',
    '  .px-grid-3{grid-template-columns:1fr 1fr}',
    '  .px-brenda{padding:20px}',
    '}',
    '@media (prefers-reduced-motion: reduce){.px-pjesa,.px-shigjeta,.px-toast{transition:none}}'
  ].join('\n');

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  function PxSinjaleEmail() { return Reflect.construct(HTMLElement, [], PxSinjaleEmail); }
  PxSinjaleEmail.prototype = Object.create(HTMLElement.prototype);
  PxSinjaleEmail.prototype.constructor = PxSinjaleEmail;
  Object.setPrototypeOf(PxSinjaleEmail, HTMLElement);
  PxSinjaleEmail.observedAttributes = ['lang'];

  PxSinjaleEmail.prototype.connectedCallback = function () {
    if (!this._rrenja) {
      this._rrenja = this.attachShadow({ mode: 'open' });
      this._gjendja = 'ndare';          // 'ndare' | 'majte' | 'djathte'
      this._domaini = '';
      this._filtri = { burimi: '', min: 0, dite: 30 };
      this._lidhur = '';
      this._kategoria = KATEGORITE[0].v;
      this._vazhdime = [3, 7];
    }
    // Ne ekrane te ngushta (telefon) 50/50 eshte shume ngushte: fillon me pjesen e majte te plote.
    var gj0 = this.getBoundingClientRect().width;
    if (gj0 > 0 && gj0 < 640 && this._gjendja === 'ndare') this._gjendja = 'majte';
    this._vizato();
    var self = this;
    if (window.ResizeObserver && !this._ro) {
      this._ro = new ResizeObserver(function (h) {
        var w = h[0].contentRect.width;
        if (w > 0 && w < 640 && self._gjendja === 'ndare') { self._gjendja = 'majte'; self._apliko(); }
      });
      this._ro.observe(this);
    }
  };
  PxSinjaleEmail.prototype.disconnectedCallback = function () { if (this._ro) { this._ro.disconnect(); this._ro = null; } };
  PxSinjaleEmail.prototype.attributeChangedCallback = function () { if (this._rrenja) this._vizato(); };

  PxSinjaleEmail.prototype._t = function (k) {
    var g = (this.getAttribute('lang') || 'en').toLowerCase().slice(0, 2);
    return (TEKSTET[g] || TEKSTET.en)[k];
  };
  PxSinjaleEmail.prototype._gjuha = function () { return (this.getAttribute('lang') || 'en').toLowerCase().slice(0, 2) === 'sq' ? 'sq' : 'en'; };

  PxSinjaleEmail.prototype._htmlSinjalet = function () {
    var t = this._t.bind(this), f = this._filtri, gj = this._gjuha();
    var lista = SINJALE.filter(function (s) {
      return (!f.burimi || s.burimi === f.burimi) && s.pike >= f.min && s.dite <= f.dite;
    }).sort(function (a, b) { return b.pike - a.pike; });
    var burimet = Array.from(new Set(SINJALE.map(function (s) { return s.burimi; })));
    var karta = function (s) {
      var klasa = s.pike >= 80 ? 'px-pike-larte' : (s.pike >= 60 ? 'px-pike-mesme' : 'px-pike-ulet');
      return '<article class="px-karta">' +
        '<div class="px-karta-koka"><span>' + esc(s.burimi) + ' · ' + esc(s.vendi) + ' · ' + s.dite + 'd</span><span class="px-pike ' + klasa + '">' + s.pike + '/100</span></div>' +
        '<h3>' + esc(s.titulli) + '</h3><p>' + esc(s.teksti) + '</p>' +
        '<div class="px-arsye"><b>' + esc(t('sArsye')) + ':</b> ' + esc(s.arsye[gj]) + '</div>' +
        '<div class="px-termat">' + s.termat.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>' +
        '<a class="px-lidhje" href="#" data-veprim="hape">' + esc(t('sHape')) + ' →</a>' +
        '</article>';
    };
    var html = '';
    if (!lista.length) return '<div class="px-bosh">' + esc(t('sAsnje')) + '</div>';
    html += '<div class="px-lista">' + lista.slice(0, VISIBLE_FALAS).map(karta).join('') + '</div>';
    if (lista.length > VISIBLE_FALAS) {
      html += '<div class="px-mbyllur" style="margin-top:10px"><div class="px-lista" aria-hidden="true">' + lista.slice(VISIBLE_FALAS, VISIBLE_FALAS + 2).map(karta).join('') + '</div>' +
        '<div class="px-mbyllur-cta"><p>' + esc(t('sMbyllur').replace('{n}', String(lista.length + 9))) + '</p>' +
        '<button class="px-buton" data-veprim="regjistrohu">' + esc(t('sRegjistrohu')) + '</button></div></div>';
    }
    void burimet;
    return html;
  };

  PxSinjaleEmail.prototype._vizato = function () {
    var t = this._t.bind(this), gj = this._gjuha(), self = this;
    var burimet = Array.from(new Set(SINJALE.map(function (s) { return s.burimi; })));
    var kat = KATEGORITE.find(function (k) { return k.v === self._kategoria; }) || KATEGORITE[0];
    var sot = new Date(); sot.setDate(sot.getDate() + 1);
    var dataNeser = sot.toISOString().slice(0, 10);
    var teMira = SINJALE.filter(function (s) { return s.pike >= 80; }).length;

    this._rrenja.innerHTML =
      '<style>' + CSS + '</style>' +
      '<section class="px" data-gjendja="' + this._gjendja + '">' +
      '<div class="px-korniza">' +

      // ---------- PJESA E MAJTE: SINJALET ----------
      '<div class="px-pjesa px-pjesa-majte" id="pjesaMajte">' +
      '<div class="px-brenda">' +
      '<span class="px-eyebrow">' + esc(t('sEyebrow')) + '</span>' +
      '<h2>' + esc(t('sTitulli')) + '</h2>' +
      '<p class="px-nen">' + esc(t('sNen')) + '</p>' +
      '<form class="px-rresht" data-forma="sinjale">' +
      '<input class="px-input" name="domain" type="text" inputmode="url" autocomplete="off" placeholder="' + esc(t('sDomain')) + '" value="' + esc(this._domaini) + '" aria-label="' + esc(t('sDomain')) + '">' +
      '<button class="px-buton" type="submit">' + esc(t('sGjej')) + '</button>' +
      '</form>' +
      '<div class="px-info"><strong>' + (this._domaini ? esc(t('sRezultatetPer')) + ' ' + esc(this._domaini) : esc(t('sShembullTitulli'))) + ' <span class="px-shembull">' + esc(t('shembull')) + '</span></strong>' +
      '<span class="px-lloji"><b>B2B</b> · ' + esc(t('sLloji')) + '</span></div>' +
      '<div class="px-stat"><div><b>' + (SINJALE.length + 9) + '</b><span>' + esc(t('sStatJava')) + '</span></div>' +
      '<div><b>' + teMira + '</b><span>' + esc(t('sStatTeMira')) + '</span></div>' +
      '<div><b>' + burimet.length + '</b><span>' + esc(t('sStatBurime')) + '</span></div></div>' +
      '<div class="px-filtrat" role="group" aria-label="' + esc(t('sFiltri')) + '">' +
      '<div><label class="px-etiketa">' + esc(t('sBurimi')) + '</label><select class="px-select" data-filtri="burimi"><option value="">' + esc(t('sTeGjitha')) + '</option>' +
      burimet.map(function (b) { return '<option' + (self._filtri.burimi === b ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') + '</select></div>' +
      '<div><label class="px-etiketa">' + esc(t('sPikeMin')) + '</label><select class="px-select" data-filtri="min">' +
      [[0, t('sCdoPike')], [60, '60+'], [80, '80+']].map(function (o) { return '<option value="' + o[0] + '"' + (self._filtri.min === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>' +
      '<div><label class="px-etiketa">' + esc(t('sPeriudha')) + '</label><select class="px-select" data-filtri="dite">' +
      [[7, t('sJava')], [30, t('sMuaji')]].map(function (o) { return '<option value="' + o[0] + '"' + (self._filtri.dite === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>' +
      '</div>' +
      '<div data-vendi="sinjalet">' + this._htmlSinjalet() + '</div>' +
      '</div></div>' +

      // ---------- NDARESI ME SHIGJETA ----------
      '<div class="px-ndaresi">' +
      '<div class="px-shigjetat">' +
      '<button class="px-shigjeta" data-shigjeta="majtas" aria-label="' + esc(t('shigjetaMajtas')) + '" title="' + esc(t('shigjetaMajtas')) + '">' + SVG_MAJTAS + '</button>' +
      '<button class="px-shigjeta" data-shigjeta="djathtas" aria-label="' + esc(t('shigjetaDjathtas')) + '" title="' + esc(t('shigjetaDjathtas')) + '">' + SVG_DJATHTAS + '</button>' +
      '</div>' +
      '</div>' +

      // ---------- PJESA E DJATHTE: EMAIL-ET ----------
      '<div class="px-pjesa px-pjesa-djathte" id="pjesaDjathte">' +
      '<div class="px-brenda">' +
      '<span class="px-eyebrow">' + esc(t('eEyebrow')) + '</span> <span class="px-shembull">' + esc(t('shembull')) + '</span>' +
      '<h2>' + esc(t('eTitulli')) + '</h2>' +
      '<p class="px-nen">' + esc(t('eNen')) + '</p>' +
      '<div class="px-statistika"><div><b>0</b><span>' + esc(t('eDerguar')) + '</span></div><div><b>0</b><span>' + esc(t('ePergjigje')) + '</span></div><div><b>0</b><span>' + esc(t('eCregjistruar')) + '</span></div></div>' +
      '<div class="px-hapat">' +

      '<div class="px-hapi"><div class="px-hapi-koka"><span class="px-nr">1</span><h3>' + esc(t('eHapi1')) + '</h3></div>' +
      '<p class="px-hapi-nen">' + esc(t('eHapi1Nen')) + '</p>' +
      '<div class="px-rresht">' +
      ['Gmail', 'Outlook', t('eTjeter')].map(function (x) { return '<button class="px-buton px-buton-dyte" data-lidh="' + esc(x) + '" aria-pressed="' + (self._lidhur === x) + '">' + esc(x) + '</button>'; }).join('') +
      '</div>' + (this._lidhur ? '<div class="px-lidhur">✓ ' + esc(t('eLidhur')) + ' you@yourcompany.com (' + esc(this._lidhur) + ')</div>' : '') +
      '</div>' +

      '<div class="px-hapi"><div class="px-hapi-koka"><span class="px-nr">2</span><h3>' + esc(t('eHapi2')) + '</h3></div>' +
      '<label class="px-etiketa">' + esc(t('eKategoria')) + '</label>' +
      '<select class="px-select" style="width:100%" data-kategoria>' + KATEGORITE.map(function (k) { return '<option value="' + k.v + '"' + (k.v === self._kategoria ? ' selected' : '') + '>' + esc(k[gj]) + '</option>'; }).join('') + '</select>' +
      '<div class="px-zgjeruar" style="margin-top:8px"><div class="px-grid-2">' +
      '<div><label class="px-etiketa">' + esc(t('eVendi')) + '</label><select class="px-select"><option>United States</option><option>United Kingdom</option><option>Germany</option><option>—</option></select></div>' +
      '<div><label class="px-etiketa">' + esc(t('eTipi')) + '</label><select class="px-select"><option>B2B</option><option>B2C</option><option>B2B + B2C</option></select></div>' +
      '</div></div>' +
      '<label class="px-kontroll"><input type="checkbox" checked> ' + esc(t('eVetemVerifikuar')) + '</label>' +
      '<div class="px-numri">≈ <b>' + kat.n.toLocaleString(gj === 'sq' ? 'sq-AL' : 'en-US') + '</b> ' + esc(t('eGjetur')) + '</div>' +
      '</div>' +

      '<div class="px-hapi px-hapi-gjere"><div class="px-hapi-koka"><span class="px-nr">3</span><h3>' + esc(t('eHapi3')) + '</h3></div>' +
      '<label class="px-etiketa">' + esc(t('eSubjekti')) + '</label>' +
      '<input class="px-input" style="width:100%" data-mesazhi="subjekti" value="' + esc(t('eSubjektiVlera')) + '">' +
      '<div class="px-fushat">' + esc(t('eFusha')) + ' <button class="px-fusha" data-fusha="{company}">{company}</button><button class="px-fusha" data-fusha="{domain}">{domain}</button><button class="px-fusha" data-fusha="{first_name}">{first_name}</button></div>' +
      '<label class="px-etiketa">' + esc(t('eTrupi')) + '</label>' +
      '<textarea class="px-textarea" data-mesazhi="trupi">' + esc(t('eTrupiVlera')) + '</textarea>' +
      '<div class="px-zgjeruar"><label class="px-etiketa" style="margin-top:10px">' + esc(t('eVazhdime')) + '</label>' +
      this._vazhdime.map(function (d) { return '<div class="px-vazhdim"><b>' + esc(t('eDita')) + ' ' + d + '</b><span>' + esc(t('eVazhdimiTekst')) + '</span></div>'; }).join('') +
      '<button class="px-buton px-buton-dyte" style="margin-top:8px" data-veprim="vazhdim">' + esc(t('eShtoVazhdim')) + '</button></div>' +
      '</div>' +

      '<div class="px-hapi px-hapi-gjere"><div class="px-hapi-koka"><span class="px-nr">4</span><h3>' + esc(t('eHapi4')) + '</h3></div>' +
      '<div class="px-grid-3">' +
      '<div><label class="px-etiketa">' + esc(t('eData')) + '</label><input class="px-input" type="date" value="' + dataNeser + '"></div>' +
      '<div><label class="px-etiketa">' + esc(t('eOra')) + '</label><input class="px-input" type="time" value="09:30"></div>' +
      '<div><label class="px-etiketa">' + esc(t('eLimiti')) + '</label><input class="px-input" type="number" min="1" max="500" value="40"></div>' +
      '</div>' +
      '<label class="px-kontroll"><input type="checkbox" checked> ' + esc(t('eZonaKohore')) + '</label>' +
      '<div class="px-veprimi"><button class="px-buton" data-veprim="planifiko">' + esc(t('ePlanifiko')) + '</button><span class="px-falas">✓ ' + esc(t('eFalas')) + '</span></div>' +
      '<div class="px-shenim">' + esc(t('eLigjore')) + '</div>' +
      '</div>' +

      '</div></div></div>' +

      '</div>' +
      '<div class="px-toast" role="status" aria-live="polite"></div>' +
      '</section>';

    this._lidhNgjarjet();
    this._apliko();
  };

  // Vendos gjendjen e ndarjes: cilat pjese shihen, cilat shigjeta, dhe "inert" per pjesen e fshehur.
  PxSinjaleEmail.prototype._apliko = function () {
    var r = this._rrenja, g = this._gjendja;
    var px = r.querySelector('.px'); if (!px) return;
    px.setAttribute('data-gjendja', g);
    var majte = r.getElementById('pjesaMajte'), djathte = r.getElementById('pjesaDjathte');
    var btnD = r.querySelector('[data-shigjeta="djathtas"]'), btnM = r.querySelector('[data-shigjeta="majtas"]');
    btnD.hidden = g === 'majte';   // kur e majta eshte e plote, mbetet vetem "‹"
    btnM.hidden = g === 'djathte'; // kur e djathta eshte e plote, mbetet vetem "›"
    var fshih = function (el, po) { if (po) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); } else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); } };
    fshih(majte, g === 'djathte');
    fshih(djathte, g === 'majte');
  };

  PxSinjaleEmail.prototype._toast = function (tekst) {
    var el = this._rrenja.querySelector('.px-toast');
    el.textContent = tekst; el.classList.add('px-shfaq');
    clearTimeout(this._toastOra);
    this._toastOra = setTimeout(function () { el.classList.remove('px-shfaq'); }, 2600);
  };

  PxSinjaleEmail.prototype._lidhNgjarjet = function () {
    var self = this, r = this._rrenja;

    // Shigjetat: "›" zgjeron te majten, "‹" zgjeron te djathten; pas zgjerimit kalohet nga njera te tjetra, pa u kthyer ne 50/50.
    r.querySelectorAll('[data-shigjeta]').forEach(function (b) {
      b.addEventListener('click', function () {
        self._gjendja = b.getAttribute('data-shigjeta') === 'djathtas' ? 'majte' : 'djathte';
        self._apliko();
        var tjetri = r.querySelector('[data-shigjeta]:not([hidden])');
        if (tjetri) tjetri.focus();
      });
    });

    var forma = r.querySelector('[data-forma="sinjale"]');
    forma.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var d = String(forma.domain.value || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      var vendi = r.querySelector('[data-vendi="sinjalet"]');
      vendi.innerHTML = '<div class="px-ngarkim">' + esc(self._t('sDukeKerkuar')) + '</div>';
      setTimeout(function () { self._domaini = d; self._vizato(); }, 900); // prototip: rezultatet jane shembuj
    });

    r.querySelectorAll('[data-filtri]').forEach(function (s) {
      s.addEventListener('change', function () {
        var k = s.getAttribute('data-filtri');
        self._filtri[k] = k === 'burimi' ? s.value : Number(s.value);
        r.querySelector('[data-vendi="sinjalet"]').innerHTML = self._htmlSinjalet();
        self._lidhVeprimet();
      });
    });

    r.querySelectorAll('[data-lidh]').forEach(function (b) {
      b.addEventListener('click', function () { self._lidhur = b.getAttribute('data-lidh'); self._vizato(); });
    });
    var kat = r.querySelector('[data-kategoria]');
    kat.addEventListener('change', function () { self._kategoria = kat.value; self._vizato(); });

    r.querySelectorAll('[data-fusha]').forEach(function (b) {
      b.addEventListener('click', function () {
        var ta = r.querySelector('[data-mesazhi="trupi"]'), v = b.getAttribute('data-fusha');
        var a = ta.selectionStart || ta.value.length, z = ta.selectionEnd || a;
        ta.value = ta.value.slice(0, a) + v + ta.value.slice(z);
        ta.focus(); ta.selectionStart = ta.selectionEnd = a + v.length;
      });
    });
    this._lidhVeprimet();
  };

  PxSinjaleEmail.prototype._lidhVeprimet = function () {
    var self = this, r = this._rrenja;
    r.querySelectorAll('[data-veprim]').forEach(function (el) {
      if (el._lidhur) return; el._lidhur = true;
      el.addEventListener('click', function (ev) {
        ev.preventDefault();
        var v = el.getAttribute('data-veprim');
        if (v === 'planifiko' || v === 'hape' || v === 'regjistrohu') self._toast(self._t('eToast'));
        if (v === 'vazhdim') { self._vazhdime.push(self._vazhdime[self._vazhdime.length - 1] + 4); self._vizato(); }
        // Ngjarje per faqen qe e perdor komponentin (p.sh. hap dritaren e regjistrimit te projekti real).
        self.dispatchEvent(new CustomEvent('px-veprim', { detail: { veprimi: v }, bubbles: true, composed: true }));
      });
    });
  };

  window.customElements.define('px-sinjale-email', PxSinjaleEmail);
})();
