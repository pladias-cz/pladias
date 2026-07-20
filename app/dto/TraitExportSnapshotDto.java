package dto;

import java.sql.Timestamp;

public record TraitExportSnapshotDto(
    Integer id,
    String description,
    Timestamp createdAt
) {
}
