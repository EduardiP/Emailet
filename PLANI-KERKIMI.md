# Plani i kërkimit të bisedave (Reddit) – dokument konteksti

> Ky dokument përshkruan si **duhet** të funksionojë kërkimi. Një pjesë është ndërtuar (shih "Gjendja aktuale e kodit"), pjesa tjetër është plani për t'u ndërtuar.
> Kush punon me këtë kod (njeri ose AI) ta lexojë këtë para se të ndryshojë `komunitete.js`, `komunitete-client.js` ose pjesën e kërkimit në `server.js`.

## 1. Qëllimi

Shërbimi u ofrohet bizneseve **B2C** (klientët e mi). Për secilin klient gjejmë **individë** (jo biznese, jo konkurrentë) që shkruajnë publikisht në internet se kanë problemin që zgjidh produkti i klientit, ose kërkojnë një produkt të tillë. Klienti hap postimin dhe përgjigjet vetë. Sistemi nuk i dërgon asgjë askujt.

Burimi i parë është **Reddit**. Më vonë shtohen Hacker News, Stack Exchange, Bluesky dhe rrjete të tjera premtuese (shih seksionin 8).

## 2. Pse Reddit kërkohet përmes Google-it

- Reddit e mbylli aksesin pa login (`.json`) në maj 2026, dhe API zyrtare është e mbyllur ose me pagesë. Leximi direkt nga serveri (Railway) bllokohet.
- Prandaj Reddit kërkohet **përmes Google-it** me `site:reddit.com` (ose `site:reddit.com/r/<subreddit>`). Merren titulli, lidhja dhe copa e tekstit që jep Google. Postimi i plotë nuk lexohet.
- **Bing dhe DuckDuckGo janë të përjashtuar për Reddit.** Sipas raportimeve nga korriku 2024, Reddit bllokoi të gjithë motorët përveç Google-it, ndaj ata nuk marrin postime të reja. **Duhet verifikuar** me një test (i njëjti term, java e fundit, Google kundrejt Bing). Nëse Bing jep postime të reja me titull dhe tekst, mund të rishqyrtohet.

## 3. Mjetet

| Mjeti | Roli | Kosto |
|---|---|---|
| **SearXNG** (i vetë-hostuar në Railway, vetëm motori Google) | Kërkim falas në Google | Falas, por Google mund ta bllokojë (CAPTCHA) nga IP e data center-it |
| **Serper** (`google.serper.dev`, variabla `SERPER_API_KEY`) | Kërkim i besueshëm në Google | ~1 kredit për kërkesë (~1$ për 1000) |
| **OpenAI** (`OPENAI_API_KEY`, aktualisht `gpt-5-nano`) | Nxjerr përshkrimin dhe termat, vlerëson postimet | Pak cent |

Parametrat që përdoren në të dy mjetet:
- **SearXNG:** `q`, `format=json`, `engines=google`, `time_range` (`week` | `month` | `year`, ose pa të), `pageno` (1, 2, 3…). Në përgjigje, `unresponsive_engines` tregon bllokimin (p.sh. `["google","CAPTCHA"]`).
- **Serper:** `q`, `num=10`, `tbs=qdr:w` (java) / `qdr:m` (muaji) / periudhë e personalizuar për 6 muaj, `page` (1, 2, 3…).

Një faqe = 10 rezultate = 1 kërkesë. Google nuk lejon më 100 rezultate në një kërkesë (`num=100` u hoq në 2025).

## 4. Rregulla të përgjithshme (vlejnë kudo)

1. **Kalimi nga SearXNG te Serper bëhet VETËM kur ka bllokim** (CAPTCHA, "too many requests", "access denied", timeout i Google-it te `unresponsive_engines`), **jo kur dalin 0 rezultate**, sepse 0 mund të jetë e vërtetë.
2. Kur SearXNG bllokohet, ai e pezullon vetë Google-in (paracaktimi: rreth 1 ditë për CAPTCHA, 1 orë për "too many requests"). Gjatë pezullimit, kërkimet shkojnë direkt te Serper. **Nuk provohet përsëri gjatë pezullimit**, sepse bllokimet e shpeshta i prishin reputacionin IP-së.
3. **Pauza** mes kërkesave të SearXNG (sekonda deri në minuta), që të mos duken si robot.
4. **Dublikatat:** një postim identifikohet nga ID-ja e Reddit-it (`/r/<sub>/comments/<id>/`). Ruhet një herë (`UNIQUE (burimi, ext_id)`), nga cilido mjet të vijë, dhe vlerësohet me AI vetëm një herë.
5. Mbahen vetëm lidhjet e postimeve (`reddit.com/r/.../comments/...`). Të tjerat hidhen, si dhe rezultatet bosh (titulli = adresa, ose "No information is available").
6. **"Postim i mirë"** = AI e vlerëson me **≥ 60 pikë** dhe e shënon Individ.

