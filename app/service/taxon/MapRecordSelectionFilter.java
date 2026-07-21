package service.taxon;

import models.MapType;
import models.TaxonMapSettings;

import java.util.ArrayList;
import java.util.List;

public class MapRecordSelectionFilter implements IMapRecordSelectionFilter {
    private final TaxonMapSettings settings;

    public MapRecordSelectionFilter(TaxonMapSettings settings) {
        if (settings == null)
            throw new IllegalArgumentException("settings");
        this.settings = settings;
    }

    @Override
    public List<Long> getTaxonIds() {
        List<Long> result = new ArrayList<>();
        result.add(settings.getId());
        for (TaxonMapSettings s : settings.getAggregatedChildren()) {
            result.add(s.getId());
        }
        return result;
    }

    @Override
    public int getCommonThreshold() {
        return settings.getCommonThreshold();
    }

    @Override
    public long getCoreTaxonId() {
        return settings.getId();
    }

    @Override
    public MapType getMapType() {
        int mapTypeId = settings.getMapType();
        return MapType.findById(mapTypeId);
    }
}

