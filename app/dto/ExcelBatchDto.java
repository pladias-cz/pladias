package dto;

import java.sql.Timestamp;

/**
 * DTO for Excel batch data, combining information from Excel and Batch models
 * for use in React frontend.
 *
 * @param id                Excel record ID
 * @param filename          Original filename
 * @param size              Size of the processed file in bytes
 * @param warningsCount     Number of warnings during processing
 * @param errorsCount       Number of errors during processing
 * @param infosCount        Number of info messages during processing
 * @param recordsCount      Number of records in the Excel file
 * @param originalSourceKey Reference to the original source
 * @param processedFilename Name of the processed/modified file
 * @param batchId           ID of the associated batch
 * @param imported          Whether the batch has been imported
 * @param importTimestamp   When the batch was created/imported
 * @param authorId          ID of the user who created the batch
 * @param authorName        Full name of the author (name + surname)
 * @param authorEmail       Email of the author
 * @param committerId       ID of the user who committed the batch
 * @param committerName     Full name of the committer (name + surname)
 * @param committerEmail    Email of the committer
 * @param hasDeletionCode   Whether the batch has a deletion code set (null or empty = false)
 */
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
