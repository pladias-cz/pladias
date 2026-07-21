package service.trait.excel.percentage;

import convertors.PercentageConvertor;
import excel.ExcelErrorInfo;
import models.traits.DatatypePK;
import models.traits.PercentageDatatype;
import org.apache.poi.ss.usermodel.Row;
import play.i18n.Messages;
import service.excel.impl.ExcelDocHelper;
import service.trait.excel.AbstractDatatypeDeserializer;
import settings.user.UserOptions;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class PercentageDeserializer extends AbstractDatatypeDeserializer implements IPercentageSerializer {
    private final PercentageConvertor percentageConvertor;
    private final Set<DatatypePK> seenRecords;

    public PercentageDeserializer(UserOptions userOptions, Messages messages) {
        super(userOptions, messages);
        this.percentageConvertor = new PercentageConvertor(messages, userOptions.percentageAsInteger());
        this.nullSubstitution = userOptions.getNullSubstitution();
        seenRecords = new HashSet<>();
    }

    @Override
    public int getErrorColumn() {
        return ErrorColumn;
    }

    @Override
    protected io.ebean.Model deserializeDatatypeFields(Row row, int traitId, long taxonId, List<ExcelErrorInfo> errorList) {
        try {
            String value = ExcelDocHelper.getSafeCellStringValue(row, PercentageValueColumn);
            if (isRecordIgnored(value)) {
                return null;
            } else if (isUnmeasurableValue(value)) {
                return processUnmeasurableValue(row, traitId, taxonId, errorList);
            }
            value = value.replace(',', '.'); // so that we are able to parse numbers in czech decimal point notation
            double doubleVal = percentageConvertor.convertToDouble(value);

            DatatypePK pk = new DatatypePK();
            pk.setTraitId(traitId);
            pk.setTaxonId(taxonId);

            if (seenRecords.contains(pk)) {
                ExcelErrorInfo eInfo = createError(row, PercentageValueColumn, messages.at("PercentageDeserializer.duplicateKey"));
                errorList.add(eInfo);
                return null;
            }
            seenRecords.add(pk);

            PercentageDatatype datatype = new PercentageDatatype();
            datatype.setDatatypePk(pk);
            datatype.setValue(doubleVal);
            return datatype;
        } catch (Exception e) {
            ExcelErrorInfo eInfo = createError(row, PercentageValueColumn, messages.at("AbstractDatatypeDeserializer.InvalidValue"));
            errorList.add(eInfo);
            return null;
        }
    }

    @Override
    public int getCommentColumn() {
        return CommentValueColumn;
    }
}
