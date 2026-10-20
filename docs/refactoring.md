# Refactoring frontendu – cesta k enterprise kvalitě

**Status:** návrh k realizaci · **Průzkum kódu:** 20. 10. 2026, git `4e7fe33` · **Rozsah:** `frontend/src`

Report rozpracovává pět oblastí zadaných týmem (sekce **A–E**) a sedm dalších, které průzkum kódu odhalil (sekce **F–L**). Každá sekce má jednotnou strukturu: **Současný stav** (s důkazy – cesty a ověřená fakta), **Návrh**, **Kroky**, **Rizika**, **Hotovo, když**. Závěr přináší doporučené pořadí realizace a explicitní seznam toho, co dělat nechceme (YAGNI, viz [`docs/seniorDeveloper.md`](./seniorDeveloper.md)).

## Obsah

1. [Současný stav v číslech](#1-současný-stav-v-číslech)
2. [Přehled priorit](#2-přehled-priorit)
3. [A – Heartbeat pro zprávy o stavu instance](#a--heartbeat-pro-zprávy-o-stavu-instance)
4. [B – Mechanismus předávání rolí uživatele](#b--mechanismus-předávání-rolí-uživatele)
5. [C – Dokončení převodu na čistý TypeScript](#c--dokončení-převodu-na-čistý-typescript)
6. [D – Vyčlenění service aplikační logiky od komponent](#d--vyčlenění-service-aplikační-logiky-od-komponent)
7. [E – Přechod na fetch namísto DOM formulářů](#e--přechod-na-fetch-namísto-dom-formulářů)
8. [F – Globální notifikační systém (flash/toast)](#f--globální-notifikační-systém-flashtoast)
9. [G – Globální error handling strategie](#g--globální-error-handling-strategie)
10. [H – Dekompozice a deduplikace velkých komponent](#h--dekompozice-a-deduplikace-velkých-komponent)
11. [I – Testovací infrastruktura](#i--testovací-infrastruktura)
12. [J – Type-safety a audit i18n klíčů](#j--type-safety-a-audit-i18n-klíčů)
13. [K – Konzistence UX primitiv](#k--konzistence-ux-primitiv)
14. [L – Konzistentní pravidla pro state management](#l--konzistentní-pravidla-pro-state-management)
15. [Doporučené pořadí realizace](#15-doporučené-pořadí-realizace)
16. [Co záměrně nedělat (YAGNI)](#16-co-záměrně-nedělat-yagni)

---

## 1. Současný stav v číslech

| Metrika | Hodnota | Poznámka |
|---|---|---|
| Soubory TypeScript (`.ts` + `.tsx`) | 282 (126 + 156) | strict mode, ESLint 9 (flat config) |
| Soubory JavaScript k převedení | 17 (16 `.jsx` + 1 `.js`) | přesný seznam v sekci C |
| Volání `fetch()` | 118 | rozházena po komponentách a hookách |
| Soubory importující axios | 22 | dvojkolejní HTTP klienti |
| Testy | 0 | v `package.json` není ani runner |
| React ErrorBoundary | 0 | runtime chyba v renderu odmontuje celou SPA |
| `console.error` bez uživatelské hlášky | 60 | |
| `dangerouslySetInnerHTML` | 22 | převážně backendové chybové hlášky |
| `window.alert` / `window.confirm` | 9 | nekonzistentní UX |
| Největší komponenty | 1121 / 970 / 607 řádků | `SearchForm.tsx`, `BulkEdit.tsx`, `Layer.tsx` |
| CI pro frontend | není | `.github/workflows` obsahuje jen `publish.yml` (Docker image) |

Dobrá zpráva: technologický základ je zdravý (React 19, Vite 7, strict TypeScript, SCSS + Bootstrap 5) a v novějším kódu už existuje vzorová feature-struktura – `components/atlas/import/` s `components/`, `hooks/`, `types.ts` a `components/atlas/search/bulkEditApi.ts` jako lokální API modul. Problémy jsou **systémové**: chybí izolační vrstvy mezi komponentami a backendem (jeden API klient, notifikace, error handling), část kódu je stále v JS a několik velkých komponent kumuluje více odpovědností.

## 2. Přehled priorit

| Oblast | Priorita | Odhad | Klíčová závislost |
|---|---|---|---|
| C – TypeScript | vysoká | 2–3 dny | – |
| D – Service vrstva + API klient | vysoká | 5–8 dní | ideálně po C |
| A – Heartbeat | vysoká | 1–2 dny | D (401 handling) |
| G – Error handling | vysoká | 1–2 dny | D |
| F – Notifikace | střední | 1–2 dny | – |
| B – Role | střední | 2–3 dny | D, A (refresh rolí) |
| E – Formuláře → fetch | střední | 2–3 dny | D |
| H – Dekompozice | střední | průběžně | – |
| I – Testy | střední | 2–3 dny | ideálně společně s D |
| J – i18n | nízká | ½ dne | – |
| K – UX konzistence | nízká | 1 den | F |
| L – State management | nízká | ½ dne | F |

---

## A – Heartbeat pro zprávy o stavu instance

**Současný stav.** Jediným „heartbeatem" aplikace je `core/FlashMessages.tsx`: `setInterval` každých 30 s volá `GET /api/react/infoGlobal` (backend `app/controllers/common/ConfigController.infoGlobal` vrací seznam aktivních zpráv typu `Maintenance`). Implementace má šest konkrétních nedostatků:

1. **Poll běží i ve skryté záložce** – každý otevřený tab bije backend každých 30 s, i když ho uživatel nevidí.
2. **Žádný backoff** – když backend nedostupný, interval dále bije; a po jednorázové chybě se provede `setMessages([])` – zpráva „dnes údržba 14:00" z UI zmizí kvůli hiccupu sítě.
3. **`key={idx}`** – React po změně pořadí považuje zprávy za jiné elementy (antipattern, zbytečné remountování).
4. **Neřeší 401** – vypršení session se projeví jako tichá network error; uživatel zůstane v rozbité SPA bez přesměrování na login.
5. **Dva paralelní mechanismy pro globální texty** – `context/ProjectNameContext.jsx` samostatně fetchuje `/api/react/playmessage/project_name` při každé změně jazyka (a HTML odstraňuje přes `document.createElement` v komponentě).
6. **Přiznaná mezera v kódu** – komentář ve `FlashMessages.tsx`: „used only for global info (like server maintenance), for immediately flashing use new component". Ta „immediate flash" komponenta neexistuje (viz sekce F).

**Návrh.** Vytvořit `hooks/useInstanceMessages.ts` jako jediného majitele pollingu zpráv o stavu instance:

- **Respekt k viditelnosti:** posluchač `visibilitychange`; při `document.hidden` se interval pozastaví, při návratu do záložky se ihned provede jeden tik.
- **Exponenciální backoff:** po selhání se interval prodlužuje (30 s → 1 min → 2 min → 5 min strop), po úspěchu reset. Selhání nesmaže poslední známé zprávy – až po třech po sobě jdoucích selháních se zobrazí „zprávy o stavu instance jsou nedostupné".
- **Stabilní identity zpráv:** klíč odvozený z obsahu (`type` + `text`), ne z indexu v poli.
- **401 → přesměrování na `/login`** (backend route; jednotně se sekcí G a D).
- Typ `InstanceMessage { type: "success" | "danger" | "warning" | "info"; text: string }` se přesune do `models/` – komponenta ho dnes definuje inline lokálně.
- `FlashMessages.tsx` se stane **prezentní komponentou** (props `messages`) – žádný vlastní fetch ani interval.

Backendové rozhraní neměníme: `infoGlobal` vrací pole bez `JsonResult` obálky. To je zdokumentovaná výjimka ([`docs/gotchas.md`](./gotchas.md)) – apiClient ji zapouzdří (sekce D), ale „neopraví".

**Kroky.**
1. `models/InstanceMessage.ts` – typ + parser odpovědi.
2. `hooks/useInstanceMessages.ts` – visibility, backoff, 401 handling; testy na fake timerech (sekce I).
3. `FlashMessages.tsx` → prezentní komponenta konzumující hook.
4. Volitelně: `ProjectNameContext` převést na stejný vzor (fetch v hooku s `AbortController`) nebo sloučit do jediného „instance ticku".
5. Doplnit `docs/gotchas.md` o chování heartbeatu.

**Rizika.** Změna chování při výpadku (dnes zprávy zmizí ihned, navrženo zůstávají) – záměrné zlepšení, ale viditelná změna pro uživatele. Interval 30 s zachovat jako výchozí; endpoint je levný (čte `MaintenanceMessageUtils.getMessage()`).

**Hotovo, když.** (a) v Network tabu se po přepnutí na jinou tab požadavky zastaví a po návratu okamžitě obnoví; (b) při zastaveném backendu interval exponenciálně zpomalí a UI neztratí poslední zprávy; (c) po vypršení session následuje přesměrování na login místo tiché chyby.

---

## B – Mechanismus předávání rolí uživatele

**Současný stav.** Role se načtou **jednou při startu SPA**: `App.tsx` zavolá `GET /api/react/config` (backend `ConfigController.config`, zdroj `UserRole.keysOf(user)`), výsledek poteče do `UserContext`, který z něj vytvoří instanci třídy `models/User.ts`. Konzumace probíhá třemi cestami: `components/ProtectedRoute.tsx` (`requiredRole` / `requiredRoles` s OR logikou), `core/MainMenu.tsx` (getry `isMapAdmin`, `isTraitAdmin`, `isSysAdmin`, …) a jednotlivé komponenty přes `useUser()`. Základ je správný – **role vlastní backend, frontend je jen zrcadlí** (pravidlo v [`docs/gotchas.md`](./gotchas.md)). Konkrétní problémy:

1. **Netypovaná hranice API:** `AppConfig.roles: string[]` v `App.tsx`. FE union `UserRole` v `models/User.ts` je ruční duplikát BE enumu `models.UserRole` – mohou driftovat: nová role na BE se na FE nepozná, `roles.includes(role)` tiše vrátí `false` a route se jen otevře/zavře bez varování.
2. **Přetypovávání:** `ProtectedRoute` přijímá `requiredRole?: string` a interně dělá `role as UserRole` – překlep v názvu role v route definici neodhalí kompilátor ani runtime. Stejně tak `requiredModule?: string` se porovnává holými stringy.
3. **Hardcoded if-řetězce pro moduly:** v `ProtectedRoute` se třikrát opakuje vzor `if (requiredModule === "atlas" && !hasAtlasModule) …` – přidání nového modulu vyžaduje úpravu komponenty místo dat.
4. **Role zamrzlé na celou session:** admin mezitím změnil uživateli role, ale SPA je vidí až po F5. Pro malý tým akceptovatelné, enterprise úroveň to řeší.
5. **Mrtvá role:** `biblioAdmin` je v unionu a getru `isBiblioAdmin`, ale kromě checkboxu v administraci uživatelů se nikde nepoužívá – dojem funkčnosti, kterou nic nekonzumuje.

**Návrh.**

1. **Jeden zdroj pravdy pro názvy rolí na FE:** `models/UserRole.ts` s `export const USER_ROLES = ["mapAdmin", "traitAdmin", "taxonAdmin", "measurementsAdmin", "biblioAdmin", "mapUser", "biblioUser", "asyncImporter", "sysAdmin"] as const; export type UserRole = (typeof USER_ROLES)[number];` plus parser `parseRoles(raw: string[]): UserRole[]`, který neznámou roli zaloguje (`console.warn`) a zahodí. Při parsování `/api/react/config` (v apiClientu, sekce D) tak vznikne **runtime kontrola driftu BE ↔ FE**.
2. **Typované `ProtectedRoute`:** `requiredRole?: UserRole`, `requiredRoles?: readonly UserRole[]` – `as UserRole` zmizí a route definice v `App.tsx` jsou compile-time kontrolované (překlep `sysadmin` místo `sysAdmin` se rozsvítí v IDE).
3. **Moduly deklarativně:** v `models/InstanceConfig.ts` metoda `hasModule(m: "atlas" | "biblio" | "measurements"): boolean` – `ProtectedRoute` se zeptá jednou; přidání modulu = jeden řádek v mapě, ne úprava komponenty.
4. **Refresh rolí (až po sekci A):** heartbeat může při tiku ověřit i `/api/react/config`; při změně `roles[]` je nejrozumnější provést plný reload okna (`window.location.reload()`) – nejmenší kód a vždy konzistentní stav, nikdy neskončí v režimu „polovina UI podle starých rolí".

**Kroky.**
1. `USER_ROLES` konstanta + `parseRoles` (součást D).
2. Přetypování `ProtectedRoute` a route definic v `App.tsx`; odstranění `as UserRole`.
3. `InstanceConfig.hasModule()` a zjednodušení `ProtectedRoute`.
4. Volitelně: refresh rolí v heartbeatu (závisí na A).
5. Rozhodnout osud `biblioAdmin` – buď ji začít používat, nebo odebrat z FE a z administrace (na BE zůstává).

**Rizika.** Přetypování je zpětně kompatibilní (literály sedí na union). Refresh rolí mění chování za běhu – zavádět až po A a G a otestovat scénář „odebrání role pod rukama". Pozor na to, že BE posílá role vždy malými písmeny – parser to musí respektovat.

**Hotovo, když.** `grep -rn "as UserRole" src` vrací 0; v `App.tsx` nejde zapsat překlep v názvu role bez chyby kompilace; neznámá role z backendu se při startu zaloguje do konzole.

---

## C – Dokončení převodu na čistý TypeScript

**Současný stav.** Zbývá **17 souborů** (16 `.jsx` + 1 `.js`). Přesný seznam:

| Oblast | Soubory |
|---|---|
| `src/context/` | `InstanceConfigContext.jsx`, `ProjectNameContext.jsx` |
| `src/hooks/` | `useNavOffset.jsx`, `usePageTitle.jsx`, `useUserSettings.js` |
| `src/pages/atlasAdmin/` | `ListOfImports.jsx`, `ListOfTaxa.jsx`, `ListOfTaxaSubtree.jsx`, `ListOfUsers.jsx`, `Preslia.jsx`, `UploadFile.jsx` |
| `src/pages/user/` | `AddUser.jsx`, `ChangeEmail.jsx`, `ChangePassword.jsx`, `Docs.jsx`, `Settings.jsx`, `UsersAdministration.jsx` |

Konverze je **nízkoriziková**: všechny komponenty, které tyto stránky importují (`components/settings/*`, `components/user/*`, `components/atlasAdmin/*`), už jsou TSX s typovanými props. K samotnému zbytku JS vrstvy se váží tři systémové závady:

1. **Matoucí import přípony:** `index.tsx` importuje `./App.jsx`, `App.tsx` importuje `./Layout.jsx` – oba cíle jsou ve skutečnosti `.tsx`. `Layout.tsx` navíc importuje `./core/FlashMessages.jsx` a `App.tsx` lazy-importuje např. `./pages/atlas/NewComments.jsx` (opět `.tsx`). Funguje to **jen díky Vite fallbacku** `.jsx → .tsx`; v kódu se přitom míchají tři styly importů (s příponou `.tsx`, s chybnou `.jsx`, bez přípony). Je to křehké (jiný bundler/nástroj import nerozvine) a matoucí pro každého nového vývojáře.
2. **`allowJs: true`** v `tsconfig.app.json` – kompilátor do budoucna neprotestuje proti novým JS souborům; chybí guard proti regresi.
3. **Drift dokumentace:** [`docs/conventions.md`](./conventions.md) deklaruje aliasy `@types`, `@services/api`, `@hooks/…`, `@components/…`, `@pages/…`, ale `vite.config.ts` i `tsconfig.app.json` definují **pouze `@/*`**. Vývojář postupující podle dokumentace napíše import, který nefunguje. (Složka `src/services/` navíc v dokumentaci figuruje, ale neexistuje – vznikne v sekci D.)

**Návrh a kroky.**

1. **Převést 17 souborů po smysluplných celcích** (jeden PR = jedna oblast, po každém `npm run build`):
   - *hooks + contexts (5 souborů):* mechanické. U `useUserSettings.js` dopsat typy callbacků (`onSettingSaved?: (…) => void` místo defaultu `null`); u kontextů `createContext<InstanceConfig | null>(null)` a typované návraty vlastních hooků (`useInstanceConfig()` vrátí `InstanceConfig`, ne možný `null` bez kontroly).
   - *pages/user (6):* jednoduché formulářové stránky; převod zkombinovat se sekcí E (controlled inputs) a sekcí D (`settingsApi`), aby se každý soubor nedotkl třikrát.
   - *pages/atlasAdmin (6):* nejrozsáhlejší; `ListOfTaxa.jsx` sdílí logiku s `atlas/taxaList` (viz H – deduplikace).
2. **Sjednotit importy bez přípon:** `./App`, `./Layout`, `./core/FlashMessages`, `./pages/atlas/NewComments` – odstraní se jak chybné `.jsx`, tak smíšené `.tsx` přípony (Vite i `tsc` je s `moduleResolution: bundler` řeší bez přípon).
3. **Vypnout `allowJs`** – a tím získat trvalou záruku, že se JS do `src/` už nevrátí.
4. **Srovnat dokumentaci s realitou:** v `docs/conventions.md` buď doplnit skutečně používané aliasy do `vite.config.ts` + `tsconfig.app.json`, nebo dokumentaci omezit na existující `@/*`. Nedokumentované aliasy nepřidávat „pro jistotu".
5. **Guard v CI:** krok kontrolující `find src -name '*.jsx' -o -name '*.js'` s prázdným výsledkem (součást workflow ze sekce I).

**Rizika.** Minimální – jde o lokální změny bez běhové logiky; kompilátor s `strict`, `verbatimModuleSyntax` a `erasableSyntaxOnly` odhalí nepřesnosti. Jediné skutečné riziko je lidské: plošný „big bang" převod v jednom PR. Proto po malých celcích.

**Hotovo, když.** `find frontend/src \( -name '*.js' -o -name '*.jsx' \)` vrací prázdný výstup; `allowJs: false`; `grep -rn "\.jsx" src --include='*.tsx'` nenajde žádný import; build i lint prochází; sekce o importech v `conventions.md` odpovídá skutečnosti.

---

## D – Vyčlenění service aplikační logiky od komponent

**Současný stav.** Složka `src/services/` neexistuje – přestože ji [`docs/conventions.md`](./conventions.md) zmiňuje jako konvenci. HTTP komunikace je fragmentovaná:

- **118 volání `fetch()`** rozházených po komponentách a hookách – každé si samo staví hlavičky, parsuje odpověď, řeší chyby (většinou `console.error`, viz G).
- **22 souborů používá axios** (`useTableData.ts`, `useProjectLayers.ts`, `useExcelExport.ts`, mapové InfoPanely, `useTaxaData`, `PngUploadButton` a další) – aplikace má **dva paralelní HTTP klienty** s odlišnou sémantikou chyb (axios vyhazuje `AxiosError`, fetch `TypeError`).
- `JsonResult` obálku (`{success, data|message|error}`) parsuje každý konzument sám; existující model `models/ApiResponse.ts` se nepoužívá systematicky.
- Backendové zvláštnosti zdokumentované v [`docs/gotchas.md`](./gotchas.md) (TraitsController vrací čistý string, import-error hlášky obsahují HTML odkaz, souborové odpovědi s JSON chybou uvnitř, LF vs CRLF u taxon seznamů) zná a řeší jen ta komponenta, která si je jednou „odbyla" – nová komponenta je musí znovu objevit.

**Návrh.**

1. **`src/services/apiClient.ts` – jediný HTTP klient** postavený na `fetch`:

   ```ts
   apiGet<T>(url, opts?): Promise<T>        // + apiPost/apiPut/apiPatch/apiDelete
   ```

   - jednotné parsování `JsonResult` obálky a typ `ApiResult<T>` (`models/ApiResponse.ts` rozšíří o `error`/`message`);
   - centrální reakce na **401 → přesměrování na `/login`** a **403 → notifikace** (sekce F, G);
   - helpery pro souborové odpovědi (blob + kontrola `Content-Type`, getcha s JSON chybou ve streamu) a pro `application/x-www-form-urlencoded` POST (getcha LF – backend splituje na `\R`);
   - známé výjimky zapouzdřené a pojmenované (např. `apiGetLegacyString` pro TraitsController), aby se gotcha už nikam nekopírovala;
   - podpora `AbortSignal` – `useTableData` už dnes používá `AbortController`, axios se tam ručně shimuje.

2. **`src/services/*.ts` – doménové service moduly** (`userApi.ts`, `settingsApi.ts`, `taxonApi.ts`, `traitApi.ts`, `recordApi.ts`, `importApi.ts`, `mapApi.ts`…). Funkce s typovanými parametry a návratovými typy z `models/`. Hook a komponenta pak **nezná URL ani tvar požadavku** – jen `loadTraits(ids, {signal})`. Vzor už v kódu existuje: `components/atlas/search/bulkEditApi.ts`; přesunout jej do `services/` jako etalon.

3. **Migrace axios → apiClient po hookách.** `useTableData.ts` jako první (je sdílený celou rodinou DataTable komponent – jedna změna pokryje většinu tabulek), poté `useProjectLayers`, mapové panely a zbylé hooky. Na závěr **odebrat axios z `package.json`** (−1 runtime dependency; vše, co axios v kódu dělá, fetch pokrývá).

4. **Zachovat feature-foldery** podle vzoru `components/atlas/import/` (components/hooks/types.ts); api moduly per doména, hooky per feature.

**Kroky (pořadí).**
1. `apiClient.ts` + unit testy (sekce I) – envelope, 401/403, blob, urlencoded.
2. `settingsApi.ts` + převod Settings stránky (spolu s C).
3. `useTableData.ts` na apiClient (nejširší dopad).
4. Postupně zbylých 20 axios souborů a 118 fetch míst – stahovat do services při každé úpravě souboru, soupis vést v [`docs/todo.md`](./todo.md).
5. Odebrání axiosu, aktualizace `conventions.md` (sekce o fetch/axios nahradit apiClient).

**Rizika.** (a) Detekce zrušení requestu: axios `isCancel`/`CanceledError` nahradit kontrolou `err.name === "AbortError"` (DOMException z fetch). (b) Ne všechny odpovědi jdou přes `JsonResult` – klient musí výjimky tolerovat, ne „opravovat". (c) Instalační hlášky u uploadů s progresí používají XHR (`PngUploadButton`) – ty nechat, jen je izolovat do jednoho helperu. (d) Při migraci `useTableData` testovat na jedné tabulce před rolloutem na všechny.

**Hotovo, když.** `grep -rn "axios" src frontend/package.json` vrací 0; přímé `fetch(` mimo `src/services/` (a upload helper) neexistuje; parsování `JsonResult` je na jediném místě; nová backendová gotcha se řeší jedním zásahem v apiClientu, ne v komponentách.

---

## E – Přechod na fetch namísto DOM formulářů

**Současný stav.** Samotné `fetch` volání už dnes aplikace používá – problém není „formulář vs. fetch", ale způsob, jakým formuláře čtou data. Konkrétně:

- **Zbývající `<form>` elementy (3):** `pages/measurements/Export.tsx` (`onSubmit` → `new FormData(event.currentTarget)` → `URLSearchParams` → fetch), `pages/measurements/FeatureDetail.tsx` (form wrapper kolem `TraitUpload` – upload komponenta si submit řeší sama, form je tu jen kvůli `Enter`) a `components/atlas/search/SearchForm.tsx` (submit čte radio `export_type` z DOM).
- **User stránky** (`AddUser.jsx`, `ChangePassword.jsx`, `ChangeEmail.jsx`, `Settings.jsx`) posílají přes fetch, ale hodnoty čtou z DOM až v okamžiku submitu (uncontrolled inputs).
- Důsledky uncontrolled přístupu: **nelze průběžně validovat** (chybu odhalí až backend), disabled stav submit tlačítka se řeší oklikou, reset formuláře po úspěchu vyžaduje `event.currentTarget.reset()` místo resetu stavu, hodnoty nelze předvyplvit programově a s TypeScriptem se ztrácí typová kontrola (všechno `string | undefined` z `FormData.get`).

Pozor na hranici: **multipart uploady (`useImportCSVData`, `PngUploadButton`, `useTaxonUpdates` aj.) musí `FormData` používat nadále** – tam je to správný nástroj. Cílem této sekce je jen čtení *uživatelem zadaných hodnot* z DOM.

**Návrh.**

1. **Controlled komponenty:** stav (`useState`) pro každé pole; `onSubmit` jen `event.preventDefault()` + volání service funkce (sekce D). Hodnoty jsou v Reactu zdrojem pravdy, validaci lze dělat průběžně a typy k tomu má TS.
2. **`Export.tsx`:** seznamy `traitIds`/`ranks`/`entryTypes` už dnes žijí v podřízených komponentách (`ExportTraitList` a spol.) a skládají se v handleru – FormData roundtrip nahradit React statem a jedním `apiPost` s urlencoded body. **Pozor:** zachovat přesné názvy parametrů (`traitIds[]`, `ranks[]`…) a LF sémantiku – ekvivalence ověřit diffem requestu v Network tabu před/po.
3. **`SearchForm.tsx`:** radio `export_type` držet ve stavu; submit button volat handler přímo (bez `type="submit"` na elementu, který má dělat něco jiného, než odesílá formulář).
4. **`FeatureDetail.tsx`:** `<form>` wrapper odstranit – `TraitUpload` má vlastní submit logiku; Enter-to-submit zde není potřeba.
5. **User stránky:** převod na controlled spojit s TS migrací (sekce C) a `settingsApi`/`userApi` (sekce D) – jeden zásah per soubor.
6. Element `<form>` ponechat jen tam, kde přináší přidanou hodnotu (odeslání Enterem u jednopolových formulářů) – vždy ale s controlled state, nikdy s čtením z `FormData`.

**Kroky.** Pořadí: `FeatureDetail` (odstranění, 15 min) → `SearchForm` (spolu s H) → `Export` (spolu s D) → user stránky (spolu s C).

**Rizika.** Regrese v přesném tvaru requestů – u Exportu povinný Network diff; u user stránek riziko mizivé (jednoduché fieldy). Při převodu SearchForm pozor na 1121 řádků – dělat v rámci dekompozice (H), ne plošným přepisem.

**Hotovo, když.** `grep -rn "new FormData" src` najde jen multipart uploady; `grep -rn 'event.currentTarget.reset\|FormData(event' src` vrací 0; všechny submity procházejí apiClientem; chování v Network tabu identické před/po.

---

## F – Globální notifikační systém (flash/toast)

**Současný stav.** Každá stránka si drží vlastní lokální flash state: `useState<Flash | null>` je v 7 souborech (`Export.tsx`, `FeatureDetail.tsx`, `TraitTable.tsx`, `BackupForm.tsx`, `ListOfControls.tsx`, `MapUsers.tsx`, `ImportsList.tsx`) a stejný vzor se opakuje i v JSX stránkách. Model `models/Flash.ts` zná jen `success | danger`. `core/FlashMessages.tsx` je vyhrazený pouze pro persistní zprávy o údržbě (polling, sekce A). Důsledky: duplikovaný Alert rendering a `onClose` handler v desítkách míst, nekonzistentní chování (jiné timeouty, jinde nedismissibilní), success hláška zmizí při navigaci, současně běžící hlášky nelze koordinovat a komentář ve `FlashMessages.tsx` volá po „immediate flash" komponentě, která neexistuje.

**Návrh.** Jeden notifikační subsystém postavený na **zustand** (už je v dependencích – používá ho `layerStore.ts`; žádná nová knihovna):

- `stores/notificationStore.ts`: `push({ type, message, html?, timeout? })`, auto-dismiss s default timeoutem (danger bez timeoutu), `dismiss(id)`.
- Komponenta `<Toasts />` v `Layout.tsx` vedle `FlashMessages` (ty zůstávají pro persistní maintenance zprávy – odlišný typ obsahu, odlišné chování).
- `useNotifications()` hook; service vrstva (D) a apiClient (403, síťové chyby) hlásí centrálně.
- Varianta s HTML obsahem (`html?: string`) pro backendové hlášky s odkazy (getcha z `gotchas.md`) – jediné místo s `dangerouslySetInnerHTML` v notifikacích (viz K).
- Rozšířit typy o `warning`/`info` (v souladu s `InstanceMessage` ze sekce A).

**Kroky.** 1) store + `<Toasts />`; 2) migrace 7 TSX souborů (mechanické nahrazení `useState<Flash>`); 3) napojení apiClientu; 4) JSX stránky při konverzi (C).

**Rizika.** Nízká – čistě aditivní. Jen definovat a dodržet rozhraní (kdo smí volat `push` – ideálně jen services a explicitní user akce).

**Hotovo, když.** `grep -rn "useState<Flash" src` vrací 0; hláška z apiClientu se zobrazí bez práce komponenty; notifikace přežijí navigaci mezi routes.

---

## G – Globální error handling strategie

**Současný stav.**

1. **Žádný React ErrorBoundary** – neodchycená chyba v renderu odmontuje celý React strom; uživatel vidí bílou stránku bez možnosti obnovy.
2. **60× `console.error`** bez uživatelské zpětné vazby – akce selže, UI mlčí.
3. **Vypršení session:** fetch vrátí 401 (nebo backend redirect), komponenta zahlásí generickou network error; jednotná reakce neexistuje (login je backend route `/login`, ne SPA route).
4. **9× `window.confirm`** – nativní dialogy, blokující, nelokalizovatelné, vizuálně cizí aplikaci.
5. Složené riziko: `dangerouslySetInnerHTML` (22×) většinou u backendových chybových hlášek.

**Návrh.**

1. **`components/ErrorBoundary.tsx`** (class component – jediný legitimní případ class komponenty v Reactu): `componentDidCatch` → console.error + volitelný report; fallback UI s tlačítkem „Obnovit stránku". Použít dvakrát:
   - v `Layout.tsx` kolem `<Outlet />` (obnoví se jen obsah, ne menu),
   - v `App.tsx` kolem `Suspense` lazy-loading fallbacků (chybný chunk po deploy → reload místo bílé stránky).
2. **Centrální 401/403 v apiClientu** (sekce D): 401 → `window.location.href = "/login"`; 403 → notifikace „Nemáte oprávnění k této akci."
3. **Konvence do `conventions.md`:** každá user-facing akce, která může selhat, musí zobrazit notifikaci (F); `console.error` je pro vývojáře, ne pro uživatele – nikdy jako jediná reakce.
4. `window.confirm` nahradit react-bootstrap `Modal` s potvrzovacím tlačítkem (destruktivní akce typu mazání taxona/importu) – viz K.
5. Chyby z komponent nechat probublat do boundary; ne každý `try/catch` v UI polykat do notifikace – boundary je pro neočekávané, notifikace pro očekávatelné (403, validace, sítě).

**Kroky.** 1) ErrorBoundary + fallback UI; 2) 401/403 v apiClientu (součást D); 3) konvence do dokumentace; 4) postupná náhrada `window.confirm`.

**Rizika.** Redirect na 401 musí respektovat backend flow (login je server-rendered); otestovat v běžícím prostředí. ErrorBoundary nemůže chytat chyby v event handlerech a asynchronním kódu – proto dvojice boundary + notifikace, ne boundary samotná.

**Hotovo, když.** chyba vyhozená v renderu kterékoli stránky zobrazí fallback UI s možností obnovy; vypršení session přesměruje na login; `grep -rn "window.confirm" src` vrací 0.

---

## H – Dekompozice a deduplikace velkých komponent

**Současný stav.** Největší soubory: `components/atlas/search/SearchForm.tsx` (1121 řádků), `components/atlas/search/BulkEdit.tsx` (970), `core/mapLayers/Layer.tsx` (607), `core/dataTable/PladiasRecordsTable.tsx` (517), `components/mapDetail/SquaresOverlay.tsx` (512), `components/mapDetail/MapComponent.tsx` (442), `components/mapMain/InfoPanel.tsx` (397). Tyto komponenty kumulují data fetching + UI + permission logiku + obchodní pravidla. K tomu **duplikované feature foldery**: `components/atlas/taxaList/` a `components/atlasAdmin/taxaList/` si sdílí téměř totožné `hooks/useTaxaData.ts`, `hooks/useTaxonUpdates.ts` a `PngUploadButton.tsx` – každá bugfix se musí dělat dvakrát.

**Návrh.** Ne přepis „big bangem", ale **průběžná dekompozice při každé úpravě dotčeného souboru** (chirurgické změny dle `docs/seniorDeveloper.md`):

- `SearchForm.tsx` → subkomponenty (`FilterSection`, `ExportControls`, `ResultOptions` – šablona už existuje: `components/atlas/search/components/`) + hook `useSearchFilters`; fetch logika jde do `searchApi` (D).
- `BulkEdit.tsx` → `bulkEditApi.ts` už existuje; doplnit `useBulkEditOperations` a oddělit tabulkovou prezentaci.
- `Layer.tsx`, `PladiasRecordsTable.tsx`, `SquaresOverlay.tsx` → oddělit datovou přípravu (čisté funkce do `utils/`) od renderu – čisté funkce jsou testovatelné bez DOM (I).
- **Deduplikace `taxaList`:** jedna parametrizovaná implementace v `components/atlas/taxaList/` s prop `adminMode: boolean`; `atlasAdmin` variantu smazat. Zkontrolovat stejné duály `importsList`/`mapUsers`.

**Kroky.** Při každé úpravě velkého souboru: (1) identifikovat směr (data/UI), (2) extrahovat, (3) typované props, (4) build + lint. Deduplikaci taxaList udělat jako samostatný PR s vizuálním porovnáním obou variant.

**Rizika.** Přejmenování a přesuny souborů kazí `git blame` – dělat extrakce atomicky a jen když soubor stejně editujeme. Deduplikace atlasAdmin/atlas taxalist vyžaduje pozornost: admin varianta má navíc upload tlačítka a editaci.

**Hotovo, když.** žádný komponentní soubor v `src/` nepřesahuje ~400 řádků; `atlasAdmin/taxaList` neobsahuje kopii `useTaxaData`/`useTaxonUpdates`/`PngUploadButton`.

---

## I – Testovací infrastruktura

**Současný stav.** 0 testů, 0 runneru; v `package.json` není ani `test` script. CI (`.github/workflows/publish.yml`) pouze builduje Docker image – **lint, build ani typová kontrola se v pipeline nespouští**. Jediná pojistka kvality je lokální pre-commit checklist v `conventions.md` (spoléhá na disciplínu).

**Návrh.** Minimální, ale užitečný základ:

1. **Vitest + @testing-library/react** (+ `jsdom` environment). Vybírám Vitest, protože sdílí konfiguraci s Vite (aliasy, transformace) – žádné druhé build nastavení.
2. **Priority testů podle ROI:**
   - `apiClient.ts` (D) – parsování obálky, 401/403 větve, blob helper, urlencoded s LF; čisté funkce → rychlé a stabilní testy;
   - `ProtectedRoute` + `parseRoles` (B) – rozhodování o viditelnosti routes je nejcitlivější logika aplikace;
   - `useInstanceMessages` (A) – fake timers (`vi.useFakeTimers()`), scénáře visibility a backoffu;
   - `useTableData` – mock fetch, abort po unmount;
   - smoke testy klíčových stránek (render bez crash) pro regresi wiringu.
3. **CI workflow** (nový `.github/workflows/frontend.yml`): `npm ci` → `npm run lint` → `npm run build` → `npm run test` na PR. Tím se do pipeline dostane i typová kontrola (`tsc -b` je součástí buildu) a guard ze sekce C.
4. Netestovat: vizuál (Screenshot testy), E2E (Playwright) – pro tým velikosti Pladiasu zbytečně drahé na údržbu, viz YAGNI.

**Kroky.** 1) instalace + konfigurace (`vite.config.ts` test blok nebo `vitest.config.ts`); 2) testy apiClientu spolu s D; 3) CI workflow; 4) postupné doplňování podle seznamu výše.

**Rizika.** Mockování `fetch` – preferovat `vi.stubGlobal`/MSW-like jednoduchý wrapper místo patchování knihovny. Udržovat rozsah malý; testy, které nikdo neupravuje při změně chování, jsou horší než žádné.

**Hotovo, když.** `npm run test` existuje, prochází v CI na každém PR; apiClient, ProtectedRoute a useInstanceMessages mají testy; coverage není metrikou cíle (měřením se nezabývat).

---

## J – Type-safety a audit i18n klíčů

**Současný stav.** Překlady v `locales/{cs,en,pl}/translation.json` (cs má 1187 řádků). Klíče se do kódu píší jako string (`t("...")`) – překlep nebo přejmenování klíče se v UI projeví jako vyrenderovaný anglický klíč, ničím se nezaloguje. Neexistuje audit nepoužitých a chybějících klíčů mezi jazyky (poslední commit na locales ukazuje drift cs ↔ en/pl).

**Návrh.**

1. **Type-safe klíče bez nové závislosti:** v `i18n.ts` natypovat zdroj cs jako zdroj pravdy:

   ```ts
   import cs from "./locales/cs/translation.json";
   declare module "i18next" {
       interface CustomTypeOptions {
           defaultNS: "translation";
           resources: { translation: typeof cs };
       }
   }
   ```

   Překlep v `t("...")` se od té chvíle rozsvítí v IDE a při `tsc -b`. Nulová runtime cena.
2. **Audit skript** (`scripts/check-i18n.mjs` nebo `npm run i18n:check`): (a) porovnání množin klíčů cs/en/pl (chybějící překlady vypsat), (b) hledání klíčů v kódu, které v JSON neexistují, a klíčů v JSON, které kód nepoužívá. Spouštět v CI (I). Bez nové dependency – prostý skript nad JSON.
3. Případné chybějící en/pl překlady doplnit po auditu; rozhodnout, zda `fallbackLng` má zůstat `"cs"` (dnes ano – produkt je primárně český).

**Kroky.** 1) `CustomTypeOptions` augmentace; 2) skript + CI; 3) oprava nálezů auditu.

**Rizika.** JSON import vyžaduje `resolveJsonModule` (typicky už zapnuto – ověřit v `tsconfig.app.json`). Audit „nepoužité klíče" může dávat false positives u dynamicky skládaných klíčů – skript musí mít allowlist.

**Hotovo, když.** `t("něco-špatně")` neprojde kompilací; `npm run i18n:check` v CI vrací 0 nálezů.

---

## K – Konzistence UX primitiv

**Současný stav.**

- **9× `window.alert` / `window.confirm`** – nativní dialogy vložené do Bootstrap UI (potvrzení mazání, chybové hlášky). Nelokalizovatelné pomocí i18n stylů, blokující, vizuálně cizí.
- **22× `dangerouslySetInnerHTML`** – převážně backendové hlášky (import chyby s odkazy – getcha) a `ProjectNameContext` odstraňující tagy přes `document.createElement("div")`. Každé použití je potenciální vektor XSS, pokud backend kdykoli pošle nevalidovaný obsah.
- Nekonzistentní ikonografie (Font Awesome vs. textová tlačítka), v jedné komponentě potvrzení přes Modal, jinde přes `confirm`.

**Návrh.**

1. `window.confirm` → sdílená komponenta `ConfirmDialog` (react-bootstrap `Modal`; react-bootstrap je v dependencích) s `useConfirm()` hookem vracejícím `Promise<boolean>` – volající kód zůstane imperativní (`if (await confirm(...)) deleteTaxon()`), UX konzistentní a lokalizovatelný.
2. `window.alert` → notifikace (sekce F).
3. `dangerouslySetInnerHTML` centralizovat: jediná komponenta `RichTextMessage` s `html` prop, použitá pouze tam, kde backend opravdu posílá HTML (import chyby, play messages). Zbytek míst převést na prostý text/children. Ponechat komentář o důvěryhodnosti vstupu (backend); případnou sanitizaci (DOMPurify) nechat jako volitelné vylepšení – **nezavádět novou dependency, dokud není potřeba prokázána**.
4. `key={idx}` antipatterny (A) nahradit stabilními klíči.

**Kroky.** 1) `ConfirmDialog` + `useConfirm`; 2) náhrada 9 výskytů; 3) `RichTextMessage` + postupné stahování 22 výskytů; 4) notifikace místo `alert`.

