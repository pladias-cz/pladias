package service.trait.excel.percentage;

import io.ebean.Model;
import models.traits.PercentageDatatype;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import play.i18n.Messages;
import service.trait.excel.AbstractDatatypeSerializer;
import settings.user.UserOptions;

import java.util.Locale;

public class PercentageSerializer extends AbstractDatatypeSerializer implements IPercentageSerializer {

    public PercentageSerializer(UserOptions options, Messages messages, Locale locale, Workbook workbook, Sheet sheet) {
        super(options, messages, locale, workbook, sheet);
    }

    @Override
    protected void serializeDatatypeFields(Row row, Model datatype) throws Exception {
        //this cast should be safe
        PercentageDatatype percDatatype = (PercentageDatatype) datatype;
        Cell cell = row.createCell(PercentageValueColumn);
        cell.setCellValue(percDatatype.getValue());
    }

    @Override
    protected void serializeDatatypeHeaderFields(Row row) {
        Cell cell = row.createCell(PercentageValueColumn);
        String value = exportInEnglish()
            ? messages.at("PercentageSerializer.value.en")
            : messages.at("PercentageSerializer.value");
        cell.setCellValue(value);
        cell.setCellStyle(boldStyle);
    }

    @Override
    protected int getCommentColumn() {
        return CommentValueColumn;
    }

}
