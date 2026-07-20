package service.trait.detailexport.accumulators;

import models.Taxon;
import service.trait.detailexport.CellDetail;
import service.trait.detailexport.CellType;

import java.util.ArrayList;
import java.util.List;

public class TaxonDetailsProvider {

    public static List<String> getCommonRecordHeaders() {
        List<String> list = new ArrayList<String>();
        list.add("lat_name");
        list.add("pladias_id");
        list.add("lft");
        list.add("rgt");
        list.add("rank");
        list.add("suppressed");

        return list;
    }

    public static List<CellDetail> populateCommonRecordFields(Taxon taxon) {
        List<CellDetail> list = new ArrayList<CellDetail>();

        list.add(new CellDetail(1, taxon.getNameLat(), CellType.Data));
        list.add(new CellDetail(1, Long.toString(taxon.getId()), CellType.Data));
        list.add(new CellDetail(1, Integer.toString(taxon.getLeft()), CellType.Data));
        list.add(new CellDetail(1, Integer.toString(taxon.getRight()), CellType.Data));
        list.add(new CellDetail(1, taxon.getRank().getNameEng(), CellType.Data));
        list.add(new CellDetail(1, Boolean.toString(taxon.isSuppressed()), CellType.Data));
        return list;
    }
}
