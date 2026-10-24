# Frontend – legacy přístupy a nekonzistence: analýza a plán zlepšení

> **Cíl:** enterprise-testovatelná, udržovatelná aplikace psaná konzistentním stylem v jednotné architektuře.
> Tento dokument identifikuje oblasti, kde frontend používá legacy přístupy nebo kde stejné úlohy řeší různé komponenty různě, a navrhuje konkrétní kroky.
> Východisko: kód prochází `npm run lint` (0 chyb, 3 varování), `tsc -b` čistě, 272 testů v 35 souborech prochází.
> Dobrá zpráva: jádro aplikace (apiClient, DataTable, mapLayers, notifikace, logování, i18n infrastruktura) je na vysoké úrovni. Problémy jsou na okrajích – v legacy zbytcích a v tom, že stejné úlohy řeší různé komponenty různě.

---

## 1. Co funguje dobře (zachovat)

- **`services/apiClient.ts`** – jediné místo pro transport, `JsonResult` obálku, 401/403, `ApiError.notified` deduplikaci, `apiDownload` pro soubory. Plně testovaný.
- **`core/dataTable`** – znovupoužitelná tabulková komponenta (serverové stránkování/filtrování/řazení, optimistická vrstva, exporty do Excelu, column helpers). Místo, kam tabulky patří.
- **`core/mapLayers`** – vrstvená architektura (registry → factory → adaptéry → store → cache).
- **Notifikace (`stores/notificationStore` + `notifyApiError`)** – centrální, s deduplikací.
- **Logování (`services/logger.ts`)** – centrální, idempotentní; `console.*` mimo logger = 0 výskytů.
- **Type-safe i18n** (cs jako zdroj pravdy, `check-i18n` skript).
- **React Query** s centrálně konfigurovaným `queryClient` (zdokumentované rozhodnutí o nekešování).
- Striktní TS bez `any`, lazy loading stránek, `ErrorBoundary`, `useConfirm`, `ProtectedRoute`.

---

## 2. Zjištění a doporučení

### 2.1 Získávání dat – čtyři souběžné přístupy ⚠️ (největší nekonzistence)

Konvence (docs/conventions.md, „Async Safety“) říká: *deklarativní načítání dat při mountu vždy přes TanStack Query*. Realita – čtyři přístupy vedle sebe:

| Přístup | Kde | Status |
|---|---|---|
| `useCatalogQuery` / `useQuery` | číselníky, Autocomplete, TaxaList, Settings… | ✅ cílový stav |
| `DataTable` + `useTableData` (interně React Query) | taxony, measurements, downloads admin | ✅ cílový stav |
| Manuální `useEffect` + `useState`/`setLoading` | `DownloadsTable`, `TraitUpload`, `AggregationTable`, `DatatypesTable`, `backup/BackupTable`, taxonAdmin komponenty | ❌ porušuje konvenci |
| Imperativní hook pro user-triggered flow | `useSearchQuery` (vyhledávání) | ✅ zdokumentovaná výjimka |

**Dopad:** komponenty s manuálním `useEffect` nelze dobře testovat (časování efektů, mockování), nedostávají free cancel/refetch chování a každá si ručně řeší loading/error stav jinak. `DownloadsTable` dokonce porušuje tři konvence najednou: lokální `setError` místo `notifyApiError`, hardcoded angličtina `"Unknown error"` a manuální fetch.

**Doporučení:**
1. Migrace všech „načti při mountu“ komponent na `useCatalogQuery`/`useQuery`; tabulkové na `DataTable` (tím padne i manuální `<Table>` z react-bootstrap, viz 2.4).
2. `useSearchQuery` zůstává – imperativní user-triggered flow je výjimka zdokumentovaná v konvencích. Vyčistit ale dead state (`sortDescending` se resetuje, ale nikde se nečte) a duplikované `downloadFile` (viz 2.3).

### 2.2 Raw `fetch` mimo apiClient

Konvence: *volat `fetch()` přímo z komponent/hooků je zakázané; I/O dělají jen `src/services/`*. Zbytky:

| Místo | Hodnocení |
|---|---|
| `services/searchApi.ts` → `exportSearchExcel` | ❌ **legacy** – ruční `fetch`, ručně parsovaný content-type, vlastní `resolveFilename`. Přesně tohle dělá `apiClient.apiDownload`; jen je potřeba rozšířit `apiDownload` o čtení custom hlaviček (`X-Excel-Total-Records`, `X-Excel-Records-Exported`). |
| `services/mapApi.ts` (WFS/GeoJSON) | ✅ oprávněné – externí mapové zdroje mimo apiClient obálku, zdokumentované. |
| `services/httpLogTransport.ts` | ✅ oprávněné – logger nesmí použít apiClient (cyklická závislost), zdokumentované. |

