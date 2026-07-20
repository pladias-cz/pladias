package service.trait.excel.integer;

import excel.ExcelErrorInfo;
import io.ebean.Model;
import models.traits.Feature;
import models.traits.IntegerDatatype;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.ss.usermodel.Row;
import play.i18n.Messages;
import service.excel.impl.ExcelDocHelper;
import service.trait.excel.AbstractDatatypeDeserializer;
import settings.user.UserOptions;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class IntegerDeserializer extends AbstractDatatypeDeserializer implements IIntegerSerializer {
    private static final int ErrorColumn = 2;
    private final Feature feature;
    private final Set<IntegerDatatype> previouslyVisitedRecords;

    public IntegerDeserializer(Feature feature, UserOptions options, Messages messages) {
        super(options, messages);
        this.feature = feature;
        previouslyVisitedRecords = new HashSet<IntegerDatatype>();
    }

    @Override
    public int getErrorColumn() {
        return ErrorColumn;
    }

    protected Integer getFrequency(Row row, List<ExcelErrorInfo> errorList) {
        try {
            String freq = ExcelDocHelper.getSafeCellStringValue(row, FrequencyColumn);
            if (StringUtils.isNotEmpty(freq) && !nullSubstitution.equals(freq)) {
                return Integer.parseInt(freq.trim());
            }
            return null;
        } catch (Exception e) {
            ExcelErrorInfo eInfo = createError(row, FrequencyColumn, e.getMessage());
            errorList.add(eInfo);
            return null;
        }
    }

    @Override
    protected Model deserializeDatatypeFields(Row row, int traitId, long taxonId, List<ExcelErrorInfo> errorList) {
        try {
            String value = ExcelDocHelper.getSafeCellStringValue(row, IntValueColumn);
            if (isRecordIgnored(value)) {
                return null;
            } else if (isUnmeasurableValue(value)) {
                return processUnmeasurableValue(row, traitId, taxonId, errorList);
            }

            int intValue = Integer.parseInt(value);
            if (!isValueInAllowedRange(intValue)) {
                ExcelErrorInfo eInfo = createError(row, IntValueColumn,
                    messages.at("IntegerDeserializer.ValueOutOfRange",
                        feature.getMinimum().intValue(),
                        feature.getMaximum().intValue()));
                errorList.add(eInfo);
                return null;
            }

            Integer frequency = getFrequency(row, errorList);

            IntegerDatatype datatype = new IntegerDatatype();
            datatype.setTraitId(traitId);
            datatype.setTaxonId(taxonId);
            datatype.setValue(intValue);

            if (previouslyVisitedRecords.contains(datatype)) {
                ExcelErrorInfo eInfo = createError(row, IntValueColumn, messages.at("IntegerDeserializer.duplicateKey"));
                errorList.add(eInfo);
                return null;
            }
            previouslyVisitedRecords.add(datatype);

            datatype.setFrequency(frequency);
            return datatype;
        } catch (Exception e) {
            ExcelErrorInfo eInfo = createError(row, IntValueColumn, messages.at("AbstractDatatypeDeserializer.InvalidValue"));
            errorList.add(eInfo);
            return null;
        }
    }

    public boolean isValueInAllowedRange(int value) {
        return (value >= feature.getMinimum().intValue() ||
            value <= feature.getMaximum().intValue());
    }

    @Override
    public int getCommentColumn() {
        return CommentValueColumn;
    }
}
