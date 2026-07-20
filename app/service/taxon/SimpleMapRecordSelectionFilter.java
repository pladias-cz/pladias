package service.taxon;

import models.MapType;

import java.util.ArrayList;
import java.util.List;

public class SimpleMapRecordSelectionFilter implements IMapRecordSelectionFilter {
    private final int commonThreshold;
    private final long taxonId;
    private final MapType mapType;

    public SimpleMapRecordSelectionFilter(int commonThreshold,
                                          long taxonId, MapType mapType) {
        this.commonThreshold = commonThreshold;
        this.taxonId = taxonId;
        this.mapType = mapType;
    }

    @Override
    public List<Long> getTaxonIds() {
        ArrayList<Long> result = new ArrayList<>();
        result.add(taxonId);
        return result;
    }

    @Override
    public int getCommonThreshold() {
        return commonThreshold;
    }

    @Override
    public long getCoreTaxonId() {
        return taxonId;
    }

    @Override
    public MapType getMapType() {
        return mapType;
    }
}
