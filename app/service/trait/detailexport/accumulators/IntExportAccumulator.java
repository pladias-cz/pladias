package service.trait.detailexport.accumulators;

import io.ebean.Model;
import models.traits.IntegerDatatype;
import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;
import play.i18n.Messages;
import service.trait.detailexport.CellDetail;
import settings.user.UserOptions;

import java.util.List;
import java.util.Set;

public class IntExportAccumulator extends NumericBaseExportAccumulator {
    public IntExportAccumulator(Trait trait, UserOptions userOptions,
                                Set<TraitDetailsEntryType> exportTypes, Messages messages) {
        super(trait, userOptions, exportTypes, messages);
    }

    @Override
    public void populateRecordFields(Model model) {
        if (!(model instanceof IntegerDatatype dao))
            return;

        TraitDetailsEntryType entryType =
            TraitDetailsEntryType.make(dao.getEntryType());
        if (!isExported(entryType))
            return;

        updateCachedDataIfNeeded(dao.getTaxonId());
        updateCollectedValues(dao);
    }

    private void updateCollectedValues(IntegerDatatype dao) {
        long taxonId = dao.getTaxonId();
        List<CellDetail> list = cachedData.get(taxonId);
        TraitDetailsEntryType entryType = TraitDetailsEntryType.make(dao.getEntryType());
        int index = computeIndexForType(entryType);

        String newValue = Integer.toString(dao.getValue());
        createOrUpdateCell(list, index, newValue);
    }
}
