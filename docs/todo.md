# TODOs - NOT for agents!

This document serve to humans, do not use for agents.
---

## now:

**V:**
- mapový náhled výsledků vyhledávání, bulkEdit (byl refactorován tak prosím checkni)

**P:**
- dotáhnout refactoring frontendu

---

/measurements/export - první podkomponenta se seznamem skupin, features a traitů by potřebovala refactoring.  Je to hierarchická struktura s omezenou hloubkou a bylo by potřeba aby uživatel mohl snadno vybrat i zrušit jendotlivé položky (celou skupinu, celou feature nebo dílčí trait). K tomu je nutné poskytnout vizuální podporu (nadřazená položka s alespon jednou vybranou podpoložkou je zvýrazněná, její vybrání vybere vše podřízené, zrušení zruší i pořízené, zrušení poslední pořízené zruší nadřízenou...) - prostě klasický treeview, je přípustné k tomu použít i nějaký externí knihovnu
1) /atlasAdmin/listOfUsers - provedení změny, tj. např jméno nově přiřazeného taxonu nebo projektu se vizuálně neprojeví - týká se přidání i odebrání - je potřeba aby bylo ihned viditelné (změna se ale nyní uloží, až po refresh je vidět platný stav)
2) /atlasAdmin/listOfTaxa - mám práva mapAdmina a přitom mi neprojde editace polí isProtected, Preslia, stav revize... - zřejmě omezení na backendu ?
3) LayerSwitcher (užitý např na /atlas/mapMain/:taxonId) má nepříjemný vizuál který překrývá příliš velkou plochu - měla by být viditelná jen poloprůhledná ikonka v levém horním rohu mapy která při click/hover expanduje. Při opuštění se pak zase minimalizuje jen do ikony (ted bohužel zůstane roztáhnutá na výšku jakou má skrytý tree dostupných vrstev). Rovněž jeho vnitřní design neodpovídá Bootstrap stylu okolní stránky - je potřeba kompaktní ale přehledné řešení dvouúrovnového stormu (kategorie + konkrétní vrstva)
4) LayerSwitcher (užitý např na /atlas/mapMain/:taxonId) u projektových vrstev ukazuje "Projddect 22" namísto i18n termínu "Projekt" a název daného projektu
5) /atlas/mapMain/1489 po refactoringu přestala fungovat vrstvy ze sekce GBIF a Projects - tj. jejich zaškrtnutí je nezobrazí
---

## next:
**V:**


**P:**
