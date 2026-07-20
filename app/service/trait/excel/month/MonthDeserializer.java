package service.trait.excel.month;

import excel.ExcelErrorInfo;
import io.ebean.Model;
import models.traits.MonthDatatype;
import models.traits.MonthDatatypePK;
import org.apache.poi.ss.usermodel.Row;
import play.i18n.Messages;
import service.excel.impl.ExcelDocHelper;
import service.trait.excel.AbstractDatatypeDeserializer;
import settings.user.UserOptions;

import java.util.List;

public class MonthDeserializer extends AbstractDatatypeDeserializer implements IMonthSerializer {
    public MonthDeserializer(UserOptions options, Messages messages) {
        super(options, messages);
    }

    @Override
    public int getErrorColumn() {
        return ErrorColumn;
    }

    @Override
    protected Model deserializeDatatypeFields(Row row, int traitId, long taxonId, List<ExcelErrorInfo> errorList) {
        try {
            String min = ExcelDocHelper.getSafeCellStringValue(row, MinValueColumn);
            if (isRecordIgnored(min)) {
                return null;
            } else if (isUnmeasurableValue(min)) {
                return processUnmeasurableValue(row, traitId, taxonId, errorList);
            }
            int minimum = (int) Double.parseDouble(min);
            int maximum = (int) Double.parseDouble(ExcelDocHelper.getSafeCellStringValue(row, MaxValueColumn));
            boolean dominant = Boolean.parseBoolean(ExcelDocHelper.getSafeCellStringValue(row, DomintantValueColumn));

            if (minimum < 1 || minimum > MonthDatatype.MONTH_COUNT) {
                ExcelErrorInfo info = new ExcelErrorInfo(row.getRowNum(), MinValueColumn, messages.at("MonthDeserializer.InvalidMinValue"));
                errorList.add(info);
                return null;
            }

            if (maximum < 1 || maximum > MonthDatatype.MONTH_COUNT) {
                ExcelErrorInfo info = new ExcelErrorInfo(row.getRowNum(), MaxValueColumn, messages.at("MonthDeserializer.InvalidMaxValue"));
                errorList.add(info);
                return null;
            }

            if (minimum > maximum) {
                ExcelErrorInfo info = new ExcelErrorInfo(row.getRowNum(), MinValueColumn, messages.at("MonthDeserializer.MinMaxMismatch"));
                errorList.add(info);
                return null;
            }

            MonthDatatypePK pk = new MonthDatatypePK();
            pk.setTraitId(traitId);
            pk.setTaxonId(taxonId);
            pk.setMinimum(minimum);
            pk.setMaximum(maximum);

            MonthDatatype monthDatatype = new MonthDatatype();
            monthDatatype.setDominant(dominant);
            monthDatatype.setDatatypePk(pk);

            return monthDatatype;
        } catch (Exception e) {
            ExcelErrorInfo eInfo = createError(row, MinValueColumn, messages.at("AbstractDatatypeDeserializer.InvalidValue"));
            errorList.add(eInfo);
            return null;
        }
    }

    @Override
    public int getCommentColumn() {
        return CommentValueColumn;
    }
}
