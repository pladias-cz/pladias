# Master-Replica Databázová Konfigurace

Tento dokument popisuje konfiguraci a použití master-replica architektury pro rozdělení databázové zátěže v aplikaci Pladias.

## Použití

### Způsob 1: Deklarativní s anotací `@UseReplica`

Nejjednodušší způsob - označte controller metodu nebo celou třídu anotací:

```java
package controllers.atlas;

import controllers.ControllerBase;
import db.UseReplica;
import models.*;
import play.mvc.Result;

public class MapDetailController extends ControllerBase {

    /**
     * Tato metoda automaticky použije replica databázi
     */
    @UseReplica
    public Result getSquareInfo(Http.Request request, int squareCode, Long taxonId) {
        // Všechny dotazy v této metodě půjdou na repliku
        Taxon taxon = Taxon.find().byId(taxonId);
        MapSquareNew square = MapSquareNew.find().query()
            .where().eq("code", String.valueOf(squareCode)).findOne();

        return ok(response);
    }

    /**
     * Tato metoda použije master (default behavior)
     */
    public Result updateRecord(Http.Request request, Long recordId) {
        // Tento dotaz půjde na master
        Record record = Record.find().byId(recordId);
        record.save(); // write operace
        return ok();
    }
}
```

### Způsob 2: Programové s try-with-resources

Pro jemnější kontrolu použijte `DatabaseContext.useReplica()`:

```java
package service.atlas;

import db.DatabaseContext;
import models.*;
import java.util.List;

public class MapSquareService {

    public List<MapSquareNew> getSquaresForTaxon(Long taxonId) {
        // Přepnutí na repliku pouze pro tento blok
        try (DatabaseContext.Scope replica = DatabaseContext.useReplica()) {
            return MapSquareNew.find().query()
                .where().eq("taxon_id", taxonId)
                .findList();
        }
        // Po opuštění bloku se automaticky vrátí master
    }

    public void saveSquare(MapSquareNew square) {
        // Tento kód běží na master (default)
        square.save();
    }
}
```


### Způsob 3: Použití `BaseModel` helper metod

**Důležité:** Modely musí dědit z `io.ebean.Model`, NE z `BaseModel`!

`BaseModel` je pouze helper třída se statickými metodami - není určena k dědění.
Entity musí vždy dědit přímo z `Model` aby fungoval Ebean enhancement.

```java
package models;

@Entity
public class Record extends Model {

    // Použití BaseModel helper metody pro získání Finder s aktuálním kontextem
    public static Finder<Long, Record> find() {
        return new Finder<>(Record.class);
    }

    // Explicitní použití replica
    public static List<Record> findAllOnReplica() {
        try (DatabaseContext.Scope replica = DatabaseContext.useReplica()) {
            return find().findList();
        }
    }
}
```

**Pro SQL dotazy použijte `DatabaseContext.getDatabase()`:**
```java
SqlRow row = DatabaseContext.getDatabase().sqlQuery("SELECT ...").findOne();
```

## API Reference

### `DatabaseContext`

Hlavní třída pro správu databázového kontextu.

```java
// Získání aktuálního serveru
String current = DatabaseContext.getCurrentDatabase(); // "default" nebo "replica"

// Přepnutí na repliku
try (DatabaseContext.Scope replica = DatabaseContext.useReplica()) {
    // kód používající repliku
}

// Přepnutí na master
try (DatabaseContext.Scope master = DatabaseContext.useMaster()) {
    // kód používající master
}

// Získání Database instance
Database db = DatabaseContext.getDatabase();
```

### `@UseReplica`

Anotace pro deklarativní přepnutí na repliku.

```java
// Na metodě
@UseReplica
public Result getData() { ... }

// Na třídě (všechny metody půjdou na repliku)
@UseReplica
public class ReadOnlyController extends ControllerBase { ... }
```

**Pozor:** Nepoužívejte na metody s write operacemi!

### `DatabaseContext`

Helper třída pro získání Database instance s aktuálním kontextem.

```java
public class MyEntity extends Model {

    public static Finder<Long, MyEntity> find() {
        return new Finder<>(MyEntity.class);
    }

    public void someMethod() {
        // SQL dotaz s aktuálním kontextem
        SqlRow row = DatabaseContext.getDatabase().sqlQuery("SELECT ...").findOne();
    }
}
```

**Pro explicitní specifikování databáze:**
```java
import io.ebean.DB;

// Replica
List<MyEntity> items = DB.byName("replica").find(MyEntity.class).findList();

// Master (default)
MyEntity item = DB.byName("default").find(MyEntity.class).byId(123);
```