### 2.3 Dead code a spekulativní kód 🗑️

Nepoužívané/atropické zbytky (vše ověřeno – nikde nejsou importované, nebo odkaz na neexistující soubor):

- **`frontend/dev.tsx`** – starý dev vstup s mock daty. Nereferencuje ho ani `vite.config.ts`, ani `index.html`.
- **`RecordsDataTable.tsx`** – prototyp tabulky s komentáři „Add more fields as needed“ a hardcoded češtinou (`'Název rostliny'`). Nula importů v celém repo.
- **`core/mapLayers/factory/adapters/universalAdapter.ts`**:
  - `require('./tileLayerAdapter')` – **CommonJS `require` v ESM kódu ukazující na neexistující soubor**; větev by za běhu spadla. Registry už dlouho dávají všem vrstvám `service:`, legacy fallback je mrtvý.
  - `createApiLayer`/`createStaticLayer` – placeholder metody vracející prázdné geoJSON. Spekulativní generičnost (YAGNI).
  - mrtvý chain `LayerSource` / `definition.source` / `getLayersBySource()` – deprecated pole bez jediného uživatele (nastavuje ho ani nečte žádná definice ani komponenta).
- ~~**`useSearchQuery.ts`** – `sortDescending` state je mrtvý~~ *(korekce při provádění P0: state je živý – používá ho checkbox sestupného řazení v `SearchForm`/`SearchResultsView`; zůstává.)*
- **Re-export shimy** (`components/atlasAdmin/ImportsList.tsx`, `MapUsers.tsx`) – záměrné pro stabilitu importů, ale dočasné; po migraci importů smazat.

**Doporučení:** smazat vše výše uvedené v jednom samostatném commitu (`refactor: remove dead code`) – nulové riziko, okamžitě čistší repozitář. Případně přidat ESLint pravidlo `no-restricted-syntax` na `require()` v `src/`, aby se CJS do ESM kódu nevrátilo.

### 2.4 Duplikace – stejné úlohy řešené vícekrát 🔁

| Co | Kde | Návrh |
|---|---|---|
| **`useTaxaData` × 2** | `components/atlas/taxaList/hooks/` (105 řádků) vs `components/atlasAdmin/taxaList/hooks/` (99 řádků) – copy-paste, který už divergoval (atlasAdmin dostal refactor `extractTaxaFilters`, atlas ne) | jeden sdílený hook s parametrem endpointu |
| **Typ `TaxonMapSettings` × 2** | `models/TaxonMapSettings.ts` (sdílený, moderní) vs lokální interface v `components/atlasAdmin/taxaList/types.ts` (42 řádků) | smazat lokální, importovat z `@/models` (atlas už to tak dělá) |
| **`resolveFilename` × 2** | `services/apiClient.ts` vs `core/dataTable/export/downloadFile.ts` – téměř identické implementace | jedna implementace, exportovat z jednoho místa |
| **`downloadFile` lokální kopie** | `useSearchQuery.ts` (řádky 35–44) duplikuje `downloadBlob` z `core/dataTable/export` | importovat sdílené `downloadBlob` |
| **`localRecord` timestamp-sync pattern** | `RecordFloristic.tsx` + `RecordRemarks.tsx` – stejný efekt (optimistická lokální kopie + synchronizace `lastEditTimestamp` po mutaci), dokonce se stejným komentářem | extrahovat do `useOptimisticRecord(record)` hooku |
| **Sloupce TaxaList × 2** | `components/atlas/TaxaList.tsx` (read-only) vs `components/atlasAdmin/TaxaList.tsx` (editovatelné) – překrývající se definice sloupců | sdílená column factory (`createTaxaColumns({editable})`) |
| **Tři „optimistické“ přístupy** | (1) DataTable optimistická vrstva přes `onDataUpdater`, (2) `useTaxonUpdates` optimistické update s rollbackem, (3) `localRecord` v record komponentách | (1) a (2) jsou kontextově odůvodněné (tabulka vs mapa); record komponenty převést na `useOptimisticRecord` – vzniknou 2 zdokumentované vzory pro 2 kontexty |
| **`InfoPanel` × 3 / `MapComponent` × 3** | `mapMain` (324 ř.), `mapPreview` (166 ř.), `mapDetail` (109 ř.) – různé režimy mapy (legitní), ale stejné názvy komponent + překrývající se renderování legend | přejmenovat podle účelu (např. `TaxonMapLegend`), sdílet render legendy |
| **Manuální `<Table>` místo `DataTable`** | `AggregationTable`, `DatatypesTable`, `backup/BackupTable` – ruční react-bootstrap tabulky s vlastním loading/error stavem | posoudit, zda jim stačí read-only `DataTable`; některé jsou záměrně jednoduché – pak zdokumentovat výjimku |

