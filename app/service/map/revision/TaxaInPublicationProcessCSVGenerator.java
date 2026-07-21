package service.map.revision;

import comparators.UserComparator;
import models.TaxonMapSettings;
import models.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import serializers.CsvSerializer;
import serializers.UserSerializer;
import service.taxon.ITaxonService;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class TaxaInPublicationProcessCSVGenerator {
    final static Logger logger = LoggerFactory.getLogger(TaxaInPublicationProcessCSVGenerator.class);

    public byte[] convertToCsvData(List<TaxonMapSettings> taxaMapSettings, ITaxonService taxonService) throws IOException {
        ByteArrayOutputStream bas = new ByteArrayOutputStream();
        try (CsvSerializer mapRecData = new CsvSerializer(bas)) {
            mapRecData.printLine(getRecordHeaders());
            for (TaxonMapSettings settings : taxaMapSettings) {
                List<String> values = prepareTaxondFields(settings, taxonService);
                mapRecData.printLine(values);
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return bas.toByteArray();
    }

    private List<String> getRecordHeaders() {
        List<String> list = new ArrayList<>();
        list.add("taxon_id");
        list.add("taxon_name");
        list.add("is_protected");
        list.add("revisors");
        list.add("preslia");
        return list;
    }

    private List<String> prepareTaxondFields(TaxonMapSettings settings, ITaxonService taxonService) throws Exception {
        try {
            List<String> list = new ArrayList<>();
            list.add(settings.getId().toString());
            list.add(settings.getTaxon().getNameLat());
            list.add(settings.isProtected() ? "1" : "0");

            List<User> supervisors = new ArrayList<>(taxonService.getInheritedRevisors(settings.getTaxon()));
            supervisors.sort(new UserComparator());
            String serializedSupervisors = UserSerializer.serialize(supervisors, true);
            list.add(serializedSupervisors);
            list.add("");
            return list;
        } catch (Exception e) {
            logger.info(String.format("Exception while converting taxon %d to CSV data", settings.getId()));
            throw e;
        }
    }
}
