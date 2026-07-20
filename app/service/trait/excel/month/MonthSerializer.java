package service.trait.excel.month;

import io.ebean.Model;
import models.traits.MonthDatatype;
import models.traits.MonthDatatypePK;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import play.i18n.Messages;
import service.trait.excel.AbstractDatatypeSerializer;
import settings.user.UserOptions;

import java.util.Locale;

public class MonthSerializer extends AbstractDatatypeSerializer implements IMonthSerializer {

    public MonthSerializer(UserOptions options, Messages messages, Locale locale, Workbook workbook, Sheet sheet) {
        super(options, messages, locale, workbook, sheet);
    }

    @Override
    protected void serializeDatatypeFields(Row row, Model datatype) throws Exception {
        //this cast should be safe
        MonthDatatype monthDatatype = (MonthDatatype) datatype;
        MonthDatatypePK monthDatatypePk = monthDatatype.getDatatypePk();

        Cell cell = row.createCell(MinValueColumn);
        cell.setCellValue(monthDatatypePk.getMinimum());

        cell = row.createCell(MaxValueColumn);
        cell.setCellValue(monthDatatypePk.getMaximum());

        cell = row.createCell(DomintantValueColumn);
        cell.setCellValue(monthDatatype.getDominant());
    }


    @Override
    protected void serializeDatatypeHeaderFields(Row row) {
        Cell cell = row.createCell(MinValueColumn);
        String minVal = exportInEnglish()
            ? messages.at("MonthSerializer.min.en")
            : messages.at("MonthSerializer.min");
        cell.setCellValue(minVal);
        cell.setCellStyle(boldStyle);

        cell = row.createCell(MaxValueColumn);
        String maxVal = exportInEnglish()
            ? messages.at("MonthSerializer.max.en")
            : messages.at("MonthSerializer.max");
        cell.setCellValue(maxVal);
        cell.setCellStyle(boldStyle);

        cell = row.createCell(DomintantValueColumn);
        String dominant = exportInEnglish()
            ? messages.at("MonthSerializer.dominant.en")
            : messages.at("MonthSerializer.dominant");
        cell.setCellValue(dominant);
        cell.setCellStyle(boldStyle);
    }

    @Override
    protected int getCommentColumn() {
        return CommentValueColumn;
    }
}