**Rizika.** Záměna imperativního `confirm` za promise-based flow může změnit pořadí vedlejších efektů – měnit po jednom výskytu s testem dané stránky.

**Hotovo, když.** `grep -rn "window.confirm\|window.alert" src` vrací 0; `dangerouslySetInnerHTML` je jen v `RichTextMessage` (a případně mapových popup templatech s komentářem).

---

## L – Konzistentní pravidla pro state management

**Současný stav.** Mix tří přístupů bez zapsaných pravidel: React Context (`UserContext`, `InstanceConfigContext`, `ProjectNameContext`), zustand (`layerStore.ts` – jediné použití) a lokální `useState` všude ostatním. Nový vývojář nemá jak poznat, kam co patří; hrozí, že příště někdo přidá čtvrtý přístup (nebo Redux) „protože to tak bylo vedle".

**Návrh.** Zapsat rozhodovací pravidla do `docs/conventions.md` (jde o dokumentaci rozhodnutí, ne o přepis kódu):

1. **Server data → service hooky (D)** – `useTableData` a pokrevní; žádné globální kopie server dat v client state.
2. **Globální klientský state → zustand** – notifikace (F), mapové vrstvy (`layerStore`); pattern create/select.
3. **App-wide read-only konfigurace → React Context** – user, instance config, project name; vše s typovaným hookem (`useUser()`, `useInstanceConfig()`).
4. **Vše ostatní lokální** – `useState`/`useReducer` v komponentě; zvedat výš jen při reálné sdílené potřebě (rule of three).

