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
- hotovo: fáze 0 Příprava (I – Vitest + CI workflow; J – type-safe i18n klíče) i fáze 1 Jazyk (C – celý src v TypeScriptu, importy bez přípon, allowJs: false, pravidla state v conventions.md)
- next: fáze 2 Isolace (D – apiClient.ts + service vrstva, postupná migrace axios → fetch, odebrání axios)
- soupis k migraci (fáze 2): 118× fetch() + 22 souborů s axios:
  - src/components/atlas/listOfControls/ListOfControls.tsx
  - src/components/atlas/listOfControls/hooks/useImportControlsData.ts
  - src/components/atlas/listOfImports/hooks/useImportsData.ts
  - src/components/atlas/mapDetail/MapComponent.tsx
  - src/components/atlas/mapDetail/hooks/useRecordQuickUpdates.ts
  - src/components/atlas/mapMain/InfoPanel.tsx
  - src/components/atlas/mapPreview/InfoPanel.tsx
  - src/components/atlas/mapPreview/MapComponent.tsx
  - src/components/atlas/taxaList/components/PngUploadButton.tsx
  - src/components/atlas/taxaList/hooks/useTaxaData.ts
  - src/components/atlas/taxaList/hooks/useTaxonUpdates.ts
  - src/components/atlasAdmin/importsList/hooks/useImportsData.ts
  - src/components/atlasAdmin/mapUsers/hooks/useMapUsersData.ts
  - src/components/atlasAdmin/mapUsers/hooks/useMapUsersProjects.ts
  - src/components/atlasAdmin/mapUsers/hooks/useMapUsersTaxa.ts
  - src/components/atlasAdmin/taxaList/components/PngUploadButton.tsx
  - src/components/atlasAdmin/taxaList/hooks/useTaxaData.ts
  - src/components/atlasAdmin/taxaList/hooks/useTaxonUpdates.ts
  - src/core/dataTable/export/useExcelExport.ts
  - src/core/dataTable/hooks/useTableData.ts
  - src/core/mapLayers/components/ProjectLayers.tsx
  - src/core/mapLayers/hooks/useProjectLayers.ts
