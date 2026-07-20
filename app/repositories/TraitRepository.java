package repositories;

import com.google.inject.Inject;
import io.ebean.Expr;
import models.traits.Trait;
import service.config.ConfigConstants;
import service.config.IConfigService;

import java.util.List;

public class TraitRepository implements ITraitRepository {
    private static final int NonExistentTraitId = -1;
    private final IConfigService _configService;

    @Inject
    public TraitRepository(IConfigService configService) {
        _configService = configService;
    }

    @Override
    public List<Trait> getStandardTraits() {
        return Trait.find().query()
            .where()
            .not(Expr.in("id", getComputedTraitIds()))
            .findList();
    }

    @Override
    public List<Trait> getComputedTraits() {
        return Trait.find().query()
            .where(Expr.in("id", getComputedTraitIds()))
            .findList();
    }

    private Integer[] getComputedTraitIds() {
        int computedTraitId = _configService.getIntegerOrDefault(
            ConfigConstants.TaxonDistributionTraitKey, NonExistentTraitId);
        return new Integer[]{computedTraitId};
    }

}
