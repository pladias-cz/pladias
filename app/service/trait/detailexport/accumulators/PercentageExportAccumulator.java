package service.trait.detailexport.accumulators;

import io.ebean.Model;
import models.traits.DatatypePK;
import models.traits.PercentageDatatype;
import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;
import play.i18n.Messages;
import service.trait.detailexport.CellDetail;
import settings.user.UserOptions;

import java.util.List;
import java.util.Set;

public class PercentageExportAccumulator extends NumericBaseExportAccumulator {
    public PercentageExportAccumulator(Trait trait, UserOptions userOptions,
                                       Set<TraitDetailsEntryType> exportTypes, Messages messages) {
        super(trait, userOptions, exportTypes, messages);
    }

    @Override
    public void populateRecordFields(Model model) {
        if (!(model instanceof PercentageDatatype dao))
            return;

        TraitDetailsEntryType entryType =
            TraitDetailsEntryType.make(dao.getDatatypePk().getEntryType());
        if (!isExported(entryType))
            return;

        updateCachedDataIfNeeded(dao.getDatatypePk().getTaxonId());
        updateCollectedValues(dao);
    }

    private void updateCollectedValues(PercentageDatatype dao) {
        DatatypePK pk = dao.getDatatypePk();
        long taxonId = pk.getTaxonId();
        List<CellDetail> list = cachedData.get(taxonId);
        TraitDetailsEntryType entryType = TraitDetailsEntryType.make(pk.getEntryType());
        int index = computeIndexForType(entryType);

        String newValue = Double.toString(dao.getValue());
        createOrUpdateCell(list, index, newValue);
    }
}
