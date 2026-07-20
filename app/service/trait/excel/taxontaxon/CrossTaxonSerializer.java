package service.trait.excel.taxontaxon;

import io.ebean.Model;
import models.traits.CrossTaxonDatatype;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import play.i18n.Messages;
import service.trait.excel.AbstractDatatypeSerializer;
import settings.user.UserOptions;

import java.util.Locale;

public class CrossTaxonSerializer extends AbstractDatatypeSerializer implements ICrossTaxonSerializer {
    public CrossTaxonSerializer(UserOptions options, Messages messages, Locale locale, Workbook workbook, Sheet sheet) {
        super(options, messages, locale, workbook, sheet);
    }

    @Override
    protected void serializeDatatypeFields(Row row, Model datatype) throws Exception {
        //this cast should be safe
        CrossTaxonDatatype taxonDatatype = (CrossTaxonDatatype) datatype;
        Cell cell = row.createCell(Taxon2Column);
        cell.setCellStyle(italicsStyle);
        cell.setCellValue(taxonDatatype.getDatatypePk().getTaxon2().getNameLat());

        Cell cell2 = row.createCell(ValueColumn);
        cell2.setCellValue(taxonDatatype.getValue());
    }


    @Override
    protected void serializeDatatypeHeaderFields(Row row) {
        Cell cell = row.createCell(Taxon2Column);
        String taxon = exportInEnglish()
            ? messages.at("CrossTaxonSerializer.Taxon2.en")
            : messages.at("CrossTaxonSerializer.Taxon2");
        cell.setCellValue(taxon);
        cell.setCellStyle(boldStyle);

        cell = row.createCell(ValueColumn);
        String value = exportInEnglish()
            ? messages.at("CrossTaxonSerializer.Value.en")
            : messages.at("CrossTaxonSerializer.Value");
        cell.setCellValue(value);
        cell.setCellStyle(boldStyle);
    }

    @Override
    protected int getCommentColumn() {
        return CommentValueColumn;
    }

}
