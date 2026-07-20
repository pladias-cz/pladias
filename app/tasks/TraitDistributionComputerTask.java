package tasks;

import io.ebean.DB;
import io.ebean.Model;
import models.traits.DistributionDatatype;
import models.traits.Trait;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import repositories.ITraitRepository;
import service.config.IConfigService;
import service.trait.export.TraitsExportEntitiesProviderService;

import java.util.List;

public class TraitDistributionComputerTask implements ITask {
    private final static String Name = "traitDistributionComputerTask";

    private final Logger logger = LoggerFactory.getLogger(TraitDistributionComputerTask.class);

    private final ITraitRepository _traitRepository;

    public TraitDistributionComputerTask(IConfigService configService, ITraitRepository traitRepository) {
        _traitRepository = traitRepository;
    }

    @Override
    public String getName() {
        return Name;
    }

    @Override
    public void execute() {
        //wipe existing data
        DistributionDatatype.find().query().where().delete();
        List<Trait> traits = _traitRepository.getComputedTraits();
        logger.info("About to populate complex export table");
        for (Trait trait : traits) {
            populate(trait);
        }
        logger.info("Complex export table populated");
    }

    private void populate(Trait trait) {
        TraitsExportEntitiesProviderService exportEntitiesService = new TraitsExportEntitiesProviderService(trait);
        List<Model> entities = exportEntitiesService.buildEntities();
        DB.insertAll(entities);
    }
}
