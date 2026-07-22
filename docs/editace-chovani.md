# Chování aplikace při editacích

**prompt:**
    připrav uživatelsky srozumitelné shrnutí chování této aplikace při editacích. Vytvoř markdown dokument, ve kterém bude popsáno chování aplikace při editaci jakéhokoli pole v databázi. Začni u seznamu endpointů v conf/react.routes, vyber všechny post+put+delete+patch endpointy a ty zpracuj - kdo smí akci provést, zda to vyvolává nějaké související akce. Některé routy jsou velmi komplexní (jako POST /import/upload ), tak u těch stačí jen kdo je smí zavolat.

---

Tento dokument popisuje chování aplikace při editaci dat v databázi. Jsou zde shrnuty všechny POST, PUT, DELETE a PATCH endpointy, včetně podmínek oprávnění a souvisejících akcí.

## Obsah

1. [Záznamy (Records)](#záznamy-records)
2. [Komentáře k záznamům](#komentáře-k-záznamům)
3. [Importy](#importy)
4. [Taxony](#taxony)
5. [Synonyma](#synonyma)
6. [Nastavení map taxonů](#nastavení-map-taxonů)
7. [Uživatelé](#uživatelé)
8. [Map Reports](#map-reports)
9. [PNG mapy](#png-mapy)

---

## Záznamy (Records)

### PATCH `/atlas/record/:recordId` – Editace pole záznamu

**Kdo smí provést:**
- Uživatel musí být přihlášen (`@Security.Authenticated(Authorized.class)`)
- Pro běžná pole: `record.isUserElligibleToEditCommonFields(currentUser)` vrátí `true`
  - Autor nebo committeř batche, pokud je `validationStatus == Unprocessed`
  - NEBO `isUserElligibleToEditEverything(currentUser)` vrátí `true`
- Pro validační pole (`VALIDATION_STATUS`, `ORIGINALITY_STATUS`, `HERBARIUM_QUALITY`, `INCLUDED_IN_MAP`, `ENVIRONMENT`, `DETREV`, `REMARK_EXCERPTION`, `REMARK_OTHER`, `REMARK_DOUBT`):
  - `user.isMapAdmin()` == `true` NEBO
  - uživatel je revizor taxonu (`isSupervised(record.getTaxon(), user)`)

**Podmínky editace:**
- Záznam nesmí být uzamčen: `record.isLocked() == false`
- Editace musí být povolena: `record.isEditationAllowed() == true` (taxon není uzamčen kvůli generování mapy)
- Client musí poslat správný `lastEditTimestamp` (ochrana proti concurrency)

**Související akce:**
- Vytvoření záznamu v `RecordHistory`
- Aktualizace timestampu `lastEditTimestamp`
- Při změně souřadnic: přepočet fytochorionu a kvadrantů
- Volání `updateTaxonEditCount()` pro sledování počtu editací taxonu

**Pole, která lze editovat:**
- `PHYTOCHORION`, `LOCALITY`, `TAXON`, `ORIGINALNAME`, `NEARESTTOWNNAME`
- `ALTITUDEMIN`, `ALTITUDEMAX`, `ALTITUDEAPPROXIMATION`
- `IMPORTCOMMENT`, `COORDSPRECISION`, `DATE`
- `ADDFINDER`, `DELETEFINDER`, `ADDHERBARIUM`, `DELETEHERBARIUM`
- `SOURCE`, `ORIGINALID`
- `SUBSTRATE`, `CHEMICAL`, `SUBSTRATE2`, `LOCALITYEXTRA` (nonvascular instance)
- `VALIDATION_STATUS`, `ORIGINALITY_STATUS`, `HERBARIUM_QUALITY`, `INCLUDED_IN_MAP`
- `ENVIRONMENT`, `DETREV`, `REMARK_EXCERPTION`, `REMARK_OTHER`, `REMARK_DOUBT`

**Cascading změny u validačních polí:**

- `VALIDATION_STATUS`:
  - Nastavení na `Unprocessed`: resetuje `originality_status` na Undefined, `herbarium_quality` na false, `included_in_map` na false
  - Nastavení na `Accepted`: nastaví `included_in_map` na true; pokud má záznam herbaria a autor batche je currentUser, nastaví `herbarium_quality` na true
  - Nastavení na `Declined` nebo `Uncertain`: nastaví `included_in_map` na false; pokud byl předchozí status `Accepted` a `originality_status` není Undefined, resetuje `originality_status` na Undefined
- `ORIGINALITY_STATUS`:
  - Lze měnit pouze pokud `validation_status == Accepted`
  - Nastavení na `Cultivated`: nastaví `included_in_map` na false
  - Změna z `Cultivated` na `Original` nebo `Unoriginal`: nastaví `included_in_map` na true
- `INCLUDED_IN_MAP`:
  - Nelze nastavit na true pokud je `validation_status == Declined` nebo `Unprocessed`
- `ORIGINALID`:
  - Lze editovat pouze pro záznamy v projektu `AtlasExcerptionProjectId`

---

### POST `/atlas/record/moveCoordinates` – Přesun souřadnic záznamu

**Kdo smí provést:**
- Uživatel musí být přihlášen
- `record.isUserElligibleToEditCommonFields(currentUser)` vrátí `true`
- Záznam nesmí být uzamčen: `record.isEditationAllowed() == true`
- Client musí poslat správný `lastEditTimestamp`

**Související akce:**
- Aktualizace `latitude`, `longitude`, `gpsCoordsPrecision`
- Přepočet fytochorionu (`phytochorionComputed`)
- Přepočet kvadrantů
- Vytvoření záznamu v `RecordHistory`

---

## Komentáře k záznamům

### POST `/atlas/record/comment` – Vytvoření komentáře

**Kdo smí provést:**
- Uživatel musí být přihlášen
- Záznam musí existovat

**Související akce:**
- Vytvoření `RecordComment` s `imported=false`, `deleted=false`, `resolved=false`
- Vytvoření záznamu v `RecordHistory` s typem `COMMENT`

---

### PUT `/atlas/record/comment/:commentId` – Aktualizace komentáře

**Kdo smí provést:**
- Uživatel musí být přihlášen
- `record.isUserElligibleToEditEverything(currentUser)` vrátí `true`
  - `user.isMapAdmin()` == `true` NEBO
  - uživatel je revizor taxonu NEBO
  - uživatel je správcem projektu

**Související akce:**
- Aktualizace zprávy komentáře
- Vytvoření záznamu v `RecordHistory` s typem `COMMENT`

---

### DELETE `/atlas/record/comment/:commentId` – Smazání komentáře

**Kdo smí provést:**
- Uživatel musí být přihlášen
- Autor komentáře (`comment.getAuthor().equals(currentUser)`) NEBO
- `user.isMapAdmin()` == `true`

**Související akce:**
- Soft delete: `comment.setDeleted(true)`
- Odstranění asociací uživatele s komentářem (`deleteAllUserCommentAssociations`)
- Vytvoření záznamu v `RecordHistory` s typem `COMMENT`

---

### POST `/atlas/record/comment/:commentId/resolve` – Vyřešení komentáře

**Kdo smí provést:**
- Uživatel musí být přihlášen
- Komentář ještě není vyřešen: `comment.isResolved() == false`
- `record.isUserElligibleToEditEverything(currentUser)` vrátí `true`

**Související akce:**
- `comment.setResolved(true)`
- Nastavení `resolvedTimestamp` a `resolvedBy`
- Odstranění asociací uživatele s komentářem
- Vytvoření záznamu v `RecordHistory` s typem `COMMENT`

---

## Importy

### POST `/import/validate` – Validace Excel souboru

**Kdo smí provést:**
- Uživatel musí být přihlášen
- Pro validaci není vyžadováno speciální oprávnění

**Související akce:**
- Parsování Excel souboru
- Validace řádků
- Vrácení chyb a varování v upraveném Excel souboru

---

### POST `/import/upload` – Import Excel souboru

**Kdo smí provést:**
- Uživatel musí být přihlášen
- `user.canContributeInto(project)` vrátí `true` (uživatel má přístup do projektu)

**Související akce:**
- Parsování Excel souboru
- Vytvoření `Batch` záznamu
- Vytvoření `Record` záznamů pro každý validní řádek
- Přiřazení `batch_id` k záznamům
- Vytvoření `Excel` záznamu s metadaty

---

### POST `/import/csv` – Import CSV souboru (asynchronní)

**Kdo smí provést:**
- Uživatel musí být přihlášen
- Pro validaci: žádné speciální oprávnění
- Pro import: `user.canContributeInto(project)` vrátí `true`

**Související akce:**
- Vytvoření asynchronní úlohy (`CsvImportTask` nebo `CvsBatchValidationTask`)
- Odeslání e-mailu po dokončení

---

### DELETE `/importResult/validated/:id` – Smazání validovaného reportu

**Kdo smí provést:**
- Uživatel musí být přihlášen
- Uživatel je autorem batche: `batch.getAuthor().equals(currentUser)`
- Batch ještě není importován: `batch.getImported() == false`

**Související akce:**
- Smazání `Excel` záznamu

---

## Taxony

### PATCH `/taxon/:id` – Editace pole taxonu

**Kdo smí provést:**
- `@Security.Authenticated(AuthorizedAsTaxonAdmin.class)` – uživatel musí být `taxonAdmin`
- Taxon editor nesmí být uzamčen jiným uživatelem (`TaxonEditorLock.Instance.Lock(user)`)

**Související akce:**
- Aktualizace pole taxonu (`LATNAME`, `CZNAME`, `RANK`, `AUTHOR`, `HYBRIDPARENTAGE`, `SUPPRESSED`, `COMMENT`, `NAMEHTML`)
- Vytvoření záznamu aktivity (`UserActivityService.recordActivity`)
- Označení locku jako dirty

---

### POST `/taxon/:id/move` – Přesun taxonu pod nového rodiče

**Kdo smí provést:**
- `@Security.Authenticated(AuthorizedAsTaxonAdmin.class)` – uživatel musí být `taxonAdmin`
- Taxon editor nesmí být uzamčen

**Související akce:**
- Aktualizace stromové struktury (nested set model: `left`, `right`)
- Označení locku jako dirty

---

### POST `/taxon` – Vytvoření nového taxonu

**Kdo smí provést:**
- `@Security.Authenticated(AuthorizedAsTaxonAdmin.class)` – uživatel musí být `taxonAdmin`
- Taxon editor nesmí být uzamčen

**Související akce:**
- Vytvoření nového `Taxon` záznamu
- Vytvoření `TaxonMapSettings` pro nový taxon
- Aktualizace stromové struktury rodiče

---

### DELETE `/taxon/:id` – Smazání taxonu

**Kdo smí provést:**
- `@Security.Authenticated(AuthorizedAsTaxonAdmin.class)` – uživatel musí být `taxonAdmin`
- Taxon editor nesmí být uzamčen
- Lze smazat pouze listový taxon (bez potomků)

**Související akce:**
- Smazání `Taxon` záznamu
- Aktualizace stromové struktury

---

### POST `/taxon/moveBeforeSibling` – Přesun taxonu před sourozence

**Kdo smí provést:**
- `@Security.Authenticated(AuthorizedAsTaxonAdmin.class)` – uživatel musí být `taxonAdmin`
- Taxon editor nesmí být uzamčen

**Související akce:**
- Aktualizace pořadí v rámci stejného rodiče
- Aktualizace stromové struktury
- Označení locku jako dirty

---

## Synonyma

### POST `/synonyms/:id` – Vytvoření synonyma

**Kdo smí provést:**
- `@Security.Authenticated(AuthorizedAsTaxonAdmin.class)` – uživatel musí být `taxonAdmin`

**Související akce:**
- Vytvoření nového `Synonym` záznamu

---

### PUT `/synonyms/:id` – Aktualizace synonyma

**Kdo smí provést:**
- `@Security.Authenticated(AuthorizedAsTaxonAdmin.class)` – uživatel musí být `taxonAdmin`

**Související akce:**
- Aktualizace `Synonym` záznamu

---

### DELETE `/synonyms/:id` – Smazání synonyma

**Kdo smí provést:**
- `@Security.Authenticated(AuthorizedAsTaxonAdmin.class)` – uživatel musí být `taxonAdmin`

**Související akce:**
- Smazání `Synonym` záznamu

---

## Nastavení map taxonů

### POST `/atlasadmin/taxonMapSettings` – Aktualizace nastavení mapy taxonu

**Kdo smí provést:**
- Uživatel musí být přihlášen
- Pro většinu polí: `user.isMapAdmin()` == `true`

**Klíče, které lze upravovat:**
- `MAPTYPE`, `REVISIONSTATUS`, `PUBLICATIONSTATUS`
- `REVISORSCOMMENT`, `REVISORSPRINTMAPCOMMENT`, `MAPADMINCOMMENT`
- `ISMAPPED`, `SETCOMMONTHRESHOLD`, `PRESLIA`, `PROTECTED`, `PARENT_MAP`

**Související akce:**
- Aktualizace `TaxonMapSettings`
- Při změně `PUBLICATIONSTATUS`:
  - Vyčištění cache (`TaxonCache.getInstance().clear()`)
  - Při přechodu na `StatusPreviewPreparation`: generování CSV mapy
  - Při přechodu na `StatusPreview`: notifikace revizorů a adminů e-mailem
  - Při přechodu na `StatusDone`: odemčení taxonu
- Při změně `REVISIONSTATUS`: notifikace revizorů

---

## Uživatelé

### POST `/user/changePassword` – Změna hesla

**Kdo smí provést:**
- Uživatel musí být přihlášen
- **Uživatel může měnit pouze své vlastní heslo** (pracuje s `SessionUtils.getCurrentUser()`)
- Původní heslo musí být správné
- Nová hesla se musí shodovat
- Nové heslo musí mít minimální délku (`User.MinPasswordLength`)

**Související akce:**
- Aktualizace `hashedPassword`

---

### POST `/user/changeEmail` – Změna e-mailu

**Kdo smí provést:**
- Uživatel musí být přihlášen
- **Uživatel může měnit pouze svůj vlastní e-mail** (pracuje s `SessionUtils.getCurrentUser()`)
- Heslo uživatele musí být zadáno pro ověření

**Související akce:**
- Aktualizace `email`
- Odeslání potvrzovacího e-mailu

---

### PUT `/user/settings/:key` – Uložení uživatelského nastavení

**Kdo smí provést:**
- Uživatel musí být přihlášen

**Související akce:**
- Vytvoření nebo aktualizace `UserSettings` záznamu

---

### DELETE `/user/settings/:keyPrefix` – Resetování uživatelských nastavení

**Kdo smí provést:**
- Uživatel musí být přihlášen

**Související akce:**
- Smazání `UserSettings` záznamů s daným prefixem klíče

---

### POST `/users` – Vytvoření nového uživatele

**Kdo smí provést:**
- `@Security.Authenticated(AuthorizedAsSysAdmin.class)` – uživatel musí být `sysAdmin`

**Související akce:**
- Vytvoření nového `User` záznamu
- Odeslání e-mailu s přihlašovacími údaji

---

### PUT `/users/:id` – Aktualizace uživatele

**Kdo smí provést:**
- `@Security.Authenticated(AuthorizedAsSysAdmin.class)` – uživatel musí být `sysAdmin`
- **Sysadmin může editovat libovolného uživatele** (není omezen na sebe sama)

**Související akce:**
- Aktualizace `User` záznamu (email, name, surname, mapAdmin, traitAdmin, sysAdmin, biblioAdmin, taxonAdmin, deleted)

---

### POST `/users/:id/resetPassword` – Resetování hesla uživatele

**Kdo smí provést:**
- `@Security.Authenticated(AuthorizedAsSysAdmin.class)` – uživatel musí být `sysAdmin`

**Související akce:**
- Vygenerování nového hesla
- Odeslání e-mailu s novým heslem

---

### POST `/users/rights/edit` – Editace práv uživatele

**Kdo smí provést:**
- `@Security.Authenticated(AuthorizedAsSysAdmin.class)` – uživatel musí být `sysAdmin`

**Související akce:**
- Aktualizace práv: `mapAdmin`, `traitAdmin`, `biblioAdmin`, `taxonAdmin`, `analyst`, `sysAdmin`
- Přiřazení/odebrání projektů (`AddProject`, `RemoveProject`)

---

## Map Reports

### POST `/atlasadmin/assignUserTaxon` – Přiřazení uživatele k taxonu (revizor)

**Kdo smí provést:**
- `user.isMapAdmin()` == `true`

**Související akce:**
- Přidání uživatele do `supervisedTaxons` taxonu
- Notifikace revizora e-mailem

---

### DELETE `/atlasadmin/removeUserTaxon/user/:userId/taxon/:taxonId` – Odebrání uživatele od taxonu

**Kdo smí provést:**
- `user.isMapAdmin()` == `true`

**Související akce:**
- Odebrání taxonu (a všech podřízených taxonů) z `supervisedTaxons` uživatele
- Vyčištění cache (`TaxonCache.getInstance().clear()`)

---

## PNG mapy

### POST `/atlas/pngMap/taxon/:taxonId` – Nahrání PNG mapy

**Kdo smí provést:**
- `user.isMapAdmin()` == `true`
- Taxon musí existovat
- Taxon musí být mapovatelný (`TaxonMapSettings` existuje)
- Publication status musí být `StatusPreviewPreparation` nebo `StatusPreview`

**Související akce:**
- Uložení nebo aktualizace `PdfMap` záznamu (typ `PngType`)
- Notifikace revizorů a adminů e-mailem
- Aktualizace publication status na `StatusPreview`

---

## Search

### POST `/atlas/search/page/:page/pageSize/:pageSize/getCount/:getCount` – Vyhledávání záznamů

**Kdo smí provést:**
- Uživatel musí být přihlášen
- Pro export do Excelu: uživatel musí mít přístup do alespoň jednoho projektu (`user.getContributionProjects().isEmpty() == false`)

**Související akce:**
- Záznam aktivity (`UserActivity.RecordSearch`, `UserActivity.SubmitSearchRequest`)
- Vrácení výsledků vyhledávání s podporou filtrace, třídění a stránkování

---

## Přehled rolí

| Role | Popis | Klíčová oprávnění |
|------|-------|-------------------|
| `isMapAdmin()` | Administrátor mapy | Editace všech záznamů, nastavení map, přiřazování revizorů |
| `isTaxonAdmin()` | Administrátor taxonů | Editace, vytváření a mazání taxonů a synonym |
| `isSysAdmin()` | Systémový administrátor | Správa uživatelů a jejich práv |
| `isTraitAdmin()` | Administrátor vlastností | Správa měření a vlastností |
| `isBiblioAdmin()` | Administrátor bibliografie | Správa bibliografických záznamů |
| `supervisedTaxons` | Revizor taxonů | Editace záznamů přiřazených taxonů |
| `contributionProjects` | Přispěvatel projektu | Import dat do projektu, editace vlastních záznamů |

---

## Poznámky

### Concurrency kontrola
Většina editací záznamů používá `lastEditTimestamp` pro detekci souběžných změn. Pokud client pošle starší timestamp než je na serveru, vrátí se chyba 409 (Conflict).

### Lockování záznamů
Záznamy mohou být uzamčeny (`record.isLocked()`) nebo editace může být zakázána (`record.isEditationAllowed()`) během generování mapových podkladů.

### Historie změn
Většina editací záznamů a komentářů vytváří záznam v `RecordHistory` pro auditování změn.

### Notifikace
Některé akce (změna publication status, přiřazení revizora, upload mapy) spouští e-mailové notifikace příslušným uživatelům.
