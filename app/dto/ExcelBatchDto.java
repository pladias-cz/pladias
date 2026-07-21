package dto;

import java.sql.Timestamp;

public record ExcelBatchDto(
    Long id,
    String filename,
    Integer warningsCount,
    Integer errorsCount,
    Integer infosCount,
    Integer recordsCount,
    Long batchId,
    Boolean imported,
    Timestamp importTimestamp,
    Long committerId,
    String committerName,
    String committerEmail,
    Boolean hasDeletionCode
) {

    /**
     * Static factory method to create an ExcelBatchDto from an Excel model.
     * This provides a convenient way to construct the DTO with all related data.
     */
    public static ExcelBatchDto fromExcel(models.Excel excel) {
        models.Batch batch = excel.getBatch();

        Long batchId = null;
        Boolean imported = null;
        Timestamp importTimestamp = null;
        Long committerId = null;
        String committerName = null;
        String committerEmail = null;
        Boolean hasDeletionCode = false;

        if (batch != null) {
            batchId = batch.getId();
            imported = batch.getImported();
            importTimestamp = batch.getCreateTimestamp();

            String deletionCode = batch.getDeletionCode();
            hasDeletionCode = deletionCode != null && !deletionCode.isEmpty();

            models.User committer = batch.getCommitter();
            if (committer != null) {
                committerId = committer.getId();
                committerName = committer.getFullname();
                committerEmail = committer.getEmail();
            }
        }


        return new ExcelBatchDto(
            excel.getId(),
            excel.getFilename(),
            excel.getWarnings(),
            excel.getErrors(),
            excel.getInfos(),
            excel.getRecords(),
            batchId,
            imported,
            importTimestamp,
            committerId,
            committerName,
            committerEmail,
            hasDeletionCode
        );
    }
}
