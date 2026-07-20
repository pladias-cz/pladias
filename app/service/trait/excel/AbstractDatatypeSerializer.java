package service.trait.excel;

import io.ebean.Model;
import models.Taxon;
import models.traits.*;
import org.apache.poi.ss.usermodel.*;
import play.i18n.Messages;
import settings.user.UserOptions;

import java.io.IOException;
import java.util.Locale;

public abstract class AbstractDatatypeSerializer implements IAbstractTypeSerializer {
    protected final CellStyle italicsStyle;
    protected final CellStyle boldStyle;
    protected final UserOptions options;
    protected final Messages messages;
    private final Locale locale;
    protected Sheet sheet;


    public AbstractDatatypeSerializer(UserOptions options, Messages messages, Locale locale, Workbook workbook, Sheet sheet) {
        this.options = options;
        this.locale = locale;
        this.messages = messages;
        this.sheet = sheet;
        this.italicsStyle = createItalicsFontStyle(workbook);
        this.boldStyle = createBoldFontStyle(workbook);
    }

    protected boolean exportInEnglish() {
        return options.displayInEnglish() || Locale.ENGLISH.equals(locale);
    }

    private CellStyle createItalicsFontStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setItalic(true);
        style.setFont(font);
        return style;
    }

    private CellStyle createBoldFontStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        return style;
    }

    public void serialize(Row row, Model datatype) throws Exception {
        Cell cell = row.createCell(TaxonColumn);
        Taxon taxon = null;
        long traitId;
        if (datatype instanceof AbstractDatatype ad) {
            taxon = ad.getDatatypePk().getTaxon();
            traitId = ad.getDatatypePk().getTraitId();
        } else if (datatype instanceof RealMultiDatatype rmd) {
            taxon = rmd.getTaxon();
            traitId = rmd.getTraitId();
        } else if (datatype instanceof SyntaxonDatatype sd) {
            taxon = sd.getSytaxonDatatypePK().getTaxon();
            traitId = sd.getSytaxonDatatypePK().getTraitId();
        } else if (datatype instanceof IntegerDatatype id) {
            taxon = id.getTaxon();
            traitId = id.getTraitId();
        } else if (datatype instanceof YearDatatype id) {
            taxon = id.getTaxon();
            traitId = id.getTraitId();
        } else if (datatype instanceof MonthDatatype id) {
            taxon = id.getDatatypePk().getTaxon();
            traitId = id.getDatatypePk().getTraitId();
        } else if (datatype instanceof CrossTaxonDatatype id) {
            taxon = id.getDatatypePk().getTaxon();
            traitId = id.getDatatypePk().getTraitId();
        } else if (datatype instanceof IntervalAvgDatatype id) {
            taxon = id.getDatatypePk().getTaxon();
            traitId = id.getDatatypePk().getTraitId();
        } else if (datatype instanceof DataUnmeasurable id) {
            taxon = id.getDatatypePK().getTaxon();
            traitId = id.getDatatypePK().getTraitId();
        } else if (datatype instanceof DistributionDatatype dt) {
            taxon = dt.getTaxon();
            traitId = dt.getTraitId();
        } else {
            EnumerateDatatype en = (EnumerateDatatype) datatype;
            EnumerateDatatypePK enPk = en.getDatatypePk();
            taxon = enPk.getTaxon();
            traitId = enPk.getTraitId();
        }
        cell.setCellValue(taxon.getNameLat());
        cell.setCellStyle(italicsStyle);
        serializeDatatypeFields(row, datatype);
        serializeCommentIfExists(row, traitId, taxon);
    }

    private void serializeCommentIfExists(Row row, long traitId, Taxon taxon) {
        DatatypePK dataTypePk = new DatatypePK();
        dataTypePk.setTraitId(traitId);
        dataTypePk.setTaxonId(taxon.getId());

        ValueComment comment = ValueComment.find().byId(dataTypePk);
        if (comment != null) {
            Cell cell = row.createCell(getCommentColumn(), CellType.STRING);
            cell.setCellValue(comment.getComment());
        }
    }

    protected abstract void serializeDatatypeFields(Row row, Model datatype) throws Exception;

    public void serializeHeader(Row row) throws IOException {
        Cell cell = row.createCell(TaxonColumn);
        cell.setCellStyle(boldStyle);
        cell.setCellValue(messages.at("AbstractDatatype.TaxonColumn"));
        serializeDatatypeHeaderFields(row);

        cell = row.createCell(getCommentColumn());
        cell.setCellStyle(boldStyle);
        String comment = exportInEnglish()
            ? messages.at("AbstractDatatype.Comment.en")
            : messages.at("AbstractDatatype.Comment");
        cell.setCellValue(comment);

    }

    protected abstract void serializeDatatypeHeaderFields(Row row) throws IOException;

    public void autosizeColumns() {
        for (int i = 0; i <= getColumnCount(); i++) {
            sheet.autoSizeColumn(i);
        }
    }

    protected final int getColumnCount() {
        return getCommentColumn() + 1;
    }

    protected abstract int getCommentColumn();
}
