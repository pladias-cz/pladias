package repositories;

import models.traits.Trait;

import java.util.List;

public interface ITraitRepository {
    List<Trait> getStandardTraits();

    List<Trait> getComputedTraits();
}
