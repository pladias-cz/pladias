# Chování JAVA backendu aplikace při editacích

**prompt:**
     Aktualizuj tento markdown dokument, ve kterém bude popsáno srozumitelně shrnuto současné chování JAVA backendu aplikace při editaci jakéhokoli pole v databázi. Začni u seznamu endpointů v conf/react.routes, vyber všechny post+put+delete+patch endpointy a ty zpracuj - kdo smí akci provést, zda to vyvolává nějaké související akce. Některé routy jsou velmi komplexní (jako POST /import/upload ), tak u těch stačí uvést jen kdo je smí zavolat.
    GET routy zkontroluj také, uveď přehled které jsou dostupné bez přihlášení nebo u které se ti visibility nezdá v pořádku s ostatní logikou aplikace.
    Zkontroluj že se všechny změny záznamů zapisují do historie a uveď pokud se u některé editace záznamu nepoužívá concurrency control.
    Zdůrazni pokud by někde byla editace možná bez kontroly oprávnění či by se ti zdál nesoulad mezi jednotlivými endpointy pracujícími se stejnými entitami, vezmi ale v potaz [záměrné odchylky](gotchas.md)

---

Tento dokument popisuje chování aplikace při editaci dat v databázi. Jsou zde shrnuty všechny POST, PUT, DELETE a PATCH endpointy z `conf/react.routes`, včetně podmínek oprávnění a souvisejících akcí. Aktualizováno podle aktuálního stavu kódu (controllers, services, security třídy).

