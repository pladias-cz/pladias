package service.trait.detailexport.accumulators;

import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;
import play.i18n.Messages;
import service.trait.detailexport.CellDetail;
import service.trait.detailexport.CellType;
import settings.user.UserOptions;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public abstract class NumericBaseExportAccumulator extends BaseExportAccumulator {
    public NumericBaseExportAccumulator(
        Trait trait, UserOptions userOptions, Set<TraitDetailsEntryType> exportTypes, Messages messages) {
        super(trait, userOptions, exportTypes, messages);
    }

    @Override
    public List<List<CellDetail>> getColumnHeaderData(boolean isComplexExport) {

        List<List<CellDetail>> result = new ArrayList<>();
        if (isComplexExport) {
            List<CellDetail> listTraitName = getTraitNameRow();
            result.add(listTraitName);
        }

        List<CellDetail> listColumnHeaders = new ArrayList<>();

        for (int i = 0; i < columnTypeLocalizedLabels.length; i++) {
            /*EntryTypes values are 1-based*/
            if (!isExported(TraitDetailsEntryType.make(i + 1)))
                continue;

            String localizedColumnTypeName = columnTypeLocalizedLabels[i];
            listColumnHeaders.add(new CellDetail(1, localizedColumnTypeName, CellType.HeaderOriginalValue));
        }

        result.add(listColumnHeaders);

        List<CellDetail> emptyLine = getEmptyHeaderRow();
        result.add(emptyLine);

        return result;
    }

    @Override
    protected int getColumnCount() {
        return getExportTypesCount();
    }

    protected void updateCachedDataIfNeeded(long taxonId) {
        if (!cachedData.containsKey(taxonId)) {
            List<CellDetail> list = new ArrayList<>();
            for (int i = 0; i < getColumnCount(); i++) {
                list.add(NoValue);
            }
            cachedData.put(taxonId, list);
        }
    }

    protected void createOrUpdateCell(List<CellDetail> list, int index, String newValue) {
        CellDetail detail = list.get(index);

        if (detail == NoValue) {
            detail = createCellDetail(1, newValue, CellType.Data);
            list.set(index, detail);
        } else {
            detail.setText(detail.getText() + DELIMITER + newValue);
        }
    }
}
