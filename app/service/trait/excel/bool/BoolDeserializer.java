package service.trait.excel.bool;

import excel.ExcelErrorInfo;
import io.ebean.Model;
import models.traits.AbstractDatatype;
import models.traits.BoolDatatype;
import models.traits.DatatypePK;
import org.apache.poi.ss.usermodel.Row;
import play.i18n.Messages;
import service.excel.impl.ExcelDocHelper;
import service.trait.excel.AbstractDatatypeDeserializer;
import settings.user.UserOptions;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class BoolDeserializer extends AbstractDatatypeDeserializer implements IBoolSerializer {
    private final UserOptions options;
    private final Set<DatatypePK> seenPrimKeys;

    public BoolDeserializer(UserOptions options, Messages messages) {
        super(options, messages);
        this.options = options;
        seenPrimKeys = new HashSet<DatatypePK>();
    }

    @Override
    protected Model deserializeDatatypeFields(Row row, int traitId, long taxonId, List<ExcelErrorInfo> errors) {

        try {
            String value = ExcelDocHelper.getSafeCellStringValue(row, BoolValueColumn);
            if (isRecordIgnored(value)) {
                return null;
            } else if (isUnmeasurableValue(value)) {
                return processUnmeasurableValue(row, traitId, taxonId, errors);
            }
            Boolean boolVal = options.userStringToBool(value);
            if (boolVal == null) {
                //null value -> ignore
                return null;
            }

            DatatypePK pk = new DatatypePK();
            pk.setTraitId(traitId);
            pk.setTaxonId(taxonId);
            if (seenPrimKeys.contains(pk)) {
                ExcelErrorInfo eInfo = createError(row, BoolValueColumn, messages.at("AbstractDatatypeDeserializer.DuplicateKey"));
                errors.add(eInfo);
                return null;
            }
            seenPrimKeys.add(pk);

            return buildDatatype(pk, boolVal, false);
        } catch (Exception e) {
            ExcelErrorInfo eInfo = createError(row, BoolValueColumn, messages.at("AbstractDatatypeDeserializer.InvalidValue"));
            errors.add(eInfo);
            return null;
        }
    }

    @Override
    public int getErrorColumn() {
        return ErrorColumn;
    }

    @Override
    public int getCommentColumn() {
        return CommentValueColumn;
    }

    private AbstractDatatype buildDatatype(DatatypePK pk, Boolean boolVal, boolean isUnmeasurable) {
        BoolDatatype datatype = new BoolDatatype();
        datatype.setDatatypePk(pk);
        datatype.setValue(boolVal);
        return datatype;
    }
}
