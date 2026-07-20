package service.record.serialization;

import models.Batch;
import models.District;
import models.Record;
import models.RecordHistory;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import play.i18n.Messages;
import serializers.AuthorsSerializer;
import serializers.HerbariumsSerializer;
import serializers.MapSquaresSerializer;
import serializers.QuadrantsSerializer;

import java.io.IOException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class ModifiedRecordsExportService {
    private static List<String> buildRecordHistoryData(long recordId, RecordHistory recHistory) {
        List<String> recordData = new ArrayList<String>();
        recordData.add(Long.toString(recordId));
        recordData.add("");
        recordData.add(recHistory.getCreateTimestamp().toString());
        recordData.add("autor:" + String.format("%s %s", recHistory.getUser().getName(), recHistory.getUser().getSurname()));
        recordData.add("typ zmeny: " + recHistory.getChangeType().toString());
        recordData.add("popis pole: " + recHistory.getFieldDesc().toString());
        recordData.add("puvodni hodnota: " + recHistory.getOldValue());
        recordData.add("nova hodnota: " + recHistory.getNewValue());
        return recordData;
    }

    public Workbook serializeModifiedBatchEntries(Long batchId, Messages messages) throws IOException {
        List<Record> modified = getModifiedRecords(batchId);
        Timestamp creationTimestamp = Batch.find().byId(batchId).getCreateTimestamp();
        return getWorkbook(modified, creationTimestamp.toString(), messages);
    }

    private List<Record> getModifiedRecords(Long batchId) {
        List<Record> records = Record.find().query().where().eq("batch_id", batchId).findList();

        List<Record> modified = new ArrayList<Record>();
        for (Record r : records) {
            if (!r.getComments().isEmpty() || !r.getHistory().isEmpty()) {
                modified.add(r);
            }
        }
        return modified;
    }

    private Workbook getWorkbook(List<Record> records, String creationTimestamp, Messages messages) throws IOException {
        Workbook workbook = new HSSFWorkbook();
        Sheet sheet = workbook.createSheet();

        int lineNum = serializeHeaderGetLineNumber(sheet, messages);

        for (Record record : records) {
            lineNum = serializeRecordToWorkbookGetLineNumber(sheet, record, lineNum, creationTimestamp);
        }
        return workbook;
    }

    private int serializeHeaderGetLineNumber(Sheet sh, Messages messages) {
        int lineNum = 0;
        List<String> headerData = buildDataHeader(messages);
        serializeToWorkbook(headerData, sh.createRow(lineNum++));
        lineNum++; //create empty line
        return lineNum;
    }

    private List<String> buildDataHeader(Messages messages) {
        List<String> recordData = new ArrayList<String>();
        recordData.add(messages.at("ModifiedRecordsExcelBuilder.RecordId"));
        recordData.add(messages.at("ModifiedRecordsExcelBuilder.Taxon"));
        recordData.add(messages.at("ModifiedRecordsExcelBuilder.CreationTimestamp"));
        recordData.add(messages.at("ModifiedRecordsExcelBuilder.OriginalName"));
        recordData.add(messages.at("ModifiedRecordsExcelBuilder.Locality"));
        recordData.add(messages.at("ModifiedRecordsExcelBuilder.NearestTown"));
        recordData.add(messages.at("ModifiedRecordsExcelBuilder.District"));
        recordData.add(messages.at("ModifiedRecordsExcelBuilder.Altitude"));
        recordData.add(messages.at("ModifiedRecordsExcelBuilder.Coords"));
        recordData.add(messages.at("ModifiedRecordsExcelBuilder.CoordsSource"));
        recordData.add(messages.at("ModifiedRecordsExcelBuilder.CoordsPrecision"));
        recordData.add(messages.at("ModifiedRecordsExcelBuilder.Datum"));
        recordData.add(messages.at("ModifiedRecordsExcelBuilder.Finder"));
        recordData.add(messages.at("ModifiedRecordsExcelBuilder.Source"));
        recordData.add(messages.at("ModifiedRecordsExcelBuilder.Phytochorion"));
        recordData.add(messages.at("ModifiedRecordsExcelBuilder.QuadrantOrSquare"));
        recordData.add(messages.at("ModifiedRecordsExcelBuilder.Comment"));

        return recordData;
    }

    private void serializeToWorkbook(List<String> data, Row row) {
        for (int i = 0; i < data.size(); i++) {
            Cell c = row.createCell(i);
            c.setCellValue(data.get(i));
        }
    }

    private int serializeRecordToWorkbookGetLineNumber(Sheet sheet, Record record, int startLineNum, String creationTimestamp) {
        int lineNum = startLineNum;
        List<RecordHistory> history = record.getHistory();
        if (!history.isEmpty()) {
            List<String> recordData = buildRecordData(record, creationTimestamp);
            serializeToWorkbook(recordData, sheet.createRow(lineNum++));
            for (RecordHistory historyItem : history) {
                List<String> recordHistoryData = buildRecordHistoryData(record.getId(), historyItem);
                serializeToWorkbook(recordHistoryData, sheet.createRow(lineNum++));
            }
        }
        return lineNum;
    }

    private List<String> buildRecordData(Record record, String creationTimestamp) {
        List<String> recordData = new ArrayList<String>();
        recordData.add(Long.toString(record.getId()));
        recordData.add(record.getTaxon().getNameLat());
        recordData.add(creationTimestamp);
        recordData.add(record.getOriginalName() != null ? record.getOriginalName() : "");
        recordData.add(record.getLocality() != null ? record.getLocality() : "");
        recordData.add(record.getNearestTownText() != null ? record.getNearestTownText() : "");

        District district = record.getDistrict();
        recordData.add(district != null ? district.getName() : "");

        recordData.add(record.getAltitudeRange());

        String coords = record.hasCoords()
            ? String.format(Locale.US, "%s, %s", record.getLongitude(), record.getLatitude())
            : "";
        recordData.add(coords);

        recordData.add(record.getGpsCoordSource() != null ? record.getGpsCoordSource() : "");
        recordData.add(record.getGpsCoordsPrecision() != null ? Integer.toString(record.getGpsCoordsPrecision()) : "");
        recordData.add(record.getDateSpecifier() != null ? record.getDateSpecifier().toString() : "");
        recordData.add(AuthorsSerializer.serialize(record.getAuthorsSorted(), true));

        if (record.getHerbariums().isEmpty()) {
            recordData.add(record.getSource());
        } else {
            recordData.add(HerbariumsSerializer.serialize(record.getHerbariums()));
        }

        recordData.add(record.getPhytochorion() != null
            ? String.format("%s - %s", record.getPhytochorion().getPhytoId(), record.getPhytochorion().getName())
            : "");
        recordData.add(QuadrantsSerializer.serialize(record.getQuadrant().get()) +
            MapSquaresSerializer.serialize(record.getMapSquares()));
        recordData.add(record.getComment());
        return recordData;
    }
}
