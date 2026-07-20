package service.trait.excel.bool;

import io.ebean.Model;
import models.traits.BoolDatatype;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import play.i18n.Messages;
import service.trait.excel.AbstractDatatypeSerializer;
import settings.user.UserOptions;

import java.util.Locale;

public class BoolSerializer extends AbstractDatatypeSerializer implements IBoolSerializer {

    public BoolSerializer(UserOptions options, Messages messages, Locale locale, Workbook workbook, Sheet sheet) {
        super(options, messages, locale, workbook, sheet);
    }

    @Override
    protected void serializeDatatypeFields(Row row, Model datatype) throws Exception {
        //this cast should be safe
        BoolDatatype boolDatatype = (BoolDatatype) datatype;
        Cell cell = row.createCell(BoolValueColumn);
        String exportValue = options.boolToUserString(boolDatatype.isValue());
        cell.setCellValue(exportValue);
    }

    protected void serializeDatatypeHeaderFields(Row row) {
        Cell cell = row.createCell(BoolValueColumn);
        String value = exportInEnglish()
            ? messages.at("BoolSerializer.value.en")
            : messages.at("BoolSerializer.value");

        cell.setCellValue(value);
        cell.setCellStyle(boldStyle);
    }

    @Override
    protected int getCommentColumn() {
        return CommentValueColumn;
    }
}
