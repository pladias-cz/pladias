package service.trait.detailexport.accumulators;

import io.ebean.Model;
import models.traits.DatatypePK;
import models.traits.IntervalAvgDatatype;
import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;
import play.i18n.Messages;
import service.trait.detailexport.CellDetail;
import service.trait.detailexport.CellType;
import settings.user.UserOptions;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public class AvgExportAccumulator extends BaseExportAccumulator {

    final static String[] keys = {
        "IntAvgSerializer.MinValueText",
        "IntAvgSerializer.MaxValueText",
        "IntAvgSerializer.ExtremeMinValueText",
        "IntAvgSerializer.ExtremeMaxValueText",
        "IntAvgSerializer.MeanValueText",
        "IntAvgSerializer.StandardMeanErrorValueText"
    };

    public AvgExportAccumulator(
        Trait trait, UserOptions userOptions, Set<TraitDetailsEntryType> exportTypes, Messages messages) {
        super(trait, userOptions, exportTypes, messages);
    }

    @Override
    public List<List<CellDetail>> getColumnHeaderData(boolean isComplexExport) {
        List<List<CellDetail>> result = new ArrayList<List<CellDetail>>();

        if (isComplexExport) {
            List<CellDetail> listTraitName = getTraitNameRow();
            result.add(listTraitName);
        }

        List<CellDetail> rowTypes = new ArrayList<CellDetail>();
        List<CellDetail> rowValues = new ArrayList<CellDetail>();
        result.add(rowTypes);
        result.add(rowValues);

        for (int i = 0; i < columnTypeLocalizedLabels.length; i++) {
            /*EntryTypes values are 1-based*/
            if (!isExported(TraitDetailsEntryType.make(i + 1)))
                continue;

            String localizedColumnTypeName = columnTypeLocalizedLabels[i];
            for (int j = 0; j < keys.length; j++) {
                rowTypes.add(createCellDetail(1, localizedColumnTypeName, CellType.HeaderOriginalValue));
                rowValues.add(createCellDetail(1, messages.at(keys[j]), CellType.HeaderTaxonInfo));
            }
        }

        return result;
    }

    @Override
    protected int getColumnCount() {
        return keys.length * getExportTypesCount();
    }

    @Override
    public void populateRecordFields(Model model) {
        if (!(model instanceof IntervalAvgDatatype dao))
            return;

        DatatypePK primaryKey = dao.getDatatypePk();
        TraitDetailsEntryType entryType = TraitDetailsEntryType.make(primaryKey.getEntryType());
        if (!isExported(entryType))
            return;

        long taxonId = dao.getDatatypePk().getTaxonId();
        if (!cachedData.containsKey(taxonId)) {
            List<CellDetail> list = new ArrayList<CellDetail>();
            for (int i = 0; i < getColumnCount(); i++) {
                list.add(NoValue);
            }
            cachedData.put(taxonId, list);
        }
        List<CellDetail> list = cachedData.get(taxonId);
        int baseIndex = computeBaseArrayIndex(primaryKey);

        Double[] rawValues = new Double[]{
            dao.getMinimum(), dao.getMaximum(),
            dao.getExtremeMinimum(), dao.getExtremeMaximum(),
            dao.getMean(), dao.getStandardMeanError()
        };

        for (int i = 0; i < rawValues.length; i++) {
            Double rawValue = rawValues[i];
            String targetValue = (rawValue == null)
                ? userOptions.getNullSubstitution()
                : Double.toString(rawValue);

            list.set(baseIndex + i,
                new CellDetail(1, targetValue, CellType.Data));
        }
    }

    private int computeBaseArrayIndex(DatatypePK datatypePk) {
        TraitDetailsEntryType type = TraitDetailsEntryType.make(datatypePk.getEntryType());
        int base = computeIndexForType(type);
        int offset = keys.length * base;
        return offset;
    }

}
