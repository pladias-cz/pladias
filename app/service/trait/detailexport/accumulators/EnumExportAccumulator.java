package service.trait.detailexport.accumulators;

import io.ebean.Model;
import models.traits.*;
import models.traitsExport.TraitDetailsEntryType;
import play.i18n.Messages;
import service.trait.collect.EnumTraitDictionary;
import service.trait.detailexport.CellDetail;
import service.trait.detailexport.CellType;
import settings.user.UserOptions;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public class EnumExportAccumulator extends BaseExportAccumulator {

    private final Enumerate enumerate;
    private final EnumTraitDictionary dictionary;

    public EnumExportAccumulator(
        Trait trait, UserOptions userOptions,
        Set<TraitDetailsEntryType> exportTypes, Messages messages) {
        super(trait, userOptions, exportTypes, messages);
        this.enumerate = trait.getFeature().getEnumerate();
        this.dictionary = new EnumTraitDictionary(trait.getFeature().getDatatype(), enumerate);
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
            for (int j = 0; j < enumerate.getEnumerateValues().size(); j++) {
                rowTypes.add(createCellDetail(1, localizedColumnTypeName, CellType.HeaderOriginalValue));
            }
            for (EnumerateValue value : enumerate.getEnumerateValues()) {
                rowValues.add(buildCellDetails(1, value, CellType.HeaderOriginalValue));
            }
        }

        return result;
    }

    private CellDetail buildCellDetails(int colSpan, EnumerateValue enumVal, CellType cellType) {
        String value = userOptions.displayInEnglish() ? enumVal.getNameEn() : enumVal.getNameCz();
        return createCellDetail(colSpan, value, cellType);
    }

    @Override
    protected int getColumnCount() {
        return enumerate.getEnumerateValues().size() * getExportTypesCount();
    }

    @Override
    public void populateRecordFields(Model model) {

        if (!(model instanceof EnumerateDatatype datatype))
            return;
        EnumerateDatatypePK pk = datatype.getDatatypePk();

        int entryType = pk.getEntryType();
        if (!isExported(TraitDetailsEntryType.make(entryType)))
            return;

        long taxonId = pk.getTaxonId();
        if (!cachedData.containsKey(taxonId)) {
            List<CellDetail> list = new ArrayList<CellDetail>();
            for (int i = 0; i < enumerate.getEnumerateValues().size() * getExportTypesCount(); i++) {
                list.add(NoValue);
            }
            cachedData.put(taxonId, list);
        }
        List<CellDetail> list = cachedData.get(taxonId);
        int index = computeArrayIndex(datatype);
        list.set(index, new CellDetail(1, userOptions.boolToUserString(pk.isEnabled()), CellType.Data));
    }

    private int computeArrayIndex(EnumerateDatatype datatype) {
        int offsetBase = computeIndexForType(TraitDetailsEntryType.make(datatype.getDatatypePk().getEntryType()));
        int enumValue = datatype.getDatatypePk().getValue();
        int offset = dictionary.getOrderFromId(enumValue);
        return offset + enumerate.getEnumerateValues().size() * offsetBase;
    }
}
