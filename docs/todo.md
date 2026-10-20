## now:

**V:**
- mapový náhled výsledků vyhledávání, bulkEdit

**P:**
- pomalost databáze v CERIT
- optimalizace detailMap

## next:
**V:**
- CSV pro mapu - jeslti se nepletu tak chtěli aby se tam CSV "hromadila" - ale teď se mi zdá že je to 1:1, že se drží jen poslední..:
```sql SELECT taxon_id, COUNT(*) AS cnt
    FROM atlas.csv_map_details
    GROUP BY taxon_id
    HAVING COUNT(*) > 1;
```

**P:**
- floraveg/cevs do ceritu jako text
- mykoTest v cerit

## refactoring FE (docs/refactoring.md, sekce 15):
- hotovo: fáze 0 Příprava (I – Vitest + CI workflow; J – type-safe i18n klíče), fáze 1 Jazyk (C – celý src v TypeScriptu, importy bez přípon, allowJs: false, pravidla state v conventions.md) i fáze 2 Isolace (D – viz níže)
- hotovo fáze 2 (D – Isolace):
  - `src/services/apiClient.ts` + 20 unit testů (obálka JsonResult, 401 → /login, 403 → centrální handler, blob helper s kontrolou Content-Type, urlencoded s LF, legacy string, abort detekce)
  - service vrstva: `services/userApi.ts`, `services/settingsApi.ts`, `services/bulkEditApi.ts` (etalon přesunut z components/atlas/search/)
  - user stránky na services: AddUser, ChangeEmail, ChangePassword, Settings (+ `useUserSettings`, `App.tsx` config fetch přes `loadReactConfig`)
  - `useTableData` + `useExcelExport` na apiClient; všech 22 souborů s axios přemigrováno; axios odebrán z package.json (−1 runtime dependency)
  - conventions.md: nová sekce HTTP Communication (apiClient)
- hotovo fáze 3 (Odolnost – A, G, B):
  - A: `hooks/useInstanceMessages.ts` heartbeat (visibilitychange pozastavení ve skryté záložce + okamžitý tik při návratu, exponenciální backoff 30 s → 1 min → 2 min → 5 min strop, selhání nemaže poslední zprávy, „nedostupné“ po 3 selháních, 401 řeší apiClient) + 5 unit testů na fake timerech; `FlashMessages.tsx` nyní prezentační (props), `models/InstanceMessage.ts` + parser, `services/instanceApi.ts` (infoGlobal – pole bez obálky; `loadProjectName` s AbortController – ProjectNameContext přešel na service)
  - G: `components/ErrorBoundary.tsx` (jediná class komponenta – výjimka zdokumentovaná v conventions.md) zapojený v Layout (kolem Outlet) i App (kolem Suspense pro rozbité lazy chunky); `useConfirm()` + `ConfirmDialog` nahradily všech 8× `window.confirm` (MoveTaxonCard, BulkEdit 4×, MultiSelectEdit, RecordComments, TraitTable – ten dostal i i18n klíč trait.deleteConfirm místo hardcoded textu)
  - B: `models/UserRole.ts` (USER_ROLES zrcadlí BE enum 1:1, `parseRoles` loguje drift BE↔FE), `ProtectedRoute` typovaný (`UserRole`, `InstanceModule`), `InstanceConfig.hasModule()` deklarativně; biblioAdmin zůstává (konzumuje UsersTable); volitelný refresh rolí v heartbeatu (B.4) odložen – mění runtime chování, zavádět až po ověření A v provozu
  - docs: conventions.md sekce Error Handling & Resilience; gotchas.md sekce Resilience (heartbeat, role) + výjimka infoGlobal
- next: fáze 5 Průběžně (H – dekompozice velkých komponent při dotažených úpravách, E – zbývající formuláře, B.4 – refresh rolí v heartbeatu až po ověření A v provozu, J – i18n audit en/pl)
- hotovo fáze 4 (UX – F, K):
  - F: `stores/notificationStore.ts` (zustand; `push`/`dismiss`/`clear`, auto-dismiss success/info/warning 5 s, danger sticky, `html` varianta pro důvěryhodný backend rich-text) + imperativní `pushNotification` a `notifyApiError` (deduplikace přes `ApiError.notified`, ignoruje aborty); `<Toasts />` (bottom-right Alert stack, `aria-live`, lokalizovaný close) v `Layout.tsx` mimo ErrorBoundary; `App.tsx` zapojuje `setForbiddenHandler` + `setNetworkErrorHandler` (texty přes i18n v okamžiku zobrazení)
  - apiClient: `ApiError.notified`, `ApiOptions.silent` (heartbeat `loadInstanceMessages` + `loadProjectName` – graceful fallback, centrální toast by byl šum), `setNetworkErrorHandler`
  - migrace všech 7 souborů s `useState<Flash>` → store (Export, FeatureDetail, TraitTable, BackupForm, ListOfControls, MapUsers, ImportsList); `models/Flash.ts` + 3 lokální `*Flash` komponenty + nepoužívaná rozhraní `FlashMessage` (5× types.ts) smazány; Export si ponechává jen inline Alert se seznamem `invalidTaxa` (uživatel podle něj opravuje formulář); `window.__FLASH__` (injectuje `app/views/react/index.scala.html`) jde do rich-text notifikace – gotchas.md
  - K: `components/RichTextMessage.tsx` – jediné místo s `dangerouslySetInnerHTML`; 14 výskytů převedeno (TaxonName, TraitTable 2×, FeatureDescription 2×, PlayMessage, DatatypeDescriptionPopover, AggregationTable, AggregationTypes, LanguageSettings, TraitsSettings, ExportTraitList, PladiasRecordsTable, RecordFloristic + html notifikace v Toasts); zbývají jen mapové popup šablony (MapDetail, InfoPanel ×2 – 7 výskytů, zdokumentovaná výjimka)
  - i18n: `common.close` (en/pl), `common.notification.networkError` (cs/en/pl); testy: notificationStore (10), Toasts (4), apiClient +3 (network handler, silent, 403 notified) – 62/62 zelených
  - pozn.: raw `fetch()` v dotčených souborech (Export, FeatureDetail, TraitTable, BackupForm) záměrně nemigrován – fáze 4 je čistě UX swapon beze změny tvaru requestů; migrace dle D.4 pokračuje samostatně (při ní catch přejde z `push` na `notifyApiError`)
