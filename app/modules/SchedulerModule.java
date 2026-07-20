package modules;

import com.google.inject.AbstractModule;

import scheduler.SchedulerConfigurator;

public class SchedulerModule extends AbstractModule {
    protected void configure() {

        bind(SchedulerConfigurator.class)
            .asEagerSingleton();
    }
}
