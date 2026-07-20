package service.record.serialization;

import models.Phytochorion;
import models.QuadrantNew;
import models.Record;
import models.User;
import org.apache.commons.lang3.StringUtils;
import serializers.AuthorsSerializer;
import serializers.HerbariumsSerializer;
import serializers.QuadrantsSerializer;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class ExtendedRecordTableDataGenerator
    implements IRecordTableDataGenerator {
    protected List<String> recordHeaders;

    public ExtendedRecordTableDataGenerator() {
        createRecordHeaders();
    }

    @Override
    public List<String> getRecordHeaders() {
        return recordHeaders;
    }

    @Override
    public List<String> prepareRecordFields(Record r) {
        List<String> list = new ArrayList<String>();
        list.add(Long.toString(r.getId()));
        list.add(r.getTaxon().getNameLat());
        list.add(guardNullValue(r.getOriginalName()));
        list.add(guardNullValue(r.getLocality()));
        list.add(StringUtils.isNotBlank(r.getNearestTownText()) ? r.getNearestTownText() : r.getNearestTownName());
        list.add(r.getDistrict() != null ? r.getDistrict().getName() : "");
        list.add(getAltitudeString(r));
        list.add(guardNullValue(r.getLatitude()));
        list.add(guardNullValue(r.getLongitude()));
        list.add(guardNullValue(r.getGpsCoordSource()));
        list.add(getGpsPrecision(r));
        list.add(r.getDateSpecifier() != null ? r.getDateSpecifier().toString() : "");
        list.add(AuthorsSerializer.serialize(r.getAuthorsSorted(), false));
        list.add(guardNullValue(r.getSource()));
        list.add(HerbariumsSerializer.serialize(r.getHerbariums()));
        list.add(getPhytochorion(r));
        list.add(getQuadrant(r));
        list.add(guardNullValue(r.getComment()));
        list.add(r.getValidationStatus() != null ? r.getValidationStatus().getDescription() : "");
        list.add(r.getOriginalityStatus().getName());
        list.add(r.getProject().getName());
        list.add(getCommitter(r));
        list.add(guardNullValue(r.getOriginalId()));

        return list;
    }

    @Override
    public int getFieldsCount() {
        return recordHeaders.size();
    }

    protected String guardNullValue(String value) {
        return StringUtils.defaultIfBlank(value, "");
    }

    protected String guardNullValue(Double value) {
        return (value == null) ? "" : Double.toString(value);
    }

    private String getCommitter(Record r) {
        User committer = r.getBatch().getCommitter();
        if (committer == null) return "";
        return committer.getSurname() + ", " + committer.getName();
    }

    private String getQuadrant(Record r) {
        Optional<QuadrantNew> quadrant = r.getQuadrant();
        if (quadrant.isPresent()) {
            return QuadrantsSerializer.serialize(quadrant.get());
        }
        return "";
    }

    private String getPhytochorion(Record r) {
        if (r.getPhytochorion() != null) {
            Phytochorion phyto = r.getPhytochorion();
            return String.format("%s. %s", phyto.getPhytoId(), phyto.getName());
        }
        return "";
    }

    private String getGpsPrecision(Record r) {
        String gpsPrecision = "";
        if (r.getGpsCoordsPrecision() != null) {
            gpsPrecision = Integer.toString(r.getGpsCoordsPrecision());
        }
        return gpsPrecision;
    }

    private String getAltitudeString(Record r) {
        if (r.getAltitudeMin() == null)
            return "";

        if (r.getAltitudeMin().equals(r.getAltitudeMax())) {
            return Integer.toString(r.getAltitudeMin());
        }
        return String.format("%d-%d", r.getAltitudeMin(), r.getAltitudeMax());
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
}