## 5. Termat

- Nga përshkrimi i produktit, AI nxjerr **7 terma** (jo 8): fraza të shkurtra si i shkruan një person që ka problemin ose kërkon këtë lloj produkti, pa gjuhë marketingu (pa "best", "top", "guide").
- AI zgjedh **2 termat më të mirë**.
- **7 terma = 7 ditë të javës:** në kërkimin e rregullt, çdo ditë kërkohet 1 term.

## 6. Rrjedha për një klient

### 6.1 Versioni falas (provë pa regjistrim)
1. Klienti jep **URL-në e domainit** të biznesit.
2. AI nxjerr **përshkrimin** e produktit, **7 termat** dhe zgjedh **2 më të mirët**.
3. **Një kërkim i vetëm** në Google përmes **SearXNG**: 2 termat e bashkuar me `OR`, periudha **6 muaj**, **faqja 1**.
   Shembull: `("budgeting app" OR "track my spending") site:reddit.com`
4. AI vlerëson rezultatet, dhe klienti i sheh.
5. Nëse SearXNG është i bllokuar, vendim i hapur: ose përdoret Serper (1 kredit), ose klientit i thuhet të provojë më vonë.

### 6.2 Pas regjistrimit (vazhdon automatikisht)
**a) Thellimi i 2 termave më të mirë (Serper):**
- Faqet **2, 3, 4** të të njëjtit kërkim me `OR` (6 muaj), një faqe pas tjetrës.
- **Ndalet** nëse faqja kthen më pak se 10 rezultate (nuk ka më), ose nëse nga postimet e reja të faqes **më pak se 3 janë "të mira"** (≥ 60 pikë). Ndaj AI duhet të vlerësojë faqen para se të merret tjetra.
- Kosto: maksimumi 3 kredite.

**b) Kërkimi historik i 5 termave të tjerë (menjëherë, pa shpërndarje):**
- Secili term kërkohet **veç e veç**, periudha **6 muaj**, me **Serper**. Opsion i hapur: provo SearXNG së pari dhe Serper vetëm nëse bllokohet.
- Faqja 1 për secilin. Opsion: faqja 2 vetëm nëse faqja 1 kishte 10 rezultate dhe ≥ 3 të mira.
- Kosto: rreth 5 kredite.

**c) Kërkimi i rregullt (vetëm postimet e reja):**
- Pasi mbarojnë a) dhe b), çdo term hyn në **ciklin javor**: **1 term në ditë**, 7 termat në 7 ditët e javës.
- Periudha: **7 ditët e fundit** (jo 24 orë, sepse Google i indekson postimet e Reddit-it me 1–3 ditë vonesë; dublikatat hiqen vetë).
- **SearXNG** së pari. Nëse bllokohet në atë orar, **Serper** për atë kërkim.
- Orari i çdo kërkimi caktohet nga **radha globale 24-orëshe** (seksioni 7).

## 7. Radha globale 24-orëshe (për kur ka shumë klientë)

- Të gjitha kërkimet e rregullta të ditës, për të gjithë klientët, vendosen në një radhë dhe shpërndahen **njëtrajtësisht gjatë 24 orëve**. P.sh. 400 kërkime në ditë japin 1 kërkim çdo ~3.6 minuta.
- Qëllimi: të mos bëhen shumë kërkime njëherësh nga e njëjta IP, që Google të mos bllokojë SearXNG-në.
- Çdo element i radhës: klienti, termi, periudha (`week`), faqja, ora e planifikuar, mjeti i përdorur (SearXNG/Serper), rezultati dhe sa kredite u shpenzuan.
- Ruhet në databazë (Postgres), që të mbijetojë rinisjet e Railway-t.