## Příklady použití

### Controller s read-only operacemi

```java
package controllers.atlas;

import controllers.ControllerBase;
import db.UseReplica;
import models.*;
import play.mvc.Result;

@UseReplica  // Celá třída používá repliku
public class AtlasSearchController extends ControllerBase {

    public Result search(Http.Request request, String query) {
        // Všechny dotazy půjdou na repliku
        List<Record> records = Record.find().query()
            .where().ilike("locality", "%" + query + "%")
            .findList();

        return ok(Json.toJson(records));
    }

    public Result getTaxonDetail(Long id) {
        Taxon taxon = Taxon.find().byId(id);
        return ok(Json.toJson(taxon));
    }
}
```

### Service vrstva s mixem operací

```java
package service.records;

import db.DatabaseContext;
import models.Record;
import java.util.List;

public class RecordService {

    /**
     * Read-only operace - použije repliku
     */
    @UseReplica
    public List<Record> getRecordsByTaxon(Long taxonId) {
        return Record.find().query()
            .where().eq("taxon_id", taxonId)
            .findList();
    }

    /**
     * Write operace - použije master (default)
     */
    public void updateRecord(Long recordId, String locality) {
        Record record = Record.find().byId(recordId);
        record.locality = locality;
        record.save(); // půjde na master
    }
}
```

## Best Practices

### ✅ Doporučeno

1. **Používejte `@UseReplica` pro read-only controller metody**
   ```java
   @UseReplica
   public Result getRecords() { ... }
   ```

2. **Děďte všechny modely z `io.ebean.Model`**
   ```java
   public class MyEntity extends Model { ... }
   ```

3. **Používejte try-with-resources pro programové přepnutí**
   ```java
   try (DatabaseContext.Scope replica = DatabaseContext.useReplica()) {
       // kód
   }
   ```

4. **Testujte na obou serverech**
   - Ujistěte se že replika má aktuální data
   - Otestujte fallback na master při nedostupnosti repliky

### ❌ Nedoporučeno

1. **Nepoužívejte `@UseReplica` na write operace**
   ```java
   // ŠPATNĚ
   @UseReplica
   public Result updateRecord() {
       record.save(); // SELŽE na read-only replica!
   }
   ```

2. **Nezapomeňte obnovit kontext**
   ```java
   // ŠPATNĚ
   DatabaseContext.useReplica();
   // kód...
   // kontext zůstane na replica!

   // SPRÁVNĚ
   try (DatabaseContext.Scope replica = DatabaseContext.useReplica()) {
       // kód...
   } // automatické obnovení
   ```

3. **Nepoužívejte globální přepnutí bez obnovení**
   ```java
   // ŠPATNĚ - ThreadLocal zůstane nastavený
   DatabaseContext.currentDatabase.set("replica");
   ```

## Troubleshooting

### Problém: "Connection is read-only"

**Příčina:** Pokus o write operaci na replica databázi.

**Řešení:**
1. Zkontrolujte zda metoda nemá `@UseReplica` anotaci
2. Pokud potřebuje write operaci, odstraňte anotaci
3. Nebo explicitně přepněte na master:
   ```java
   try (DatabaseContext.Scope master = DatabaseContext.useMaster()) {
       record.save();
   }
   ```

### Problém: Replika nemá aktuální data

**Příčina:** Replication lag mezi master a replica.

**Řešení:**
1. Pro kritické operace použijte master:
   ```java
   try (DatabaseContext.Scope master = DatabaseContext.useMaster()) {
       // operace vyžadující aktuální data
   }
   ```
2. Nakonfigurujte replication monitoring
3. Zvažte synchronous replication pokud je lag nepřijatelný

### Problém: ThreadLocal únik

**Příčina:** Nepoužití try-with-resources nebo zapomenuté `restore()`.

**Řešení:**
1. Vždy používejte try-with-resources:
   ```java
   try (DatabaseContext.Scope replica = DatabaseContext.useReplica()) {
       // kód
   }
   ```
2. Pokud musíte použít manual restore:
   ```java
   DatabaseContext.Scope scope = DatabaseContext.useReplica();
   try {
       // kód
   } finally {
       scope.restore();
   }
   ```

## Související dokumentace

- [Architecture](./architecture.md) - Celková architektura aplikace
- [Conventions](./conventions.md) - Coding standards a patterns
- [Ebean Documentation](https://ebean.io/docs/) - Oficiální dokumentace Ebean ORM
