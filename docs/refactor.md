# Refaktoring frontendu – díl II: zbývající dluh vůči enterprise architektuře

**Status:** návrh k realizaci · **Průzkum kódu:** 20. 10. 2026, git `cf1ff59` · **Rozsah:** `frontend/src` (314 souborů TS/TSX, ~28,5 tis. řádků)

První kolo refactoringu (čistý TypeScript, `apiClient` + service vrstva, globální notifikace,
`ErrorBoundary`, typované role, heartbeat, CI pipeline) bylo realizováno ve fázích 1–4
(commity `cbab703`…`c68d81b`) a jeho plán byl po dokončení smazán.
Tento dokument je druhé kolo: oblasti, kde frontend **stále zaostává** za enterprise architekturou.
Každá sekce má strukturu **Současný stav → Návrh → Kroky → Rizika → Hotovo, když**; všechna čísla
jsou ověřitelná uvedenými příkazy.

## Obsah

1. [Co už je na enterprise úrovni (nechat být)](#1-co-už-je-na-enterprise-úrovni-nechat-být)
2. [Současný stav v číslech](#2-současný-stav-v-číslech)
3. [Přehled priorit](#3-přehled-priorit)
4. [A – Dokončení service vrstvy (104 raw fetch)](#a--dokončení-service-vrstvy-104-raw-fetch)
5. [B – Lint dluh: 150 chyb, z toho 11 latentních bugů](#b--lint-dluh-150-chyb-z-toho-11-latentních-bugů)
6. [C – Typová bezpečnost core vrstev](#c--typová-bezpečnost-core-vrstev)
7. [D – Deduplikace: atlas vs atlasAdmin, mapMain vs mapPreview](#d--deduplikace-atlas-vs-atlasadmin-mapmain-vs-mappreview)
8. [E – Dekompozice velkých komponent](#e--dekompozice-velkých-komponent)
9. [F – Testovací pokrytí: z infrastruktury na feature](#f--testovací-pokrytí-z-infrastruktury-na-feature)
10. [G – Konzistence UX primitiv](#g--konzistence-ux-primitiv)
11. [H – HTML injekce mimo RichTextMessage](#h--html-injekce-mimo-richtextmessage)
12. [I – i18n: obsahová strategie pro en/pl](#i--i18n-obsahová-strategie-pro-enpl)
13. [J – Server-state: jednotný data-fetching vzor](#j--server-state-jednotný-data-fetching-vzor)
14. [K – Přístupnost (a11y)](#k--přístupnost-a11y)
15. [L – Observabilita chyb za běhu](#l--observabilita-chyb-za-běhu)
16. [M – Bundle a CSS hygiena](#m--bundle-a-css-hygiena)
17. [N – CI/CD: dependabot pro npm, lint gate](#n--cicd-dependabot-pro-npm-lint-gate)
18. [O – Drobný dokumentační dluh](#o--drobný-dokumentační-dluh)
19. [Doporučené pořadí realizace](#doporučené-pořadí-realizace)
20. [Co záměrně nedělat (YAGNI)](#co-záměrně-nedělat-yagni)

---

## 1. Co už je na enterprise úrovni (nechat být)

Záměrně na prvním místě – viz [`docs/seniorDeveloper.md`](./seniorDeveloper.md) („The best code is
the code never written"). Následující oblasti refaktorovat **nechceme**, fungují:

- **Stack:** React 19 + Vite 7 + strict TypeScript (`verbatimModuleSyntax`, `noUnusedLocals`),
  SCSS + Bootstrap 5, lazy routing s vendor chunkingem.
- **HTTP izolace:** `apiClient` centrálně řeší 401/403/síťové chyby, `AbortSignal`, urlencoded,
  souborové endpointy i legacy gotchasy ([gotchas.md](./gotchas.md)).
- **Notifikace a chyby:** `notificationStore` + `<Toasts/>` mimo `ErrorBoundary`, deduplikace přes
  `notifyApiError`, `RichTextMessage` jako vyhrazené místo pro HTML.
- **Autorizace:** role i editační práva přebírá FE z dat backendu (typovaný `ProtectedRoute`,
  `canEdit*` flagy) – nikde se práva nedeperují lokálně ([rules_frontend.md](./rules_frontend.md)).
- **Mapová architektura:** `core/mapLayers` (registry → store → factory → adapters → cache) dle
  [layers.md](./layers.md).
- **CI:** lint + i18n audit + build + test na každý PR; guard proti JS souborům; dependabot pro
  docker/actions.
- **i18n mechanismus:** i18next + audit skript (`npm run i18n:check`), fallback na cs.

## 2. Současný stav v číslech

| Metrika | Hodnota | Ověření |
|---|---|---|
| Volání `fetch()` mimo service vrstvu | **104 v 59 souborech** | `grep -rn "fetch(" src \| grep -v services/` |
| Existující service moduly | 5 (`apiClient`, `bulkEditApi`, `instanceApi`, `settingsApi`, `userApi`) | `src/services/` |
| Lint | **150 chyb + 20 varování**, CI fáze `continue-on-error: true` | sekce B |
| z toho `no-explicit-any` | 90 | – |
| z toho `react-hooks/rules-of-hooks` (latentní bugy) | **11** | sekce B |
| `: any` / `as any` mimo testy | 59 / 22 (koncentrace `core/mapLayers`, `core/dataTable`) | – |
| Testy | 10 souborů / 62 testů – **jen infrastruktura** | `find src -name '*.test.*'` |
| i18n klíče | cs **978** · en **8** · pl **8** | `src/locales/*` |
| `dangerouslySetInnerHTML` mimo `RichTextMessage` | 7 výskytů / 3 soubory | sekce H |
| Největší komponenty (řádků) | `SearchForm` **1121** (30 useState) · `BulkEdit` 973 · `Layer` 607 · `PladiasRecordsTable` 518 · `SquaresOverlay` 512 | `wc -l` |
| Duplikáty | `ParentMapAutocomplete` ×2 **identické** · `useTaxonUpdates` ×2 (218 diff řádků) · `MapComponent` ×2 (601 diff) · `InfoPanel` ×2 · `TaxaList` ×2 | `diff` |
| `console.*` ve `src` | 77 | – |
| Bundle (poslední build) | `main.js` 400 kB · `main.css` **314 kB** · ikonové fonty ~470 kB | `public/react/assets/` |
| Dependabot pro npm | **chybí** (jen docker + github-actions) | `.github/dependabot.yml` |
| `frontend/README.md` | chybí | – |

## 3. Přehled priorit

| Oblast | Priorita | Odhad | Klíčová závislost |
|---|---|---|---|
| B – Lint dluh (rules-of-hooks = bugy) | **vysoká** | 3–5 dní | – |
| A – Service vrstva (104 raw fetch) | **vysoká** | 4–6 dní, krájet po feature | – |
| H – HTML injekce mimo RichTextMessage | vysoká | ½ dne | – |
| G – Konzistence UX primitiv | střední | ½–1 den | – |
| C – Typy core vrstev | střední | 3–5 dní | ideálně po A |
| D – Deduplikace | střední | 2–4 dny | – |
| E – Dekompozice velkých komponent | střední | 3–5 dní | D, F |
| F – Testy na feature/core | střední | 3–5 dní | průběžně s A–E |
| N – CI mezery (dependabot npm) | nízká | ½ dne | lint gate až po B |
| M – Bundle/CSS hygiena | nízká | 1–2 dny | – |
| I – i18n obsah en/pl | nízká (produktové rozhodnutí) | překladatelská práce | – |
| J, K, L – decision pointy | volitelné | viz sekce | – |

---

## A – Dokončení service vrstvy (104 raw fetch)

**Současný stav.** Jediný HTTP klient (`apiClient`) i vzor per-feature service modulu existují
(`bulkEditApi.ts` je reference), ale většina aplikace zůstala na syrovém `fetch()`: **104 volání
v 59 souborech**. Koncentrace: `components/taxonAdmin/` + `pages/user/TaxaAdministration` (10
souborů), `components/measurement/` + `pages/measurements/` (12), `pages/atlas/` (5: MapMain,
MapDetail, MapPreview, NewComments, Record), `components/atlas/record/` (5), autocomplete
providery (3), `core/mapLayers/` (5). Důsledky:

- Raw-fetch kód **obchází centrální handling** 401/403/síťových chyb a deduplikaci notifikací
  (`ApiError.notified` / `notifyApiError`) – [gotchas.md](./gotchas.md) to dosud toleruje jako
  „still being migrated".
- Odpovědi se parsují ručně a často **bez kontroly `res.ok` ani obálky `success`** – např.
  `export/ExportTraitList.tsx:28` a `export/ExportOptions.tsx:13` dělají
  `fetch(…).then(r => r.json()).then(r => setX(r.data))`; selhání backendu skončí tiše jako
  `undefined` data.
- Endpointy jsou **stringové literály** rozházené po komponentách – neexistuje přehled, co FE
  konzumuje (audit dopadu změny BE endpointu = grepování).
- `AbortSignal` se nepoužívá vůbec (apiClient ho podporuje) – riziko závodů a `setState` po
  odmontování komponenty u autocomplete/typeahead.

**Návrh.** Pokračovat v zavedeném vzoru – doménové service moduly (`taxonApi`, `recordApi`,
`traitApi`, `adminApi`, `mapApi`…) výhradně nad `apiClient`. Žádná nová závislost. Endpoint jako
typovaná funkce service modulu, ne literál v komponentě. Chyby konzistentně přes
`notifyApiError(err, fallback)`.

**Kroky.**
1. `taxonAdmin` + `TaxaAdministration` (nejvíc duplikované logiky, sdílí endpointy s `atlasAdmin`). *(Hotovo 20. 10. 2026 – fáze 2, krok A.1: `taxonApi.ts` + testy, fix `TaxonInlineField` updated[field], smazán mrtvý `TaxonAllAutocomplete`.)*
2. `measurement` (backup, export, trait tabulky, upload). *(Hotovo 20. 10. 2026 – fáze 2, krok A.2: `traitApi.ts` + testy, 12 komponent.) *
3. `pages/atlas/` (mapy, Record, NewComments). *(Hotovo 20. 10. 2026 – fáze 2, krok A.3: `recordApi.ts` + `atlasApi.ts` + testy, `AtlasRecords.ts` modely, smazán `recordService.ts`.)*
4. Autocomplete providery – zde přidat `AbortSignal` (typeahead). *(Hotovo 20. 10. 2026 – fáze 2, krok A.4: `AbortController` v `Autocomplete`, signal v `searchTaxaByPrefix`/`searchImportableTaxa`/`searchPossibleTaxonParents`.)*
5. `core/mapLayers/` (WFS/GeoJSON fetche v hookách a adapterech). *(Hotovo 20. 10. 2026 – fáze 2, krok A.5: `mapApi.fetchWfsGeoJson`, user-settings viditelnost vrstev přes `settingsApi`.)*

Navazující kroky (splnění gate „Hotovo, když", původně mimo výčet koncentrací): *(vše hotovo 20. 10. 2026 – fáze 2)*
- vyhledávání záznamů (`SearchForm`, `BulkEdit`): `searchApi.ts` (číselníky, stránkování, Excel export s `X-Excel-*` hlavičkami) + testy;
- importy (`atlas/import`, `importCsv`, `atlasAdmin/importsList`): `importApi.ts` (Excel/CSV upload, `prepareBatchDelete`, `projects/user` s `projects` obálkou) + testy;
- správce mapy (`TaxaList` ×2, `mapUsers`): `mapAdminApi.ts` (stavové číselníky, práva na projekty/taxony) + testy;
- zbytek (`UsersTable`, `PlayMessagesEditor`, `PlayMessage`, `DownloadsTable`): `playMessageApi.ts`, `downloadApi.ts`, `userApi.updateUserFlag` + testy;
- `extractErrorMessage` v apiClientu rozšířen o `errorMessage` (import kontrolery).

Každý krok: `npm run build && npm test`; `grep "fetch(" <feature>` = 0.

**Rizika.** Backendové gotchasy (TraitsController vrací string, ConfigController pole, souborové
endpointy) – `apiClient` už má `apiGetLegacyString`/`apiDownload`. Pozor na sémantiku
„`success: false` = hodnota nenastavena" (user settings), kde se `ensureSuccess` volat nesmí.

**Hotovo, když.** `grep -rn "fetch(" src --include='*.ts' --include='*.tsx' | grep -v "src/services/" |
grep -v ".test."` vrací 0; `no-explicit-any` a počet `console.*` výrazně klesnou (značná část zanikne
spolu s ručním parsováním). *(Ověřeno 20. 10. 2026 – fáze 2 dokončena: grep vrací 0, `: any`/`as any`
v kódu 0 výskytů, 15 service modulů, 165 testů.)*

---

## B – Lint dluh: 150 chyb, z toho 11 latentních bugů

**Současný stav.** `npm run lint`: 150 chyb + 20 varování; CI fáze Lint je
`continue-on-error: true` (komentář „pre-existující dluh"). Rozpad chyb:

| Pravidlo | Počet | Charakter |
|---|---|---|
| `@typescript-eslint/no-explicit-any` | 90 | dluh (sekce C) |
| `@typescript-eslint/no-unused-vars` | 32 | z ~⅓ záměrné `_` parametry adapterů |
| `react-hooks/rules-of-hooks` | **11** | **latentní bugy** |
| `no-case-declarations` | 9 | drobnost |
| `no-useless-escape` | 3 | drobnost |
| `no-unused-expressions` | 2 | drobnost |
| `no-require-imports`, `no-empty-object-type` | 2 | drobnost |
| `react-hooks/exhaustive-deps` (varování) | 20 | část = zapomenuté závislosti |

Umístění všech 11 `rules-of-hooks` chyb – nejsou to styl, ale **latentní bugy**: hooky volané
podmíněně (za early-return) nebo v renderovacích helperách. Podle pořadí renderu způsobí výjimku
„Rendered fewer hooks than expected" – projeví se uživatelům jen občas (typicky po změně filtru,
kdy se změní větev renderu):

| Soubor | Počet | Příklady |
|---|---|---|
| `core/mapLayers/components/Layer.tsx` | 4 | `useEffect` za early-returny (:194, :226, :232…) |
| `components/atlas/record/RecordInlineField.tsx` | 3 | `useState` v helperu `renderMultiValue` (:208, :209) |
| `components/atlas/mapDetail/PladiasRecordsTable.tsx` | 2 | `useEffect` za early-return (:79, :147) |
| `components/atlas/mapDetail/ExternalRecordsTable.tsx` | 1 | `useEffect` za early-return (:29) |
| `components/edit/TaxonInlineField.tsx` | 1 | – |

**Návrh.** Pořadí: nejdřív bugy, pak dluh, nakonec gate.
1. **`rules-of-hooks` (11):** přesunout hooky před všechny early-returny; `renderMultiValue`
   převést z inline helperu na skutečnou komponentu. Nutná ruční testace postižených obrazovek
   (vrstvy mapy, inline editace záznamů, tabulka Pladias záznamů). *(Hotovo 20. 10. 2026 – fáze 1.)*
2. **`no-unused-vars` (32):** zapnout `argsIgnorePattern: "^_"` – značná část chyb jsou záměrné
   nepoužité parametry adapterů (`_definition`, `_url`), což je konvence, ne dluh. Zbytek smazat.
   *(Hotovo 20. 10. 2026 – fáze 2: `argsIgnorePattern` + `varsIgnorePattern` "^_" v eslint.config.js,
   mrtvé `catch (error)` parametry smazány.)*
3. **Drobnosti (15):** mechanické opravy. *(Hotovo 20. 10. 2026 – fáze 2: case-declarations v
   DataTable, ternární výrazy v useRecordQuickUpdates, require-import s disable, empty-interface.)*
4. **`no-explicit-any` (90):** řešit po slices společně s A a C – velká část zanikne s migrací
   fetchů; zbývající typovat. *(Hotovo 20. 10. 2026 – fáze 2: 0 výskytů; typovány Layer,
   SquaresOverlay, DataTable + types, RecordInlineField/TaxonInlineField, InfoPanel a další.)*
5. **`exhaustive-deps` (20):** projít ručně – část jsou reálné zapomenuté závislosti (bugy),
   část záměrné „načti jednou" patterny (dokumentovat `// eslint-disable-line` s odůvodněním).
   *(Hotovo 20. 10. 2026 – fáze 2: 0 warnings; reálné deps doplněny, záměrné patterny
   dokumentovány eslint-disable s odůvodněním.)*
6. Až je chyba < 10: **odstranit `continue-on-error: true`** z `frontend.yml` – lint se stane
   gate. Cílový stav konfigurace: `tseslint.configs.recommendedTypeChecked`.
   *(Gate odstraněn 20. 10. 2026 – fáze 2: `npm run lint` končí exit 0, CI fáze Lint je blocking.
   `recommendedTypeChecked` zůstává future work.)*

**Rizika.** Přesun hooků mění pořadí volání efektů – nutno ověřit za běhu (mapy, inline editace).
`argsIgnorePattern` nezamaskuje skutečně mrtvý kód, jen formalizuje konvenci `_`.

**Hotovo, když.** `npm run lint` končí exit 0; lint fáze v CI je blocking;
`npm run lint 2>&1 | grep rules-of-hooks` vrací 0. *(Ověřeno 20. 10. 2026 – vše splněno.)*

---

## C – Typová bezpečnost core vrstev

**Současný stav.** Aplikace je strict TS, ale jádro má `any` dluh přesně tam, kde by typy
vydělávaly nejvíc:

- `core/mapLayers/types/serviceConfig.ts` definuje discriminated union
  (`type: 'geoserver' | 'tile' | 'api' | 'static'`), ale renderující `Layer.tsx` (607 řádků) ho
  obchází: `definition: any`, `config as any`, `tileProps: any`, `wmsProps: any`,
  `viewparams … as any`. **Typy existují, jen nejsou zapojené** – drift mezi architekturou a jejím
  konzumentem.
- `core/dataTable/types.ts`: `cellRenderer?: (value: any, row: T)`, `onRowUpdate?` s `value: any`;
  `DataTable.tsx` dále `row[column.accessor] as any`, `(row as any).id` – generika tabulky se
  reálně nevyužívají ke kontrole definic sloupců (používá ji 10 komponent).
- `SquaresOverlay.tsx`: `(layer as any).feature`, `_squaresCleanup`, `_zoomHandler` – skryté
  vlastnosti na Leaflet objektech.
- `mapMain/InfoPanel.tsx`: lokální interface s `commonThreshold: any`, `parentTaxonId: any`,
  `csvMapDetailId: any` – přitom `src/models/` typové modely mají.

**Návrh.** Nic nového nevymýšlet – **zapojit typy, které už v `types/` jsou**:
1. ~~`Layer.tsx`: switch přes `service.type` s narrowingem unionu místo `as any` (ideálně po
   dekompozici v E – subkomponenta per typ vrstvy).~~
   ✅ *Hotovo 21. 10. 2026 (refactor 13):* `Layer.tsx` je 105řádkový dispatcher se switchem
   s TS narrowingem; subkomponenty `layers/TileLayerView`, `WmsLayerView`, `WfsLayerView`
   (props typované `TileConfig`/`GeoServerConfig`, žádné `as`) + čisté `layers/wfsBounds`
   (bbox buffer, reload threshold) s 5 unit testy.
2. ~~`DataTable`: `accessor: keyof T`, `cellRenderer?: (value: T[keyof T], row: T) => …` – kontrola
   definic sloupců v 10 konzumentech za pochodu.~~
   ✅ *Hotovo 21. 10. 2026:* typová část už z B.4 (`accessor: keyof T`, typovaný `cellRenderer`,
   `onRowUpdate` bez `any`); `any` v `src/core/dataTable` = 0.
3. Leaflet workaroundy (`SquaresOverlay`): malý deklarovaný modul `leaflet-extensions.d.ts` nebo
   `Map<SquareLayer, …>` WeakMap místo expando vlastností.
4. `InfoPanel`: použít existující modely z `src/models/`.

**Kroky.** ~~1) mapLayers (s dekompozicí `Layer.tsx` v E)~~ ✅, 2) DataTable (s testy v F), 3) zbývající
`: any` v komponentách průběžně s migrací A.

**Rizika.** Zapojený discriminated union odhalí nekonzistence v datech registrů (chybějící
`config` pole u některého typu vrstvy) – což je přesně ten typ bugu, který má vyjít navenek.

**Hotovo, když.** `grep -rn ": any\|as any" src/core/ --include='*.ts' --include='*.tsx'` vrací 0
(výjimky jen zdokumentované Leaflet workaroundy). ✅ *Ověřeno 21. 10. 2026: 0 výskytů – Leaflet
expanda vlastnosti (`_zoomHandler`, feature) jsou typované deklarovanými průniky
(`L.GeoJSON & {...}`, `FeaturePath`). Zbývá C.4 (InfoPanel modely).*

---

## D – Deduplikace: atlas vs atlasAdmin, mapMain vs mapPreview

**Současný stav.** Dvě feature větve drží kopie téhož kódu a driftují:

| Kopie | Stav |
|---|---|
| `components/atlas/taxaList/components/` × `atlasAdmin/…` | ~~**identické** (diff 0)~~ ✅ *21. 10. 2026 (refactor 12): celý adresář (7 souborů) byl v atlas mrtvý kód – komponenty používal jen atlasAdmin; mrtvá kopie smazána* |
| `useTaxonUpdates.ts` (atlas 278 ř. vs atlasAdmin 413 ř.) | ~~218 diff řádků – driftující kopie~~ ✅ *21. 10. 2026 (refactor 15): userská kopie nebyla importovaná nikde (InfoPanel i admin TaxaList používají atlasAdmin verzi) – smazána; jediný `useTaxonUpdates` v atlasAdmin* |
| `MapComponent.tsx` (mapDetail 442 vs mapPreview 191) | ~~601 diff řádků~~ ✅ *21. 10. 2026 (refactor 14): společné jádro `MapCanvas` (MapContainer init) + `MapLayer` (odběr visibility) v `core/mapLayers/components`; view-specifické části (info panely, šipky, markery) zůstaly per page dle návrhu* |
| `InfoPanel.tsx` (mapMain 390 vs mapPreview 183) | paralelní vývoj |
| `TaxaList.tsx` (atlas vs atlasAdmin) | paralelní vývoj |

Admin varianta vznikla zkopírováním userské a liší se správou sloupců a právy. Typický následek: oprava
bugu v jedné kopii druhou mine (`useTaxonUpdates` je hlavní kandidát – je to mutační logika).

**Návrh.** Jeden vlastník sdíleného kódu, rozdíly konfigurací:
1. ~~Identické kopie (`ParentMapAutocomplete`) → jeden sdílený modul (mechanické, bez rizika).~~
   ✅ *Hotovo 21. 10. 2026 – ukázalo se, že atlas kopie je mrtvý kód: smazána, vlastníkem atlasAdmin.*
2. ~~`useTaxonUpdates` → jeden hook s parametrem režimu (admin vs userský liší endpointy/sloupce).~~
   ✅ *Hotovo 21. 10. 2026 – userská kopie nebyla používána (oba konzumenty volají atlasAdmin
   verzi nad stejným endpointem); existuje jediný hook, režimový parametr není potřeba.*
3. `TaxaList` → sdílená komponenta, admin rozdíly přes definice sloupců (DataTable podporuje
   column defs) a práva přes serverové `canEdit*` flagy (ne přes `isAdmin` větve FE).
4. ~~Mapové komponenty: společné jádro (inicializace Leaflet, panes, správa vrstev) do
   `core/mapLayers/components`, view-specifické části (info panely, klikací chování) zůstanou
   per page – současně s E.~~
   ✅ *Hotovo 21. 10. 2026 (refactor 14) – `MapCanvas` + `MapLayer`; panes spravuje
   `WfsLayerView` (vlastní pane per vrstva dle zIndex).*

**Rizika.** Sloučení admin/userské logiky musí zachovat autorizační rozdíly – vždy přes data z
backendu ([rules_frontend.md](./rules_frontend.md)), ne FE dedukce.

**Hotovo, když.** `diff` shodných jmen souborů ve `src` = 0; existuje jediný `useTaxonUpdates`.
✅ *Částečně 21. 10. 2026: jediný `useTaxonUpdates` ✓; zbývá D.3 `TaxaList` a záměrně rozdílné
`useTaxaData`/`types.ts` (různé endpointy a práva – slučovat až společně s D.3).*

---

## E – Dekompozice velkých komponent

**Současný stav.** Pět komponent přes 500 řádků kumuluje více odpovědností:

- `search/SearchForm.tsx` **1121 řádků, 30 `useState`**: stav 10+ filtrů (typeaheady), načítání
  číselníků, paginace, řazení, Excel export, vykreslení výsledků, integrace BulkEditu. Konvence
  „Pages are thin" ([conventions.md](./conventions.md)) porušena ostentativně.
- `BulkEdit.tsx` 973: per-field editační komponenty + potvrzovací flowy + API volání v jednom
  souboru.
- `Layer.tsx` 607: WMS + WFS + tile + GeoJSON renderery v jednom souboru (plus `any` dluh z C).
- `PladiasRecordsTable.tsx` 518, `SquaresOverlay.tsx` 512.

**Návrh.** Rozdělit podle vzoru, který v kódu už je (`components/atlas/import/` má `hooks/`,
`components/`, `types.ts`):
1. ~~`SearchForm` → `hooks/useSearchFilters` (stav filtrů + číselníky), `hooks/useSearchQuery`
   (dotaz přes service z A, paginace/řazení, `AbortSignal`), `components/` pro jednotlivá
   filter pole. Výsledky už mají vlastní komponentu (`PladiasRecordsTable`).~~
   ✅ *Hotovo 21. 10. 2026 (refactor 17):* SearchForm.tsx **952 → 177 řádků** – tenká
   koordinace; `hooks/useSearchOptions` (číselníky), `hooks/useSearchFilters` (výběry +
   reset), `hooks/useSearchQuery` (dotaz/paginace/řazení/Excel), `components/`
   (TypeaheadFilterField pro 10 typeahead řádků, SearchFilterColumnOne/Two,
   SearchResultsView), čisté `searchRequest.ts` (F.3 testy: export_type, FormData+sort,
   pageSize, paginace). AbortSignal zatím nemá backend podporu – viz J.
2. ~~`Layer.tsx` → subkomponenty per `service.type` (současně s C – každá s typovaným props).~~
   ✅ *Hotovo 21. 10. 2026 (refactor 13): `Layer.tsx` 614 → 105 řádků (dispatcher);
   `layers/TileLayerView` (54), `WmsLayerView` (145), `WfsLayerView` (302) + `wfsBounds`
   (72, čisté funkce) s 5 unit testy.*
3. `BulkEdit` → `hooks/useBulkEdit` + per-field komponenty (field definice už jsou deklarativní).
4. `SquaresOverlay`, `PladiasRecordsTable` – průběžně při dalších změnách.

Nedekomponovat vše – jen co přináší testovatelnost (F) nebo sdílení (D). Cíl ~300–400 řádků na
komponentu, ne dogma.

**Kroky.** ~~1) `SearchForm` (nejvyšší hodnota – po něm jdou testy parametrů vyhledávání),~~
✅ *21. 10. 2026*, ~~2) `Layer` (s C)~~ ✅ *21. 10. 2026*, 3) `BulkEdit`, 4) zbylé průběžně.

**Rizika.** Mechanický přesun stavů změní chování re-renderů – po každém kroku ruční test
vyhledávání/exportu. Dekompozici provádět po migraci service (A), ne před ní (dvojitá práce).

**Hotovo, když.** žádná komponenta > ~500 řádků; `SearchForm` je tenká koordinační komponenta
bez přímého `fetch`. ✅ *SearchForm splněno 21. 10. 2026 (177 řádků); zbývají `BulkEdit` (973),
`PladiasRecordsTable` (518) a `SquaresOverlay` (517).*

---

## F – Testovací pokrytí: z infrastruktury na feature

**Současný stav.** 10 testovacích souborů / 62 testů – výhradně infrastruktura (`apiClient`,
`notificationStore`, `ErrorBoundary`, `Toasts`, `useConfirm`, `useInstanceMessages`, `i18n`,
`InstanceMessage`, `UserRole`, `TaxonName`). Netestované je **jádro**:

- `DataTable` – používá ji 10 komponent (`RecordsDataTable`, `TaxaList` ×2, `UsersTable`,
  `Bibliography`, `ListOfControls`, `ListOfImports`, `ImportsList`, `MapUsers`, `RecordHistory`).
- `core/mapLayers` – registry, `layerStore`, `layerCache`, `generateCacheKey`: čistá logika bez
  Leafletu, levné testovat.
- Sestavení search parametrů (sort/filters/pagination), inline editace a 409 konflikty,
  BulkEdit potvrzovací flow, `useTaxonUpdates`.

Coverage se neměří.

**Návrh.** Priority podle poměru riziko/náklady:
1. ~~**`DataTable`** – render sloupců, filter row, paginace, optimistic update přes `onRowUpdate`.~~
   ✅ *Hotovo 21. 10. 2026 (refactor 16):* `DataTable.test.tsx`, 8 testů bez sítě (custom fetcher)
   – render sloupců všech typů (text/boolean/number/timestamp/action/checkbox), filter row
   (text/boolean/select, reset stránky, vymazání), řazení 3-stav, paginace + změna pageSize,
   optimistic update i rollback. Bonus: opraven latentní bug – `getFilterPlaceholder` ignoroval
   `column.filterPlaceholder` (nastavovaly ho TaxaList ×2).
2. **`core/mapLayers` logika** – registry, store, cache, key generation (čisté funkce).
3. **Business logika** – ~~buildSearchParams (po E),~~ ✅ *hotovo 21. 10. 2026 (refactor 17):
   `searchRequest.test.ts` – export_type, FormData+řazení, pageSize, paginace (10 testů)*;
   BulkEdit confirm flow (po E), `useTaxonUpdates` (po D).
4. Vzory: `vi.stubGlobal("fetch", …)` z `apiClient.test.ts` – žádné MSW, žádná nová závislost.
5. Volitelně `@vitest/coverage-v8` (dev-dependency) pro report – zavadět, až když se testy stanou
   metrikou; jinak postačí pravidlo „nový service modul / hook přichází s testem".

**Kroky.** Testy psát **krok v kroku s A–E** – migrace služeb a dekompozice jsou okamžiky, kdy se
testy píší levně. Ne jako samostatná vlna po všem.

**Rizika.** Testovat `Layer.tsx` v aktuálním stavu je drahé (potřebuje Leaflet) – proto nejprve
C/E.

**Hotovo, když.** DataTable + mapLayers logika + search params + BulkEdit mají testy; počet
testů ~150+; každý nový service modul má test.

---

## G – Konzistence UX primitiv

**Současný stav.**
- `TaxonSynonyms.tsx:148` používá nativní `confirm(t(…))` – všude jinde je `useConfirm` hook s
  `ConfirmDialog` (protractor-jednotné UX, focus handling, notifikace).
- 77 `console.*` volání v produkčních cestách; část z nich je **jediná indikace chyby** (chyba
  skončí v konzoli, uživatel nic nezjistí).
- Chybové stavy se řeší mixem stylů: inline `setError` string, toast přes `pushNotification`,
  nebo tichý catch.

**Návrh.**
1. `TaxonSynonyms` → `useConfirm` (jediné místo s nativním `confirm`). *(Hotovo 20. 10. 2026 – fáze 1.)*
2. Pravidlo do [conventions.md](./conventions.md): catch apiClient volání vždy
   `notifyApiError(err, fallback)`; inline error jen pro validace formulářových polí. *(Hotovo 20. 10. 2026 – fáze 1.)*
3. `console.*` odstranit tam, kde existuje/náleží uživatelská hláška; zbytek smazat s migrací A.
   *(Částečně hotovo 20. 10. 2026 – fáze 1: ošetřeny soubory dotčené fází 1; zbytek s migrací A.)*

**Rizika.** Žádná – jde o konzistenci.

**Hotovo, když.** `grep -rn "[^.a-zA-Z]confirm(" src --include='*.tsx' | grep -v useConfirm |
grep -v node_modules` vrací 0; žádná catch větev není němá.

---

## H – HTML injekce mimo RichTextMessage

**Současný stav.** 7 výskytů `dangerouslySetInnerHTML` mimo `RichTextMessage`
(conventions.md: „the only component allowed"):

- `pages/atlas/MapDetail.tsx:303` – `taxon?.nameHtml` (backend rich-text, trusted zdroj).
- `components/atlas/mapMain/InfoPanel.tsx:223` a `mapPreview/InfoPanel.tsx:79` – `taxonName`
  (backend).
- `mapMain/InfoPanel.tsx:309, 323, 326, 330` – **překladové klíče** `t("…revisionStatus.*")`
  renderované jako HTML **jen kvůli entitě `&ndash;`** v `cs/translation.json`.

**Návrh.**
1. Entity `&ndash;` (a případné další `&hellip;` apod.) v `cs/translation.json` nahradit přímo
  znaky `–` – klíče pak renderovat jako obyčejný text, `dangerouslySetInnerHTML` z InfoPanelů
  zmizí.
2. Backend rich-text (`nameHtml`, `taxonName`) směrovat přes `<RichTextMessage html={…} />` –
   komponenta na to existuje, jen se v mapách nepoužívá.

**Rizika.** Zkontrolovat, že `nameHtml`/`taxonName` obsahují jen očekávané konstrukty (sub/sup/i
dle nomenklatury) – formát se nemění, jen se centralizuje escaper.

**Hotovo, když.** `grep -rln "dangerouslySetInnerHTML" src --include='*.tsx'` vrací jen
`RichTextMessage.tsx`. *(Hotovo 20. 10. 2026 – fáze 1.)*

---

## I – i18n: obsahová strategie pro en/pl

**Současný stav.** Mechanismus je hotový (i18next, fallback cs, audit v CI). Obsah: **cs 978
klíčů, en 8, pl 8** – anglické a polské UI de facto neexistuje (8 klíčů je zbytková obsluha
error boundary a notifikací). Audit `i18n:check` chybějící en/pl hlásí jen informativně.

**Návrh.** Vědomé rozhodnutí, ne mlžení:
- **(a) en/pl udržovat** → přeložit ~970 klíčů (obsahová práce pro botaniky-překladatele, ne pro
  vývojáře) a zpřísnit `check-i18n.mjs` na chybějící klíče jako error.
- **(b) en/pl vypustit (doporučeno, dokud není poptávka)** → odstranit `en/pl` soubory a z
  `LOCALES` v check skriptu. Mechanismus (i18next, `changeLanguage`, audit) zůstává – vrátit se
  lze kdykoliv přidáním souboru. Konzistentní české UI je lepší než UI z 99 % cs + 1 % en.

**Rizika.** (a) je dlouhodobý závazek k překladu každého nového klíče; (b) vyžaduje komunikaci s
případnými en/pl uživateli (interní app – předpoklad: nejsou).

**Hotovo, když.** rozhodnutí je zapsané zde; stav buď (a) přeloženo + audit přísný, nebo
(b) en/pl soubory odstraněny.

---

## J – Server-state: jednotný data-fetching vzor

**Současný stav.** Každá komponenta si ručně píše `useEffect + useState(data/loading/error)`.
Chybí: cachování a deduplikace (číselníky – projekty, herbáře, instituce, licence, taxonranks,
datatypes – se načítají znovu na každé obrazovce, která je potřebuje), rušení požadavků,
jednotná invalidace po mutacích. Vzorů je víc (`useProjectsData`, `useImportData`, inline v
komponentách) a všechny stojí na raw fetch (viz A).

**Návrh.**
- *Lazy varianta (doporučeno):* po migraci A standardizovat `useXxxData` hooky per doména nad
  `apiClient` s `AbortSignal`; sdílené číselníky centralizovat do jednoho hooku s modulovou
  cache (vzor `ProjectNameContext` už v kódu je).
- *Enterprise varianta (decision point):* TanStack Query (~13 kB gzip) – cache, invalidace,
  retry, devtools. Pro: řeší vzorce, které si jinak píšeme sami. Proti: nová závislost
  ([seniorDeveloper.md](./seniorDeveloper.md) – „no new dependency if it can be avoided") a app
  má ~40 GET endpointů s jedním dominantním patternem (tabulka + číselníky).
- **Doporučení: lazy varianta; TanStack Query přehodnotit, až když začnou reálně bolet
  duplicitní načítání a zapomenuté invalidace.**

**Rizika.** Modulová cache číselníků bez invalidace – po mutaci správcovských číselníků je třeba
cache umět promáčknout (reload stránkou je pro interní app přijatelný fallback).

**Hotovo, když.** číselníky se per session načítají jednou; feature hooky mají jednotný tvar
`(data, loading, error, reload)`.

---

## K – Přístupnost (a11y)

**Současný stav.** Základ dává Bootstrap (sémantické tabulky, formuláře), ale:
- `ConfirmDialog` nemá focus management – žádný focus při otevření, žádný návrat fokusu po
  zavření, žádná obsluha `Escape`, chybí `role="dialog"`/`aria-modal`.
- `aria-*` atributy jsou jen v ~14 souborech; icon-only buttony (editace/smazání v tabulkách)
  mívají jen vizuální tooltip.

**Návrh.**
1. `ConfirmDialog`: focus do dialogu při otevření + návrat po zavření + `Escape` = cancel +
   `aria-modal` + `role="dialog"`.
2. Icon-only buttony: doplnit `aria-label`.
3. Jednorázový průchod Lighthouse/axe (rozšíření prohlížeče) na klíčových obrazovkách – chyby
   opravit; audit **nezavádět** do CI (interní app, poměr nákladů/výnosů).

**Rizika.** Žádná technická.

**Hotovo, když.** dialog je plně obsluhovatelný z klávesnice; icon-only buttony mají labely.

---

## L – Observabilita chyb za běhu

**Současný stav.** `ErrorBoundary` loguje do `console.error` – dál se nic neděje. Runtime chyby
uživatelů se dozvídáme od uživatelů (botaniků), ne ze systému. Žádný source map upload, žádné
release tracking.

**Návrh (decision point).**
- *Minimální varianta:* `ErrorBoundary` + `window.onerror` → POST na nový BE endpoint (malý
  controller, ukládat do logu). Bez nové FE závislosti.
- *Enterprise varianta:* Sentry/GlitchTip self-hosted – bohatší (source mapy, release tracking,
  seskupování), ale nová infrastruktura a závislost.
- **Doporučení: zatím nic neměnit; minimální variantu zavést, až když se ukáže, že diagnóza
  produkčních chyb bolí (malý uživatelský okruh, interní app – YAGNI).**

**Hotovo, když.** chyby renderu končí v prohledávatelné agendě (nebo je rozhodnuto je nesledovat
a je to zde zdokumentováno).

---

## M – Bundle a CSS hygiena

**Současný stav.**
- `main.css` **314 kB** – obsahuje celý Bootstrap dist CSS + ikonové fonty (~470 kB assetů) +
  Leaflet + aplikace.
- Bootstrap CSS se importuje **uvnitř komponenty** (`core/MainMenu.tsx:3`
  `import 'bootstrap/dist/css/bootstrap.min.css'`; `bootstrap-icons` navíc v
  `pages/measurements/Datatypes.tsx`) – vendor styly se táhnou import grafem komponent, ne
  vstupním bodem.
- **Dvojí ikonová strategie:** třídy `bi-*` (bootstrap-icons) v 20 souborech a zároveň
  `react-icons` jako dependency (použito v 1 souboru).
- Plain `.css` soubory vedle SCSS konvence: `search/SearchForm.css`, `BulkEdit.css` – globální
  CSS bez namespacingu, riziko kolizí tříd.

**Návrh.**
1. Vendor styly (`bootstrap/dist/css`, `bootstrap-icons`, `leaflet`) konsolidovat do vstupního
   bodu `index.tsx` – jediné místo, kde se řeší globální vzhled.
2. Jedna ikonová sada: zůstat u `bi-*` (20 souborů), poslední použití `react-icons` převést a
   dependency odebrat.
3. Plain `.css` převést na SCSS s BEM namespacingem ([conventions.md](./conventions.md)).
4. Volitelně: Bootstrap ze SCSS source s vypnutím nepoužitých komponent (potenciálně ~100+ kB
   méně) – měřit před/po (`npx vite-bundle-visualizer`, žádná trvalá devDependency).

**Rizika.** Přesun importů mění pořadí kaskády – po každém kroku vizuální kontrola klíčových
obrazovek (mapy, tabulky).

**Hotovo, když.** vendor styly importované na jednom místě; jediná ikonová sada; žádný plain
`.css` mimo `node_modules`.

---

## N – CI/CD: dependabot pro npm, lint gate

**Současný stav.** CI (`frontend.yml`) je nadprůměrné: guard proti JS souborům, i18n audit,
build, test – vše blocking kromě lintu (viz B). **Dependabot ale pokrývá jen `docker` a
`github-actions`** – npm (React, Vite, react-leaflet, i18next…) jako hlavní dependency surface
nemá automatizované updaty. `frontend/README.md` chybí (příkazy jsou jen v `docs/`).

**Návrh.**
1. Do `.github/dependabot.yml` přidat `package-ecosystem: npm` s `directory: /frontend`
   (skupinový update minor/patch, týdně; major ručně). *(Hotovo 20. 10. 2026 – fáze 1.)*
2. Po splnění B odstranit `continue-on-error: true` u lintu.
3. Krátký `frontend/README.md`: dev/build/test/lint/i18n:check + poznámka o BE proxy na
   `localhost:9443` + odkaz do `docs/`.

**Rizika.** Dependabot npm může generovat šum u major verzí – omezit na minor/patch grouping.

**Hotovo, když.** dependabot otvírá PR na npm balíčky; lint fáze je blocking; README existuje.

---

## O – Drobný dokumentační dluh

**Současný stav.** Odkazy na smazaný plán prvního kola zůstaly viset v komentářích kódu a CI –
nový vývojář hledá sekce, které už neexistují. *(Vyřešeno 20. 10. 2026 – fáze 1: odkazy
odstraněny ze všech ~30 dotčených souborů, včetně dalších mimo původní výčet.)*

**Návrh.** Odkazy odstranit (preferováno – odkazy na sekce dokumentu stárnou nejhůř) nebo
přesměrovat na tento dokument.

**Hotovo, když.** grep na název smazaného souboru v `docs frontend .github` vrací 0.
*(Ověřeno 20. 10. 2026.)*

---

## Doporučené pořadí realizace

**Fáze 1 – Bug fixy a rychlé vítězství (~1 týden)** – *hotovo 20. 10. 2026:*
~~B.1 `rules-of-hooks` (11 latentních bugů) → H (entity v překladech + `RichTextMessage`) →
G (confirm konzistence) → N.1 dependabot npm → O (odkazy na smazaný plán).~~

**Fáze 2 – Service vrstva (1–2 týdny, krájená po feature):** *hotovo 20. 10. 2026:*
~~A po krocích 1–5 (taxonAdmin → measurement → pages/atlas → autocomplete → mapLayers); ke každému
service modulu test parsování (F.4); na konci B.2–B.6 – lint gate v CI.~~ (Navíc: search/import/
mapAdmin/playMessage/downloads domény, AbortSignal u typeahead, `_` konvence v lintu, lint gate
blocking – `grep fetch(` mimo `src/services/` = 0, `npm run lint` exit 0, 165 testů.)

**Fáze 3 – Kvalita jádra (průběžně, po feature):** *mapová doména hotova 21. 10. 2026
(refactor 12–15):*
~~C+D+E na mapové doméně (Layer/SquaresOverlay/MapComponent společně)~~ – Layer.tsx 614 → 105
řádků (dispatcher + subkomponenty per `service.type` s typovanými props, `wfsBounds` s 5 testy),
společné jádro `MapCanvas`+`MapLayer`, mrtvé duplicity v taxaList smazány (D.1, D.2, D.4);
`any` v core = 0, lint 0, 170 testů. *DataTable (C.2+F.1) hotovo 21. 10. 2026 (refactor 16):*
C.2 hotovo (generika z B.4, `any`=0) + 8 testů přes custom fetcher; opraven ignorovaný
`column.filterPlaceholder` v `getFilterPlaceholder`. *SearchForm (E.1+F.3) hotovo 21. 10. 2026
(refactor 17):* 952 → 177 řádků (hooks + components + čisté `searchRequest.ts` s 10 testy);
188 testů. Zbývá: BulkEdit (E.3+F); SquaresOverlay (517 ř.), PladiasRecordsTable (518 ř.)
a D.3 TaxaList průběžně. Deduplikaci (D) zařazovat vždy, když se
dotýkáme konkrétního duplikátu.

**Fáze 4 – Rozhodnutí a hygiena (dle produktových priorit):**
I (i18n obsah), J (data-fetching vzor), K (a11y), L (observabilita), M (bundle/CSS).

## Co záměrně nedělat (YAGNI)

Viz [seniorDeveloper.md](./seniorDeveloper.md) – „The best code is the code never written."

- **Redux / RTK** – zustand + contexts pokrývají současné potřeby (notifikace, vrstvy, projekt);
  další globální store by byl jen boilerplate.
- **MSW** – vzor `vi.stubGlobal("fetch")` z `apiClient.test.ts` je menší a dostačující.
- **Storybook** – malé množství sdílených komponent, konvence pokrývá `docs/`; zavádět až při
  větší poptávce po design systemu.
- **CSS-in-JS / migrace na Tailwind** – SCSS + Bootstrap zavedené a funkční; migrace = riziko bez
  přímého užitku.
- **E2E (Playwright)** – dokud CI pravidelně neláme kritické toky, nemá podklad pro údržbu; pak
  jen smoke (přihlášení + vyhledání + detail záznamu).
- **Coverage gate** – číslo jako cíl vede k naplňování metriky místo kvality testů. Report ano,
  gate až bude stabilní testovací kultura.
- **Prettier / formátovací nástroje** – ESLint + `.editorconfig` formát drží dostatečně; nová
  dependency pro kosmetiku ne.
- **Zpřísnění i18n auditu na en/pl** – až po rozhodnutí v I.

---

*Průzkum a dokument: Cline, 20. 10. 2026. Všechny metriky jsou ověřitelné příkazy uvedenými
v jednotlivých sekcích; dokument aktualizovat po dokončení každé fáze (škrtnutí + datum).*


