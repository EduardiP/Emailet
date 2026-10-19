# Plani i kërkimit të bisedave (Reddit) – dokument konteksti

> Ky dokument përshkruan si funksionon dhe si duhet të funksionojë kërkimi. Kush punon me këtë kod (njeri ose AI) ta lexojë para se të ndryshojë `komunitete.js`, `komunitete-client.js` ose pjesën e kërkimit në `server.js`.

## 1. Qëllimi

Shërbimi u ofrohet bizneseve **B2C** (klientët e mi). Për secilin klient gjejmë **individë** (jo biznese, jo konkurrentë) që shkruajnë publikisht se kanë problemin që zgjidh produkti i klientit, ose kërkojnë një produkt të tillë. Klienti hap postimin dhe përgjigjet vetë. Sistemi nuk i dërgon asgjë askujt.

Burimi i parë është **Reddit**. Më vonë shtohen Hacker News, Stack Exchange, Bluesky dhe rrjete të tjera premtuese (seksioni 8).

## 2. Pse Reddit kërkohet përmes Google-it, dhe pse vetëm me Serper

- Reddit e mbylli aksesin pa login (`.json`) në maj 2026, dhe API zyrtare është e mbyllur ose me pagesë. Leximi direkt nga serveri bllokohet.
- Prandaj Reddit kërkohet **përmes Google-it** me `site:reddit.com` (ose `site:reddit.com/r/<subreddit>`). Merren titulli, lidhja dhe copa e tekstit që jep Google. Postimi i plotë nuk lexohet.
- **Vetëm Google** ka postimet e reja të Reddit-it. Sipas raportimeve nga korriku 2024, Reddit bllokoi motorët e tjerë (Bing, DuckDuckGo etj.).
- **Kërkimi në Google bëhet vetëm me Serper** (`google.serper.dev`, variabla `SERPER_API_KEY`, ~1 kredit për kërkesë, rreth 1$ për 1000).
- **SearXNG u provua dhe u hoq (tetor 2026):** i hostuar në Railway, Google e refuzoi menjëherë IP-në e data center-it (`"access denied"` që në kërkimet e para). Kjo ndodh në çdo hosting cloud, pavarësisht domainit, sepse Google sheh IP-në e serverit. Me Serper problemi nuk ekziston, sepse serveri ynë flet vetëm me Serper-in.
- **Alternativa falas pa kufi nuk ka.** Shërbimet me sasi falas mujore (p.sh. Tavily, Brave) nuk përdorin indeksin e Google-it, ndaj me shumë gjasë nuk kanë postimet e reja të Reddit-it. Mund të testohen në të ardhmen.

Parametrat e Serper që përdoren: `q`, `num=10`, `tbs` (periudha: `qdr:w` java, `qdr:m` muaji, `cdr:1,cd_min:M/D/YYYY,cd_max:M/D/YYYY` për 6 muaj) dhe `page` (2, 3, 4…). Një faqe = 10 rezultate = 1 kredit. Google nuk lejon më 100 rezultate në një kërkesë.

## 3. Rregulla të përgjithshme

1. **Dublikatat:** një postim identifikohet nga ID-ja e Reddit-it (`/r/<sub>/comments/<id>/`). Ruhet një herë (`UNIQUE (burimi, ext_id)`) dhe vlerësohet me AI vetëm një herë.
2. Mbahen vetëm lidhjet e postimeve (`reddit.com/r/.../comments/...`). Të tjerat hidhen, si dhe rezultatet bosh (titulli = adresa, ose "No information is available").
3. **"Postim i mirë"** = AI e shënon Individ me **≥ 60 pikë**.
4. Me subreddit-e: maksimumi 6 subreddit-e për një kërkesë (`(site:… OR site:…)`). Me më shumë, bëhen disa kërkesa (grupe).
5. Kreditet e Serper numërohen dhe ruhen (`komunitete_gjendja.serper_kredite`).

## 4. Termat

- Nga përshkrimi i produktit, AI nxjerr **7 terma**, të renditur **nga më i miri te më i dobëti**: fraza të shkurtra si i shkruan një person që ka problemin ose kërkon këtë lloj produkti, pa gjuhë marketingu.
- **2 të parët** janë më të mirët dhe kërkohen bashkë me `OR`: `("term1" OR "term2")`.
- **7 terma = 7 ditë të javës:** në ciklin ditor kërkohet 1 term në ditë.

## 5. Rrjedha për një klient

### 5.1 Versioni falas (provë pa regjistrim) – për t'u ndërtuar te faqja reale
1. Klienti jep **URL-në e domainit**.
2. AI nxjerr **përshkrimin**, **7 termat** dhe **2 më të mirët**.
3. **Një kërkesë Serper:** 2 termat me `OR`, **6 muaj**, **faqja 1**. **1 kredit.**
4. AI vlerëson rezultatet, dhe klienti i sheh.

