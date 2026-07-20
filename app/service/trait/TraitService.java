package service.trait;

import com.google.inject.Inject;
import io.ebean.DB;
import io.ebean.Model;
import models.traits.*;
import models.traitsExport.TraitDetailsEntryType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.db.Database;
import service.exception.TraitComputationException;
import service.trait.excel.TraitDataProviderFactory;
import service.trait.export.TraitsExportEntitiesProviderService;
import sql.SqlExecutor;

import java.sql.SQLException;
import java.util.List;

public class TraitService implements ITraitService {
    private static final String[] TraitTables = new String[]
        {
            BoolDatatype.QualifiedTableName,
            CrossTaxonDatatype.QualifiedTableName,
            DataUnmeasurable.QualifiedName,
            DistributionDatatype.QualifiedTableName,
            EnumerateDatatype.QualifiedTableName,
            IntegerDatatype.QualifiedTableName,
            IntervalAvgDatatype.QualifiedTableName,
            MonthDatatype.QualifiedTableName,
            PercentageDatatype.QualifiedTableName,
            RealDatatype.QualifiedTableName,
            RealMultiDatatype.QualifiedTableName,
            SyntaxonDatatype.QualifiedTableName,
            YearDatatype.QualifiedTableName
        };
    private final SqlExecutor _sqlExecutor;
    private final Logger _logger = LoggerFactory.getLogger(TraitService.class);

    @Inject
    public TraitService(Database database) {
        _sqlExecutor = new SqlExecutor(database);
    }

    @Override
    public void recomputeTraitValues(Trait trait) throws TraitComputationException {
        if (trait.isDeleted())
            return;

        if (!trait.getFeature().supportsComputedValues()) {
            return;
        }

        try {
            recompute(trait);
        } catch (Exception e) {
            Datatype datatype = trait.getFeature().getDatatype();
            String errorMessage = String.format("Failed processing trait #%d, '%s', datatype: %d - %s. Exception: %s.\n",
                trait.getId(),
                trait.getDescriptionCz(),
                datatype.getId(),
                datatype.getKey(),
                e.getMessage());
            throw new TraitComputationException(errorMessage, e);
        }
    }

    private void recompute(Trait trait) throws Exception {
        if (!trait.getFeature().supportsComputedValues())
            return;

        deleteNonBasicTraitData(trait);
        TraitsExportEntitiesProviderService exportEntitiesService = new TraitsExportEntitiesProviderService(trait);
        List<Model> entities = exportEntitiesService.buildEntities();

        DB.insertAll(entities);
    }

    private void deleteNonBasicTraitData(Trait trait) throws Exception {
        Datatype datatype = trait.getFeature().getDatatype();
        TraitDataProviderFactory factory = new TraitDataProviderFactory(datatype);
        TraitDetailsEntryType[] entryTypes = new TraitDetailsEntryType[]
            {
                TraitDetailsEntryType.Aggregated,
                TraitDetailsEntryType.Inherited,
                TraitDetailsEntryType.Composite,
            };
        factory.deleteData(trait, entryTypes);
    }

    @Override
    public void vacuumTables() {
        try {
            for (String table : TraitTables) {
                _sqlExecutor.executeCommand(String.format("VACUUM %s;", table));
            }
            _logger.info("Trait tables vacuumed");
        } catch (SQLException ex) {
            _logger.error("Failed to cleanup DB", ex);
        }
    }
}
