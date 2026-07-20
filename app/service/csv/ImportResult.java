package service.csv;

import models.Batch;

public class ImportResult {

    private final String message;
    private final boolean success;

    public ImportResult(boolean success, String message) {
        this.success = success;
        this.message = message;
    }

    public static ImportResult createSuccess(Batch batch, int totalRecords) {
        String message = String.format("Import of batch #%d succeeded. %d lines imported", batch.getId(), totalRecords);
        return new ImportResult(true, message);
    }

    public static ImportResult createFailure(Batch batch, int lineId) {
        String message = String.format("Import of batch #%d failed on line %d", batch.getId(), lineId);
        return new ImportResult(false, message);
    }

    public String getMessage() {
        return message;
    }

    public boolean isSuccess() {
        return success;
    }
}
