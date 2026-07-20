package modules;

import com.google.inject.AbstractModule;
import com.google.inject.Singleton;

import repositories.ISquareRepository;
import repositories.ITraitRepository;
import repositories.SquareRepository;
import repositories.TraitRepository;
import utils.MapSquareResolver;

public class RepositoriesModule extends AbstractModule {
    protected void configure() {
        bind(ISquareRepository.class)
            .to(SquareRepository.class)
            .in(Singleton.class);

        bind(MapSquareResolver.class)
            .asEagerSingleton();

        bind(ITraitRepository.class)
            .to(TraitRepository.class)
            .in(Singleton.class);
    }
}