Tato pravidla se následně vynucují code review; ne automatickými lint pravidly (neexistuje spolehlivé pravidlo pro „správnou" volbu).

**Kroky.** 1) sekce do `conventions.md`; 2) audit tří existujících kontextů (vše odpovídá pravidlům 3 – jen dopsat typované hooky); 3) při refaktoringu F přidat `notificationStore` jako referenční implementaci pravidla 2.

**Rizika.** Žádná technická – jde o rozhodnutí a dokumentaci. Riziko je jen nedodržování; proto jej propojit s code review checklistem.

**Hotovo, když.** conventions.md obsahuje rozhodovací strom; nové globální state vzniká jen výjimečně a zdůvodněně v PR popisu.

---

## 15. Doporučené pořadí realizace

Sekce na sebe navazují; pořadí maximalizuje hodnotu každého kroku a zamezuje dvojí práci (např. převod JSX stránky na TSX a zároveň její formulář na controlled v jednom PR).

| Fáze | Obsah | Výstup |
|---|---|---|
| **0. Příprava** | I – zavedení Vitestu + CI workflow (lint, build, test na PR); J – type-safe i18n klíče | Pojistka kvality pro všechno další |
| **1. Jazyk** | C – převod 17 souborů, importy bez přípon, `allowJs: false`, náprava `conventions.md` (aliasy, sekce L – pravidla state) | Celý kód `frontend/src` v TypeScriptu |
| **2. Isolace** | D – `apiClient.ts` (+ testy), `settingsApi`/`userApi` a převod user stránek (spolu s E), `useTableData` a postupná migrace axios → fetch, odebrání axios | Jedno místo pro HTTP, envelope a 401/403 |
| **3. Odolnost** | A – `useInstanceMessages` heartbeat; G – ErrorBoundary; B – typované role | Aplikace přežije výpadek backendu i expiraci session |
| **4. UX** | F – notifikační store + `<Toasts />`; K – `ConfirmDialog`, `RichTextMessage`; náhrada `window.alert/confirm` | Konzistentní zpětná vazba pro uživatele |
| **5. Průběžně** | H – dekompozice a deduplikace (taxaList) při dotčených úpravách; E – zbylé formuláře; B – volitelný refresh rolí; J – i18n audit | Udržitelná velikost komponent |

