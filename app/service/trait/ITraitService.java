package service.trait;

import models.traits.Trait;
import service.exception.TraitComputationException;

public interface ITraitService {
    void recomputeTraitValues(Trait trait) throws TraitComputationException;

    void vacuumTables();
}
