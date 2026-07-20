package service.trait.excel.enumerate;

import convertors.PercentageConvertor;
import excel.ExcelErrorInfo;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.ss.usermodel.Row;
import play.i18n.Messages;
import service.excel.impl.ExcelDocHelper;
import service.trait.excel.AbstractDatatypeDeserializer;
import settings.user.UserOptions;

import java.util.List;

public abstract class EnumAbstractDeserializer extends AbstractDatatypeDeserializer
    implements IEnumSerializer {
    protected boolean displayInEnglish;
    protected String nullSubstitution;
    private final UserOptions options;
    private final PercentageConvertor percentageConvertor;

    public EnumAbstractDeserializer(UserOptions options, Messages messages) {
        super(options, messages);
        this.options = options;
        nullSubstitution = options.getNullSubstitution();
        percentageConvertor = new PercentageConvertor(messages, options.percentageAsInteger());
        displayInEnglish = options.displayInEnglish();
    }

    @Override
    public int getErrorColumn() {
        return ErrorColumn;
    }

    protected Integer getFrequency(Row row, List<ExcelErrorInfo> errorList) {
        try {
            String freq = ExcelDocHelper.getSafeCellStringValue(row, FrequencyColumn);
            if (StringUtils.isNotEmpty(freq) && !nullSubstitution.equals(freq)) {
                return percentageConvertor.convertToInteger(freq);
            }
            return null;
        } catch (Exception e) {
            ExcelErrorInfo eInfo = createError(row, FrequencyColumn, e.getMessage());
            errorList.add(eInfo);
            return null;
        }
    }

    protected Boolean getDominant(Row row, List<ExcelErrorInfo> errorList) {
        try {
            String dominant = ExcelDocHelper.getSafeCellStringValue(row, DominantColumn);
            if (StringUtils.isNotEmpty(dominant) && !nullSubstitution.equals(dominant)) {
                return options.userStringToBool(dominant);
            }
            return Boolean.FALSE;
        } catch (Exception e) {
            ExcelErrorInfo eInfo = createError(row, DominantColumn, messages.at("AbstractDatatypeDeserializer.InvalidValue"));
            errorList.add(eInfo);
            return null;
        }
    }

}
