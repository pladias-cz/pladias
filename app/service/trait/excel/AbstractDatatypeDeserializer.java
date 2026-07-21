package service.trait.excel;

import excel.ExcelErrorInfo;
import io.ebean.Model;
import models.Taxon;
import models.traits.DataUnmeasurable;
import models.traits.DatatypePK;
import models.traits.ValueComment;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.ss.usermodel.Row;
import play.i18n.Messages;
import repositories.TaxonRepository;
import service.excel.impl.ExcelDocHelper;
import service.trait.excel.taxontaxon.CrossTaxonDeserializer;
import settings.user.UserOptions;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public abstract class AbstractDatatypeDeserializer implements IAbstractTypeSerializer {
    protected String unmeasurableValue;
    protected String nullSubstitution;
    protected Messages messages;
    private final TaxonRepository taxonRepository = TaxonRepository.getInstance();
    private final Set<DatatypePK> seenTraitComments = new HashSet<>();
    private final Set<Long> visitedTaxons = new HashSet<>();
    private final Set<Long> unmeasuredTaxons = new HashSet<>();

    public AbstractDatatypeDeserializer(UserOptions options, Messages messages) {
        unmeasurableValue = options.getUnmeasurableValue();
        nullSubstitution = options.getNullSubstitution();
        this.messages = messages;
    }

    public int getTaxonCount() {
        return visitedTaxons.size();
    }

    public DatatypeWrapper deserialize(int traitId, Row row) throws Exception {
        String taxonName = ExcelDocHelper.getSafeCellStringValue(row, TaxonColumn);
        Taxon taxon = taxonRepository.getByName(taxonName);
        if (taxon == null) {
            ExcelErrorInfo info = new ExcelErrorInfo(
                row.getRowNum(),
                TaxonColumn,
                messages.at("AbstractDatatype.InvalidTaxon")
            );
            return new DatatypeWrapper(null, null, new ExcelErrorInfo[]{info});
        }
        if (unmeasuredTaxons.contains(taxon.getId())) {
            ExcelErrorInfo info = createError(row, TaxonColumn, messages.at("AbstractDatatypeDeserializer.DuplicateKey"));
            return new DatatypeWrapper(null, null, new ExcelErrorInfo[]{info});
        }
        List<ExcelErrorInfo> errorList = new ArrayList<>();
        Model model = deserializeDatatypeFields(row, traitId, taxon.getId(), errorList);
        ValueComment comment = deserializeComment(row, traitId, taxon.getId());
        if (comment != null && visitedTaxons.contains(taxon.getId()) && !(this instanceof CrossTaxonDeserializer)) {
            ExcelErrorInfo info = createError(row, getCommentColumn(), messages.at("AbstractDatatypeDeserializer.DuplicateComment"));
            errorList.add(info);
        }
        visitedTaxons.add(taxon.getId());
        return (model != null || !errorList.isEmpty())
            ? new DatatypeWrapper(model, comment, errorList.toArray(new ExcelErrorInfo[errorList.size()]))
            : null;
    }

    protected ExcelErrorInfo createError(Row row, int column, String message) {
        return new ExcelErrorInfo(row.getRowNum(), column, message);
    }

    public abstract int getErrorColumn();

    public abstract int getCommentColumn();

    protected abstract Model deserializeDatatypeFields(Row row, int traitId, long taxonId, List<ExcelErrorInfo> errorList);

    private ValueComment deserializeComment(Row row, int traitId, long taxonId) {
        String comment = ExcelDocHelper.getSafeCellStringValue(row, getCommentColumn());
        if (StringUtils.isEmpty(comment)) {
            return null;
        }
        DatatypePK pk = new DatatypePK();
        pk.setTraitId(traitId);
        pk.setTaxonId(taxonId);
        if (seenTraitComments.contains(pk)) {
            return null; // do not store the comment if it was already deserialized once
        }
        seenTraitComments.add(pk);

        ValueComment traitComment = new ValueComment();
        traitComment.setCommentPk(pk);
        traitComment.setComment(comment);
        return traitComment;
    }

    protected boolean isUnmeasurableValue(String value) {
        return (value != null && value.equals(unmeasurableValue));
    }

    protected boolean isRecordIgnored(String value) {
        return (nullSubstitution.equals(value));
    }

    protected Model processUnmeasurableValue(Row row, long traitId, long taxonId, List<ExcelErrorInfo> errorList) {
        if (visitedTaxons.contains(taxonId)) {
            //there already exists row that captures this taxon with a value
            ExcelErrorInfo eInfo = createError(row, TaxonColumn, messages.at("AbstractDatatypeDeserializer.DuplicateKey"));
            errorList.add(eInfo);
            return null;
        } else {
            unmeasuredTaxons.add(taxonId);
            return buildUnmeasurableDatatype(traitId, taxonId);
        }
    }

    protected final Model buildUnmeasurableDatatype(long traitId, long taxonId) {
        DatatypePK pk = new DatatypePK();
        pk.setTraitId(traitId);
        pk.setTaxonId(taxonId);

        DataUnmeasurable unmeasurable = new DataUnmeasurable();
        unmeasurable.setDatatypePK(pk);
        return unmeasurable;
    }
}
