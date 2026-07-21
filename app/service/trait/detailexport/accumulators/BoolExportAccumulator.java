package service.trait.detailexport.accumulators;

import io.ebean.Model;
import models.traits.BoolDatatype;
import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;
import play.i18n.Messages;
import service.trait.detailexport.CellDetail;
import service.trait.detailexport.CellType;
import settings.user.UserOptions;

import java.util.*;

public class BoolExportAccumulator extends BaseExportAccumulator {

    private final Map<Long, List<Set<Boolean>>> collectedValues = new HashMap<>();

    public BoolExportAccumulator(
        Trait trait, UserOptions userOptions, Set<TraitDetailsEntryType> exportTypes, Messages messages) {
        super(trait, userOptions, exportTypes, messages);
    }

    @Override
    public List<List<CellDetail>> getColumnHeaderData(boolean isComplexExport) {
        List<List<CellDetail>> result = new ArrayList<>();
        List<CellDetail> list = new ArrayList<>();

        if (isComplexExport) {
            List<CellDetail> listTraitName = getTraitNameRow();
            result.add(listTraitName);
        }
        for (int i = 0; i < columnTypeLocalizedLabels.length; i++) {
            /*EntryTypes values are 1-based*/
            if (!isExported(TraitDetailsEntryType.make(i + 1)))
                continue;

            String localizedColumnTypeName = columnTypeLocalizedLabels[i];
            list.add(createCellDetail(1, localizedColumnTypeName, CellType.HeaderOriginalValue));
        }

        result.add(list);

        List<CellDetail> emptyLine = getEmptyHeaderRow();
        result.add(emptyLine);

        return result;
    }

    @Override
    public void populateRecordFields(Model model) {
        if (!(model instanceof BoolDatatype datatype))
            return;

        TraitDetailsEntryType entryType = TraitDetailsEntryType.make(
            datatype.getDatatypePk().getEntryType());
        if (!isExported(entryType))
            return;

        initializeTaxonRowIfNeeded(datatype.getDatatypePk().getTaxonId());
        updateCollectedValues(datatype);
    }

    @Override
    public Map<Long, List<CellDetail>> getRawData() {
        for (long taxonId : taxonIdsOrderedByLeft) {
            populateCachedData(taxonId);
        }
        return Collections.unmodifiableMap(cachedData);
    }

    @Override
    protected int getColumnCount() {
        return getExportTypesCount();
    }

    private List<CellDetail> populateCachedData(long taxonId) {
        initializeTaxonRowIfNeeded(taxonId);
        List<CellDetail> values = cachedData.get(taxonId);

        List<Set<Boolean>> list = collectedValues.get(taxonId);

        if (list == null) {
            populateTaxonRowWithNulls(values);
        } else {
            populateTaxonRow(list, values);
        }
        return values;
    }

    private void populateTaxonRow(List<Set<Boolean>> list, List<CellDetail> values) {
        for (int i = 0; i < getColumnCount(); i++) {
            Set<Boolean> set = list.get(i);
            if (set.isEmpty()) {
                values.add(createCellDetail(1, userOptions.getNullSubstitution(), CellType.Data));
                continue;
            }

            StringBuilder builder = new StringBuilder("");
            for (Boolean b : set) {
                builder.append(userOptions.boolToUserString(b)).append(";");
            }
            if (!builder.isEmpty()) {
                builder.setLength(builder.length() - 1);
            }
            values.add(createCellDetail(1, builder.toString(), CellType.Data));
        }
    }

    private void populateTaxonRowWithNulls(List<CellDetail> values) {
        for (int i = 0; i < getColumnCount(); i++) {
            CellDetail detail = createCellDetail(1, userOptions.getNullSubstitution(), CellType.Data);
            values.add(detail);
        }
    }

    private void updateCollectedValues(BoolDatatype datatype) {
        long taxonId = datatype.getDatatypePk().getTaxonId();
        createCollectedValuesEntryIfNeeded(taxonId);
        List<Set<Boolean>> list = collectedValues.get(taxonId);
        int index = computeIndexForType(TraitDetailsEntryType.make(
            datatype.getDatatypePk().getEntryType()));
        Set<Boolean> set = list.get(index);
        set.add(datatype.isValue());
    }

    private void createCollectedValuesEntryIfNeeded(long taxonId) {
        if (!collectedValues.containsKey(taxonId)) {
            List<Set<Boolean>> list = new ArrayList<>();
            for (int i = 0; i < getColumnCount(); i++) {
                list.add(new HashSet<>());
            }
            collectedValues.put(taxonId, list);
        }
    }

    private void initializeTaxonRowIfNeeded(long taxonId) {
        if (!cachedData.containsKey(taxonId)) {
            cachedData.put(taxonId, new ArrayList<>());
        }
    }


}