Každá fáze končí: `npm run lint` a `npm run build` čisté, změny v malých PR, `docs/todo.md` aktualizováno (soupis axios/fetch souborů k migraci). Odhady pracnosti v přehledu priorit jsou kalibrované na vývojáře znalého kódu; nejistota ±50 %.

## 16. Co záměrně nedělat (YAGNI)

[`docs/seniorDeveloper.md`](./seniorDeveloper.md) zakazuje přidávat závislosti bez zdůvodnění. Aplikace tohoto rozsahu a týmu nepotřebuje:

- **TanStack Query / React Query / SWR** – existující hooky (`useTableData`, `useTaxaData`, …) fungují; problém je fragmentace klientů (D), nikoli absence server-state frameworku. Pokud by kdy v budoucnu bolela cache/invalidace napříč moduly, je toto první místo, kde řešení hledat.
- **Redux / RTK / další state knihovny** – zustand + Context + lokální state pokrývají všechny reální případy (pravidla v L).
- **Zod / Valibot pro validaci odpovědí** – FE parsuje jen konstanty (role, obálka `JsonResult`); `typeof` kontroly v apiClientu a `parseRoles` stačí. Runtime schémata by duplikovala znalost backendu, kterou vlastní BE.
- **Storybook, Chromatic, vizuální/E2E testy** – náklady na údržbu převyšují přínos u současného počtu vývojářů.
- **Přepis funkčních TSX komponent „pročistit"** – dekompozice (H) jen na souborech, které stejně editujeme; žádné velké přepisy z nadšení.
- **Měnit backendová JSON rozhraní kvůli FE** – gotchas (`gotchas.md`) se na FE zapouzdří; jejich „oprava" na BE je samostatné rozhodnutí mimo tento dokument.

## Závěr

Frontend Pladiasu není špatný kód – je to **kód bez izolačních vrstev**. Dvěma největšími pákovými zásahy jsou (1) dokončení TypeScriptu (C) a (2) jediný API klient se service vrstvou (D); ostatní sekce buď na nich staví (A, G, B), nebo je levně dorovnávají (F, K, J, L). Nic z navrženého nezavádí novou runtime závislost kromě vývojářských testovacích nástrojů (Vitest, Testing Library), a vše lze realizovat postupně v malých, nezávisle testovatelných krocích.
