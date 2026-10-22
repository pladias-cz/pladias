# TODOs

This document serve to humans, do not use for agents.

## now:

**V:**
- mapový náhled výsledků vyhledávání, bulkEdit (byl refactorován tak prosím checkni)

**P:**
- dotáhnout refactoring frontendu

---

po velkém refactoringu frontendu některé sekce nefungují tak jak by měly. Postupně je budu hlásit, oprav je. Není-li uvedeno jinak, tak se nejedná o chyby z refactoringu, byly tam již předtím. Změny necommituj.

Pokud se chyba dotýká komunikace s backendem a bude nutné to opravit, můžeš sáhnout i na backend a zrušit JsonResult wrapper pro danou routu (nahradit standardní REST http code response) - JsonResult je pozůstatek legacy aplikace.

3) /measurements/export - první podkomponenta se seznamem skupin, features a traitů by potřebovala refactoring.  Je to hierarchická struktura s omezenou hloubkou a bylo by potřeba aby uživatel mohl snadno vybrat i zrušit jendotlivé položky (celou skupinu, celou feature nebo dílčí trait). K tomu je nutné poskytnout vizuální podporu (nadřazená položka s alespon jednou vybranou podpoložkou je zvýrazněná, její vybrání vybere vše podřízené, zrušení zruší i pořízené, zrušení poslední pořízené zruší nadřízenou...) - prostě klasický treeview
4) /atlasAdmin/listOfUsers - změna přiřazeného taoxnu nebo projektu se vizuálně neprojeví - týká se přidání i odebrání - je potřeba aby bylo ihned viditelné (změna se uloží, po refresh je vidět platný stav)
5) /atlasAdmin/listOfTaxa - mám práva mapAdmina a přitom mi neprojde editace isProtected, Preslia, stav revize...
6) LayerSwitcher (užitý např na /atlas/mapMain/1489) má nepříjemný vizuál - měla by být viditelná jen poloprůhledná ikonka v levém horním rohu mapy která při click/hover expanduje. Při opuštění se pak zase minimalizuje jen do ikony (ted zůstane roztáhnutá na výšku jakou má skrytý tree dostupných vrstev)
7) tamtéž výpis projektových vrstev v LayerSwitcher ukazuje "Projddect 22" namísto i18n termínu "projekt" a název daného projektu
8) /atlas/mapMain/1489 po refactoringu přestala fungovat vrstvy ze sekce GBIF a Projects - tj. jejich zaškrtnutí je nezobrazí
---

## next:
**V:**


**P:**
