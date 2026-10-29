# Seksioni "Studimi": makineria e kërkimit për marketing automatik

> Dokument konteksti. Kush punon me këtë kod (njeri ose AI) ta lexojë para se të ndryshojë `studimi.js` ose `studimi-client.js`.

## 1. Qëllimi

Një motor që **studion vetë** mënyrat më të mira për të gjetur klientë automatikisht, në vend që t'i mësoj dhe t'i gjej unë me mendjen time.
Motori mendon logjikisht, kërkon vetë në internet (si një studiues: kërkon, hap faqet, lexon dhe vendos kërkimin tjetër), vlerëson gjetjet sipas kushteve të mia dhe, kur has një pengesë, krijon pyetje alternative.

- **Asgjë nuk vazhdon pa miratimin tim.** Çdo ndarje në degë dhe çdo kërkim kërkon një klikim.
- **Motori mëson nga mënyra si unë ndaj dhe drejtoj** (seksioni 6), sepse as unë nuk e di që në fillim cila është rruga e saktë.

## 2. Pema

Çdo projekt është një pemë:

- **Rrënja** = qëllimi (p.sh. "marketing automatik për biznese online") + **kushti kryesor** i projektit (p.sh. "pa shkelur kushtet e platformave, falas ose i lirë, i automatizueshëm").
- **Ndarja e parë** merr si bazë dy drejtime:
  - **Dega A: mjeti.** Biznesi ekziston (dyqan, platformë, shërbim online). Si automatizohet gjetja e klientëve për të.
  - **Dega B: biznesi.** Produkti nuk është vendosur. Çfarë produkti ose shërbimi duhet ndërtuar që klientët të vijnë vetë.
  AI mund të propozojë ndarje tjetër, por duhet ta shpjegojë.
- Çdo nyje ka: **pyetjen logjike**, **termat e kërkimit**, **kushtet e nivelit**, **opsionet e gjetura**, **pengesat** dhe **pyetjet alternative**.

## 3. Rrjedha e një nyjeje

1. **Propozuar:** AI e krijoi gjatë ndarjes, me pyetjen dhe 3–6 terma pikënisjeje.
2. Unë mund të: ndryshoj termat me dorë, shtoj kushte në këtë nivel, ose ta refuzoj.
3. **Mirato dhe kërko:** modeli (gpt-6.1-terra) kërkon vetë në internet me mjetin `web_search` të OpenAI (Responses API). Fillon nga termat e degës, hap faqet, lexon detajet (API, kostoja, kushtet e përdorimit) dhe vendos vetë kërkimin tjetër, deri në `STUDIMI_KERKIME_PER_HAP` kërkime. Në fund kthen **opsione** të vlerësuara (0–100), secili me lidhjet ku u verifikua. Faqet dhe kërkimet ruhen, që hapat e tjerë të mos i përsërisin.
4. **Vlerësuar:** shoh opsionet, i miratoj ose i refuzoj, dhe zgjedh hapin tjetër:
   - **Rikërko:** AI krijon terma të rinj, duke përjashtuar çdo gjë që ka kërkuar më parë dhe opsionet e gjetura, pastaj kërkon përsëri.
   - **Ndaj në nëndegë:** AI përdor pengesat dhe pyetjet alternative për të propozuar degë të reja.
   - **Shto një nëndegë me dorë:** titulli, pyetja dhe termat e mia; mbetet "propozuar" derisa ta miratoj.

Pengesat trajtohen me pyetjet: *Pse ekziston pengesa? Çfarë dua realisht pas saj? Ku tjetër shfaqet e njëjta gjë? A është e hapur dhe falas? Si lidhet me sistemin (API, RSS, webhook)?*

### Pamja dhe radha e studimit

- Pema shfaqet **grafikisht**: rrënja (plani kryesor) sipër, degët poshtë saj, nëndegët poshtë tyre. Ngjyra tregon gjendjen: e verdhë = propozuar, blu = duke punuar, jeshile = e studiuar, e kuqe = gabim, gri = refuzuar.
- Klikoj një degë për ta zgjedhur; detajet dhe butonat dalin poshtë pemës, dhe nga aty shtoj ose vazhdoj studimin.
- **Studimi nuk shkon paralelisht:** në një projekt punon vetëm një degë në një kohë, ajo që zgjodha. Serveri refuzon të nisë një degë tjetër derisa të mbarojë e para.

## 4. Kushtet

- **Kushti kryesor** vendoset kur krijohet projekti dhe **nuk fshihet**. Vlen për çdo nyje.
- **Kushtet e nivelit** shtohen te një nyje dhe vlejnë për të dhe për të gjitha nëndegët e saj.
- Opsionet që shkelin kushtin kryesor nuk shfaqen si opsione; AI i rendit te "të përjashtuara" me arsyen.

## 5. Kufijtë (që kërkimet të mos vazhdojnë pa fund)

| Variabla në Railway | Vlera e parazgjedhur | Çfarë kufizon |
|---|---|---|
| `STUDIMI_KERKIME_PER_HAP` | 10 | Sa kërkime në internet mund të bëjë AI në një hap |
| `STUDIMI_THELLESIA_MAKS` | 5 | Sa nivele mund të ketë pema |
| `STUDIMI_KERKIME_PER_PROJEKT` | 200 | Sa kërkime në internet mund të bëjë AI gjithsej në një projekt |
| `STUDIMI_MODELI` | `gpt-6.1-terra` | Modeli për të gjitha fazat: logjika dhe kërkimi në internet |
| `STUDIMI_ARSYETIMI` | `high` | Sa thellë mendojnë modelet e OpenAI (`low`, `medium`, `high`) |
| `STUDIMI_FJALEKALIMI` | (bosh) | Nëse vendoset, seksioni kërkon fjalëkalim (faqja nuk ka hyrje në llogari) |

Përdoren `OPENAI_API_KEY` dhe `DATABASE_URL` që ekzistojnë tashmë. Serper nuk përdoret në këtë seksion. Çdo kërkim i AI-së në internet ka koston e vet te OpenAI (shih faqen e çmimeve të OpenAI).

## 6. Mësimi nga vendimet e mia

- Çdo veprim ruhet te `studimi_vendimet`: çfarë propozoi AI, çfarë zgjodha unë, dhe arsyeja (fusha "Arsyeja", opsionale; kur refuzoj ose ndryshoj termat, faqja ma kërkon).
- **"Nxirr rregulla nga vendimet":** AI lexon vendimet dhe propozon rregulla për çdo fazë (`analiza`, `ndarja`, `kerkimi`, `vleresimi`).
- **Asnjë rregull nuk përdoret pa miratimin tim.** Rregullat aktive futen në promptin e fazës së tyre, për të gjitha projektet.
- Çdo ndryshim i rregullave aktive ruan një version; **"Kthehu te versioni i mëparshëm"** e rikthen grupin e mëparshëm.

## 7. Tabelat

`studimi_projektet`, `studimi_nyjet`, `studimi_opsionet`, `studimi_lidhjet_pare` (për përjashtimin e lidhjeve të para), `studimi_vendimet`, `studimi_rregullat`, `studimi_versionet`.

## 8. Lidhja me server.js

Dy rreshta, si te Komunitete: `require('./studimi')(app, pool);` dhe `<script src="/studimi-client.js"></script>`.

## 9. Për më vonë

- Opsionet e miratuara të kthehen në "detektorë" të rinj sinjalesh në tab-et ekzistuese (p.sh. një burim i ri RSS te Alerte).
- Matja e rezultateve reale (sa sinjale/klientë dha çdo opsion), që rregullat të korrigjohen edhe nga të dhënat.
