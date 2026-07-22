package db;

import org.aopalliance.intercept.MethodInterceptor;
import org.aopalliance.intercept.MethodInvocation;

import java.lang.reflect.Method;

/**
 * Interceptor pro automatické přepínání mezi master a replica databází
 * na základě {@link UseReplica} anotace.
 * 
 * <p>Tento interceptor je navržen pro použití s Guice AOP {@code bindInterceptor()}
 * v {@code modules/ServicesModule.java}:</p>
 * 
 * <pre>{@code
 * bindInterceptor(
 *     Matchers.any(),
 *     Matchers.annotatedWith(UseReplica.class),
 *     new DatabaseContextInterceptor()
 * );
 * }</pre>
 * 
 * <p>Funguje na úrovni AOP method interception pomocí org.aopalliance.intercept.MethodInterceptor.</p>
 * 
 * <p>Chování:</p>
 * <ol>
 *   <li>Před vykonáním metody přepne kontext na replica</li>
 *   <li>Automaticky obnoví původní kontext po dokončení</li>
 *   <li>Transparentně obalí původní metodu</li>
 * </ol>
 * 
 * @see UseReplica
 * @see DatabaseContext
 */
public class DatabaseContextInterceptor implements MethodInterceptor {
    
    /**
     * Interceptuje volání metody a přepne databázový kontext
     * pokud je metoda nebo třída označena anotací {@code @UseReplica}.
     * 
     * @param invocation AOP method invocation
     * @return výsledek volání metody
     * @throws Throwable pokud selže původní metoda
     */
    @Override
    public Object invoke(MethodInvocation invocation) throws Throwable {
        // Zkontrolujeme anotaci na metodě
        Method method = invocation.getMethod();
        boolean useReplica = method.isAnnotationPresent(UseReplica.class);
        
        // Pokud není na metodě, zkontrolujeme anotaci na třídě
        if (!useReplica) {
            useReplica = method.getDeclaringClass().isAnnotationPresent(UseReplica.class);
        }
        
        if (useReplica) {
            // Přepneme na repliku pro duration této metody
            try (DatabaseContext.Scope replica = DatabaseContext.useReplica()) {
                return invocation.proceed();
            }
        }
        
        // Bez anotace - použije se default (master)
        return invocation.proceed();
    }
}
