# Gotchas

Known pitfalls, non-obvious behaviours, and lessons learned. Read this before making changes.

---

## Architecture & Migration

### API Response Format
All JSON responses use legacy `JsonResult` wrapper, when working on code, refactor it to standard http code responses.
```java
// ✅ Correct
return ok(JsonResult.buildSuccess(data));

// ❌ Wrong - will break frontend parsing
return ok(data);
```

Known exceptions:
- `TraitsController.delete` and `TraitsController.importResult` return a bare JSON **string**
  (`ok(Json.toJson(message))`) with HTTP 200 on success instead of `JsonResult`; errors use
  `notFound(JsonResult.error(...))`. Frontend code therefore checks `res.ok` and reads either
  a string or `json.message`.
- `ConfigController.infoGlobal` returns a bare JSON **array** of maintenance messages
  (`ok(Json.toJson(messages))`) – no `JsonResult` wrapper. The frontend tolerates it in
  `services/instanceApi.ts` (`parseInstanceMessages` drops invalid entries).
- `DownloadsController.getAll` (`GET /api/react/downloads`) returns a bare JSON **array** of
  download items (`ok(Json.toJson(dtos))`), each with a `dynamic` flag; `services/downloadApi.ts`
  validates `Array.isArray`. Its dynamic XLSX exports (`/downloads/taxa|herbaria|finders`) answer
  `application/x-download` + `Content-disposition` on success and HTTP 500 with
  `{"error": ...}` JSON on failure; the controller is guarded by `AuthorizedApi`, which answers
  HTTP 401 JSON instead of a login redirect (a `fetch` download would store the login page HTML
  as a file – `DownloadsTable` renders dynamic rows as buttons and reports failures via
  `notifyApiError`).
- The project name (`/api/react/playmessage/project_name`) carries a rich-text value –
  `loadProjectName` strips HTML tags via a DOM element (trusted backend input, no sanitizer
  dependency).
- Import/validation error messages (`TraitsController.ImportFailed` / `ValidationFailed`)
  contain an HTML `<a>` link to the workbook with highlighted error rows. `FeatureDetail`
  therefore pushes them as rich-text notifications (`html`) – rendered by `RichTextMessage`,
  the only component allowed to use `dangerouslySetInnerHTML`.


### File Downloads vs JSON Errors
- if possible, refactor to more standard behaviour
- `TraitExportController.complexExportResult` answers with a **file stream**
  (`application/x-download` + `Content-disposition`) on success and with `JsonResult.error(...)`
  on failure, so `Export.tsx` has to branch on `res.ok` **and** on `content-type` before reading
  the body (`TraitBaseController.toResult()` still answers `ok("Error during trait export")` as
  plain text when building the file fails).
- Invalid taxon names are returned in the extra `invalidTaxa` field of the error JSON, one name per
  line, and `Export.tsx` renders them in a `<pre>` block so they can be selected, fixed and resubmitted.
- Taxon lists are submitted as urlencoded form data (`fetch` + `URLSearchParams` sends **LF**, while a
  native form submit sends CRLF). The backend therefore splits them on `\R` and trims each line -
  `split("\r\n")` would treat a pasted list as a single taxon name.
- `MapAdminImportController.getImports` answers JSON **or** XLSX from the same route, decided by the
  request `Accept` header, and paginates only when both `page` and `pageSize` are present (that is how
  the XLSX export gets all filtered rows). `useExcelExport` reads the response as a blob, so it has to
  check `content-type` before storing the file - failures still arrive as JSON (`message`/`error`).

### DataTable – optimistická vrstva checkboxů páruje řádky podle `id`

Checkboxové sloupce sdíleného `DataTable` přepínají hodnotu optimisticky (lokální vrstva v `useTableData`)
a řádek v ní párují referenčně, případně podle `row.id` (stejný fallback používá i rollback po selhání
`onToggle`). Řádky **bez** `id` smí matchnout jen reference – dřívější fallback bez podmínky pároval
`undefined === undefined`, takže jeden klik přepnul checkboxy **všech** řádků tabulky (regrese na
`/atlasAdmin/listOfTaxa`; `UsersTable` to neměla, protože `UserTableRow` `id` nese). Proto:
- každý endpoint alimentující DataTable se sloupcem typu `checkbox` musí v DTO vracet `id` (PK záznamu) –
  u `TaxonMapSettings` je to PK `atlas.taxon_mapsettings`, u 1:1 relace s taxonem totožný s `taxonId`;
- optimistická vrstva žije jen do nejbližší odpovědi serveru; `refresh()` ji zahodí i tehdy, když refetch
  vrátí nezměněná data (React Query structural sharing by jinak zachoval původní referenci `queryData`
  a efekt na její změnu by se neprovedl);
- po checkboxové mutaci tabulku refetchujeme (`refreshKey`) – selhání tak vrátí checkbox na pravdu
  serveru a obnoví se `lastEditTimestamp` pro optimistickou konkurenci.
