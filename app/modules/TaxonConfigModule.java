package modules;

import com.google.inject.AbstractModule;

import taxons.config.TaxonConfiguration;

public class TaxonConfigModule extends AbstractModule {
    protected void configure() {

        bind(TaxonConfiguration.class)
            .asEagerSingleton();
    }
}