- soupis k migraci (průběžně, dle D.4 – stahovat do services při každé úpravě souboru): zbývá 104× přímé `fetch()` v 58 souborech mimo `src/services/` (původně 118; hotové: axios soubory, FlashMessages, ProjectNameContext):
  - src/components/atlasAdmin/importsList/hooks/useImportsActions.ts
  - src/components/atlasAdmin/mapUsers/hooks/useMapUsersProjects.ts
  - src/components/atlasAdmin/mapUsers/hooks/useMapUsersTaxa.ts
  - src/components/atlasAdmin/mapUsers/MapUsers.tsx
  - src/components/atlasAdmin/taxaList/components/ParentMapAutocomplete.tsx
  - src/components/atlasAdmin/TaxaList.tsx
  - src/components/atlas/importCsv/hooks/useImportCSVData.ts
  - src/components/atlas/import/hooks/useImportData.ts
  - src/components/atlas/import/hooks/useProjectsData.ts
  - src/components/atlas/record/MultiSelectEdit.tsx
  - src/components/atlas/record/RecordInlineField.tsx
  - src/components/atlas/record/RecordMap.tsx
  - src/components/atlas/record/recordService.ts
  - src/components/atlas/record/SingleSelectEdit.tsx
  - src/components/atlas/search/BulkEdit.tsx
  - src/components/atlas/search/SearchForm.tsx
  - src/components/atlas/taxaList/components/ParentMapAutocomplete.tsx
  - src/components/atlas/TaxaList.tsx
  - src/components/autocomplete/TaxaAllProvider.tsx
  - src/components/autocomplete/TaxaImportableProvider.ts
  - src/components/autocomplete/TaxaPossibleParentAutocomplete.tsx
  - src/components/downloads/DownloadsTable.tsx
  - src/components/edit/TaxonInlineField.tsx
  - src/components/measurement/AggregationTable.tsx
  - src/components/measurement/backup/BackupForm.tsx
  - src/components/measurement/backup/BackupTable.tsx
  - src/components/measurement/DatatypesTable.tsx
  - src/components/measurement/export/ExportOptions.tsx
  - src/components/measurement/export/ExportTraitList.tsx
  - src/components/measurement/FeatureDescription.tsx
  - src/components/measurement/TraitTable.tsx
  - src/components/measurement/TraitUpload.tsx
  - src/components/settings/PlayMessage.tsx
  - src/components/taxonAdmin/ChildrenOrderingCard.tsx
  - src/components/taxonAdmin/MoveTaxonCard.tsx
  - src/components/taxonAdmin/NewTaxonCard.tsx
  - src/components/taxonAdmin/TaxonAllAutocomplete.tsx
  - src/components/taxonAdmin/TaxonDetail.tsx
  - src/components/taxonAdmin/TaxonEditCard.tsx
  - src/components/taxonAdmin/TaxonStats.tsx
  - src/components/taxonAdmin/TaxonSynonyms.tsx
  - src/components/taxonAdmin/TaxonTraitCount.tsx
  - src/components/user/PlayMessagesEditor.tsx
  - src/components/user/UsersTable.tsx
  - src/core/mapLayers/components/Layer.tsx
  - src/core/mapLayers/components/SquaresOverlay.tsx
  - src/core/mapLayers/factory/adapters/universalAdapter.ts
  - src/core/mapLayers/hooks/useLayerManager.ts
  - src/core/mapLayers/hooks/useProjectLayers.ts
  - src/pages/atlas/MapDetail.tsx
  - src/pages/atlas/MapMain.tsx
  - src/pages/atlas/MapPreview.tsx
  - src/pages/atlas/NewComments.tsx
  - src/pages/atlas/Record.tsx
  - src/pages/measurements/Data.tsx
  - src/pages/measurements/Export.tsx
  - src/pages/measurements/FeatureDetail.tsx
  - src/pages/user/TaxaAdministration.tsx