### 2.5 Styling

- **`DataTable.module.scss`** – jediný CSS module v celé aplikaci; všude jinde SCSS + BEM (konvence „Styling“). Buď převést na BEM, nebo v konvencích zdokumentovat výjimku.
- **85 inline stylů v 38 souborech** (`style={{...}}`) – část je legitimní dynamická hodnota (výška podle nav offsetu), ale většina je statická (`cursor: 'pointer'`, `width: '60px'`) → převést na utility třídy Bootstrapu nebo BEM bloky.

### 2.6 i18n

- **`en`/`pl` `translation.json` jsou prázdné stuby (`{}`)** – infrastruktura (fallback na cs) funguje, ale jazyky jsou deklarované a prázdné. Buď naplnit, nebo odebrat ze `supportedLngs`, dokud nebude obsah.
- **Hardcoded řetězce mimo `t()`:** `DownloadsTable` (`"Unknown error"`), `ArchiveCsvCell` (`"Download CSV"` v title atributech), texty v measurement Export stránkách. `check-i18n` skript hlídá jen klíče, ne hardcoded stringy – rozšířit ho o heuristiku (text v JSX mimo `t()`), nebo alespoň tyto případy opravit ručně.

### 2.7 Testovatelnost 🧪

Stávajících 272 testů prochází a jsou kvalitní, ale pokrytí je koncentrované: services, core dataTable, pár komponent. **Netestované největší rizikové zóny:**

| Oblast | Rozsah | Proč je to riziko |
|---|---|---|
| `useBulkEdit` | 603 řádků, nejkomplexnější hook (testována jen `valueParsing` utilita) | hromadné mutace nad desítkami záznamů |
| `useTaxonUpdates` | 419 řádků, optimistické update s rollbackem a concurrency kontrolou | update vrstev v mapě |
| `useSearchQuery` | ~350 řádků, orchestrace vyhledávání + exportu | hlavní user flow |
| record komponenty (`RecordInlineField`, `RecordFloristic`…) | inline editace + timestamp concurrency | ztráta dat při kolizích |
| `core/mapLayers` store/registry/factory | testován jen `LayerSwitcher` + `wfsBounds` | jádro mapy |

**Doporučení:**
1. Zapnout `vitest --coverage` a nastavit prahy pro services + core (např. 80 %) – alespoň viditelný trend.
2. Prioritně doplnit testy `useBulkEdit` a `useTaxonUpdates` – jsou to čisté hooky s mockovatelným apiClientem, testy se píší snadno (`renderHook` + mock service).
3. Přidat do pre-commit checklistu i `npm run i18n:check`.

### 2.8 Code style – drobné, ale hlasité nekonzistence

- **Uvozovky: 164 souborů single vs 139 double**, žádné ESLint pravidlo. Důsledek: šum v diffech a zbytečná práce v review. **Doporučení:** přidat ESLint pravidlo pro uvozovky (nebo Prettier) a nechat autofix proběhnout celým repem v samostatném commitu. Single quotes jsou v kódu většinové; volba je na týmu, ale musí být vynucená lintem.
- **`React.FC` drift:** konvence říká `React.FC<Props>`, ale kód téměř všude používá `function` deklarace; `React.FC` zůstalo jen v kontextech (`UserContext` apod.). Kód je v pořádku, dokument ne – opravit formulaci v konvencích.
- **Umístění hooků:** konvence říká `src/hooks/`, realita je feature co-location (`components/*/hooks/`), což je lepší. Aktualizovat dokument.
- **Jazyk komentářů:** mix češtiny a angličtiny. Většinový a konzistentnější je česky – zdokumentovat, anglické komentáře při úpravách souboru postupně počeštit.
- **Hybridní struktura feature:** `TaxaList.tsx` (PascalCase soubor) + `taxaList/` (camelCase složka) v jedné feature je matoucí; buď složku pojmenovat konzistentně, nebo komponentu přesunout dovnitř. Nízká priorita – při refaktorech alespoň nezhoršovat.

### 2.9 Architektura – hranice feature modulů

