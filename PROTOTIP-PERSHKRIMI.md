# Seksioni publik "Sinjalet + Dërgimi i email-eve" (PARA hyrjes në llogari)

Ky dokument përshkruan vetëm përdorimin **pa login** (prova falas në faqen publike të phronexusai.com).
Çfarë ndodh **pas hyrjes** (paneli i klientit, lidhja e email-it dërgues, dërgimi pa kufi, sinjalet çdo ditë)
do të përshkruhet në një projekt ose bisedë tjetër.

Gjendja: **prototip / vetëm strukturë**. Asgjë nuk lidhet me databazën, asgjë nuk dërgohet, asnjë kërkim nuk bëhet.
Të dhënat që shihen (sinjale, biznese, numra) janë shembuj të shkruar në kod.
Pjesët që shënohen **[PËR T'U NDËRTUAR]** do të plotësohen më vonë në projektin real.

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
- Seksioni i njofton faqen me ngjarjen `px-veprim` (`detail.veprimi` = `hyr`, `dergo`, `regjistrohu`, `hape` …). Projekti real e dëgjon këtë ngjarje, p.sh. për të hapur hyrjen.

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
   - **i ngushtë:** butoni "✦ Try it: generate your email with AI" + butoni "Sign in for unlimited use";
     klikimi i të parit e zgjeron pjesën dhe vendos kursorin te domaini;
   - **i gjerë:** "✦ Study my business with AI" + fusha e domainit + "Sign in for unlimited use".
   - Shënim: "Free: one try per domain. Your email is written by AI from your domain."
4. **Kushti i domainit:** subjekti dhe mesazhi janë **të kyçur** (nuk shkruhen me dorë) derisa klienti të japë domainin dhe ta studiojë me AI.
   Pas studimit AI i plotëson dhe klienti mund t'i ndryshojë. Butoni "Send" nuk aktivizohet pa këtë hap.
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

## 4. Sinjalet (djathtas), për B2B dhe B2C

1. Titulli "Who is looking for what you sell" dhe shenja **"For B2B and B2C businesses"**.
2. **I ngushtë:** fusha e domainit është e fshehur; butoni "✦ Try it free: find interest signals with AI" e zgjeron pjesën dhe e shfaq fushën.
   **I gjerë:** fusha dhe butoni në një rresht.
3. Shënim: "Free: one search per domain, posts from the last 5 months."
4. Butoni "Sign in to get the latest interest signals for your business".
5. Rezultatet shembull dhe filtrat (burimi, pikët, periudha) mbeten si janë. Butoni **nuk bën asnjë kërkim** (vetëm strukturë).
6. **Domaini kalon nga email-et te sinjalet:** nëse klienti filloi me dërgimin e email-eve, domaini që dha atje plotësohet vetë te sinjalet.
   Jo anasjelltas, sepse një biznes B2C mund të përdorë sinjalet, por jo dërgimin e email-eve.

## 5. Një provë falas për domain [PËR T'U NDËRTUAR në projektin real]

Rregulli: pa login, **çdo domain** ka **një** provë për dërgimin e email-eve dhe **një** për sinjalet. Pas kësaj del vetëm hyrja.

Propozim për ndërtimin:

- **Tabela** (emri me parashtesë që të mos përplaset me të tjerat), p.sh. `px_prova_falas`:
  - `domaini` (i normalizuar)
  - `sherbimi` (`email` | `sinjale`)
  - `krijuar_at`
  - `ip_hash` (IP e koduar, jo IP e plotë, për privatësi)
  - `rezultati` (JSON: sinjalet e gjetura, ose subjekti/mesazhi/marrësit/oret)
  - `UNIQUE(domaini, sherbimi)`
- **Normalizimi i domainit para kontrollit:** heq `http(s)://`, `www.`, rrugën dhe portin, kthen në shkronja të vogla,
  merr domainin e regjistruar (`app.shembull.com` → `shembull.com`), që i njëjti biznes të mos provojë dy herë me nëndomain.
  Te `server.js` ekziston tashmë `normalizoDomain(d)`; mund të përdoret ose të zgjerohet.
- **Rrjedha:**
  1. Klienti jep domainin dhe shtyp butonin e AI-së.
  2. Serveri kontrollon tabelën. Nëse provës i ka ardhur radha, e bën dhe e ruan rezultatin.
     Nëse domaini e ka përdorur, kthen rezultatin e ruajtur (pa kosto të re AI/Serper) dhe butonin e hyrjes.
- **Mbrojtje nga abuzimi** (vendim i hapur):
  - kufi për IP, p.sh. disa domaine në ditë;
  - domaine të pavlefshme ose pa faqe (lexuesi i faqes dështon) nuk numërohen si provë;
  - para dërgimit të email-eve, verifikimi i email-it të klientit (kod) mund të jetë edhe hapi i krijimit të llogarisë.
- **Shënim:** dikush mund të japë domainin e një biznesi tjetër. Për sinjalet kjo nuk është problem i madh;
  për email-et, dërgimi duhet të ketë "reply-to" të verifikuar dhe të mos lejojë t'i paraqitet si ai biznes.

## 6. AI dhe shërbimet [PËR T'U NDËRTUAR]

- **Studimi i biznesit:** lexohet faqja kryesore e domainit, me lexuesin e sigurt nga SSRF te `komunitete.js`.
  - **gpt-5-nano:** përshkrimi, B2B/B2C dhe kategoritë e rekomanduara;
  - **gpt-5-mini:** shkrimi i subjektit dhe mesazhit, ku cilësia e tekstit ka rëndësi.
- **Sinjalet (prova falas):** një kërkim i vetëm me Serper (termat më të mira me OR), postime nga 5 muajt e fundit, faqja 1,
  vlerësim me AI si te seksioni Komunitete. Plani i mëparshëm (`PLANI-KERKIMI.md`) thoshte 6 muaj: duhet njësuar.
- **Dërgimi i 3 email-eve pa login:** nga adresa e dërgimit të platformës, në një nëndomain të veçantë
  (p.sh. `mail.phronexusai.com`, që domaini kryesor të mos dëmtohet), me "reply-to" email-in e verifikuar të klientit.
- **Bizneset në direktori:** nga lista e domaineve (Common Crawl + gjetja e email-eve). Tani janë shembuj.

## 7. Pyetje të hapura

- "Send in each recipient's time zone": vendi i biznesit nuk gjendet gjithmonë me siguri.
  Propozim: hiqet, dhe shkruhet "Times are in your time zone (Europe/Berlin)".
- Prova e sinjaleve: 5 apo 6 muaj? Filtri "Period" ka vetëm 7 dhe 30 ditë; të shtohet "Last 5 months"?
- Butoni "Preview" i email-it, me dizajn të lehtë (tekst i pastër + nënshkrim profesional): po apo jo?
- Teksti "Free · no sign-up" te Sinjalet përsërit header-in "100% free": mbetet apo hiqet?
- Ngjyrat dhe fonti i phronexusai.com: ende të përkohshme.PROTOTIP-PERSHKRIMI.md
