package service.trait.detailexport.accumulators;

import io.ebean.Model;
import models.traits.MonthDatatype;
import models.traits.MonthDatatypePK;
import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;
import org.apache.commons.lang3.tuple.Pair;
import play.i18n.Messages;
import service.trait.detailexport.CellDetail;
import service.trait.detailexport.CellType;
import settings.user.UserOptions;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public class MonthExportAccumulator extends TriStateExportAccumulator {
    public MonthExportAccumulator(
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

        List<CellDetail> rowTypes = new ArrayList<>();
        List<CellDetail> rowValues = new ArrayList<>();
        result.add(rowTypes);
        result.add(rowValues);

        for (int i = 0; i < columnTypeLocalizedLabels.length; i++) {
            /*EntryTypes values are 1-based*/
            if (!isExported(TraitDetailsEntryType.make(i + 1)))
                continue;

            String localizedColumnTypeName = columnTypeLocalizedLabels[i];
            for (int j = 0; j < MonthDatatype.MONTH_COUNT; j++) {
                rowTypes.add(new CellDetail(1, localizedColumnTypeName, CellType.HeaderOriginalValue));
                rowValues.add(new CellDetail(1, Integer.toString(j + 1), CellType.HeaderOriginalValue));
            }
        }
        return result;
    }

    @Override
    public void populateRecordFields(Model model) {

        if (!(model instanceof MonthDatatype dao))
            return;

        MonthDatatypePK daoPk = dao.getDatatypePk();

        TraitDetailsEntryType entryType =
            TraitDetailsEntryType.make(daoPk.getEntryType());
        if (!isExported(entryType))
            return;

        long taxonId = daoPk.getTaxonId();
        if (!cachedData.containsKey(taxonId)) {
            List<CellDetail> list = new ArrayList<>();
            for (int i = 0; i < getColumnCount(); i++) {
                list.add(NoValue);
            }
            cachedData.put(taxonId, list);
        }
        List<CellDetail> list = cachedData.get(taxonId);
        Pair<Integer, Integer> monthIndexRange = computeArrayIndexRange(dao, entryType);
        for (int i = monthIndexRange.getLeft(); i <= monthIndexRange.getRight(); i++) {
            list.set(i, new CellDetail(1, userOptions.boolToUserString(true), CellType.Data));
        }
    }

    @Override
    protected int getColumnCount() {
        return MonthDatatype.MONTH_COUNT * getExportTypesCount();
    }

    private Pair<Integer, Integer> computeArrayIndexRange(MonthDatatype dao, TraitDetailsEntryType entryType) {
        MonthDatatypePK daoPk = dao.getDatatypePk();
        int monthMin = daoPk.getMinimum();
        int monthMax = daoPk.getMaximum();
        int base = computeIndexForType(entryType);
        return Pair.of(base * MonthDatatype.MONTH_COUNT + monthMin - 1, base * MonthDatatype.MONTH_COUNT + monthMax - 1);
    }

    @Override
    protected int getBlockSize() {
        return MonthDatatype.MONTH_COUNT;
    }
}
