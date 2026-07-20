package service.taxon;

import models.MapType;

import java.util.List;

public interface IMapRecordSelectionFilter {
    long getCoreTaxonId();

    List<Long> getTaxonIds();

    int getCommonThreshold();

    MapType getMapType();
}
