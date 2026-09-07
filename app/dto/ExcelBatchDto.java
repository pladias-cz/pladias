package dto;

import service.export.table.ExportColumn;

import java.sql.Timestamp;
import java.util.List;
import java.util.stream.Collectors;

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

    /**
     * Maps a list of Excel models to a list of ExcelBatchDto.
     */
    public static List<ExcelBatchDto> fromExcelList(List<models.Excel> excels) {
        return excels.stream().map(ExcelBatchDto::fromExcel).collect(Collectors.toList());
    }

    /**
     * Import timestamp exposed for XLSX date cells; the importTimestamp component is the
     * string the JSON clients consume.
     */
    public Timestamp importTimestampValue() {
        return importTimestamp;
    }

    /**
     * Columns of the XLSX export of the list of imports, in display order. The button columns
     * (actions, deletion code) are not exported.
     */
    public static List<ExportColumn<ExcelBatchDto>> exportColumns() {
        return List.of(
            ExportColumn.text("ExcelBatchDto.committerName", ExcelBatchDto::committerName),
            ExportColumn.date("ExcelBatchDto.importTimestamp", ExcelBatchDto::importTimestampValue),
            ExportColumn.integer("ExcelBatchDto.batchId",
                dto -> dto.batchId() != null ? dto.batchId().intValue() : null),
            ExportColumn.integer("ExcelBatchDto.recordsCount", ExcelBatchDto::recordsCount),
            ExportColumn.integer("ExcelBatchDto.warningsCount", ExcelBatchDto::warningsCount),
            ExportColumn.integer("ExcelBatchDto.errorsCount", ExcelBatchDto::errorsCount),
            ExportColumn.integer("ExcelBatchDto.infosCount", ExcelBatchDto::infosCount),
            ExportColumn.text("ExcelBatchDto.filename", ExcelBatchDto::filename)
        );
    }
}
