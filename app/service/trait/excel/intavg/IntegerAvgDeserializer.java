package service.trait.excel.intavg;

import excel.ExcelErrorInfo;
import io.ebean.Model;
import models.traits.DatatypePK;
import models.traits.IntervalAvgDatatype;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.ss.usermodel.Row;
import play.i18n.Messages;
import service.excel.impl.ExcelDocHelper;
import service.trait.excel.AbstractDatatypeDeserializer;
import settings.user.UserOptions;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class IntegerAvgDeserializer extends AbstractDatatypeDeserializer implements IIntegerAvgSerializer {
    private final Set<DatatypePK> seenRecords;
    private final UserOptions options;

    public IntegerAvgDeserializer(UserOptions options, Messages messages) {
        super(options, messages);
        this.options = options;
        seenRecords = new HashSet<>();

    }

    @Override
    public int getErrorColumn() {
        return ErrorColumn;
    }

    Double getDoubleValueOrRerportError(Row row, int columnId, List<ExcelErrorInfo> errorList) {
        String value = ExcelDocHelper.getSafeCellStringValue(row, columnId);
        if (value == null || StringUtils.isBlank(value) || value.equals(options.getNullSubstitution())) {
            return null;
        }
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException e) {
            ExcelErrorInfo info = new ExcelErrorInfo(row.getRowNum(), columnId, messages.at("IntegerAvgDeserializer.InvalidValue"));
            errorList.add(info);
            return null;
        }
    }

    @Override
    protected Model deserializeDatatypeFields(Row row, int traitId, long taxonId, List<ExcelErrorInfo> errorList) {
        String value = ExcelDocHelper.getSafeCellStringValue(row, MeanValueColumn);
        if (isRecordIgnored(value)) {
            return null;
        } else if (isUnmeasurableValue(value)) {
            return processUnmeasurableValue(row, traitId, taxonId, errorList);
        }

        Double mean = getDoubleValueOrRerportError(row, MeanValueColumn, errorList);
        Double min = getDoubleValueOrRerportError(row, MinValueColumn, errorList);
        Double max = getDoubleValueOrRerportError(row, MaxValueColumn, errorList);
        Double extremeMin = getDoubleValueOrRerportError(row, ExtremeMinValueColumn, errorList);
        Double extremeMax = getDoubleValueOrRerportError(row, ExtremeMaxValueColumn, errorList);

        Double meanError = getDoubleValueOrRerportError(row, StandardMeanErrorColumn, errorList);

        //prerequisities:
        //min<=mean
        if (min != null && mean != null) {
            if (min > mean) {
                ExcelErrorInfo info = new ExcelErrorInfo(row.getRowNum(), MinValueColumn, messages.at("IntegerAvgDeserializer.RequiredMinLeMean"));
                errorList.add(info);
                return null;
            }
        }

        //	max>=mean
        if (max != null && mean != null) {
            if (max < mean) {
                ExcelErrorInfo info = new ExcelErrorInfo(row.getRowNum(), MaxValueColumn, messages.at("IntegerAvgDeserializer.RequiredMaxGeMean"));
                errorList.add(info);
                return null;
            }
        }
        //min<=max
        if (min != null && max != null) {
            if (max < min) {
                ExcelErrorInfo info = new ExcelErrorInfo(row.getRowNum(), MaxValueColumn, messages.at("IntegerAvgDeserializer.RequiredMinLeMax"));
                errorList.add(info);
                return null;
            }
        }
        //extrememin<min
        if (extremeMin != null && min != null) {
            if (extremeMin >= min) {
                ExcelErrorInfo info = new ExcelErrorInfo(row.getRowNum(), ExtremeMinValueColumn, messages.at("IntegerAvgDeserializer.RequiredUltraminLtMin"));
                errorList.add(info);
                return null;
            }
        }
        //extrememax>max
        if (extremeMax != null && max != null) {
            if (extremeMax <= max) {
                ExcelErrorInfo info = new ExcelErrorInfo(row.getRowNum(), ExtremeMaxValueColumn, messages.at("IntegerAvgDeserializer.RequiredUltramaxGtMax"));
                errorList.add(info);
                return null;
            }
        }
        if (min == null && max == null && extremeMin == null &&
            extremeMax == null && mean == null && meanError == null) {
            //ExcelErrorInfo info = new ExcelErrorInfo(row.getRowNum(), MeanValueColumn, messages.get("IntegerAvgDeserializer.RequiredAtLeastOneValue"));
            //errorList.add(info);
            return null;
        }

        DatatypePK pk = new DatatypePK();
        pk.setTraitId(traitId);
        pk.setTaxonId(taxonId);

        if (seenRecords.contains(pk)) {
            ExcelErrorInfo eInfo = createError(row, TaxonColumn, messages.at("IntegerAvgDeserializer.duplicateKey"));
            errorList.add(eInfo);
            return null;
        }
        seenRecords.add(pk);

        IntervalAvgDatatype datatype = new IntervalAvgDatatype();
        datatype.setDatatypePk(pk);
        datatype.setMinimum(min);
        datatype.setMaximum(max);
        datatype.setExtremeMinimum(extremeMin);
        datatype.setExtremeMaximum(extremeMax);
        datatype.setMean(mean);
        datatype.setStandardMeanError(meanError);
        return datatype;
    }

    @Override
    public int getCommentColumn() {
        return CommentValueColumn;
    }
}
