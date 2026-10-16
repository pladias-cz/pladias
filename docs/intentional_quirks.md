# Záměrné zvláštnosti

Known pitfalls, non-obvious behaviours, and lessons learned. Read this before making changes.

---

## Komentáře u atlas.record
Uživatel nemůže svůj komentář editovat aby nedocházelo k nejasnostem s ohledem na to že není verzován. Pouze osobám s vyšším oprváněním je tato možnost o pravena aby mohli např. smazat nevhodné výrazy.

## mutující GET při mazání dávky

Zbytkové (akceptované) omezení: `GET /atlasadmin/deleteBatch/:batchId/password/:password` zůstává mutující GET s kódem v URL – odkaz z e-mailu totiž nelze spustit jinou metodou než GET; riziko je mírněno vazbou kódu na committera a konkrétní dávku.

## mazání dávky

 Mazání dávky (`completeDeletion`) maže i komentáře a historii záznamů od ostatních uživatelů (by design, ale bez dodatečných kontrol oprávnění nad komentáři).
