package service.trait.excel.year;

import io.ebean.Model;
import models.traits.YearDatatype;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import play.i18n.Messages;
import service.trait.excel.AbstractDatatypeSerializer;
import settings.user.UserOptions;

import java.util.Locale;

public class YearSerializer extends AbstractDatatypeSerializer implements IYearSerializer {

    public YearSerializer(UserOptions options, Messages messages, Locale locale, Workbook workbook, Sheet sheet) {
        super(options, messages, locale, workbook, sheet);
    }

    @Override
    protected void serializeDatatypeFields(Row row, Model datatype) throws Exception {
        //this cast should be safe
        YearDatatype yearDatatype = (YearDatatype) datatype;
        Cell cell = row.createCell(YearValueColumn);
        String yearVal = buildYearValue(yearDatatype);
        cell.setCellValue(yearVal);
    }

    private String buildYearValue(YearDatatype datatype) {
        StringBuilder builder = new StringBuilder();
        if (datatype.isBefore()) {
            builder.append("<=");
        } else if (datatype.isAfter()) {
            builder.append(">=");
        }
        builder.append(datatype.getValue());
        return builder.toString();
    }

    @Override
    protected void serializeDatatypeHeaderFields(Row row) {
        Cell cell = row.createCell(YearValueColumn);
        String value = exportInEnglish()
            ? messages.at("IntSerializer.value.en")
            : messages.at("IntSerializer.value");
        cell.setCellValue(value);
        cell.setCellStyle(boldStyle);
    }

    @Override
    protected int getCommentColumn() {
        return CommentValueColumn;
    }
}
