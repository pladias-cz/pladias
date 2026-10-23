# Chování React frontendu aplikace při editacích

**prompt:**
    Aktualizuj tento markdown dokument, ve kterém bude srozumitelně popsáno chování React frontendu aplikace při jakékoli write operaci - kdo smí akci provést, zda to vyvolává nějaké související akce. V řadě případů je podstatná i read autorizace - kdo smí stahovat data traitů, kdo vidí seznam uživatelů atp.
    Zdůrazni pokud by někde byla editace možná bez kontroly oprávnění či by se ti zdál nesoulad mezi jednotlivými komponentami pracující se stejnými entitami.

---

Tento dokument popisuje chování React frontendu (`frontend/src`) při write operacích – kdo jakou akci vidí a smí ji spustit, jaké související akce vyvolává a kde se kontroluje read autorizace. Autorizační pravidla backendu (kdo endpoint skutečně pustí) popisuje samostatný dokument [rules_backend.md](./rules_backend.md); zde je na něj odkazováno a je s ním porovnáváno, co frontend skutečně nabízí.


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
13. [Poznámky](#poznámky)

---

## Základní principy autorizace ve frontendu

**Přihlášení.** Celá React SPA je mountována přes `Application.index`, která je anotována `@Security.Authenticated(Authorized.class)` – nepřihlášený uživatel dostane přihlašovací stránku. Celý frontend je tedy dostupný pouze přihlášeným uživatelům; veškerá API volání nesou session cookie a spoléhají na backend kontrolu.

**Data o uživateli.** Při startu aplikace (`App.tsx`) se zavolá `GET /api/react/config`, ze kterého se vytvoří `UserContext` (instance třídy `User` v `models/User.ts`). Backend posílá role jako pole `roles: string[]` (zdroj: `UserRole.keysOf` na BE; mapAdmin v sobě zahrnuje i kompetence bulkEditora), frontend z nich odvozuje getry `isMapAdmin`, `isBulkEditor`, `isTraitAdmin`, `isSysAdmin`, `isTaxonAdmin`, `isAsyncImporter`, `isBiblioAdmin` a generickou metodu `hasRole(role)`. Dále `userEmail`, `language` a `supervisedTaxonIds` (seznam taxonů, které uživatel přímo revizuje).

**Ochrana rout.** Komponenta `ProtectedRoute` kontroluje:
- `requiredModule` – dostupnost modulu instance (`atlas`, `biblio`, `measurements`; jde o konfiguraci instance, nikoli oprávnění uživatele),
- `requiredRole` – jednu roli uživatele,
- `requiredRoles` – pole rolí s OR logikou (stačí jedna).

Nesplnění → přesměrování na `/unauthorized`.

**Ochrana na úrovni komponent.** Editační prvky se zobrazují podmíněně dvěma způsoby:
- podle role z `useUser()` (např. `user.isMapAdmin || user.isBulkEditor` u BulkEditu),
- podle **příznaků, které vypočítá server přímo v datech** – u záznamů `record.canEditCommonFields`, `record.canEditValidationFields`, `record.canResolveComments` (a `record.locked`), u vlastností `feature.canAdminister`, `trait.canDownload`/`trait.canExport` apod. Zvlášť u záznamů je to hlavní mechanismus, protože právo editovat záznam závisí na vztahu uživatele k batchi, taxonu i projektu – flagy počítá backendová služba `RecordEditPermissions` (jediný zdroj pravidel), takže 1:1 zrcadlí kontroly write endpointů včetně zámků (`isLocked()`, `isEditationAllowed()`).

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
| `/user/changePassword`, `/user/changeEmail`, `/user/settings` | – | žádná role (přihlášený) |
| `/user/usersAdministration` | – | `isSysAdmin` |
| `/user/taxaAdministration/:taxonId?` | – | `isTaxonAdmin` |
| `/user/addUser` | – | `isSysAdmin` |

Hlavní menu (`MainMenu.tsx`) nabízí odkazy konzistentně s routami: správa uživatelů i přidání uživatele jen `isSysAdmin`, správa taxonů jen `isTaxonAdmin`; zbytek atlasového a biblio menu vidí všichni uživatelé s daným modulem. Výjimky: v atlas menu se CSV import (`/atlas/importCSV`) zobrazí jen pro `isAsyncImporter || isMapAdmin` – samotná routa ale žádnou roli nevyžaduje (jen modul atlas), autorizaci dělá až backend (`canContributeInto`); v measurements menu je záloha (`/measurements/backup`) jen pro `isTraitAdmin` (shodné s routou).

---

## Záznamy – detail záznamu

Stránka `Record.tsx` načte záznam přes `GET /atlas/record/:recordId/full` (včetně `canEditCommonFields`, `canEditValidationFields`, `canResolveComments`, `locked` a `lastEditTimestamp`) a její karty se řídí hookem `useRecordPermissions`. Flagy počítá backend ve službě `RecordEditPermissions` (jediný zdroj pravidel) a 1:1 zrcadlí kontroly endpointů – frontend si práva k záznamům neodvozuje lokálně.

### Editovatelná pole (RecordInlineField, SingleSelectEdit, MultiSelectEdit)

- **Kdo smí editovat (podle flagu `canEditCommonFields`):** bulk editor, autor/committer dávky u nezpracovaných záznamů, mapAdmin, revizor taxonu (vč. nadřazených taxonů) a správce projektu záznamu. Flag zrcadlí kontrolu endpointu 1:1 (zdroj: `RecordEditPermissions`), navíc zohledňuje zámky – u zamčeného záznamu ani taxonu editace nepůjde.
- **Endpoint:** `PATCH /api/react/atlas/record/:recordId` s `key`, `value` a `lastEditTimestampNum`.
- **Související akce:** po úspěchu se aktualizuje lokální timestamp (kvůli dalším editacím téhož záznamu) a propaguje se rodičovi; kaskádové změny na serveru (např. reset `included_in_map`) se v UI zobrazí po refetchi.
- Používáno v `RecordRemarks` (zdroj, poznámky, prostředí, detrev), `RecordFloristic` (taxon, autoři, herbaria, substráty…) i jinde.

### Přesun souřadnic (moveCoordinates)

- Kliknutí do mapy (`RecordMap`) je aktivní jen při `canEditCommonFields`; navržená pozice se potvrdí tlačítkem, které pošle `POST /api/react/atlas/record/moveCoordinates` s novými souřadnicemi, GPS přesností a timestampem.
- Backend kontroly viz [rules_backend.md](./rules_backend.md) (Záznamy).

---

## Rychlé editace v přehledech mapy (mapDetail)

Komponenty v `PladiasRecordsTable` (používané v mapDetail, mapMain i search):

| Komponenta | Pole | Endpoint | Viditelnost |
|---|---|---|---|
| `ValidationStatusCheckboxes` | `VALIDATION_STATUS` | `PATCH /atlas/record/:recordId` | jen `record.canEditValidationFields`; status `UNPROCESSED` je v nabídce jen pro `isMapAdmin` |
| `OriginalityStatusIcons` | `ORIGINALITY_STATUS` | dto. | jen `canEditValidationFields` a jen u statusu `Accepted` |
| `IncludeInMapCheckbox` | `INCLUDED_IN_MAP` | dto. | jen `canEditValidationFields` a jen u statusů `Uncertain`/`Accepted` |
| `HerbariumQualityCheckbox` | `HERBARIUM_QUALITY` | dto. | jen `canEditValidationFields`, jen projekt „excerpce herbářů“ (ID 14), statusy `Uncertain`/`Declined`/`Accepted` |

Vše probíhá přes hook `useRecordQuickUpdates` – optimistická změna, PATCH s timestampem, po úspěchu převzetí nového timestampu a (u validace/originality) refetch `GET /atlas/record/:recordId/mapFields`, aby UI zachytilo kaskádové změny (např. vynulování `included_in_map`). Toto chování kopíruje kaskády definované na backendu. Odpověď `mapFields` nese `canEditCommonFields`/`canEditValidationFields` počítané stejnou službou `RecordEditPermissions` jako detail záznamu, takže se práva po refetchi nemění.

---

## Vyhledávání a hromadná editace (BulkEdit)

### Vyhledávání (`SearchForm.tsx`)

- **Kdo smí:** každý přihlášený uživatel s atlas modulem; výsledky obsahují `canEditCommonFields`/`canEditValidationFields` per záznam, podle kterých se (i zde) řídí viditelnost rychlých editací.
- **Excel export:** tlačítko vidí všichni; titulek se liší podle `isMapAdmin` (plná data vs. omezená). Samotné omezení dělá backend (mapAdmin dostává větší export, ostatní potřebují přiřazený příspěvkový projekt).

### BulkEdit

- **Kdo smí:** panel se zobrazí jen pro `user.isMapAdmin || user.isBulkEditor` (shodné s backendovým `POST /atlas/search/records-edit-timestamps`). BulkEditor má na backendu právo upravit **všechna editovatelná pole záznamu** (běžná i validační), narozdíl od mapAdmina ale nesdílí žádné jeho další kompetence (přiřazování projektů uživatelům, taxonMapSettings, řešení komentářů…).
- **Průběh:** nejdřív `POST /atlas/search/records-edit-timestamps` (načtení verzí vyfiltrovaných záznamů, max. 1000 záznamů), poté se změny aplikují **po jednom záznamu** přes `PATCH /atlas/record/:recordId` (přesnost souřadnic, datum, fytochorion, lokalita, nejbližší město, zdroj, poznámka, nálezce, taxon, validační status) nebo hromadný přesun přes `POST /atlas/record/moveCoordinates`.
- **Související akce:** průběh + souhrn úspěchů/chyb per záznam; po dokončení refresh výsledků vyhledávání.

---

## Komentáře k záznamům

Komponenty `RecordComments` (detail záznamu) a `AddCommentModal` (mapDetail, search).

| Akce | Endpoint | Kdo ji ve frontendu vidí | Backend |
|---|---|---|---|
| Vytvoření | `POST /atlas/record/comment` | každý přihlášený (modal jen testuje existenci `user`) | každý přihlášený ke každému záznamu |
| Vyřešení | `POST /atlas/record/comment/:id/resolve` | server flag `record.canResolveComments` (mapAdmin, revizor vč. nadřazených taxonů, správce projektu) | `isUserElligibleToEditEverything` (mapAdmin, revizor vč. nadřazených taxonů, správce projektu) – **shodné** |
| Smazání | `DELETE /atlas/record/comment/:id` | autor komentáře (`comment.authorId == user.id`) **nebo** mapAdmin | autor NEBO mapAdmin – **shodné** |
| Označit jako přečtené | `DELETE /atlas/record/comment-assoc/:commentId/linked-user/:boundUserId` | uživatel sám (odhlásí se z notifikací) | master admin nebo daný uživatel |
| Editace textu | `PUT /atlas/record/comment/:id` | server flag `record.canResolveComments` (mapAdmin, revizor vč. nadřazených taxonů, správce projektu; **autor NIKOLIV**) | `isUserElligibleToEditEverything` – **shodné s resolve** |

**Poznámky:**
- Tlačítko „vyřešit“ se řídí serverovým příznakem `record.canResolveComments` z `GET /atlas/record/:id/full` (backend ho počítá službou `RecordEditPermissions`, která zrcadlí `Record.isUserElligibleToEditEverything`, tedy stejnou kontrolu jako endpoint resolve) – frontend logiku nekopíruje, jen flag zobrazuje. Stejný příznak používá i tlačítko „upravit“ (editace textu komentáře), protože backend u `PUT /atlas/record/comment/:id` kontroluje tutéž podmínku.
- Stránka `NewComments` umožňuje komentáře pouze číst a označovat jako přečtené.

---

## Importy záznamů

### Import / ImportCSV (`/atlas/import`, `/atlas/importCSV`)

- **Kdo smí:** frontend **nekontroluje žádnou roli** – stránka je dostupná každému přihlášenému uživateli s atlas modulem; u importu CSV navíc jeho položku menu vidí jen `isAsyncImporter || isMapAdmin` (viz MainMenu), zatímco Excel import je v menu pro všechny.
- Operace „validace“ jde na `POST /api/react/import/validate` (kdokoli přihlášený), operace „import“ na `POST /api/react/import/upload`, resp. `POST /api/react/import/csv`.
- Právo importovat do zvoleného projektu (`canContributeInto`) kontroluje až backend – neautorizovaný import selže na serveru, frontend zobrazí chybu.

### ListOfControls (`/atlas/listOfControls`) – výsledky validací

- Tabulka **vlastních** validovaných (neimportovaných) dávek aktuálního uživatele – backend dotaz filtruje na `batch.author.id == currentUser` a `imported == false`; u každého řádku tlačítko smazat → `DELETE /api/react/importResult/validated/:id`.
- Backend dávku smaže jen pokud je volající autorem a dávka není importovaná; v opačném případě vrací **400 s lokalizovanou chybou** (`JsonResult.error("ImportResultsController.deleteFailed")`). Frontend na neúspěch zobrazí error flash (axios vyhodí výjimku na 4xx/5xx) a po akci se tabulka znovu načte – změna stavu flash/deletingId vytvoří novou identitu `fetchControls`, na jejíž změnu `DataTable` refetchne.

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

⚠️ Pozor na dvojici vizuálně stejných komponent: `TaxonInlineField` (editace taxonu, gate via route `isTaxonAdmin`) vs. `RecordInlineField` (editace záznamu, gate `record.canEditCommonFields`) – obě posílají PATCH se stejným vzorem (klíč, hodnota, timestamp), ale jejich oprávnění se kontrolují zcela jinde. Kolize nemohou, ale změna jednoho z nich snadno rozbije druhý.

---

## AtlasAdmin – seznamy importů, uživatelů a taxonů

Celý prefix `/atlasAdmin/*` je chráněn rolí `isMapAdmin` (a modulem atlas).

### ListOfImports (atlasAdmin) – správa importních dávek

- Tlačítko smazat u dávky nevolá DELETE, ale **mutující GET** `GET /api/react/atlasadmin/prepareBatchDelete/:batchId` – připraví smazání a pošle deleční kód e-mailem committerovi dávky.
- Vlastní smazání (`deleteBatch/:batchId/password/:password`) se děje **mimo SPA** (odkaz v e-mailu), takže deleční kód frontend nikdy nezadává.
- Backend u `prepareBatchDelete` kontroluje, že volající je committer dávky nebo mapAdmin (viz [rules_backend.md](./rules_backend.md), sekce Importy). Stránka je ve frontendu stejně za rolí mapAdmin, takže committer bez ní z UI na akci nedosáhne.

### ListOfUsers / MapUsers – správa práv uživatelů k mapám

- **Seznam uživatelů:** `GET /api/react/atlasadmin/users` (backend: mapAdmin) – paginovaný, s filtry Name/Surname/Email; vrací jen `id`, `name`, `surname`, `email` (bez rolí) a vynechává smazané uživatele.
- **Přidání projektu:** `POST /api/react/atlasadmin/users/:userId/projects` s body `projectId` (backend: mapAdmin; duplicitní přiřazení vrací chybu).
- **Odebrání projektu:** `DELETE /api/react/atlasadmin/users/:userId/projects/:projectId` (backend: mapAdmin).
- **Přidání revizora taxonu:** přes `useMapUsersTaxa` → `POST /api/react/atlasadmin/assignUserTaxon` (backend: mapAdmin).
- **Odebrání revizora:** `DELETE /api/react/atlasadmin/removeUserTaxon/user/:userId/taxon/:taxonId` (backend: mapAdmin).
- Všechny operace stránky jsou na backendu pod mapAdminem.
- Po každé úspěšné mutaci (přidání/odebrání projektu i taxonu) se zvýší `refreshKey` `DataTable` (callbacky `onProjectChange`/`onTaxonChange` hooků), takže tabulka znovu načte aktuální stránku a nový stav je viditelný ihned bez refreshi prohlížeče.

### ListOfTaxa – nastavení map taxonů (TaxonMapSettings)

Editační tabulka nastavení taxonů (`useTaxonUpdates`): `ISMAPPED`, `SETCOMMONTHRESHOLD`, `PUBLICATIONSTATUS`, `REVISIONSTATUS`, `MAPTYPE`, `REVISORSCOMMENT`, `REVISORSPRINTMAPCOMMENT`, `MAPADMINCOMMENT`, `PRESLIA`, `PROTECTED`, `PARENT_MAP` – vše přes jediný `POST /api/react/atlasadmin/taxonMapSettings` s `taxonId`, `key`, `value` a `timestamp` (optimistická konkurence, po úspěchu se vrací nový timestamp).

- **Kdo smí ve frontendu:** jen mapAdmin (route + menu).
- **Kdo smí na backendu:** mapAdmin všechny klíče; revizor taxonu (vč. nadřazených) jen `MAPTYPE`, `REVISIONSTATUS`, `REVISORSCOMMENT`, `REVISORSPRINTMAPCOMMENT`; ostatní uživatelé nic (centrální kontrola `verifyCurrentUserCanEditKey`).
- Stejný endpoint používá i mapMain InfoPanel pro revizorské klíče – gate ve FE je `currentUserIsRevisor` (z `GET /atlas/taxonMapSettings/:taxonId`), které pokrývá i MAPTYPE radia.
- Změny `PUBLICATIONSTATUS`/`REVISIONSTATUS` na backendu spouštějí přechody stavů a e-mailové notifikace – frontend po nich jen refetchuje data.
- Řádky tabulky (`TaxonMapSettings` z `GET /api/react/atlasadmin/taxa`) nesou `id` = PK `atlas.taxon_mapsettings` (u 1:1 relace s taxonem totožné s `taxonId`); DataTable ho používá k párování řádků v optimistické vrstvě checkboxů. Nové tabulky nad sdíleným DataTable musí identitu (`id`) v DTO/fetch vrstvě také dodávat – bez `id` se optimistický flip páruje jen referenčně.
- Checkbox `isProtected` (a `preslia`) po mutaci refetchují tabulku (`refreshKey`) – jednak kvůli čerstvému `lastEditTimestamp` (optimistická konkurence), jednak aby selhání vrátilo checkbox na pravdu serveru; checkbox řádku je při běžícím POSTu disabled (`isDisabled` přes `updatingTaxonId`).

---

## Měření a vlastnosti (Measurements / Traits)

Celý modul `/measurements/*` je chráněn **modulem instance**; u write operací navíc frontend kontroluje role (odpovídá backendovým kontrolám – server `MeasurementFeatureDto.canAdminister` = `user.supervises(feature)` = traitAdmin nebo admin vlastnosti):

| Stránka | Write operace | Endpoint | Backend vyžaduje | FE kontrola |
|---|---|---|---|---|
| `FeatureDetail` (upload) | upload/validace datové řady | `POST /api/react/measurement/trait` | traitAdmin nebo admin vlastnosti (Feature) | upload formulář (`TraitUpload`) jen při `feature.canAdminister`; jinak info hláška |
| `TraitTable` (na FeatureDetail) | smazání datové řady | `DELETE /api/react/measurement/trait/:traitId` | traitAdmin/admin feature | tlačítko mazání jen při `feature.canAdminister` |
| `TraitTable` | nastavení výchozí datové řady | `PUT /api/react/measurement/trait/:traitId/default` | traitAdmin/admin feature | radio jen při `feature.canAdminister` |
| `Backup` | vytvoření zálohy | `POST /api/react/measurement/backup` | traitAdmin | route `requiredRole="traitAdmin"` + položka menu jen pro `isTraitAdmin` |
| `Export` | komplexní export | `POST /api/react/measurement/complexExport` | per-trait práva ke stažení (`isElligibleForTraitDownload`) | – (per-trait práva na serveru) |
| `Settings` (uživatelské) | substituce traitů | `PUT /api/react/user/settings/:key` | přihlášený; sekce substitucí je ve FE zobrazena jen `isTraitAdmin` | `isTraitAdmin` |

**Související akce:** po importu datové řady se tabulka řad reloadne; po smazání se znovu načte (mazání může změnit výchozí řadu); upload formulář nabízí výběr vlastníka (defaultně aktuální uživatel) ze seznamu `GET /api/react/users-minimal` – záměrně bez validace, vlastník je jen metadata (viz [gotchas.md](./gotchas.md)).

**Read autorizace:** odkazy „stáhnout data“ / „detailní export“ u datových řad se řídí příznaky `canDownload`/`canExport` od serveru; datové řady s omezenou viditelností tak uživatel bez práv vidí, ale nemůže stahovat. (Historicky chybějící FE kontrola rolí byla opravena příznakem `canAdminister` a gatem na `isTraitAdmin`.)

---

## Uživatelé a vlastní účet

### UsersAdministration (`/user/usersAdministration`) – role `isSysAdmin`

- `UsersTable` – tabulka všech uživatelů včetně e-mailů a rolí; přepínání checkboxů (`mapAdmin`, `traitAdmin`, `sysAdmin`, `biblioAdmin`, `taxonAdmin`, `deleted`) posílá `PUT /api/react/users/:id`.
- Shodné s backendem (sysAdmin). Poznámka: role `biblioAdmin` je součástí FE typu `UserRole` (a getru `isBiblioAdmin`), ale kromě této tabulky se nikde jinde nepoužívá.

### AddUser (`/user/addUser`) – role `isSysAdmin`

- Vytvoření uživatele: `POST /api/react/users`; shodné s backendem (sysAdmin).
- Přidělování projektů zde není – projekty přiděluje výhradně mapAdmin v MapUsers (`/api/react/atlasadmin/users/:userId/projects`).

### Vlastní účet (`/user/changePassword`, `/user/changeEmail`, `/user/settings`)

- `POST /api/react/user/changePassword` (vyžaduje staré heslo), `POST /api/react/user/createToken` (API token), `POST /api/react/user/changeEmail` (vyžaduje heslo; mění se okamžitě, ale s kontrolou unikátnosti 409 a notifikací na starou adresu), `PUT/DELETE /api/react/user/settings/...`.
- Vše self-service, shodné s backendem; nastavení substitucí traitů se zobrazí jen `isTraitAdmin`, jazyk aplikace se ukládá přes klíč `application_language`.

---

## Read autorizace – kdo co vidí a stahuje

| Data | Kde se ve frontendu získávají | Odpovídající gate |
|---|---|---|
| Seznam uživatelů s e-maily a rolemi (`GET /api/react/users`) | UsersAdministration | route `isSysAdmin` |
| Seznam uživatelů bez rolí (`GET /api/react/atlasadmin/users`) | MapUsers | route `isMapAdmin` |
| Seznam uživatelů – jména (`GET /api/react/users-minimal`) | formulář uploadu traitů, hledání (nálezce/autoři) | **žádný** – každý přihlášený |
| Data traitů (`/measurement/trait/download/...`) | odkazy v TraitTable | server flag `canDownload` |
| Detailní export traitů | odkaz v TraitTable | server flag `canExport` |
| Výsledky vyhledávání záznamů | SearchForm | každý přihlášený; obsah (citlivá pole, `canEditCommonFields`/`canEditValidationFields`) určuje backend per záznam |
| Historie a komentáře záznamu | Record.tsx | každý přihlášený |
| Přehledy map (mapMain, mapDetail, PNG) | atlas | každý přihlášený s atlas modulem |
| Downloads (`/downloads`) | DownloadsIndex | bez role (přihlášený) |
| Autocomplete taxonů (`taxa-importable`) | MainMenu, hledání, import | každý přihlášený s atlas modulem |

Poznámka: „public“ routy (`/downloads`, `/user/docs`, Home) jsou veřejné jen v rámci SPA – protože samotná SPA je za přihlášením, fakticky je vidí každý přihlášený uživatel.

---

## Poznámky

### Optimistické UI
Rychlé editace záznamů (validace, originalita, herbarium, include-in-map) a nastavení map taxonů dělají optimistickou změnu stavu a při chybě ji vrací; po úspěchu si přebírají nový timestamp z odpovědi serveru. Detail záznamu si timestamp propaguje mezi kartami, aby souběžné editace různých polí jednoho záznamu na sobě nevyhazovaly konflikt 409.

### Kam se autorizace ve frontendu nezapisuje
Role i editační práva záznamů frontend přebírá z dat backendu (`roles: string[]` z `/api/react/config`; `canEditCommonFields`/`canEditValidationFields`/`canResolveComments` per záznam, zdroj `RecordEditPermissions` na BE). Vlastní logika zbývá jen v podmíněném renderování komponent (`user.isMapAdmin`, `hasRole(...)`) a v ochraně rout (`ProtectedRoute requiredRole/requiredRoles`). Při přidávání nové write operace je proto nutné: (1) gate na backend endpointu, (2) exponovat odpovídající flag/roli v datech, (3) konzumovat ho ve FE – nikdy právo neodvozovat lokálně.