> ⚠️ Shrnutí nejzávažnějších nálezů najdete v sekci [Zjištěné problémy s oprávněními a nesoulady](#zjištěné-problémy-s-oprávněními-a-nesoulady).

## Obsah

1. [Záznamy (Records)](#záznamy-records)
2. [Komentáře k záznamům](#komentáře-k-záznamům)
3. [Přehledová tabulka: historie změn a concurrency kontrola](#přehledová-tabulka-historie-změn-a-concurrency-kontrola)
4. [Importy](#importy)
5. [Vyhledávání a hromadné editace (Search)](#vyhledávání-a-hromadné-editace-search)
6. [Taxony](#taxony)
7. [Synonyma](#synonyma)
8. [Měření a vlastnosti (Measurement / Traits)](#měření-a-vlastnosti-measurement--traits)
9. [Nastavení map taxonů (TaxonMapSettings)](#nastavení-map-taxonů-taxonmapsettings)
10. [Uživatelé](#uživatelé)
11. [Map Reports](#map-reports)
12. [PNG mapy](#png-mapy)
13. [Přehled rolí](#přehled-rolí)
14. [Zjištěné problémy s oprávněními a nesoulady](#zjištěné-problémy-s-oprávněními-a-nesoulady)
15. [Poznámky](#poznámky)

---

## Záznamy (Records)

### PATCH `/atlas/record/:recordId` – Editace pole záznamu (`RecordUpdateController.editField`)

**Kdo smí provést:**
- Uživatel musí být přihlášen (`@Security.Authenticated(Authorized.class)` na úrovni třídy)
- Záznam musí existovat
- Musí platit `record.isUserElligibleToEditCommonFields(currentUser)`:
  - autor nebo committer batche, pokud je `validationStatus == Unprocessed`, **NEBO**
  - bulk editor (`UserUtils.isBulkEditor` – speciální uživatel `user.BulkImporter`; smí editovat všechna pole záznamů, ale nesdílí žádné další mapAdmin kompetence), **NEBO**
  - `isUserElligibleToEditEverything(currentUser)` vrátí `true` (mapAdmin, revizor taxonu nebo jeho nadřazených taxonů, správce projektu záznamu)
- Pro validační pole (`VALIDATION_STATUS`, `ORIGINALITY_STATUS`, `HERBARIUM_QUALITY`, `INCLUDED_IN_MAP`, `ENVIRONMENT`, `DETREV`, `REMARK_EXCERPTION`, `REMARK_OTHER`, `REMARK_DOUBT`) se **v service** (`RecordsService.editField`) ještě jednou kontroluje `canEditValidationFields` (historicky `isElligibleForRecordValidation`) – mapAdmin, bulk editor nebo **přímý** revizor taxonu

> ☝️ Jednotným zdrojem všech tří pravidel editace záznamů je od refaktoru služba `RecordEditPermissions` (`app/service/records/RecordEditPermissions.java`) – metody `canEditCommonFields` / `canEditValidationFields` / `canResolveComments`. Tatáž služba počítá i flagy `canEditCommonFields`, `canEditValidationFields` a `canResolveComments` v GET odpovědích (`RecordPladiasDto`, `RecordPladiasFullDto`, `RecordMapFieldsDto`, výsledky vyhledávání), takže DTO flagy zrcadlí kontroly write endpointů 1:1.

**Podmínky editace:**
- Záznam nesmí být uzamčen: `record.isLocked() == false`
- Editace musí být povolena: `record.isEditationAllowed() == true` (taxon není uzamčen kvůli generování mapy – kontroluje `TaxonMapSettings.isLocked()`)
- Klient musí poslat aktuální `lastEditTimestamp` (ochrana proti concurrency, jinak 409 Conflict)

**Související akce:**
- Vytvoření záznamu v `RecordHistory` (audit každé změny; pokud se hodnota oproti stávající nezmění, zápis se přeskočí)
- Aktualizace `lastEditTimestamp` na záznamu (pole má anotaci `@Version` – Ebean optimistic locking, každé `update()` entitu automaticky verzuje)
- Při změně souřadnic: přepočet fytochorionu a kvadrantů
- Volání `updateTaxonEditCount()` pro sledování počtu editací taxonu

**Pole, která lze editovat:**
- `PHYTOCHORION`, `LOCALITY`, `TAXON`, `ORIGINALNAME`, `NEARESTTOWNNAME`
- `ALTITUDEMIN`, `ALTITUDEMAX`, `ALTITUDEAPPROXIMATION`
- `IMPORTCOMMENT`, `COORDSPRECISION`, `DATE`
- `ADDFINDER`, `DELETEFINDER`, `ADDHERBARIUM`, `DELETEHERBARIUM`
- `SOURCE`, `ORIGINALID`
- `SUBSTRATE`, `CHEMICAL`, `SUBSTRATE2`, `LOCALITYEXTRA` (pole nescévakulárních rostlin)
- `VALIDATION_STATUS`, `ORIGINALITY_STATUS`, `HERBARIUM_QUALITY`, `INCLUDED_IN_MAP`
- `ENVIRONMENT`, `DETREV`, `REMARK_EXCERPTION`, `REMARK_OTHER`, `REMARK_DOUBT`

**Cascading změny u validačních polí:**

- `VALIDATION_STATUS`:
  - Nastavení na `Unprocessed`: resetuje `originality_status` na Undefined, `herbarium_quality` na false, `included_in_map` na false
  - Nastavení na `Accepted`: nastaví `included_in_map` na true; pokud má záznam herbaria a autor batche je currentUser, nastaví `herbarium_quality` na true
  - Nastavení na `Declined` nebo `Uncertain`: nastaví `included_in_map` na false; pokud byl předchozí status `Accepted` a `originality_status` není Undefined, resetuje `originality_status` na Undefined
- `ORIGINALITY_STATUS`:
  - Lze měnit pouze pokud `validation_status == Accepted` (jinak chyba)
  - Nastavení na `Cultivated`: vynuluje `included_in_map`
  - Změna z `Cultivated` na `Original`/`Unoriginal`: nastaví `included_in_map` na true
- Každá změna je zaznamenána do `RecordHistory` (včetně kaskádových změn příznaků)

---

### POST `/atlas/record/moveCoordinates` – Přesun záznamu na nové souřadnice (`RecordUpdateController.moveRecordCoords`)

**Kdo smí provést:**
- Přihlášený uživatel, u kterého `record.isUserElligibleToEditCommonFields(currentUser)` vrátí `true`:
  - autor/committer batche, pokud je záznam `Unprocessed`, **NEBO** bulk editor, **NEBO** mapAdmin / revizor / správce projektu
- Přesun není na rozdíl od `editField` omezen `isElligibleForRecordValidation` (nejde o semaforová pole), ale `record.isLocked()` se kontroluje stejně jako u `editField`.

**Podmínky editace:**
- Klient musí poslat aktuální `lastEditTimestampNum` (jinak 409)
- `record.isLocked() == false`, `record.isEditationAllowed() == true`

**Související akce:**
- Přepočet fytochorionu a kvadrantů po změně souřadnic
- Záznam do `RecordHistory` (`gps`, `coords_precision`, `coords_source`, `phytochorion_id`, `phytochorion_computed`)
- Při přesunu se z `remark_doubt` automaticky mažou systémové texty („okres dopočten automaticky“, nesoulad fytochorionu/kvadrantu atd.) – tato změna se zapisuje do `RecordHistory` jako editace pole `remark_doubt` (při shodě staré a nové hodnoty se zápis přeskočí; známá omezení matchování viz [poznámku níže](#mazání-systémových-textů-z-remark_doubt-známé-omezení-vyřešit-později))

---

## Komentáře k záznamům

Všechny endpointy `RecordCommentController` – přihlášený uživatel (`@Security.Authenticated(Authorized.class)`).
⚠️ Žádný z komentářových endpointů nepoužívá concurrency kontrolu přes timestamp od klienta – ochranu proti souběžné editaci zajišťuje jen `@Version` na entitě `RecordComment` (viz [přehledová tabulka](#přehledová-tabulka-historie-změn-a-concurrency-kontrola)).

### POST `/atlas/record/comment` – Vytvoření komentáře (`createComment`)

**Kdo smí provést:**
- přihlášený uživatel který má přiřazen alespon jeden projekt (tedy lidé aktivně pracující na mapování), ke **kterémukoli** záznamu (nekontroluje se vztah uživatele k záznamu/taxonu)

**Související akce:**
- Vytvoření záznamu `Comment` a asociace `users_comments` (aktuální uživatel)
- Záznam do `RecordHistory` (typ `COMMENT`, „comment added“)

---

### PUT `/atlas/record/comment/:commentId` – Editace komentáře (`updateComment`)

**Kdo smí provést:**
- `record.isUserElligibleToEditEverything(currentUser)` – tj. mapAdmin, revizor taxonu (vč. nadřazených taxonů) nebo správce projektu, autor komentáře nikoliv

**Související akce:**
- Aktualizace textu komentáře, záznam do `RecordHistory`

---

### DELETE `/atlas/record/comment/:commentId` – Smazání komentáře (`deleteComment`)

**Kdo smí provést:**
- Autor komentáře **NEBO** mapAdmin

**Související akce:**
- Smazání komentáře včetně asociací `users_comments`, záznam do `RecordHistory`

---

### POST `/atlas/record/comment/:commentId/resolve` – Vyřešení komentáře (`resolveComment`)

**Kdo smí provést:**
- `record.isUserElligibleToEditEverything(currentUser)` (mapAdmin / revizor / správce projektu)

**Související akce:**
- Nastavení příznaku vyřešení, záznam do `RecordHistory` („comment resolved“; notifikace se **neodesílají**)

---

### DELETE `/atlas/record/comment-assoc/:commentId/linked-user/:boundUserId` – Zrušení asociace uživatele s komentářem (`deleteUserCommentAssociation`)

**Kdo smí provést:**
- Master admin (`UserUtils.getMasterAdmin()`) **NEBO** uživatel sám (odstranění sebe z notifikací na komentář)

**Související akce:**
- Přímé mazání z `users_comments` (raw SQL, bez concurrency kontroly)
- Záznam do `RecordHistory` („marked as read“)

---

## Přehledová tabulka: historie změn a concurrency kontrola

Přehled všech mutujících endpointů z hlediska auditu změn a ochrany proti souběžným (konkurenčním) editacím. U záznamů je `lastEditTimestamp` pole s anotací `@Version` (Ebean optimistic locking) – každé `update()` verzi automaticky posune a editace zastaralé verze selže.

### Záznamy (Record) a komentáře

| Endpoint / akce | Mění záznam | Zápis do `RecordHistory` | Concurrency kontrola |
|---|---|---|---|
| PATCH `/atlas/record/:recordId` | ✅ | ✅ pro každé skutečně změněné pole (při shodě staré a nové hodnoty se zápis přeskočí) | ✅ `lastEditTimestampNum` v controlleru + `@Version` |
| POST `/atlas/record/moveCoordinates` | ✅ | ✅ `gps`, `coords_precision`, `coords_source`, `phytochorion_id`, `phytochorion_computed`, `remark_doubt` (automatické promazání systémových textů) | ✅ timestamp v controlleru i service + `@Version` |
| POST `/atlas/record/comment` | ❌ (přidává komentář) | ✅ „comment added“ | – (nový záznam) |
| PUT `/atlas/record/comment/:commentId` | ❌ | ✅ „comment updated“ | ⚠️ jen `@Version` na `RecordComment` |
| DELETE `/atlas/record/comment/:commentId` | ❌ (soft delete) | ✅ „comment deleted“ | ⚠️ jen `@Version` |
| POST `/atlas/record/comment/:commentId/resolve` | ❌ | ✅ „comment resolved“ | ⚠️ jen `@Version` |
| DELETE `/atlas/record/comment-assoc/:commentId/linked-user/:boundUserId` | ❌ (raw SQL `users_comments`) | ✅ „marked as read“ | ❌ žádná |
| POST `/import/validate`, `/import/upload`, `/import/csv` | ✅ (vytvoření) | ⚠️ jen u předvalidovaných řádků (příznaky `validation_status`, `include_in_map`, `herbarium_quality`); vlastní hodnoty polí bez historie | ❌ |
| GET `/atlasadmin/deleteBatch/:batchId/password/:password` | ✅ (smazání) | ❌ – `records_history` se maže spolu se záznamy | ❌ |

### Ostatní entity

| Endpoint | Entita | Audit / historie | Concurrency kontrola |
|---|---|---|---|
| PATCH `/taxon/:id`, POST `/taxon`, POST `/taxon/:id/move`, POST `/taxon/moveBeforeSibling`, DELETE `/taxon/:id`, `/synonyms/*` | Taxon / Synonym | ❌ | ⚠️ globální `TaxonEditorLock` (v daný okamžik edituje jen jeden taxonAdmin) |
| POST `/atlasadmin/taxonMapSettings` | TaxonMapSettings | ❌ (pouze inkrement `editCount`) | ✅ `timestamp` |
| `/users*`, `/user/*` (vč. settings, práv, hesel) | User / UserSetting | ❌ | ❌ |
| `/measurement/*` (backup, trait, delete, setDefault) | Trait | ❌ | ❌ |
| POST `/atlas/pngMap/taxon/:taxonId` | PdfMap | ❌ | ❌ |
| POST `/atlasadmin/assignUserTaxon`, DELETE `/atlasadmin/removeUserTaxon/...` | User ↔ Taxon (supervisedTaxons) | ❌ | ❌ |
| POST `/atlasadmin/users/:userId/projects`, DELETE `/atlasadmin/users/:userId/projects/:projectId` | User ↔ Project (contributionProjects) | ❌ | ❌ |

---

## Importy

### POST `/import/validate` – Validace Excel souboru (`ImportController.validateExcel`)

**Kdo smí provést:**
- Libovolný přihlášený uživatel – u operace VALIDATION se kontroly oprávnění k projektu přeskočí

**Související akce:**
- Vytvoření záznamů `Excel` a `Batch` (batch není importován), vrácení výsledků validace; záznamy se neimportují do databáze

---

### POST `/import/upload` – Import Excel souboru (`ImportController.uploadExcel`)

**Kdo smí provést:**
- Přihlášený uživatel, který smí přispívat do cílového projektu: `user.canContributeInto(project)`

**Související akce (komplexní route – jen shrnutí):**
- Parsování a validace řádků, import záznamů (pouze pokud 0 chyb), nastavení `batch.imported = true`, Activity logging
- Historie: u předvalidovaných řádků se do `RecordHistory` zapisují pouze příznaky (`validation_status`, `include_in_map`, `herbarium_quality`), vlastní hodnoty polí bez historie

---

### POST `/import/csv` – Import CSV souboru (`ImportCSVController.uploadCsv`)

**Kdo smí provést:**
- Stejné podmínky jako u `/import/upload` (validace: přihlášený uživatel; import: `canContributeInto(project)`)

**Související akce:**
- Import probíhá asynchronně (tasky na pozadí), stav se dotazuje přes GET endpointy

---

### DELETE `/importResult/validated/:id` – Smazání výsledku validace (`ImportResultsController.deleteValidated`)

**Kdo smí provést:**
- Autor batche daného Excel souboru – mazání proběhne pouze pokud `batch.imported == false` **a** `currentUser == batch.author`

**Související akce:**
- Pouze smazání záznamu `Excel`; záznamy a batch zůstávají

---

### GET `/occurrence/imports/:id` – Stažení dekorovaného importního Excelu (`UploadExcel.downloadDecorated`)

**Kdo smí provést:**
- Autor dávky (`batch.author`, resp. `batch.committer` – u novějších dávek se obě pole plní uploadujícím uživatelem, u legacy dat se `author` doplňuje `batch.refresh()`) nebo mapAdmin

**Chování:**
- Neexistující `id` → `404`; neoprávněný uživatel → `403` (`UploadExcel.notAuthorized`)
- Návratová hodnota: binární soubor (`application/x-download`), filename dle stavu dávky (`imported` vs. dekorovaná verze)

---


### ➕ Mutující GET endpointy u importů (`MapAdminImportController`)

Pozor – mazání importních dávek je implementováno přes **GET** routy, které mění databázi:

- **GET `/atlasadmin/prepareBatchDelete/:batchId`** (`prepareDeletion`)
  - Committer dané dávky nebo mapAdmin – vygeneruje deleční kód, uloží ho k dávce a pošle e-mail s přílohami committerovi dávky.
- **GET `/atlasadmin/deleteBatch/:batchId/password/:password`** (`completeDeletion`)
  - Committer dávky + správný deleční kód (zaslaný e-mailem); heslo je předáváno v URL
  - Hromadné mazání raw SQL (records, comments, users_comments, records_history, excel, batch)

---

## Vyhledávání a hromadné editace (Search)

### POST `/atlas/search/page/:page/pageSize/:pageSize/getCount/:getCount` – Vyhledávání záznamů (`SearchController.search`)

**Kdo smí provést:**
- Libovolný přihlášený uživatel
- Pro export do Excelu: uživatel musí mít přiřazen alespoň jeden příspěvkový projekt (`getContributionProjects()` nesmí být prázdný); mapAdmin dostává větší page size exportu

**Související akce:**
- Záznam aktivity (`UserActivity.RecordSearch`, `SubmitSearchRequest`)

---

### POST `/atlas/search/records-edit-timestamps` – Edit-timestampy záznamů pro hromadnou editaci (`SearchController.searchRecordEditTimestamps`)

**Kdo smí provést:**
- `user.isMapAdmin()` **nebo** uživatel je tzv. bulk editor (`UserUtils.isBulkEditor(user)`, tj. speciální uživatel `user.BulkImporter`)
- Slouží k přednačtení `edit_timestamp` záznamů před hromadnou editací (koncurenční kontrola); maximálně 1000 záznamů

---

## Taxony

Všechny endpointy `TaxonManagerController` – třída je anotována `@Security.Authenticated(AuthorizedAsTaxonAdmin.class)`, tedy uživatel musí být `taxonAdmin`.
Každá mutující akce navíc volá `canEdit()`, které zajistí globální zámek `TaxonEditorLock` – **editovat taxony smí v daný okamžik jen jeden taxonAdmin** (ostatní dostanou chybu `TaxonEditorLocked` se jménem uživatele, který zámek drží). Zámek se uvolňuje při uložení editačního formuláře a udržuje příznak „dirty“ (byly neuložené změny).

### PATCH `/taxon/:id` – Editace polí taxonu (`patch`)

**Kdo smí provést:** taxonAdmin + držení editačního zámku (viz výše)

**Související akce:**
- Hromadná editace polí taxonu (např. latinské/české název, autoři, rank, poznámky) podle DTO z requestu
- Aktualizace `TaxonEditorLock` (SetDirty)

---

### POST `/taxon/:id/move` – Přesun taxonu pod nového rodiče (`moveUnderNewParent`)

**Kdo smí provést:** taxonAdmin + zámek

**Související akce:**
- Změna `parentId` taxonu, přeuspořádání stromu taxonů

---

### POST `/taxon` – Vytvoření taxonu (`addFromReact`)

**Kdo smí provést:** taxonAdmin + zámek

**Související akce:**
- Vytvoření nového taxonu (včetně `TaxonMapSettings`, pokud je potřeba)

---

### DELETE `/taxon/:id` – Smazání taxonu (`deleteTaxon`)

**Kdo smí provést:** taxonAdmin + zámek; smazat lze jen taxon bez podřízených taxonů a bez navázaných záznamů

---

### POST `/taxon/moveBeforeSibling` – Přesun taxonu před sourozence (`moveBeforeSibling`)

**Kdo smí provést:** taxonAdmin + zámek

**Související akce:**
- Změna pořadí taxonů v rámci jednoho rodiče (showOrder)

---

## Synonyma

Třída `SynonymController` je anotována `@Security.Authenticated(AuthorizedAsTaxonAdmin.class)` – všechny akce vyžadují roli `taxonAdmin`. Pozor: parametr `:id` v routách je **id taxonu**, ke kterému synonymum patří (data přijdou v těle requestu).

### POST `/synonyms/:id` – Vytvoření synonyma (`add`)
- taxonAdmin; vytvoří synonymum daného taxonu

### PUT `/synonyms/:id` – Editace synonyma (`modify`)
- taxonAdmin; aktualizuje text synonyma

### DELETE `/synonyms/:id` – Smazání synonyma (`delete`)
- taxonAdmin; smaže synonymum

---

## Měření a vlastnosti (Measurement / Traits)

### POST `/measurement/backup` – Záloha měření (`MeasurementController.backupResult`)

**Kdo smí provést:**
- `AccessRightsService` pro `AccessRights.TraitBackup` – tj. `user.isTraitAdmin()`

**Související akce:**
- Vytvoření záložní tabulky/aktualizace záznamů o měření („backup“ starších dat)

---

### POST `/measurement/trait` – Import měření / vlastnosti (`MeasurementController.importResult`)

**Kdo smí provést:**
- `TraitUploadService.upload` → `UserUtils.isElligibleForTraitImport(currentUser, feature)` = `user.supervises(feature)` – tedy traitAdmin nebo administrátor dané vlastnosti (Feature)

**Související akce (komplexní route – jen shrnutí):**
- Vytvoření `Trait`, import/validace Excel dat, přepočty, Activity logging (TraitImport / TraitValidation)

---

### DELETE `/measurement/trait/:traitId` – Smazání vlastnosti (`MeasurementController.delete`)

**Kdo smí provést:**
- `TraitAdministrationService.deleteTrait` → `UserUtils.isElligibleForTraitDeletion(user, feature)` = `user.supervises(feature)` (traitAdmin / admin vlastnosti)

**Související akce:**
- Soft-delete (`trait.setDeleted(true)`); pokud byl smazaný trait výchozí, přiřadí se nový výchozí trait feature (nejnižší id)

---

### PUT `/measurement/trait/:traitId/default` – Nastavení výchozí vlastnosti (`MeasurementController.setDefault`)

**Kdo smí provést:**
- TraitAdmin nebo featureAdmin

**Související akce:**
- Všechny ostatní traity dané feature se odznačí jako výchozí, vybraný se nastaví jako výchozí

---

### POST `/measurement/complexExport` – Komplexní export měření (`TraitExportController.complexExportResult`)

**Kdo smí provést:**
- `verifyUserAllowedToExport`: pro **každou** exportovanou vlastnost musí platit `UserUtils.isElligibleForTraitDownload(user, trait)` – traitAdmin, nebo trait je Public/Registered, nebo uživatel je admin feature. Pro hromadný export existuje zvláštní „bulk export“ uživatel.

**Související akce:**
- Export běží asynchronně (task), výsledek se stahuje přes GET

---

### GET `/measurement/trait/download/:traitId/lang/:language` – Stažení Excelu vlastnosti (`TraitExportController.downloadTraitData`)

**Kdo smí provést:**
- Přihlášení + `UserUtils.isElligibleForTraitDownload(user, trait)` – traitAdmin, trait Public/Registered, nebo admin feature

---

### GET `/measurement/trait/downloadByFeature/:featureId/lang/:language` – Veřejné stažení trait dat (`TraitExportController.downloadTraitDataByFeature`)

**Kdo smí provést:**
- **Bez přihlášení** (endpoint pro pladias.cz); omezeno na **public traity** – `TraitDownloadService.findPublicTraitForFeature` vrací jen nesmazaný trait s `VisibilityStatus` Public (preferuje výchozí datovou řadu), stejnou podmínku kontroluje i controller (defense in depth)

**Související akce:**
- Neautentizovaný download se nezapisuje do `UserActivity`

---

### GET `/measurement/trait/downloadAttachment/:traitId` – Stažení přílohy vlastnosti (`TraitExportController.downloadAttachment`)

**Kdo smí provést:**
- Přihlášení + `UserUtils.isElligibleForTraitDownload(user, trait)` – gateováno stejně jako `downloadTraitData`

---

### GET `/measurement/trait/export/:traitId` – Detailní export vlastnosti (`TraitExportController.exportTrait`)

**Kdo smí provést:**
- Přihlášení + `UserUtils.isElligibleForTraitDownload(user, trait)`

---

### GET `/measurement/backup/:id` – Stažení záložního snapshotu (`TraitExportController.downloadSnapshot`)

**Kdo smí provést:**
- `AccessRightsService` pro `AccessRights.TraitBackup` – tj. `user.isTraitAdmin()`

---

## Nastavení map taxonů (TaxonMapSettings)

### POST `/atlasadmin/taxonMapSettings` – Editace polí nastavení mapy taxonu (`TaxonMapSettingsController.updateMapSettings`)

**Kdo smí provést:**
- Controller vyžaduje přihlášení (`@Security.Authenticated(Authorized.class)`); centrální kontrola `verifyCurrentUserCanEditKey` (před kontrolou timestampu) rozhoduje per klíč:
  - **mapAdmin** smí měnit **všechny klíče**,
  - **revizor daného taxonu nebo některého jeho nadřazeného taxonu** (`taxonService.getInheritedRevisors`) smí měnit pouze `MAPTYPE`, `REVISIONSTATUS`, `REVISORSCOMMENT` a `REVISORSPRINTMAPCOMMENT`,
  - ostatní uživatelé nemohou měnit nic (`TaxonMapSettingsController.userNotEligible`).

| Klíč (`key`) | Kdo smí měnit | Další kontrola
|---|---|---|
| `ISMAPPED` | mapAdmin | –
| `SETCOMMONTHRESHOLD` | mapAdmin | –
| `PUBLICATIONSTATUS` | mapAdmin | `PublicationUpdateService` (přechody statusů mapy)
| `MAPADMINCOMMENT` | mapAdmin | –
| `PRESLIA` | mapAdmin | –
| `PROTECTED` | mapAdmin | –
| `PARENT_MAP` | mapAdmin | `TaxonMapSettingsParentUpdateService`
| `MAPTYPE` | mapAdmin, revizor | –
| `REVISORSCOMMENT` | mapAdmin, revizor | –
| `REVISORSPRINTMAPCOMMENT` | mapAdmin, revizor | –
| `REVISIONSTATUS` | mapAdmin, revizor | viz níže

**REVISIONSTATUS detailně:**
- Přechod na `Assigned`, `Review` nebo `Completing` vyžaduje mapAdmin
- Ostatní přechody: non-mapAdmin (tedy revizor) smí jen o jeden krok vpřed (`oldStatus + 1 == newStatus`) a pouze u taxonu, který revizuje (kontrola revizorské role v `verifyCurrentUserCanEditKey`)
- Status `NotStarted` nelze nastavit, má-li taxon přiřazené revizory

**Podmínky editace (všechny klíče):**
- Optimistická konkurence přes `timestamp` – pokud si kdokoli mezitím změnil nastavení, endpoint vrátí chybu „novější verze existuje"

**Související akce:**
- Změna `PUBLICATIONSTATUS` spouští `PublicationUpdateService` (přechody statusů mapy)
- Změna `REVISIONSTATUS` na `Submitted`/`Completing`/`Closed` odesílá e-maily adminům/revizorům
- Aktualizace `lastEditTimestamp` a `editCount` v nastavení taxonu

> Dříve většina klíčů neměla žádnou kontrolu oprávnění – viz [problém č. 1](#1-post-atlasadmintaxonmapsettings--většina-polí-bez-kontroly-oprávnění) (vyřešeno).

---

## Uživatelé

### POST `/user/changePassword` – Změna vlastního hesla (`UserController.changePassword`)

**Kdo smí provést:** přihlášený uživatel pro sebe (vyžaduje správné staré heslo)

---

### POST `/user/changeEmail` – Změna vlastního e-mailu (`UserController.changeEmail`)

**Kdo smí provést:** přihlášený uživatel pro sebe (vyžaduje ověření hesla)

**Poznámka:** e-mail se změní **okamžitě** (bez potvrzovacího odkazu). Kontroluje se ale unikátnost nového e-mailu (jiný uživatel s tímto e-mailem → 409) a po změně se na **starou** adresu posílá notifikační e-mail; frontend navíc vyžaduje dvojité zadání nového e-mailu proti překlepu.

---

### POST `/user/createToken` – Vytvoření API tokenu (`UserController.createToken`)

**Kdo smí provést:** libovolný přihlášený uživatel – vytvoří token pro sebe

---

### PUT `/user/settings/:key` – Uložení uživatelského nastavení (`saveUserSetting`)

**Kdo smí provést:** přihlášený uživatel pro sebe (nastavení se ukládá vždy aktuálnímu uživateli)

---

### DELETE `/user/settings/:keyPrefix` – Reset uživatelského nastavení (`resetUserSettings`)

**Kdo smí provést:** přihlášený uživatel pro sebe (smaže nastavení s daným prefixem klíče)

---

### POST `/users` – Vytvoření uživatele (`createUser`)

**Kdo smí provést:** `@Security.Authenticated(AuthorizedAsSysAdmin.class)` + vnitřní kontrola `user.isSysAdmin()`

**Související akce:** vytvoření uživatele, nastavení hesla, odeslání e-mailu s přístupovými údaji

---

### PUT `/users/:id` – Editace uživatele (`updateUser`)

**Kdo smí provést:** sysAdmin (anotace + vnitřní kontrola)

**Související akce:** aktualizace údajů uživatele (jméno, e-mail, organizace, projekty, role)

---

### POST `/users/:id/resetPassword` – Reset hesla uživatele (`resetUserPassword`)

**Kdo smí provést:** sysAdmin (anotace + vnitřní kontrola)

**Související akce:** vygenerování nového hesla, odeslání e-mailu uživateli

---

### POST `/users/rights/edit` – Editace práv uživatele (`editUserRightsField`)

**Kdo smí provést:** sysAdmin (anotace + vnitřní kontrola)

**Související akce:**
- Aktualizace rolí (klíče `MapAdmin`, `BiblioAdmin`, `TraitAdmin`, `SysAdmin`, `TaxonAdmin`; role `bulkEditor`/`asyncImporter` se přímo nastavit nedají – bulkEditor je speciální uživatel `user.BulkImporter`, asyncImporter se konfiguruje přes `AsyncImportersEmail`)

> Klíče `AddProject`/`RemoveProject` byly z endpointu odebrány – přidělování projektů je výhradně doménou mapAdmina přes `/atlasadmin/users/:userId/projects` (viz níže). sysAdmin toto právo nemá; neznámé klíče končí chybou („Unknown field key“).

---

### GET `/atlasadmin/users` – Seznam uživatelů pro mapAdmina (`MapAdminUserRightsController.getUsers`)

**Kdo smí provést:** `user.isMapAdmin() == true`

**Související akce:**
- Paginovaný seznam uživatelů s filtry `NameFilter`/`SurnameFilter`/`EmailFilter` a řazením (`sortBy` whitelist: `name`, `surname`, `email`)
- Vrací pouze `id`, `name`, `surname`, `email` – **bez role příznaků** (ty jsou doménou sysAdminova `GET /users`), smazané uživatelé vynecháni

---

### POST `/atlasadmin/users/:userId/projects` – Přiřazení projektu uživateli (`MapAdminUserRightsController.assignProject`)

**Kdo smí provést:** `user.isMapAdmin() == true`

**Související akce:**
- Body: `projectId`; přidá projekt do `contributionProjects` cílového uživatele
- Duplicitní přiřazení vrací chybu (`MapAdminUserRights.projectAlreadyAssigned`)
- mapAdmin smí přiřadit libovolný projekt libovolnému uživateli (symetricky s `assignUserTaxon`); `canContributeInto(project)` cílového uživatele při importu vynucuje `ImportController.verifyUserIsEligible`

---

### DELETE `/atlasadmin/users/:userId/projects/:projectId` – Odebrání projektu uživatele (`MapAdminUserRightsController.removeProject`)

**Kdo smí provést:** `user.isMapAdmin() == true`

**Související akce:**
- Odebere projekt z `contributionProjects` uživatele

---

## Map Reports

### POST `/atlasadmin/assignUserTaxon` – Přiřazení revizora k taxonu (`MapReportsController.assignUserTaxon`)

**Kdo smí provést:** `user.isMapAdmin() == true`

**Související akce:**
- Přidání uživatele do `supervisedTaxons` taxonu (a podstromů)
- Notifikace revizora e-mailem

> V kódu je `// TODO - should be really for all users available?` – zvážit, zda nemá být endpoint přístupný všem uživatelům

---

### DELETE `/atlasadmin/removeUserTaxon/user/:userId/taxon/:taxonId` – Odebrání revizora (`MapReportsController.removeUserTaxon`)

**Kdo smí provést:** `user.isMapAdmin() == true`

**Související akce:**
- Odebrání taxonu (a všech podřízených taxonů) z `supervisedTaxons` uživatele
- Vyčištění cache (`TaxonCache.getInstance().clear()`)

---

## PNG mapy

### POST `/atlas/pngMap/taxon/:taxonId` – Nahrání PNG mapy (`PdfMapController.uploadPng`)

**Kdo smí provést:**
- `user.isMapAdmin() == true`
- Taxon musí existovat a být mapovatelný (existují `TaxonMapSettings`)
- Publication status musí být `StatusPreviewPreparation` nebo `StatusPreview`

**Související akce:**
- Uložení/aktualizace `PdfMap` záznamu (typ `PngType`)
- Notifikace revizorů a adminů e-mailem
- Aktualizace publication status na `StatusPreview`

---

## Přehled rolí

| Role | Popis | Klíčová oprávnění |
|------|-------|-------------------|
| `isMapAdmin()` | Administrátor mapy | Editace všech záznamů, nastavení map, přiřazování revizorů, upload PNG map |
| `isTaxonAdmin()` | Administrátor taxonů | Editace, vytváření a mazání taxonů a synonym (přes `AuthorizedAsTaxonAdmin` + editační zámek) |
| `isSysAdmin()` | Systémový administrátor | Správa uživatelů a jejich práv (přes `AuthorizedAsSysAdmin`) |
| `isTraitAdmin()` | Administrátor vlastností | Záloha měření, import/mazání vlastností, exporty (též `supervises(feature)`) |
| `isBiblioAdmin()` | Administrátor bibliografie | Správa bibliografických záznamů |
| `asyncImporter` (role `asyncImporter`, konfigurace `AsyncImportersEmail`) | Asynchronní importér | Zobrazuje položku menu CSV importu (`/atlas/importCSV`); samotný endpoint `/import/csv` hlídá jen `canContributeInto(project)` |
| `supervisedTaxons` | Revizor taxonů | Editace a validace záznamů přiřazených (a podřazených) taxonů |
| `contributionProjects` | Přispěvatel projektu | Import dat do projektu, editace vlastních neimportovaných záznamů |
| master admin / bulk importer | Speciální uživatelé | `UserUtils.getMasterAdmin()` (např. mazání asociací komentářů), `UserUtils.getBulkImporter()` (hromadné editace záznamů) |

---

## Zjištěné problémy s oprávněními a nesoulady

### 1. `GET /api/react/tempfiles/:fileId` – dočasné soubory bez kontroly vlastníka (částečně vyřešeno)

  Chybí kontrola vlastníka – `fileId` je sekvenční integer bez vazby na uživatele, takže si **libovolný přihlášený uživatel** může enumerací stáhnout cizí dočasné soubory (jediné místo vzniku je `TraitUploadService.serializeWorkbook` – anotovaný workbook po neúspěšné validaci/importu vlastností, jehož download URL dostává uživatel ve zprávě `TraitsController.ValidationFailed`/`ImportFailed`). Soubor se po stažení smaže, takže ho útočník „vzetím“ zničí dřív, než si ho stáhne oprávněný uživatel (DoS).

Budoucí dořešení (odloženo – vyžaduje změnu DB): přidat do `public.temporary_files` sloupec `owner bigint` (odkaz na `public.users`), ukládat do něj v `TraitUploadService.serializeWorkbook` aktuálního uživatele a v downloadu vracet soubor jen vlastníkovi (cizí i neexistující soubory by měly odpovídat stejnou zprávou, aby existence cizích id nic neprozrazovala):
```sql
ALTER TABLE public.temporary_files ADD COLUMN owner bigint;
```

---

## Poznámky

### Dostupnost některých endpointů MapReportsController

- `MapReportsController.assignUserTaxon` nese `// TODO - should be really for all users available?` - není jisté zda má být pracovní CSV ap. k dispozici všem uživatelům
-
### Concurrency kontrola
Většina editací záznamů a nastavení map používá `lastEditTimestamp` (resp. `timestamp` u TaxonMapSettings) pro detekci souběžných změn. Pokud klient pošle starší timestamp, než je na serveru, vrátí se chyba 409 (Conflict), resp. „novější verze existuje“. `Record.lastEditTimestamp` a `RecordComment.lastEditTimestamp` jsou navíc pole `@Version` (Ebean optimistic locking). **Bez concurrency kontroly** zůstávají: editace/mazání komentářů a jejich asociací, editace uživatelů, taxonů a vlastností (měření).

### Historie změn
Editace polí záznamu (`RecordsService.editField`, `moveRecordCoords`) a operace s komentáři vytvářejí záznam v `RecordHistory` pro auditování změn (včetně kaskádových změn příznaků); u polí se shodnou starou a novou hodnotou se zápis přeskočí. **Bez zápisu do historie** jsou: importy záznamů (až na předvalidované příznaky), mazání dávky (maže historii spolu se záznamy) a všechny editace jiných entit (taxony, uživatelé, vlastnosti/měření, nastavení map – tam se ukládá jen `editCount`).

### Mazání systémových textů z `remark_doubt` (známé omezení, vyřešit později)
`RecordsService.updateRemarkDoubts` (volané z `moveRecordCoords`) maže systémové texty z `remark_doubt` porovnáním stringů vůči `messages.at(...)` – tedy překladu podle **locale právě přihlášeného uživatele** (app je dvojjazyčná, `play.i18n.langs = ["cs", "en"]`; bundly `conf/messages.yaml` = výchozí/cs, `conf/messages.yaml.en` = en). Dvě rizika:

1. **Locale varianta (latentní)** – `messages.yaml.en` tyto klíče zatím neobsahuje, takže `messages.at` vždy fallbackuje na český text. Po doplnění anglických překladů by ale uživatel s en locale hledal anglickou větu v českém uloženém textu → poznámka by se **tiše** neodstranila (žádná chyba, žádný zápis do historie). Nejde o znakové sady (UTF-8/UTF-16 je transparentní), jde o jazykovou variantu textu.
2. **HTML entita `&#58;` (pravděpodobně aktivní)** – v `conf/messages.yaml` je klíč `RecordEditController.districtComputedAutomatically` zapsán jako `Okres doplněn automaticky&#58; možnost chyby.`; YAML loader (play-i18n/SnakeYAML) entity nerozkrývá, takže `messages.at` vrací **doslovné `&#58;`** místo dvojtečky. Pokud jsou v DB uložené texty s obyčejnou dvojtečkou, `replace` tohoto textu nikdy neshoduje (zbývající čtyři texty entitu nemají). `conf/_messages` (properties formát, plain dvojtečka) se nenačítá – play-i18n hledá soubory podle basename `messages`.

Ověření v DB:
```sql
SELECT remark_doubt, count(*) FROM atlas.records
WHERE remark_doubt ILIKE '%dopočten automaticky%' OR remark_doubt LIKE '%&#58;%'
GROUP BY remark_doubt;
```

Možná oprava: nematchovat uložený text proti aktuálnímu překladu (matchovat všechny jazykové varianty, případně ukládat stabilní marker místo lidsky čitelného textu); entitu vyřešit quotováním hodnoty v YAML (`"text: …"`).

### Lockování záznamů
Záznamy mohou být uzamčeny (`record.isLocked()`) nebo editace může být zakázána (`record.isEditationAllowed()` – zamknutý taxon kvůli generování mapových podkladů). Editace taxonů navíc používá globální `TaxonEditorLock` (vždy jen jeden taxonAdmin edituje).

### Notifikace
Některé akce (změna publication/revision status, přiřazení revizora, upload PNG mapy, příprava mazání dávky, reset hesla) spouští e-mailové notifikace příslušným uživatelům.

### Autentizace vs. autorizace
Autentizaci zajišťuje `@Security.Authenticated` s třídami `Authorized` (přihlášený), `AuthorizedAsSysAdmin` (sysAdmin) a `AuthorizedAsTaxonAdmin` (taxonAdmin) – kombinace s `@With(Authorized.class)` na úrovni controlleru. Další kontroly (`isMapAdmin`, `supervises`, `canContributeInto`, `isUserElligibleToEditEverything` apod.) se provádějí ručně uvnitř action metod / services – v tom je i příčina výše popsaných nekonzistencí.

Výjimkou z tohoto schématu jsou:
- **`controllers.api.Map`** (`GET /api/pngMap/:taxonId`, `GET /api/csvMapDetails/:taxonId`, `GET /api/renderMap/...`) – používá samostatný mechanismus `@TokenAuthenticated` (`BearerAuthAction`): vyžaduje platný Bearer API token (vytváří se přes `POST /user/createToken`), ale žádné další kontroly rolí – stačí platný token libovolného uživatele.