- rodič se na optimistickou vrstvu napojuje přes `DataTable.onDataUpdater` (po mountu dostane stabilní
  `useTableData.setData`, při unmountu null): atlasAdmin `TaxaList` s ní mění status selecty i další
  vlastní cellRenderery okamžitě bez refetche. Bez tohoto napojení se změna na server uložila, ale
  controlled select se po re-renderu vrátil na původní hodnotu – upravený řádek byl vidět až po refetchi.
  - past uvnitř: updater je funkce a React `setState` považuje funkční argument za *funkční updater* –
    `onDataUpdater={setLocalDataUpdater}` by tedy zavolal `setData(null)` a do state uložil jeho
    návratovou hodnotu (`undefined`), nikoli funkci samotnou. Registrace se tiše ztratila (mutace na
    serveru proběhla, toast fungoval, ale UI se neaktualizovalo až do refresh). Proto `TaxaList`
    drží updater v `useRef` (regresní test `TaxaList.test.tsx`); alternativou je lazy tvar
    `setState(() => updater)`.
- chyby mutací (checkboxy i vlastní cellRenderery rodiče) reportuje notifikační store (`notifyApiError`,
  toast): hlášku backendu nese `ApiError.payload` (obálka `success:false` z `ensureSuccess`), lokální
  Bootstrap alerty v komponentách tabulek už se nepoužívají.

### CSRF token – vazba FE ↔ BE (docs/security.md M1)

Play CSRF filtr kontroluje všechny ne-GET/HEAD/OPTIONS requesty (`protectHeaders =
null` v `conf/common.conf`). Token nežije v session cookie (ta je HttpOnly), ale ve
samostatné cookie `PLAY_CSRF_TOKEN` (`play.filters.csrf.cookie.name`, httpOnly =
false), aby ji SPA přečetlo – `apiClient.performRequest` posílá její hodnotu zpět
hlavičkou `Csrf-Token`. Pasti:
- **kontrakt jména cookie** – `CSRF_COOKIE_NAME` v `frontend/src/services/apiClient.ts`
  musí zůstat synchronní s `play.filters.csrf.cookie.name`; přejmenování jedné strany
  rozbije všechny mutace (HTTP 403),
- filtr token generuje až na HTML GET requestech (`GET /`, `GET /login`) – kdo si smaže
  jen CSRF cookie, dostává u mutací 403 do příštího reloadu stránky,
- login formulář nese token server-side přes `@helper.CSRF.formField`; logout je
  full-page POST se skrytým polem `csrfToken` (MainMenu) – čistý odkaz ani
  `sendBeacon` (httpLogTransport) by token nést nemohly.

---

## Permissions

### Record edit permissions are backend-owned
- The backend computes
  `canEditCommonFields` / `canEditValidationFields` (and `canResolveComments` in the full DTO)
  in a single place - `app/service/records/RecordEditPermissions.java` - and the frontend only
  mirrors these flags (`useRecordPermissions`). Never re-derive editing rights in FE code.
- `RecordEditPermissions.forUser(user)` costs 2 queries (supervised taxa + managed projects) -
  create it once per request and pass it into `RecordPladiasDto.fromRecord` /
  `RecordPladiasFullDto.fromRecord` (the DTO signatures enforce this by taking `null = no edit`).
- User roles arrive as `roles: string[]` from `GET /api/react/config` (backend enum
  `models.UserRole`); the FE `User` model exposes `hasRole()` with `isMapAdmin`-style getters
  as aliases.

---

## Resilience

### Instance heartbeat (`useInstanceMessages`)
- The heartbeat polls `GET /api/react/infoGlobal` (maintenance messages) and is the **only** owner
  of that polling – `FlashMessages.tsx` renders nothing and only mirrors its props into the toast
  store (section F): the full set on first load, a diff on content change (new messages open,
  removed messages close their toast).
- **Hidden tab → no polling.** `visibilitychange` pauses the schedule; returning to the tab fires
  one tick immediately and `FlashMessages` resyncs its toasts (closes the current ones, re-shows
  the active messages – auto-dismissed toasts would otherwise be missed while the tab was away).
  A user-visible behavioral requirement (section A), verified by unit tests on fake timers.
- **Failures do not wipe messages.** A network hiccup keeps the last known messages in the UI;
  only after 3 consecutive failures a warning „instance status messages are unavailable“ appears.
- **Exponential backoff:** after failures the interval grows 30 s → 1 min → 2 min → 5 min (cap);
  a success resets it to 30 s. The endpoint is cheap (`MaintenanceMessageUtils.getMessage()`).
- **401 → redirect to `/login`** is handled by `apiClient`, not by the hook.

### Roles are backend-owned (FE mirror in `models/UserRole.ts`)
- The FE `USER_ROLES` const mirrors the backend enum `app/models/UserRole.java` 1:1
  (`mapAdmin`, `bulkEditor`, `traitAdmin`, `sysAdmin`, `taxonAdmin`, `asyncImporter`, `biblioAdmin`).
  When adding a role on the backend, add the same key to `USER_ROLES` – `parseRoles` then logs a
  `console.warn` about BE↔FE drift on unknown keys (visible at SPA startup).
