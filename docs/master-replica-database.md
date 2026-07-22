# Master-Replica Databázová Konfigurace

Tento dokument popisuje konfiguraci a použití master-replica architektury pro rozdělení databázové zátěže v aplikaci Pladias.

## Přehled

Aplikace podporuje směrování databázových operací na dva servery:

- **Master (default)**: Hlavní databáze pro write operace (INSERT, UPDATE, DELETE)
- **Replica**: Čtecí replika pro read-only operace (SELECT)

Tato architektura umožňuje:
- Rozdělení zátěže mezi více serverů
- Zvýšení výkonu pro read-heavy operace
- Lepší škálovatelnost aplikace

## Konfigurace

### 1. Nastavení datasource v `conf/common.conf`

```conf
# Master databáze - write operace
db.default.url="jdbc:postgresql://pladias_master:5432/pladias"
db.default.username=play
db.default.password=play
db.default.driver=org.postgresql.Driver
db.default.hikaricp.connectionTestQuery="SELECT 1"
db.default.maxConnectionsPerPartition=100
db.default.minConnectionsPerPartition=10

# Replica databáze - read-only operace
db.replica.url="jdbc:postgresql://pladias_replica:5432/pladias"
db.replica.username=play_readonly
db.replica.password=play_readonly
db.replica.driver=org.postgresql.Driver
db.replica.hikaricp.connectionTestQuery="SELECT 1"
db.replica.maxConnectionsPerPartition=50
db.replica.minConnectionsPerPartition=5
```

### 2. Nastavení Ebean serverů v `conf/common.conf`

```conf
# Master Ebean server
ebean.default.databasePlatform=postgis.PostGisPlatform
ebean.default=["models.*"]

# Replica Ebean server (read-only)
ebean.replica.databasePlatform=postgis.PostGisPlatform
ebean.replica=["models.*"]
ebean.replica.readOnly=true
```

### 3. Registrace interceptoru

Interceptor pro automatické přepínání je registrován v `app/modules/ServicesModule.java`:

```java
bindInterceptor(
    Matchers.any(),
    Matchers.annotatedWith(UseReplica.class),
    new DatabaseContextInterceptor()
);
```

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

**Výhody:**
- Čistý kód bez boilerplate
- Automatické obnovení kontextu
- Snadné čtení a údržba

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

**Výhody:**
- Přesná kontrola rozsahu
- Funguje i mimo controllery (service vrstva, repositories)
- Explicitní a čitelné

### Způsob 3: Dědění z `BaseModel`

Všechny modely by měly dědit z `BaseModel` místo přímo z `Model`:

```java
package models;

public class Record extends BaseModel {
    
    // Automaticky použije aktuální databázový kontext
    public static Finder<Long, Record> find() {
        return BaseModel.find(Record.class);
    }
    
    // Explicitní použití replica
    public static List<Record> findAllOnReplica() {
        try (DatabaseContext.Scope replica = DatabaseContext.useReplica()) {
            return find().findList();
        }
    }
}
```

**BaseModel poskytuje:**
- `find(Class<T> clazz)` - Finder s aktuálním kontextem
- `find(String dbName, Class<T> clazz)` - Finder s explicitním serverem
- `db()` - Database instance s aktuálním kontextem
- `db(String dbName)` - Database instance s explicitním serverem

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

### `BaseModel`

Base třída pro všechny entity modely.

```java
public class MyEntity extends BaseModel {
    
    public static Finder<Long, MyEntity> find() {
        return BaseModel.find(MyEntity.class);
    }
    
    public void someMethod() {
        // SQL dotaz s aktuálním kontextem
        SqlRow row = db().sqlQuery("SELECT ...").findOne();
    }
}
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

2. **Děďte všechny modely z `BaseModel`**
   ```java
   public class MyEntity extends BaseModel { ... }
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
