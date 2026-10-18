# Záměrné zvláštnosti

Known pitfalls, non-obvious behaviours, and lessons learned. Read this before making changes.

---

## sekce atlas

### Komentáře u atlas.record
Uživatel nemůže svůj komentář editovat aby nedocházelo k nejasnostem s ohledem na to že není verzován. Pouze osobám s vyšším oprváněním je tato možnost o pravena aby mohli např. smazat nevhodné výrazy.

### mutující GET při mazání dávky

Zbytkové (akceptované) omezení: `GET /atlasadmin/deleteBatch/:batchId/password/:password` zůstává mutující GET s kódem v URL – odkaz z e-mailu totiž nelze spustit jinou metodou než GET; riziko je mírněno vazbou kódu na committera a konkrétní dávku.

### mazání dávky

 Mazání dávky (`completeDeletion`) maže i komentáře a historii záznamů od ostatních uživatelů (by design, ale bez dodatečných kontrol oprávnění nad komentáři).

### Editace komentářů bez explicitní concurrency kontroly

Komentářové endpointy (PUT/DELETE/resolve) nekontrolují žádný `lastEditTimestamp` od klienta – klient verzi komentáře vůbec neposílá. Jedinou ochranu proti souběžné editaci je `@Version` na `RecordComment` (editace zastaralé verze selže DB výjimkou, kterou controller vrátí jako obecnou chybu). U `DELETE /atlas/record/comment-assoc/:commentId/linked-user/:boundUserId` se asociace maže raw SQL zcela bez jakékoliv kontroly verze.

## sekce measurements

### výběr vlastníka při uploadu traitů

Upload formulář datové řady (`TraitUpload` na `FeatureDetail`) nabízí výběr vlastníka z kompletního seznamu uživatelů (`GET /api/react/users-minimal`, default = aktuální uživatel) každému, kdo smí importovat (traitAdmin / admin vlastnosti). Backend (`TraitUploadService.upload`) volbu nijak nevaliduje – zvolené `owner` se uloží beze změny. Záměr: admin často nahrává data „za někoho“ (delegace atribuce), proto volba cizího vlastníka není chyba, ale feature. Vlastník je přitom čistě prezentční metadata (zobrazuje se jen jeho jméno v tabulkách); oprávnění se počítají výhradně z rolí (`supervises(feature)`, `isTraitAdmin()`), takže volbou vlastníka nikdo nezíská žádná práva.

