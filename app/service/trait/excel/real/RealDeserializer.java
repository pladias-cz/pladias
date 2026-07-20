package service.trait.excel.real;

import excel.ExcelErrorInfo;
import io.ebean.Model;
import models.traits.DatatypePK;
import models.traits.Feature;
import models.traits.RealDatatype;
import org.apache.poi.ss.usermodel.Row;
import play.i18n.Messages;
import service.excel.impl.ExcelDocHelper;
import service.trait.excel.AbstractDatatypeDeserializer;
import settings.user.UserOptions;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class RealDeserializer extends AbstractDatatypeDeserializer implements IRealSerializer {
    private final Set<DatatypePK> seenRecords;
    private final Feature feature;

    public RealDeserializer(UserOptions options, Messages messages, Feature feature) {
        super(options, messages);
        this.seenRecords = new HashSet<DatatypePK>();
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

            DatatypePK pk = new DatatypePK();
            pk.setTraitId(traitId);
            pk.setTaxonId(taxonId);

            if (seenRecords.contains(pk)) {
                ExcelErrorInfo eInfo = createError(row, RealValueColumn, messages.at("RealDeserializer.duplicateKey"));
                errorList.add(eInfo);
                return null;
            }
            seenRecords.add(pk);

            if (doubleValue < feature.getMinimum() || doubleValue > feature.getMaximum()) {
                ExcelErrorInfo eInfo = createError(row, RealValueColumn,
                    messages.at("RealDeserializer.ValueOutOfRange",
                        feature.getMinimum().intValue(),
                        feature.getMaximum().intValue()));
                errorList.add(eInfo);
                return null;
            }
            RealDatatype datatype = new RealDatatype();
            datatype.setDatatypePk(pk);
            datatype.setValue(doubleValue);
            return datatype;
        } catch (Exception e) {
            ExcelErrorInfo eInfo = createError(row, RealValueColumn, messages.at("AbstractDatatypeDeserializer.InvalidValue"));
            errorList.add(eInfo);
            return null;
        }
    }

    @Override
    public int getCommentColumn() {
        return CommentValueColumn;
    }
}