- **Cross-feature import:** `components/atlas/mapMain/InfoPanel.tsx` importuje `useTaxonUpdates` z `@/components/atlasAdmin/taxaList/hooks` – feature „atlas“ sahá do vnitřností feature „atlasAdmin“. `useTaxonUpdates` používá mapMain i admin TaxaList, patří do sdílené vrstvy (services + hook ve sdíleném místě), ne do vnitřností jiné feature.
- **Relativní import přes hranice:** `importCsv` používá `'../../import/hooks/useProjectsData'` – přímé porušení „Always use aliases, never relative `../../` across feature boundaries“ (conventions.md). Opravit na `@/…`.
- **`queryClient` bez cache (`staleTime: 0`)** – záměrné a zdokumentované rozhodnutí (číselníky jsou dynamická data). K zvážení: krátké `staleTime` (30 s) jen pro katalogy by ušetřilo opakované requesty při přecházení mezi stranami. Není chyba – návrh k revizi.
- **`useUserSettings`** – imperativní callback styl (`onSettingSaved`, `updateState`), těžko testovatelný. Kandidát na React Query mutation s invalidací. Nízká priorita.

---

## 3. Prioritizovaný plán

### P0 – rychlé výhry (hodiny, nulové riziko) – ✅ provedeno 23. 10. 2026
1. ✅ Smazat dead code: `dev.tsx`, `RecordsDataTable.tsx`, `require('./tileLayerAdapter')` + celý legacy fallback v `universalAdapter` (vč. mrtvého pole `source` a `getLayersBySource`), `createApiLayer`/`createStaticLayer` placeholdery (viz 2.3). *Korekce: `sortDescending` v `useSearchQuery` vyřazeno – není dead code (živý checkbox v `SearchResultsView`).*
2. ✅ Deduplikovat download helpery: `useSearchQuery` → import `downloadBlob` z `core/dataTable/export`; `resolveFilename` nechat jen na jednom místě (viz 2.4).
3. ✅ Převést `exportSearchExcel` na `apiDownload` (rozšířit o custom hlavičky) – zmizí poslední legacy raw fetch (viz 2.2).
4. ✅ Opravit hardcoded řetězce v `DownloadsTable`, `ArchiveCsvCell` (viz 2.6).

### P1 – konsistence (dny, nízké riziko) – ✅ provedeno 23. 10. 2026
1. ✅ Migrace manuálních `useEffect` loadů na React Query: `DownloadsTable`, `TraitUpload`, `AggregationTable`, `DatatypesTable`, `BackupTable`, taxonAdmin (viz 2.1). *TaxonAdmin rozšířen na `TaxonStats`, `TaxonTraitCount`, `TaxonDetail`, `TaxonSynonyms`, `ChildrenOrderingCard`; chyby hlásí nový sdílený hook `query/useQueryErrorNotify` (vzor efektu nad `error` stavem z `TaxaAdministration`); `ChildrenOrderingCard` i `TaxonSynonyms` píší editace optimisticky přes `queryClient.setQueryData`.*
2. ✅ Sjednotit typ `TaxonMapSettings` na `@/models` a sloučit dva `useTaxaData` hooky (viz 2.4). *Jeden sdílený `hooks/useTaxaData` s parametrem endpointu, I/O v `services/mapAdminApi.getTaxaTable`; mrtvý `onSuccess` callback odstraněn. Vedlejší fix: admin varianta nyní posílá `sortField`/`sortDirection` – backend oba endpointy podporuje, admin tabulka má sloupce s `enableSorting`, dřív se řazení na server neprojevilo.*
3. ✅ ESLint: pravidlo pro uvozovky + autofix commit (viz 2.8). *`quotes: single` (+ `avoidEscape`) a `jsx-quotes: prefer-double`; autofix proběhl celým repem.*
4. ✅ `DownloadsTable` – error handling přes `notifyApiError` + i18n (viz 2.1, 2.6). *Toast místo inline Alert, nový klíč `download.loadFailed`.*

