# Chování React frontendu aplikace při editacích

**prompt:**
    připrav uživatelsky srozumitelné shrnutí chování frontednu této aplikace, zejména při editacích. Vytvoř/aktualizuj tento markdown dokument, ve kterém bude popsáno chování React frontendu aplikace při jakékoli write operaci - kdo smí akci provést, zda to vyvolává nějaké související akce. V řadě případů je podstatná i read autorizace - kdo smí stahovat data traitů, kdo vidí seznam uživatelů atp.
    Zdůrazni pokud by někde byla editace možná bez kontroly oprávnění či by se ti zdál nesoulad mezi jendotlivými komponentami pracující se stejnými entitami.

---

Tento dokument popisuje chování React frontendu (`frontend/src`) při write operacích – kdo jakou akci vidí a smí ji spustit, jaké související akce vyvolává a kde se kontroluje read autorizace. Autorizační pravidla backendu (kdo endpoint skutečně pustí) popisuje samostatný dokument [rules_backend.md](./rules_backend.md); zde je na něj odkazováno a je s ním porovnáváno, co frontend skutečně nabízí.

> ⚠️ Shrnutí nejzávažnějších nálezů najdete v sekci [Zjištěné problémy a nesoulady](#zjištěné-problémy-a-nesoulady).

## Obsah

1. [Základní principy autorizace ve frontendu](#základní-principy-autorizace-ve-frontendu)
2. [Přehled rout a jejich ochrany](#přehled-rout-a-jejich-ochrany)
3. [Záznamy – detail záznamu](#záznamy--detail-záznamu)
4. [Rychlé editace v přehledech mapy (mapDetail)](#rychlé-editace-v-přehledech-mapy-mapdetail)
5. [Vyhledávání a hromadná editace (BulkEdit)](#vyhledávání-a-hromadná-editace-bulkedit)
6. [Komentáře k záznamům](#komentáře-k-záznamům)
7. [Importy záznamů](#importy-záznamů)
8. [Taxony (Taxa administration)](#taxony-taxa-administration)
9. [AtlasAdmin – seznamy importů, uživatelů a taxonů](#atlasadmin--seznamy-importů-uživatelů-a-taxonů)
10. [Měření a vlastnosti (Measurements / Traits)](#měření-a-vlastnosti-measurements--traits)
11. [Uživatelé a vlastní účet](#uživatelé-a-vlastní-účet)
12. [Read autorizace – kdo co vidí a stahuje](#read-autorizace--kdo-co-vidí-a-stahuje)
13. [Zjištěné problémy a nesoulady](#zjištěné-problémy-a-nesoulady)
14. [Poznámky](#poznámky)

---

## Základní principy autorizace ve frontendu

**Přihlášení.** Celá React SPA je mountována přes `Application.index`, která je anotována `@Security.Authenticated(Authorized.class)` – nepřihlášený uživatel dostane přihlašovací stránku. Celý frontend je tedy dostupný pouze přihlášeným uživatelům; veškerá API volání nesou session cookie a spoléhají na backend kontrolu.

**Data o uživateli.** Při startu aplikace (`App.tsx`) se zavolá `GET /api/react/config`, ze kterého se vytvoří `UserContext` (instance třídy `User` v `models/User.ts`). Ta obsahuje role `isMapAdmin`, `isBulkEditor`, `isTraitAdmin`, `isSysAdmin`, `isTaxonAdmin`, `isAsyncImporter`, dále `userEmail`, `language` a `supervisedTaxonIds` (seznam taxonů, které uživatel přímo revizuje).

**Ochrana rout.** Komponenta `ProtectedRoute` kontroluje:
- `requiredModule` – dostupnost modulu instance (`atlas`, `biblio`, `measurements`; jde o konfiguraci instance, nikoli oprávnění uživatele),
- `requiredPermission` – jednu roli uživatele,
- `requiredPermissions` – pole rolí s OR logikou (stačí jedna).

Nesplnění → přesměrování na `/unauthorized`.

**Ochrana na úrovni komponent.** Editační prvky se zobrazují podmíněně dvěma způsoby:
- podle role z `useUser()` (např. `user.isMapAdmin || user.isBulkEditor` u BulkEditu),
- podle **příznaků, které vypočítá server přímo v datech** – `record.canEdit`, `trait.canDelete`, `trait.canDownload`, `trait.canExport`, `comment.resolved` apod. Zvlášť u záznamů je to hlavní mechanismus, protože právo editovat záznam závisí na vztahu uživatele k batchi, taxonu i projektu (backend: `isUserElligibleToEditCommonFields` / `isUserElligibleToEditEverything`).

**Důležité omezení.** Veškeré frontendové kontroly jsou pouze UX – vždy je provádí backend (viz [rules_backend.md](./rules_backend.md)). Skrytí tlačítka ve frontendu tedy neznamená, že by endpoint nešlo zavolat přímo.

**Optimistické UI a concurrency.** Většina editací posílá `lastEditTimestampNum` (resp. `timestamp` u TaxonMapSettings); frontend dělá optimistické změny stavu a při konfliktu (409 / „novější verze existuje“) je vrací zpět.

---

## Přehled rout a jejich ochrany

| Route | Modul | Role (ProtectedRoute) |
|---|---|---|
| `/` (Home), `/unauthorized`, `/user/docs` | – | přihlášený |
| `/atlas/newComments`, `/atlas/search`, `/atlas/listOfControls`, `/atlas/listOfImports`, `/atlas/listOfTaxa`, `/atlas/import`, `/atlas/importCSV`, `/atlas/mapMain/:taxonId`, `/atlas/mapPreview/:taxonId`, `/atlas/mapDetail/:taxonId/:squareId`, `/atlas/record/:recordId` | atlas | **žádná role** – každý přihlášený |
| `/atlasAdmin/listOfImports`, `/atlasAdmin/listOfUsers`, `/atlasAdmin/listOfTaxa` | atlas | `isMapAdmin` |
| `/biblio/search` | biblio | žádná role |
| `/measurements/general`, `/datatypes`, `/aggregationTypes`, `/data`, `/export`, `/backup`, `/features/:featureId` | measurements | **žádná role** – každý přihlášený |
| `/downloads` | – | žádná role (přihlášený) |
| `/user/logout`, `/user/changePassword`, `/user/changeEmail`, `/user/settings` | – | žádná role (přihlášený) |
| `/user/usersAdministration` | – | `isSysAdmin` |
| `/user/taxaAdministration/:taxonId?` | – | `isTaxonAdmin` |
| `/user/addUser` | – | `isMapAdmin` **NEBO** `isTraitAdmin` |

Hlavní menu (`MainMenu.tsx`) nabízí odkazy konzistentně s routami: správa uživatelů jen `isSysAdmin`, správa taxonů jen `isTaxonAdmin`, přidání uživatele `isMapAdmin || isTraitAdmin`; zbytek atlasového/biblio/measurement menu vidí všichni uživatelé s daným modulem.

---

## Záznamy – detail záznamu

Stránka `Record.tsx` načte záznam přes `GET /atlas/record/:recordId/full` (včetně `canEdit` a `lastEditTimestamp`) a její karty editují **pouze pokud `record.canEdit == true`** (hook `useRecordPermissions`).

### Editovatelná pole (RecordInlineField, SingleSelectEdit, MultiSelectEdit)

- **Kdo smí editovat:** každý, komu server nastavil `canEdit` (mapAdmin, revizor taxonu vč. nadřazených, správce projektu, autor/committer batche u nezpracovaného záznamu – viz backend).
- **Endpoint:** `PATCH /api/react/atlas/record/:recordId` s `key`, `value` a `lastEditTimestampNum`.
- **Související akce:** po úspěchu se aktualizuje lokální timestamp (kvůli dalším editacím téhož záznamu) a propaguje se rodičovi; kaskádové změny na serveru (např. reset `included_in_map`) se v UI zobrazí po refetchi.
- Používáno v `RecordRemarks` (zdroj, poznámky, prostředí, detrev), `RecordFloristic` (taxon, autoři, herbaria, substráty…) i jinde.

### Přesun souřadnic (moveCoordinates)

- Kliknutí do mapy (`RecordMap`) je aktivní jen při `canEdit`; navržená pozice se potvrdí tlačítkem, které pošle `POST /api/react/atlas/record/moveCoordinates` s novými souřadnicemi, GPS přesností a timestampem.
- Backend kontroly viz [rules_backend.md](./rules_backend.md) (Záznamy).

---

## Rychlé editace v přehledech mapy (mapDetail)

Komponenty v `PladiasRecordsTable` (používané v mapDetail, mapMain i search):

| Komponenta | Pole | Endpoint | Viditelnost |
|---|---|---|---|
| `ValidationStatusCheckboxes` | `VALIDATION_STATUS` | `PATCH /atlas/record/:recordId` | jen `record.canEdit`; status `UNPROCESSED` je v nabídce jen pro `isMapAdmin` |
| `OriginalityStatusIcons` | `ORIGINALITY_STATUS` | dto. | jen `canEdit` a jen u statusu `Accepted` |
| `IncludeInMapCheckbox` | `INCLUDED_IN_MAP` | dto. | jen `canEdit` a jen u statusů `Uncertain`/`Accepted` |
| `HerbariumQualityCheckbox` | `HERBARIUM_QUALITY` | dto. | jen `canEdit`, jen projekt „excerpce herbářů“ (ID 14), statusy `Uncertain`/`Declined`/`Accepted` |

Vše probíhá přes hook `useRecordQuickUpdates` – optimistická změna, PATCH s timestampem, po úspěchu převzetí nového timestampu a (u validace/originality) refetch `GET /atlas/record/:recordId/mapFields`, aby UI zachytilo kaskádové změny (např. vynulování `included_in_map`). Toto chování kopíruje kaskády definované na backendu.

---

## Vyhledávání a hromadná editace (BulkEdit)

### Vyhledávání (`SearchForm.tsx`)

- **Kdo smí:** každý přihlášený uživatel s atlas modulem; výsledky obsahují `canEdit` per záznam, podle kterého se (i zde) řídí viditelnost rychlých editací.
- **Excel export:** tlačítko vidí všichni; titulek se liší podle `isMapAdmin` (plná data vs. omezená). Samotné omezení dělá backend (mapAdmin dostává větší export, ostatní potřebují přiřazený příspěvkový projekt).

### BulkEdit

- **Kdo smí:** panel se zobrazí jen pro `user.isMapAdmin || user.isBulkEditor` (shodné s backendovým `POST /atlas/search/records-edit-timestamps`).
- **Průběh:** nejdřív `POST /atlas/search/records-edit-timestamps` (načtení verzí vyfiltrovaných záznamů, max. 1000 záznamů), poté se změny aplikují **po jednom záznamu** přes `PATCH /atlas/record/:recordId` (přesnost souřadnic, datum, fytochorion, lokalita, nejbližší město, zdroj, poznámka, nálezce, taxon, validační status) nebo hromadný přesun přes `POST /atlas/record/moveCoordinates`.
- **Související akce:** průběh + souhrn úspěchů/chyb per záznam; po dokončení refresh výsledků vyhledávání.
- ⚠️ Viz [problém č. 4](#4-bulkedit-viditelný-pro-isbulkeditor-ale-backend-patch-vyžaduje-revizorská-oprávnění).

---

## Komentáře k záznamům

Komponenty `RecordComments` (detail záznamu) a `AddCommentModal` (mapDetail, search).

| Akce | Endpoint | Kdo ji ve frontendu vidí | Backend |
|---|---|---|---|
| Vytvoření | `POST /atlas/record/comment` | každý přihlášený (modal jen testuje existenci `user`) | každý přihlášený ke každému záznamu |
| Vyřešení | `POST /atlas/record/comment/:id/resolve` | mapAdmin, **nebo** uživatel, jehož `supervisedTaxonIds` obsahuje taxon záznamu | `isUserElligibleToEditEverything` (mapAdmin, revizor vč. nadřazených taxonů, správce projektu) |
| Smazání | `DELETE /atlas/record/comment/:id` | autor komentáře (`comment.authorId == user.id`) **nebo** mapAdmin | autor NEBO mapAdmin – **shodné** |
| Označit jako přečtené | `DELETE /atlas/record/comment-assoc/:commentId/linked-user/:boundUserId` | uživatel sám (odhlásí se z notifikací) | master admin nebo daný uživatel |
| **Editace textu** | – | **ve frontendu není vůbec implementována** | backend `PUT /atlas/record/comment/:id` existuje, ale autor nesmí |

**Poznámky:**
- Frontendová kontrola „vyřešit“ (`canResolveComment`) backendovou logiku **zrcadlí jen částečně** – viz [problém č. 6](#6-canresolvecomment-je-restriktivnější-než-backend).
- `Record.tsx` renderuje `<RecordComments recordId={record.id} />` bez volitelného propu `recordTaxonId`, takže na detailu záznamu nemůže podmínka pro běžného revizora vyjít vůbec (jen mapAdmin).
- Stránka `NewComments` umožňuje komentáře pouze číst a označovat jako přečtené.

---

## Importy záznamů

### Import / ImportCSV (`/atlas/import`, `/atlas/importCSV`)

- **Kdo smí:** frontend **nekontroluje žádnou roli** – formulář vidí každý přihlášený uživatel s atlas modulem.
- Operace „validace“ jde na `POST /api/react/import/validate` (kdokoli přihlášený), operace „import“ na `POST /api/react/import/upload`, resp. `POST /api/react/import/csv`.
- Právo importovat do zvoleného projektu (`canContributeInto`) kontroluje až backend – neautorizovaný import selže na serveru, frontend zobrazí chybu.

### ListOfControls (`/atlas/listOfControls`) – výsledky validací

- Tabulka validovaných dávek **všech uživatelů**; u každého řádku tlačítko smazat → `DELETE /api/react/importResult/validated/:id`.
- Backend dávku smaže jen pokud je volající autorem a dávka není importovaná; jinak **tichý no-op s 200 OK**. Frontend vždy zobrazí „úspěšně smazáno“ – viz [problém č. 5](#5-listofcontrols-mazání-validovaných-dávek-hlásí-úspěch-i-když-se-nic-nestane).

### ListOfImports (`/atlas/listOfImports`) – importované dávky

- Jen čtení + XLSX export; hook pro akce (`useImportsActions`) je připraven, ale není napojen na žádné tlačítko („reserved for future use“).

---

## Taxony (Taxa administration)

Stránka `/user/taxaAdministration/:taxonId?` – chráněná rolí `isTaxonAdmin`. Po výběru taxonu (autocomplete přes všechna taxa) se zobrazí editační karty; **žádné další frontendové kontroly rolí už nejsou** – spoléhají na backend (`AuthorizedAsTaxonAdmin` + zámek `TaxonEditorLock`).

| Komponenta | Akce | Endpoint |
|---|---|---|
| `TaxonEditCard` (přes `TaxonInlineField`) | editace polí LATNAME, NAMEHTML, CZNAME, RANK, AUTHOR, HYBRIDPARENTAGE, SUPPRESSED, COMMENT | `PATCH /api/react/taxon/:taxonId` |
| `MoveTaxonCard` | přesun pod jiného rodiče | `POST /api/react/taxon/:taxonId/move` |
| `MoveTaxonCard` | smazání taxonu (s potvrzením; jen taxon bez potomků a záznamů) | `DELETE /api/react/taxon/:taxonId` |
| `NewTaxonCard` | vytvoření nového taxonu pod vybraným | `POST /api/react/taxon` |
| `ChildrenOrderingCard` | změna pořadí sourozenců | `POST /api/react/taxon/moveBeforeSibling` |
| `TaxonSynonyms` | přidání / editace / smazání synonyma | `POST /api/react/synonyms/:taxonId`, `PUT /api/react/synonyms/:synonymId`, `DELETE /api/react/synonyms/:synonymId` |

**Související akce:** po každé změně se taxon znovu načte z backendu (pesimistický reload přes `refreshSelectedTaxon`); po vytvoření/přesunu dochází k přesměrování na nové/nadřazené taxonId.

⚠️ Pozor na dvojici vizuálně stejných komponent: `TaxonInlineField` (editace taxonu, gate via route `isTaxonAdmin`) vs. `RecordInlineField` (editace záznamu, gate `record.canEdit`) – obě posílají PATCH se stejným vzorem (klíč, hodnota, timestamp), ale jejich oprávnění se kontrolují zcela jinde. Kolize nemohou, ale změna jednoho z nich snadno rozbije druhý.

---

## AtlasAdmin – seznamy importů, uživatelů a taxonů

Celý prefix `/atlasAdmin/*` je chráněn rolí `isMapAdmin` (a modulem atlas).

### ListOfImports (atlasAdmin) – správa importních dávek

- Tlačítko smazat u dávky nevolá DELETE, ale **mutující GET** `GET /api/react/atlasadmin/prepareBatchDelete/:batchId` – připraví smazání a pošle deleční kód e-mailem committerovi dávky.
- Vlastní smazání (`deleteBatch/:batchId/password/:password`) se děje **mimo SPA** (odkaz v e-mailu), takže deleční kód frontend nikdy nezadává.
- Backend kontrolu role u `prepareBatchDelete` nemá – viz [rules_backend.md](./rules_backend.md), problém č. 4; frontend to částečně mírní tím, že UI zpřístupňuje jen mapAdminům (endpoint ale zůstává volatelný přímo).

### ListOfUsers / MapUsers – správa práv uživatelů k mapám

- **Přidání/odebrání projektu:** `POST /api/react/users/rights/edit` s klíči `AddProject`/`RemoveProject`.
- **Přidání revizora taxonu:** přes `useMapUsersTaxa` → `POST /api/react/atlasadmin/assignUserTaxon` (backend: mapAdmin).
- **Odebrání revizora:** `DELETE /api/react/atlasadmin/removeUserTaxon/user/:userId/taxon/:taxonId` (backend: mapAdmin).
- ⚠️ **Nesoulad:** `POST /users/rights/edit` vyžaduje na backendu **sysAdmina**, ale stránka je určena mapAdminovi – operace tak mapAdminovi, který není sysAdmin, končí chybou. Viz [problém č. 2](#2-mapusers-přidělování-projektů-pro-mapadmina-volá-sysadmin-endpoint).

### ListOfTaxa – nastavení map taxonů (TaxonMapSettings)

Editační tabulka nastavení taxonů (`useTaxonUpdates`): `ISMAPPED`, `SETCOMMONTHRESHOLD`, `PUBLICATIONSTATUS`, `REVISIONSTATUS`, `MAPTYPE`, `REVISORSCOMMENT`, `REVISORSPRINTMAPCOMMENT`, `MAPADMINCOMMENT`, `PRESLIA`, `PROTECTED`, `PARENT_MAP` – vše přes jediný `POST /api/react/atlasadmin/taxonMapSettings` s `taxonId`, `key`, `value` a `timestamp` (optimistická konkurence, po úspěchu se vrací nový timestamp).

- **Kdo smí ve frontendu:** jen mapAdmin (route + menu).
- ⚠️ Backend kontroluje roli jen u `ISMAPPED`, `SETCOMMONTHRESHOLD` a `PUBLICATIONSTATUS` – u ostatních klíčů by operaci provedl každý přihlášený (viz [rules_backend.md](./rules_backend.md), problém č. 3). Frontend tedy riziko v UI skrývá, ale neodstraňuje.
- Změny `PUBLICATIONSTATUS`/`REVISIONSTATUS` na backendu spouštějí přechody stavů a e-mailové notifikace – frontend po nich jen refetchuje data.

---

## Měření a vlastnosti (Measurements / Traits)

Celý modul `/measurements/*` je chráněn **pouze modulem instance – žádná role**. Všechny následující formuláře tak vidí každý přihlášený uživatel; o oprávnění se stará až backend:

| Stránka | Write operace | Endpoint | Backend vyžaduje |
|---|---|---|---|
| `FeatureDetail` (upload) | upload/validace datové řady | `POST /api/react/measurement/trait` | traitAdmin nebo admin vlastnosti (Feature) |
| `TraitTable` (na FeatureDetail) | smazání datové řady | `DELETE /api/react/measurement/trait/:traitId` | traitAdmin/admin feature; frontend navíc skrývá tlačítko, pokud server pošle `canDelete == false` |
| `TraitTable` | nastavení výchozí datové řady | `PUT /api/react/measurement/trait/:traitId/default` | ⚠️ invertovaná podmínka na backendu – viz [rules_backend.md](./rules_backend.md), problém č. 2; FE radio skrývá dle `canDelete` |
| `Backup` | vytvoření zálohy | `POST /api/react/measurement/backup` | traitAdmin |
| `Export` | komplexní export | `POST /api/react/measurement/complexExport` | per-trait práva ke stažení (`isElligibleForTraitDownload`) |
| `Settings` (uživatelské) | substituce traitů | `PUT /api/react/user/settings/:key` | přihlášený; sekce substitucí je ve FE zobrazena jen `isTraitAdmin` |

**Související akce:** po importu datové řady se tabulka řad reloadne; po smazání se znovu načte (mazání může změnit výchozí řadu); upload formulář nabízí výběr vlastníka (defaultně aktuální uživatel) ze seznamu `GET /api/react/users-minimal`.

**Read autorizace:** odkazy „stáhnout data“ / „detailní export“ u datových řad se řídí příznaky `canDownload`/`canExport` od serveru; datové řady s omezenou viditelností tak uživatel bez práv vidí, ale nemůže stahovat. Viz [problém č. 3](#3-measurements-modul-nemá-ve-frontendu-žádnou-kontrolu-rolí).

---

## Uživatelé a vlastní účet

### UsersAdministration (`/user/usersAdministration`) – role `isSysAdmin`

- `UsersTable` – tabulka všech uživatelů včetně e-mailů a rolí; přepínání checkboxů (`mapAdmin`, `traitAdmin`, `sysAdmin`, `biblioAdmin`, `taxonAdmin`, `deleted`) posílá `PUT /api/react/users/:id`.
- Shodné s backendem (sysAdmin). Poznámka: frontendový model uživatele roli `biblioAdmin` nezná (nikde jinde se nepoužívá), checkbox je jen v této tabulce.

### AddUser (`/user/addUser`) – role `isMapAdmin` NEBO `isTraitAdmin`

- Vytvoření uživatele: `POST /api/react/users`; volitelně hned poté přiřazení projektu: `POST /api/react/users/rights/edit` (klíč `AddProject`).
- ⚠️ **Zásadní nesoulad:** oba endpointy vyžadují na backendu **sysAdmina**, takže mapAdmin/traitAdmin sice formulář vidí a vyplní, ale obě volání skončí 401. Viz [problém č. 1](#1-adduser-je-ve-frontendu-pro-mapadmintraitadmin-ale-backend-vyžaduje-sysadmina).

### Vlastní účet (`/user/changePassword`, `/user/changeEmail`, `/user/settings`)

- `POST /api/react/user/changePassword` (vyžaduje staré heslo), `POST /api/react/user/createToken` (API token), `POST /api/react/user/changeEmail` (vyžaduje heslo; mění se okamžitě – viz backend problém č. 7), `PUT/DELETE /api/react/user/settings/...`.
- Vše self-service, shodné s backendem; nastavení substitucí traitů se zobrazí jen `isTraitAdmin`, jazyk aplikace se ukládá přes klíč `application_language`.

---

## Read autorizace – kdo co vidí a stahuje

| Data | Kde se ve frontendu získávají | Odpovídající gate |
|---|---|---|
| Seznam uživatelů s e-maily a rolemi (`GET /api/react/users`) | UsersAdministration, MapUsers | route `isSysAdmin`, resp. `isMapAdmin` |
| Seznam uživatelů – jména (`GET /api/react/users-minimal`) | formulář uploadu traitů, hledání (nálezce/autoři) | **žádný** – každý přihlášený |
| Data traitů (`/measurement/trait/download/...`) | odkazy v TraitTable | server flag `canDownload` |
| Detailní export traitů | odkaz v TraitTable | server flag `canExport` |
| Výsledky vyhledávání záznamů | SearchForm | každý přihlášený; obsah (citlivá pole, `canEdit`) určuje backend per záznam |
| Historie a komentáře záznamu | Record.tsx | každý přihlášený |
| Přehledy map (mapMain, mapDetail, PNG) | atlas | každý přihlášený s atlas modulem |
| Downloads (`/downloads`) | DownloadsIndex | bez role (přihlášený) |
| Autocomplete taxonů (`taxa-importable`) | MainMenu, hledání, import | každý přihlášený s atlas modulem |

Poznámka: „public“ routy (`/downloads`, `/user/docs`, Home) jsou veřejné jen v rámci SPA – protože samotná SPA je za přihlášením, fakticky je vidí každý přihlášený uživatel.

---

## Zjištěné problémy a nesoulady

### 1. AddUser je ve frontendu pro mapAdmin/traitAdmin, ale backend vyžaduje sysAdmina

Route `/user/addUser` i položka menu jsou gateované `isMapAdmin || isTraitAdmin`, ale `POST /api/react/users` (createUser) i `POST /api/react/users/rights/edit` (přiřazení projektu) mají na backendu `@Security.Authenticated(AuthorizedAsSysAdmin.class)` + vnitřní kontrolu `isSysAdmin()`. MapAdmin nebo traitAdmin tedy formulář vyplní a obě volání skončí 401 Unauthorized. Buď je frontendová role příliš široká, nebo backend příliš úzký – v každém případě UI slibuje funkci, kterou nemůže splnit.

### 2. MapUsers přidělování projektů pro mapAdmina volá sysAdmin endpoint

Stránka `/atlasAdmin/listOfUsers` (MapUsers) je určena mapAdminovi, ale přidání/odebrání projektu uživateli používá tentýž `POST /users/rights/edit`, který backend pustí jen sysAdminovi. Naopak přiřazení/odebrání revizora (`assignUserTaxon`/`removeUserTaxon`) je na backendu mapAdmin – jedna stránka tedy kombinuje endpoint se správnou rolí a endpoint s rolí špatnou.

### 3. Measurements modul nemá ve frontendu žádnou kontrolu rolí

Upload datové řady (`POST /measurement/trait`), záloha (`POST /measurement/backup`) ani nastavení výchozí řady nejsou ve frontendu podmíněny rolí `isTraitAdmin` – formuláře vidí každý přihlášený uživatel instance s measurements modulem. Nejde o bezpečnostní díru (backend práva kontroluje), ale uživatel bez práv se o tom dozví až z chyby serveru po odeslání formuláře. Srovnej se stránkou Settings, kde se na `isTraitAdmin` podmínkuje alespoň zobrazení sekce substitucí – mezi komponentami téhož modulu panuje nekonzistentní přístup.

### 4. BulkEdit viditelný pro isBulkEditor, ale backend PATCH vyžaduje revizorská oprávnění

Panel hromadné editace se zobrazí pro `isMapAdmin || isBulkEditor` a vstupní endpoint (`records-edit-timestamps`) backend pustí stejným uživatelům. Samotné ukládání ale probíhá per záznam přes `PATCH /atlas/record/:recordId`, kde backend (kvůli `//TODO fix`) kontroluje `isElligibleForRecordValidation` (mapAdmin/revizor taxonu) **i u běžných polí**. BulkEditor bez těchto rolí tak funkci vidí, ale každá změna končí chybou. (Podrobnosti v [rules_backend.md](./rules_backend.md), problém č. 1 – na frontendu se problém projeví jako série chybových hlášení v souhrnu BulkEditu.)

### 5. ListOfControls mazání validovaných dávek hlásí úspěch, i když se nic nestane

Tlačítko smazat se zobrazuje u všech validovaných dávek bez ohledu na autora; backend `DELETE /importResult/validated/:id` ale maže jen vlastní neimportované dávky a v ostatních případech vrací tichý no-op s 200 OK. Frontend (axios) kontroluje jen HTTP status a vždy zobrazí „smazáno úspěšně“ – tabulka se navíc sama nerefreshuje, takže uživatel vidí dávku dál. Viz [rules_backend.md](./rules_backend.md), problém č. 6.

### 6. canResolveComment je restriktivnější než backend

Frontend povolí tlačítko „vyřešit“ jen mapAdminovi nebo uživateli, jehož `supervisedTaxonIds` přímo obsahuje taxon záznamu. Backend `POST /comment/:id/resolve` pustí navíc revizory nadřazených taxonů a správce projektu záznamu (`isUserElligibleToEditEverything`). Jde o nesoulad v bezpečném směru (UI skrývá akci oprávněným uživatelům), ale je nekonzistentní. K tomu `Record.tsx` nepředává `recordTaxonId`, takže na detailu záznamu nemůže podmínka vyjít pro běžného revizora vůbec. Související mrtvý kód: `useRecordPermissions.canEditComments`/`canEditComment` nejsou reálně použity a jsou zavádějící (nic smysluplného nekontrolují).

### 7. `isAsyncImporter` se do frontendu nikdy nedostane

Model `User` i `ProtectedRoute` znají roli `isAsyncImporter`, ale `App.tsx` ji z `GET /api/react/config` nečte ani nepředává do `UserProvider` – `user.isAsyncImporter` je tak vždy `false`. Role zatím není u žádné routy použita, ale jakákoli budoucí gate na ni bude tiše nefunkční.

### 8. Ostatní drobnosti

- **Editace komentáře neexistuje ve frontendu** – backend `PUT /atlas/record/comment/:id` nemá v UI obdobu. Je to konzistentní s tím, že autor komentář upravit nesmí (backend problém č. 5), ale revize textu cizího komentáře tak v UI možná není vůbec (ani pro mapAdmina).
- `RecordLocation` má kontrolu `canEdit` zakomentovanou – v současnosti neškodí (komponenta jen zobrazuje navrženou pozici; samotný přesun se potvrzuje v `Record.tsx`), ale je to past pro budoucí rozšíření.
- `MainMenu` používá pro odhlášení odkaz `href="/logout"` (legacy route) a ignoruje existující routu `/user/logout`.
- Hooky `useImportsActions`/`useImportControlsActions` obsahují nepoužitou akci `POST /importResult/${action}/${id}` („reserved for future use“) – v `conf/react.routes` takový obecný POST endpoint neexistuje; po napojení by volání padala na 404.
- `TraitUpload` nabízí výběr vlastníka datové řady z `users-minimal` komukoli, kdo stránku vůbec vidí (viz problém č. 3) – výběr cizího vlastníka ale backend import nezastaví (vlastník je jen metadata).

---

## Poznámky

### Optimistické UI
Rychlé editace záznamů (validace, originalita, herbarium, include-in-map) a nastavení map taxonů dělají optimistickou změnu stavu a při chybě ji vrací; po úspěchu si přebírají nový timestamp z odpovědi serveru. Detail záznamu si timestamp propaguje mezi kartami, aby souběžné editace různých polí jednoho záznamu na sobě nevyhazovaly konflikt 409.

### Kam se autorizace ve frontendu nezapisuje
Frontend nemá žádnou centrální tabulku oprávnění – role se kontrolují na třech místech (ProtectedRoute, MainMenu, podmíněné renderování v komponentách) a k tomu přistupují serverové příznaky v datech (`canEdit` apod.). Při přidávání nové write operace je proto nutné zkontrolovat všechna tři místa; opomenutí vede k situacím typu problémů č. 1–3.

### Srovnání s backendem
Kde frontend a backend sedí (mazání komentářů, správa uživatelských rolí v UsersAdministration, `records-edit-timestamps`, `assignUserTaxon`), je to dáno tím, že FE gate kopíruje backend kontrolu. Většina nesouladů plyne z toho, že FE role je odvozená od „kdo by měl funkci vidět“, zatímco backend kontroluje konkrétní endpoint – viz [Zjištěné problémy](#zjištěné-problémy-a-nesoulady) a [rules_backend.md](./rules_backend.md).