- `ProtectedRoute` props are typed (`requiredRole?: UserRole`, `requiredRoles?: readonly UserRole[]`,
  `requiredModule?: InstanceModule`) – a typo in `App.tsx` route definitions fails `tsc -b`.
  Module availability is declared in `InstanceConfig.hasModule()`, not hardcoded in the component.
- `biblioAdmin` stays in the FE union on purpose: it is consumed by `UsersTable`
  (user administration checkbox) and dropping it would false-positive the drift warning.

### Notifications are store-owned, not component-owned (section F)
- One-off feedback lives in `stores/notificationStore.ts` (zustand) and is rendered by `<Toasts />`
  in `Layout.tsx` – it survives navigation and page crashes (it sits outside `ErrorBoundary`).
- **Deduplication contract:** `apiClient` centrally notifies 403 and network failures and marks
  the thrown `ApiError` with `notified = true`. A component `catch` must use
  `notifyApiError(err, fallback)` instead of pushing manually, otherwise the same failure
  produces two toasts. Raw-`fetch` code (pre-migration) never sees `ApiError`, so it pushes directly.
- Background requests (heartbeat via `loadInstanceMessages`, project name) pass `silent: true`
  to apiClient – their failures have their own graceful handling (unavailable banner, empty brand)
  and must not spam toasts.
- `danger` notifications are sticky on purpose (no auto-dismiss); a toast that closes itself
  before the user reads it is worse than none.


## sekce atlas

### Komentáře u atlas.record
Uživatel nemůže svůj komentář editovat aby nedocházelo k nejasnostem s ohledem na to že není verzován. Pouze osobám s vyšším oprváněním je tato možnost o pravena aby mohli např. smazat nevhodné výrazy.

### mutující GET při mazání dávky

Zbytkové (akceptované) omezení: `GET /atlasadmin/deleteBatch/:batchId/password/:password` zůstává mutující GET s kódem v URL – odkaz z e-mailu totiž nelze spustit jinou metodou než GET; riziko je mírněno vazbou kódu na committera a konkrétní dávku.

### mazání dávky

Mazání dávky (`completeDeletion`) maže i komentáře a historii záznamů od ostatních uživatelů (by design, ale bez dodatečných kontrol oprávnění nad komentáři).

### Editace komentářů bez explicitní concurrency kontroly

Komentářové endpointy (PUT/DELETE/resolve) nekontrolují žádný `lastEditTimestamp` od klienta – klient verzi komentáře vůbec neposílá. Jedinou ochranu proti souběžné editaci je `@Version` na `RecordComment` (editace zastaralé verze selže DB výjimkou, kterou controller vrátí jako obecnou chybu). U `DELETE /atlas/record/comment-assoc/:commentId/linked-user/:boundUserId` se asociace maže raw SQL zcela bez jakékoliv kontroly verze.

### NULL statusy map (`revision_status` / `publication_status`) ≡ StatusNotStarted (0)

Sloupce `atlas.taxon_mapsettings.revision_status` / `publication_status` jsou nullable, u starších/importovaných řádků bývají NULL. Celá aplikace NULL chápe jako „nezapočato" (`StatusNotStarted`, id 0): DTO v `getTaxa`/`getTaxaForUser` mapuje NULL na 0, FE `StatusSelect` na 0 defaultuje, `TaxonUpdaterService` novým taxonům status id 0 nastavuje explicitně. `RevisionUpdateService`/`PublicationUpdateService` proto při update starého statusu NULL normalizují na entitu StatusNotStarted (fallback `find().byId(0)`; přechody se validují jako ze stavu 0) a `RevisorService` při přiřazení revisora bere NULL stejně jako stav 0 (auto-přechod na Assigned). Bez toho padaly změny statusů selectem u NULL řádků na NPE.

## sekce measurements

### výběr vlastníka při uploadu traitů

Upload formulář datové řady (`TraitUpload` na `FeatureDetail`) nabízí výběr vlastníka z kompletního seznamu uživatelů (`GET /api/react/users-minimal`, default = aktuální uživatel) každému, kdo smí importovat (traitAdmin / admin vlastnosti). Backend (`TraitUploadService.upload`) volbu nijak nevaliduje – zvolené `owner` se uloží beze změny. Záměr: admin často nahrává data „za někoho“ (delegace atribuce), proto volba cizího vlastníka není chyba, ale feature. Vlastník je přitom čistě prezentční metadata (zobrazuje se jen jeho jméno v tabulkách); oprávnění se počítají výhradně z rolí (`supervises(feature)`, `isTraitAdmin()`), takže volbou vlastníka nikdo nezíská žádná práva.



---

## See Also
- [Architecture](./architecture.md) - Core architecture concepts
- [Conventions](./conventions.md) - Coding standards and patterns
