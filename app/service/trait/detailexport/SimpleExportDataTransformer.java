package service.trait.detailexport;

import models.Taxon;
import models.traits.Trait;
import service.trait.detailexport.accumulators.IExportAccumulator;
import service.trait.detailexport.accumulators.TaxonDetailsProvider;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class SimpleExportDataTransformer implements IExportDataTransformer {

    private static final CellDetail EmptyHeaderCell = new CellDetail(1, "", CellType.HeaderTaxonInfo);
    private final IExportAccumulator accumulator;
    private final Trait trait;

    public SimpleExportDataTransformer(Trait trait, IExportAccumulator accumulator) {
        this.trait = trait;
        this.accumulator = accumulator;
    }

    public List<List<CellDetail>> collectData() {
        List<List<CellDetail>> result = new ArrayList<List<CellDetail>>();
        populateInitialDetails(result);
        populateColumnHeaderDetails(result);
        populateTaxonDetails(result);
        return result;
    }

    private void populateTaxonDetails(List<List<CellDetail>> result) {
        Map<Long, List<CellDetail>> rawDataMap = accumulator.getRawData();
        List<Long> sortedTaxonList = accumulator.getOrderedTaxonList();
        for (Long taxonId : sortedTaxonList) {
            List<CellDetail> resultRow = TaxonDetailsProvider.populateCommonRecordFields(Taxon.find().byId(taxonId));
            List<CellDetail> taxonDataRow = rawDataMap.get(taxonId);
            if (taxonDataRow != null)
                resultRow.addAll(taxonDataRow);
            result.add(resultRow);
        }
    }

    private void populateColumnHeaderDetails(List<List<CellDetail>> result) {

        List<String> commonHeaderNames = TaxonDetailsProvider.getCommonRecordHeaders();
        List<List<CellDetail>> headerRows = accumulator.getColumnHeaderData(false);
        for (int i = 0; i < headerRows.size(); i++) {
            List<CellDetail> columnHeaderRow = null;
            if (i < headerRows.size() - 1) {
                columnHeaderRow = prepopulateWithEmptyCells(headerRows.get(i), commonHeaderNames.size());
            } else {
                columnHeaderRow = populateWithCommonHeaderNames(headerRows.get(i), commonHeaderNames);
            }

            result.add(columnHeaderRow);
        }
    }

    private List<CellDetail> populateWithCommonHeaderNames(List<CellDetail> headerRow, List<String> commonHeaderNames) {
        List<CellDetail> result = new ArrayList<CellDetail>();
        for (String s : commonHeaderNames) {
            result.add(new CellDetail(1, s, CellType.HeaderTaxonInfo));
        }
        result.addAll(headerRow);
        return result;
    }

    private List<CellDetail> prepopulateWithEmptyCells(List<CellDetail> headerRow, int size) {
        List<CellDetail> result = new ArrayList<CellDetail>();
        for (int i = 0; i < size; i++) {
            result.add(EmptyHeaderCell);//prepopulate with empty cells
        }
        result.addAll(headerRow);
        return result;
    }

    private void populateInitialDetails(List<List<CellDetail>> result) {
        List<CellDetail> list = new ArrayList<CellDetail>();
        list.add(new CellDetail(1, trait.getSource() + ", " + trait.getFeature().getDescriptionCz(), CellType.HeaderTaxonInfo));
        result.add(list);

        for (int i = 0; i < 2; i++) {
            list = new ArrayList<CellDetail>();
            list.add(new CellDetail(1, "", CellType.HeaderTaxonInfo));
            result.add(list);
        }
    }
}
