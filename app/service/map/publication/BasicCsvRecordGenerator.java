package service.map.publication;

import models.*;
import models.Record;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import serializers.AuthorsSerializer;
import serializers.CsvSerializer;
import serializers.HerbariumsSerializer;
import utils.records.RecordQuadrantDistribution;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class BasicCsvRecordGenerator {
    final static Logger logger = LoggerFactory.getLogger(BasicCsvRecordGenerator.class);


    public byte[] convertToCsvData(List<RecordQuadrantDistribution> recordQuadrantDistribution, TaxonMapSettings settings) throws IOException {

        ByteArrayOutputStream bas = new ByteArrayOutputStream();
        try (CsvSerializer mapRecData = new CsvSerializer(bas)) {
            mapRecData.printLine(getRecordHeaders());
            for (RecordQuadrantDistribution rqd : recordQuadrantDistribution) {
                QuadrantNew q = rqd.getQuadrant();
                for (Record r : rqd.getRecords()) {
                    List<String> values = prepareRecordFields(r, settings, q, rqd.getHighestValidationStatus());
                    mapRecData.printLine(values);
                }
            }
        }
        return bas.toByteArray();
    }

    private List<String> getRecordHeaders() {
        List<String> list = new ArrayList<String>();
        list.add("recordID");
        list.add("zdroj");
        list.add("stav_validace");
        list.add("herb_kvalita");
        list.add("souradnice");
        list.add("kvadrant");
        list.add("presnost_souradnic");
        list.add("lokalita");
        list.add("nalezci");
        list.add("datum");
        list.add("herbare");
        list.add("map_type");
        list.add("revisors_comment");
        list.add("quadrant_validation_status");
        list.add("puvodni_jmeno");
        list.add("fytochorion");
        list.add("nadmorska_vyska_min");
        list.add("nadmorska_vyska_max");
        list.add("puvodnost_vyskytu");
        list.add("projekt");
        list.add("originalni_id");
        list.add("poznamka");
        list.add("chranena_lokalita");
        list.add("nejblizsi_obec");
        return list;
    }

    private List<String> prepareRecordFields(Record record, TaxonMapSettings settings, QuadrantNew q,
                                             RecordValidationStatus quadrantHighestValidationStatus) {
        try {
            List<String> list = new ArrayList<String>();
            list.add(record.getId().toString());
            list.add(StringUtils.defaultString(record.getSource()));
            list.add(record.getValidationStatus().getDescription());
            list.add(Boolean.toString(record.isHerbariumQuality()));
            list.add(record.hasCoords() ?
                Double.toString(record.getLongitude()) + "," + Double.toString(record.getLatitude()) :
                ",");
            list.add(q != null ? q.getCode() : "");
            list.add(record.getGpsCoordsPrecision() != null ?
                Integer.toString(record.getGpsCoordsPrecision()) :
                "");
            list.add(record.getLocality());
            list.add(AuthorsSerializer.serialize(record.getAuthorsSorted(), true));
            list.add(record.getDateSpecifier() != null ?
                record.getDateSpecifier().toString() :
                "");
            list.add(HerbariumsSerializer.serialize(record.getHerbariums()));
            list.add(Integer.toString(settings.getMapType()));
            list.add(StringUtils.defaultString(settings.getRevisorsComment()).replace("\n", ""));
            list.add(quadrantHighestValidationStatus.getDescription());

            list.add(record.getOriginalName() != null ? record.getOriginalName() : "");
            String phytochorion_text = "";
            if (record.getPhytochorion() != null) {
                Phytochorion phyto = record.getPhytochorion();
                phytochorion_text = String.format("%s. %s", phyto.getPhytoId(), phyto.getName());
            }
            list.add(phytochorion_text);
            list.add(record.getAltitudeMin() != null ? record.getAltitudeMin().toString() : "");
            list.add(record.getAltitudeMax() != null ? record.getAltitudeMax().toString() : "");
            list.add(record.getOriginalityStatus() != null ? record.getOriginalityStatus().getName() : "");
            list.add(record.getProject() != null ? record.getProject().getAbbrev() : "");
            list.add(StringUtils.defaultIfEmpty(record.getOriginalId(), ""));
            list.add(StringUtils.defaultIfEmpty(record.getComment(), ""));
            String isProtectedLocation = java.lang.Boolean.toString(shouldHideLocation(settings.isProtected(), record));
            list.add(isProtectedLocation);
            list.add(getNearestTownText(record));
            return list;
        } catch (Exception e) {
            logger.info(String.format("Exception while converting record %d to CSV data", record.getId()));
            throw e;
        }
    }

    private boolean shouldHideLocation(boolean isProtected, Record r) {
        Integer year = r.getDateSpecifier() != null
            ? r.getDateSpecifier().getYear()
            : null;
        return (r.hasCoords() && isProtected && year != null && year >= 1980);
    }

    private String getNearestTownText(Record r) {
        if (StringUtils.isBlank(r.getNearestTownText())) {
            return "";
        }
        String result = r.getNearestTownText();
        if (r.getDistrict() != null) {
            result += String.format(", okres %s", r.getDistrict().getName());
        }
        return result;
    }
}
