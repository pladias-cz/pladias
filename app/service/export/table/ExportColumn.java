package service.export.table;

import java.sql.Timestamp;
import java.util.function.Function;

/**
 * Definition of a single column of a tabular XLSX export.
 *
 * <p>Column lists are declared by the DTO served by the corresponding API endpoint (see
 * {@code dto.ExcelBatchDto#exportColumns()}), so the workbook is always built from the
 * same data the React table displays. Values are typed to keep native Excel cells (numbers,
 * dates) instead of strings.</p>
 *
 * @param headerKey message key of the column header, resolved in the language of the user
 * @param type      kind of the cell written for the column
 * @param value     extractor of the column value from the DTO
 */
public record ExportColumn<T>(String headerKey, CellType type, Function<T, Object> value) {

    public enum CellType { TEXT, INTEGER, DECIMAL, BOOLEAN, DATE }

    public static <T> ExportColumn<T> text(String headerKey, Function<T, String> value) {
        return new ExportColumn<>(headerKey, CellType.TEXT, row -> value.apply(row));
    }

    public static <T> ExportColumn<T> integer(String headerKey, Function<T, Integer> value) {
        return new ExportColumn<>(headerKey, CellType.INTEGER, row -> value.apply(row));
    }

    public static <T> ExportColumn<T> decimal(String headerKey, Function<T, Double> value) {
        return new ExportColumn<>(headerKey, CellType.DECIMAL, row -> value.apply(row));
    }

    public static <T> ExportColumn<T> bool(String headerKey, Function<T, Boolean> value) {
        return new ExportColumn<>(headerKey, CellType.BOOLEAN, row -> value.apply(row));
    }

    public static <T> ExportColumn<T> date(String headerKey, Function<T, Timestamp> value) {
        return new ExportColumn<>(headerKey, CellType.DATE, row -> value.apply(row));
    }
}
