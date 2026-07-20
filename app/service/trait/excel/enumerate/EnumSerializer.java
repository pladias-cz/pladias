package service.trait.excel.enumerate;

import io.ebean.Model;
import models.traits.Enumerate;
import models.traits.EnumerateDatatype;
import models.traits.EnumerateValue;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import play.i18n.Messages;
import settings.user.UserOptions;

import java.io.IOException;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class EnumSerializer extends EnumAbstractSerializer {
    private final Map<Integer, EnumerateValue> enumeratesMap;

    public EnumSerializer(Enumerate enumerate, UserOptions options, Messages messages, Locale locale, Workbook workbook, Sheet sheet) {
        super(options, messages, locale, workbook, sheet);
        enumeratesMap = populateEnumMap(enumerate);
    }

    private Map<Integer, EnumerateValue> populateEnumMap(Enumerate enumerate) {
        Map<Integer, EnumerateValue> map = new HashMap<Integer, EnumerateValue>();
        for (EnumerateValue v : enumerate.getEnumerateValues()) {
            map.put(v.getId(), v);
        }
        return map;
    }

    @Override
    protected void serializeDatatypeFields(Row row, Model datatype) throws Exception {
        //this cast should be safe
        EnumerateDatatype enumDatatype = (EnumerateDatatype) datatype;

        Cell cell = row.createCell(ValueColumn);
        int valueId = enumDatatype.getDatatypePk().getValue();
        EnumerateValue value = enumeratesMap.get(valueId);
        String strValue = (exportInEnglish() ? value.getNameEn() : value.getNameCz());
        cell.setCellValue(strValue);

        cell = row.createCell(DominantColumn);
        cell.setCellValue(options.boolToUserString(enumDatatype.getDominant()));

        cell = row.createCell(FrequencyColumn);
        Integer frequency = enumDatatype.getFrequency();
        cell.setCellValue(frequency != null ? percentageConvertor.convertToString(frequency) : nullSubstitution);
    }

    @Override
    protected void serializeDatatypeHeaderFields(Row row) throws IOException {
        Cell cell = row.createCell(ValueColumn);
        String value = exportInEnglish()
            ? messages.at("EnumSerializer.value.en")
            : messages.at("EnumSerializer.value");
        cell.setCellValue(value);
        cell.setCellStyle(boldStyle);

        cell = row.createCell(DominantColumn);
        String dom = exportInEnglish()
            ? messages.at("EnumSerializer.dominance.en")
            : messages.at("EnumSerializer.dominance");

        cell.setCellValue(dom);
        cell.setCellStyle(boldStyle);

        cell = row.createCell(FrequencyColumn);
        String freq = exportInEnglish()
            ? messages.at("EnumSerializer.frequency.en")
            : messages.at("EnumSerializer.frequency");
        cell.setCellValue(freq);
        cell.setCellStyle(boldStyle);
    }

    @Override
    protected int getCommentColumn() {
        return CommentValueColumn;
    }
}
