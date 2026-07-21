package service.trait.excel.taxontaxon;

import excel.ExcelErrorInfo;
import io.ebean.Model;
import models.Taxon;
import models.traits.CrossTaxonDatatype;
import models.traits.CrossTaxonDatatypePK;
import org.apache.poi.ss.usermodel.Row;
import play.i18n.Messages;
import repositories.TaxonRepository;
import service.excel.impl.ExcelDocHelper;
import service.trait.excel.AbstractDatatypeDeserializer;
import settings.user.UserOptions;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class CrossTaxonDeserializer extends AbstractDatatypeDeserializer implements ICrossTaxonSerializer {
    private final Set<CrossTaxonDatatypePK> seenRecords;
    private final TaxonRepository taxonRepository = TaxonRepository.getInstance();
    private String nullSubstitution;

    public CrossTaxonDeserializer(UserOptions options, Messages messages) {
        super(options, messages);
        seenRecords = new HashSet<>();
    }

    @Override
    public int getErrorColumn() {
        return ErrorColumn;
    }

    private void reportInvalidTaxon(Row row, int columnId, List<ExcelErrorInfo> errorList) {
        ExcelErrorInfo info = new ExcelErrorInfo(
            row.getRowNum(),
            columnId,
            messages.at("AbstractDatatype.InvalidTaxon")
        );
        errorList.add(info);
    }

    @Override
    protected Model deserializeDatatypeFields(Row row, int traitId, long taxonId, List<ExcelErrorInfo> errorList) {
        try {
            Taxon taxon1 = taxonRepository.getById(taxonId);
            String taxonName2 = ExcelDocHelper.getSafeCellStringValue(row, Taxon2Column);
            if (isRecordIgnored(taxonName2)) {
                return null;
            }

            Taxon taxon2 = taxonRepository.getByName(taxonName2);
            if (taxon1 == null) {
                reportInvalidTaxon(row, TaxonColumn, errorList);
                return null;
            }
            if (taxon2 == null) {
                reportInvalidTaxon(row, Taxon2Column, errorList);
                return null;
            }
            if (taxon1.equals(taxon2)) {
                ExcelErrorInfo info = new ExcelErrorInfo(
                    row.getRowNum(),
                    TaxonColumn,
                    messages.at("CrossTaxonDeserializer.InvalidTaxonRelation")
                );
                errorList.add(info);
            }

            String value = ExcelDocHelper.getSafeCellStringValue(row, ValueColumn);
            if (value == null || value.equals(nullSubstitution)) {
                return null;
            }
            double doubleValue = Double.parseDouble(value);

            CrossTaxonDatatypePK pk = new CrossTaxonDatatypePK();
            pk.setTraitId(traitId);
            pk.setTaxonId(taxon1.getId());
            pk.setTaxonId2(taxon2.getId());
            if (seenRecords.contains(pk)) {
                ExcelErrorInfo info = new ExcelErrorInfo(
                    row.getRowNum(),
                    TaxonColumn,
                    messages.at("CrossTaxonDeserializer.DuplicateEntry")
                );
                errorList.add(info);
            } else {
                seenRecords.add(pk);
            }

            CrossTaxonDatatype datatype = new CrossTaxonDatatype();
            datatype.setDatatypePk(pk);
            datatype.setValue(doubleValue);
            return datatype;
        } catch (Exception e) {
            ExcelErrorInfo eInfo = createError(row, Taxon2Column, messages.at("AbstractDatatypeDeserializer.InvalidValue"));
            errorList.add(eInfo);
            return null;
        }
    }

    @Override
    public int getCommentColumn() {
        return CommentValueColumn;
    }
}
