package service.csv;

import io.ebean.SqlRow;
import models.CsvMapDetails;
import models.Taxon;
import models.TaxonMapSettings;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import service.map.publication.BasicCsvRecordGenerator;
import service.map.publication.MapRenderDetailsDataProvider;
import service.map.publication.MapRenderRecordGenerator;
import service.taxon.IMapRecordSelectionFilter;
import service.taxon.MapRecordSelectionFilter;
import utils.records.RecordQuadrantDistribution;

import java.io.IOException;
import java.util.List;

public class CsvMapService {

    final static Logger logger = LoggerFactory.getLogger(CsvMapService.class);

    public CsvMapService() {
    }

    private static String buildCsvFileName(Taxon taxon) {
        StringBuilder builder = new StringBuilder();
        builder.append(taxon.getNameLat().replace(" ", "_"));
        builder.append("_map_data.csv");
        String filename = builder.toString();
        return filename.replace("×", "x_");
    }

    public CsvMapDetails buildMapRecordCsvData(TaxonMapSettings settings, List<RecordQuadrantDistribution> distribution) throws Exception {
        Taxon taxon = Taxon.find().byId(settings.getId());

        byte[] recordListCsvData = buildRecordPerQuadrantCsvData(settings, distribution);

        IMapRecordSelectionFilter filter = new MapRecordSelectionFilter(settings);
        byte[] quadrantSpecimenCsvData = buildQuadrantSpecimenCsvData(filter);

        logger.info("generated map render details");
        CsvMapDetails csvData
            = new CsvMapDetails(recordListCsvData, quadrantSpecimenCsvData,
            buildCsvFileName(taxon), taxon.getId()
        );

        return csvData;
    }

    public byte[] buildRecordPerQuadrantCsvData(TaxonMapSettings settings,
                                                List<RecordQuadrantDistribution> recordsQuadrantDistribution) throws Exception {
        BasicCsvRecordGenerator csvRecordGenerator = new BasicCsvRecordGenerator();
        byte[] csvRecordsBytes = csvRecordGenerator.convertToCsvData(recordsQuadrantDistribution, settings);
        return csvRecordsBytes;
    }

    public byte[] buildQuadrantSpecimenCsvData(IMapRecordSelectionFilter filter) throws IOException {
        List<SqlRow> mapRenderDetails = MapRenderDetailsDataProvider.getData(filter);
        MapRenderRecordGenerator mapRenderCsvRecordGenerator = new MapRenderRecordGenerator();
        byte[] mapRenderBytes = mapRenderCsvRecordGenerator.convertToCsvData(mapRenderDetails);
        return mapRenderBytes;
    }
}
