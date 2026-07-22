# Master-Replica Read-Write Splitting

Tato dokumentace popisuje implementaci rozdělení zátěže mezi master a replica databázový server v projektu Pladias.

## Přehled

Projekt používá **manuální přepínání** mezi master a replica databází pomocí:

1. **ThreadLocal kontextu** - `DatabaseContext`
2. **Anotace `@UseReplica`** - pro deklarativní přepínání
3. **AOP interceptoru** - `DatabaseContextInterceptor`

> **Poznámka:** Ebean 17.x nepodporuje automatické rozdělení zátěže. Všechny operace jdou implicitně na master, pokud není explicitně přepnuto na repliku.

## Architektura

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
├─────────────────────────────────────────────────────────┤
│  Controller / Service                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  @UseReplica (volitelné)                        │   │
│  │  ↓                                               │   │
│  │  DatabaseContextInterceptor (AOP)                │   │
│  │  ↓                                               │   │
│  │  DatabaseContext (ThreadLocal)                   │   │
│  │  - getCurrentDatabase() → "default" | "replica" │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  Model Layer                                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │  BaseModel (helper třída)                        │   │
│  │  - find(Class) → použije aktuální kontext       │   │
│  │  - find(dbName, Class) → explicitní server      │   │
│  │  - currentDb() → Database instance              │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  Ebean ORM                                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │  DB.byName("default") → Master DB               │   │
│  │  DB.byName("replica") → Replica DB              │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Komponenty

### 1. DatabaseContext

ThreadLocal úložiště pro aktuální databázový kontext.

**Soubor:** `/app/db/DatabaseContext.java`

```java
// Získání aktuální databáze
String dbName = DatabaseContext.getCurrentDatabase(); // "default" nebo "replica"

// Explicitní přepnutí na repliku
try (DatabaseContext.Scope replica = DatabaseContext.useReplica()) {
    // Všechny Ebean operace zde použijí repliku
    List<Taxon> taxa = Taxon.find().findList();
}
// Po opuštění try-with-resources se automaticky obnoví původní kontext
```

### 2. UseReplica Anotace

Deklarativní způsob označení metod, které mají používat repliku.

**Soubor:** `/app/db/UseReplica.java`

```java
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface UseReplica {
}
```

### 3. DatabaseContextInterceptor

AOP interceptor pro automatické přepínání na základě anotace.

**Soubor:** `/app/db/DatabaseContextInterceptor.java`

```java
public class DatabaseContextInterceptor implements MethodInterceptor {
    @Override
    public Object invoke(MethodInvocation invocation) throws Throwable {
        Method method = invocation.getMethod();
        boolean useReplica = method.isAnnotationPresent(UseReplica.class)
            || method.getDeclaringClass().isAnnotationPresent(UseReplica.class);
        
        if (useReplica) {
            try (DatabaseContext.Scope replica = DatabaseContext.useReplica()) {
                return invocation.proceed();
            }
        }
        return invocation.proceed();
    }
}
```

**Registrace:** `/app/modules/ServicesModule.java`

```java
bindInterceptor(
    Matchers.any(),
    Matchers.annotatedWith(UseReplica.class),
    new DatabaseContextInterceptor()
);
```

### 4. BaseModel

Helper třída pro usnadnění práce s více databázemi.

**Soubor:** `/app/models/BaseModel.java`

> **Důležité:** `BaseModel` **NENÍ** určena k dědění! Entity třídy musí stále dědit přímo z `io.ebean.Model`.

```java
// Použití aktuálního kontextu (default master)
public static Finder<Long, Taxon> find() {
    return BaseModel.find(Taxon.class);
}

// Explicitní použití replica
List<Taxon> taxa = BaseModel.find("replica", Taxon.class).findList();

// SQL dotazy
SqlRow row = BaseModel.currentDb().sqlQuery("SELECT ...").findOne();
```

## Použití

### Způsob 1: Anotace na controller metodě

```java
public class TaxonController extends BaseController {
    
    @UseReplica
    public Result list() {
        // Automaticky použije repliku
        List<Taxon> taxa = Taxon.find().findList();
        return ok(views.html.taxon.list.render(taxa));
    }
    
    public Result create() {
        // Použije master (default)
        Taxon taxon = new Taxon();
        taxon.name = "New Species";
        taxon.save();
        return redirect(routes.TaxonController.list());
    }
}
```

