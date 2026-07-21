package service.trait.excel.year;

import excel.ExcelErrorInfo;
import io.ebean.Model;
import models.traits.Feature;
import models.traits.YearDatatype;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.ss.usermodel.Row;
import play.i18n.Messages;
import service.excel.impl.ExcelDocHelper;
import service.trait.excel.AbstractDatatypeDeserializer;
import settings.user.UserOptions;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class YearDeserializer extends AbstractDatatypeDeserializer implements IYearSerializer {

    private final Set<YearDatatype> seenRecords;
    private final Feature feature;

    public YearDeserializer(Feature feature, UserOptions options, Messages messages) {
        super(options, messages);
        this.feature = feature;
        seenRecords = new HashSet<>();
    }

    @Override
    public int getErrorColumn() {
        return ErrorColumn;
    }

    private YearDefinition parseYearDefinition(String value) {
        if (StringUtils.isBlank(value)) {
            return null;
        }

        YearDefinition definition = new YearDefinition();

        //expected values >=1998 | <=1998 | 1998
        char char0 = value.charAt(0);
        char char1 = value.charAt(1);
        if (char0 == '>' && char1 == '=') {
            definition.after = true;
            value = value.substring(2);
        } else if (char0 == '<' && char1 == '=') {
            definition.before = true;
            value = value.substring(2);
        }
        definition.year = Integer.parseInt(value);
        return definition;
    }

    @Override
    protected Model deserializeDatatypeFields(Row row, int traitId, long taxonId, List<ExcelErrorInfo> errorList) {
        try {
            String value = ExcelDocHelper.getSafeCellStringValue(row, YearValueColumn);
            if (isRecordIgnored(value)) {
                return null;
            } else if (isUnmeasurableValue(value)) {
                return processUnmeasurableValue(row, traitId, taxonId, errorList);
            }

            YearDefinition yearDefinition = parseYearDefinition(value);
            if (yearDefinition.year < feature.getMinimum() || feature.getMaximum() < yearDefinition.year) {
                ExcelErrorInfo eInfo = createError(row, YearValueColumn,
                    messages.at("IntegerDeserializer.ValueOutOfRange",
                        feature.getMinimum(), feature.getMaximum()));
                errorList.add(eInfo);
                return null;
            }

            YearDatatype datatype = new YearDatatype();
            datatype.setTraitId(traitId);
            datatype.setTaxonId(taxonId);
            datatype.setValue(yearDefinition.year);
            datatype.setBefore(yearDefinition.before);
            datatype.setAfter(yearDefinition.after);

            if (seenRecords.contains(datatype)) {
                ExcelErrorInfo eInfo = createError(row, YearValueColumn, messages.at("IntegerDeserializer.duplicateKey"));
                errorList.add(eInfo);
                return null;
            }
            seenRecords.add(datatype);
            return datatype;
        } catch (Exception e) {
            ExcelErrorInfo eInfo = createError(row, YearValueColumn, messages.at("AbstractDatatypeDeserializer.InvalidValue"));
            errorList.add(eInfo);
            return null;
        }
    }

    @Override
    public int getCommentColumn() {
        return CommentValueColumn;
    }

    class YearDefinition {
        public int year;
        public boolean before;
        public boolean after;
    }
}
