# Chování JAVA backendu aplikace při editacích

**prompt:**
    připrav uživatelsky srozumitelné shrnutí chování backendu této aplikace při editacích. Vytvoř/aktualizuj tento markdown dokument, ve kterém bude popsáno chování JAVA backendu aplikace při editaci jakéhokoli pole v databázi. Začni u seznamu endpointů v conf/react.routes, vyber všechny post+put+delete+patch endpointy a ty zpracuj - kdo smí akci provést, zda to vyvolává nějaké související akce. Některé routy jsou velmi komplexní (jako POST /import/upload ), tak u těch stačí uvést jen kdo je smí zavolat.
    Zdůrazni pokud by někde byla editace možná bez kontroly oprávnění či by se ti zdál nesoulad mezi jendotlivými endpointy pracujícími se stejnými entitami.

---

Tento dokument popisuje chování aplikace při editaci dat v databázi. Jsou zde shrnuty všechny POST, PUT, DELETE a PATCH endpointy z `conf/react.routes`, včetně podmínek oprávnění a souvisejících akcí. Aktualizováno podle aktuálního stavu kódu (controllers, services, security třídy).

> ⚠️ Shrnutí nejzávažnějších nálezů najdete v sekci [Zjištěné problémy s oprávněními a nesoulady](#zjištěné-problémy-s-oprávněními-a-nesoulady).

## Obsah

1. [Záznamy (Records)](#záznamy-records)
2. [Komentáře k záznamům](#komentáře-k-záznamům)
3. [Importy](#importy)
4. [Vyhledávání a hromadné editace (Search)](#vyhledávání-a-hromadné-editace-search)
5. [Taxony](#taxony)
6. [Synonyma](#synonyma)
7. [Měření a vlastnosti (Measurement / Traits)](#měření-a-vlastnosti-measurement--traits)
8. [Nastavení map taxonů (TaxonMapSettings)](#nastavení-map-taxonů-taxonmapsettings)
9. [Uživatelé](#uživatelé)
10. [Map Reports](#map-reports)
11. [PNG mapy](#png-mapy)
12. [Přehled rolí](#přehled-rolí)
13. [Zjištěné problémy s oprávněními a nesoulady](#zjištěné-problémy-s-oprávněními-a-nesoulady)
14. [Poznámky](#poznámky)

---

## Záznamy (Records)

### PATCH `/atlas/record/:recordId` – Editace pole záznamu (`RecordUpdateController.editField`)

**Kdo smí provést:**
- Uživatel musí být přihlášen (`@Security.Authenticated(Authorized.class)` na úrovni třídy)
- Záznam musí existovat
- **Poznámka:** kontrola `isElligibleForRecordValidation` (tj. `user.isMapAdmin()` nebo uživatel je revizorem daného taxonu) se v controlleru aplikuje na **všechna** pole včetně běžných (v kódu označeno `//TODO fix`) – viz [problém č. 1](#1-patch-atlasrecordrecordid--příliš-restriktivní-kontrola-oprávnění)
- Následně musí platit `record.isUserElligibleToEditCommonFields(currentUser)`:
  - autor nebo committer batche, pokud je `validationStatus == Unprocessed`, **NEBO**
  - `isUserElligibleToEditEverything(currentUser)` vrátí `true` (mapAdmin, revizor taxonu nebo jeho nadřazených taxonů, správce projektu záznamu)
- Pro validační pole (`VALIDATION_STATUS`, `ORIGINALITY_STATUS`, `HERBARIUM_QUALITY`, `INCLUDED_IN_MAP`, `ENVIRONMENT`, `DETREV`, `REMARK_EXCERPTION`, `REMARK_OTHER`, `REMARK_DOUBT`) se **v service** (`RecordsService.editField`) ještě jednou kontroluje `isElligibleForRecordValidation` – mapAdmin nebo revizor taxonu

**Podmínky editace:**
- Záznam nesmí být uzamčen: `record.isLocked() == false`
- Editace musí být povolena: `record.isEditationAllowed() == true` (taxon není uzamčen kvůli generování mapy – kontroluje `TaxonMapSettings.isLocked()`)
- Klient musí poslat aktuální `lastEditTimestamp` (ochrana proti concurrency, jinak 409 Conflict)

**Související akce:**
- Vytvoření záznamu v `RecordHistory` (audit každé změny)
- Aktualizace `lastEditTimestamp` na záznamu
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
  - autor/committer batche, pokud je záznam `Unprocessed`, **NEBO** mapAdmin / revizor / správce projektu
- ⚠️ Na rozdíl od `editField` se zde **nekontroluje** `isElligibleForRecordValidation` ani `record.isLocked()` – viz [problém č. 1](#1-patch-atlasrecordrecordid--příliš-restriktivní-kontrola-oprávnění)

**Podmínky editace:**
- Klient musí poslat aktuální `lastEditTimestampNum` (jinak 409)
- `record.isEditationAllowed() == true`

**Související akce:**
- Přepočet fytochorionu a kvadrantů po změně souřadnic
- Záznam do `RecordHistory`

---

## Komentáře k záznamům

Všechny endpointy `RecordCommentController` – přihlášený uživatel (`@Security.Authenticated(Authorized.class)`).

### POST `/atlas/record/comment` – Vytvoření komentáře (`createComment`)

**Kdo smí provést:**
- Libovolný přihlášený uživatel, ke **kterémukoli** záznamu (nekontroluje se vztah uživatele k záznamu/taxonu)

**Související akce:**
- Vytvoření záznamu `Comment` a asociace `users_comments` (aktuální uživatel)
- Záznam do `RecordHistory` (typ FLAG)

---

### PUT `/atlas/record/comment/:commentId` – Editace komentáře (`updateComment`)

**Kdo smí provést:**
- `record.isUserElligibleToEditEverything(currentUser)` – tj. mapAdmin, revizor taxonu (vč. nadřazených taxonů) nebo správce projektu
- ⚠️ **Nikoliv autor komentáře** – ten může svůj komentář smazat, ale neupravit. Viz [problém č. 5](#5-komentáře--nekonzistentní-oprávnění-mezi-endpointy)

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
- Nastavení příznaku vyřešení, notifikace, záznam do `RecordHistory`

---

### DELETE `/atlas/record/comment-assoc/:commentId/linked-user/:boundUserId` – Zrušení asociace uživatele s komentářem (`deleteUserCommentAssociation`)

**Kdo smí provést:**
- Master admin (`UserUtils.getMasterAdmin()`) **NEBO** uživatel sám (odstranění sebe z notifikací na komentář)

**Související akce:**
- Přímé mazání z `users_comments` (raw SQL)

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

---

### POST `/import/csv` – Import CSV souboru (`ImportCSVController.uploadCsv`)

**Kdo smí provést:**
- Stejné podmínky jako u `/import/upload` (validace: přihlášený uživatel; import: `canContributeInto(project)`)

**Související akce:**
- Import probíhá asynchronně (tasky na pozadí), stav se dotazuje přes GET endpointy

---

### DELETE `/importResult/validated/:id` – Smazání výsledku validace (`ImportResultsController.deleteValidated`)

**Kdo smí provést:**
- Autor batche daného Excel souboru – mazání proběhne pouze pokud `batch.imported == false` **a** `currentUser == batch.author`; v ostatních případech se nic neprovede (tichý no-op), ale endpoint vrátí `200 OK`

**Související akce:**
- Pouze smazání záznamu `Excel`; záznamy a batch zůstávají

---

### ➕ Mutující GET endpointy u importů (`MapAdminImportController`)

Pozor – mazání importních dávek je implementováno přes **GET** routy, které mění databázi:

- **GET `/atlasadmin/prepareBatchDelete/:batchId`** (`prepareDeletion`)
  - ⚠️ **Žádná kontrola oprávnění** – libovolný přihlášený uživatel může vygenerovat deleční kód a spustit odeslání e-mailu s přílohami committerovi dávky. Viz [problém č. 4](#4-get-atlasadminpreparebatchdeletebatchid--žádná-kontrola-oprávnění)
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
- `user.isMapAdmin()` **nebo** uživatel je tzv. bulk importer (`UserUtils.getBulkImporter()`)
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
- `TraitAdministrationService.setDefaultTrait` – ⚠️ kontrola je **invertovaná**: `if (!user.isTraitAdmin() && user.equals(feature.getAdmin()))` → selže admin vlastnosti, který není traitAdmin, ale **projde běžný přihlášený uživatel**. Viz [problém č. 2](#2-put-measurementtraittraitiddefault--invertovaná-podmínka-oprávnění)

**Související akce:**
- Všechny ostatní traity dané feature se odznačí jako výchozí, vybraný se nastaví jako výchozí

---

### POST `/measurement/complexExport` – Komplexní export měření (`TraitExportController.complexExportResult`)

**Kdo smí provést:**
- `verifyUserAllowedToExport`: pro **každou** exportovanou vlastnost musí platit `UserUtils.isElligibleForTraitDownload(user, trait)` – traitAdmin, nebo trait je Public/Registered, nebo uživatel je admin feature. Pro hromadný export existuje zvláštní „bulk export“ uživatel.

**Související akce:**
- Export běží asynchronně (task), výsledek se stahuje přes GET

---

## Nastavení map taxonů (TaxonMapSettings)

### POST `/atlasadmin/taxonMapSettings` – Editace polí nastavení mapy taxonu (`TaxonMapSettingsController.updateMapSettings`)

**Kdo smí provést:**
- Controller vyžaduje pouze přihlášení (`@Security.Authenticated(Authorized.class)`) – role se kontroluje **per klíč**, ne pro celý endpoint:

| Klíč (`key`) | Kdo smí měnit | Kontrola
|---|---|---|
| `ISMAPPED` | mapAdmin | `verifyCurrentUserIsMapAdmin` ✅
| `SETCOMMONTHRESHOLD` | mapAdmin | `verifyCurrentUserIsMapAdmin` ✅
| `PUBLICATIONSTATUS` | mapAdmin | `verifyCurrentUserIsMapAdmin` + `PublicationUpdateService` ✅
| `REVISIONSTATUS` | viz níže | `RevisionUpdateService.verifyTransitionIsFeasible` ⚠️ částečná
| `MAPTYPE` | **kdokoli přihlášený** ⚠️ | žádná kontrola
| `REVISORSCOMMENT` | **kdokoli přihlášený** ⚠️ | žádná kontrola
| `REVISORSPRINTMAPCOMMENT` | **kdokoli přihlážený** ⚠️ | žádná kontrola
| `MAPADMINCOMMENT` | **kdokoli přihlášený** ⚠️ | žádná kontrola
| `PRESLIA` | **kdokoli přihlášený** ⚠️ | žádná kontrola
| `PROTECTED` | **kdokoli přihlášený** ⚠️ | žádná kontrola
| `PARENT_MAP` | **kdokoli přihlášený** ⚠️ | žádná kontrola

**REVISIONSTATUS detailně:**
- Přechod na `Assigned`, `Review` nebo `Completing` vyžaduje mapAdmin
- Ostatní přechody: non-mapAdmin smí jen o jeden krok vpřed (`oldStatus + 1 == newStatus`); **nekontroluje se, zda je uživatel revizorem daného taxonu** – tedy libovolný přihlášený uživatel může posunout revizní status taxonu o krok vpřed
- Status `NotStarted` nelze nastavit, má-li taxon přiřazené revizory

**Podmínky editace (všechny klíče):**
- Optimistická konkurence přes `timestamp` – pokud si kdokoli mezitím změnil nastavení, endpoint vrátí chybu „novější verze existuje"

**Související akce:**
- Změna `PUBLICATIONSTATUS` spouští `PublicationUpdateService` (přechody statusů mapy)
- Změna `REVISIONSTATUS` na `Submitted`/`Completing`/`Closed` odesílá e-maily adminům/revizorům
- Aktualizace `lastEditTimestamp` a `editCount` v nastavení taxonu

⚠️ Chybějící kontroly u většiny klíčů popisuje [problém č. 3](#3-post-atlasadmintaxonmapsettings--většina-polí-bez-kontroly-oprávnění)

---

## Uživatelé

### POST `/user/changePassword` – Změna vlastního hesla (`UserController.changePassword`)

**Kdo smí provést:** přihlášený uživatel pro sebe (vyžaduje správné staré heslo)

---

### POST `/user/changeEmail` – Změna vlastního e-mailu (`UserController.changeEmail`)

**Kdo smí provést:** přihlášený uživatel pro sebe (vyžaduje ověření hesla)

**Poznámka:** e-mail se změní **okamžitě** – neodesílá se žádný potvrzovací e-mail ani se nekontroluje duplicita. (Dříve dokumentovaný potvrzovací e-mail už neexistuje.)

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
- Aktualizace rolí: `mapAdmin`, `traitAdmin`, `biblioAdmin`, `taxonAdmin`, `analyst`, `sysAdmin`
- Přiřazení/odebrání projektů (`AddProject`, `RemoveProject`)

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
| `supervisedTaxons` | Revizor taxonů | Editace a validace záznamů přiřazených (a podřazených) taxonů |
| `contributionProjects` | Přispěvatel projektu | Import dat do projektu, editace vlastních neimportovaných záznamů |
| master admin / bulk importer | Speciální uživatelé | `UserUtils.getMasterAdmin()` (např. mazání asociací komentářů), `UserUtils.getBulkImporter()` (hromadné editace záznamů) |

---

## Zjištěné problémy s oprávněními a nesoulady

### 1. PATCH `/atlas/record/:recordId` – příliš restriktivní kontrola oprávnění

V `RecordUpdateController.editField` se kontrola `isElligibleForRecordValidation` (mapAdmin / revizor taxonu) aplikuje na **všechny editované pole**, včetně běžných („common“) polí, a to **před** kontrolou `isUserElligibleToEditCommonFields`. V kódu je to označeno `//TODO fix` s komentářem, že by se mělo rozlišit, kdo smí editovat common pole vs. validační (semafor).

Důsledek: **autor importu dnes nemůže přes PATCH editovat ani běžná pole vlastního záznamu ve stavu `Unprocessed`**, přestože `isUserElligibleToEditCommonFields` to explicitně umožňuje, a service (`RecordsService.editField`) si pro common pole žádnou revizorskou kontrolu nevyžaduje (kontrolu validace dělá jen pro validační pole).

Nesoulad potvrzuje i **POST `/atlas/record/moveCoordinates`**, který u téhož záznamu kontroluje pouze `isUserElligibleToEditCommonFields` – autor importu si tak může záznam přesunout na mapě, ale nemůže změnit např. lokalitu textově. `moveRecordCoords` také nekontroluje `record.isLocked()`.

### 2. PUT `/measurement/trait/:traitId/default` – invertovaná podmínka oprávnění

V `TraitAdministrationService.setDefaultTrait` je podmínka:

```java
if (!user.isTraitAdmin() && user.equals(trait.getFeature().getAdmin())) {
    return TraitActionResult.failure(...);
}
```

Podmínka má zjevně být `||` místo `&&`. Důsledkem je, že **admin vlastnosti (Feature), který není traitAdmin, je odmítnut**, zatímco **libovolný jiný přihlášený uživatel (který není ani traitAdmin, ani admin feature) kontrolou projde** a může nastavit výchozí trait libovolné vlastnosti.

### 3. POST `/atlasadmin/taxonMapSettings` – většina polí bez kontroly oprávnění

Controller vyžaduje jen přihlášení; `verifyCurrentUserIsMapAdmin` se volá pouze u klíčů `ISMAPPED`, `SETCOMMONTHRESHOLD` a `PUBLICATIONSTATUS`. Klíče `MAPTYPE`, `REVISORSCOMMENT`, `REVISORSPRINTMAPCOMMENT`, `MAPADMINCOMMENT`, `PRESLIA`, `PROTECTED` a `PARENT_MAP` může měnit **libovolný přihlášený uživatel** (stačí znát aktuální timestamp). U `REVISIONSTATUS` se nekontroluje revizorská role – non-mapAdmin může posunout status o krok vpřed u libovolného taxonu.

### 4. GET `/atlasadmin/prepareBatchDelete/:batchId` – žádná kontrola oprávnění

`MapAdminImportController.prepareDeletion` nemá žádnou kontrolu role ani vztahu k dávce – **libovolný přihlášený uživatel** může u libovolné dávky vygenerovat deleční kód a spustit odeslání e-mailu (s přílohami obsahujícími data dávky) committerovi. Následný `GET /atlasadmin/deleteBatch/:batchId/password/:password` sice vyžaduje committera + kód, ale heslo se předává v URL (ukládá se do logů/proxy) a celá operace je technicky mutující GET request.

### 5. Komentáře – nekonzistentní oprávnění mezi endpointy

- **POST `/atlas/record/comment`**: libovolný přihlášený uživatel může komentovat libovolný záznam.
- **PUT `/atlas/record/comment/:commentId`** (updateComment): vyžaduje `isUserElligibleToEditEverything` (mapAdmin/revizor/správce projektu) – **autor komentáře vlastní komentář upravit nemůže**.
- **DELETE `/atlas/record/comment/:commentId`**: autor komentáře NEBO mapAdmin.
- Tedy: kdo komentář vytvořil, může ho smazat, ale ne upravit – nesoulad mezi oběma endpointy nad stejnou entitou.

### 6. DELETE `/importResult/validated/:id` – tichý no-op

Endpoint vrací `200 OK` bez obsahu vždy; mazání proběhne jen když je volající autorem neimportované dávky. Volající se o neúspěchu (cizí dávka / už importováno) nedozví.

### 7. Změna e-mailu bez potvrzení

`POST /user/changeEmail` změní e-mail okamžitě po ověření hesla – bez potvrzovacího e-mailu a bez kontroly unikátnosti. Dříve zdokumentovaný potvrzovací e-mail již v kódu neexistuje.

### 8. Ostatní drobnosti

- `MapReportsController.assignUserTaxon` nese `// TODO - should be really for all users available?`
- `searchRecordEditTimestamps` je omezen na mapAdmin + bulk importera – korektní, ale je to jediný endpoint hromadné editace; samotné hromadné ukládání pak probíhá přes PATCH `/atlas/record/:recordId` per záznam (a naráží na problém č. 1).
- Mazání dávky (`completeDeletion`) maže i komentáře a historii záznamů ostatních uživatelů (by design, ale bez dodatečných kontrol oprávnění nad komentáři).

---

## Poznámky

### Concurrency kontrola
Většina editací záznamů a nastavení map používá `lastEditTimestamp` (resp. `timestamp` u TaxonMapSettings) pro detekci souběžných změn. Pokud klient pošle starší timestamp, než je na serveru, vrátí se chyba 409 (Conflict), resp. „novější verze existuje“.

### Lockování záznamů
Záznamy mohou být uzamčeny (`record.isLocked()`) nebo editace může být zakázána (`record.isEditationAllowed()` – zamknutý taxon kvůli generování mapových podkladů). Editace taxonů navíc používá globální `TaxonEditorLock` (vždy jen jeden taxonAdmin edituje).

### Historie změn
Většina editací záznamů a komentářů vytváří záznam v `RecordHistory` pro auditování změn (včetně kaskádových změn příznaků).

### Notifikace
Některé akce (změna publication/revision status, přiřazení revizora, upload PNG mapy, příprava mazání dávky, reset hesla) spouští e-mailové notifikace příslušným uživatelům.

### Autentizace vs. autorizace
Autentizaci zajišťuje `@Security.Authenticated` s třídami `Authorized` (přihlášený), `AuthorizedAsSysAdmin` (sysAdmin) a `AuthorizedAsTaxonAdmin` (taxonAdmin) – kombinace s `@With(Authorized.class)` na úrovni controlleru. Další kontroly (`isMapAdmin`, `supervises`, `canContributeInto`, `isUserElligibleToEditEverything` apod.) se provádějí ručně uvnitř action metod / services – v tom je i příčina výše popsaných nekonzistencí.
