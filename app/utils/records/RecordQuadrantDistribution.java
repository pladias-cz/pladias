package utils.records;

import models.QuadrantNew;
import models.Record;
import models.RecordValidationStatus;
import models.TaxonMapSettings;

import java.security.InvalidParameterException;
import java.util.ArrayList;
import java.util.List;

public class RecordQuadrantDistribution {

    private static final int CommonTaxonQuadrantRecordCount = 3;
    private final boolean isCommon;
    private QuadrantNew quadrant;
    private List<Record> records;
    private RecordValidationStatus highestValidationStatus;

    public RecordQuadrantDistribution(QuadrantNew quadrant, List<Record> sortedRecords, TaxonMapSettings settings) {
        if (sortedRecords == null || sortedRecords.size() == 0) {
            throw new InvalidParameterException("RecordQuadrantDistribution.recordsMustBeNonEmpty");
        }
        this.quadrant = quadrant;
        this.records = sortedRecords;
        this.isCommon = settings.isCommon();
        initialize(sortedRecords, settings);
    }

    public QuadrantNew getQuadrant() {
        return quadrant;
    }

    public void setQuadrant(QuadrantNew quadrant) {
        this.quadrant = quadrant;
    }

    public List<Record> getRecords() {
        return new ArrayList<Record>(records);
    }

    public void setSortedRecords(List<Record> sortedRecords) {
        this.records = sortedRecords;
    }

    public RecordValidationStatus getHighestValidationStatus() {
        return highestValidationStatus;
    }

    public void setHighestValidationStatus(RecordValidationStatus highestValidationStatus) {
        this.highestValidationStatus = highestValidationStatus;
    }

    private void initialize(List<Record> records, TaxonMapSettings settings) {
        for (Record r : records) {
            if (highestValidationStatus == null) {
                highestValidationStatus = r.getValidationStatus();
            } else {
                if (r.getValidationStatus().getPriority() > highestValidationStatus.getPriority()) {
                    highestValidationStatus = r.getValidationStatus();
                }
            }
        }

        if (isCommon) {
            preprocessRecordList(settings);
        }

    }

    //this is only executed for common taxons
    private void preprocessRecordList(TaxonMapSettings settings) {
        List<Record> updatedRecords = new ArrayList<Record>();
        if (highestValidationStatus.getId() == RecordValidationStatus.Accepted) {
            //remove all Unprocessed
            for (Record r : records) {
                if (r.getValidationStatusId() == RecordValidationStatus.Accepted ||
                    r.getValidationStatusId() == RecordValidationStatus.Uncertain) {
                    updatedRecords.add(r);
                }
            }
        } else if (records.size() >= settings.getCommonThreshold()) {
            for (int i = 0;
                 i < records.size() && i < CommonTaxonQuadrantRecordCount;
                 i++) {
                //include only at maximum "CommonTaxonQuadrantRecordCount" records
                updatedRecords.add(records.get(i));

            }
            //promote the quadrant to accepted state
            highestValidationStatus = RecordValidationStatus.find().byId(RecordValidationStatus.Accepted);
        }
        //common assignment for both if/else branches
        records = updatedRecords;
    }
}
