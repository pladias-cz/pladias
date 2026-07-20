package service.trait.excel.enumerate;

import io.ebean.Model;
import models.Syntaxon;
import models.traits.SyntaxonDatatype;
import org.apache.poi.ss.usermodel.*;
import play.i18n.Messages;
import settings.user.UserOptions;

import java.io.IOException;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class SyntaxonSerializer extends EnumAbstractSerializer {
    private final Map<Integer, Syntaxon> syntaxonCache = new HashMap<Integer, Syntaxon>();

    public SyntaxonSerializer(UserOptions options, Messages messages, Locale locale, Workbook wb, Sheet sheet) {
        super(options, messages, locale, wb, sheet);
    }

    @Override
    protected void serializeDatatypeFields(Row row, Model datatype) throws Exception {
        //this cast should be safe
        SyntaxonDatatype syntaxonDatatype = (SyntaxonDatatype) datatype;

        Cell cell = row.createCell(ValueColumn, CellType.STRING);
        int syntaxonId = syntaxonDatatype.getSytaxonDatatypePK().getSyntaxonId();
        Syntaxon syntaxon = getSyntaxonFromId(syntaxonId);
        cell.setCellValue(syntaxon.getForeignId());

        cell = row.createCell(DominantColumn, CellType.STRING);
        Boolean isDominant = syntaxonDatatype.isDominant();
        cell.setCellValue(isDominant != null ? options.boolToUserString(isDominant) : nullSubstitution);

        cell = row.createCell(FrequencyColumn, CellType.STRING);
        Integer frequency = syntaxonDatatype.getFrequency();
        cell.setCellValue(frequency != null ? percentageConvertor.convertToString(frequency) : nullSubstitution);
    }

    private Syntaxon getSyntaxonFromId(int syntaxonId) {
        if (syntaxonCache.containsKey(syntaxonId)) {
            return syntaxonCache.get(syntaxonId);
        }
        Syntaxon s = Syntaxon.find().byId(syntaxonId);
        if (s != null) {
            syntaxonCache.put(syntaxonId, s);
        }
        return s;
    }

    @Override
    protected void serializeDatatypeHeaderFields(Row row) throws IOException {
        Cell cell = row.createCell(ValueColumn);
        String value = exportInEnglish()
            ? messages.at("SyntaxonSerializer.value.en")
            : messages.at("SyntaxonSerializer.value");
        cell.setCellValue(value);
        cell.setCellStyle(boldStyle);

        cell = row.createCell(DominantColumn);
        String dom = exportInEnglish()
            ? messages.at("SyntaxonSerializer.dominance.en")
            : messages.at("SyntaxonSerializer.dominance");
        cell.setCellValue(dom);
        cell.setCellStyle(boldStyle);

        cell = row.createCell(FrequencyColumn);
        String freq = exportInEnglish()
            ? messages.at("SyntaxonSerializer.frequency.en")
            : messages.at("SyntaxonSerializer.frequency");
        cell.setCellValue(freq);
        cell.setCellStyle(boldStyle);
    }

    @Override
    public int getCommentColumn() {
        return CommentValueColumn;
    }
}
