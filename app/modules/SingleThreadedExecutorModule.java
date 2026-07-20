package modules;

import com.google.inject.AbstractModule;

import scheduler.SingleThreadedExecutor;

public class SingleThreadedExecutorModule extends AbstractModule {
    protected void configure() {

        bind(SingleThreadedExecutor.class)
            .asEagerSingleton();
    }
}
