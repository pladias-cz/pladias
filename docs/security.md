# Bezpečnostní audit aplikace Pladias

| | |
|---|---|
| Datum auditu | 23. 10. 2026 |
| Revize dokumentu | 24. 10. 2026 – všechna zjištění znovu ověřena proti revizi `68a7fe1`; vyřešená zjištění z dokumentu odstraněna – tentýž den vyřešena a odstraněna zjištění L7–L9 |
| Rozsah | backend (Play Framework 3.0.10, Java, Ebean), frontend (React + Vite), konfigurace (`conf/*.conf`), závislosti (`build.sbt`) |
| Metoda | statická analýza zdrojového kódu a konfigurace (code review); bez dynamického testování (penetrace) a bez revize infrastruktury |
| Cíl | posouzení připravenosti aplikace k uvedení do produkce |

> ## Verdikt
>
> **Aplikace v auditovaném stavu NENÍ připravena k produkčnímu nasazení.**
>
> Před uvedením do provozu je nutné odstranit **1 vysoké** zjištění (H2 – IDOR na
> dočasných souborech) a zajistit externí dodání produkčních tajemství včetně jejich
> rotace. Zjištění střední a nízké závažnosti je možné řešit krátkodobě po
> nasazení podle plánu v sekci [8. Checklist před produkcí](#8-checklist-před-produkcí).

## Obsah

- [1. Shrnutí](#1-shrnutí)
- [2. Klasifikace závažnosti](#2-klasifikace-závažnosti)
- [3. Přehled zjištění](#3-přehled-zjištění)
- [4. Zjištění vysoké závažnosti](#4-zjištění-vysoké-závažnosti)
- [5. Zjištění střední závažnosti](#5-zjištění-střední-závažnosti)
- [6. Zjištění nízké závažnosti](#6-zjištění-nízké-závažnosti)
- [7. Pozitivní zjištění](#7-pozitivní-zjištění)
- [8. Checklist před produkcí](#8-checklist-před-produkcí)
- [9. Metodika, předpoklady a limity](#9-metodika-předpoklady-a-limity)

## 1. Shrnutí

Aplikace má celkově promyšlený autorizační model: bezpečnostní anotace na controllerech
(`@Security.Authenticated`, `AuthorizedAsSysAdmin` apod.), kontroly vlastnictví u stahování
importů (`UploadExcel.downloadDecorated`), licenční filtry u Excel exportů
(`addExcelPermissionsFilter`) a dobře zdokumentované routy (`docs/rules_backend.md`).
Hesla se hashují moderním **Argon2id**, API tokeny jsou implementované správně
(SecureRandom 256 bitů, v databázi pouze SHA-256 hash) a CSRF ochrana je aktivní
(filtr Play, token v cookie `PLAY_CSRF_TOKEN`, React posílá hlavičku `Csrf-Token`).

Problémy, které brání produkčnímu nasazení:

1. **IDOR na dočasných souborech** (H2) – *přihlášený uživatel* může stahovat (a mazat)
   dočasné soubory ostatních uživatelů, včetně licenčně omezených dat.
2. **Produkční tajemství** – v `conf/common.conf` jsou záměrně prázdné hodnoty
   (`play.http.secret.key`, `secretKey`, `mail.password`); produkce je musí dodat
   externě, jinak aplikace (nebo její části) nefunguje – Play s prázdným
   `play.http.secret.key` vůbec nenastartuje (HS256 vyžaduje ≥ 256bit klíč).
   Původní hodnoty zůstávají v git historii repozitáře, proto je nutné při nasazení
   použít **nové** (rotovat), ne historické.

**Souhrn: 0 kritických, 1 vysoké, 9 středních, 5 nízkých zjištění.**

## 2. Klasifikace závažnosti

| Závažnost | Definice |
|---|---|
| **Kritická** | Přímé ohrožení důvěrnosti či integrity dat, nebo převzetí aplikace. Musí být odstraněna **před** produkcí. |
| **Vysoká** | Významné ohrožení dat nebo dostupnosti. Řešit před produkcí, nebo výslovně akceptovat riziko. |
| **Střední** | Omezené ohrožení / chybějící hardening. Řešit v krátkém horizontu po nasazení. |
| **Nízká** | Drobné oslabení, doporučení k zahrdění. |

## 3. Přehled zjištění

| ID | Závažnost | Oblast | Shrnutí |
|---|---|---|---|
| [H2](#h2--idor-na-dočasných-souborech-tempfiles) | Vysoká | IDOR | `/tempfiles/:id` – stažení/smazání cizích souborů podle číselného ID |
| [M2](#m2--slabé-řízení-hesel) | Střední | Hesla | Min. délka 6, generátor není CSPRNG, heslo v plaintextu e-mailem i v odpovědi API |
| [M4](#m4--session-cookie-bez-secure-flagu) | Střední | Session | `play.http.session.secure` nenastaveno |
| [M5](#m5--chybějící-rate-limiting-přihlašování) | Střední | Autentizace | Žádné omezení pokusů o login / lockout; drobná enumerace uživatelů |
| [M6](#m6--zastaralé-závislosti-s-cve) | Střední | Závislosti | commons-text 1.7, guava 19.0, pdfbox 1.8.17, poi 5.0.0, pgjdbc 42.2.x |
| [M7](#m7--geoserver-proxy-s-volnou-cestou) | Střední | SSRF/proxy | `/geoserver/*params` předává libovolnou cestu na interní GeoServer (HTTP) |
| [M8](#m8--smtp-důvěřuje-všem-certifikátům) | Střední | TLS | `mail.smtp.ssl.trust="*"` – SMTP spojení zranitelné na MITM |
| [M9](#m9--legacy-des-šifrování-hesel) | Střední | Kryptografie | DES/ECB šifrování starých hesel; sloupec `password` v DB přetrvává |
| [M10](#m10--únik-informací-v-chybových-stavech) | Střední | Info leak | `e.getMessage()`/`e.toString()` klientům, `printStackTrace`, DEBUG log v produkci |
| [M11](#m11--upload-bez-validace-typu-souboru) | Střední | Upload | `uploadPng` akceptuje libovolný obsah bez kontroly typu/velikosti |
| [L1](#l1--api-tokeny-bez-expirace) | Nízká | API tokeny | Tokeny bez expirace a bez možnosti odvolání |
| [L2](#l2--chybějící-csp-hlavička) | Nízká | Hlavičky | Content-Security-Policy není nastavena |
| [L4](#l4--debug-flag-vypíná-kontrolu-aktivity) | Nízká | Konfigurace | `debug=true` vypíná kontrolu neaktivity uživatele |
| [L5](#l5--filename-v-content-disposition-bez-uvozovek) | Nízká | Hlavičky | Nequotované filename v `Content-disposition` |
| [L6](#l6--velký-limit-uploadu-400-mb) | Nízká | DoS | `maxDiskBuffer = 400MB` – diskový DoS povrch pro přihlášené |

ID zachovávají číslování původního auditu (23. 10. 2026). Mezery v sekvencích
(C, H, M i L) odpovídají zjištěním vyřešeným v mezičase, která byla z dokumentu
odstraněna; komentáře v kódu, které odkazují na tato ID, se vztahují k původní
verzi auditu.

## 4. Zjištění vysoké závažnosti

### H2 – IDOR na dočasných souborech (`/tempfiles`)

**Závažnost: Vysoká** · OWASP: A01:2021 Broken Access Control

**Popis.** `TemporaryFilesProviderController.download`
(`app/controllers/common/TemporaryFilesProviderController.java:14–27`,
route `GET /api/react/tempfiles/:fileId` – `conf/react.routes:142`) vyžaduje jen
přihlášení (`Authorized`). Soubor se hledá čistě podle **číselného ID** (`Integer`),
bez jakékoli vazby na vlastníka:

```java
TemporaryFile tempFile = TemporaryFile.find().byId(id);   // žádná kontrola vlastníka
...
byte[] data = tempFile.getData();
tempFile.delete();                                         // navíc smazání při stažení
```

**Dopad.** Libovolný přihlášený uživatel může procházet ID a stahovat dočasné soubory
ostatních uživatelů. `TemporaryFile` obsahuje mj.:

- **importní sešity** (`ImportController`, `ImportCSVController`) – kompletní data
  záznamů včetně licenčně omezených (neaplikuje se zde `addExcelPermissionsFilter`),
- **uploady vlastností** (`TraitUploadService`),
- **PNG mapy** (`PdfMapController`),
- **exporty vyhledávání** (`SearchController`).

Kromě úniku dat jde i o **integrity/DoS problém**: soubor se při stažení maže – útočník
přečtením souboru zničí data legitimnímu příjemci. Zjištění je částečně známé
(`docs/gotchas.md`, `docs/rules_backend.md` – „částečně vyřešeno, jen login").

**Doporučení.**

1. Přidat do `TemporaryFile` vazbu na uživatele (`user_id`) a v controlleru kontrolovat
   `tempFile.getUser().equals(currentUser)` (nebo mapAdmin výjimku).
2. Alternativně/doplňkově použít neodhadnutelné identifikátory (UUID) místo Integer id –
   samo o sobě nestačí, číselná ID zůstávají zranitelná na výčet.
3. Nemazat soubor před ověřením práv a ideálně až po úspěšném odeslání; zvážit
   expiraci (úklid starších souborů) místo delete-on-read.

## 5. Zjištění střední závažnosti

### M2 – Slabé řízení hesel

**Závažnost: Střední** · OWASP: A07:2021 Identification and Authentication Failures

**Popis.**

| problém | umístění |
|---|---|
| Minimální délka hesla **6 znaků** | `app/models/User.java:27` (`MinPasswordLength`) |
| Generátor hesel používá `RandomStringUtils.randomAlphanumeric` – **není kryptograficky bezpečný** (ThreadLocalRandom), jen alfanumerické znaky | `app/utils/PasswordGenerator.java:10–12` |
| Reset hesla vrací nové heslo **v JSON odpovědi** endpointu | `UserController.resetUserPassword` (`app/controllers/common/UserController.java:616–657`) |
| Nový uživatel dostává heslo **e-mailem v plaintextu** | `UserController.createUser` (`:448+`, `notifyNewUser`) |
| Žádná politika složitosti / vynucená změna vygenerovaného hesla | – |

Hesla se ukládají korektně (Argon2id, 3 iterace, 64 MiB – `PladiasHashService`), jde tedy
o slabosti procesu, ne uložení. 6znakové alfanumerické heslo (~2,2 miliardy kombinací)
je však na hranici únosnosti a plaintext hesla v e-mailu/odpovědi API je zpětné dveře
(kopie hesla v mailovém archivu, v logu, v cache prohlížeče).

**Doporučení.**

1. Zvýšit `MinPasswordLength` na ≥ 10 (nastavení je na jednom místě, FE validaci
   doplnit v `ChangePassword`/User admin formuláři).
2. `PasswordGenerator` přepsat na `SecureRandom` (např. náhodné bajty → Base64 /
   znaková sada včetně `-_=+`), generovat ≥ 12 znaků.
3. `resetUserPassword` nevracet heslo v API odpovědi – heslo zobrazit jen sysAdminovi
   ve FE jednorázově (standard u malých týmů), nebo lépe: poslat mailem / vynutit
   změnu při prvním přihlášení (`mustChangePassword` flag).

---

### M4 – Session cookie bez Secure flagu

**Závažnost: Střední** · OWASP: A05:2021

**Popis.** V konfiguraci chybí `play.http.session.secure = true`. Play 3 default je
`secure = false` – session cookie se pak posílá i po nešifrovaném HTTP. Produkční
nasazení za HTTPS termination proxy (dle `play.filters.hosts` domény `*.ibot.cas.cz`)
by cookie mělo mít příznak `Secure`. Vhodné zároveň zapnout HSTS na proxy.

**Doporučení.**

```hocon
# produkce (za HTTPS)
play.http.session.secure = true
```

a na reverse proxy `Strict-Transport-Security: max-age=31536000`.

---

### M5 – Chybějící rate limiting přihlašování

**Závažnost: Střední** · OWASP: A07:2021

**Popis.** Přihlašování nemá žádnou ochranu proti brute-force: chybí omezení pokusů
per IP i per účet, lockout i jakékoli zpožďování – neúspěšný pokus o přihlášení
stojí útočníka jediný rychlý HTTP request. Dále flash hláška `Application.userIsDeleted`
(`doAuthenticate`) prozrazuje, že účet existuje, ale je smazaný – drobná enumerace
uživatelů.

**Doporučení.** Rate limiting řešit centrálně – např. filtr počítající pokusy
per IP+účet (in-memory token bucket) s dočasným zablokováním přihlašování po N
neúspěšných pokusech (account lockout / exponenciální backoff), případně rate limit
na reverse proxy (nginx `limit_req`). Flash hlášku pro smazaný účet sjednotit
s generickou `invalidUserNameOrPassword`.

---

### M6 – Zastaralé závislosti s CVE

**Závažnost: Střední** · OWASP: A06:2021 Vulnerable and Outdated Components

**Popis.** `build.sbt` obsahuje řadu starých verzí (aktuální je rok 2026):

| Závislost | Verze | Poznámka |
|---|---|---|
| `commons-text` | 1.7 | CVE-2022-42889 („Text4Shell", opraveno 1.10.0) – exploitace vyžaduje `StringSubstitutor`, který se v kódu **nepoužívá** (ověřeno); přesto upgrade |
| `guava` | 19.0 | CVE-2018-10237, CVE-2020-8908 (opraveno v 24.1.1/32.0.0) |
| `pdfbox-app` | 1.8.17 | 1.x je EOL řada; aplikace jím generuje PDF mapy |
| `poi-ooxml` | 5.0.0 | zpracovává **uživatelem nahrané** XLSX soubory (importy); doporučeno aktuální 5.x |
| `postgresql` | deklarace 2×: `9.4-1206-jdbc42` i `42.2.29` (resolvuje se 42.2.29) | duplicitní deklarace; 42.2.x je stará řada – upgrade na 42.7.x |
| `commons-io` | 2.7 | upgrade na ≥ 2.14 |
| `postgis-jdbc` | 2.1.7.2 | stará |

Pozitivum: `jackson` je override na 2.15.4, Play 3.0.10, Ebean 17.1.0, Argon2 2.12 jsou
aktuální; `dependencyOverrides` + `ConflictManager.latestRevision` pomáhají.

**Doporučení.**

1. Upgrade výše uvedených knihoven (POI a commons-text priorita).
2. Zařadit do CI OWASP dependency-check (`sbt-dependency-check`) – nové CVE se
   objevují průběžně a ruční audit rychle zastarává.
3. Odstranit duplicitní deklaraci postgresql driveru.

---

### M7 – GeoServer proxy s volnou cestou

**Závažnost: Střední** · OWASP: A10:2021 SSRF

**Popis.** `GET /geoserver/*params` a `/geoserver2/*params` (`conf/routes:8–9`,
`app/controllers/GeoServer.java:36–73`) předávají libovolnou cestu `params` na interní
GeoServer: `http://<geoserver.host>:<port>/geoserver/` + cesta (kontrola jen login).
Cílový host je z configu (nelze přesměrovat ven), ale přihlášený uživatel může proxy
nasměrovat na jakoukoli cestu/administraci interního GeoServeru (např. REST API,
pokud tam není vlastní autentizace) a veškerý provoz mezi aplikací a GeoServerem jde
po čistém HTTP (`Protocol = "http"`).

**Doporučení.**

1. Whitelistovat povolené služby (např. `/wms`, `/wfs` + očekávané parametry).
2. GeoServer komunikaci převést na HTTPS.
3. Ověřit, že GeoServer admin rozhraní má vlastní silnou autentizaci (mimo rozsah
   tohoto auditu).

---

### M8 – SMTP důvěřuje všem certifikátům

**Závažnost: Střední** · OWASP: A02:2021

**Popis.** `app/mail/MailService.java:51`:

```java
props.setProperty(MailSmtpSslTrustKey, "*");   // mail.smtp.ssl.trust = "*"
```

SMTP spojení (SMTPS na port 465, smtp.seznam.cz) přijme **libovolný certifikát** –
aktivní MITM na síťové cestě může číst přihlašovací údaje i obsah mailů (v nich se
posílají mj. vygenerovaná hesla – viz M2).

**Doporučení.** Nastavit `mail.smtp.ssl.trust` na konkrétní host (nebo vlastní
truststore s CA řetězcem seznam.cz). Vzhledem k fixnímu hostu z configu to nemá
provozní dopad.

---

### M9 – Legacy DES šifrování hesel

**Závažnost: Střední** · OWASP: A02:2021

**Popis.** `PladiasEncryptionService` + `DesEncrypter`
(`app/helpers/encryption/DesEncrypter.java`) používají **DES v režimu ECB**
(`Cipher.getInstance("DES")` → DES/ECB/PKCS5Padding) s 64bitovým klíčem z configu
(`secretKey`; v repu je hodnota prázdná – klíč se dodává externě). Slouží k dešifrování
legacy sloupce `password` v `db/DbMigrationRunner.java` (migrační nástroj; bez klíče
backfill hesel selže). Model `User` sloupec `encryptedPassword`
(`models/User.java:36–37`) dále nese.

**Dopad.** DES je prolomitelný (56bit efektivní klíč, ECB bez IV); pokud útočník
získá dump DB i klíč, legacy hesla dešifruje triviálně. Riziko je omezené, pokud
sloupec `password` už neobsahuje platná hesla (vytěženo při migraci na Argon2).

**Doporučení.**

1. Ověřit, zda v `users.password` zbývají nějaká nezmigrovaná hesla; po vytěžení
   sloupec dropnout a kód `DesEncrypter`/`PladiasEncryptionService` odstranit.
2. Do té doby klíč dál dodávat pouze externě (mimo repo).

---

### M10 – Únik informací v chybových stavech

**Závažnost: Střední** · OWASP: A04:2021 / A09:2021

**Popis.**

| problém | umístění |
|---|---|
| `e.getMessage()` vracené klientovi v catch blocích (7×) | `app/controllers/common/UserController.java` – getUsers `:329`, getUsersSummary `:378`, getUser `:439`, createUser `:517`, updateUser `:606`, resetUserPassword `:650`, editUserRightsField `:836` |
| `e.getMessage()` ve flash zprávě přihlašovací stránky | `Application.doAuthenticate` (`app/controllers/Application.java:149`) |
| `e.toString()` v `badRequest` odpovědi | `PdfMapController.uploadPng` (`app/controllers/atlas/PdfMapController.java:99`) |
| `catch (Exception) → ok("Error!")` – chyba maskovaná jako 200 | `controllers.api.Map.buildAndDownloadCsvRenderMapDetails` (`Map.java:41`) |
| `e.printStackTrace()` (obchází logger) | `UserController.createUser` – notifyNewUser catch (`UserController.java:492`) |
| `logger.application = DEBUG` v produkčním configu | `conf/common.conf:130` |

**Dopad.** Detaily výjimek (názvy tříd, SQL fragmenty, cesty) pomáhají útočníkovi
při reconstruování zranitelností; DEBUG log v produkci zvětšuje plochu pro uložení
citlivých dat (e-maily, dotazy) v logu.

**Doporučení.** Klientovi vracet generické hlášky (i18n), detail logovat na server
(WARN/ERROR). `logger.application = INFO` v produkci. Nahradit `printStackTrace`
loggerem.

---

### M11 – Upload bez validace typu souboru

**Závažnost: Střední** · OWASP: A04:2021

**Popis.** `PdfMapController.doUploadPng` (`app/controllers/atlas/PdfMapController.java:103–157`)
čte nahraný soubor (`IOUtils.toByteArray`) bez jakékoliv kontroly obsahu (magic bytes
PNG) ani velikosti a ukládá ho jako „PNG mapu" servírovanou s `Content-Type: image/png`.
Filename z multipartu se ukládá do DB. Endpoint je gated na mapAdmina, takže jde o
hardening (potenciální uložení libovolného obsahu, anomální obsah v UI).

**Doporučení.** Validovat PNG signature (`\x89PNG\r\n\x1a\n`) a/nebo MIME typ u
`FilePart`, omezit velikost; filename ošetřit (viz L5).

## 6. Zjištění nízké závažnosti

### L1 – API tokeny bez expirace

`TokenAuthService.createToken` (`app/service/accessrights/TokenAuthService.java:16–21`)
vytvoří 256bitový token (SecureRandom ✓, v DB jen SHA-256 hash ✓), ale token **nikdy
neexpiruje** a každý uživatel může mít jen jeden aktivní (nový přepíše starý – šikovné
„odvolání", ale jen novým tokenem). Doporučení: sloupec `auth_token_expires`,
rotace/volitelné odvolání v UI.

### L2 – Chybějící CSP hlavička

Play 3 default `contentSecurityPolicy = null` – aplikace CSP neposílá. FE renderuje
backend HTML přes `dangerouslySetInnerHTML` (`RichTextMessage.tsx`, zdokumentované
rozhodnutí – obsah generuje backend/sysAdmin). CSP (`script-src 'self'`) by jako
defense-in-depth omezila dopad případného budoucího XSS. Doporučení nastavit
`play.filters.headers.contentSecurityPolicy` (resp. `CspFilter`).

### L4 – `debug` flag vypíná kontrolu aktivity

`AuthenticatorBase.java:30` – s `debug = true` se vypíná 2h kontrola neaktivity
(`UserActivityMap`). Produkční configy mají `debug = false` (`common.conf:60`),
vývojové `true`. Riziko jen při chybně nasazené konfiguraci. Doporučení: při startu
s `debug=true` logovat výrazné varování (případně produkčnímu profilu zakázat).

### L5 – Filename v `Content-disposition` bez uvozovek

`attachment; filename=<nazev>` – bez uvozovek/RFC 5987 encodování – posílá řada
controllerů: `TemporaryFilesProviderController.download`, `controllers.api.Map`
(`Map.java:38, 49, 60`), `UploadExcel.downloadDecorated` (`UploadExcel.java:46`),
`PdfMapController` (`PdfMapController.java:81`), `MapAdminImportController` (`:92, 248`),
`MapReportsController` (`:63, 149`), `HerbariumController` (`:26`),
`TaxonMapSettingsController` (`:443`) a `ImportResultsController` (`:304`).
Zalomení řádku (CRLF) do hlavičky Pekko odmítne (header injection tedy neprojde),
ale speciální znaky rozbijí název souboru a neencodované UTF-8 znaky z DB mohou
v některých klientech působit škody. Doporučení: `filename="..."` +
`filename*=UTF-8''...` (FE `resolveFilename` už obojí podporuje).

### L6 – Velký limit uploadu (400 MB)

`play.http.parser.maxDiskBuffer = 400MB` (`common.conf:116`) – přihlášený uživatel může
sérií importů zaplnit disk. Pro importní workflow akceptovatelné; doporučeno
monitorování místa + eventuelně nižší limit pro ne-importní uploady.

## 7. Pozitivní zjištění

Při auditu se potvrdily následující silné stránky (chybí v mnoha aplikacích podobného typu):

**Autentizace a session**

- Hesla hashována **Argon2id** (3 iterace, 64 MiB, paralelismus 1) s mazáním pole
  v paměti (`PladiasHashService.wipeArray`).
- Session cookie: HttpOnly, SameSite=Lax (Play 3 default), JWT podepsaný HS256;
  při neautorizovaném přístupu `withNewSession()`.
- CSRF ochrana aktivní: Play `CSRFFilter` chrání všechna ne-GET/HEAD/OPTIONS volání,
  token v cookie `PLAY_CSRF_TOKEN`; React `apiClient` posílá hlavičku `Csrf-Token`,
  login formulář nese `@helper.CSRF.formField`, logout probíhá POSTem (pokryto
  testy `apiClient.test.ts`).
- Server-side timeout neaktivity 2h (`UserActivityMap`) – po restartu serveru jsou
  všichni uživatelé odhlášeni (mapa je in-memory).
- API tokeny: 256 bitů ze `SecureRandom`, uloženy pouze jako SHA-256 hash
  (`TokenAuthService`) – vzorově správně.
- Neúspěšné přihlášení vrací sjednocenou hlášku „neplatné uživatelské jméno nebo heslo"
  (vyjma smazaných účtů – M5).

**Autorizace**

- Konzistentní anotace `@Security.Authenticated(...)` / `AuthorizedAsSysAdmin` /
  `AuthorizedAsTaxonAdmin` na controllerech (dokumentováno v `docs/rules_backend.md`);
  `/api/react` routy jsou shodně gated, `AuthorizedApi` vrací pro fetch 401 JSON
  místo redirectu (správně pro SPA).
- Kontrola vlastnictví u stahování importů (`UploadExcel.downloadDecorated`:
  author/committer/mapAdmin).
- Licenční filtr u Excel exportů (`PageSearchService.addExcelPermissionsFilter`) –
  ne-mapAdmin exportuje jen CC licence + vlastní/ přiřazené taxony.
- Importy validují `canContributeInto(project)`.
- `getUsersMinimal` vrací jen id + jméno (bez e-mailů); kompletní seznam uživatelů
  je sysAdmin-only.

**Frontend**

- Jediný HTTP klient (`apiClient.ts`) – centrální místo pro 401/403/errors.
- Žádné `localStorage`/`sessionStorage` (žádné tokeny v prohlížeči).
- React default escapování všude; `dangerouslySetInnerHTML` jen v jednom
  zdokumentovaném komponentu pro backend-trusted HTML (`RichTextMessage.tsx`).
- Komentáře záznamů renderované jako plain text (ne-HTML) – žádný stored XSS
  od běžných uživatelů.

**Aplikační vrstva**

- Ebean ORM dotazy parametrizované (`RecordStatistics`, `MapDetailService`
  `setParameter` vzor); vyhledávání záznamů (`PageSearchService`) i bibliografické
  vyhledávání (`ReactBiblioSearchService`) váží uživatelské vstupy výhradně přes
  pojmenované parametry (regresní testy `PageSearchServiceShould`,
  `ReactBiblioSearchServiceShould`).
- Soubory ukládané do DB (bytea) – žádný filesystem path traversal; ZIP se pouze
  vytváří (nikdy nerozbaluje) – žádný zip-slip.
- `AllowedHostsFilter` s produkčními doménami; SecurityHeadersFilter aktivní
  (X-Frame-Options: DENY, nosniff, Referrer-Policy).
- API endpointy pro mapy (`/api/*`) za Bearer tokeny; `/assets` přes Play Assets
  (path-traversal safe).
- Aktivity uživatelů auditované (`UserActivityService`, včetně GeoServer dotazů).

## 8. Checklist před produkcí

Minimální kroky pro bezpečné uvedení do produkce (v pořadí doporučené priority):

- [ ] **H2** – vlastnictví dočasných souborů (user_id + kontrola)
- [ ] **Tajemství** – produkci externě dodat `play.http.secret.key` (novou hodnotou),
  SMTP heslo a DES `secretKey` (pokud poběží migrace hesel); staré hodnoty zůstávají
  v git historii → při nasazení rotovat, nerecyklovat
- [ ] **M4** – `play.http.session.secure = true` + HSTS na reverse proxy
- [ ] **M5** – rate limiting přihlašování (filtr, nebo limit na reverse proxy)
- [ ] **M2** – min. délka hesla ≥ 10, SecureRandom generátor, heslo mimo API odpověď
- [ ] **M8** – `mail.smtp.ssl.trust` na konkrétní host
- [ ] **M10** – `logger.application = INFO`, generické chybové hlášky
- [ ] **M6** – upgrade POI/commons-text/guava/pgjdbc + OWASP dependency-check do CI
- [ ] **M7** – whitelist GeoServer proxy cest
- [ ] ověřit HTTPS termination, zálohy DB a monitorování (mimo rozsah auditu)

Po nasazení (krátkodobý horizont): M9, M11, L1–L2, L4–L6.

## 9. Metodika, předpoklady a limity

- **Metoda:** statická analýza (code review) backendu `app/`, konfigurací `conf/`,
  frontendu `frontend/src/` a `build.sbt`; ověření výchozích hodnot Play Framework
  3.0.x proti oficiální dokumentaci (Filters, SecurityHeaders, SettingsSession,
  ApplicationSecret). Dne 24. 10. 2026 proběhla revize dokumentu: všechna zjištění
  znovu ověřena proti revizi `68a7fe1`, vyřešená zjištění z dokumentu odstraněna
  (ID zbývajících zachována – proto mezery v číslování). Neproběhlo dynamické
  testování (DAST/penetrace), fuzzing ani review infrastruktury (reverse proxy,
  DB, GeoServer, OS).
- **Předpoklady:** repozitář je privátní; produkce běží za HTTPS termination proxy
  na doménách z `play.filters.hosts.allowed`; databázové přihlašovací údaje i
  zbývající tajemství (`play.http.secret.key`, `secretKey`, `mail.password`) se
  zadávají mimo repo – v `conf/*.conf` jsou záměrně prázdné hodnoty (prázdný
  `play.http.secret.key` by znamenal, že aplikace vůbec nenastartuje – HS256 vyžaduje
  klíč ≥ 256 bitů).
- **Limity:** zjištění M6 (CVE) vychází z verzí závislostí v době auditu – doporučuji
  ověřit aktuálnost nástrojem OWASP dependency-check. Zjištění byla ověřena čtením
  kódu, nikoli aktivním zneužitím (etika; aplikace nebyla testována proti živé
  instanci).
- **Odkazy na interní dokumentaci:** autorizační matice endpointů –
  `docs/rules_backend.md`; známé gotchasy – `docs/gotchas.md`.
