package service.trait.excel.unmeasurable;

import models.traits.DataUnmeasurable;
import org.apache.poi.ss.usermodel.*;
import settings.user.UserOptions;

public class UnmeasurableSerializer implements IUnmeasurableSerializer {
    private final int commentColumn;
    private final String unmeasurableValue;
    private final CellStyle italicsStyle;

    public UnmeasurableSerializer(UserOptions options, int commentColumn, Workbook workbook) {
        this.unmeasurableValue = options.getUnmeasurableValue();
        this.commentColumn = commentColumn;
        this.italicsStyle = createItalicsFontStyle(workbook);
    }

    public void serialize(Row row, DataUnmeasurable data) {
        Cell cell = row.createCell(TaxonColumn);
        cell.setCellValue(data.getDatatypePK().getTaxon().getNameLat());
        cell.setCellStyle(italicsStyle);

        cell = row.createCell(ValueColumn);
        cell.setCellValue(unmeasurableValue);
    }

    public void serializeComment(Row row, String comment) {
        Cell cell = row.createCell(commentColumn);
        cell.setCellValue(comment);
    }

    private CellStyle createItalicsFontStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setItalic(true);
        style.setFont(font);
        return style;
    }
}
