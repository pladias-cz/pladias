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
- next: fáze 3 Odolnost (A – useInstanceMessages heartbeat; G – ErrorBoundary; B – typované role)
- soupis k migraci (průběžně, dle D.4 – stahovat do services při každé úpravě souboru): zbývá 106× přímé `fetch()` v 60 souborech mimo `src/services/` (původně 118; axios soubory hotové):
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
  - src/context/ProjectNameContext.tsx
  - src/core/FlashMessages.tsx
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
