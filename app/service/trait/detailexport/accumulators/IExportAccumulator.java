package service.trait.detailexport.accumulators;

import io.ebean.Model;
import service.trait.detailexport.CellDetail;

import java.util.List;
import java.util.Map;

public interface IExportAccumulator {

    List<List<CellDetail>> getColumnHeaderData(boolean isComplexExport);

    void registerTaxons(List<Long> taxonIds);

    void populateRecordFields(Model model);

    Map<Long, List<CellDetail>> getRawData();

    List<Long> getOrderedTaxonList();
}
