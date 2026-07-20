package service.trait.excel.distribution;

import io.ebean.Model;
import models.traits.DistributionDatatype;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import play.i18n.Messages;
import service.trait.excel.AbstractDatatypeSerializer;
import settings.user.UserOptions;

import java.util.Locale;

public class DistributionSerializer extends AbstractDatatypeSerializer implements IDistributionSerializer {
    public DistributionSerializer(UserOptions userOptions, Messages messages, Locale locale, Workbook workbook, Sheet sheet) {
        super(userOptions, messages, locale, workbook, sheet);
    }

    @Override
    protected void serializeDatatypeFields(Row row, Model datatype) throws Exception {
        //this cast should be safe
        DistributionDatatype occurrenceDatatype = (DistributionDatatype) datatype;
        Cell cell = row.createCell(SquaresCountColumn);
        int value = occurrenceDatatype.getSquaresCount();
        cell.setCellValue(Integer.toString(value));

        cell = row.createCell(QuadrantsCountColumn);
        value = occurrenceDatatype.getQuadrantsCount();
        cell.setCellValue(Integer.toString(value));
    }

    @Override
    protected void serializeDatatypeHeaderFields(Row row) {
        Cell cell = row.createCell(SquaresCountColumn);
        String value = exportInEnglish()
            ? messages.at("TaxonDistributionSerializer.squaresCount.en")
            : messages.at("TaxonDistributionSerializer.squaresCount");
        cell.setCellValue(value);
        cell.setCellStyle(boldStyle);

        cell = row.createCell(QuadrantsCountColumn);
        value = exportInEnglish()
            ? messages.at("TaxonDistributionSerializer.quadrantsCount.en")
            : messages.at("TaxonDistributionSerializer.quadrantsCount");
        cell.setCellValue(value);
        cell.setCellStyle(boldStyle);
    }

    @Override
    protected int getCommentColumn() {
        return CommentValueColumn;
    }
}
