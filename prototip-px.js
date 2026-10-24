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
 * Majtas: Dergimi i email-eve. Djathtas: Sinjalet. Siper: header i perbashket ("100% free").
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
      shigjetaMajtas: 'Show signals in full width',
      shigjetaDjathtas: 'Show sending in full width',
      kokaTeksti: '100% free',
      sEyebrow: 'Free · no sign-up',
      sPerKe: 'For B2B and B2C businesses',
      sNjeKerkim: 'Free: one search per domain, posts from the last 5 months.',
      sHyr: 'Sign in to get the latest interest signals for your business',
      sTitulli: 'Who is looking for what you sell',
      sNen: 'We scan public conversations on Reddit, Hacker News, Indie Hackers and more, and AI shows you the people who need your product right now.',
      sDomain: 'yourcompany.com',
      sGjej: 'Try it free: find interest signals with AI',
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
      sCdoPike: 'All (40+)',
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
      eFalas: 'Included in the free plan',
      eTitulli2: 'Send emails to businesses that could become your customers',
      eNen2: 'Write one message, pick businesses from our directory, and schedule when each email goes out.',
      eVetemB2B: 'Only for B2B',
      eVetemB2BNen: 'for businesses that sell to other businesses',
      eProvoAI: 'Try it: generate your email with AI',
      eStudio: 'Study my business with AI',
      eDomaini: 'yourcompany.com',
      eDukeStudiuar: 'AI is studying {d}…',
      eStudiuar: 'Done. AI wrote the subject and message and picked the best categories for {d}. You can still edit everything.',
      eMesazhi: 'Your email',
      eMarresit: 'Recipients',
      eTeRejat: 'Newest businesses first',
      eRekomanduar: 'Recommended for {d}',
      eTeGjithaKat: 'All categories',
      eZgjedhur: '{n} of 3 selected',
      eShtuar: 'added {n}d ago',
      eOraretTitulli: 'Schedule',
      eOraretBosh: 'Select up to 3 businesses above to schedule their emails.',
      eRregulli: 'Free try: up to 3 emails, at least 4 hours apart.',
      eDergoNga: 'Send from your mailbox',
      eDergoNgaNen: 'Sign in to Gmail or Outlook so the emails go out from your own address, and replies come back to you. "Other (SMTP)" is for any other email provider, using its server settings.',
      eDergo: 'Send',
      eLimit3: 'The free try sends up to 3 emails. Sign in to send to more businesses with professional sending.',
      eKufiri4: 'In the free try, emails must be at least 4 hours apart. Sign in for professional sending: any schedule, more emails and follow-ups.',
      eLidhFillimisht: 'Choose a mailbox to send from first.',
      eHyr: 'Sign in for unlimited use',
      ePreview: 'Preview',
      eParapamje: 'Email preview',
      eNga: 'From',
      ePer: 'To',
      ePergjigjuNe: 'Reply-to',
      eReplyVlera: 'your email (verified when you send)',
      eKompjuter: 'Desktop',
      eTelefon: 'Mobile',
      eMbyll: 'Close',
      eFooterJo: 'Not relevant? Just reply "no" and you will not hear from us again.',
      eCregjistrohu: 'Unsubscribe',
      eGabimStudim: 'Could not study this domain: {e}',
      eB2C: 'AI thinks {d} sells mainly to consumers (B2C). Email sending is only for B2B businesses. You can still use the signals on the right.',
      eShembullMarres: 'Example recipient',
      eNjeProve: 'Free: one try per domain. Your email is written by AI from your domain.',
      ePritDomainin: 'Enter your domain and study your business first: AI writes the email from it.',
    },
    sq: {
      shembull: 'Të dhëna shembull',
      shigjetaMajtas: 'Shfaq sinjalet në gjithë gjerësinë',
      shigjetaDjathtas: 'Shfaq dërgimin në gjithë gjerësinë',
      kokaTeksti: '100% falas',
      sEyebrow: 'Falas · pa regjistrim',
      sPerKe: 'Për biznese B2B dhe B2C',
      sNjeKerkim: 'Falas: një kërkim për domain, postime nga 5 muajt e fundit.',
      sHyr: 'Hyr për të marrë sinjalet më të fundit të interesit për biznesin tënd',
      sTitulli: 'Kush po kërkon atë që shet ti',
      sNen: 'Skanojmë bisedat publike në Reddit, Hacker News, Indie Hackers e të tjera, dhe AI të tregon njerëzit që kanë nevojë për produktin tënd tani.',
      sDomain: 'kompaniajote.com',
      sGjej: 'Bëj provë falas: gjej sinjale interesi me AI',
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
      sCdoPike: 'Të gjitha (40+)',
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
      eFalas: 'Përfshihet në planin falas',
      eTitulli2: 'Dërgo email-e te bizneset që mund të bëhen klientët e tu',
      eNen2: 'Shkruaj një mesazh, zgjidh bizneset nga direktoria jonë dhe cakto kur niset secili email.',
      eVetemB2B: 'Vetëm për B2B',
      eVetemB2BNen: 'për biznese që u shesin biznesesh të tjera',
      eProvoAI: 'Bëj një provë: gjenero email-in me AI',
      eStudio: 'Studio biznesin tim me AI',
      eDomaini: 'kompaniajote.com',
      eDukeStudiuar: 'AI po studion {d}…',
      eStudiuar: 'U krye. AI shkroi subjektin dhe mesazhin dhe zgjodhi kategoritë më të mira për {d}. Mund t\'i ndryshosh të gjitha.',
      eMesazhi: 'Email-i yt',
      eMarresit: 'Marrësit',
      eTeRejat: 'Bizneset më të reja në fillim',
      eRekomanduar: 'Të rekomanduara për {d}',
      eTeGjithaKat: 'Të gjitha kategoritë',
      eZgjedhur: '{n} nga 3 të zgjedhura',
      eShtuar: 'shtuar {n} ditë më parë',
      eOraretTitulli: 'Planifikimi',
      eOraretBosh: 'Zgjidh deri në 3 biznese më sipër për t\'u caktuar orën e email-it.',
      eRregulli: 'Provë falas: deri në 3 email-e, të paktën 4 orë larg njëri-tjetrit.',
      eDergoNga: 'Dërgo nga email-i yt',
      eDergoNgaNen: 'Hyr në Gmail ose Outlook që email-et të dalin nga adresa jote dhe përgjigjet të vijnë te ti. "Tjetër (SMTP)" është për çdo ofrues tjetër email-i, me të dhënat e serverit të tij.',
      eDergo: 'Dërgo',
      eLimit3: 'Prova falas dërgon deri në 3 email-e. Hyr në llogari për të dërguar te më shumë biznese me dërgim profesional.',
      eKufiri4: 'Në provën falas email-et duhet të jenë të paktën 4 orë larg njëri-tjetrit. Hyr në llogari për dërgim profesional: çdo orar, më shumë email-e dhe vazhdime.',
      eLidhFillimisht: 'Zgjidh fillimisht nga cili email do dërgosh.',
      eHyr: 'Hyr për përdorim të pakufizuar',
      ePreview: 'Parapamje',
      eParapamje: 'Parapamja e email-it',
      eNga: 'Nga',
      ePer: 'Për',
      ePergjigjuNe: 'Përgjigjet te',
      eReplyVlera: 'email-i yt (verifikohet kur dërgon)',
      eKompjuter: 'Kompjuter',
      eTelefon: 'Telefon',
      eMbyll: 'Mbyll',
      eFooterJo: 'Not relevant? Just reply "no" and you will not hear from us again.',
      eCregjistrohu: 'Unsubscribe',
      eGabimStudim: 'Domaini nuk u studiua dot: {e}',
      eB2C: 'AI mendon se {d} u shet kryesisht individëve (B2C). Dërgimi i email-eve është vetëm për biznese B2B. Sinjalet djathtas mund t\'i përdorësh.',
      eShembullMarres: 'Marrës shembull',
      eNjeProve: 'Falas: një provë për domain. Email-in e shkruan AI nga domaini yt.',
      ePritDomainin: 'Jep domainin dhe studio biznesin fillimisht: AI e shkruan email-in prej tij.',
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
  // Biznese shembull per direktorine (prototip). "dite" = sa dite me pare u shtua (me te rejat ne fillim).
  var BIZNESET = (function () {
    var emra = {
      'saas-marketing': ['Leadfox', 'Campaignly', 'Brandpulse', 'Funnelkit Pro', 'Outreachr'],
      'saas-fin': ['Invoicely', 'Ledgerbox', 'Paytrail', 'Budgetwise'],
      'saas-dev': ['Deployhub', 'Logstack', 'APIwatch', 'Codepilot'],
      'saas-ai': ['Promptly', 'Summarix', 'Visionary AI', 'Chatforge', 'Agentdesk'],
      'agency': ['Northside Digital', 'Pixel & Co', 'Growthlab']
    };
    var out = [], n = 0;
    Object.keys(emra).forEach(function (k) {
      emra[k].forEach(function (e, i) {
        var d = e.toLowerCase().replace(/[^a-z0-9]+/g, '') + (i % 2 ? '.io' : '.com');
        out.push({ id: 'b' + (n++), emri: e, domaini: d, kat: k, dite: 1 + ((i * 3 + n) % 12) });
      });
    });
    return out;
  })();

  // Shigjetat (ikona vektoriale, te mprehta ne cdo madhesi ekrani)
  var SVG_MAJTAS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
  var SVG_DJATHTAS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  var SVG_HYRJE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>';
  var VISIBLE_FALAS = 3; // sa sinjale shihen pa regjistrim

  var CSS = [
    ':host{',
    // ---- Ngjyrat dhe stili (ndryshoji ketu, ose nga jashte me --px-... ) ----
    '  --px-sfondi-sinjale:#e3e9f2; --px-sfondi-email:#eff3f8;',
    '  --px-sfondi:#ffffff; --px-siperfaqja:#f6f7fb; --px-kufiri:#e4e6ef; --px-teksti:#141625; --px-zbehur:#62667a;',
    '  --px-theks:#4f46e5; --px-theks-teksti:#ffffff; --px-theks-lehte:#eef0ff; --px-sukses:#0f9d6b; --px-paralajmerim:#c27803;',
    '  --px-rrezja:14px; --px-rrezja-vogel:9px; --px-hija:0 1px 2px rgba(20,22,37,.06),0 8px 24px rgba(20,22,37,.06);',
    '  --px-font:inherit; --px-lartesia:620px;',
    '  display:block; color:var(--px-teksti); font-family:var(--px-font); font-size:15px; line-height:1.5;',
    '}',
    '*,*::before,*::after{box-sizing:border-box}',
    'button,input,select,textarea{font:inherit;color:inherit}',
    // e gjere sa ekrani, pa kornize "tabele"; ngjyra e sfondit ndan dy seksionet
    '.px{position:relative;background:var(--px-sfondi);overflow:clip;display:flex;flex-direction:column;height:var(--px-lartesia)}',
    '.px-koka{padding:14px 24px;text-align:center;font-size:15px;font-weight:700;letter-spacing:.02em;color:var(--px-theks);background:var(--px-sfondi);border-bottom:1px solid var(--px-kufiri)}',
    '.px-pjesa-email{background:var(--px-sfondi-email)}',
    '.px-pjesa-sinjale{background:var(--px-sfondi-sinjale)}',
    '.px-korniza{display:flex;flex:1 1 auto;min-height:0}',
    '.px-pjesa{flex:0 0 calc(50% - 36px);min-width:0;overflow:hidden;container-type:inline-size;transition:flex-basis .45s cubic-bezier(.4,0,.2,1),opacity .3s ease}',
    '.px[data-gjendja="majte"] .px-pjesa-majte,.px[data-gjendja="djathte"] .px-pjesa-djathte{flex-basis:calc(100% - 72px)}',
    '.px[data-gjendja="majte"] .px-pjesa-djathte,.px[data-gjendja="djathte"] .px-pjesa-majte{flex-basis:0;opacity:0;height:0;align-self:flex-start}',
    // pjesa e zgjeruar: lartesia sa permbajtja, pa shirit levizje te brendshem; leviz faqja (shigjeta mbetet ne mes te ekranit)
    '.px:not([data-gjendja="ndare"]){height:auto}',
    '.px:not([data-gjendja="ndare"]) .px-brenda{height:auto;overflow:visible}',
    '.px:not([data-gjendja="ndare"]) .px-ndaresi{justify-content:flex-start}',
    '.px:not([data-gjendja="ndare"]) .px-shigjetat{position:sticky;top:calc(50vh - 15px);margin-top:min(35vh, 300px)}',
    '.px-brenda{padding:28px;min-width:300px;height:100%;overflow-y:auto}',
    // ndaresi me shigjeta
    // pamja:  ‹ | ›   (vija ndarese ne mes, nje shigjete ne secilen ane, ne mes te lartesise)
    '.px-ndaresi{position:relative;flex:0 0 72px;background:linear-gradient(to right,var(--px-sfondi-email) 50%,var(--px-sfondi-sinjale) 50%);display:flex;flex-direction:column;justify-content:center;align-items:center}',
    '.px-ndaresi::before{content:"";position:absolute;top:0;bottom:0;left:50%;width:1px;transform:translateX(-50%);background:var(--px-kufiri)}',
    '.px-shigjetat{position:relative;display:flex;align-items:center;gap:16px}',
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
    // email-et (versioni i ri)
    '.px-b2b{display:inline-flex;align-items:center;gap:8px;margin:2px 0 16px;padding:7px 14px;border-radius:999px;background:var(--px-theks);color:var(--px-theks-teksti);font-weight:700;font-size:14px}',
    '.px-b2b small{font-weight:500;opacity:.85;font-size:12px}',
    '.px-veprimet-siper{display:flex;gap:10px;align-items:stretch;flex-wrap:wrap;margin-bottom:12px}',
    '.px-provo{flex:1 1 240px;padding:12px 16px}',
    '.px-veprimet-siper .px-studio{flex:1 1 380px;margin:0}',
    '.px-hyrje{flex:0 1 auto;max-width:100%;white-space:normal;text-align:left;display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:11px 16px;border-radius:var(--px-rrezja-vogel);border:1px solid var(--px-teksti);background:var(--px-teksti);color:var(--px-sfondi);font-weight:600;cursor:pointer;box-shadow:0 1px 2px rgba(20,22,37,.12),0 4px 12px rgba(20,22,37,.10);transition:transform .15s,box-shadow .15s}',
    '.px-hyrje svg{width:17px;height:17px;flex:0 0 auto}',
    '.px-hyrje svg:last-child{width:15px;height:15px;opacity:.7;transition:transform .15s}',
    '.px-hyrje:hover{box-shadow:0 2px 4px rgba(20,22,37,.14),0 8px 20px rgba(20,22,37,.16)}',
    '.px-hyrje:hover svg:last-child{transform:translateX(3px)}',
    '.px-hyrje:focus-visible{outline:2px solid var(--px-theks);outline-offset:2px}',
    '.px-paralajmero .px-hyrje{padding:9px 14px}',
    '.px-studio-stat.px-keq{color:#b42318}',
    // parapamja e email-it
    '.px-modal{position:fixed;inset:0;background:rgba(15,18,30,.55);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow-y:auto;z-index:2147483000}',
    '.px-modal-kuti{background:var(--px-sfondi);border-radius:var(--px-rrezja);box-shadow:0 20px 60px rgba(0,0,0,.25);width:min(760px,100%);overflow:hidden}',
    '.px-modal-koka{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 18px;border-bottom:1px solid var(--px-kufiri);flex-wrap:wrap}',
    '.px-modal-koka h3{margin:0;font-size:16px}',
    '.px-modal-veprime{display:flex;gap:6px;align-items:center;flex-wrap:wrap}',
    '.px-modal-veprime .px-buton{padding:7px 12px;font-size:13px}',
    '.px-modal-trup{background:#f1f3f6;padding:24px 16px;display:flex;justify-content:center}',
    '.px-postieri{background:#fff;color:#202124;width:100%;max-width:640px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.12);transition:max-width .25s;font-family:Arial,Helvetica,sans-serif}',
    '.px-postieri.px-mobil{max-width:360px}',
    '.px-postieri-koka{padding:16px 20px 12px;border-bottom:1px solid #eceff3;font-size:13px;color:#5f6368;line-height:1.6}',
    '.px-postieri-koka b{color:#202124;font-weight:600}',
    '.px-postieri-subjekti{font-size:19px;color:#202124;margin:0 0 8px;font-weight:600;line-height:1.3}',
    '.px-postieri-mesazhi{padding:18px 20px 8px;font-size:15px;line-height:1.6;color:#202124}',
    '.px-postieri-mesazhi p{margin:0 0 14px}',
    '.px-postieri-firma{margin:6px 20px 0;padding:12px 0 14px;border-top:1px solid #eceff3;font-size:13px;color:#5f6368;line-height:1.5}',
    '.px-postieri-firma b{color:#202124}',
    '.px-postieri-fundi{padding:0 20px 18px;font-size:12px;color:#80868b;line-height:1.5}',
    '.px-postieri-fundi a{color:#80868b}',
    '.px-studio{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px}',
    '.px-studio .px-input{flex:1 1 220px}',
    '.px-studio-stat{font-size:13px;color:var(--px-zbehur);margin:0 0 10px}',
    '.px-studio-stat.px-ok{color:var(--px-sukses)}',
    '.px-email-rreshti{display:grid;grid-template-columns:1fr;gap:12px;align-items:start;margin-bottom:12px}',
    '.px-bizneset{display:grid;gap:6px;margin-top:10px;max-height:260px;overflow-y:auto}',
    '.px-biznes{display:flex;align-items:center;gap:10px;border:1px solid var(--px-kufiri);border-radius:8px;padding:8px 10px;background:var(--px-sfondi);cursor:pointer;font-size:14px}',
    '.px-biznes:has(input:checked){border-color:var(--px-theks);background:var(--px-theks-lehte)}',
    '.px-biznes span{flex:1;min-width:0}',
    '.px-biznes small{display:block;color:var(--px-zbehur);font-size:12px}',
    '.px-biznes em{font-style:normal;font-size:12px;color:var(--px-zbehur);white-space:nowrap}',
    '.px-numerues{font-size:13px;font-weight:600;margin-top:8px}',
    '.px-orari{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 0;border-top:1px dashed var(--px-kufiri);font-size:14px}',
    '.px-orari:first-of-type{border-top:0}',
    '.px-orari b{flex:1 1 140px}',
    '.px-orari .px-input{flex:0 1 230px}',
    '.px-orari.px-gabim .px-input{border-color:#d93a3a}',
    '.px-paralajmero{border:1px solid #f1c27d;background:#fff7e8;border-radius:var(--px-rrezja-vogel);padding:12px 14px;margin-top:10px;font-size:14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}',
    '.px-paralajmero p{margin:0;flex:1 1 240px}',
    '.px-pjesa[data-zgjeruar] .px-vetem-ngushte{display:none}',
    '.px-pjesa:not([data-zgjeruar]) .px-vetem-gjere{display:none}',
    '.px-buton:disabled{opacity:.5;cursor:not-allowed;filter:none}',
    '.px-input[readonly],.px-textarea[readonly]{background:var(--px-siperfaqja);color:var(--px-zbehur);cursor:not-allowed}',
    '.px-fusha:disabled{opacity:.5;cursor:not-allowed}',
    '@container (min-width: 760px){ .px-pjesa[data-zgjeruar] .px-email-rreshti{grid-template-columns:1fr 1fr} }',
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
      this._filtri = { burimi: '', min: 40, dite: 30 }; // shfaqen vetem rezultatet me 40+ pike nga AI
      this._lidhur = '';
      this._kategoria = ''; // '' = te gjitha kategorite (me te rejat ne fillim)
      this._vazhdime = [3, 7];
      // gjendja e seksionit te email-eve
      this._em = { domaini: '', studim: '', subjekti: null, trupi: null, rekomanduar: [], zgjedhur: [], oret: {}, njoftim: '' };
      var selfL = this;
      this._neResize = function () { selfL._lartesia(); };
      window.addEventListener('resize', this._neResize);
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
        self._lartesia();
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
      return s.pike >= 40 && (!f.burimi || s.burimi === f.burimi) && s.pike >= f.min && s.dite <= f.dite;
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
      // ---------- HEADER I PERBASHKET ----------
      '<header class="px-koka">' + esc(t('kokaTeksti')) + '</header>' +
      '<div class="px-korniza">' +

      // ---------- PJESA E MAJTE: EMAIL-ET (permbajtja ndertohet te _htmlEmail) ----------
      '<div class="px-pjesa px-pjesa-majte px-pjesa-email" id="pjesaMajte">' +
      '<div class="px-brenda" data-vendi="email">' + this._htmlEmail() + '</div></div>' +

      // ---------- NDARESI ME SHIGJETA ----------
      '<div class="px-ndaresi">' +
      '<div class="px-shigjetat">' +
      '<button class="px-shigjeta" data-shigjeta="majtas" aria-label="' + esc(t('shigjetaMajtas')) + '" title="' + esc(t('shigjetaMajtas')) + '">' + SVG_MAJTAS + '</button>' +
      '<button class="px-shigjeta" data-shigjeta="djathtas" aria-label="' + esc(t('shigjetaDjathtas')) + '" title="' + esc(t('shigjetaDjathtas')) + '">' + SVG_DJATHTAS + '</button>' +
      '</div>' +
      '</div>' +

      // ---------- PJESA E DJATHTE: SINJALET ----------
      '<div class="px-pjesa px-pjesa-djathte px-pjesa-sinjale" id="pjesaDjathte">' +
      '<div class="px-brenda">' +
      '<span class="px-eyebrow">' + esc(t('sEyebrow')) + '</span>' +
      '<h2>' + esc(t('sTitulli')) + '</h2>' +
      '<p class="px-nen">' + esc(t('sNen')) + '</p>' +
      '<div class="px-b2b">' + esc(t('sPerKe')) + '</div>' +
      '<form class="px-rresht" data-forma="sinjale">' +
      '<input class="px-input px-vetem-gjere" name="domain" type="text" inputmode="url" autocomplete="off" placeholder="' + esc(t('sDomain')) + '" value="' + esc(this._domaini) + '" aria-label="' + esc(t('sDomain')) + '">' +
      '<button class="px-buton" type="submit">✦ ' + esc(t('sGjej')) + '</button>' +
      '</form>' +
      // Prova falas: nje kerkim i vetem (sinjale te pergjithshme, 5 muajt e fundit). Sinjalet e reja cdo dite vetem pas hyrjes.
      '<p class="px-studio-stat" style="margin:6px 0 10px">' + esc(t('sNjeKerkim')) + '</p>' +
      '<button class="px-hyrje" data-e="hyr-sinjale" style="margin-bottom:4px">' + SVG_HYRJE + '<span>' + esc(t('sHyr')) + '</span>' + SVG_DJATHTAS + '</button>' +
      '<div class="px-info"><strong>' + (this._domaini ? esc(t('sRezultatetPer')) + ' ' + esc(this._domaini) : esc(t('sShembullTitulli'))) + ' <span class="px-shembull">' + esc(t('shembull')) + '</span></strong>' +
      '<span class="px-lloji"><b>B2B</b> · ' + esc(t('sLloji')) + '</span></div>' +
      '<div class="px-stat"><div><b>' + (SINJALE.length + 9) + '</b><span>' + esc(t('sStatJava')) + '</span></div>' +
      '<div><b>' + teMira + '</b><span>' + esc(t('sStatTeMira')) + '</span></div>' +
      '<div><b>' + burimet.length + '</b><span>' + esc(t('sStatBurime')) + '</span></div></div>' +
      '<div class="px-filtrat" role="group" aria-label="' + esc(t('sFiltri')) + '">' +
      '<div><label class="px-etiketa">' + esc(t('sBurimi')) + '</label><select class="px-select" data-filtri="burimi"><option value="">' + esc(t('sTeGjitha')) + '</option>' +
      burimet.map(function (b) { return '<option' + (self._filtri.burimi === b ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') + '</select></div>' +
      '<div><label class="px-etiketa">' + esc(t('sPikeMin')) + '</label><select class="px-select" data-filtri="min">' +
      [[40, t('sCdoPike')], [60, '60+'], [80, '80+']].map(function (o) { return '<option value="' + o[0] + '"' + (self._filtri.min === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>' +
      '<div><label class="px-etiketa">' + esc(t('sPeriudha')) + '</label><select class="px-select" data-filtri="dite">' +
      [[7, t('sJava')], [30, t('sMuaji')]].map(function (o) { return '<option value="' + o[0] + '"' + (self._filtri.dite === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>' +
      '</div>' +
      '<div data-vendi="sinjalet">' + this._htmlSinjalet() + '</div>' +
      '</div></div>' +

      '</div>' +
      '<div class="px-toast" role="status" aria-live="polite"></div>' +
      '</section>';

    this._lidhNgjarjet();
    this._apliko();
    this._lartesia();
  };

  // Lartesia: seksioni zen vetem pjesen e ekranit qe shihet kur hapet (nuk zgjatet poshte faqes).
  // Permbajtja qe nuk nxe leviz brenda secilës pjese.
  PxSinjaleEmail.prototype._lartesia = function () {
    var px = this._rrenja && this._rrenja.querySelector('.px'); if (!px) return;
    var rect = this.getBoundingClientRect(); if (!rect.width) return;
    var lart = rect.top + window.scrollY, vh = window.innerHeight;
    var h = lart < vh * 0.6 ? vh - lart - 24 : vh - 48;
    // 1.8 = lartesia e ekranit te dukshem + 80% me shume (kerkese e perdoruesit, sepse ishte shume e ulet)
    px.style.setProperty('--px-lartesia', Math.round(Math.max(460, h) * 1.8) + 'px');
  };

  // ---------- SEKSIONI I EMAIL-EVE ----------
  function dtLokale(d) {
    var z = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes());
  }
  var KATER_ORE = 4 * 3600 * 1000;

  // Kontrollon rregullin falas: email-et te pakten 4 ore larg njeri-tjetrit. Kthen id-te qe e shkelin.
  PxSinjaleEmail.prototype._shkeljet = function () {
    var em = this._em;
    var l = em.zgjedhur.map(function (id) { return { id: id, t: Date.parse(em.oret[id] || '') }; });
    var keq = {};
    l.forEach(function (a) { if (isNaN(a.t)) keq[a.id] = true; });
    var ok = l.filter(function (a) { return !isNaN(a.t); }).sort(function (a, b) { return a.t - b.t; });
    for (var i = 1; i < ok.length; i++) { if (ok[i].t - ok[i - 1].t < KATER_ORE) { keq[ok[i].id] = true; keq[ok[i - 1].id] = true; } }
    return keq;
  };

  PxSinjaleEmail.prototype._htmlEmail = function () {
    var t = this._t.bind(this), gj = this._gjuha(), em = this._em, self = this;
    var d = em.domaini || t('eDomaini');
    // Kusht: email-i vjen vetem nga domaini i studiuar me AI (nuk plotesohet me dore pa domain).
    var gati = em.studim === 'gati';
    var emriKat = function (v) { var k = KATEGORITE.find(function (x) { return x.v === v; }); return k ? k[gj] : v; };

    // kategorite: te rekomanduarat (pas studimit me AI) dalin te parat
    var opsion = function (v, tekst) { return '<option value="' + esc(v) + '"' + (self._kategoria === v ? ' selected' : '') + '>' + esc(tekst) + '</option>'; };
    var kat = '<select class="px-select" style="width:100%" data-e="kategoria">';
    if (em.rekomanduar.length) {
      kat += '<optgroup label="' + esc(t('eRekomanduar').replace('{d}', d)) + '">' + em.rekomanduar.map(function (v) { return opsion(v, '★ ' + emriKat(v)); }).join('') + '</optgroup>';
    }
    kat += '<optgroup label="' + esc(t('eTeGjithaKat')) + '">' + opsion('', t('eTeGjithaKat')) +
      KATEGORITE.filter(function (k) { return em.rekomanduar.indexOf(k.v) < 0; }).map(function (k) { return opsion(k.v, k[gj]); }).join('') + '</optgroup></select>';

    var lista = BIZNESET.filter(function (b) { return !self._kategoria || b.kat === self._kategoria; })
      .sort(function (a, b) { return a.dite - b.dite; });
    var bizneset = '<div class="px-bizneset">' + lista.map(function (b) {
      var po = em.zgjedhur.indexOf(b.id) >= 0;
      return '<label class="px-biznes"><input type="checkbox" data-e="biznes" value="' + b.id + '"' + (po ? ' checked' : '') + '>' +
        '<span>' + esc(b.emri) + '<small>' + esc(b.domaini) + ' · ✓ email</small></span>' +
        '<em>' + esc(t('eShtuar').replace('{n}', b.dite)) + '</em></label>';
    }).join('') + '</div>';

    var keq = this._shkeljet(), kaKeq = Object.keys(keq).length > 0;
    var oraret = em.zgjedhur.length ? em.zgjedhur.map(function (id) {
      var b = BIZNESET.find(function (x) { return x.id === id; });
      return '<div class="px-orari' + (keq[id] ? ' px-gabim' : '') + '"><b>' + esc(b.emri) + '</b>' +
        '<input class="px-input" type="datetime-local" data-e="ora" data-id="' + id + '" value="' + esc(em.oret[id] || '') + '"></div>';
    }).join('') : '<div class="px-shenim" style="margin-top:0">' + esc(t('eOraretBosh')) + '</div>';

    var paralajmero = function (tekst) {
      return '<div class="px-paralajmero" role="alert"><p>' + esc(tekst) + '</p><button class="px-hyrje" data-e="hyr">' + SVG_HYRJE + '<span>' + esc(t('eHyr')) + '</span>' + SVG_DJATHTAS + '</button></div>';
    };
    var njoftim = '';
    if (em.njoftim === 'limit') njoftim = paralajmero(t('eLimit3'));
    else if (kaKeq) njoftim = paralajmero(t('eKufiri4'));

    var stat = em.studim === 'duke' ? '<p class="px-studio-stat">' + esc(t('eDukeStudiuar').replace('{d}', d)) + '</p>' :
      (em.studim === 'gati' ? '<p class="px-studio-stat px-ok">✓ ' + esc(t('eStudiuar').replace('{d}', d)) + '</p>' :
      (em.studim === 'gabim' ? '<p class="px-studio-stat px-keq">' + esc(t('eGabimStudim').replace('{e}', em.gabim || '')) + '</p>' :
      (em.studim === 'b2c' ? '<p class="px-studio-stat px-keq">' + esc(t('eB2C').replace('{d}', d)) + '</p>' : '')));

    return '<span class="px-eyebrow">' + esc(t('eEyebrow')) + '</span> <span class="px-shembull">' + esc(t('shembull')) + '</span>' +
      '<h2>' + esc(t('eTitulli2')) + '</h2>' +
      '<p class="px-nen">' + esc(t('eNen2')) + '</p>' +
      '<div class="px-b2b">' + esc(t('eVetemB2B')) + ' <small>· ' + esc(t('eVetemB2BNen')) + '</small></div>' +
      '<div class="px-statistika px-vetem-gjere"><div><b>0</b><span>' + esc(t('eDerguar')) + '</span></div><div><b>0</b><span>' + esc(t('ePergjigje')) + '</span></div><div><b>0</b><span>' + esc(t('eCregjistruar')) + '</span></div></div>' +

      // Rreshti i siperm (vlen per mesazhin dhe per marresit):
      //  - versioni i ngushte: "Try it" + hyrja; kur klikohet "Try it", pjesa zgjerohet dhe del fusha e domainit
      //  - versioni i gjere: "Study my business" + domaini, dhe hyrja ne te njejtin rresht
      '<div class="px-veprimet-siper">' +
      '<button class="px-buton px-provo px-vetem-ngushte" data-e="provo">✦ ' + esc(t('eProvoAI')) + '</button>' +
      '<div class="px-studio px-vetem-gjere">' +
      '<button class="px-buton" data-e="studio"' + (em.studim === 'duke' ? ' disabled' : '') + '>✦ ' + esc(t('eStudio')) + '</button>' +
      '<input class="px-input" data-e="domaini" type="text" inputmode="url" autocomplete="off" placeholder="' + esc(t('eDomaini')) + '" value="' + esc(em.domaini) + '" aria-label="' + esc(t('eDomaini')) + '">' +
      '</div>' +
      '<button class="px-hyrje" data-e="hyr">' + SVG_HYRJE + '<span>' + esc(t('eHyr')) + '</span>' + SVG_DJATHTAS + '</button>' +
      '</div>' + stat +
      '<p class="px-studio-stat" style="margin:-4px 0 12px">' + esc(t('eNjeProve')) + '</p>' +

      '<div class="px-email-rreshti">' +
      // 1. Mesazhi (me studimin e biznesit me AI ne versionin e gjere)
      '<div class="px-hapi"><div class="px-hapi-koka"><span class="px-nr">1</span><h3>' + esc(t('eMesazhi')) + '</h3></div>' +
      '<label class="px-etiketa">' + esc(t('eSubjekti')) + '</label>' +
      '<input class="px-input" style="width:100%" data-e="subjekti"' + (gati ? '' : ' readonly') + ' placeholder="' + esc(t('eSubjektiVlera')) + '" value="' + esc(gati ? em.subjekti : '') + '">' +
      '<div class="px-fushat">' + esc(t('eFusha')) + ' ' + ['{company}', '{domain}', '{first_name}'].map(function (f) { return '<button class="px-fusha" data-fusha="' + f + '"' + (gati ? '' : ' disabled') + '>' + f + '</button>'; }).join('') + '</div>' +
      '<label class="px-etiketa">' + esc(t('eTrupi')) + '</label>' +
      '<textarea class="px-textarea" data-e="trupi"' + (gati ? '' : ' readonly') + ' placeholder="' + esc(t('eTrupiVlera')) + '">' + esc(gati ? em.trupi : '') + '</textarea>' +
      (gati ? '' : '<p class="px-studio-stat" style="margin:6px 0 0">' + esc(t('ePritDomainin')) + '</p>') +
      '<div class="px-vetem-gjere"><label class="px-etiketa" style="margin-top:10px">' + esc(t('eVazhdime')) + '</label>' +
      this._vazhdime.map(function (n) { return '<div class="px-vazhdim"><b>' + esc(t('eDita')) + ' ' + n + '</b><span>' + esc(t('eVazhdimiTekst')) + '</span></div>'; }).join('') +
      '<button class="px-buton px-buton-dyte" style="margin-top:8px" data-veprim="vazhdim">' + esc(t('eShtoVazhdim')) + '</button></div>' +
      '</div>' +

      // 2. Marresit: kategoria (te rekomanduarat pas studimit) dhe bizneset me te reja; zgjidhen deri ne 3
      '<div class="px-hapi"><div class="px-hapi-koka"><span class="px-nr">2</span><h3>' + esc(t('eMarresit')) + '</h3></div>' +
      '<label class="px-etiketa">' + esc(t('eKategoria')) + '</label>' + kat +
      '<div class="px-vetem-gjere" style="margin-top:8px"><label class="px-etiketa">' + esc(t('eVendi')) + '</label><select class="px-select" style="width:100%"><option>United States</option><option>United Kingdom</option><option>Germany</option><option>—</option></select></div>' +
      '<label class="px-kontroll"><input type="checkbox" checked> ' + esc(t('eVetemVerifikuar')) + '</label>' +
      '<div class="px-shenim">' + esc(t('eTeRejat')) + '</div>' +
      bizneset +
      '<div class="px-numerues">' + esc(t('eZgjedhur').replace('{n}', em.zgjedhur.length)) + '</div>' +
      '</div>' +
      '</div>' +

      // 3. Planifikimi: nje ore per cdo email, te pakten 4 ore diference
      '<div class="px-hapi" style="margin-bottom:12px"><div class="px-hapi-koka"><span class="px-nr">3</span><h3>' + esc(t('eOraretTitulli')) + '</h3></div>' +
      '<p class="px-hapi-nen">' + esc(t('eRregulli')) + '</p>' +
      oraret +
      '<label class="px-kontroll"><input type="checkbox" checked> ' + esc(t('eZonaKohore')) + '</label>' +
      '</div>' +

      // (Lidhja e email-it dergues behet vetem pas hyrjes ne llogari, ne panelin e perdoruesit.)
      njoftim +
      '<div class="px-veprimi"><button class="px-buton px-buton-dyte" data-e="preview"' + (gati ? '' : ' disabled') + '>' + esc(t('ePreview')) + '</button>' +
      '<button class="px-buton" data-e="dergo"' + (!gati || !em.zgjedhur.length || kaKeq ? ' disabled' : '') + '>' + esc(t('eDergo')) + '</button>' +
      '<span class="px-falas">✓ ' + esc(t('eFalas')) + '</span></div>' +
      '<div class="px-shenim">' + esc(t('eLigjore')) + '</div>';
  };

  // Rivizaton vetem seksionin e email-eve (pa humbur vendin ku ke levizur).
  PxSinjaleEmail.prototype._rivizatoEmail = function () {
    var b = this._rrenja.querySelector('[data-vendi="email"]'); if (!b) return;
    var sc = b.scrollTop; b.innerHTML = this._htmlEmail(); b.scrollTop = sc;
    this._lidhEmail(); this._lidhVeprimet();
  };

  // ---------- PARAPAMJA E EMAIL-IT (dizajn i lehte: duket si email i shkruar nga nje person) ----------
  // I njejti shabllon do perdoret edhe per dergimin e vertete: tekst i paster + nenshkrim + fundi me "reply no" dhe Unsubscribe.
  function emerMarke(domaini) {
    var e = String(domaini || '').split('.')[0] || '';
    return e ? e.charAt(0).toUpperCase() + e.slice(1) : 'Your company';
  }
  function zevendeso(tekst, b) {
    return String(tekst || '').replace(/\{company\}/g, b.emri).replace(/\{domain\}/g, b.domaini).replace(/\{first_name\}/g, 'there');
  }
  PxSinjaleEmail.prototype._hapParapamjen = function (nr) {
    var t = this._t.bind(this), em = this._em, self = this, r = this._rrenja;
    var marresit = em.zgjedhur.map(function (id) { return BIZNESET.find(function (x) { return x.id === id; }); }).filter(Boolean);
    var shembull = !marresit.length;
    if (shembull) {
      var lista = BIZNESET.filter(function (b) { return !self._kategoria || b.kat === self._kategoria; });
      marresit = [lista[0] || BIZNESET[0]];
    }
    nr = Math.max(0, Math.min(nr || 0, marresit.length - 1));
    var b = marresit[nr], marka = emerMarke(em.domaini);
    var subjekti = zevendeso(em.subjekti, b);
    var paragrafet = zevendeso(em.trupi, b).split(/\n\s*\n/).map(function (p) { return '<p>' + esc(p.trim()).replace(/\n/g, '<br>') + '</p>'; }).join('');
    var vjeter = r.querySelector('.px-modal'); if (vjeter) vjeter.remove();
    var m = document.createElement('div');
    m.className = 'px-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', t('eParapamje'));
    m.innerHTML =
      '<div class="px-modal-kuti">' +
      '<div class="px-modal-koka"><h3>' + esc(t('eParapamje')) + (shembull ? ' <span class="px-shembull">' + esc(t('eShembullMarres')) + '</span>' : '') + '</h3>' +
      '<div class="px-modal-veprime">' +
      (marresit.length > 1 ? '<button class="px-buton px-buton-dyte" data-p="para"' + (nr === 0 ? ' disabled' : '') + '>‹</button><span style="font-size:13px">' + (nr + 1) + ' / ' + marresit.length + '</span><button class="px-buton px-buton-dyte" data-p="pas"' + (nr === marresit.length - 1 ? ' disabled' : '') + '>›</button>' : '') +
      '<button class="px-buton px-buton-dyte" data-p="kompjuter" aria-pressed="' + !self._pvMobil + '">' + esc(t('eKompjuter')) + '</button>' +
      '<button class="px-buton px-buton-dyte" data-p="telefon" aria-pressed="' + !!self._pvMobil + '">' + esc(t('eTelefon')) + '</button>' +
      '<button class="px-buton" data-p="mbyll">' + esc(t('eMbyll')) + '</button>' +
      '</div></div>' +
      '<div class="px-modal-trup"><div class="px-postieri' + (self._pvMobil ? ' px-mobil' : '') + '">' +
      '<div class="px-postieri-koka"><div class="px-postieri-subjekti">' + esc(subjekti) + '</div>' +
      '<b>' + esc(t('eNga')) + ':</b> ' + esc(marka) + ' &lt;outreach@mail.phronexusai.com&gt;<br>' +
      '<b>' + esc(t('ePergjigjuNe')) + ':</b> ' + esc(t('eReplyVlera')) + '<br>' +
      '<b>' + esc(t('ePer')) + ':</b> ' + esc(b.emri) + ' &lt;hello@' + esc(b.domaini) + '&gt;</div>' +
      '<div class="px-postieri-mesazhi">' + paragrafet + '</div>' +
      '<div class="px-postieri-firma"><b>' + esc(marka) + '</b><br><a href="#" data-p="asgje" style="color:#1a73e8">' + esc(em.domaini || '') + '</a></div>' +
      '<div class="px-postieri-fundi">' + esc(t('eFooterJo')) + ' · <a href="#" data-p="asgje">' + esc(t('eCregjistrohu')) + '</a></div>' +
      '</div></div></div>';
    r.appendChild(m);
    var mbyll = function () { m.remove(); document.removeEventListener('keydown', esc_); var pb = r.querySelector('[data-e="preview"]'); if (pb) pb.focus(); };
    var esc_ = function (ev) { if (ev.key === 'Escape') mbyll(); };
    document.addEventListener('keydown', esc_);
    m.addEventListener('click', function (ev) {
      if (ev.target === m) { mbyll(); return; }
      var el = ev.target.closest('[data-p]'); if (!el) return;
      ev.preventDefault();
      var v = el.getAttribute('data-p');
      if (v === 'mbyll') mbyll();
      else if (v === 'para' || v === 'pas') { document.removeEventListener('keydown', esc_); self._hapParapamjen(nr + (v === 'pas' ? 1 : -1)); }
      else if (v === 'kompjuter' || v === 'telefon') { self._pvMobil = v === 'telefon'; document.removeEventListener('keydown', esc_); self._hapParapamjen(nr); }
    });
    var mb = m.querySelector('[data-p="mbyll"]'); if (mb) mb.focus();
  };

  PxSinjaleEmail.prototype._lidhEmail = function () {
    var self = this, r = this._rrenja, em = this._em;
    var q = function (s) { return r.querySelector('[data-vendi="email"] ' + s); };
    var qa = function (s) { return r.querySelectorAll('[data-vendi="email"] ' + s); };

    var provo = q('[data-e="provo"]');
    if (provo) provo.addEventListener('click', function () {
      if (!self._ePara) self._ePara = 'email';
      self._gjendja = 'majte'; self._apliko();
      setTimeout(function () { var i = q('[data-e="domaini"]'); if (i) i.focus(); }, 480);
    });

    var dom = q('[data-e="domaini"]');
    dom.addEventListener('input', function () { em.domaini = dom.value.trim(); });
    dom.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); q('[data-e="studio"]').click(); } });

    // Studimi i biznesit me AI: thirret motori (prototip.js: POST /api/px/email-ai). Adresa ndryshohet me atributin api="...".
    // Ne projektin real e thirr serveri i PhronexusAI si ndermjetes, me rregullin "nje prove per domain".
    q('[data-e="studio"]').addEventListener('click', function () {
      var d = String(dom.value || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[\/?#].*$/, '');
      if (!d) { dom.focus(); return; }
      if (!self._ePara) self._ePara = 'email';
      em.domaini = d; em.studim = 'duke'; em.gabim = ''; self._rivizatoEmail();
      var gj = self._gjuha();
      var api = (self.getAttribute('api') || '/api/px').replace(/\/$/, '');
      fetch(api + '/email-ai', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domaini: d, kategorite: KATEGORITE.map(function (k) { return { v: k.v, emri: k.en }; }) }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) {
          if (!x.ok || !x.j.ok) { em.studim = 'gabim'; em.gabim = (x.j && x.j.error) || 'error'; self._rivizatoEmail(); return; }
          var j = x.j;
          em.domaini = j.domaini || d; em.pershkrimi = j.pershkrimi; em.lloji = j.lloji; em.siguria = j.siguria;
          // B2C me siguri te larte: dergimi i email-eve nuk lejohet (vetem B2B)
          if (j.lloji === 'b2c' && j.siguria === 'high') { em.studim = 'b2c'; self._rivizatoEmail(); return; }
          em.subjekti = j.subjekti; em.trupi = j.trupi;
          em.rekomanduar = (j.kategorite || []).slice(0, 2);
          if (em.rekomanduar.length) self._kategoria = em.rekomanduar[0];
          em.studim = 'gati';
          self._rivizatoEmail();
        })
        .catch(function (e) { em.studim = 'gabim'; em.gabim = String(e && e.message || e); self._rivizatoEmail(); });
      void gj;
    });

    var subj = q('[data-e="subjekti"]'), trupi = q('[data-e="trupi"]');
    subj.addEventListener('input', function () { em.subjekti = subj.value; });
    trupi.addEventListener('input', function () { em.trupi = trupi.value; });
    qa('[data-fusha]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-fusha');
        var a = trupi.selectionStart || trupi.value.length, z = trupi.selectionEnd || a;
        trupi.value = trupi.value.slice(0, a) + v + trupi.value.slice(z);
        em.trupi = trupi.value;
        trupi.focus(); trupi.selectionStart = trupi.selectionEnd = a + v.length;
      });
    });

    var kat = q('[data-e="kategoria"]');
    kat.addEventListener('change', function () { self._kategoria = kat.value; self._rivizatoEmail(); });

    // Zgjedhja e bizneseve: maksimumi 3 ne proven falas
    qa('[data-e="biznes"]').forEach(function (c) {
      c.addEventListener('change', function () {
        var id = c.value, i = em.zgjedhur.indexOf(id);
        em.njoftim = '';
        if (c.checked) {
          if (em.zgjedhur.length >= 3) { c.checked = false; em.njoftim = 'limit'; self._rivizatoEmail(); return; }
          em.zgjedhur.push(id);
          if (!em.oret[id]) {
            // ora paresore: neser 09:00, pastaj +4 ore pas email-it te fundit
            var fundit = em.zgjedhur.slice(0, -1).map(function (x) { return Date.parse(em.oret[x] || ''); }).filter(function (x) { return !isNaN(x); });
            var dt;
            if (fundit.length) dt = new Date(Math.max.apply(null, fundit) + KATER_ORE);
            else { dt = new Date(); dt.setDate(dt.getDate() + 1); dt.setHours(9, 0, 0, 0); }
            em.oret[id] = dtLokale(dt);
          }
        } else if (i >= 0) { em.zgjedhur.splice(i, 1); }
        self._rivizatoEmail();
      });
    });

    qa('[data-e="ora"]').forEach(function (inp) {
      inp.addEventListener('change', function () { em.oret[inp.getAttribute('data-id')] = inp.value; em.njoftim = ''; self._rivizatoEmail(); });
    });

    qa('[data-e="hyr"]').forEach(function (b) {
      b.addEventListener('click', function () {
        // Ne projektin real faqja e degjon kete ngjarje dhe hap regjistrimin / hyrjen.
        self.dispatchEvent(new CustomEvent('px-veprim', { detail: { veprimi: 'hyr' }, bubbles: true, composed: true }));
        self._toast(self._t('eToast'));
      });
    });

    var pv = q('[data-e="preview"]');
    if (pv) pv.addEventListener('click', function () { self._hapParapamjen(0); });

    q('[data-e="dergo"]').addEventListener('click', function () {
      self.dispatchEvent(new CustomEvent('px-veprim', { detail: { veprimi: 'dergo', email: { subjekti: subj.value, trupi: trupi.value, marresit: em.zgjedhur.slice(), oret: em.zgjedhur.map(function (x) { return em.oret[x]; }) } }, bubbles: true, composed: true }));
      self._toast(self._t('eToast'));
    });
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
    if (g === 'majte') majte.setAttribute('data-zgjeruar', ''); else majte.removeAttribute('data-zgjeruar');
    if (g === 'djathte') djathte.setAttribute('data-zgjeruar', ''); else djathte.removeAttribute('data-zgjeruar');
    // Nese klienti filloi me dergimin e email-eve, domaini qe dha atje plotesohet edhe te kerkimi i sinjaleve.
    // (Jo anasjelltas: nje biznes B2C mund te perdore sinjalet, por jo dergimin e email-eve.)
    if (g === 'djathte' && this._ePara === 'email' && this._em && this._em.domaini) {
      var inp = r.querySelector('[data-forma="sinjale"] input[name="domain"]');
      if (inp && !inp.value) inp.value = this._em.domaini;
    }
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
        if (!self._ePara) self._ePara = self._gjendja === 'majte' ? 'email' : 'sinjale';
        self._apliko();
        var tjetri = r.querySelector('[data-shigjeta]:not([hidden])');
        if (tjetri) tjetri.focus();
      });
    });

    var forma = r.querySelector('[data-forma="sinjale"]');
    forma.addEventListener('submit', function (ev) {
      ev.preventDefault();
      // VETEM STRUKTURA: kerkimi i sinjaleve nuk eshte ndertuar ende, ndaj butoni nuk ben asnje kerkim.
      // Te dhenat dhe filtrat me poshte mbeten shembujt e njejte.
      if (!self._ePara) self._ePara = 'sinjale';
      // Ne versionin e ngushte fusha e domainit eshte e fshehur: butoni e zgjeron pjesen dhe e shfaq fushen.
      if (self._gjendja !== 'djathte') {
        self._gjendja = 'djathte'; self._apliko();
        setTimeout(function () { forma.domain.focus(); }, 480);
      }
    });
    r.querySelector('[data-e="hyr-sinjale"]').addEventListener('click', function () {
      self.dispatchEvent(new CustomEvent('px-veprim', { detail: { veprimi: 'hyr', nga: 'sinjale' }, bubbles: true, composed: true }));
      self._toast(self._t('eToast'));
    });

    r.querySelectorAll('[data-filtri]').forEach(function (s) {
      s.addEventListener('change', function () {
        var k = s.getAttribute('data-filtri');
        self._filtri[k] = k === 'burimi' ? s.value : Number(s.value);
        r.querySelector('[data-vendi="sinjalet"]').innerHTML = self._htmlSinjalet();
        self._lidhVeprimet();
      });
    });

    this._lidhEmail();
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
        if (v === 'vazhdim') { self._vazhdime.push(self._vazhdime[self._vazhdime.length - 1] + 4); self._rivizatoEmail(); }
        // Ngjarje per faqen qe e perdor komponentin (p.sh. hap dritaren e regjistrimit te projekti real).
        self.dispatchEvent(new CustomEvent('px-veprim', { detail: { veprimi: v }, bubbles: true, composed: true }));
      });
    });
  };

  window.customElements.define('px-sinjale-email', PxSinjaleEmail);
})();
