package service.trait.detailexport.accumulators;

import io.ebean.Model;
import models.traits.*;
import models.traitsExport.TraitDetailsEntryType;
import play.i18n.Messages;
import service.trait.detailexport.CellDetail;
import service.trait.detailexport.CellType;
import settings.user.UserOptions;

import java.util.*;

public class EnumOrdinalExportAccumulator extends BaseExportAccumulator {

    private final Map<Integer, EnumerateValue> enumValueDictionary;

    public EnumOrdinalExportAccumulator(
        Trait trait, UserOptions userOptions, Set<TraitDetailsEntryType> exportTypes, Messages messages) {
        super(trait, userOptions, exportTypes, messages);
        this.enumValueDictionary = populateEnumValDictionary(trait.getFeature().getEnumerate());
    }

    private Map<Integer, EnumerateValue> populateEnumValDictionary(Enumerate enumerate) {
        Map<Integer, EnumerateValue> result = new HashMap<>();
        for (EnumerateValue value : enumerate.getEnumerateValues()) {
            result.put(value.getId(), value);
        }
        return result;
    }

    @Override
    public List<List<CellDetail>> getColumnHeaderData(boolean isComplexExport) {
        List<List<CellDetail>> result = new ArrayList<List<CellDetail>>();

        if (isComplexExport) {
            List<CellDetail> listTraitName = getTraitNameRow();
            result.add(listTraitName);
        }

        List<CellDetail> rowTypes = new ArrayList<CellDetail>();
        result.add(rowTypes);

        for (int i = 0; i < columnTypeLocalizedLabels.length; i++) {
            /*EntryTypes values are 1-based*/
            if (!isExported(TraitDetailsEntryType.make(i + 1)))
                continue;

            String localizedColumnTypeName = columnTypeLocalizedLabels[i];
            rowTypes.add(createCellDetail(1, localizedColumnTypeName, CellType.HeaderOriginalValue));
        }

        List<CellDetail> emptyRow = getEmptyHeaderRow();
        result.add(emptyRow);
        return result;
    }

    @Override
    protected int getColumnCount() {
        return getExportTypesCount();
    }

    @Override
    public void populateRecordFields(Model model) {

        if (!(model instanceof EnumerateDatatype enumDt))
            return;
        EnumerateDatatypePK enumDtPk = enumDt.getDatatypePk();

        int entryType = enumDtPk.getEntryType();
        if (!enumDtPk.isEnabled())
            return;
        if (!isExported(TraitDetailsEntryType.make(entryType)))
            return;

        long taxonId = enumDtPk.getTaxonId();
        if (!cachedData.containsKey(taxonId)) {
            List<CellDetail> list = new ArrayList<CellDetail>();
            for (int i = 0; i < getExportTypesCount(); i++) {
                list.add(NoValue);
            }
            cachedData.put(taxonId, list);
        }
        List<CellDetail> list = cachedData.get(taxonId);
        int index = computeArrayIndex(entryType);
        EnumerateValue enumValue = enumValueDictionary.get(enumDtPk.getValue());
        createOrUpdateCell(list, index, enumValue);
    }

    protected void createOrUpdateCell(List<CellDetail> list, int index, EnumerateValue value) {
        CellDetail detail = list.get(index);
        String enumString = enumToString(value);

        if (detail == NoValue) {
            detail = createCellDetail(1, enumString, CellType.Data);
            list.set(index, detail);
        } else {
            detail.setText(detail.getText() + DELIMITER + enumString);
        }
    }

    private String enumToString(EnumerateValue enumVal) {
        return userOptions.displayInEnglish() ? enumVal.getNameEn() : enumVal.getNameCz();
    }

    private int computeArrayIndex(int entryType) {
        int columns = 0;
        for (int i = 1; i <= entryType; i++) {
            if (isExported(TraitDetailsEntryType.make(i))) {
                columns++;
            }
        }

        return columns - 1;
    }

}
