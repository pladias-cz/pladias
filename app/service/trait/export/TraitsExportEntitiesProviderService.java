package service.trait.export;

import io.ebean.Model;
import models.traits.Datatype;
import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import service.trait.collect.BaseTraitTaxonNode;
import service.trait.collect.TraitTaxonTreeBuilder;
import service.trait.collect.visitors.DataExtractingVisitor;
import service.trait.collect.visitors.INodeVisitor;
import service.trait.collect.visitors.NodesPopulatingVisitor;
import service.trait.excel.TraitDataProviderFactory;

import java.util.List;

public class TraitsExportEntitiesProviderService {
    private final Logger logger = LoggerFactory.getLogger(TraitsExportEntitiesProviderService.class);
    private final Trait trait;
    private final TraitDataProviderFactory factory;

    public TraitsExportEntitiesProviderService(Trait trait) {
        this.trait = trait;
        Datatype datatype = trait.getFeature().getDatatype();
        factory = new TraitDataProviderFactory(datatype);
    }

    public List<Model> collectEntities() {
        return factory.getData(trait);
    }

    public List<Model> buildEntities() {
        return buildTaxonTreeAndCollectEntities();
    }

    protected List<? extends Model> collectEntities(List<Integer> taxonFilterList, TraitDetailsEntryType[] entryTypes) {
        return factory.getData(trait, taxonFilterList, entryTypes);
    }

    protected List<Model> buildTaxonTreeAndCollectEntities() {
        TraitTaxonTreeBuilder builder = new TraitTaxonTreeBuilder(trait);
        BaseTraitTaxonNode root = builder.buildTree();
        logger.info(String.format("Taxon tree for trait %d built", trait.getId()));

        INodeVisitor visitor = new NodesPopulatingVisitor();
        root.accept(visitor);
        logger.info("Taxon tree visited");

        DataExtractingVisitor extVisitor = new DataExtractingVisitor();
        root.accept(extVisitor);
        logger.info("Taxon tree entities collected");

        return extVisitor.getEntities();
    }
}
