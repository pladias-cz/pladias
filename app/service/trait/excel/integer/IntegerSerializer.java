package service.trait.excel.integer;

import io.ebean.Model;
import models.traits.IntegerDatatype;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import play.i18n.Messages;
import service.trait.excel.AbstractDatatypeSerializer;
import settings.user.UserOptions;

import java.util.Locale;

public class IntegerSerializer extends AbstractDatatypeSerializer implements IIntegerSerializer {
    private final String nullSubstitution;

    public IntegerSerializer(UserOptions userOptions, Messages messages, Locale locale, Workbook workbook, Sheet sheet) {
        super(userOptions, messages, locale, workbook, sheet);
        nullSubstitution = userOptions.getNullSubstitution();
    }

    @Override
    protected void serializeDatatypeFields(Row row, Model datatype) throws Exception {
        //this cast should be safe
        IntegerDatatype intDatatype = (IntegerDatatype) datatype;
        Cell cell = row.createCell(IntValueColumn);
        int value = intDatatype.getValue();
        cell.setCellValue(Integer.toString(value));
        cell = row.createCell(FrequencyColumn);

        Integer frequency = intDatatype.getFrequency();
        cell.setCellValue(frequency != null ? frequency.toString() : nullSubstitution);
    }

    @Override
    protected void serializeDatatypeHeaderFields(Row row) {
        Cell cell = row.createCell(IntValueColumn);
        String value = exportInEnglish()
            ? messages.at("IntSerializer.value.en")
            : messages.at("IntSerializer.value");
        cell.setCellValue(value);
        cell.setCellStyle(boldStyle);

        cell = row.createCell(FrequencyColumn);
        String frequency = exportInEnglish()
            ? messages.at("IntSerializer.frequency.en")
            : messages.at("IntSerializer.frequency");
        cell.setCellValue(frequency);
        cell.setCellStyle(boldStyle);
    }

    @Override
    protected int getCommentColumn() {
        return CommentValueColumn;
    }

}
