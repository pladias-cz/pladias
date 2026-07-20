package service.trait.detailexport.accumulators;

import io.ebean.Model;
import models.traits.DistributionDatatype;
import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;
import play.i18n.Messages;
import service.trait.detailexport.CellDetail;
import service.trait.detailexport.CellType;
import settings.user.UserOptions;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;


public class DistributionExportAccumulator extends BaseExportAccumulator {
    public DistributionExportAccumulator(
        Trait trait,
        UserOptions userOptions,
        Set<TraitDetailsEntryType> exportTypes,
        Messages messages) {
        super(trait, userOptions, exportTypes, messages);
    }

    @Override
    public void populateRecordFields(Model model) {
        if (!(model instanceof DistributionDatatype dao))
            return;

        TraitDetailsEntryType entryType =
            TraitDetailsEntryType.make(dao.getEntryType());
        if (!isExported(entryType))
            return;

        populateCachedData(dao.getTaxonId());
        updateCollectedValues(dao);
    }

    private void populateCachedData(long taxonId) {
        if (!cachedData.containsKey(taxonId)) {
            List<CellDetail> list = new ArrayList<CellDetail>();
            for (int i = 0; i < getColumnCount(); i++) {
                list.add(NoValue);
            }
            cachedData.put(taxonId, list);
        }
    }

    private void updateCollectedValues(DistributionDatatype dao) {
        long taxonId = dao.getTaxonId();
        List<CellDetail> list = cachedData.get(taxonId);
        TraitDetailsEntryType entryType = TraitDetailsEntryType.make(dao.getEntryType());
        int index = computeIndexForType(entryType);

        String newValue = Integer.toString(dao.getSquaresCount());
        createCell(list, index, newValue);
        newValue = Integer.toString(dao.getQuadrantsCount());
        createCell(list, index + 1, newValue);
    }

    @Override
    protected int computeIndexForType(TraitDetailsEntryType entryType) {
        //each entry type occupies 2 columns
        return super.computeIndexForType(entryType) * 2;
    }


    protected void createCell(List<CellDetail> list, int index, String newValue) {
        CellDetail detail = createCellDetail(1, newValue, CellType.Data);
        list.set(index, detail);
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
            for (int j = 0; j < 2; j++) {
                rowTypes.add(createCellDetail(1, localizedColumnTypeName, CellType.HeaderOriginalValue));
            }
            generateRowDetails(rowValues);
        }

        return result;
    }

    private void generateRowDetails(List<CellDetail> rowValues) {
        String localizedQuadrantColumnName = userOptions.displayApplicationInEnglish()
            ? messages.at("TaxonDistributionExportAccumulator.quadrants.en")
            : messages.at("TaxonDistributionExportAccumulator.quadrants");

        String localizedSquareColumnName = userOptions.displayApplicationInEnglish()
            ? messages.at("TaxonDistributionExportAccumulator.squares.en")
            : messages.at("TaxonDistributionExportAccumulator.squares");

        rowValues.add(createCellDetail(1, localizedSquareColumnName, CellType.HeaderOriginalValue));
        rowValues.add(createCellDetail(1, localizedQuadrantColumnName, CellType.HeaderOriginalValue));
    }

    @Override
    protected int getColumnCount() {
        return 2 * getExportTypesCount();
    }
}
