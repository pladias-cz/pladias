package modules;

import com.google.inject.AbstractModule;

import controllers.security.SecurityConfigurator;

public class SecurityModule extends AbstractModule {
    protected void configure() {

        bind(SecurityConfigurator.class)
            .asEagerSingleton();
    }
}