### 5.2 Pas regjistrimit (vazhdon automatikisht)
**a) Thellimi i 2 termave më të mirë:** faqet **2, 3, 4** të të njëjtit kërkim me `OR` (6 muaj). **Ndalet** nëse faqja kthen më pak se 10 rezultate, ose nëse nga postimet e reja të faqes **më pak se 3 janë "të mira"**. AI vlerëson çdo faqe para se të merret tjetra. Maksimumi 3 kredite.

**b) Kërkimi historik i 5 termave të tjerë:** menjëherë, secili veç, **6 muaj**, faqja 1. 5 kredite.

**c) Cikli ditor (vetëm të rejat):** pas a) dhe b), **1 term në ditë** me radhë (7 termat në 7 ditë), periudha **7 ditët e fundit**, faqja 1. Rreth 30 kredite në muaj. Java dhe jo 24 orët, sepse Google i indekson postimet e Reddit-it me 1–3 ditë vonesë; dublikatat hiqen vetë.

**Kosto për klient:** ~9 kredite në fillim dhe ~30 në muaj (rreth 0.04$ në muaj).

## 6. Shpërndarja me shumë klientë (më vonë)

Serper nuk na bllokon, ndaj radha 24-orëshe nuk është e domosdoshme. Mund të përdoret vetëm për ta shpërndarë ngarkesën: kërkimet e ditës për të gjithë klientët vendosen në radhë dhe kryhen njëtrajtësisht gjatë ditës, me gjendjen të ruajtur në Postgres.

## 7. Vlerësimi me AI

- Titujt që tregojnë qartë promovim ("I built…", "We launched…", "… 5.0 update:", "my new app") shënohen **Biznes, 5 pikë**, pa pyetur AI-në.
- Për të tjerët, AI (`gpt-5-nano`) shkruan arsyen në shqip, pastaj u përgjigjet pyetjeve po/jo: `a` promovon diçka të vetën; `m` **a e zgjidh PRODUKTI nevojën e autorit** (porta kryesore); `k` kërkon mjet/rekomandim; `s` përshkruan problemin e vet; `n` vetëm temë e ngjashme.
- Pikët i llogarit kodi: a → 5 (Biznes); pa m → 20 (nëse n) ose 5; m+k+s → 90; m+k → 80; m+s → 65; vetëm m → 45.
- Kufizim: AI sheh vetëm titullin dhe copën e tekstit të Google-it (ndonjëherë nga komentet). 80+ janë të besueshme, 65 duan një vështrim nga njeriu.

## 8. Burime të tjera (më vonë)

Çdo burim shtohet si modul me të njëjtën rrjedhë: kërkim → ruajtje pa dublikata → vlerësim me AI → tabelë.
- **Hacker News:** API falas e Algolia. Ekziston tashmë. Vlen për produkte teknike.
- **Stack Exchange:** API publike (`STACKEXCHANGE_KEY`, 10,000 kërkesa/ditë). Ekziston tashmë. Mënyrat: me terma, ose të gjitha pyetjet e reja të një faqeje (p.sh. `money`).
- **Bluesky:** për t'u shtuar. Duhet verifikuar nëse kërkimi publik funksionon pa llogari.
- **Forume të niche-s** (të gjetura me Exa): e njëjta teknikë si për Reddit, me `site:forumi.com` përmes Serper.

## 9. Gjendja e kodit (tetor 2026)

**Ekziston** (tab-i **Komunitete**: `komunitete.js` + `komunitete-client.js`, i lidhur në `server.js` me `require('./komunitete')(app, pool)` dhe `<script src="/komunitete-client.js">`):
- burimet Reddit (Serper), Hacker News dhe Stack Exchange; kërkimi manual me periudhë 24 orë / 7 / 30 ditë, "i saktë" ose "i gjerë";
- "Formulo termat me AI" (7 terma, të renditur) dhe "Propozo subreddit-e me AI";
- **"Nis kërkimin fillestar"** (seksioni 5.2 a dhe b, në sfond, me ecurinë në faqe): `POST/GET /api/komunitete/fillestar`;
- **cikli ditor** (5.2 c): kontrollohet çdo 15 minuta dhe kryhet një herë në ditë, me ditën e "rezervuar" në databazë (`cikli_data_fundit`); radha mbahet te `cikli_indeksi`. Endpoint-et: `GET/POST /api/komunitete/cikli`, `POST /api/komunitete/cikli/tani` (për testim);
- ruajtja te `komunitete_postime`, vlerësimi me AI, "Rivlerëso të gjitha", statuset (I ri / U përgjigj / E lashë), filtrat dhe numri i postimeve për çdo filtër;
- numërimi i krediteve të Serper.
- Tab-i **Bisedat** (në `server.js`): kërkim i thjeshtë përmes Serper, pa ruajtje dhe pa AI.

**Për t'u ndërtuar:**
1. Versioni falas te faqja reale: URL → përshkrim + 7 terma → 1 kërkesë me `OR` (5.1).
2. Rrjedha pas regjistrimit e lidhur me llogarinë e klientit, dhe shumë klientë në të njëjtën databazë (tani tabela është për një klient).
3. Shpërndarja e ngarkesës me shumë klientë (seksioni 6), nëse duhet.
4. Bluesky dhe burime të tjera (seksioni 8).
