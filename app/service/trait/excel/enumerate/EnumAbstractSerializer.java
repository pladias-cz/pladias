package service.trait.excel.enumerate;

import convertors.PercentageConvertor;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import play.i18n.Messages;
import service.trait.excel.AbstractDatatypeSerializer;
import settings.user.UserOptions;

import java.util.Locale;

public abstract class EnumAbstractSerializer extends AbstractDatatypeSerializer implements IEnumSerializer {
    protected String nullSubstitution;
    protected PercentageConvertor percentageConvertor;

    public EnumAbstractSerializer(UserOptions userOptions, Messages messages, Locale locale, Workbook wb, Sheet sheet) {
        super(userOptions, messages, locale, wb, sheet);
        nullSubstitution = userOptions.getNullSubstitution();
        percentageConvertor = new PercentageConvertor(messages, userOptions.percentageAsInteger());
    }
}
