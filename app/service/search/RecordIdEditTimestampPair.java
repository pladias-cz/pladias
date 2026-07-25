package service.search;

import java.sql.Timestamp;

public class RecordIdEditTimestampPair {
    private final Long recordId;
    private final Timestamp editTimestamp;

    public RecordIdEditTimestampPair(Long recordId, Timestamp editTimestamp) {
        this.recordId = recordId;
        this.editTimestamp = editTimestamp;
    }

    public Long getRecordId() {
        return recordId;
    }

    public Timestamp getEditTimestamp() {
        return editTimestamp;
    }
}