### Způsob 2: Anotace na celé třídě

```java
@UseReplica
public class ReadOnlyTaxonController extends BaseController {
    
    public Result list() {
        // Všechny metody v této třídě použijí repliku
        return ok(views.html.taxon.list.render(Taxon.find().findList()));
    }
    
    public Result show(Long id) {
        return ok(views.html.taxon.show.render(Taxon.find().byId(id)));
    }
}
```

### Způsob 3: Manuální přepnutí v kódu

```java
public class TaxonService {
    
    public List<Taxon> getAllTaxa() {
        // Explicitní přepnutí na repliku
        try (DatabaseContext.Scope replica = DatabaseContext.useReplica()) {
            return Taxon.find().findList();
        }
    }
    
    public void updateTaxon(Taxon taxon) {
        // Write operace - použije master (default)
        taxon.update();
    }
}
```

### Způsob 4: Přímé specifikování databáze

```java
// Použití replica pro konkrétní dotaz
List<Taxon> taxa = BaseModel.find("replica", Taxon.class)
    .where().eq("published", true)
    .findList();

// Použití master pro zápis
Taxon taxon = BaseModel.find("default", Taxon.class).byId(123);
taxon.name = "Updated Name";
taxon.update();
```

## Doporučené postupy

### Kdy použít repliku:

- ✅ **Read-only operace** (GET requesty)
- ✅ **Reporty a statistiky**
- ✅ **Fulltextové vyhledávání**
- ✅ **Exporty dat**
- ✅ **Mapové podklady**

### Kdy použít master:

- ✅ **Zápisové operace** (CREATE, UPDATE, DELETE)
- ✅ **Transakce**
- ✅ **Operace vyžadující okamžitou konzistenci**
- ✅ **Načítání čerstvě uložených dat**

## Omezení a upozornění

### 1. Replikační zpoždění

Replica může mít zpoždění za masterem (typicky sekundy až minuty).

**Problém:**
```java
taxon.save(); // Master
// Okamžité čtení z replica - taxon nemusí být vidět!
Taxon fresh = Taxon.find().byId(taxon.getId()); // NULL na replice!
```

**Řešení:**
```java
taxon.save(); // Master
// Čtení ihned po zápisu použije master
Taxon fresh = BaseModel.find("default", Taxon.class).byId(taxon.getId());
```

### 2. Transakce

Transakce musí běžet na jednom serveru:

```java
@Transactional
public void updateWithRelations(Taxon taxon) {
    // Celá transakce běží na masteru
    taxon.save();
    taxon.getSynonyms().forEach(s -> s.save());
}
```

### 3. Lazy Loading

Pokud je entita načtena z replica, lazy loading také půjde na repliku:

```java
try (DatabaseContext.Scope replica = DatabaseContext.useReplica()) {
    Taxon taxon = Taxon.find().byId(123); // Replica
    // Pozor - toto také půjde na repliku:
    List<Synonym> synonyms = taxon.getSynonyms(); // Replica
}
```

## Troubleshooting

### Problém: Všechny dotazy jdou na master

**Příčina:** Chybí anotace `@UseReplica` nebo manuální přepnutí.

**Řešení:**
```java
// Přidat anotaci
@UseReplica
public Result list() { ... }

// Nebo manuálně přepnout
try (DatabaseContext.Scope replica = DatabaseContext.useReplica()) {
    ...
}
```

### Problém: BeanNotEnhancedException

**Příčina:** Entity třída dědí z `BaseModel` místo z `io.ebean.Model`.

**Řešení:**
```java
// ŠPATNĚ:
public class Taxon extends BaseModel { ... }

// SPRÁVNĚ:
@Entity
public class Taxon extends Model {
    public static Finder<Long, Taxon> find() {
        return BaseModel.find(Taxon.class);
    }
}
```

## Reference

- [Ebean Documentation](https://ebean.io/docs/)
- [Play Framework Ebean Plugin](https://www.playframework.com/documentation/latest/JavaEbean)
- [DatabaseContext.java](/app/db/DatabaseContext.java)
- [UseReplica.java](/app/db/UseReplica.java)
- [DatabaseContextInterceptor.java](/app/db/DatabaseContextInterceptor.java)
- [BaseModel.java](/app/models/BaseModel.java)
