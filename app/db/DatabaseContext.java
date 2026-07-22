package db;

import io.ebean.DB;
import io.ebean.Database;

/**
 * Správa přepínání mezi master a replica databází pomocí ThreadLocal.
 * 
 * Umožňuje rozdělení databázové zátěže směrováním read-only operací na replica server
 * a write operací na master server.
 * 
 * <p>Použití:</p>
 * <ol>
 *   <li>Deklarativní přes {@link db.UseReplica @UseReplica} anotaci</li>
 *   <li>Programové přes try-with-resources blok</li>
 * </ol>
 * 
 * <p>Příklad programového použití:</p>
 * <pre>{@code
 * try (DatabaseContext.Scope replica = DatabaseContext.useReplica()) {
 *     // Všechny DB operace v tomto bloku půjdou na repliku
 *     List<Record> records = Record.find().findList();
 * }
 * }</pre>
 * 
 * <p>Příklad deklarativního použití:</p>
 * <pre>{@code
 * @UseReplica
 * public Result getRecords() {
 *     // Tento dotaz půjde automaticky na repliku
 *     List<Record> records = Record.find().findList();
 *     return ok(records);
 * }
 * }</pre>
 * 
 * @see db.UseReplica
 * @see models.BaseModel
 */
public class DatabaseContext {
    
    /** Název master (default) databázového serveru - pro write operace */
    public static final String MASTER = "default";
    
    /** Název replica databázového serveru - pro read-only operace */
    public static final String REPLICA = "replica";
    
    private static final ThreadLocal<String> currentDatabase = new ThreadLocal<>();
    
    /**
     * Získá název aktuálně vybraného databázového serveru.
     * 
     * @return Název databáze ("default" nebo "replica")
     */
    public static String getCurrentDatabase() {
        String dbName = currentDatabase.get();
        return dbName != null ? dbName : MASTER;
    }
    
    /**
     * Přepne na replica databázi pro aktuální thread.
     * 
     * <p>Nutno volat {@link Scope#restore()} v finally bloku nebo použít try-with-resources.</p>
     * 
     * <p>Příklad:</p>
     * <pre>{@code
     * try (DatabaseContext.Scope replica = DatabaseContext.useReplica()) {
     *     // operace na replica
     * }
     * // automaticky obnoven master
     * }</pre>
     * 
     * @return Scope objekt pro obnovení původního stavu
     */
    public static Scope useReplica() {
        return new Scope(REPLICA);
    }
    
    /**
     * Přepne na master databázi pro aktuální thread.
     * 
     * <p>Nutno volat {@link Scope#restore()} v finally bloku nebo použít try-with-resources.</p>
     * 
     * @return Scope objekt pro obnovení původního stavu
     */
    public static Scope useMaster() {
        return new Scope(MASTER);
    }
    
    /**
     * Získá {@link Database} instanci pro aktuálně vybraný server.
     * 
     * <p>Tato metoda respektuje aktuální ThreadLocal kontext.</p>
     * 
     * @return Database instance
     */
    public static Database getDatabase() {
        return DB.byName(getCurrentDatabase());
    }
    
    /**
     * Scope pro try-with-resources pattern. Automaticky obnoví původní stav.
     * 
     * <p>Příklad použití:</p>
     * <pre>{@code
     * try (DatabaseContext.Scope scope = DatabaseContext.useReplica()) {
     *     // kód používající repliku
     * } // automaticky zavře a obnoví předchozí kontext
     * }</pre>
     */
    public static class Scope implements AutoCloseable {
        private final String previousDatabase;
        
        private Scope(String newDatabase) {
            this.previousDatabase = currentDatabase.get();
            currentDatabase.set(newDatabase);
        }
        
        /**
         * Obnoví předchozí databázový kontext.
         * 
         * <p>Voláno automaticky na konci try-with-resources bloku.</p>
         */
        @Override
        public void close() {
            restore();
        }
        
        /**
         * Explicitní obnovení předchozího databázového kontextu.
         * 
         * <p>Voláno automaticky v {@link #close()}, ale lze volat i explicitně
         * pokud potřebujete obnovit kontext dříve než na konci bloku.</p>
         */
        public void restore() {
            if (previousDatabase != null) {
                currentDatabase.set(previousDatabase);
            } else {
                currentDatabase.remove();
            }
        }
    }
}
