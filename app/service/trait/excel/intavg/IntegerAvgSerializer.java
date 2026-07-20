package service.trait.excel.intavg;

import io.ebean.Model;
import models.traits.IntervalAvgDatatype;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import play.i18n.Messages;
import service.trait.excel.AbstractDatatypeSerializer;
import settings.user.UserOptions;

import java.io.IOException;
import java.util.Locale;

public class IntegerAvgSerializer extends AbstractDatatypeSerializer implements IIntegerAvgSerializer {
    public IntegerAvgSerializer(UserOptions options, Messages messages, Locale locale, Workbook workbook, Sheet sheet) {
        super(options, messages, locale, workbook, sheet);
    }

    @Override
    protected void serializeDatatypeFields(Row row, Model datatype) throws Exception {
        //this cast should be safe
        IntervalAvgDatatype avgDatatype = (IntervalAvgDatatype) datatype;

        Cell cell = row.createCell(MeanValueColumn);
        cell.setCellValue(avgDatatype.getMean() != null ? Double.toString(avgDatatype.getMean()) : "");

        cell = row.createCell(StandardMeanErrorColumn);
        cell.setCellValue(avgDatatype.getStandardMeanError() != null ? Double.toString(avgDatatype.getStandardMeanError()) : "");

        cell = row.createCell(MinValueColumn);
        cell.setCellValue(avgDatatype.getMinimum() != null ? Double.toString(avgDatatype.getMinimum()) : "");

        cell = row.createCell(ExtremeMinValueColumn);
        cell.setCellValue(avgDatatype.getExtremeMinimum() != null ? Double.toString(avgDatatype.getExtremeMinimum()) : "");

        cell = row.createCell(MaxValueColumn);
        cell.setCellValue(avgDatatype.getMaximum() != null ? Double.toString(avgDatatype.getMaximum()) : "");

        cell = row.createCell(ExtremeMaxValueColumn);
        cell.setCellValue(avgDatatype.getExtremeMaximum() != null ? Double.toString(avgDatatype.getExtremeMaximum()) : "");
    }

    @Override
    protected void serializeDatatypeHeaderFields(Row row) throws IOException {
        Cell cell = row.createCell(MinValueColumn);
        String minValue = exportInEnglish()
            ? messages.at("IntAvgSerializer.MinValueText.en")
            : messages.at("IntAvgSerializer.MinValueText");
        cell.setCellValue(minValue);
        cell.setCellStyle(boldStyle);

        cell = row.createCell(ExtremeMinValueColumn);
        String extMinValue = exportInEnglish()
            ? messages.at("IntAvgSerializer.ExtremeMinValueText.en")
            : messages.at("IntAvgSerializer.ExtremeMinValueText");
        cell.setCellValue(extMinValue);
        cell.setCellStyle(boldStyle);

        cell = row.createCell(MaxValueColumn);
        String maxValue = exportInEnglish()
            ? messages.at("IntAvgSerializer.MaxValueText.en")
            : messages.at("IntAvgSerializer.MaxValueText");
        cell.setCellValue(maxValue);
        cell.setCellStyle(boldStyle);

        cell = row.createCell(ExtremeMaxValueColumn);
        String extremeMaxValue = exportInEnglish()
            ? messages.at("IntAvgSerializer.ExtremeMaxValueText.en")
            : messages.at("IntAvgSerializer.ExtremeMaxValueText");
        cell.setCellValue(extremeMaxValue);
        cell.setCellStyle(boldStyle);

        cell = row.createCell(MeanValueColumn);
        String meanValue = exportInEnglish()
            ? messages.at("IntAvgSerializer.MeanValueText.en")
            : messages.at("IntAvgSerializer.MeanValueText");
        cell.setCellValue(meanValue);
        cell.setCellStyle(boldStyle);

        cell = row.createCell(StandardMeanErrorColumn);
        String meanError = exportInEnglish()
            ? messages.at("IntAvgSerializer.StandardMeanErrorValueText.en")
            : messages.at("IntAvgSerializer.StandardMeanErrorValueText");
        cell.setCellValue(meanError);
        cell.setCellStyle(boldStyle);
    }

    @Override
    protected int getCommentColumn() {
        return CommentValueColumn;
    }
}