### P2 – struktura (sprinty, střední riziko) – ✅ provedeno 24. 10. 2026
1. ✅ Přesunout `useTaxonUpdates` do sdílené vrstvy; opravit relativní cross-feature importy (viz 2.9). *`hooks/useTaxonUpdates` (sdílená vrstva, import `@/models`); smazán `atlasAdmin/taxaList/hooks/` re-export shim; opraven jediný cross-feature relativní import (`ImportCSVForm` → `@/components/atlas/import/hooks/useProjectsData`).*
2. ✅ Extrahovat `useOptimisticRecord` z `RecordFloristic`/`RecordRemarks` (viz 2.4). *`components/atlas/record/hooks/useOptimisticRecord.ts` (vedle `useRecordPermissions`), export přes `record/index.ts`; částečná synchronizace (full-sync při změně id, jinak jen timestamp) zachována včetně eslint-disable komentáře.*
3. ✅ Sdílená column factory pro obě TaxaList varianty (viz 2.4). *`components/taxaList/columns.tsx` – `createTaxaColumns({t, revisionStatusOptions, publicationStatusOptions, editableCells?})`; admin renderery (MappedCell, StatusSelect, PresliaInlineField, ArchiveCsvCell, checkbox, number input) injektované přes `EditableTaxaCells`, sdílený modul neimportuje vnitřnosti admin feature. Duplicitní `types.ts` z obou variant odstraněny: `TaxonMapSettings` z `@/models`, statusy typují `TaxonStatusOption` z `services/mapAdminApi`, `TaxonOption` nahrazen modelem `TaxonId` (zmizely i `as` kasty v `ParentMapAutocomplete`).*
4. ✅ Rozhodnout en/pl: naplnit, nebo odebrat ze `supportedLngs` (viz 2.6). *Vyplněno – en/pl kompletně přeloženy (1018 klíčů 1:1 s cs) a přidána němčina (`locales/de`, radio + `supportedLngs` v i18n.tsx, audit `check-i18n.mjs` rozšířen o de). `user.settings.languageDescription` aktualizováno (text o „pár místech“ už neplatil), nový klíč `user.settings.languageGerman`. Backend beze změny – `application_language` je prostý řetězec.*
5. ✅ Testy pro `useBulkEdit`, `useTaxonUpdates`, `useSearchQuery`; zapnout coverage s prahy (viz 2.7). *Testy na finálních cestách (renderHook + mock service vrstvy, vzor dle `useInstanceMessages.test.tsx`). Coverage jako lokální `npm run test:coverage` (`@vitest/coverage-v8` 4.1.12, v8 provider, `src/services/**` + `src/core/**`); prahy nastavené mírně pod naměřené hodnoty (statements 45 %, branch 35 %, function 50 %, lines 45 %) jako protiregrese – CI i běžný `npm test` je nekontrolují (rozhodnutí: lokální skript). `i18n:check` doplněn do pre-commit checklistu.*
6. ✅ `DataTable.module.scss` → BEM, nebo dokumentovaná výjimka (viz 2.5). *Poslední CSS modul převeden na globální `DataTable.scss` s BEM třídou `.data-table--stable`; mrtvá `.table-nowrap` (v markupu jen plain string, kterému modul nikdy nestyloval) smazána spolu s no-op atributem v `DataTableFilterRow`.*

### P3 – leštění (průběžně)
1. Inline styly → utility/BEM třídy (dávkově po komponentách).
2. Aktualizace conventions.md: umístění hooků, `React.FC`, uvozovky, jazyk komentářů (viz 2.8).
3. `InfoPanel`/`MapComponent` přejmenování dle účelu (viz 2.4).
4. Zvážit `staleTime` pro číselníky (viz 2.9).
5. Po migraci importů smazat re-export shimy.

---

## 4. Návrh nových pravidel do conventions.md

*Přeneseno do `conventions.md` 24. 10. 2026 (Tables, Quotes, API Models, výslovný zákaz `useEffect`+`setState` loadů, Downloads, umístění hooků); zákaz `require()` navíc vynucen ESLint pravidlem `@typescript-eslint/no-require-imports`.*

1. **Tabulky vždy přes `DataTable`** – žádné ruční `<Table>` z react-bootstrap (výjimky jen pro zcela statické tabulky, s komentářem).
2. **Deklarativní loady výhradně React Query** – doplnit výslovně „žádné `useEffect` + `setState` pro data z API“.
3. **Zákaz `require()` v `src/`** – ESLint `no-restricted-syntax` (ESM-only kód).
4. **Uvozovky** – jednotné (navrhuji single jako většinové), vynuceno lintem.
5. **Download helpery** – vždy `downloadBlob`/`apiDownload`, žádné lokální kopie.
6. **API modely v `@/models`** – žádné lokální duplikáty interface pro API modely.
7. **Feature hranice** – import jen přes `@/` alias; hooky používané napříč features patří do sdílené vrstvy, ne do vnitřností jiné feature.

---

## 5. Metodika

Analýza provedena fulltextovým skenem celého `frontend/src` (raw fetch, `require()`, manuální `useEffect` loady, inline styly, uvozovky, `console.*`, localStorage, i18n klíče, duplikáty jmen komponent a hooků), čtením klíčových souborů (pages, core, services, hooks) a ověřením zdraví projektu (`npm run lint`, `tsc -b`, `vitest` – vše prochází). Každé tvrzení v dokumentu je podložené konkrétním souborem. Doporučené kroky jsou řazené dle poměru přínos/riziko; P0 je bezpečné provést okamžitě.
