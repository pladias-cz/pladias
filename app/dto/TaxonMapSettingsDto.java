package dto;

import service.export.table.ExportColumn;

import java.sql.Timestamp;
import java.util.List;

public record TaxonMapSettingsDto(
    Long taxonId,
    String taxonNameLat,
    String taxonRankCz,
    Boolean isMapped,
    Integer commonThreshold,
    Boolean isProtected,
    String preslia,
    String revisors,
    String revisorsComment,
    String revisorsPrintComment,
    Integer revisionStatusId,
    String revisionStatusDescription,
    Integer publicationStatusId,
    String publicationStatusDescription,
    Long lastEditTimestamp,
    Long parentTaxonId,
    String parentTaxonNameLat,
    Integer csvMapDetailId,
    Timestamp csvMapDetailTimestamp,
    Boolean hasPng,
    Boolean currentUserIsRevisor,
    Integer mapType
) {

    /**
     * Columns of the XLSX export of the overview of taxa map settings, in the order of the React
     * table. The columns edited inline in the table are exported with their current values, the
     * upload of the PNG map is not exported.
     */
    public static List<ExportColumn<TaxonMapSettingsDto>> exportColumns() {
        return List.of(
            ExportColumn.text("TaxonMapSettingsDto.taxonNameLat", TaxonMapSettingsDto::taxonNameLat),
            ExportColumn.text("TaxonMapSettingsDto.taxonRankCz", TaxonMapSettingsDto::taxonRankCz),
            ExportColumn.bool("TaxonMapSettingsDto.isMapped", TaxonMapSettingsDto::isMapped),
            ExportColumn.integer("TaxonMapSettingsDto.commonThreshold", TaxonMapSettingsDto::commonThreshold),
            ExportColumn.bool("TaxonMapSettingsDto.isProtected", TaxonMapSettingsDto::isProtected),
            ExportColumn.text("TaxonMapSettingsDto.preslia", TaxonMapSettingsDto::preslia),
            ExportColumn.text("TaxonMapSettingsDto.revisors", TaxonMapSettingsDto::revisors),
            ExportColumn.text("TaxonMapSettingsDto.revisionStatusDescription", TaxonMapSettingsDto::revisionStatusDescription),
            ExportColumn.text("TaxonMapSettingsDto.publicationStatusDescription", TaxonMapSettingsDto::publicationStatusDescription)
        );
    }
}
