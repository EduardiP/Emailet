# Seksioni publik "Sinjalet + Dërgimi i email-eve": përshkrim udhëzues

Ky dokument përshkruan:
- **pjesën para hyrjes në llogari** (prova falas në faqen publike të phronexusai.com): seksionet 1–6;
- **rregullat e sinjaleve pas hyrjes** (seksioni 7): vetëm logjika e kërkimit, sepse varet nga prova falas.
  Paneli dhe dizajni pas hyrjes do të bëhen në një projekt ose bisedë tjetër.

Gjendja: **prototip / vetëm strukturë**. Asgjë nuk lidhet me databazën, asgjë nuk dërgohet, asnjë kërkim nuk bëhet.
Të dhënat që shihen (sinjale, biznese, numra) janë shembuj të shkruar në kod.
Pjesët që shënohen **[PËR T'U NDËRTUAR]** bëhen në projektin real.

Ky dokument ka përparësi mbi `PLANI-KERKIMI.md` (seksioni 5) aty ku ndryshojnë.

---

## 1. Skedarët dhe izolimi

| Skedari | Çfarë ka | Shkon te phronexusai.com? |
|---|---|---|
| `prototip-px.js` | Vetë seksioni: dizajni, tekstet (EN/SQ), sjellja, të dhënat shembull | Po (pa të dhënat shembull) |
| `prototip.js` | Tab-i "Faqja publike" në header dhe rrugët `/prototip`, `/prototip-px.js`, `/prototip-tab.js` | Jo, vetëm për provë këtu |
| `server.js` | Vetëm 2 rreshta: `require('./prototip')(app);` dhe `<script src="/prototip-tab.js"></script>` | Jo |

- Seksioni është një element i vetëm `<px-sinjale-email lang="en|sq">` me Shadow DOM: CSS-ja e tij nuk prek faqen dhe e kundërta.
- I gjithë JS-i është brenda një IIFE. I vetmi emër global është `px-sinjale-email`, dhe para regjistrimit kontrollohet që nuk ekziston.
- Ngjyrat janë variabla CSS (`--px-theks`, `--px-sfondi-email`, `--px-sfondi-sinjale` …) dhe ndryshohen në një vend, ose nga faqja: `px-sinjale-email { --px-theks: #xxxxxx; }`.
- Seksioni i njofton faqen me ngjarjen `px-veprim` (`detail.veprimi` = `hyr`, `dergo`, `regjistrohu`, `hape` …). Projekti real e dëgjon, p.sh. për të hapur hyrjen.

**Ku ndërtohet logjika (propozim):** "motori" (kërkimi, AI, direktoria e bizneseve, tabela e provave, dërgimi) në projektin e email-eve,
ku ekzistojnë tashmë `komunitete.js` dhe gjetja e email-eve. Te phronexusai.com shkojnë vetëm `prototip-px.js`, hyrja në llogari
dhe një ndërmjetës në server që e thërret motorin me një çelës sekret (çelësat e Serper/OpenAI nuk dalin kurrë në shfletues).
Nëse motori nuk përgjigjet, seksioni shfaq "Try again in a few minutes", jo gabim.

## 2. Pamja

- Zë **gjithë gjerësinë** e ekranit, me rreth 24px distancë nga skajet, pa kornizë "tabele".
- **Header i përbashkët** sipër: "100% free".
- Dy pjesë horizontale të barabarta:
  - **majtas: Dërgimi i email-eve**, sfond gri-blu i hapur (`--px-sfondi-email`);
  - **djathtas: Sinjalet**, sfond gri-blu pak më i errët (`--px-sfondi-sinjale`).
- Në mes: **‹ | ›** (vija ndarëse me një shigjetë në secilën anë).
  - `›` e hap të majtën në gjithë gjerësinë (mbetet vetëm `‹`); `‹` e hap të djathtën (mbetet vetëm `›`).
  - Pas zgjerimit të parë nuk kthehet më në 50/50: shigjeta kalon nga njëra pjesë e plotë te tjetra.
- **Lartësia:**
  - në 50/50: sa pjesa e ekranit që shihet kur hapet seksioni × 1.8, me lëvizje brenda secilës pjesë;
  - kur një pjesë është e zgjeruar: pa shirit lëvizjeje të brendshëm, zgjatet sa përmbajtja dhe lëviz faqja; shigjeta mbetet në mes të ekranit.
- Në telefon fillon me një pjesë të plotë (50/50 do ishte shumë ngushtë).
- **Versioni i ngushtë** (50/50) tregon vetëm bazën; **versioni i gjerë** (pjesa e zgjeruar) shfaq opsione shtesë.

## 3. Dërgimi i email-eve (majtas), vetëm B2B

Rendi nga lart poshtë:

1. Titulli "Send emails to businesses that could become your customers" dhe shenja e dukshme **"Only for B2B"**.
2. Statistikat (Sent / Replies / Unsubscribed), vetëm në versionin e gjerë.
3. Rreshti i sipërm (vlen për mesazhin dhe për marrësit):
   - **i ngushtë:** "✦ Try it: generate your email with AI" + "Sign in for unlimited use";
     klikimi i të parit e zgjeron pjesën dhe vendos kursorin te domaini;
   - **i gjerë:** "✦ Study my business with AI" + fusha e domainit + "Sign in for unlimited use".
   - Shënim: "Free: one try per domain. Your email is written by AI from your domain."
4. **Kushti i domainit:** subjekti dhe mesazhi janë **të kyçur** (nuk shkruhen me dorë) derisa klienti të japë domainin dhe ta studiojë me AI.
   Pas studimit AI i plotëson dhe klienti mund t'i ndryshojë. "Send" nuk aktivizohet pa këtë hap.
5. Dy blloqe, njëri poshtë tjetrit në versionin e ngushtë dhe paralel në të gjerin:
   - **1. Your email:** subjekti, fushat `{company}` `{domain}` `{first_name}`, mesazhi; vazhdimet (follow-ups) vetëm në versionin e gjerë.
   - **2. Recipients:**
     - kategoria (pas studimit, kategoritë e rekomanduara dalin të parat me ★);
     - vendi, vetëm në versionin e gjerë;
     - "Only businesses with a verified email";
     - lista e bizneseve, **më të rejat në fillim**;
     - zgjidhen **maksimumi 3**; i katërti nxjerr njoftimin e hyrjes.
6. **3. Schedule:** një orë për çdo email të zgjedhur, e plotësuar vetë (nesër 09:00, pastaj +4 orë).
   Nëse dy email-e janë më afër se **4 orë**, oraret dalin me të kuq, "Send" çaktivizohet dhe del njoftimi
   "Sign in for professional sending" me butonin e hyrjes.
7. Butoni **Send**, "Included in the free plan" dhe shënimi ligjor (çregjistrim me një klik, listë "mos më kontakto").

Nuk ka Gmail / Outlook / SMTP para hyrjes: lidhja e email-it dërgues bëhet vetëm pas login.

## 4. Sinjalet (djathtas), për B2B dhe B2C: pamja

1. Titulli "Who is looking for what you sell" dhe shenja **"For B2B and B2C businesses"**.
2. **I ngushtë:** fusha e domainit është e fshehur; butoni "✦ Try it free: find interest signals with AI" e zgjeron pjesën dhe e shfaq fushën.
   **I gjerë:** fusha dhe butoni në një rresht.
3. Shënim: "Free: one search per domain, posts from the last 5 months."
4. Butoni "Sign in to get the latest interest signals for your business".
5. Rezultatet dhe filtrat (burimi, pikët, periudha). **Shfaqen vetëm rezultatet me 40+ pikë** nga AI;
   filtri i pikëve ka "All (40+)", "60+", "80+". Në prototip butoni nuk bën kërkim.
6. **Domaini kalon nga email-et te sinjalet:** nëse klienti filloi me dërgimin e email-eve, domaini që dha atje plotësohet vetë te sinjalet.
   Jo anasjelltas, sepse një biznes B2C mund të përdorë sinjalet, por jo dërgimin e email-eve.

## 5. Sinjalet PARA hyrjes: logjika e kërkimit [PËR T'U NDËRTUAR]

### 5.1 Analiza e domainit (një herë)
1. Lexohet faqja kryesore e domainit (lexuesi i sigurt nga SSRF te `komunitete.js`).
2. AI (gpt-5-nano) kthen:
   - **përshkrimin** e produktit;
   - **llojin:** `b2b` | `b2c` | `te-dyja`, plus **sigurinë** (e lartë / e ulët) dhe arsyen.
     Kur siguria është e ulët, klientit i del konfirmim me një klik ("We think your customers are businesses (B2B). Correct?").
     "Të dyja" trajtohet si B2B. [Propozim, pret miratim.]
   - **7 terma**, të renditur nga më i miri te më i dobëti.
3. **Termat nuk ndryshohen me dorë nga klienti**, as para as pas hyrjes.

### 5.2 Kërkimi falas për B2B (një herë për domain)
| Burimi | Si | Kosto |
|---|---|---|
| Reddit (Serper) | termi 1 veç, termi 2 veç: 2 kërkesa, faqja 1, 5 muajt e fundit | 2 kredite |
| Indie Hackers (Serper, `site:indiehackers.com`) | termi 1 OR termi 2: 1 kërkesë, faqja 1, 5 muaj | 1 kredit |
| Hacker News (Algolia, falas) | 7 termat me radhë, 5 muaj | falas |
| Stack Exchange (API, falas) | 7 termat me radhë, në faqet e zgjedhura (p.sh. stackoverflow për produkte teknike, softwarerecs, webapps) | falas (nga kuota 10,000/ditë) |
| Bluesky | **nuk përfshihet** para hyrjes, sepse e kemi vetëm "live" (Jetstream, vetëm postime të reja) | – |

Gjithsej **3 kredite Serper** për provë, plus vlerësimi me AI.

Arsyeja e kërkesave të veçanta: me disa terma me OR, Google kthen 10 rezultatet më të përshtatshme për gjithë kërkimin,
dhe zakonisht fiton termi më i përdorur. Me Reddit + Indie Hackers bashkë, Reddit zë pothuajse të gjitha vendet.

**B2C:** [VENDIM I HAPUR] rrjedha për B2C para hyrjes nuk është përcaktuar ende (më parë: 1 kërkesë Reddit me 2 termat me OR, 1 kredit).

### 5.3 Vlerësimi dhe shfaqja
- **Çdo rezultat** vlerësohet me AI para se t'i shfaqet klientit: sa ia vlen t'i përgjigjet (0–100), si te seksioni Komunitete.
- **Shfaqen vetëm ato me 40 e sipër**, jo të gjitha si te Komunitete.
- Propozim kostoje: nëse HN dhe SE sjellin shumë postime, AI vlerëson vetëm rreth 30–40 më të rejat.

### 5.4 Ruajtja, fshirja dhe "një herë për domain"
- **Domaini normalizohet** para çdo kontrolli: pa `http(s)://`, `www.`, rrugë dhe port; shkronja të vogla; domaini i regjistruar
  (`app.shembull.com` → `shembull.com`). Te `server.js` ekziston `normalizoDomain(d)`.
- **Tabela e domaineve të përdorura** (ruhet përgjithmonë), p.sh. `px_prova_domaine`:
  `domaini`, `sherbimi` (`sinjale` | `email`), `perdorur_at`, `UNIQUE(domaini, sherbimi)`.
- **Rezultatet e provës** ruhen përkohësisht (p.sh. `px_prova_rezultate`), të lidhura me një **seancë**:
  - `seanca` = kod i rastësishëm i krijuar në shfletues (cookie ose localStorage) kur fillon prova;
  - `ip_hash` (IP e koduar, jo e plotë), `domaini`, `postimet` (JSON me vlerësimet), `aktiv_at` (aktiviteti i fundit).
- **Nëse klienti hyn në llogari:** të gjitha rezultatet e seancës kalojnë te llogaria e tij, në tabelat që kemi
  (`komunitete_postime` dhe të tjerat; duhet shtuar kolona e klientit, sepse tani janë për një klient), dhe nisin rregullat e seksionit 7.
- **Nëse klienti largohet pa hyrë:** fshihen të gjitha rezultatet, mbetet vetëm domaini te `px_prova_domaine`.
- **Si dallohet "u largua":** nuk ka mënyrë të sigurt që faqja ta dijë kur dikush ikën. Propozim:
  - shfletuesi dërgon një sinjal të vogël "jam ende këtu" çdo disa minuta sa faqja është e hapur;
  - fshirja automatike bëhet kur seanca s'ka aktivitet për një kohë, p.sh. **2 orë** (kufiri kohor vendoset ti);
  - **kujdes me hyrjen me Google:** gjatë login hapet dritarja ose faqja e Google dhe sinjali ndalon për pak kohë.
    Kjo nuk duhet ngatërruar me largimin: kodi i seancës mbetet në shfletues, dhe kur klienti kthehet nga Google
    me të njëjtin kod, rezultatet i kalojnë llogarisë. Prandaj kufiri kohor duhet të jetë shumë më i gjatë se një hyrje.
- **Herën e dytë me të njëjtin domain** (pa login): shfaqet mesazhi që prova falas për këtë domain është përdorur
  dhe butoni "Sign in for unlimited use". **Pas hyrjes, studimi fillon nga e para** për të.
- **Mbrojtje nga abuzimi:** kufi domainesh për IP në ditë; domainet pa faqe të lexueshme nuk numërohen si provë.

## 6. AI dhe dërgimi para hyrjes

### 6.1 Gjenerimi i email-it me AI [NDËRTUAR]
- Rruga: `POST /api/px/email-ai` te `prototip.js` (motori), e thirrur nga butoni "Study my business with AI".
  Adresa ndryshohet me atributin `api="..."` të elementit (paracaktim `/api/px`).
- Lexon faqen kryesore me lexuesin e sigurt të `komunitete.js`. Për këtë, `komunitete.js` ka një rresht të ri:
  `app.locals.pxLexoFaqen` dhe `app.locals.pxPastroDomain`.
- **gpt-5-mini**, në një thirrje, kthen: përshkrimin, llojin (b2b / b2c / te-dyja + siguria), 1–2 kategori nga lista, subjektin dhe mesazhin.
- **B2C me siguri të lartë:** subjekti dhe mesazhi mbeten të kyçur, dhe del mesazhi që dërgimi është vetëm për B2B.
- **Rregullat kundër spam-it,** në prompt dhe të kontrolluara në kod (`pxKontrolloEmailin`):
  - subjekti 2–6 fjalë (maks. 8), pa "!", pa SHKRONJA TË MËDHA, pa emoji, pa çmime ose përqindje, pa "Re:" / "Fwd:";
  - mesazhi 50–110 fjalë (pranohet 40–150), tekst i thjeshtë, 3–4 paragrafë, me `{company}`;
  - pa lidhje dhe adresa interneti në email-in e parë, pa bashkëngjitje, pa imazhe;
  - pa fjalët që filtrat lidhin me spam ("free", "guarantee", "urgent", "click here", "act now", "discount" etj.);
  - një pyetje e qetë në fund, pa presion dhe pa lajka.
  - Nëse drafti shkel rregullat, AI pyetet edhe një herë me listën e gabimeve.
- Mbrojtje e përkohshme: maksimumi 10 thirrje në orë për IP.
- **Kujdes:** përmbajtja e mirë ndihmon, por Gmail vendos kryesisht nga **teknika dhe reputacioni** i dërguesit:
  SPF, DKIM dhe DMARC në domainin dërgues, çregjistrim me një klik (header `List-Unsubscribe` + `List-Unsubscribe-Post`),
  ankesa për spam nën 0.1% (kufiri i Google për dërguesit masivë është 0.3%), volum i ulët dhe i rritur gradualisht,
  email-e vetëm te adresa të verifikuara (pak kthime). Këto ndërtohen bashkë me dërgimin e vërtetë.

### 6.2 Parapamja dhe shablloni [NDËRTUAR te prototipi]
- Butoni **Preview** (aktiv pas studimit) hap dritaren që duket si kutia e email-it:
  subjekti, From, Reply-to, To, mesazhi me emrin e biznesit në vend të `{company}` dhe `{domain}`, nënshkrimi,
  dhe fundi: "Not relevant? Just reply "no"…" + Unsubscribe.
- Pamje kompjuteri dhe telefoni; kalim mes 3 marrësve të zgjedhur; mbyllet me Esc.
- I njëjti dizajn i lehtë përdoret për dërgimin e vërtetë [PËR T'U NDËRTUAR].

### 6.3 Pjesa tjetër [PËR T'U NDËRTUAR]

- **Dërgimi i 3 email-eve falas:** nga adresa e dërgimit të platformës, në një nëndomain të veçantë
  (p.sh. `mail.phronexusai.com`, që domaini kryesor të mos dëmtohet), me "reply-to" email-in e verifikuar të klientit.
- **Bizneset në direktori:** nga lista e domaineve (Common Crawl + gjetja e email-eve). Tani janë shembuj.
- Prova e email-eve ndjek të njëjtin rregull "një herë për domain" (`sherbimi = 'email'`).

## 7. Sinjalet PAS hyrjes: rregullat e kërkimit [PËR T'U NDËRTUAR]

Vlejnë për **çdo klient** (çdo llogari), me termat e tij që nuk ndryshohen me dorë.

| Burimi | Shpeshtësia | Termat | Periudha |
|---|---|---|---|
| Reddit (Serper) | **çdo javë** | 2 terma, me radhë, secili kërkesë më vete | 7 ditët e fundit |
| Indie Hackers (Serper) | **çdo 2 javë** | 1 term, me radhë | 14 ditët e fundit |
| Hacker News (falas) | **çdo 6 orë** | të 7 termat | që nga kërkimi i fundit |
| Stack Exchange (falas) | **çdo 6 orë** | të 7 termat, në faqet e zgjedhura | që nga kërkimi i fundit |
| Bluesky (falas) | **live** (Jetstream, si te Njoftimet) | rregulla nga termat | në kohë reale |

- **Rradha e Reddit-it me numër tek termash (7):** java 1 = termat 1+2, java 2 = 3+4, java 3 = 5+6, java 4 = **7+1** (termi i fundit me të parin),
  dhe pastaj rifillon. [Për t'u konfirmuar: rifillon nga 2+3 (që çdo term të kërkohet njësoj shpesh) apo nga 1+2.]
- **Kostoja Serper për klient:** Reddit ~2 kredite/javë + Indie Hackers ~1 kredit/2 javë ≈ **10–11 kredite në muaj**.
- **Kujdes me kuotën e Stack Exchange:** 10,000 kërkesa/ditë për çelës. 7 terma × 2 faqe × 4 herë/ditë = 56 kërkesa/ditë për klient,
  pra rreth 170 klientë për një çelës. Me më shumë klientë duhet ulur shpeshtësia ose numri i faqeve, ose shpërndarë ngarkesa.
- **Shpërndarja e ngarkesës:** kërkimet e klientëve nuk nisen të gjitha në të njëjtën minutë, por shpërndahen gjatë orëve.
- **Vlerësimi:** çdo postim i ri vlerësohet me AI; klientit i shfaqen vetëm ato me 40+.
- **Email rikthimi:** nëse klienti ka hyrë të paktën një herë dhe nuk po hyn më (p.sh. 7 ditë), i dërgohet një email
  me sinjalet e reja ("You have N new interest signals"), me lidhje hyrjeje dhe çregjistrim me një klik.
  Jo më shpesh se një herë në javë. [Kufijtë kohorë për t'u vendosur.]
- **Bluesky live** kërkon që rregullat e çdo klienti të ndërtohen nga termat e tij dhe postimet të ndahen sipas klientit;
  te Njoftimet tani është për një përdorues të vetëm.

## 8. Ide dhe vendime të diskutuara pas prototipit (propozime, jo të ndërtuara)

### 8.1 Stack Exchange: në pritje të testit
- Testi i parë (4 kërkesa me terma, 7 ditë) dha **0 rezultate**. Termat tanë janë fraza të gjata për Google/Reddit,
  ndërsa kërkimi i Stack Exchange kërkon pothuajse të gjitha fjalët; faqet si Software Recommendations marrin pak pyetje në javë.
- Testi i dytë: "të gjitha pyetjet e reja" (pa terma) te Software Recommendations, 30 ditë, pastaj vlerësimi me AI.
  - 0–1 me 40+: Stack Exchange hiqet nga plani, përveç produkteve teknike (Stack Overflow).
  - disa me 40+: mbahet vetëm kjo mënyrë, një herë në ditë (jo çdo 6 orë si te seksioni 7).
- Ide: AI zgjedh 2–4 faqet e Stack Exchange për çdo klient, nga lista reale (`/api/komunitete/vendet`), si te subreddit-et.

### 8.2 Termat e përbashkët sipas kategorive
- Termat që ndajnë disa klientë të së njëjtës kategori kërkohen **një herë** (Reddit, HN, Alerts), dhe rezultatet ndahen mes tyre.
  Kjo kursen kredite Serper.
- AI vlerëson çdo postim **veç për çdo klient**, sipas përshkrimit të tij. Kategoria vetëm zgjedh cilat rezultate i jepen.
- Klienti i ri merr menjëherë rezultatet e kategorisë, plus 2–3 terma vetëm për të.

### 8.3 Një listë e vetme kategorish [VENDIM I HAPUR]
- Tani ka tri gjëra që nuk përputhen: Lancime (13 kategori të gjera, `LANCIME_KATEGORITE`), Komunitete (pa kategori)
  dhe alertet (20 kategori më të ngushta, te `alerte-kategorite.csv`).
- AI duhet të **zgjedhë nga lista** (1–2 kategori), jo të shpikë emra.
- Dy rrugë: (a) 20 kategoritë bëhen lista e vetme; (b) dy nivele: 13 grupet e Lancime me 20 nënkategoritë brenda.

### 8.4 Google Alerts si burim falas
- Grumbullimi bëhet në **projektin e email-eve** (motori), jo në databazën e PhronexusAI.
- Lista: `alerte-kategorite.csv`, me **111 alerte**, 3 fraza secili me OR (alertet e shkurtra kthejnë më shumë), 323 fraza, 20 kategori.
  Mund të zgjerohet në 300–400 alerte me më shumë kategori dhe fraza.
- Cilësimet: As-it-happens, English, Any region, All results, RSS feed.
- **Rreziqet:**
  - pa API: alertet krijohen me dorë;
  - shumë llogari për të kaluar kufirin rreth 1,000 mund t'i bllokojë të gjitha njëherësh, edhe me email të ndryshëm;
  - mbulim më i vogël se Serper; Reddit del rrallë pa `site:reddit.com`.
- **Moduli i ri** `alerte-kategori.js` [PËR T'U NDËRTUAR], i veçantë nga tab-i Alerte:
  tabela e feed-eve (adresa RSS, kategoria, termat, aktiv), kategoria për çdo rezultat,
  dhe pastrim ditor: fshihen rezultatet më të vjetra se **7 ditë** për kategoritë pa asnjë klient.
- **Kur:** testi tani (15–20 alerte me tab-in Alerte ekzistues); të gjitha alertet 1–2 javë para nisjes,
  sepse pa klientë mbahen vetëm 7 ditët e fundit.
- **Testi krahasues**, për 2–3 fraza gjatë së njëjtës javë:
  - A: Sources = Discussions, pa `site:`;
  - B: `(site:reddit.com OR site:indiehackers.com OR site:quora.com)`;
  - C: vetëm `site:reddit.com`, krahasuar me Serper te Komunitete (7 ditë).
- Ide: rezultatet e Alerts të kategorisë (7 ditët e fundit) mund t'i shfaqen edhe në provën falas para login, pa kosto Serper.

### 8.5 Burime të tjera B2B për më vonë
- Biseda: GitHub issues/discussions (falas, për produkte teknike), Dev.to, forumet Discourse (gjenden me Common Crawl, API falas).
- Ngjarje: punësime (Greenhouse, Lever, Ashby, falas), investime (SEC EDGAR, formulari D), lançime (Show HN, Product Hunt, BetaList).
- LinkedIn, G2, Quora: vetëm përmes Serper.

## 9. Pyetje të hapura

- B2B / B2C / të dyja + konfirmimi kur siguria është e ulët: miratohet?
- Rrjedha e provës falas për **B2C**.
- Rradha e Reddit pas javës 7+1: nga 2+3 apo nga 1+2?
- Kufiri kohor para fshirjes së rezultateve të një seance pa login (propozim: 2 orë pa aktivitet).
- Kur dërgohet email-i i rikthimit (pas sa ditësh) dhe sa shpesh.
- Kërkimi i Bluesky për postime të vjetra (API `searchPosts`): të testohet nëse funksionon pa llogari.
- "Send in each recipient's time zone": propozim të hiqet dhe të shkruhet "Times are in your time zone (…)".
- Filtri "Period" ka 7 dhe 30 ditë; të shtohet "Last 5 months" për provën falas?
- Butoni "Preview" i email-it, me dizajn të lehtë (tekst i pastër + nënshkrim profesional).
- Teksti "Free · no sign-up" te Sinjalet përsërit header-in "100% free": mbetet apo hiqet?
- Ngjyrat dhe fonti i phronexusai.com: ende të përkohshme.
