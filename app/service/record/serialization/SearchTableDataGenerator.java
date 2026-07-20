package service.record.serialization;

import org.apache.commons.lang3.StringUtils;
import service.search.PageSearchResults;

import java.util.ArrayList;
import java.util.List;

public class SearchTableDataGenerator
    implements ISearchTableDataGenerator {
    protected List<String> recordHeaders;

    public SearchTableDataGenerator() {
        createRecordHeaders();
    }

    @Override
    public List<String> getRecordHeaders() {
        return recordHeaders;
    }

    @Override
    public List<String> prepareRecordFields(PageSearchResults.Row r) {
        List<String> list = new ArrayList<String>();
        list.add(Long.toString(r.getRecordId()));
        list.add(r.getTaxonName());
        list.add(guardNullValue(r.getTaxonNameOriginal()));
        list.add(guardNullValue(r.getLocality()));
        list.add(guardNullValue(r.getNearestTownName()));
        list.add(guardNullValue(r.getDistrictName()));
        list.add(guardNullValue(r.getAltitude()));
        list.add(Double.toString(r.getLatitude()));
        list.add(Double.toString(r.getLongitude()));
        list.add(guardNullValue(r.getGpsCoordsSource()));
        list.add(getGpsPrecision(r));
        list.add(guardNullValue(r.getDatum()));
        list.add(guardNullValue(r.getAuthors()));
        list.add(guardNullValue(r.getSource()));
        list.add(guardNullValue(r.getHerbaria()));
        list.add(guardNullValue(r.getPhytochorion()));
        list.add(guardNullValue(r.getQuadrant()));
        list.add(guardNullValue(r.getComment()));
        list.add(guardNullValue(r.getValidationStatus()));
        list.add(guardNullValue(r.getOriginality()));
        list.add(guardNullValue(r.getProject()));
        list.add(guardNullValue(r.getCommitter()));
        list.add(guardNullValue(r.getExternalId()));

        return list;
    }

    @Override
    public int getFieldsCount() {
        return recordHeaders.size();
    }

    protected String guardNullValue(String value) {
        return StringUtils.defaultIfBlank(value, "");
    }

    private void createRecordHeaders() {
        recordHeaders = new ArrayList<String>();
        recordHeaders.add("ID");
        recordHeaders.add("jméno stand.");
        recordHeaders.add("jméno orig.");
        recordHeaders.add("lokalita");
        recordHeaders.add("nejbližší obec");
        recordHeaders.add("okres");
        recordHeaders.add("nadmořská výška");
        recordHeaders.add("souřadnice lat");
        recordHeaders.add("souřadnice lon");
        recordHeaders.add("zdroj souřadnic");
        recordHeaders.add("přesnost souřadnic");
        recordHeaders.add("datum");
        recordHeaders.add("nálezce");
        recordHeaders.add("pramen");
        recordHeaders.add("herbář");
        recordHeaders.add("fytochorion");
        recordHeaders.add("kvadrant");
        recordHeaders.add("poznámka");
        recordHeaders.add("validační stav");
        recordHeaders.add("originalita");
        recordHeaders.add("projekt");
        recordHeaders.add("nahrál");
        recordHeaders.add("externí ID");
    }

    private String getGpsPrecision(PageSearchResults.Row r) {
        String gpsPrecision = "";
        if (r.getGpsCoordsPrecision() != null) {
            gpsPrecision = Integer.toString(r.getGpsCoordsPrecision());
        }
        return gpsPrecision;
    }

}