## 8. Burime të tjera (më vonë)

Sistemi duhet të jetë i ndërtuar që burimet të shtohen si module me të njëjtën rrjedhë: kërkim → ruajtje pa dublikata → vlerësim me AI → tabelë.
- **Hacker News:** API falas e Algolia (`hn.algolia.com/api/v1/search_by_date`). Ekziston tashmë te `komunitete.js`. Vlen kryesisht për produkte teknike.
- **Stack Exchange:** API publike (`api.stackexchange.com/2.3`, variabla `STACKEXCHANGE_KEY`, 10,000 kërkesa/ditë). Ekziston tashmë. Dy mënyra: me terma (`/search/advanced`) ose të gjitha pyetjet e reja të një faqeje (`/questions`). Faqja/faqet zgjidhen sipas niche-s (p.sh. `money` për financat).
- **Bluesky:** për t'u shtuar. Duhet verifikuar nëse kërkimi publik funksionon pa llogari.
- **Forume të niche-s** (të gjetura me Exa): e njëjta teknikë si për Reddit, me `site:forumi.com` përmes SearXNG/Serper. Për këto, Bing dhe DuckDuckGo mund të përdoren, sepse zakonisht nuk i bllokojnë motorët.

## 9. Vlerësimi me AI (si funksionon tani)

- Titujt që tregojnë qartë promovim ("I built…", "We launched…", "… 5.0 update:", "my new app") shënohen **Biznes, 5 pikë**, pa pyetur AI-në.
- Për të tjerët, AI shkruan fillimisht arsyen në shqip, pastaj u përgjigjet pyetjeve po/jo:
  - `a`: promovon diçka të vetën;
  - `m`: **a e zgjidh PRODUKTI nevojën e autorit** (porta kryesore);
  - `k`: kërkon mjet ose rekomandim;
  - `s`: përshkruan problemin e vet;
  - `n`: vetëm temë e ngjashme.
- **Pikët i llogarit kodi:** a → 5 (Biznes); pa m → 20 (nëse n) ose 5; m+k+s → 90; m+k → 80; m+s → 65; vetëm m → 45.
- Kufizim: AI sheh vetëm titullin dhe copën e tekstit të Google-it, e cila ndonjëherë vjen nga komentet. Postimet me 80+ pikë janë të besueshme, ato me 65 duan një vështrim nga njeriu.

## 10. Gjendja aktuale e kodit (tetor 2026)

**Ekziston dhe funksionon:**
- Tab-i **Komunitete** (`komunitete.js` + `komunitete-client.js`, i lidhur në `server.js` me `require('./komunitete')(app, pool)` dhe `<script src="/komunitete-client.js">`):
  - burimet: **Reddit përmes Serper**, Hacker News, Stack Exchange;
  - butonat "Formulo termat me AI" dhe "Propozo subreddit-e me AI";
  - "Kërkim i saktë" (termi në thonjëza) ose "Kërkim i gjerë"; periudha 24 orë / 7 ditë / 30 ditë;
  - ruajtja në tabelën `komunitete_postime`, pa dublikata;
  - vlerësimi me AI (seksioni 9), "Rivlerëso të gjitha" dhe statuset (I ri / U përgjigj / E lashë);
  - filtrat dhe numri i postimeve për çdo filtër.
- Tab-i **Bisedat** (në `server.js`): kërkim i thjeshtë përmes Serper, pa ruajtje dhe pa AI.

**Për t'u ndërtuar sipas këtij plani:**
1. Shërbimi **SearXNG** në Railway (vetëm Google, JSON i aktivizuar) dhe moduli i kërkimit SearXNG me kalim te Serper vetëm kur ka bllokim.
2. Periudha **6 muaj** dhe faqet 2–4 me ndalim (< 10 rezultate ose < 3 të mira).
3. **7 terma** (në vend të 8), me zgjedhjen e 2 më të mirëve dhe kërkimin me `OR`.
4. Versioni falas (URL → përshkrim + terma → 1 kërkim SearXNG) dhe rrjedha pas regjistrimit.
5. Cikli javor (1 term në ditë) dhe radha globale 24-orëshe.
6. Testi Google kundrejt Bing për Reddit.
7. Numërimi i burimit të çdo rezultati (SearXNG / Serper) dhe i krediteve të shpenzuara.
