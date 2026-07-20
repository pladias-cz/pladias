package service.trait.excel.real;

import excel.ExcelErrorInfo;
import io.ebean.Model;
import models.traits.Feature;
import models.traits.RealMultiDatatype;
import org.apache.poi.ss.usermodel.Row;
import play.i18n.Messages;
import service.excel.impl.ExcelDocHelper;
import service.trait.excel.AbstractDatatypeDeserializer;
import settings.user.UserOptions;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class RealMultiDeserializer extends AbstractDatatypeDeserializer implements IRealSerializer {
    private final Set<RealMultiDatatype> previouslyVisitedRecords;
    private final Feature feature;

    public RealMultiDeserializer(UserOptions options, Messages messages, Feature feature) {
        super(options, messages);
        this.previouslyVisitedRecords = new HashSet<RealMultiDatatype>();
        this.feature = feature;
    }

    @Override
    public int getErrorColumn() {
        return ErrorColumn;
    }

    @Override
    protected Model deserializeDatatypeFields(Row row, int traitId, long taxonId, List<ExcelErrorInfo> errorList) {
        try {
            String value = ExcelDocHelper.getSafeCellStringValue(row, RealValueColumn);
            if (isRecordIgnored(value)) {
                return null;
            } else if (isUnmeasurableValue(value)) {
                return processUnmeasurableValue(row, traitId, taxonId, errorList);
            }
            double doubleValue = Double.parseDouble(value);

            RealMultiDatatype datatype = new RealMultiDatatype();
            datatype.setTraitId(traitId);
            datatype.setTaxonId(taxonId);
            datatype.setValue(Double.parseDouble(value));

            if (previouslyVisitedRecords.contains(datatype)) {
                ExcelErrorInfo eInfo = createError(row, RealValueColumn, messages.at("RealDeserializer.duplicateKey"));
                errorList.add(eInfo);
                return null;
            }
            previouslyVisitedRecords.add(datatype);

            if (!isValueInAllowedRange(doubleValue)) {
                ExcelErrorInfo eInfo = createError(row, RealValueColumn,
                    messages.at("RealDeserializer.ValueOutOfRange",
                        feature.getMinimum().intValue(),
                        feature.getMaximum().intValue()));
                errorList.add(eInfo);
                return null;
            }

            return datatype;
        } catch (Exception e) {
            ExcelErrorInfo eInfo = createError(row, RealValueColumn, messages.at("AbstractDatatypeDeserializer.InvalidValue"));
            errorList.add(eInfo);
            return null;
        }
    }

    private boolean isValueInAllowedRange(double value) {
        return (value >= feature.getMinimum() ||
            value <= feature.getMaximum());
    }

    @Override
    public int getCommentColumn() {
        return CommentValueColumn;
    }
}
