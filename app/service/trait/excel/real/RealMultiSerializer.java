package service.trait.excel.real;

import io.ebean.Model;
import models.traits.RealMultiDatatype;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import play.i18n.Messages;
import service.trait.excel.AbstractDatatypeSerializer;
import settings.user.UserOptions;

import java.util.Locale;

public class RealMultiSerializer extends AbstractDatatypeSerializer implements IRealSerializer {

    public RealMultiSerializer(UserOptions options, Messages messages, Locale locale, Workbook workbook, Sheet sheet) {
        super(options, messages, locale, workbook, sheet);
    }

    @Override
    protected void serializeDatatypeFields(Row row, Model datatype) throws Exception {
        //this cast should be safe
        RealMultiDatatype realDatatype = (RealMultiDatatype) datatype;
        Cell cell = row.createCell(RealValueColumn);
        cell.setCellValue(realDatatype.getValue());
    }

    @Override
    protected void serializeDatatypeHeaderFields(Row row) {
        Cell cell = row.createCell(RealValueColumn);
        String value = exportInEnglish()
            ? messages.at("RealSerializer.value.en")
            : messages.at("RealSerializer.value");
        cell.setCellValue(value);
        cell.setCellStyle(boldStyle);
    }

    @Override
    protected int getCommentColumn() {
        return CommentValueColumn;
    }

}
