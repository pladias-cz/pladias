package service.trait.excel;

import excel.ExcelTableErrorDecorator;
import io.ebean.Model;
import models.traits.Feature;
import models.traits.ValueComment;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import play.i18n.Messages;
import service.excel.impl.WorkbookWrapper;
import settings.user.UserOptions;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class TraitsImportService {
    private final int traitId;
    private final AbstractDatatypeDeserializer deserializer;

    private List<Model> datatypes = new ArrayList<>();
    private List<ValueComment> comments = new ArrayList<>();

    public TraitsImportService(Feature feature, int traitId, UserOptions userOptions, Messages messages) throws Exception {
        this.traitId = traitId;
        this.deserializer = DatatypeSerializerFactory.createDeserializer(feature, userOptions, messages);
    }

    public List<Model> getDatatypes() {
        return datatypes;
    }

    public int getTaxonCount() {
        return deserializer.getTaxonCount();
    }

    public List<ValueComment> getComments() {
        return comments;
    }

    private List<Model> extractDatatypes(Iterable<DatatypeWrapper> wrappers) {
        List<Model> datatypes = new ArrayList<>();
        for (DatatypeWrapper adw : wrappers) {
            datatypes.add(adw.getDatatype());
        }
        return datatypes;
    }

    private List<ValueComment> extractComments(Iterable<DatatypeWrapper> wrappers) {
        List<ValueComment> comments = new ArrayList<>();
        for (DatatypeWrapper adw : wrappers) {
            if (adw.getComment() != null) {
                comments.add(adw.getComment());
            }
        }
        return comments;
    }

    public boolean validate(WorkbookWrapper wbWrapper, Sheet sheet) throws IOException {
        try {
            datatypes.clear();

            List<DatatypeWrapper> wrappers = new ArrayList<>();

            int currentRow = 1;
            while (true) {
                Row row = sheet.getRow(currentRow++);
                if (row == null || row.getCell(0) == null || StringUtils.isBlank(row.getCell(0).getStringCellValue())) {
                    break;
                }
                DatatypeWrapper datatypeInstance = deserializeDatatype(row);
                if (datatypeInstance != null) {
                    wrappers.add(datatypeInstance);
                }
            }
            ExcelTableErrorDecorator decorator = new ExcelTableErrorDecorator(
                deserializer.getErrorColumn(),
                deserializer.getErrorColumn() + 1,
                deserializer.getErrorColumn() + 2);
            decorator.decorateWithErrors(wbWrapper, sheet, wrappers);
            decorator.autoSizeColumns(sheet, deserializer.getErrorColumn());
            datatypes = extractDatatypes(wrappers);
            comments = extractComments(wrappers);
            return !hasErrors(wrappers);
        } catch (Exception e) {
            throw new IOException(e);
        }
    }

    private DatatypeWrapper deserializeDatatype(Row row) throws Exception {
        Cell cell = row.getCell(0);
        if (cell == null || "".equals(StringUtils.trimToEmpty(cell.getStringCellValue()))) {
            return null;
        }
        DatatypeWrapper wrapper = deserializer.deserialize(traitId, row);
        return wrapper;
    }

    private boolean hasErrors(Iterable<DatatypeWrapper> wrappers) {
        for (DatatypeWrapper adw : wrappers) {
            if (adw.getErrors().length > 0) {
                return true;
            }
        }
        return false;
    }
}
