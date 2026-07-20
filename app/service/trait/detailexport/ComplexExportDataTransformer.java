package service.trait.detailexport;

import models.Taxon;
import service.trait.detailexport.accumulators.TaxonDetailsProvider;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ComplexExportDataTransformer implements IExportDataTransformer {
    private final static CellDetail EmptyCell = new CellDetail(1, "", CellType.HeaderTaxonInfo);
    private final List<Taxon> sortedTaxons;
    private final List<List<CellDetail>> headers = new ArrayList<List<CellDetail>>();
    private final Map<Long, List<CellDetail>> taxonDetails = new HashMap<Long, List<CellDetail>>();

    public ComplexExportDataTransformer(List<Taxon> sortedTaxons) {
        this.sortedTaxons = sortedTaxons;
        prepopulateHeaderWithTaxonDetails();
        prepopulateMapWithTaxonValues();
    }

    private void prepopulateMapWithTaxonValues() {

        for (Taxon t : sortedTaxons) {
            List<CellDetail> list = TaxonDetailsProvider.populateCommonRecordFields(t);
            taxonDetails.put(t.getId(), list);
        }
    }

    private void prepopulateHeaderWithTaxonDetails() {

        List<String> headerValues = TaxonDetailsProvider.getCommonRecordHeaders();

        List<CellDetail> list1 = new ArrayList<CellDetail>();
        List<CellDetail> list2 = new ArrayList<CellDetail>();
        for (int i = 0; i < headerValues.size(); i++) {
            list1.add(EmptyCell);
            list2.add(EmptyCell);
        }
        headers.add(list1);
        headers.add(list2);

        List<CellDetail> list3 = new ArrayList<CellDetail>();
        for (String value : headerValues) {
            list3.add(new CellDetail(1, value, CellType.HeaderTaxonInfo));
        }

        headers.add(list3);
    }

    public void recordData(long taxonId, List<CellDetail> list) {
        List<CellDetail> row = taxonDetails.get(taxonId);
        if (row == null) {
            row = new ArrayList<CellDetail>();
            taxonDetails.put(taxonId, row);
        }
        row.addAll(list);
    }

    public void recordHeaders(List<List<CellDetail>> headerData) {
        while (headerData.size() < headers.size()) {
            headerData.add(new ArrayList<CellDetail>());
        }
        for (int i = 0; i < headers.size(); i++) {
            List<CellDetail> source = headerData.get(i);
            List<CellDetail> target = this.headers.get(i);
            target.addAll(source);
        }
    }

    @Override
    public List<List<CellDetail>> collectData() {

        List<List<CellDetail>> result = new ArrayList<List<CellDetail>>();
        collectHeaders(result);
        collectTaxonData(result);
        return result;
    }

    private void collectTaxonData(List<List<CellDetail>> result) {
        for (Taxon taxon : sortedTaxons) {
            List<CellDetail> detail = taxonDetails.get(taxon.getId());
            result.add(detail);
        }
    }

    private void collectHeaders(List<List<CellDetail>> result) {
        for (List<CellDetail> header : headers) {
            result.add(header);
        }
    }
}
