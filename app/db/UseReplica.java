package db;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Označí metodu nebo třídu jako používající replica databázi pro read-only operace.
 * 
 * <p>Funguje ve spojení s {@link DatabaseContextInterceptor}, který automaticky přepne
 * databázový kontext před vstupem do metody.</p>
 * 
 * <p>Příklad použití na metodě:</p>
 * <pre>{@code
 * @UseReplica
 * public Result getRecords() {
 *     // Tento dotaz půjde automaticky na repliku
 *     List<Record> records = Record.find().findList();
 *     return ok(records);
 * }
 * }</pre>
 * 
 * <p>Příklad použití na třídě (všechny metody půjdou na repliku):</p>
 * <pre>{@code
 * @UseReplica
 * public class MapDetailController extends ControllerBase {
 *     public Result getSquareInfo(...) {
 *         // Všechny dotazy v této třídě půjdou na repliku
 *     }
 * }
 * }</pre>
 * 
 * <p><strong>Důležité:</strong></p>
 * <ul>
 *   <li>Tato anotace je určena pouze pro <strong>read-only operace</strong></li>
 *   <li>Nepoužívejte na metody, které provádějí INSERT, UPDATE, DELETE operace</li>
 *   <li>Pro write operace použijte master databázi (výchozí chování bez anotace)</li>
 * </ul>
 * 
 * @see DatabaseContext
 * @see DatabaseContextInterceptor
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface UseReplica {
}
