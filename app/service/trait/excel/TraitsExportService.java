package service.trait.excel;

import io.ebean.DB;
import io.ebean.Model;
import io.ebean.SqlQuery;
import io.ebean.SqlRow;
import models.traits.*;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import play.Logger;
import play.i18n.Messages;
import service.trait.excel.unmeasurable.UnmeasurableSerializer;
import settings.user.UserOptions;
import utils.ExcelUtils;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class TraitsExportService {
    private final Trait trait;
    private final UserOptions userOptions;
    private final Locale locale;
    private final Messages messages;

    public TraitsExportService(Trait trait, UserOptions userOptions, Messages messages, Locale locale) {
        this.trait = trait;
        this.userOptions = userOptions;
        this.messages = messages;
        this.locale = locale;
    }

    public byte[] doExport() throws IOException {
        try {
            Workbook wb = new XSSFWorkbook();
            Sheet sheet = wb.createSheet();
            Feature feature = trait.getFeature();
            AbstractDatatypeSerializer serializer = DatatypeSerializerFactory.createSerializer(feature, userOptions, messages, locale, wb, sheet);
            TraitDataProviderFactory dataProvider = new TraitDataProviderFactory(feature.getDatatype());
            Iterable<Model> data = dataProvider.getData(trait);
            int rowId = 0;
            serializer.serializeHeader(sheet.createRow(rowId++));
            for (Model d : data) {
                Row row = sheet.createRow(rowId++);
                serializer.serialize(row, d);
            }
            UnmeasurableSerializer unmeasurableSerializer = new UnmeasurableSerializer(userOptions, serializer.getCommentColumn(), wb);
            serializeUnmeasurables(trait, sheet, rowId, unmeasurableSerializer);
            serializer.autosizeColumns();
            return ExcelUtils.serializeWorkbook(wb);
        } catch (Exception e) {
            Logger.error("Error during traits export", e);
            throw new IOException(e);
        }
    }

    private void serializeUnmeasurables(Trait trait, Sheet sheet, int rowId, UnmeasurableSerializer unmeasurableSerializer) {
        String sql = String.format("SELECT trait_id, taxon_id  " +
            "FROM %s as UNMEASURE INNER JOIN taxons as T " +
            "ON UNMEASURE.taxon_id = T.id " +
            "WHERE trait_id=%d " +
            "ORDER BY T.name_lat ASC ", DataUnmeasurable.QualifiedName, trait.getId());

        SqlQuery sqlQuery = DB.sqlQuery(sql);
        List<SqlRow> rows = sqlQuery.findList();

        List<DataUnmeasurable> unmeasurables = new ArrayList<>();
        for (SqlRow row : rows) {
            DatatypePK pk = new DatatypePK();
            DataUnmeasurable datatype = new DataUnmeasurable();
            datatype.setDatatypePK(pk);
            pk.setTraitId(row.getLong("trait_id"));
            pk.setTaxonId(row.getLong("taxon_id"));
            unmeasurables.add(datatype);
        }

        for (DataUnmeasurable d : unmeasurables) {
            Row row = sheet.createRow(rowId++);
            unmeasurableSerializer.serialize(row, d);
            ValueComment comment = ValueComment.find().byId(d.getDatatypePK());
            if (comment != null)
                unmeasurableSerializer.serializeComment(row, comment.getComment());
        }
    }
}
