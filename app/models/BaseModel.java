package models;

import db.DatabaseContext;
import io.ebean.DB;
import io.ebean.Database;
import io.ebean.Finder;

/**
 * Helper třída pro modely s podporou master-replica přepínání.
 * 
 * <p>Poskytuje helper metody pro získání {@link Finder} a {@link Database}
 * instancí na aktuálně vybraném serveru (master nebo replica).</p>
 * 
 * <p>Tato třída NENÍ určena k dědění - poskytuje pouze statické helper metody.
 * Entity třídy by měly stále dědit přímo z {@code io.ebean.Model}.</p>
 * 
 * <p>Příklad použití:</p>
 * <pre>{@code
 * @Entity
 * public class Record extends Model {
 *     
 *     // Použití helper metody pro aktuální kontext (master)
 *     public static Finder<Long, Record> find() {
 *         return BaseModel.find(Record.class);
 *     }
 *     
 *     // Explicitní použití replica
 *     public static List<Record> findAllOnReplica() {
 *         try (DatabaseContext.Scope replica = DatabaseContext.useReplica()) {
 *             return BaseModel.find(Record.class).findList();
 *         }
 *     }
 * }
 * }</pre>
 * 
 * <p>Přímé použití v kódu:</p>
 * <pre>{@code
 * // Použije aktuální kontext (default master)
 * Record record = BaseModel.find(Record.class).byId(123);
 * 
 * // Explicitní replica
 * try (DatabaseContext.Scope replica = DatabaseContext.useReplica()) {
 *     List<Record> records = BaseModel.find(Record.class).findList();
 * }
 * 
 * // Pomocí currentDb() metody pro SQL dotazy
 * SqlRow row = BaseModel.currentDb().sqlQuery("SELECT ...").findOne();
 * }</pre>
 * 
 * @see db.DatabaseContext
 * @see db.UseReplica
 */
public abstract class BaseModel {
    
    /**
     * Vytvoří {@link Finder} pro aktuálně vybraný databázový server.
     * 
     * <p>Tato metoda respektuje {@link DatabaseContext#getCurrentDatabase()}
     * a vytvoří Finder připojený k příslušnému serveru.</p>
     * 
     * @param <I> Typ primárního klíče (ID)
     * @param <T> Typ entity
     * @param clazz Třída entity
     * @return Finder připojený k aktuální databázi
     */
    protected static <I, T> Finder<I, T> find(Class<T> clazz) {
        return new Finder<>(clazz);
    }
    
    /**
     * Vytvoří {@link Finder} pro konkrétní databázový server.
     * 
     * <p>Užitečné když potřebujete explicitně specifikovat server
     * bez ohledu na aktuální ThreadLocal kontext.</p>
     * 
     * @param <I> Typ primárního klíče (ID)
     * @param <T> Typ entity
     * @param dbName Název databáze ("default" nebo "replica")
     * @param clazz Třída entity
     * @return Query pro zadanou entitu a databázi
     */
    protected static <I, T> io.ebean.Query<T> find(String dbName, Class<T> clazz) {
        return DB.byName(dbName).find(clazz);
    }
    
    /**
     * Získá {@link Database} instanci pro aktuálně vybraný server.
     * 
     * <p>Užitečné pro přímé SQL dotazy a pokročilé operace.</p>
     * 
     * <p>Příklad:</p>
     * <pre>{@code
     * SqlRow row = BaseModel.db().sqlQuery("SELECT COUNT(*) FROM records").findOne();
     * }</pre>
     * 
     * @return Database instance
     */
    public static Database currentDb() {
        return DatabaseContext.getDatabase();
    }
    
    /**
     * Získá {@link Database} instanci pro konkrétní server.
     * 
     * <p>Užitečné když potřebujete explicitně specifikovat server
     * bez ohledu na aktuální ThreadLocal kontext.</p>
     * 
     * @param dbName Název databáze ("default" nebo "replica")
     * @return Database instance
     */
    public static Database db(String dbName) {
        return DB.byName(dbName);
    }
}
